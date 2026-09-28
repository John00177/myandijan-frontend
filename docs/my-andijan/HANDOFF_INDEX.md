# HANDOFF_INDEX — My Andijan

**Entry point for the next engineer or AI architect.** Read this document first, end to end. It is short by design; everything else is reference.

Compiled 2026-09-28 from the two live repositories, their git history, a recovered Claude Code transcript (2026-08-24 → 2026-09-27), and read-only probes of the live API and site.

---

## 1. Project summary

**My Andijan (`myandijan.uz`) is a multilingual business directory and city guide for the Andijan region of Uzbekistan.** Consumers search and browse local businesses on a map, read and write reviews, save favourites and follow events. Business owners claim or create a listing and manage it from an owner dashboard. Staff moderate the catalogue through an admin dashboard. Three languages — **`uz` (source of truth), `ru`, `en`** — with every route language-prefixed.

Think Yelp/2GIS, scoped to one Uzbek region, mobile-first and trilingual from the ground up. The Yelp comparison is literal: a dedicated session reverse-engineered Yelp's signup and claim flows and the patterns were deliberately adopted.

**Two repositories, no monorepo tooling, no shared type package:**

| Repo | Path | Stack | Hosting |
| --- | --- | --- | --- |
| **`myandijan-frontend`** | `C:\Users\JKT443\Desktop\myandijan-frontend` | React 19 · TypeScript 6 · Vite 8 · Tailwind 3 | Vercel → `myandijan.uz` |
| **`my-andijan-api`** | `C:\Users\JKT443\Desktop\my-andijan-api` | NestJS 10 · Prisma 5 · PostgreSQL | Railway |

**Scale:** 118 API routes · 17 feature modules · 31 database models · 19 enums · 11 migrations · 168 frontend source files · 132 components · 385 i18n keys × 3 languages · **0 tests** · **0 AI features**.

---

## 2. Current status

| Area | Status |
| --- | --- |
| **API** | 🟢 **Deployed, verified, current.** All probed endpoints 200; auth guard working. |
| **Database** | 🟢 Live on Railway, 11 migrations applied, geography + taxonomy seeded. **4 businesses, 0 featured, 0 events** — pre-launch content volume. |
| **Frontend code** | 🟢 `HEAD = dd08485`, working tree clean, `npm run build` passes in 2.5 s, zero errors. |
| **Frontend production** | 🟢 **Current** (2026-09-28). Serves the `main` build — entry chunk byte-identical to a local build; signup, claim, pricing and premium all live. |
| **Blocker** | 🔴 One local shell problem. See §5. |
| **SMS / OTP** | 🔴 Built, **unconfigured** — reports success, sends nothing. |
| **Payments** | ⚪ UI only. No provider. |
| **Tests** | 🔴 **None anywhere.** |

**The single most important framing fact:** roughly **80 of 118 API endpoints have no frontend caller.** The backend is *not* the bottleneck. Most near-term product value is unlocked by wiring frontend UI against endpoints that already exist and already work.

---

## 3. Most important files

Read these before changing anything.

| File | Why |
| --- | --- |
| **`my-andijan-api/prisma/schema.prisma`** | **The most valuable file in the project.** 1193 lines, densely commented with the rationale for nearly every non-obvious choice — including ones that reversed an earlier draft and invariants the database cannot enforce. For the pre-2026-08-24 work it is the *only* surviving record of intent. |
| `myandijan-frontend/src/lib/api.ts` | Every network call. Holds the response-normalisation layer and centralised 401 handling. **Its comments about missing endpoints are stale — do not trust them.** |
| `myandijan-frontend/src/contexts/AuthContext.tsx` | Session truth, plus the `writeSeqRef` stale-response guard |
| `my-andijan-api/src/common/constants/role-hierarchy.ts` + `guards/roles.guard.ts` | The whole authorization model in ~40 lines |
| `my-andijan-api/src/auth/auth.service.ts` | JWT + OTP + reset. All the security constants live here. |
| `myandijan-frontend/src/App.tsx` | Route table and the three-shell structure |
| `myandijan-frontend/src/i18n/uz.ts` | Compiler-enforced i18n source of truth |
| `myandijan-frontend/docs/SSG.md` | The prerendering plan. Read before touching the router or any `localStorage` read. |
| `myandijan-frontend/tailwind.config.ts` | The entire design system |
| `my-andijan-api/src/health-score/scoring.ts` | Pure-function scoring engine, written to be testable without a database |
| ⚠️ `my-andijan-api/scripts/seed-role-accounts.js` | **Contains a hardcoded production password.** See §5. |

---

## 4. Most important architectural decisions

Full record — 52 decisions with lock status — in [`DECISIONS.md`](DECISIONS.md). The load-bearing ones:

1. **`Business` is the brand; `Branch` holds ALL location data** — district, city, address, phone, lat/lng, hours. Every geographic query routes through `Branch`. 🔒
2. **Reviews are branch-scoped; favourites are business-scoped.** Service quality is location-specific; users favourite a brand. 🔒
3. **Vanilla PostgreSQL only** — the schema states the DB must be *"relocatable to an Uzbek host."* No PostGIS, no `pgvector`. `pg_trgm` is the sole exception. 🔒
4. **Role checks are a hierarchy FLOOR, not exact match.** `@Roles(X)` means "X or above", which is what lets `SUPER_ADMIN` satisfy all 118 routes implicitly. 🔒
5. **`dayOfWeek` is `0 = Monday … 6 = Sunday`** — *not* `Date.getDay()`. 🔒
6. **Custom i18n, `uz` as the compiler-enforced source of truth**, and **`t()` has no interpolation.** 🔒
7. **Phone-first auth**, `/^\+998\d{9}$/`, with OTP stored in PostgreSQL rather than Redis. 🔒
8. **Yelp-derived acquisition UX:** one field per screen, **no progress bar** (deliberate — it reduces drop-off), "Bepul" in claim headlines, skip on optional steps, account created before the profile step. 🔒
9. **`AnimatePresence mode="wait"` is banned for screen transitions.** It caused a silent, state-invisible deadlock. 🔒
10. **Health scores recompute on write, never on a cron**; blend weights live in the service so they tune without a migration. 🔒
11. **Command-centre log tables deliberately have no foreign keys** — high-volume append-only logs. 🔒
12. **`ActivityLog` stores an `ipHash`, never a raw IP.** 🔒
13. **Static generation deferred** with a written five-step plan — three real blockers, all verified. 🔓 **Revisit: the premise has changed.**
14. **Supabase Storage with the `service_role` key, server-side only** — the `anon` key cannot pass RLS without a Supabase Auth session. 🔒

---

## 5. Current blockers

### 🟢 Blocker 1 — RESOLVED: the frontend is deployed and current

**Root cause is local, not Vercel.** PowerShell's execution policy blocks `D:\Node.js\npx.ps1`, so **every** `npx`/`npm` command the developer ran — `vercel login`, `vercel link`, and four `npm i -g vercel` attempts — failed before Vercel was ever invoked.

```bash
npx.cmd vercel login
```
```bash
npx.cmd vercel --prod
```

- **`npx.cmd`, not `npx`.**
- **`vercel login` is interactive and must be the human.** An agent must not run it or handle the token.
- **Do NOT run `vercel link`.** An earlier session claimed `.vercel/project.json` held a stale `orgId`; that was **verified wrong and retracted** — `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH` and `team_ErWmdvPfiaDk9mHs6Tv1GFuu` (team `john-s3`) are both correct.
- **PowerShell 5.1 has no `&&`.** Run separately.
- The Vercel MCP server can read the account but **cannot deploy** — the project has no Git connection.

### 🔴 Blocker 2 — OTP signup cannot be completed by anyone

`ESKIZ_EMAIL` / `ESKIZ_PASSWORD` are **unset on Railway**. `SmsService` deliberately never throws, so `POST /auth/otp/request` returns `{"success":true,"message":"Kod yuborildi"}` **while sending nothing.** The failure is invisible.

Set the three `ESKIZ_*` variables **and register the SMS template in the Eskiz dashboard** (`"My Andijan tasdiqlash kodi: {code}. @myandijan.uz #{code}"` — the trailing line enables Android WebOTP). **Password reset needs a separate code fix** (`auth.service.ts:347` still logs instead of sending).

### 🟢 Blocker 3 — RESOLVED: production credential rotated

> **RESOLVED 2026-09-28.** Script parameterized to `process.env.SEED_ROLE_PASSWORD` (no default), password echo removed, literal purged from history before the first push (`4e3c6bc` → `002fca9`), and **the production credential rotated** to a 192-bit random value stored in Railway's `SEED_ROLE_PASSWORD` variable. All six role accounts re-hashed at bcrypt cost 12 and verified; roles/status unchanged; production health confirmed. The exposed value was confirmed live before rotation, so this was necessary rather than precautionary.

`my-andijan-api/scripts/seed-role-accounts.js:14` — `PLAIN_PASSWORD = '<REDACTED>'`, applied to **`SUPER_ADMIN` (`+998994796431`)** and five other roles, printed to stdout, documented as run against production via `railway ssh`, and re-applied on every run (`upsert`).

✅ **Fully remediated 2026-09-28.** The literal never reached GitHub (history rebuilt before the first push), the script is parameterized, and the production credential was rotated and verified. The exposed value was confirmed live beforehand, so rotation was necessary.

---

## 6. Current priorities

The shortest path to a launchable product. Details in [`ROADMAP.md`](ROADMAP.md).

| # | Action | Effort |
| --- | --- | --- |
| 1 | ~~Deploy the frontend~~ — ✅ **DONE**: production serves current `main` (verified 2026-09-28) | — |
| 2 | ~~Post-deploy verification~~ — ✅ **DONE 2026-09-28**: homepage, `/uz` `/ru` `/en`, search, business detail, signup, claim, pricing all render with live API data; auth modal gates correctly | — |
| 3 | **Configure Eskiz + register the template** | ~1 h |
| 4 | ~~Rotate the seed-script password~~ — **✅ DONE 2026-09-28** — rotated to a 192-bit random secret held in Railway's `SEED_ROLE_PASSWORD`; script parameterized; literal purged from history before the first push. | — |
| 5 | **Fix password-reset SMS** (`auth.service.ts:347`) | Small |
| 6 | **Wire analytics ingestion** — 3 endpoints exist, nothing calls them, so every analytics feature reads empty tables | Small |
| 7 | **Fix the refresh-token gap** — sessions currently die after ~15 min mid-flow | Small |
| 8 | **`npm run sitemap`** — `sitemap-businesses.xml` has 0 URLs; the generator is correct, it was just last run when the API had no businesses | One command |
| 9 | **Lock down the API** — restrict CORS, gate `/docs`, add `@nestjs/throttler`, throttle `/analytics/*` | ~2 h |

---

## 7. Links to every handoff document

| Document | Read it when |
| --- | --- |
| [`MASTER_CONTEXT.md`](MASTER_CONTEXT.md) | You need product vision, users, scope, monetization, constraints, and what must not change |
| [`CURRENT_STATE.md`](CURRENT_STATE.md) | You need what works, what partially works, what's broken, known bugs, technical debt |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | You need the real architecture — frontend, API, DB, auth, storage, search, maps, caching, logging, deployment |
| [`TECH_STACK.md`](TECH_STACK.md) | You need exact declared **and installed** versions |
| [`DATABASE.md`](DATABASE.md) | You are touching the schema. All 31 models field by field, plus 13 known schema problems |
| [`API.md`](API.md) | You are touching an endpoint. All 118 routes with auth, DTOs, and ✅/⭕ frontend-usage markers |
| [`FRONTEND.md`](FRONTEND.md) | You are touching the UI. Pages, components, state, forms, responsive behaviour, 14 UX issues |
| [`FEATURES.md`](FEATURES.md) | You need to know whether something exists. Explicit status per feature |
| [`SEO.md`](SEO.md) | You are touching metadata, sitemaps, structured data, or rendering |
| [`AI.md`](AI.md) | Someone asks about AI features (there are none, and why that matters) |
| [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) | You are writing UI. Tokens, primitives, motion, 14 deliberate UX decisions |
| [`INTEGRATIONS.md`](INTEGRATIONS.md) | You are touching an external service |
| [`ENVIRONMENT.md`](ENVIRONMENT.md) | You need an env var. Names and purpose only — **no values** |
| [`SECURITY.md`](SECURITY.md) | Before shipping anything, and definitely before adding a git remote |
| [`ROADMAP.md`](ROADMAP.md) | You are planning. NOW / NEXT / LATER, tagged by provenance |
| [`DECISIONS.md`](DECISIONS.md) | **Before changing architecture.** 52 decisions with lock status, plus 10 open questions |
| [`TODO.md`](TODO.md) | You want a task. Grouped and marked `[ ] [~] [x] [?]` |
| [`SESSION_CONTEXT.md`](SESSION_CONTEXT.md) | You want the development history and the non-obvious bugs already solved |
| [`CHATGPT_CONTEXT.md`](CHATGPT_CONTEXT.md) | **You are ChatGPT acting as architect/reviewer** — what you can rely on, what to ask for, and where this project will mislead a reviewer who cannot execute code |
| [`../SSG.md`](../SSG.md) | You are considering SSR/prerendering (pre-existing doc, still valid) |
| [`../../CLAUDE.md`](../../CLAUDE.md) | You are an AI agent — the working contract |
| [`../../README.md`](../../README.md) | Setup, commands, deployment |

Plus [`my-andijan-api/CLAUDE.md`](../../../my-andijan-api/CLAUDE.md) in the API repo.

---

## 8. How another AI should start

1. **Read this document, then [`CURRENT_STATE.md`](CURRENT_STATE.md), then [`DECISIONS.md`](DECISIONS.md).** That is ~30 minutes and covers 80% of what you need.
2. **Read `prisma/schema.prisma` in full.** It is the densest source of intent in the project.
3. **Confirm the current state yourself** before acting — `git log --oneline -3` and `git status` in both repos, `npm run build` in both.
4. **When told an endpoint is missing, check the controllers.** Several comments in `src/lib/api.ts` assert 404s that are now wrong. They were true when written and were never revisited.
5. **Check `API.md`'s ⭕ markers before building a backend endpoint.** It very likely already exists.
6. **Probe against controls**, the way earlier sessions did: a 404 from the router means the route is missing; a 401 means it exists and rejected you. `/auth/login` → 400, `/users/me` → 401 are useful controls.
7. **Verify specs against reality.** Seven false premises were found across two specs in this project's history. The productive sessions were the ones that checked and reported rather than implemented as written.
8. **Run `npm run build` before declaring anything done.** `tsc -b` catches i18n gaps, type drift and broken imports.
9. **Write the *why* in comments.** This codebase's rationale comments are its best asset — and correct the stale ones when you find them.
10. **Do not commit unless asked.** Run a secret scan when you do.

---

## 9. What NOT to assume

| Don't assume | Reality |
| --- | --- |
| ~~The live site reflects the code~~ | **It does, as of 2026-09-28.** Both platforms run current `main`. But neither auto-deploys from GitHub, so re-verify after any new commit. |
| **A 200 means a page or asset exists** | `vercel.json` rewrites `/(.*)` → `/index.html`, so **every** URL on the domain returns 200 with HTML. **Check `content-type` and bundle contents.** |
| **Comments in `src/lib/api.ts` are current** | Several assert endpoints 404 that now exist. Same for `AuthContext` ("no profile-update endpoint or age/gender columns") and `docs/SSG.md` ("the API returns zero businesses"). |
| **The backend is the bottleneck** | ~80 of 118 routes have no frontend caller. |
| **`GET /search` powers the search page** | It does not. The frontend uses `GET /businesses?search=`. The sophisticated FTS endpoint is unused. |
| **Analytics dashboards show real data** | The frontend never calls `POST /analytics/*`, so the source tables are empty. |
| **OTP works** | The endpoint returns success and sends nothing. |
| **Restaurant cuisine/price/delivery are real** | Derived from `Math.sin(id * k)` in `restaurantMock.ts`. Deterministic and invented. |
| **Settings forms save** | `AdminSettingsView` and dashboard `SettingsView` both discard input. |
| **`dayOfWeek` is `Date.getDay()`** | It is **0 = Monday**. |
| **There are tests** | Zero, in both repos. Also: the API's `lint`/`format` scripts reference uninstalled tools and fail. |
| **`vercel link` is needed** | It is not. That diagnosis was wrong and was retracted. |
| **There is a `/health` endpoint** | There never was. Use `GET /categories`. |
| **There is a global `/api` prefix** | There is none. Routes are `/auth/login`, not `/api/auth/login`. |
| **There are AI features** | None, and none were ever discussed. |
| **There is 3D / immersive content** | None. A genuine blank. |
| **The 15-minute session timeout should be fixed by raising the TTL** | Implement client-side refresh instead — the server side already works. |
| **Soft deletes are enforced by the database** | They are application-level only. A query that forgets `deletedAt: null` returns deleted rows. |
| **"One pending claim per business" is enforced** | The schema says it needs a partial index and is service-layer only. |
| **A product spec exists** | No PRD, business plan, pricing rationale, launch plan, or design file exists in either repo. |

---

## 10. What requires verification

Open questions this review could not answer from the repositories. **Each needs the owner, or a check against live infrastructure.**

| # | Question |
| --- | --- |
| 1 | **Is Uzbek data *residency* a legal requirement, or only portability?** The schema constrains the DB to vanilla PostgreSQL so it is *"relocatable to an Uzbek host"* — but it currently runs on **Railway**, with images on **Supabase**. Portability is preserved; residency is not. |
| 2 | **Do database backups exist and restore?** Nothing in-repo configures them. |
| 3 | **Has the API's `.env` ever been shared, pasted, or backed up?** It holds the Supabase `service_role` key and the production `DATABASE_URL`. |
| 4 | **Is `JWT_ACCESS_SECRET` actually set on Railway?** There is no default and no boot validation. |
| 5 | **Should `SUPPORT` outrank `BUSINESS_OWNER`?** It does (3 > 2), so support staff can write business content. Never stated as intended. |
| 6 | **Which brand palette wins** — shipped blue/cyan, or the specced navy/green? Both exist as tokens. |
| 7 | **Are the 4 live businesses real or test data?** |
| 8 | **Which map tile provider is configured?** No key is present, implying OSM's public tiles — which have a usage policy a production directory may exceed. |
| 9 | **Does `AuditLog.before`/`after` ever snapshot `passwordHash`?** It stores arbitrary entity JSON. |
| 10 | **Is `Review.rating` bounded 1–5 in its DTO?** The column is a bare `Int` with no DB constraint. |
| 11 | **Does `replyToReview()` work?** It uses `PATCH /reviews/:id/reply` (edit), not `POST` (create). |
| 12 | **Who is meant to call `POST /admin/analytics/aggregate`?** Nothing schedules it; there is no cron. |
| 13 | **Was analytics ingestion deferred or forgotten?** Nothing in the recovered history explains it. |
| 14 | **Registrar / DNS for `myandijan.uz`?** A session prompt says "UzCloud"; not verifiable from the repos. |
| 15 | **Production PostgreSQL version?** |
| 16 | **Target launch date, marketing plan, competitive positioning?** |

---

## 11. Final audit findings

A second pass over the whole codebase after the documents were written. Everything below is verified, not inferred.

### ✅ Build integrity — clean
- `myandijan-frontend`: `npm run build` (`tsc -b && vite build`) **passes, 2.52 s, zero errors.**
- `my-andijan-api`: `nest build` **passes, exit 0.**
- `oxlint`: **16 warnings, 0 errors.** Fifteen are `react(only-export-components)` fast-refresh hygiene. **One is substantive:** `src/pages/SearchPage.tsx:112` — `useMemo` depends on `districts`, which changes every render, so the memo never holds.
- **No broken imports found** in either repo.

### 🔴 Dead code — three genuine findings
1. **`myandijan-frontend/src/lib/profileCompletion.ts` — imported by nothing.** Its own header says it exists because `ProfileCompletionBanner` had this logic *"while ProfilePage had no notion of it at all"* — i.e. it was extracted to be the shared source of truth. **`ProfileCompletionBanner` never imports it.** An incomplete refactor: the extraction was written and never wired in.
2. **`myandijan-frontend/src/pages/admin/charts/ChartCard.tsx` — imported by nothing.** `AnalyticsView` uses `recharts`' `ResponsiveContainer` directly.
3. **`my-andijan-api/src/sms/sms.module.ts` — imported by nothing**, so its `@Global` declaration has no effect and the file never loads. `SmsService` works because `AuthModule` provides it directly. (For `UploadService` the same pattern is deliberate and documented; for `SmsService` it makes the module dead.)

Also: **`sonner` is present in the frontend's `node_modules` but absent from `package.json` and imported nowhere** — an orphaned install a clean `npm ci` would drop.

### 🔴 Duplicate / overlapping implementations
- **Two search implementations:** `GET /search` (FTS + trigram + transliteration) and `GET /businesses?search=`. Only the second is used.
- **Two profile-update endpoints:** `PUT /auth/profile` (multipart, OTP signup) and `PATCH /users/me` (general).
- **Two review-create paths:** `POST /reviews` (branch) and `POST /businesses/:id/reviews` (business → primary branch).
- **Three reply paths:** `POST /reviews/:id/reply`, `PATCH /reviews/:id/reply`, `POST /me/reviews/:id/reply`.
- **Three business-update paths:** `PATCH /businesses/:id`, `PATCH /me/businesses/:id`, `PATCH /admin/businesses/:id`.
- **Two business-create paths:** `POST /businesses`, `POST /me/businesses`.
- **Three overlapping image columns** on `Business`: `logoUrl`, `coverUrl`, `coverPhoto`.
- **Two search-log tables:** `SearchQueryLog` (deprecated, documented) and `SearchAnalytics`.
- **Input styling duplicated three times** as string constants (`AdminSettingsView`, dashboard `SettingsView`, `StepShell`'s `FIELD_CLASSES`).
- **~43 hand-rolled toast usages** (`useState` + 3000 ms `setTimeout`) with no shared primitive.

### 🟡 Frontend surfaces with no backend support
| Surface | Missing backend |
| --- | --- |
| `/uz/pricing`, `UpgradeModal`, `PlanCard` | No payment provider, no subscription model, no billing table |
| `AdminSettingsView` | `/admin/settings` does not exist (`PlatformSetting` table exists, unused) |
| `AdsView` | No advertising module (Phase 2) |
| Telegram / Google login buttons | No OAuth backend |
| `AdminReviewsView` | No `GET /admin/reviews` list endpoint |
| `PhotoGalleryManager` | `BranchPhoto` exists; no CRUD endpoints for it |

### 🔴 Backend capability with no frontend usage — ~80 routes
Concentrated in five areas: **search (1)**, **analytics ingestion (3)**, **command centre (10)**, **health score (3)**, **admin actions (20 of 31)** — claims, reports, review moderation, verify, suspend, promote, event approve/reject, category delete/reorder, district/city editing, user suspend/activate. Plus `GET /me/claims`, owner event CRUD, branch creation, events detail/RSVP, `POST /auth/refresh`, `POST /auth/logout`, and four `/geography/*` routes.

### 🔴 Unused database models
**`Notification`**, **`PlatformSetting`** and **`Advertisement`** are read and written by nothing. `EventAttendee` has an endpoint but no UI.

### 🔴 Missing / dead environment variables
- **Missing from `.env.example` but read by code (7):** `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`, `ESKIZ_BASE_URL`. Onboarding from `.env.example` yields an API that **will not boot** (`UploadService`'s constructor throws).
- **Declared but read by nothing:** `JWT_REFRESH_SECRET` (refresh tokens are opaque random bytes, not JWTs) and `SUPABASE_ANON_KEY`.
- **Naming inconsistency:** the app reads `VITE_SITE_URL`; the sitemap script reads `SITE_URL`.

### 🟡 Code TODOs — only two, both real
- `myandijan-frontend/src/pages/home/HeroSection.tsx:30` — `// TODO: Replace with real weather API`
- `my-andijan-api/src/auth/auth.service.ts:347` — `TODO(production): send via Eskiz SMS instead of logging. DEV MODE only`

No `FIXME`, no `HACK`, no `XXX`, no `@ts-ignore`, no `@ts-expect-error` anywhere in either `src` tree.

### 🟡 Mock / hardcoded / fake implementations
| Item | Nature |
| --- | --- |
| `src/lib/restaurantMock.ts` | **Ships to production.** Cuisine, price, tags, delivery time from `Math.sin(id * k)` |
| `src/pages/admin/adminMockData.ts` | Admin reviews (no list endpoint) |
| `src/pages/dashboard/mockData.ts` | Inventory — **and a real menu API exists** |
| `AdminSettingsView` | Accepts input, shows success, persists nothing |
| dashboard `SettingsView` | Same |
| `HeroSection` weather | Hardcoded placeholder |
| Social login buttons | Render, do nothing |
| `scripts/seed-role-accounts.js` | Hardcoded production password |

### ✅ Security — the clean parts
**No SQL injection.** All ~20 raw-query sites use Prisma's tagged-template `$queryRaw` with `Prisma.sql` parameterization; **no `$queryRawUnsafe`/`$executeRawUnsafe` anywhere**; the single `Prisma.raw()` call takes only the hardcoded literals `'b.id'` / `'p.business_id'`. XSS is defended where it mattered (`escapeHtml()` before Leaflet `divIcon`; `\u003c` escaping in `JsonLd`). Privilege escalation via registration is blocked by `@IsIn([CUSTOMER, BUSINESS_OWNER])`. `whitelist` + `forbidNonWhitelisted` are both on. bcrypt cost 12 everywhere. OTP/reset codes and refresh tokens are all hashed at rest. `ActivityLog` stores `ipHash`, never a raw IP.

### 🔴 Security — the open parts
Hardcoded credential (§5) · `app.enableCors()` with no allow-list · `/docs` public in production · no rate limiting except the OTP cap · **unauthenticated writes at `POST /analytics/*`** · no `helmet` · no global exception filter · no EXIF stripping on uploads (**GPS coordinates may be published**) · uploads public and permanent with no deletion path. Full ranked list in [`SECURITY.md`](SECURITY.md).

### ✅ Document consistency
Cross-checked; no contradictions found between the 19 documents. Counts used consistently throughout: **118 routes · 31 models · 19 enums · 11 migrations · 17 modules · 45 DTOs · 168 frontend files · 132 components · 385 i18n keys × 3 · 0 tests · 0 AI features.** Two claims were corrected during this audit and the affected documents updated: `ARCHITECTURE.md` (on `SmsModule`) and `FRONTEND.md` (on `profileCompletion.ts`).

### 🔴 Undocumented decisions — now recorded
Ten decisions were **never actually made** and are listed at the end of [`DECISIONS.md`](DECISIONS.md): the brand palette, the `SUPPORT` ranking, data residency, testing strategy, monorepo/shared types, branching/CI, who calls the aggregation job, why analytics ingestion is unwired, what happens to `Notification`/`PlatformSetting`, and whether `restaurantMock` is acceptable in production.

---

## 12. One-paragraph verdict

**This is a well-engineered project in an awkward position.** The backend is essentially complete and genuinely good — parameterized SQL throughout, thoughtful schema design with recorded rationale, a sophisticated Uzbek-aware search layer, real anti-abuse constraints, and privacy-by-design in the logging. The frontend is equally complete locally, with full trilingual parity and a careful SEO head layer. **But almost none of the last month's work is visible to users**, because a Windows shell-policy problem has blocked the deploy; the signup flow that two sessions built cannot be completed by anyone because SMS was never configured; and a large fraction of the backend has no UI in front of it. **None of the blocking problems are large.** The first nine items in §6 are mostly single commands or small changes, and they convert a stalled project into a launchable one. The two things that genuinely need attention beyond that are **the committed credential** and **the total absence of tests**.
