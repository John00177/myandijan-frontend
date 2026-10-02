# CURRENT_STATE — My Andijan

> Snapshot taken **2026-09-28**. Verified against: both repositories at their current `HEAD`, git history, read-only probes of the live API (`myandijan-api-production.up.railway.app`) and the live site (`myandijan.uz`), and the recovered Claude Code session transcript.

---

## 0. One-paragraph summary

The **backend is essentially complete and deployed** — 118 routes, 17 feature modules, 31 database models, 11 migrations applied, live and responding. The **frontend is also largely complete locally** (168 source files, 132 components, all three languages at full key parity, build passing) **but production is running an older bundle** that lacks the signup, claim, pricing and premium features. The single blocker is a local Windows PowerShell execution-policy problem that prevents the developer from authenticating the Vercel CLI. Beyond that, the two largest real gaps are: **no tests at all**, and **a substantial amount of built backend capability that no frontend code calls** (search, analytics ingestion, command centre, health score, most admin actions).

---

## 1. What works

### 1.1 Backend — verified live

Probed read-only on 2026-09-28; all returned `200`:

| Endpoint | Result |
| --- | --- |
| `GET /categories` | 200, real localized categories (`oziq-ovqat` / `Еда и напитки` / `Food & …`) |
| `GET /geography/regions` | 200, Andijan region with districts |
| `GET /businesses` | 200, `meta: {page:1, limit:20, total:4, totalPages:1}` |
| `GET /businesses/featured` | 200, `[]` (empty) |
| `GET /events` | 200, `total: 0` |
| `GET /search?q=osh` | 200 |
| `GET /docs` | 200 — **Swagger UI is publicly exposed in production** (see `SECURITY.md`) |
| `GET /users/me` | 401 without a token — auth guard working |

Established in the prior session's production verification (recovered, not re-run here):
- `POST /auth/otp/request` → `{"success":true,"message":"Kod yuborildi"}`
- Phone-format validation → `400`
- Wrong OTP → `400 Kod noto'g'ri yoki muddati tugagan`
- `PUT /auth/profile` without token → `401`
- OTP rate limit → `200`, `200`, **`429`** (3 per 10 min per phone enforced)
- Deploy achieved zero downtime (`/categories` stayed 200 throughout)

### 1.2 Backend modules that are complete and coherent

- **Auth** — register, login, refresh (rotating), logout, OTP request/verify, profile update (multipart), forgot-password / verify-reset-code / reset-password. bcrypt cost 12. OTP: 6 digits via `crypto.randomInt`, 5-minute TTL, single-use, max 5 attempts, 3 SMS per phone per 10 minutes.
- **RBAC** — `JwtAuthGuard` + `RolesGuard` with a six-level hierarchy floor check.
- **Businesses / Branches / Hours** — full CRUD, status workflow (`DRAFT → PENDING → APPROVED/REJECTED/SUSPENDED/HIDDEN`), denormalized rating/review/branch/view/favourite counters.
- **Search** — genuinely sophisticated: `pg_trgm` + tsvector, four custom Postgres functions including `search_normalize` for Uzbek transliteration folding, unified business+product ranking via a shared CTE, and a `normalizedQuery` field exposed for debuggability.
- **Reviews / replies / reports** — one review per user per branch, one reply per review, one report per user per review.
- **Favourites, Events + RSVP, Products ("menu"), Geography, Categories (tree)**.
- **Admin** — 31 routes covering approve/reject/verify/suspend/promote/hide, claims, reports, review moderation, events, category CRUD + reorder, district/city edit, user suspend/activate, audit log.
- **Command centre** — 9 founder-level analytics endpoints plus a daily aggregation job endpoint.
- **Analytics** — public ingestion (`view`/`click`/`search`), six owner-facing report endpoints, two admin ones.
- **Health score** — four sub-scores plus a weighted overall, recomputed on write, with idempotent localized recommendations keyed by a stable rule `code`.
- **Upload** — Supabase Storage, 5 MB cap, MIME allow-list, filename sanitisation.
- **Swagger** — auto-generated at `/docs` with bearer auth declared.

### 1.3 Frontend — working locally and in production

- Home page (hero, categories, districts, featured, stats strip, useful services, CTA banner)
- Search: list + Leaflet map, filters, pagination
- **Restaurant/category-aware search — live in production.** Confirmed: the deployed `SearchPage` chunk contains `milliy`, `fast-food`, `yapon`, `oziq-ovqat`.
- Business detail: hero image, info header, description, hours/open-now badge, menu, reviews, similar businesses, branches, action buttons, social links
- Events listing, Favourites, Profile
- Auth modal (login + forgot-password flow), route-level code splitting, `ErrorBoundary` with chunk-load-error detection and reload offer
- **i18n at full parity — 385 keys in each of `uz`, `ru`, `en`.** No missing keys in any language.
- **SEO head layer** — `MetaTags` (title, description, canonical, hreflang ×3 + `x-default`, OG, Twitter) and `JsonLd` (`LocalBusiness`, `WebSite`+`SearchAction`, `BreadcrumbList`), both well-implemented
- Accessibility: `MotionConfig reducedMotion="user"` app-wide, so every Framer Motion animation honours `prefers-reduced-motion` without per-component opt-in
- Session handling: any `401` on a request that carried a token clears storage once and fires `SESSION_EXPIRED_EVENT`, which `AuthContext` listens for

### 1.4 Frontend — working locally, NOT in production

- **Phone-first OTP signup** (`/uz/signup`) — 3 screens, 6-box OTP input with paste/arrow-key/backspace handling and `autoComplete="one-time-code"` for WebOTP
- **Business claim flow** (`/uz/claim`) — 8 single-field screens, 40/60 split with live preview
- **Pricing page** (`/uz/pricing`) — three tiers, monthly/yearly toggle, UZ payment methods
- **Premium UI** — badges, featured listing card, upgrade modal, traffic chart, sparkline, photo gallery manager, Editor's Pick carousel, `PremiumView` in the owner dashboard
- **Owner dashboard** wired to real `/me/*` endpoints for businesses, stats, reviews (with reply), events
- **Admin dashboard** wired to real endpoints for stats, businesses (list/approve/reject/edit/branch), users, events, categories (list/create/update), audit log, analytics

---

## 2. What partially works

| Thing | What works | What does not |
| --- | --- | --- |
| **OTP signup end-to-end** | Code generated, stored hashed, rate-limited, verified; account created; JWT issued | **No SMS is delivered** — `ESKIZ_*` unset on Railway, so `SmsService` logs instead of sending. The endpoint still returns success. |
| **Admin dashboard** | 8 of 10 views read real data | `AdminReviewsView` is mock (no `GET` review-list endpoint exists); `AdminSettingsView` is a local-state-only form that persists nothing |
| **Owner dashboard** | Businesses, stats, reviews, events are real; ✅ **`InventoryView` real since Phase 10 (2026-10-01)** — product/service catalog CRUD + publish/hide via `GET /me/businesses/:id/menu`, `POST/PATCH/DELETE`; see `ARCHITECTURE.md` §27 | `AdsView` is an honest "coming soon" empty state; `SettingsView` hours form is local-state only and does not save |
| **Password reset** | All three backend endpoints exist and are wired in `api.ts` | The reset code is **logged, not sent** (`auth.service.ts:347` — `TODO(production): send via Eskiz SMS instead of logging. DEV MODE only`) |
| **Sitemaps** | `sitemap-pages.xml` (9), `sitemap-categories.xml` (24), `sitemap-locations.xml` (42 as of Phase 7 — city URLs removed since no `/:lang/city/:slug` route exists; see `DECISIONS.md` D-56) all populated, and category/location URLs now resolve to real Phase 7 landing pages instead of the generic search page | **`sitemap-businesses.xml` contains zero URLs** — the highest-SEO-value file is empty |
| **Business claim** | 8-screen flow complete, submits to `POST /businesses` | Screen 3 is specced as "address (optional)" but `CreateBusinessDto` hard-requires `address` (min 5) and `districtId`, so it had to be made required — a known spec/implementation divergence |
| **Deployment pipeline** | ✅ Both repos deploy automatically from `main` (verified 2026-10-01): Vercel on push; Railway on push **after CI passes** (Wait for CI). Backend live on `ded7b7a` (deployment `6b81b152`, auto-triggered) | Vercel does not wait for CI (Deployment Checks unverified — API 403); no staging environment |
| **Authentication-code security** | ✅ **Phase 15E.2 (2026-10-02)** — codes never logged/returned/thrown; `crypto.randomInt`; one live code per phone + purpose; 5 wrong guesses per phone + purpose per hour across all code rows; atomic single use; no OTP sign-in for SUPPORT/MODERATOR/ADMIN/SUPER_ADMIN; timing equalized; SMS delivery fails closed (503). Backend `0b63889`, Railway `e8379f7b`. See SECURITY §2, D-76 | ⚠️ **Production SMS not configured** (`ESKIZ_EMAIL`/`ESKIZ_PASSWORD` absent): OTP sign-in and password reset answer 503 until the owner sets them |
| **Staff hold no owner capability** | ✅ **Phase 15D.2 (2026-10-02)** — ADMIN and SUPER_ADMIN lost `business.claim` / `business.create` / `business.manage_own`; they are refused at the route on the 29 owner routes, `POST /businesses`, `POST /me/businesses` and `/me/claims`, and the owner dashboard disappears for them (capability-driven UI). Staff keep administering listings via `/admin` (`business.edit_any` etc.). Pre-check: 0 ADMIN- / 0 SUPER_ADMIN-owned businesses in production. See D-75 point 7, `ARCHITECTURE.md` §32.1 | Business Staff (membership) and PLATFORM_OWNER governance are future phases |
| **Capability authorization** | ✅ **Phase 15D (2026-10-02)** — every route declares `@Public` / `@Authenticated` / `@RequireCapability` under a global deny-by-default guard; 20 capabilities in one explicit role table (no inheritance); ownership and conflict-of-interest policies; rank model deleted; route-inventory test + committed snapshot in CI; frontend renders from server-issued capabilities. See `ARCHITECTURE.md` §32, D-75 | PLATFORM_OWNER governance not implemented; Security Hardening backlog (reset-code logging, Vercel CI gate, distributed rate limits, refresh-token reuse detection, remaining rate-limit coverage) untouched |
| **Authorization stabilization** | ✅ **Phase 15B (2026-10-01)** — business profile, hours, catalog and review replies are owner-only (MODERATOR/SUPPORT lost their rank bypass); staff edit other businesses only via audited `/admin` routes with a reason; account suspension follows an explicit table (no self, no SUPER_ADMIN target, SUPER_ADMIN may emergency-freeze an ADMIN); password reset and suspension revoke all sessions; `/auth/*` rate limited; CORS allowlist; audit rows record role/request id/IP/user agent. See `ARCHITECTURE.md` §31, D-74 | PLATFORM_OWNER governance, role management, capability map and step-up re-auth are later phases; Vercel still deploys without waiting for CI (owner dashboard action); the password-reset code is still logged to stdout (SECURITY §13 #3a) |
| **Moderator access & business restoration** | ✅ **Phase 14 (2026-10-01)** — MODERATOR can use the admin panel for business approval and review/report moderation, with owner contact and reporter names withheld; SUPER_ADMIN can hide and restore listings, restoring the exact pre-hide status (new `statusBeforeHide` column) or PENDING. See `ARCHITECTURE.md` §30, D-72/D-73 | Businesses hidden before Phase 14 restore to PENDING (no recorded status); moderators have no stats/home view |
| **Review reporting & moderation** | ✅ **Phase 12 (2026-10-01)** — customers report reviews (`POST /reviews/:id/report`); ADMIN+ works the queue in `AdminReportsView` (hide review / dismiss). See `ARCHITECTURE.md` §29 | MODERATOR still can't use the admin panel (D-68); no auto-hide threshold or rate limit beyond one report per user per review |
| **Admin business operations** | ✅ **Phase 11 (2026-10-01)** — `AdminBusinessesView` can verify/unverify, suspend (APPROVED only, with reason)/restore, promote/end promotion; status filter is server-side over all statuses. New `unverify`/`unsuspend`/`unpromote` routes. See `ARCHITECTURE.md` §28 | No unhide and no hide UI (D-63); no `isFeatured` control (D-66); reports UI deferred — nothing creates reports (D-65); MODERATOR cannot open the admin UI though the API lets them approve/reject businesses |
| **Claiming an existing listing** | ✅ **Phase 9 (2026-10-01)** — `POST /me/claims` → admin `AdminClaimsView` approve/reject → `ownerId` set atomically, `CUSTOMER` → `BUSINESS_OWNER`; status on `ProfilePage`. See `ARCHITECTURE.md` §26 | Claimed ≠ verified (D-58); rejection reason not shown to claimant; pending state not remembered on the business page after reload |
| **Analytics** | Full ingestion + reporting API exists | **The frontend never calls `POST /analytics/view|click|search`**, so `BusinessAnalytics`, `SearchAnalytics` and `ActivityLog` receive no data from the web app. Every owner/admin analytics screen is therefore reading from tables nothing populates. |
| **Search module** | Sophisticated FTS/trigram/transliteration search at `GET /search` | ✅ **Wired in Phase 8** (2026-10-01) — the frontend now calls it for text queries via `type=business`; pure category/district browsing still uses `GET /businesses`. Product-type results still have no UI. See `ARCHITECTURE.md` §25. |
| **Refresh tokens** | Issued, hashed, stored, rotated, revocable; `POST /auth/refresh` exists | **The frontend never stores or uses the refresh token and never calls `/auth/refresh` or `/auth/logout`.** With `JWT_ACCESS_EXPIRES_IN` defaulting to `15m`, users are silently logged out after ~15 minutes. |
| **Health score** | Complete scoring engine, recommendation catalogue, three endpoints | No frontend calls any of them |
| **Command centre** | 10 founder-analytics endpoints | No frontend calls any of them |

---

## 3. What does not work

1. ~~The frontend cannot be deployed.~~ **RESOLVED 2026-09-28** — production serves current `main`. (Historical cause: PowerShell's execution policy blocked the `npx.ps1` shim, so `vercel login` never ran; the fix is `npx.cmd`.)
2. **SMS delivery.** Unconfigured. OTP and password reset are both non-functional for real users.
3. **Payments.** No provider integrated. Every price, tier and payment-method chip in the UI is presentational.
4. **`AdminSettingsView` and dashboard `SettingsView`** accept input and show a saved state but write nothing anywhere.
5. ~~**Products/inventory in the owner dashboard** shows mock rows labelled "Demo" while a working menu API sits unused.~~ **RESOLVED Phase 10 (2026-10-01)** — `InventoryView` runs on the real catalog API; mock data deleted; "Inventory" = catalog, no SKU/stock (D-61).
6. **Social-link previews.** Because the app is SPA-only, Facebook/Telegram/X/WhatsApp scrapers see only the static `index.html` — every shared link previews with the generic site title and no per-page OG image.
7. **`GET /admin/reviews`** does not exist (only `POST /admin/reviews/:id/hide` and `/restore`), so there is no way to list reviews for moderation.
8. **No `/health` endpoint** on the API. It never existed; deploy checklists that expect one will 404.

---

## 4. What is unfinished

- **Tests — nothing at all.** Zero test files in either repo, and no runner installed (no Jest, Vitest, Playwright). The API's `package.json` has no `test` script.
- **Advertising module** — `Advertisement` table and `AdStatus`/`AdPlacement` enums exist; no controller, service, or module. Explicitly deferred to Phase 2 with Click payments.
- **Notifications** — `Notification` table and `NotificationType` enum exist; **no notifications module, no endpoints, nothing writes to the table**.
- **`PlatformSetting`** — table exists; no module reads or writes it. This is what `AdminSettingsView` should be persisting to.
- **`EventAttendee`** — RSVP endpoint exists (`POST /events/:slug/attend`) but no frontend UI calls it.
- **Static generation / prerendering** — deferred, with a complete five-step plan in `docs/SSG.md`.
- **Phase-2 `BusinessType` capabilities** — `inventoryEnabled`, `warehouseEnabled`, `bookingEnabled`, `deliveryEnabled`, `orderingEnabled` flags exist; no modules behind them.
- **Social login** — Telegram and Google buttons are specified in the signup design and appear above the phone field; **no OAuth backend exists**.
- **`sitemap-businesses.xml` generation** — the script exists (`scripts/generate-sitemap.ts`) but the committed output is empty.

---

## 5. Known bugs

Ordered by impact. All are verified in code, not speculative.

| # | Severity | Bug | Evidence |
| --- | --- | --- | --- |
| 1 | **High** | **Sessions die after ~15 minutes.** Refresh tokens are issued but the frontend never stores or uses them; `/auth/refresh` is never called. Only 6 mentions of "refresh" exist in the whole frontend, none of them the token. | `src/contexts/AuthContext.tsx`, `src/lib/api.ts`, `.env.example` `JWT_ACCESS_EXPIRES_IN="15m"` |
| 2 | **High** | **OTP/reset codes are never delivered.** `SmsService.send()` returns silently when unconfigured, and the OTP endpoint still reports success — so the failure is invisible to the caller. | `src/sms/sms.service.ts`, `auth.service.ts:347` |
| 3 | **High** | **Analytics tables are never written from the web app**, so every analytics view renders from empty tables. | No `/analytics/` POST calls anywhere in `src/` |
| 4 | Medium | **Empty `sitemap-businesses.xml`** submitted via `sitemap.xml` index — crawlers are pointed at an empty file. | `public/sitemap-businesses.xml`: 0 `<url>` entries |
| 5 | Medium | **Stale sitemap `lastmod` dates** — all four sub-sitemaps say `2026-08-13`. | `public/sitemap.xml` |
| 6 | Medium | **Two settings forms silently discard input.** | `AdminSettingsView.tsx`, `pages/dashboard/views/SettingsView.tsx` |
| 7 | ~~Medium~~ | ~~**Inventory shows mock data while a real API exists.**~~ ✅ **Fixed Phase 10** — also fixed: public `GET /businesses/:id/menu` served catalogs of non-APPROVED businesses (now 404, D-62); `MenuSection` showed "no menu" when the request had actually failed (now an error state with retry). | `mockData.ts` deleted; `products.service.ts` |
| 8 | Low | **Hardcoded weather placeholder on the home hero.** | `src/pages/home/HeroSection.tsx:30` — `// TODO: Replace with real weather API` |
| 9 | Low | **`SUPPORT` role outranks `BUSINESS_OWNER`** in the hierarchy (3 > 2), so any `@Roles(BUSINESS_OWNER)` route — e.g. `POST /events`, `POST /reviews/:id/reply` — is also open to `SUPPORT`. May be intended; it is not stated anywhere. **Phase 10 note:** catalog writes are still safe — `SUPPORT` clears the role floor but `ProductsService.assertCanManage` requires owner or ≥ `MODERATOR` (pinned by `catalog.authorization.spec.ts`). Hierarchy left unchanged (app-wide impact). | `role-hierarchy.ts`, `roles.guard.ts` |

### Stale comments that will actively mislead the next reader

These are documentation bugs, and they matter because the codebase's comments are otherwise unusually trustworthy:

- **`src/lib/api.ts`** says password reset is *"Confirmed absent on the live API (2026-08-13): all three paths 404"*. **All three now exist.**
- **`src/lib/api.ts`** says business creation is *"Confirmed absent… POST /businesses … 404"*. **It exists** (the session later found it had become `401`, i.e. present).
- **`src/lib/api.ts`** says *"genuinely absent → /admin/reviews, /admin/audit-logs, /admin/settings (404)"*. `/admin/audit` exists (the path probed was wrong); review hide/restore exist.
- **`src/contexts/AuthContext.tsx`** says *"the backend has no profile-update endpoint or age/gender columns yet"*. **`PATCH /users/me` exists and `age`/`gender`/`avatarId` were added in migration `20260815150053_add_profile_fields`.**
- ~~**`src/pages/dashboard/mockData.ts`** says *"Products/inventory have no backend at all"*.~~ File deleted in Phase 10.
- **`docs/SSG.md`** says *"the API returns zero businesses"*. It now returns 4.

---

## 6. Technical debt

| Area | Debt |
| --- | --- |
| **Testing** | Total absence. 118 API routes and 132 components with no automated verification of any kind. This is the single largest risk to future change. |
| **Hardcoded credential** | ✅ **RESOLVED 2026-09-28.** `scripts/seed-role-accounts.js` now reads `process.env.SEED_ROLE_PASSWORD` with no default; the literal was purged from history before the first push; the production credential was rotated to a 192-bit random value and verified on all six accounts. |
| **CORS wide open** | `app.enableCors()` with no origin allow-list. |
| **No rate limiting** | Only OTP requests are throttled, and that is hand-rolled in the service. No `@nestjs/throttler`; login, register and password-reset are unthrottled. |
| **Swagger public in production** | `/docs` returns 200 on the live API, publishing the full 118-route surface. |
| **Mock data still shipped** | Three mock modules remain in the bundle: `src/lib/restaurantMock.ts` (deliberate — deterministic display data for fields the API lacks), `src/pages/admin/adminMockData.ts` (deleted Phase 6), `src/pages/dashboard/mockData.ts` (deleted Phase 10). Only `restaurantMock.ts` remains. |
| **Deterministic fake display data** | `restaurantMock.ts` derives cuisine, price bucket, tags and delivery time from `Math.sin(id * k)`. It is stable and honest in intent, but restaurant cards in production show **invented** cuisine/price/delivery information. |
| **Frontend/backend shape mismatch** | `Business`/`Branch` are not localized server-side but the frontend types assume they are, requiring a `normalizeBusiness`/`normalizeBranch` adapter layer. Sustainable, but it is a permanent tax. |
| **Deprecated table** | `SearchQueryLog` superseded by `SearchAnalytics`; retained intentionally, not yet dropped. |
| **`any` at the API boundary** | `normalizeBranch(raw: any)` / `normalizeBusiness(raw: any)` — deliberate, but untyped. |
| **No error tracking** | No Sentry or equivalent in either repo. Frontend errors reach only the user's console. |
| **No structured logging** | API uses Nest's default `Logger`; no request IDs, no log aggregation configured. |
| **Two repos, no monorepo tooling** | No shared type package; the API's DTOs and the frontend's `src/types/index.ts` are maintained by hand in parallel. |
| **Single `master` branch, no CI** | Both repos: `master` only, no GitHub Actions, no PR flow. Commits are large and multi-concern (e.g. `1d53f7f` = "Restaurant search, premium monetization UI, and reliability fixes"). |

---

## 7. Current development status

| | Frontend | API |
| --- | --- | --- |
| Branch | `master` | `master` |
| `HEAD` | `dd08485` — *Add the business claim flow — eight single-field screens with a live preview* (2026-09-27) | `4e3c6bc` — *Add phone OTP auth, plus menu/upload/users modules and role hierarchy* (2026-09-26) |
| Working tree | **clean** | **clean** |
| Commits total | 6 | 4 |
| Build | `npm run build` passes (`tsc -b && vite build`) | `nest build` (last built `dist/` present) |
| Deployed | **Current** — Vercel, project `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH`, team `john-s3` | **Current** — Railway, verified live |

---

## 8. What was implemented most recently

In order, newest first:

1. **`dd08485` (2026-09-27) — Business claim flow.** Eight single-field screens (`NameStep` … `SummaryStep`), `useClaimFlow` hook, `BusinessPreview` component composing `HeroImage` + `BusinessInfoHeader` from a synthesized `Business` object, 40/60 split layout, home CTA banner repointed from `/search` to `/claim`, plus a `/uz/business/claim → /uz/claim` redirect.
2. **`ea2a5ff` (2026-09-26) — Phone-first OTP signup.** `OtpInput` upgraded in place (kept API-compatible so `ForgotPasswordFlow` still works), `src/lib/phone.ts` helpers, `useSignup` hook, three screens, `AuthModal` register tab repointed to `/signup`, `RegisterForm.tsx` deleted.
3. **`4e3c6bc` (2026-09-26, API) — OTP auth backend.** `requestOtp`/`verifyOtp`/`updateProfile` in `AuthService`, three DTOs, `SmsService` (Eskiz) as a `@Global` module, `PUT /auth/profile` with `FileInterceptor('photo')`, plus the menu/upload/users modules and the role hierarchy.
4. **`1d53f7f` (2026-09-25) — Restaurant search + premium monetization UI + reliability fixes.** `CategorySearchPage`, `RestaurantCard`, cuisine/price/sort controls, the whole `src/components/premium/` set, `PricingPage`, `src/lib/premium.ts`, gold/silver/bronze/navy/brand-green tokens, `ErrorBoundary`, centralised 401 handling, `escapeHtml` before Leaflet `divIcon` HTML.

**The last actual work attempted was the production deploy**, which reached the API successfully and stalled on the frontend.

---

## 9. What should logically happen next

Ordered. Rationale given because the order is not arbitrary.

1. **Unblock and complete the frontend deploy** — `npx.cmd vercel login` then `npx.cmd vercel --prod`. Everything else is invisible to users until this lands. Do **not** run `vercel link`; the link is correct.
2. **Run the post-deploy verification** that was queued and never executed: signup (phone → "Kod yuborildi"), claim (typeahead → 8 steps → submit), premium UI (Editor's Pick carousel, "Faqat Premium" filter, gold borders), regressions (search, business detail, login, favourites), and mobile at 375px (no horizontal overflow, bottom nav visible, no iOS zoom).
3. **Configure Eskiz on Railway** (`ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`) and register the SMS template in the Eskiz dashboard. Until this is done the signup flow that was just shipped cannot actually be used by anyone.
4. ~~Rotate the seed-script password~~ — **✅ DONE 2026-09-28** — rotated to a 192-bit random secret held in Railway's `SEED_ROLE_PASSWORD`; script parameterized; literal purged from history before the first push.
5. **Fix the refresh-token gap.** Store `refreshToken` at login/OTP-verify and call `POST /auth/refresh` on 401 before giving up. This converts a 15-minute session into a 30-day one and is a small, high-value change.
6. **Wire analytics ingestion.** Call `POST /analytics/view` on business detail and `POST /analytics/click` on call/direction/website/share/favourite. Without it, the entire analytics and health-score investment stays dark.
7. **Lock down the API surface**: restrict CORS to the known origins, gate or disable `/docs` in production, add `@nestjs/throttler` on auth routes.
8. **Populate `sitemap-businesses.xml`** and refresh `lastmod`. Now that the API returns real businesses, the generator has something to emit.
9. **Introduce a test runner and cover the auth + RBAC paths first.** Those are where a silent regression is most expensive.
10. **Decide on prerendering before launch**, per `docs/SSG.md` — the social-scraper gap is a real acquisition cost for a directory that expects link sharing.
