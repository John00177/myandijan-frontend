# TODO — My Andijan consolidated task list

> Compiled 2026-09-28 from code `TODO`s, unfinished features, the pending-task list recovered from the final session, and this review's findings.
>
> **Markers:** `[ ]` TODO · `[~]` IN PROGRESS · `[x]` DONE · `[?]` UNKNOWN / needs investigation
>
> Items carry a provenance tag: **[CODE]** a literal `TODO` comment · **[SESSION]** an explicitly pending task from session history · **[REVIEW]** found by this audit.

---

## 🔴 Critical bugs

- [ ] **Rotate the seed-script password in production** (the one remaining step — code and history are fixed) — `api/scripts/seed-role-accounts.js:14`. Hardcoded plaintext password applied to `SUPER_ADMIN` (`+998994796431`), `ADMIN`, `MODERATOR`, `SUPPORT`, `BUSINESS_OWNER`, `CUSTOMER`; printed to stdout; documented as run against production via `railway ssh`; `upsert` re-applies it on every run. **[SESSION]** — flagged at commit time, never done
- [x] **Parameterize** that script to `process.env.SEED_ROLE_PASSWORD` with **no default**, and remove the `console.log` of the password — done 2026-09-28 **[SESSION]**
- [x] **Purge the credential from git history before adding any git remote** — done 2026-09-28: `4e3c6bc` rebuilt as `002fca9`; verified absent from all reachable commits before the first push. **Rotation in production is still outstanding.** **[REVIEW]**
- [ ] **Sessions die after ~15 minutes.** Frontend never stores `refreshToken` and never calls `POST /auth/refresh`. A user can be signed out mid-claim-flow and lose the submission. Fix on the client — do **not** just raise `JWT_ACCESS_EXPIRES_IN` **[REVIEW]**
- [ ] **OTP codes are never delivered.** `ESKIZ_*` unset on Railway; `SmsService` logs and returns **success**, so the failure is invisible to callers. Signup is unusable by real users **[SESSION]**
- [ ] **Password-reset codes are logged, not sent** — `api/src/auth/auth.service.ts:347` `TODO(production): send via Eskiz SMS instead of logging. DEV MODE only`. **Configuring Eskiz does not fix this**; it needs a code change **[CODE]**
- [ ] **Analytics tables are never written.** Frontend calls none of `POST /analytics/view|click|search`, so owner analytics, the command centre, `AnalyticsView` and the health score's `visibilityScore` all read empty tables **[REVIEW]**

## 🚧 Blocking issues

- [~] **Frontend deploy blocked.** Root cause is local: PowerShell's execution policy blocks `D:\Node.js\npx.ps1`, so `vercel login`, `vercel link` and four `npm i -g vercel` attempts all failed before Vercel was invoked **[SESSION]**
  - [ ] Run `npx.cmd vercel login` (interactive — **must be the human**, not an agent)
  - [ ] Run `npx.cmd vercel --prod`
  - [x] **Do NOT run `vercel link`** — verified against the Vercel API; the link is correct and the earlier "stale orgId" diagnosis was retracted
  - [ ] Note: PowerShell 5.1 has no `&&` — run separately or chain with `;`
  - [ ] Optional: `npm.cmd i -g vercel` so `npx` stops re-resolving the package
- [ ] **Run the queued post-deploy verification** (never executed) **[SESSION]**
  - [ ] Signup: phone → "Kod yuborildi" → OTP → optional profile
  - [ ] Claim: typeahead → 8 steps → submit
  - [ ] Premium UI: Editor's Pick carousel, "Faqat Premium" filter, gold borders
  - [ ] Regressions: search, business detail, login, favourites
  - [ ] Mobile 375px: no horizontal overflow, bottom nav visible, no iOS zoom
- [ ] **Configure Eskiz on Railway** — `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM` **[SESSION]**
- [ ] **Register the SMS template in the Eskiz dashboard** — `"My Andijan tasdiqlash kodi: {code}. @myandijan.uz #{code}"` (the trailing `@domain #code` enables Android WebOTP) **[SESSION]**
- [ ] **Payments block all monetization.** No provider, no webhooks, no billing/subscription table. Schema implies **Click** first (*"ships with Click payments"*) **[CODE]**

---

## Backend

### Unwired capability — endpoints exist, nothing calls them
- [ ] `GET /search` — the `pg_trgm`/tsvector/transliteration search. **Nothing calls it**; the frontend uses `GET /businesses` **[REVIEW]**
- [ ] **10 command-centre endpoints** — no UI at all **[REVIEW]**
- [ ] **6 `/me/analytics/*` endpoints** — no UI **[REVIEW]**
- [ ] **3 health-score endpoints** — no UI **[REVIEW]**
- [ ] **20 of 31 admin endpoints** — no UI (claims ×3, reports ×2, review hide/restore, verify, suspend, promote, events approve/reject, category delete + reorder, district/city edit, user suspend/activate) **[REVIEW]**
- [ ] `GET /me/claims` — owners cannot see their claim's status **[REVIEW]**
- [ ] `POST /me/businesses`, `POST /me/businesses/:id/branches`, `POST|PATCH|DELETE /me/events` — no UI **[REVIEW]**
- [ ] `GET /events/:slug`, `POST /events/:slug/attend` — no detail page, no RSVP **[REVIEW]**
- [ ] `GET /businesses/promoted`, `GET /categories/homepage`, `GET /categories/:slug`, 4 `/geography/*` routes — unused **[REVIEW]**
- [ ] `POST /auth/logout` — frontend only clears `localStorage` **[REVIEW]**

### Missing modules
- [ ] **`GET /admin/reviews`** (list) does not exist — only hide/restore. This is why `AdminReviewsView` is mock. **Add the list endpoint first** **[REVIEW]**
- [ ] **`/admin/settings`** does not exist. The **`PlatformSetting` table exists and is entirely unused** — build the module that `AdminSettingsView` should save to **[REVIEW]**
- [ ] **Notifications module** — table + 10-value enum exist; no module, no endpoints, **nothing writes to the table** **[CODE — Phase 2]**
- [ ] **Advertising module** — table + enums exist, *"DEFERRED TO PHASE 2 (ships with Click payments)"* **[CODE]**
- [ ] **No `/health` endpoint** — never existed. Nothing cheap for uptime monitoring to hit **[REVIEW]**

### Correctness / hygiene
- [ ] **Nothing schedules `POST /admin/analytics/aggregate`** — the only writer for `PlatformMetric`. No cron exists in the API **[REVIEW]**
- [ ] `api` `lint` and `format` scripts reference **`eslint` and `prettier`, neither installed** — both fail on a clean checkout **[REVIEW]**
- [ ] Add a **global exception filter** — currently `UploadService` forwards Supabase's error message verbatim to clients **[REVIEW]**
- [ ] Populate `RefreshToken.userAgent` / `ipAddress` — columns exist, `issueTokens()` never sets them, so session management and anomaly detection are impossible **[REVIEW]**
- [ ] Add `@nestjs/config` with a validation schema so a missing required variable fails at **boot**, not at first use **[REVIEW]**
- [?] Does `AuditLog.before`/`after` ever snapshot `passwordHash` or other sensitive fields? **Needs checking** **[REVIEW]**
- [?] Is `Review.rating` bounded `@Min(1) @Max(5)` in its DTO? The column is a bare `Int` with no DB constraint **[REVIEW]**

---

## Frontend

### Fake / non-persisting implementations
- [ ] **`AdminSettingsView`** — platform name, contact email, Telegram, default language, maintenance toggle all in `useState`; **saves nothing**, shows success **[REVIEW]**
- [ ] **dashboard `SettingsView`** — 7-day hours form persists nothing, while `PUT /businesses/:id/hours` exists and works **[REVIEW]**
- [ ] **`InventoryView`** — mock rows labelled "Demo" while `/businesses/:id/menu` + `/menu/:id` exist and `api.ts` already wraps them **[REVIEW]**
- [ ] **`AdminReviewsView`** — mock; blocked on a list endpoint **[REVIEW]**
- [ ] **`restaurantMock.ts`** — production restaurant cards show cuisine, price bucket, tags and delivery time derived from `Math.sin(id * k)`. Deterministic, honestly labelled in code, **invented** **[REVIEW]**
- [ ] **Home hero weather is a placeholder** — `src/pages/home/HeroSection.tsx:30` `// TODO: Replace with real weather API` **[CODE]**
- [ ] **Telegram + Google login buttons do nothing** — and sit *above* the phone field, so they are the first thing a new user sees **[REVIEW]**
- [ ] **`AdsView`** — honest "coming soon" empty state (acceptable as-is) **[REVIEW]**

### Bugs
- [ ] **HEIC uploads fail.** `api.ts` allows `image/heic`/`image/heif`; the server's allow-list does not. iPhone photos pass the client check and 400 **[REVIEW]**
- [ ] **No 404 route.** An unmatched path under `/:lang` renders an empty `Layout` **[REVIEW]**
- [ ] **Dashboard sub-views are not deep-linkable** and the back button does not move between them (view state, not routes) **[REVIEW]**
- [?] **`replyToReview()` uses `PATCH /reviews/:id/reply`** (edit) rather than `POST` (create) — verify it works when no reply exists yet **[REVIEW]**
- [ ] **Nothing adapts above `lg` (1024px)** — zero `xl:`/`2xl:` usage **[REVIEW]**
- [ ] **`CategorySearchPage` fetches `limit=100` and paginates client-side** — results silently truncate past 100 food businesses **[REVIEW]**

### Stale comments that will mislead — worth treating as bugs
- [ ] `src/lib/api.ts` — *"Password reset … Confirmed absent on the live API (2026-08-13): all three paths 404."* **All three now exist** **[REVIEW]**
- [ ] `src/lib/api.ts` — *"Business creation. Confirmed absent … POST /businesses … 404."* **It exists** **[REVIEW]**
- [ ] `src/lib/api.ts` — *"genuinely absent → /admin/reviews, /admin/audit-logs, /admin/settings (404)."* `/admin/audit` exists; review hide/restore exist; only `/admin/settings` is genuinely absent **[REVIEW]**
- [ ] `src/contexts/AuthContext.tsx` — *"the backend has no profile-update endpoint or age/gender columns yet."* **`PATCH /users/me` exists; the columns were added in `20260815150053_add_profile_fields`** **[REVIEW]**
- [ ] `src/pages/dashboard/mockData.ts` — *"Products/inventory have no backend at all."* **It has one** **[REVIEW]**
- [ ] `docs/SSG.md` — *"the API returns zero businesses."* **It returns 4** **[REVIEW]**

---

## Database

- [ ] **Add a partial unique index for one PENDING claim per business.** The schema states this *"cannot be expressed as a Prisma unique constraint (needs a partial index) — enforce in the service layer"* — so it is application-discipline-only today **[CODE]**
- [ ] **Drop `SearchQueryLog`** after confirming the backfill into `SearchAnalytics` — *"safe to drop once you've confirmed the backfill"* **[CODE]**
- [ ] **Consolidate three overlapping cover-image fields** on `Business`: `logoUrl`, `coverUrl`, `coverPhoto` (the last two duplicate each other and the frontend falls back between them) **[REVIEW]**
- [ ] Add DB constraints: `Review.rating` 1–5, `Event.endAt > startAt`, `isFree`/`price` consistency **[REVIEW]**
- [ ] Convert `BusinessRecommendation.type`/`priority` from `VarChar` to enums **[REVIEW]**
- [ ] Convert `PlatformMetric.metricType` and `ActivityLog.actionType` from free strings to enums — a typo silently creates a new series **[REVIEW]**
- [ ] **Add a reconciliation job for denormalized counters** — `ratingAvg`, `reviewCount`, `branchCount`, `viewCount`, `favoriteCount` on `Business` plus the `Branch` pair drift silently if any write path misses one **[REVIEW]**
- [ ] `BusinessAnalytics.businessId` FK **omits `onDelete`** → defaults to `Restrict`, so a business with analytics rows cannot be deleted. Asymmetric with the deliberately FK-free command-centre logs; possibly unintended **[REVIEW]**
- [ ] `BranchPhoto.thumbUrl` is never populated (no thumbnailing); `publicId // Cloudinary` is vestigial **[REVIEW]**
- [ ] `BranchHour.openTime`/`closeTime` are `VarChar(5)` strings — `"9:00"` vs `"09:00"` compares lexically **[REVIEW]**
- [ ] **Three tables are entirely unused by code:** `Notification`, `PlatformSetting`, `Advertisement`. (`EventAttendee` has an endpoint but no UI.) **[REVIEW]**
- [?] **Do database backups exist and restore?** Railway may provide them; nothing in-repo confirms it **[REVIEW]**
- [?] Production PostgreSQL version — not determinable from the repo **[REVIEW]**

---

## UX / UI

- [ ] **Extract an `Input` primitive.** Input classes are duplicated as string constants in at least three places (`AdminSettingsView`, dashboard `SettingsView`, `StepShell`'s `FIELD_CLASSES`) **[REVIEW]**
- [ ] **Extract a `Toast` primitive.** ~43 hand-rolled toast usages (`useState` + 3000 ms `setTimeout`) across views. **`sonner` is in `node_modules` but absent from `package.json` and imported nowhere** — an orphaned install a clean `npm ci` would drop **[REVIEW]**
- [ ] **Add `disabled` and loading states to `Button`.** Every caller improvises, so loading buttons look inconsistent **[REVIEW]**
- [ ] **Add a focus-visible ring convention.** Inputs use `focus:border-primary/50`; buttons define nothing **[REVIEW]**
- [ ] **⚠️ Decide which brand palette wins** — shipped blue/cyan (`primary #3B82F6`) vs the specced navy/green (`#1A3A5C` / `#2E7D32`). Both exist as tokens **[SESSION — never resolved]**
- [ ] **Inconsistent step indicators** — add-business shows one; signup and claim deliberately do not. Document or align **[REVIEW]**
- [ ] `border` design token is inconsistently used (components inline `border-white/[0.08]`) **[REVIEW]**
- [?] **Accessibility audit** — reduced motion is handled well app-wide; contrast, focus order, ARIA and screen-reader behaviour are **unverified** **[REVIEW]**
- [ ] Surface the privacy policy in the app (`api/PRIVACY_POLICY.md` exists, 842 bytes, unreferenced); write a ToS **[REVIEW]**

### Do NOT change — deliberate decisions
- [x] **No progress bar in signup/claim** — Yelp-researched, reduces drop-off
- [x] **`AnimatePresence mode="wait"` banned for screen transitions** — caused a silent deadlock
- [x] **Card hover is colour/shadow only** — transforms belong to Framer's spring
- [x] **16px inputs** — prevents iOS zoom on focus
- [x] **`MotionConfig reducedMotion="user"`** at the app root

---

## SEO

- [ ] **Run `npm run sitemap`.** `sitemap-businesses.xml` has **0 URLs** and every `lastmod` is stale at `2026-08-13`. The generator is correct — it was last run when the API had zero businesses. **Cheapest win in the project** **[REVIEW]**
- [ ] **Wire sitemap generation into the build or a schedule** — the committed file is a static artifact **[REVIEW]**
- [ ] **Add a static `<meta name="description">` and default OG block to `index.html`.** Social scrapers do not run JS, so every shared link previews with a bare title and no image **[REVIEW]**
- [ ] **Decide on prerendering** — full five-step plan in `docs/SSG.md`. **The deferral premise has changed** (the API now returns businesses) **[CODE]**
- [ ] **Build real `/category/:slug` and `/district/:slug` landing pages.** The sitemaps advertise **96 URLs** that resolve to a generic query-string search page **[REVIEW]**
- [ ] **Render breadcrumbs** — the `BreadcrumbList` JSON-LD builder exists and is never used **[REVIEW]**
- [ ] **Emit `schema.org/Event`** — the `Event` model has every required field **[REVIEW]**
- [ ] **Use specific `LocalBusiness` subtypes** (`Restaurant`, `Store`, …) from `Category`/`BusinessType` **[REVIEW]**
- [ ] **Read and write `Business.metaTitle*` / `metaDescription*`** — columns exist, unused end to end **[REVIEW]**
- [ ] Add a central title/description template (none exists; each page composes its own) **[REVIEW]**
- [ ] Emit `schema.org/Review`; add an `Organization` schema; make `/` → `/uz` a server-side redirect **[REVIEW]**

---

## AI

- [x] **Confirmed: no AI features exist, and none were ever discussed.** Zero matches for `openai`/`anthropic`/`gpt`/`gemini`/`llm`/`embedding` in either codebase, and zero project discussion in the entire recovered session history **[REVIEW]**
- [x] The health-score "recommendation engine" is a **deterministic rule engine** — describe it accurately, not as AI
- [ ] **If AI is ever wanted:** answer the **data-residency question first** (see Security), keep any key server-side (**never `VITE_`**), add throttling before any paid API call, and add tests first. Semantic multilingual search is the best fit — **but `pgvector` conflicts with the vanilla-PostgreSQL constraint** **[REVIEW]**

---

## Testing

- [ ] **Zero tests exist.** No test files, no runner, no `test` script, in either repo — across 118 API routes and 132 components **[REVIEW]**
- [ ] Choose runners: Vitest (frontend), Jest + Supertest (API) **[REVIEW]**
- [ ] **Cover first, in this order** (highest cost of silent regression) **[REVIEW]**
  - [ ] `RolesGuard` hierarchy — a floor-vs-exact-match mistake would be catastrophic and invisible
  - [ ] OTP: TTL, single-use, max attempts, the 3-per-10-min rate limit
  - [ ] Ownership scoping in `OwnerService`
  - [ ] `normalizeBusiness` / `normalizeBranch` at the API boundary
  - [ ] `health-score/scoring.ts` — already written as pure functions *"so the whole algorithm can be reasoned about (and unit tested) without a database"*
  - [ ] `src/lib/phone.ts` (`toE164`, `isValidUzPhone`)
  - [ ] Search: transliteration folding
  - [ ] "Open now" logic against `BranchHour` (0=Monday convention)
- [ ] Add a smoke test asserting i18n key parity across `uz`/`ru`/`en` **[REVIEW]**
- [ ] No CI to run any of it — see Deployment **[REVIEW]**

---

## Security

> Full ranked analysis in `SECURITY.md`. Highest-severity items are under **Critical bugs** above.

- [ ] **Restrict CORS** — `app.enableCors()` has no origin allow-list **[REVIEW]**
- [ ] **Gate or disable `/docs` in production** — returns 200, publishing all 118 routes and every DTO **[REVIEW]**
- [ ] **Add `@nestjs/throttler`** — the only rate limit is the hand-rolled OTP cap; login is brute-forceable and bcrypt-12 makes each attempt a CPU cost **[REVIEW]**
- [ ] **Throttle or authenticate `POST /analytics/*`** — unauthenticated writes that poison analytics and grow tables without bound **[REVIEW]**
- [ ] **Add `helmet`** **[REVIEW]**
- [ ] **Verify `JWT_ACCESS_SECRET` is set on Railway** — no default, no boot validation **[REVIEW]**
- [ ] **Strip EXIF / re-encode uploads** — **GPS coordinates may currently be published** with review and avatar photos **[REVIEW]**
- [ ] **Add an upload quota per user** — 5 MB per file, unlimited files **[REVIEW]**
- [ ] **Add an image deletion / orphan-cleanup path** — uploads are public and permanent **[REVIEW]**
- [ ] **Add account lockout** after N failed logins **[REVIEW]**
- [ ] **Add a self-service account-deletion / anonymisation path** — `UserStatus.DELETED` exists, no endpoint **[REVIEW]**
- [ ] **⚠️ Decide whether `SUPPORT` should outrank `BUSINESS_OWNER`** — it does (3 > 2), so support staff can write business content. Never stated as intended **[REVIEW]**
- [ ] **Remove the dead `JWT_REFRESH_SECRET`** from `.env`/`.env.example` — nothing reads it, and it implies refresh tokens are signed JWTs (they are opaque random bytes) **[REVIEW]**
- [ ] **Add the seven missing variables to `.env.example`** — `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`, `ESKIZ_BASE_URL` (+ remove `SUPABASE_ANON_KEY` if unneeded). Onboarding from it currently yields an API that will not boot **[REVIEW]**
- [ ] **Run `npm audit`; enable Dependabot; remove the undeclared `sonner`** **[REVIEW]**
- [?] **⚠️ Answer the data-residency question.** The schema's vanilla-PostgreSQL constraint exists so the DB is *"relocatable to an Uzbek host"* — but the DB is on **Railway** and images on **Supabase**, neither Uzbek. Portability is preserved; **residency is not.** If residency is a legal requirement, current hosting does not satisfy it **[REVIEW]**
- [?] **Has the API's `.env` ever been shared, pasted or backed up?** It holds the Supabase `service_role` key and the production `DATABASE_URL`. Rotate if in any doubt **[REVIEW]**

---

## Deployment

- [~] **Frontend deploy** — see Blocking issues
- [x] **API deployed and verified** on Railway, zero downtime
- [ ] **No CI/CD in either repo** — no GitHub Actions, no pipeline **[REVIEW]**
- [ ] **No staging environment** **[REVIEW]**
- [ ] **No error tracking** (no Sentry) — a production frontend exception is invisible unless a user reports it **[REVIEW]**
- [ ] **No uptime monitoring** — and no `/health` endpoint to monitor **[REVIEW]**
- [ ] **Vercel project is not Git-connected**, so deploys depend on one developer's local CLI auth on a machine whose shell policy blocks the tooling — a single point of failure **[REVIEW]**
- [ ] **Node version mismatch** — API pins `"engines": {"node": "22.x"}`; the dev machine runs 24.18 **[REVIEW]**
- [ ] **Single `master` branch in both repos**, no PR flow, large multi-concern commits (e.g. `1d53f7f` = "Restaurant search, premium monetization UI, and reliability fixes") **[REVIEW]**
- [ ] **Decide monorepo / shared types** — two repos, parallel hand-maintained type definitions, different TypeScript majors (6.0 vs 5.9) **[REVIEW]**
- [?] **Domain/DNS** — a session prompt says `myandijan.uz (UzCloud)`; registrar and DNS host are **not verifiable from the repos** **[REVIEW]**

---

## Documentation

- [x] **Handoff package created** — `docs/my-andijan/` (19 documents, this review)
- [x] `docs/SSG.md` — pre-existing, still accurate except *"the API returns zero businesses"*
- [ ] **Correct every stale comment listed under Frontend** — the codebase's comments are otherwise unusually trustworthy, which is exactly why the stale ones are dangerous **[REVIEW]**
- [ ] **Keep `ARCHITECTURE.md` and `DATABASE.md` current** when the schema or module list changes **[REVIEW]**
- [ ] **Record the answers to the ten open questions in `DECISIONS.md`** as they are decided **[REVIEW]**
- [ ] **No product requirements document, business plan, pricing rationale or launch plan exists.** Product intent had to be inferred from code and session prompts **[REVIEW]**
- [ ] **No design files** (Figma or otherwise), no brand guidelines, no logo source **[REVIEW]**
- [?] **Are the 4 live businesses real or test data?** Unknown **[REVIEW]**
- [?] **Target launch date, marketing plan, competitive positioning** — unknown **[REVIEW]**

---

## Counts

| Group | Open `[ ]` | In progress `[~]` | Done `[x]` | Unknown `[?]` |
| --- | --- | --- | --- | --- |
| Critical bugs | 7 | 0 | 0 | 0 |
| Blocking issues | 6 | 1 | 1 | 0 |
| Backend | 20 | 0 | 0 | 2 |
| Frontend | 20 | 0 | 0 | 1 |
| Database | 11 | 0 | 0 | 2 |
| UX / UI | 9 | 0 | 5 | 1 |
| SEO | 11 | 0 | 0 | 0 |
| AI | 1 | 0 | 2 | 0 |
| Testing | 4 | 0 | 0 | 0 |
| Security | 14 | 0 | 0 | 2 |
| Deployment | 8 | 1 | 1 | 1 |
| Documentation | 4 | 0 | 2 | 3 |

**The first nine items — Critical bugs plus Blocking issues — are the shortest path to a launchable product.** Several are a single command.
