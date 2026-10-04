# MASTER_CONTEXT — My Andijan

> **Document status:** written 2026-09-28 by direct analysis of the two live repositories, their git history, the recovered Claude Code session transcript (2026-08-24 → 2026-09-27), and read-only probes of the live production API and site. Every claim here is either verifiable in the codebase or explicitly labelled as recovered-from-session or unknown.

---

## 1. What My Andijan is

**My Andijan (`myandijan.uz`) is a multilingual business directory and city guide for the Andijan region of Uzbekistan.**

It is a two-sided local-discovery platform:

- **Consumers** search and browse local businesses on a map, read and write reviews, save favourites, and follow events.
- **Business owners** claim or create a listing, manage it from an owner dashboard, reply to reviews, publish events, maintain a menu/catalogue, and (planned) pay for promotion.
- **Staff** moderate the catalogue, approve businesses/claims/events, manage the taxonomy and geography, and view platform analytics through an admin dashboard and a "command centre".

It is best understood as **a Yelp/2GIS-style local directory, scoped tightly to one Uzbek region, built mobile-first and trilingual (Uzbek / Russian / English) from the ground up.** The Yelp comparison is not incidental — a dedicated session (2026-09-04) reverse-engineered Yelp's signup and business-claim flows, and the resulting patterns were deliberately adopted (see `DECISIONS.md`).

### Verified identity facts

| Fact | Value | Source |
| --- | --- | --- |
| Product name | My Andijan / MyAndijan | `README.md`, code, i18n |
| Public domain | `https://myandijan.uz` | `src/lib/seo.ts`, live (200) |
| Production API | `https://myandijan-api-production.up.railway.app` | `src/lib/api.ts`, live (200) |
| Languages | `uz` (source of truth), `ru`, `en` | `src/i18n/`, 385 keys each |
| Geographic scope | Andijan Region — 14 districts + 11 cities | `prisma/seed.ts`, `schema.prisma` |
| Default language | `uz` — `/` redirects to `/uz` | `src/App.tsx` |
| Currency | UZS (so'm) | `schema.prisma` defaults, `src/lib/premium.ts` |
| Timezone | `Asia/Tashkent` | `Event.timezone` default |

---

## 2. Product vision

Recovered from the codebase, the schema's design comments, and session prompts. **No formal written vision document exists in either repository** — what follows is the vision as it is actually encoded in the product.

The platform is built to become **the default way people in Andijan find local businesses**, replacing word-of-mouth and fragmented Telegram channels with a structured, searchable, trustworthy catalogue. Three commitments are visible in the engineering:

1. **Trilingual by construction, not by translation layer.** Every user-facing taxonomy entity (`Category`, `Region`, `District`, `City`, `BusinessRecommendation`) carries `nameUz`/`nameRu`/`nameEn` columns. Adding a language is a schema and dictionary change, not a retrofit.
2. **Local-first and sovereignty-aware.** The Prisma schema opens with an explicit constraint: *"PostgreSQL. Vanilla only — no proprietary extensions (data-localization portability requirement: DB must be relocatable to an Uzbek host)."* This is a real product constraint, not a preference.
3. **Built for a real monetization path.** Premium/featured placement, a promotion model, a business health score that nudges owners toward paid upgrades, and per-business analytics all exist in the schema and much of the UI — ahead of the payment integration itself.

---

## 3. Target users

| Segment | Role in system | What they do | Status of their experience |
| --- | --- | --- | --- |
| **Consumers / residents** | `CUSTOMER` | Search, browse map, read/write reviews, favourite businesses, view events | Largely built; live in production |
| **Business owners** | `BUSINESS_OWNER` | Claim/create listing, edit details & hours, manage menu, reply to reviews, publish events, view analytics, upgrade to premium | Built locally; **NOT yet deployed** |
| **Moderators** | `MODERATOR` | Approve/reject businesses and events, hide reviews | Backend built; admin UI partially wired |
| **Support** | `SUPPORT` | Intended for customer support tier | Role exists in hierarchy; **no dedicated features** |
| **Admins** | `ADMIN` | Full catalogue + user + taxonomy management, audit log, analytics | Backend complete (31 routes); UI partially wired to real endpoints |
| **Super admins / founder** | `SUPER_ADMIN` | Destructive actions (hide/delete business), command-centre analytics, platform health overview | Backend complete; UI thin |

There are **six roles** — `CUSTOMER`, `BUSINESS_OWNER`, `SUPPORT`, `MODERATOR`, `ADMIN`, `SUPER_ADMIN` — and since Phase 15D **no hierarchy**: each role holds an explicit set of capabilities (`src/authz/capabilities.ts`, D-75), ownership is checked per record, and the PLATFORM_OWNER governance plane is not implemented. **Ownership authority and platform authority are separate (Phase 15D.2, D-75 point 7):** ADMIN and SUPER_ADMIN no longer hold the owner capabilities (`business.claim` / `business.create` / `business.manage_own`) — only BUSINESS_OWNER does (CUSTOMER keeps claiming). Staff administer other owners' listings through `/admin` with explicit platform capabilities such as `business.edit_any`, which never depend on ownership. Not a new role; Business Staff stays future business-scoped membership; PLATFORM_OWNER stays the separate future governance plane.

---

## 4. Core problem being solved

Stated plainly, as the product's structure implies it:

> **In Andijan there is no reliable, complete, searchable record of which local businesses exist, where their branches are, when they are open, whether they are any good, or how to contact them.** Discovery happens through personal networks and scattered social channels. Businesses have no canonical online presence they control. Consumers have no way to compare options or see trustworthy reviews.

The platform's specific answers to that:

- **A canonical brand entity separated from its physical locations** (`Business` ↔ `Branch`), so a chain with several addresses is one listing, not five.
- **Opening hours as structured data** (`BranchHour`, 0=Monday…6=Sunday, with `isClosed` and `is24Hours`) — enabling an "open now" filter, which is one of the highest-value features in a local directory.
- **Reviews scoped to a branch, not the brand** — because service quality is location-specific.
- **Uzbek-aware search.** The search layer normalises transliteration (Latin/Cyrillic Uzbek variants) via a Postgres function before matching, with trigram + full-text indexes. Searching "osh" or "oш" should find the same restaurants.
- **A claim flow** so existing (seeded/imported) businesses can be taken over by their real owners.

---

## 5. Main user journeys

### 5.1 Consumer discovery (IMPLEMENTED, live)
`/uz` home → category tile or search → `/uz/search` (list + Leaflet map, filters) → `/uz/business/:slug` (detail: hero, info, hours, menu, reviews, similar businesses, branches) → call / directions / favourite / write review.

A **category-aware variant exists for food**: when `?category=oziq-ovqat`, `SearchPage` dispatches to a restaurant-specific UI with cuisine chips, price buckets, delivery badges and "open now" — this is live in production.

### 5.2 Consumer account (IMPLEMENTED, deployed)
`/uz/signup` → **phone-first, one field per screen**: Phone (`+998XXXXXXXXX`) → 6-digit OTP → optional profile (name + avatar, skippable). **The account is created at the OTP step**, so the profile step is genuinely optional (progressive profiling). Login is via an auth modal available anywhere under `/:lang`.

### 5.3 Business claim / registration (IMPLEMENTED, deployed)
`/uz/claim` → **eight single-field screens with no progress bar**, 40/60 split-screen on desktop with a live preview of the resulting business page: Name (typeahead against existing businesses) → Email → Location → Phone → Category → Website → Verification method → Summary. Submits via `POST /businesses`.

### 5.4 Owner management (IMPLEMENTED, deployed)
`/uz/dashboard` → views for My Businesses, Reviews (with reply), Events, Inventory, Ads, Premium, Settings. Editing happens in an in-place modal (`EditBusinessModal`), not a separate route.

### 5.5 Staff moderation (PARTIAL)
`/uz/admin` → sidebar with Home, Businesses, Categories, Regions, Users, Reviews, Events, Audit Logs, Analytics, Settings. Backed by real endpoints for businesses/categories/users/events/audit/stats/analytics; **Reviews list and Settings are still mock data** because no `GET` list endpoint exists for them.

---

## 6. Current product scope (MVP boundary)

The schema encodes the MVP boundary explicitly with comments. **In scope now:**

- Business directory with categories, districts/cities, branches, hours, photos
- Search (FTS + trigram + transliteration), filters, map
- Reviews, replies, reports, ratings
- Favourites
- Events with RSVP
- Products/services catalogue ("menu")
- Business claims
- Phone-OTP auth, JWT access + refresh, six-role RBAC
- Image upload (Supabase Storage)
- Admin moderation + audit log
- Analytics: per-business daily rollups, search analytics, activity log, platform metrics
- Business health score with localized, actionable recommendations
- Premium/featured promotion **flags and UI** (not payment)

**Explicitly deferred to "Phase 2" in code comments:**

- **Advertising module** — `Advertisement` table exists; comment: *"DEFERRED TO PHASE 2 (ships with Click payments). Table retained so the module attaches without a core migration."*
- **Payments** (Click, Payme, Uzum, cash) — UI exists in `src/lib/premium.ts` and `PricingPage`; no integration
- **Inventory, warehouse, booking, delivery, ordering** — capability flags exist on `BusinessType`; modules not built
- **SMS/Telegram notification channels** — `Notification` is in-app only for MVP
- **Static generation / prerendering** — see `docs/SSG.md`, deliberately deferred with a written Phase-2 plan

---

## 7. Business model / monetization (as present in the code)

**Three tiers** are defined in `src/lib/premium.ts`:

| Tier | Price (recovered from session summary) |
| --- | --- |
| Free | 0 |
| Premium | 99 000 so'm |
| Featured | 249 000 so'm |

- Yearly billing toggle with **20% discount** (`YEARLY_DISCOUNT = 0.2`)
- Payment methods surfaced in UI: **Click, Payme, Uzum, Naqd (cash)** — all display-only
- Promotion is expressed on `Business` as `isPromoted`/`promotedUntil` and `isFeatured`/`featuredUntil`; `POST /admin/businesses/:id/promote` is the only way to set it today (admin-granted, not purchased)
- `Advertisement` has `priceUzs` and `paymentStatus` (default `"UNPAID"`) ready for the Phase-2 ad product
- The **business health score** doubles as a monetization funnel: it detects gaps and emits localized nudges with claimed impact ("+40% ko'rishlar"). The schema is explicit that those impact figures are **directional product estimates, not measured lift** — there is no experiment framework.

**No payment provider is integrated. No revenue is being collected. There is no billing/subscription table in the schema.**

---

## 8. Project status

### 8.0 Current status — 2026-10-04 (authoritative)

| Area | Status |
| --- | --- |
| **Backend** | `main` `2ea83b620c715cf1b5ab719ca5762c2c18fd1d13` (PR #13 merge) live as Railway deployment `6b5f057b-ea08-4252-b5fa-79910859f8d8` — SUCCESS, 1/1; CI-gated; `prisma migrate deploy` pre-deploy; 127 routes; 16 migrations, none pending |
| **Frontend** | `main` `f80ee8d` (PR #9 merge, head `a534f41155f6dde42e9ce348533d95c74a83a8cb`); Vercel promotes only after `test-and-build` passes |
| **Tests** | Backend: 1010 unit tests + real-PostgreSQL suites; frontend: Vitest (23 test files); CI gates every merge |
| **Phase 15 (security)** | **Not yet officially closed.** 15E.4e.2 **CLOSED / PASS**; both HIGH findings of the final audit **remediated in production** (PR #13: staff SMS password reset blocked; `multer` 2.4.0). Open gates: **A** unique ADMIN / SUPER_ADMIN credentials · **B** confirm ruleset bypass lists are empty · **C** final short closure audit. Details: `CURRENT_STATE.md` (top), SECURITY §16 |
| **Phase 16** | 16E.2 (frontend) already on `main`; PR #10 + #6 (16C.1) and PR #11 + #7 (16E.1) **frozen** until Phase 15 closes |

### 8.1 Status as of 2026-09-28 (historical)

| Area | Status |
| --- | --- |
| **API (Railway)** | **Deployed and verified live.** 118 routes across 17 feature modules. All probed public endpoints return 200. |
| **Database** | Live PostgreSQL on Railway, 11 migrations applied, seeded with Andijan geography + categories. Contains **4 businesses, 0 featured, 0 events** — effectively pre-launch content volume. |
| **Frontend (Vercel)** | **Deployed and current** as of 2026-09-28 (verified byte-identical to a `main` build). |
| **Local frontend HEAD** | `dd08485`, working tree clean, `npm run build` passes. |
| **Blocker** | Frontend deploy blocked — see §9. |
| **Tests** | **Zero.** No test files, no test runner installed in either repo. *(Historical — resolved; see §8.0.)* |
| **AI features** | **None.** See `AI.md`. |

### Evidence for the frontend-behind-production claim

The deployed entry chunk (`assets/index-DKCNN09S.js`) lists its lazy chunks in a `__vite__mapDeps` manifest. That manifest contains `HomePage`, `SearchPage`, `BusinessDetailPage`, `EventsPage`, `FavoritesPage`, `ProfilePage`, `OwnerDashboard`, `AddBusinessPage` — and **no `SignupPage`, `ClaimPage`, `PricingPage`, `PremiumBadge` or `premium` chunk**. The local HEAD build (`index-NERlrCqp.js`) contains all of them. Restaurant search *is* live (the deployed `SearchPage` chunk contains the cuisine slugs `milliy`, `fast-food`, `yapon`, `oziq-ovqat`).

> **Warning for anyone verifying this:** `vercel.json` rewrites `/(.*)` → `/index.html`, so **every** URL on `myandijan.uz` returns HTTP 200 with HTML — including non-existent asset paths. Status codes prove nothing. Check `content-type` and bundle contents.

---

## 9. Current blockers

**1. ~~The frontend cannot be deployed~~ — RESOLVED 2026-09-28.** Production serves current `main`. Historical cause: PowerShell's execution policy blocked the `npx.ps1` shim, so `vercel login` never ran; `npx.cmd` is the workaround.

The chain, established in the final session turns:

- `npx vercel --prod` → `Not authorized`; `vercel whoami` → `Logged out.`
- The user was asked to run `npx vercel login` in their own terminal (interactive browser auth — an agent must not do this).
- The terminal showed: `npx : File D:\Node.js\npx.ps1 cannot be loaded because running scripts is disabled on this system.`
- **Therefore every `npx`/`npm` command the user typed — the login, the link, and four `npm i -g vercel` attempts — failed before Vercel was ever invoked.**

**The fix handed over, and still the next action:**

```bash
npx.cmd vercel login
```
```bash
npx.cmd vercel --prod
```

Two corrections that were established and must not be re-litigated:
- **`vercel link` is NOT needed.** An earlier conclusion that `.vercel/project.json` held a stale `orgId` was **wrong** and was retracted. Verified against the Vercel API: `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH` and `team_ErWmdvPfiaDk9mHs6Tv1GFuu` (team `john-s3`) are both correct and serve `myandijan.uz`.
- The Vercel MCP server can read the account but **cannot deploy**, because the project has no Git connection — deploys must originate from this machine.
- Windows PowerShell 5.1 has **no `&&` operator**. Chain with `;` or run separately.

**2. SMS does not send.** `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` / `ESKIZ_FROM` are **unset on Railway** (still true 2026-10-04). *Update (15E.2):* `/auth/otp/request` and `/auth/forgot-password` now fail closed with **503** and never log a code; the behaviour described next is historical. Originally, `SmsService` degraded to `logger.warn` instead of throwing, so `/auth/otp/request` returned `{"success":true,"message":"Kod yuborildi"}` while **no SMS was sent**. OTP signup is therefore non-functional for real users even once the frontend ships. The Eskiz template must also be registered in the Eskiz dashboard.

---

## 10. Major decisions already made

Full detail and rationale in `DECISIONS.md`. The load-bearing ones:

1. **`Business` is the brand; `Branch` holds all location data.** No address, phone, lat/lng or hours on `Business`. Every geographic query routes through `Branch`.
2. **Reviews are branch-scoped; favourites are business-scoped.** One review per user per branch (`@@unique([branchId, userId])`) is the primary anti-spam control.
3. **Vanilla PostgreSQL only** — the database must be relocatable to an Uzbek host. (`pg_trgm` is used; it is a standard contrib extension, not proprietary.)
4. **Integer autoincrement IDs**, chosen to match the existing auth module, JWT payload, guards and seed script.
5. **Authorization is capability-based and deny-by-default (Phase 15D, D-75).** Every route declares `@Public`, `@Authenticated` or `@RequireCapability(...)`; the global `AuthzGuard` refuses anything undeclared. No role inherits another's permissions. *(The old rank-floor `@Roles` model was removed.)*
6. **Phone-first auth, `+998XXXXXXXXX`.** No email/password signup path in the new flow; email is optional on the user record.
7. **Yelp-derived UX:** one field per screen, **no progress bar** (deliberately, to reduce drop-off), "Bepul" (free) in claim headlines, skip button on optional steps, legal consent as text above the CTA rather than a checkbox, account created before the profile step.
8. **Custom i18n, not `react-i18next`.** Flat dictionaries in `src/i18n/{uz,ru,en}.ts`; `TranslationKey = keyof typeof uz`, so `uz` is the compiler-enforced source of truth. **`t()` has no interpolation** — callers use `.replace("{x}", value)`.
9. **`AnimatePresence mode="wait"` is banned for screen transitions in flows.** It caused a hard, silent deadlock in the signup flow. Replaced with a keyed `motion.div`.
10. **Business health score recomputes on write, not on a cron.**
11. **Command-centre log tables deliberately have no foreign keys** — high-volume append-only logs; orphaned references are acceptable and expected.
12. **Static generation deferred** with a written plan (`docs/SSG.md`), because SSR requires breaking changes to `App.tsx`'s hardcoded `BrowserRouter`, `localStorage` reads during render in `LanguageContext`/`AuthContext`, and Leaflet's module-scope `window` access.
13. **Supabase Storage with the `service_role` key, server-side only**, because the `anon` key fails RLS (the backend holds no Supabase Auth session). The backend's own `JwtAuthGuard` is the trust boundary.

---

## 11. Important assumptions

These are assumed by the code and should be validated rather than inherited blindly:

- **Phone numbers are Uzbek E.164 only** — `/^\+998\d{9}$/` is enforced in six DTOs. No other country works.
- **`dayOfWeek` is 0 = Monday … 6 = Sunday** — this is *not* the JS `Date.getDay()` convention. `JsonLd.tsx` and the owner dashboard both rely on the Monday-first ordering.
- **Every listing is in Andijan Region** — `JsonLd.tsx` hardcodes `addressRegion` default `"Andijon Region"` and `addressCountry: "UZ"`.
- **"Andijan city" ≠ "Andijon district".** The schema documents this trap: Andijon *tumani*'s seat is Kuyganyor; users typing "Andijan" almost always mean the city. `City.isRegionLevel` and a nullable `City.districtId` model it.
- **Ratings arrive from the API as strings** and must be `Number()`-coerced — `normalizeBusiness()` in `src/lib/api.ts` exists largely for this.
- **`Business`/`Branch` are NOT localized** (single `name` column), unlike the taxonomy entities. The frontend types assumed otherwise, which is why a normalisation layer exists at the API boundary.
- **The claim flow defaults `districtId` to `"1"` (Andijon)** — `DEFAULT_DISTRICT_ID` in `useClaimFlow.ts`.
- **A running production API proves earlier migrations succeeded**, because Railway's start command is `npx prisma migrate deploy && npm run start:prod` (`&&`-chained).

---

## 12. Known constraints

| Constraint | Detail |
| --- | --- |
| **Data localization** | DB must be relocatable to an Uzbek host → vanilla PostgreSQL, no proprietary extensions |
| **Node versions** | Frontend developed on Node 24.18 / npm 11.16; API pins `"engines": {"node": "22.x"}` |
| **Local dev shell** | Windows PowerShell 5.1 — no `&&`, and the execution policy blocks `*.ps1` npm/npx shims. Use `npx.cmd` / `npm.cmd`. |
| **Port conflict** | Port 5173 is occupied on this machine by an unrelated `crm-os` Vite server. This project was moved to **5180** via `.claude/launch.json`. Do not kill 5173. |
| **Social scrapers** | Facebook/Telegram/X/WhatsApp do not run JS, so shared links currently preview with the generic `index.html` title and no per-page OG image. This is the strongest argument for doing prerendering before launch. |
| **No payment rails** | Monetization UI cannot transact |
| **No SMS** | Eskiz unconfigured → OTP unusable in production |
| **Vercel project is not Git-connected** | Deploys must originate from the local machine |

---

## 13. What must NOT be changed without discussion

These are load-bearing. Changing any of them breaks something non-obvious or discards a decision that was made deliberately and, in several cases, painfully.

1. **The `Business` / `Branch` split.** Moving location data onto `Business` would break search geo-filtering, reviews, hours, the map, and every index.
2. **`dayOfWeek` = 0-is-Monday.** Changing it silently corrupts hours display, "open now", and `schema.org` opening-hours output.
3. **The capability model** (D-75). Adding a route without an authorization rule fails CI (`route-authorization.spec.ts`); changing a route's rule requires regenerating the committed snapshot deliberately.
4. **`uz` as the i18n source of truth.** `TranslationKey` derives from it; that derivation is what makes missing translations a compile error.
5. **`t()` having no interpolation.** Callers use `.replace()`. Adding interpolation means auditing every call site.
6. **Vanilla-PostgreSQL-only.** This is a legal/portability requirement, not a style choice.
7. **`AnimatePresence mode="wait"` in multi-step flows.** Reintroducing it reintroduces a silent, hard-to-diagnose deadlock.
8. **The `normalizeBusiness` / `normalizeBranch` boundary in `src/lib/api.ts`.** Removing it reintroduces blank business names, missing phone/address on detail pages, and `NaN` ratings.
9. **`SUPABASE_SERVICE_KEY` must never reach the client.** It bypasses RLS entirely.
10. **`/auth/register` must reject `role=ADMIN`.** Stated as a SECURITY comment in the schema on `User.role`.
11. **`BusinessRecommendation.code`.** It is the stable rule key that makes recalculation idempotent and preserves the owner's `isCompleted` flag. Titles are display copy and cannot serve as the key.
12. **The deprecated `SearchQueryLog` table.** Kept so the migration is non-destructive; only drop it after confirming the backfill into `SearchAnalytics`.
13. **`.env` files.** Both are gitignored and hold live production secrets, including the Supabase service-role key.

---

## 14. What could not be recovered

Stated plainly so the next agent does not mistake absence for non-existence:

- **No written product-requirements document, business plan, pricing rationale, or launch plan exists in either repository.** Product intent had to be inferred from code, schema comments, and session prompts.
- **Session history before 2026-08-24 is not available.** The recovered transcript covers 2026-08-24 → 2026-09-27 only, while git history starts 2026-08-10. The work that built the entire API, the database schema, and the frontend platform (referred to in commit `ea0e772` as **"Sessions A-N"**, and in `docs/SSG.md` as "Session J") is **not** in any recoverable transcript. Its decisions survive only as code and as unusually detailed code comments.
- **No design files** (Figma or otherwise), no brand guidelines, no logo source.
- **Whether the 4 live businesses are real or test data** is unknown.
- **Target launch date, marketing plan, and competitive positioning** are unknown.

See `SESSION_CONTEXT.md` for exactly what was and was not recoverable.
