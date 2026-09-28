# ROADMAP — My Andijan

> **This is not a new roadmap.** It is assembled from what the project already says about itself: explicit "Phase 2" markers in the schema, the written plan in `docs/SSG.md`, `TODO` comments in code, the pending-task list recovered from the final session, and unfinished work visible in the codebase.
>
> Each item is tagged by **provenance**, so the next architect can tell inherited intent from a reviewer's suggestion:
>
> | Tag | Meaning |
> | --- | --- |
> | **[EXPLICIT]** | Stated in the codebase or project docs as planned/pending |
> | **[REQUIRED]** | Logical technical work needed to finish something already half-built |
> | **[OBSERVED]** | This reviewer's recommendation — **not** inherited intent. Accept or discard. |

---

## NOW — unblocks the product

Everything in this section is either a blocker or a case where work that is already *done* is invisible to users.

### 1. Complete the frontend deploy · **[EXPLICIT]** · blocker
The pending task from the final session. All local work is deploy-ready: clean tree at `dd08485`, build passing, SPA rewrite and the `/uz/business/claim` redirect both in place.

```bash
npx.cmd vercel login
```
```bash
npx.cmd vercel --prod
```

- Use **`npx.cmd`**, not `npx` — PowerShell's execution policy blocks `npx.ps1`, which is why every previous attempt failed before Vercel was reached.
- **Do not run `vercel link`.** The project link is correct; the earlier "stale orgId" diagnosis was retracted after checking the Vercel API.
- PowerShell 5.1 has no `&&` — run the two commands separately.
- Until this lands, **signup, claim, pricing and the entire premium UI do not exist for users**, despite being finished.

### 2. Run the queued post-deploy verification · **[EXPLICIT]**
Specified in the deploy brief and never executed:

- **Signup:** phone → "Kod yuborildi" → OTP → optional profile
- **Claim:** typeahead → 8 steps → submit
- **Premium UI:** Editor's Pick carousel, "Faqat Premium" filter, gold borders
- **Regressions:** search, business detail, login, favourites
- **Mobile at 375px:** no horizontal overflow, bottom nav visible, no iOS zoom on input focus

### 3. Configure Eskiz SMS on Railway · **[EXPLICIT]**
Flagged as a user-side follow-up and still outstanding.

- Set `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`
- **Register the SMS template in the Eskiz dashboard** — Eskiz requires pre-approval. Intended: `"My Andijan tasdiqlash kodi: {code}. @myandijan.uz #{code}"`; the trailing `@domain #code` enables Android WebOTP auto-read
- Verify with a real phone; re-confirm the 3-per-10-min → `429` limit

> **Without this, the signup flow shipped in step 1 cannot be completed by any real user.** `SmsService` returns success while sending nothing.

### 4. ~~Rotate the hardcoded production credential~~ — ✅ DONE 2026-09-28
Completed 2026-09-28: the script reads `process.env.SEED_ROLE_PASSWORD` with no default, the stdout echo is gone, the literal was purged from history before the first push, and the production credential was rotated to a 192-bit random secret stored in Railway's `SEED_ROLE_PASSWORD` and verified on all six accounts.

Rotate all six accounts; parameterize to `process.env` with no default; remove the `console.log`; purge from history **before** adding any git remote.

### 5. Fix password-reset SMS delivery · **[EXPLICIT]**
`src/auth/auth.service.ts:347` — `TODO(production): send via Eskiz SMS instead of logging. DEV MODE only`. **Configuring Eskiz (step 3) does not fix this** — it needs the code change.

### 6. Wire analytics ingestion · **[REQUIRED]**
Three endpoints exist (`POST /analytics/view|click|search`) and nothing calls them. Until they are called, `BusinessAnalytics`, `SearchAnalytics` and `ActivityLog` stay empty — so owner analytics, the command centre, `AnalyticsView`, and the health score's `visibilityScore` are all reading nothing.

Call `view` on business detail; `click` from `ActionButtons` (call / directions / website / share / favourite); `search` from both search paths. **This is a small frontend change that switches on a large amount of already-built backend.**

### 7. Fix the refresh-token gap · **[REQUIRED]**
Sessions die after ~15 minutes because the frontend never stores the `refreshToken` from `/auth/login` or `/auth/otp/verify`, and never calls `POST /auth/refresh`. A user can be signed out mid-way through the 8-step claim flow and lose the submission.

Store it; on a 401, attempt one refresh before clearing the session. **Prefer this over simply raising `JWT_ACCESS_EXPIRES_IN`** — raising the TTL weakens the security posture, and the server side already works.

### 8. Populate `sitemap-businesses.xml` · **[REQUIRED]** · cheapest SEO win
```bash
npm run sitemap
```
The generator is correct and fetches live data — it was simply last run when the API had zero businesses. This also refreshes the stale `2026-08-13` `lastmod` dates. Then wire it into the build or a schedule, since the committed sitemap is a static artifact.

### 9. Lock down the API surface · **[OBSERVED]** · security
Four changes, all small, all high-value:
- **Restrict CORS** from `app.enableCors()` to the known origins
- **Gate or disable `/docs` in production** — it currently publishes all 118 routes and every DTO
- **Add `@nestjs/throttler`** — the only rate limit today is the hand-rolled OTP cap, so login is brute-forceable and bcrypt-12 makes each attempt a CPU cost
- **Throttle or authenticate `POST /analytics/*`** — unauthenticated writes that can poison analytics and grow tables without bound

See `SECURITY.md` for the full ranked list.

---

## NEXT — completes what is half-built

### 10. Switch `InventoryView` off mock data · **[REQUIRED]**
`src/pages/dashboard/mockData.ts` claims *"Products/inventory have no backend at all."* **It has one** — `GET/POST /businesses/:id/menu`, `PATCH/DELETE /menu/:id` — and `api.ts` already wraps all four. Owners currently see rows labelled "Demo" while a working catalogue API sits idle.

### 11. Make the two settings forms persist · **[REQUIRED]**
- **`AdminSettingsView`** holds platform name, contact email, Telegram, default language and a maintenance toggle in `useState` and saves nothing. `/admin/settings` does not exist, and the **`PlatformSetting` table exists and is entirely unused** — it is the missing consumer. Build the module.
- **Dashboard `SettingsView`** has a 7-day hours form that persists nothing, while `PUT /businesses/:id/hours` exists and works.

### 12. Correct the stale comments in `src/lib/api.ts` · **[REQUIRED]**
The file asserts that password reset, `POST /businesses`, `/admin/audit-logs` and `/admin/reviews` are 404. **Each was true when probed and is now wrong.** Because the comments in this codebase are otherwise unusually trustworthy, these will actively mislead. Full list in `CURRENT_STATE.md` §5. Same for `AuthContext`'s *"the backend has no profile-update endpoint or age/gender columns yet"* and `docs/SSG.md`'s *"the API returns zero businesses."*

### 13. Add claim-status visibility · **[REQUIRED]**
`GET /me/claims` exists and nothing calls it. An owner who completes the 8-step claim flow has **no way to see what happened to it.** For an acquisition funnel, that is a conversion hole, not a polish item.

### 14. Build the admin moderation UI · **[REQUIRED]**
**20 of 31 admin endpoints have no UI.** In rough value order:
- **Claims** — approve/reject (3 endpoints). Without this, claims cannot be processed at all, so the claim flow has no operational counterpart.
- **Review moderation** — hide/restore exist, but **`GET /admin/reviews` does not**, which is why `AdminReviewsView` is mock. **A list endpoint must be added first.**
- **Reports** — list + resolve (2 endpoints)
- **Business actions** — verify, suspend, promote (3). `promote` is currently the *only* way promotion is granted.
- **Users** — suspend, activate (2)
- **Events** — approve/reject (2)
- **Taxonomy** — category delete + reorder, district/city edit (4)

### 15. Introduce a test runner and cover auth + RBAC first · **[OBSERVED]**
Zero tests across 118 routes and 132 components. Start where a silent regression is most expensive: the role hierarchy (a floor-vs-exact-match mistake would be catastrophic and invisible), OTP TTL/attempt/rate limits, ownership scoping in `OwnerService`, and the `normalizeBusiness` boundary. Vitest for the frontend, Jest + Supertest for the API. Also note the API's `lint` and `format` scripts reference `eslint`/`prettier`, **neither of which is installed** — both fail on a clean checkout.

### 16. Decide on prerendering · **[EXPLICIT]**
`docs/SSG.md` holds a complete five-step plan. **The premise for deferring it has changed** — it was deferred partly because *"the API returns zero businesses, so there is no long tail of content pages"*, and the API now returns businesses.

The real cost is already being paid: **social scrapers do not run JavaScript, so every shared link previews with the generic `index.html` title and no image.** For a local directory in a Telegram-heavy market, link sharing is a primary acquisition channel.

**A cheap partial fix first · [OBSERVED]:** add a static `<meta name="description">` and a default OG block to `index.html`. That converts a broken preview into an acceptable one for a few lines of HTML, without touching `App.tsx`.

### 17. Build category and district landing pages · **[OBSERVED]**
`sitemap-categories.xml` and `sitemap-locations.xml` advertise **96 URLs that resolve to a generic query-string search page** with no unique title, description or copy. Real `/category/:slug` and `/district/:slug` routes — each with a unique H1, intro text, localized meta, `BreadcrumbList` and links down to businesses — are the pages that rank for the highest-intent local queries ("Asakada restoranlar"). **The largest structural SEO opportunity in the project.**

### 18. Surface the health score to owners · **[REQUIRED]**
A complete scoring engine, a 14-rule localized recommendation catalogue, and three endpoints — with **no UI at all**. It is also the intended upsell funnel (`VISIBILITY_BUY_PROMOTION` is one of the 14 codes). Note the impact figures are *"directional estimates chosen by the product, NOT measured lift"* — present them honestly.

### 19. Switch frontend search to `GET /search` · **[OBSERVED]**
The API has `pg_trgm` + tsvector search with **Uzbek transliteration normalisation** and unified business+product ranking. **Nothing calls it.** The frontend searches via `GET /businesses?search=`. Adopting it would let "osh" and "ош" match the same restaurants and would surface menu-item hits.

### 20. Add events detail + RSVP UI · **[REQUIRED]**
`GET /events/:slug` and `POST /events/:slug/attend` exist; `EventAttendee` is modelled. The frontend has a list only. Also missing: owner event **create/edit/delete** UI (three endpoints exist) and `schema.org/Event` markup (the model has every required field).

### 21. Resolve the two open design questions · **[EXPLICIT]**
- **Which brand palette wins** — shipped blue/cyan (`primary #3B82F6`) or the specced navy/green (`#1A3A5C` / `#2E7D32`)? Both exist as tokens.
- **Should `SUPPORT` outrank `BUSINESS_OWNER`?** It does today (3 > 2), so support staff can write business content. Never stated as intended.

---

## LATER — Phase 2 as the codebase defines it

These are the items the schema itself marks as deferred. **They are pre-planned, not speculative.**

### 22. Payments · **[EXPLICIT]**
The gate on everything else in this section. The schema says advertising *"ships with Click payments"*, so **Click is the intended first provider.** Payme, Uzum and cash are also surfaced in the UI. Needs: a provider integration, webhook endpoints, and a subscription/billing model — **none of which exists in the schema today.** Pricing (99 000 / 249 000 so'm, 20% yearly) has no recorded rationale; validate before building against it.

### 23. Advertising module · **[EXPLICIT]**
*"DEFERRED TO PHASE 2 (ships with Click payments). Table retained so the module attaches without a core migration."* `Advertisement` has placement, scheduling, targeting, impressions, clicks, `priceUzs` and `paymentStatus` ready. Needs a controller, service, module, an ad-serving path, and impression/click tracking. **Blocked on #22.**

### 24. Notifications · **[EXPLICIT]**
`Notification` table + a 10-value `NotificationType` enum exist. **No module, no endpoints, and nothing writes to the table.** The schema says *"in-app only for MVP; SMS/Telegram channels are Phase 2."* Every enum value corresponds to an event the platform already produces (`BUSINESS_APPROVED`, `CLAIM_APPROVED`, `REVIEW_RECEIVED`, …), so the writers are obvious. `User.notificationsEnabled` exists and is read by nothing.

### 25. `BusinessType` Phase-2 capabilities · **[EXPLICIT]**
`inventoryEnabled`, `warehouseEnabled`, `bookingEnabled`, `deliveryEnabled`, `orderingEnabled` — flags present, modules unbuilt. The schema states they exist precisely so these attach *"with no core migration."* Likely order by market value: **booking**, then **ordering/delivery**, then inventory/warehouse.

### 26. Social login · **[EXPLICIT]**
Telegram and Google buttons are rendered **above** the phone field (Yelp's ordering) and do nothing. Needs OAuth backends, provider columns on `User`, and callback routes. **Currently a live UX defect** — the first thing a new user sees is a control that fails.

### 27. Drop the deprecated `SearchQueryLog` table · **[EXPLICIT]**
*"safe to drop once you've confirmed the backfill"* into `SearchAnalytics`.

### 28. Schedule the aggregation job · **[REQUIRED]**
`POST /admin/analytics/aggregate` is the only writer for `PlatformMetric` and **nothing schedules it** — there is no cron anywhere in the API. Add `@nestjs/schedule` or an external scheduler. Same question for health-score recalculation (per-business recompute is on-write, but the platform-wide sweep is manual).

### 29. Replace `restaurantMock` with real data · **[REQUIRED]**
Cuisine, price bucket, tags and delivery time are derived from `Math.sin(id * k)` — deterministic, honestly labelled in code, and **invented**. Restaurant cards in production show information the API never provided. Requires real fields on `Business`/`Product` plus an owner UI to enter them.

### 30. Infrastructure hardening · **[OBSERVED]**
- **Error tracking** (none today — a production frontend exception is invisible unless a user reports it)
- **CI/CD** (none — two repos, single `master`, no pipeline)
- **A `/health` endpoint** (has never existed; there is nothing cheap to monitor)
- **Uptime monitoring**
- **Confirm database backups exist and restore** — UNKNOWN
- **EXIF stripping on uploads** — GPS coordinates may currently be published with review and avatar photos
- **Image deletion / orphan cleanup** — uploads are public and permanent

### 31. Structural cleanups · **[OBSERVED]**
- Add a partial unique index for **one pending claim per business** (the schema says this is service-layer-only today)
- Consolidate `Business.coverUrl` vs `coverPhoto` (three overlapping image fields)
- Add DB constraints: `Review.rating` 1–5, `Event.endAt > startAt`
- Convert `BusinessRecommendation.type`/`priority` and the free-string `metricType`/`actionType` to enums
- Add a reconciliation job for the denormalized counters (they drift silently if any write path misses one)
- Extract an `Input` primitive (input classes are duplicated in at least three places) and a `Toast` primitive (~43 hand-rolled toast usages; `sonner` is in `node_modules` but undeclared and unimported)
- Remove the dead `JWT_REFRESH_SECRET` and add the seven missing variables to `.env.example`
- Decide monorepo / shared types (two repos, parallel hand-maintained types, different TypeScript majors)

---

## Explicitly out of scope

| Item | Evidence |
| --- | --- |
| **AI / ML features of any kind** | Zero references in either codebase and **zero discussion in the entire recovered session history.** See `AI.md`. |
| **3D / immersive / AR / VR / 360° tours** | No dependency, no code, no mention anywhere. A genuine blank. |
| **PostGIS / geospatial search** | Ruled out by the vanilla-PostgreSQL data-localization constraint |
| **Redis** | Deliberately avoided — the `OtpCode` table replaced it |
| **Third-party analytics / search services** | First-party by design, consistent with data localization |

---

## Dependency order — the short version

```
Deploy frontend ──► Post-deploy verification
      │
      └──► Configure Eskiz ──► Signup actually usable by real users
                                      │
Rotate credential — DONE 2026-09-28            │
Wire analytics ingestion ──► Owner analytics + command centre + health score become meaningful
Fix refresh tokens ──► Sessions survive the claim flow
Run sitemap ──► Business pages become crawlable
Lock down API (CORS / docs / throttler) — independent, do now
      │
      ▼
Admin claims UI ──► Claims can be processed ──► Claim funnel has an operational counterpart
GET /admin/reviews ──► Review moderation UI ──► AdminReviewsView stops being mock
Tests ──► Everything after this is safer
      │
      ▼
Prerendering / landing pages ──► Organic acquisition
      │
      ▼
Payments ──► Advertising module ──► Revenue
```

**The shortest path to a launchable product is items 1–9.** None of them is large; several are one command or a few lines. Items 10–21 mostly consist of **building UI against endpoints that already exist and already work** — which is the single most important planning fact about this codebase: *the backend is not the bottleneck.*
