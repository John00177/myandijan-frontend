# FEATURES — My Andijan feature matrix

> Compiled 2026-09-28 from both codebases, the live API, and the deployed bundle.

## Status definitions

| Status | Meaning |
| --- | --- |
| **IMPLEMENTED** | Built end-to-end (backend + frontend where both apply) and reachable by a user |
| **PARTIALLY IMPLEMENTED** | Substantially built but with a missing layer, missing config, or a known functional hole |
| **PLANNED** | Explicitly intended — schema/enums/flags/UI placeholders exist, or it is named in project docs — but not built |
| **BROKEN** | Built but does not work as intended |
| **UNKNOWN** | Cannot be determined from the repositories |

### A distinction this matrix previously made

> **Superseded 2026-09-28.** Several rows used to read *IMPLEMENTED (not deployed)* because the live bundle predated them. **Production now runs current `main`** (verified byte-identical), so those qualifiers are removed.

This no longer applies. Frontend production was confirmed on 2026-09-28 to be serving the current `main` build.

### Phase 4 update — 2026-09-29

A frontend/backend integration audit (full route-by-route matrix in `ARCHITECTURE.md` §21) selected and wired four previously-unconnected backend capabilities end-to-end. Rows below are updated accordingly; everything else in this matrix reflects the 2026-09-28 audit unchanged.

### Phase 5 update — 2026-09-29

Selected 3 capabilities from a 20-item MVP gap matrix (`ARCHITECTURE.md` §22): event detail page + RSVP, owner event creation, and populating `sitemap-businesses.xml`. Also fixed a live bug found along the way — the events list was rendering blank titles/dates/images in production.

### Phase 6 update — 2026-09-29

Completed the review moderation workflow (`ARCHITECTURE.md` §23): added the missing `GET /admin/reviews` endpoint and wired `AdminReviewsView` to it, replacing its mock data with real hide/restore moderation.

---

## 1. Discovery & browse

| Feature | Status | Notes |
| --- | --- | --- |
| Business discovery (home, categories, districts) | **IMPLEMENTED** | `HomePage` + 7 sections; live |
| Business profile pages | **IMPLEMENTED** | `/:lang/business/:slug`; 9 composed sections; live |
| Category browsing | **IMPLEMENTED** | Tree-capable (`Category.parentId`); `showOnHomepage` flag |
| Category tree / subcategories | **PARTIALLY IMPLEMENTED** | Schema and self-relation support nesting; no UI navigates a hierarchy |
| District / location browsing | **IMPLEMENTED** | `DistrictsSection`; 14 districts + 11 cities seeded |
| Featured businesses | **PARTIALLY IMPLEMENTED** | Endpoint + UI exist; **`GET /businesses/featured` returns `[]`** — no business is flagged |
| Promoted businesses | **PARTIALLY IMPLEMENTED** | `GET /businesses/promoted` exists; **no frontend calls it** |
| Similar businesses | **IMPLEMENTED** | `SimilarBusinesses` on the detail page |
| "Editor's Pick" carousel | **IMPLEMENTED** | `EditorsPickCarousel` |
| Useful services section | **IMPLEMENTED** | `UsefulServices` |
| Platform stats strip | **IMPLEMENTED** | `StatsStrip` with count-up animation |
| Events listing | **IMPLEMENTED** | `/:lang/events`. **Phase 5 (2026-09-29) also fixed a live bug here:** the frontend `Event` type/`EventCard` used field names (`nameUz`, `image`, `startsAt`, `location`, `categoryLabel`) that don't exist in the real `GET /events` response (`title`, `coverUrl`, `startAt`, `venueName`/`address`) — every card was rendering a blank title, no image and no date in production. Corrected to match `EVENT_LIST_SELECT`. |
| Event detail page | **IMPLEMENTED** | **Phase 5:** `/:lang/events/:slug` added, backed by `GET /events/:slug`. Renders date range, venue, business link, description, attendee count |
| Event RSVP | **IMPLEMENTED** | **Phase 5:** `POST /events/:slug/attend` wired to a button on the new detail page; gated behind login like favourites |
| 404 page | **IMPLEMENTED** (Phase 16F.1) | `*` route under `/:lang` → `NotFoundPage` (noindex); unsupported language prefix → redirect under `/uz`. HTTP status stays 200 (SPA rewrite) |

## 2. Search & filtering

| Feature | Status | Notes |
| --- | --- | --- |
| Text search | **IMPLEMENTED** | **Phase 8:** debounced input now calls `GET /search?type=business` (real FTS ranking) whenever there's a query term; category/district-only browsing still uses `GET /businesses` |
| **Advanced FTS search** (`GET /search`) | **IMPLEMENTED (Phase 8)** | `pg_trgm` + tsvector, 4 custom PG functions, **Uzbek transliteration normalisation**, unified business+product ranking. Wired into `SearchPage` via `searchBusinessesFts()`, scoped to `type=business` (new optional DTO field) since the app has no product-result card. See `ARCHITECTURE.md` §25, `DECISIONS.md` D-57. |
| Category filter | **IMPLEMENTED** | |
| District / city filter | **IMPLEMENTED** | |
| Pagination | **IMPLEMENTED** | Server-side generic, client-side for restaurants |
| Restaurant/category-aware search | **IMPLEMENTED** | `CategorySearchPage` for `oziq-ovqat`; **live** |
| Cuisine filter | **PARTIALLY IMPLEMENTED** | 6 cuisines, but values come from `restaurantMock.ts`, not the API |
| Price-range filter | **PARTIALLY IMPLEMENTED** | 4 buckets, mock-derived |
| Delivery filter | **PARTIALLY IMPLEMENTED** | `Business.hasDelivery` is real; delivery **time** is mock |
| Rating filter (≥4.5) | **IMPLEMENTED** | Real `ratingAvg` |
| "Open now" filter | **IMPLEMENTED** | Real `BranchHour` data via `OpenNowBadge` |
| Sort (rating / reviews / name) | **IMPLEMENTED** | `SortDropdown`, client-side |
| Product/menu search | **PARTIALLY IMPLEMENTED** | Server ranks products (`type=product`/omitted); no UI surfaces product hits — deliberately deferred in Phase 8, see `ARCHITECTURE.md` §25 |
| Business-name typeahead | **IMPLEMENTED** | Claim step 1 |
| Geo/radius/"near me" search | **PLANNED** | Blocked by the no-PostGIS constraint |
| Search suggestions / autocomplete | **PLANNED** | — |

## 3. Maps & location

| Feature | Status | Notes |
| --- | --- | --- |
| Map with business pins | **IMPLEMENTED** | Leaflet + React Leaflet on `/search` |
| Promotion-tiered pins | **IMPLEMENTED** | `pinTier()` gold/grey |
| XSS-safe marker HTML | **IMPLEMENTED** | `escapeHtml()` before `divIcon` |
| Coordinates on entities | **IMPLEMENTED** | `Region`, `District`, `City`, `Branch`, `Event` |
| Directions (outbound) | **IMPLEMENTED** | `ActionButtons`; the click **is not tracked** — see Analytics |
| Marker clustering | **PLANNED** | — |
| Distance sorting / radius | **PLANNED** | Needs PostGIS or manual haversine |
| User geolocation | **PLANNED** | No `navigator.geolocation` use found |
| Map on the detail page | **UNKNOWN** | Not verified in this pass |

## 4. Reviews & ratings

| Feature | Status | Notes |
| --- | --- | --- |
| Write a review | **IMPLEMENTED** | `ReviewForm`; `POST /businesses/:id/reviews` |
| Display reviews | **IMPLEMENTED** | `ReviewsSection` |
| Star ratings | **IMPLEMENTED** | Denormalized `ratingAvg` on business + branch |
| Review photos | **PARTIALLY IMPLEMENTED** | `Review.photos String[]` and the upload endpoint exist; UI wiring **UNKNOWN** |
| One review per user per branch | **IMPLEMENTED** | DB-enforced `@@unique([branchId, userId])` |
| Owner replies | **IMPLEMENTED** | `ReviewsView` → `POST /me/reviews/:id/reply` |
| Edit / delete own review | **PARTIALLY IMPLEMENTED** | Endpoints exist; **no UI** |
| Report a review | **IMPLEMENTED (Phase 12)** | "Shikoyat qilish" on each review → reason + optional note → `POST /reviews/:id/report`. Signed-out → login modal; 409 shown as "already reported"; uz/ru/en (D-70) |
| "Helpful" voting | **PLANNED** | `helpfulCount` column exists; nothing increments it |
| Review moderation queue | **IMPLEMENTED** | **Phase 6 (2026-09-29):** `GET /admin/reviews` added (paginated, `?status=` filter); `AdminReviewsView` now shows the real list with reviewer/business/rating/text/date/status, and hide/restore act on real reviews |
| Rating range validation | **PARTIALLY IMPLEMENTED** | DTO-level only; no DB constraint |

## 5. Photos & media

| Feature | Status | Notes |
| --- | --- | --- |
| Image upload | **IMPLEMENTED** | `POST /upload/image` → Supabase Storage; 5 MB, MIME allow-list, filename sanitised |
| Client-side pre-validation | **IMPLEMENTED** | `assertUploadable()` |
| Business logo / cover | **IMPLEMENTED** | Three overlapping fields: `logoUrl`, `coverUrl`, `coverPhoto` |
| Branch photo gallery | **PARTIALLY IMPLEMENTED** | `BranchPhoto` model + `PhotoGalleryManager` component; end-to-end wiring **UNKNOWN** |
| Avatar upload | **IMPLEMENTED** | `PUT /auth/profile` multipart |
| Preset avatar picker | **IMPLEMENTED** | `AvatarPicker` + `User.avatarId` |
| OG image generation | **IMPLEMENTED** | `scripts/generate-og-image.ts` via `sharp`; static `og-default.jpg` |
| **HEIC upload** | **BROKEN** | Client allows `image/heic`/`heif`; **server rejects them** → iPhone photos 400 |
| Thumbnails | **PLANNED** | `BranchPhoto.thumbUrl` exists; nothing generates them |
| Image optimisation / CDN transforms | **PLANNED** | Raw Supabase public URLs |

## 6. User accounts & auth

| Feature | Status | Notes |
| --- | --- | --- |
| Password registration | **IMPLEMENTED** | `POST /auth/register`; role restricted to `CUSTOMER`/`BUSINESS_OWNER` |
| Password login | **IMPLEMENTED** | |
| **Phone-first OTP signup** | **PARTIALLY IMPLEMENTED** | Frontend + backend complete and **deployed**; still **no SMS is sent** |
| OTP rate limiting | **IMPLEMENTED** | 3 per phone per 10 min → `429`, verified in production |
| Password reset | **PARTIALLY IMPLEMENTED** | All three endpoints + UI exist; **code is logged, not sent** (`auth.service.ts:347`) |
| JWT access tokens | **IMPLEMENTED** | 15 min default |
| **Refresh tokens** | **IMPLEMENTED** | **Phase 4 (2026-09-29):** frontend now persists the refresh token from login/register/OTP-verify and silently redeems it via `POST /auth/refresh` on any 401 (single-flight, retries the original request once) before falling back to logout — see `src/lib/api.ts` `refreshAccessToken()` |
| Logout | **IMPLEMENTED** | **Phase 4:** `logout()` now calls `POST /auth/logout` to revoke the stored refresh token server-side (best-effort, not awaited) in addition to clearing `localStorage` |
| Session-expiry handling | **IMPLEMENTED** | Centralised 401 → clear + `SESSION_EXPIRED_EVENT` |
| Immediate suspension enforcement | **IMPLEMENTED** | `JwtStrategy` re-checks `status` on **every** request |
| Profile management | **IMPLEMENTED** | `GET`/`PATCH /users/me`; age, gender, avatar |
| Profile-completion nudge | **IMPLEMENTED** | `ProfileCompletionBanner` |
| Marketing consent | **IMPLEMENTED** | `marketingConsent` + `marketingConsentAt` |
| Six-role RBAC | **IMPLEMENTED** | Hierarchy floor check |
| Email verification | **PLANNED** | `emailVerified` column exists; no flow, no email provider |
| **Social login (Telegram / Google)** | **PLANNED** | Buttons rendered **above** the phone field; no backend at all |
| Account deletion (self-service) | **PLANNED** | `UserStatus.DELETED` + `deletedAt` exist; no endpoint |
| 2FA beyond OTP | **PLANNED** | — |

## 7. Favourites

| Feature | Status | Notes |
| --- | --- | --- |
| Add / remove favourite | **IMPLEMENTED** | Business-scoped, DB-unique per user |
| Favourites page | **IMPLEMENTED** | Auth-gated |
| Favourite count | **IMPLEMENTED** | Denormalized on `Business` |
| Favourite-click analytics | **BROKEN** | `favoriteClicks` column exists; nothing writes it |

## 8. Business-owner functionality

| Feature | Status | Notes |
| --- | --- | --- |
| Owner dashboard shell | **IMPLEMENTED** | 8 views |
| My businesses | **IMPLEMENTED** | Lean list + full-detail fetch. **Phase 16D:** every status labelled (HIDDEN no longer renders an empty badge, here and on the dashboard home); a REJECTED or SUSPENDED listing shows the admin's reason (`rejectionReason`). No owner resubmit yet — the API has no owner path from REJECTED back to PENDING |
| Edit business | **IMPLEMENTED** | `EditBusinessModal`; details + 7-day hours |
| Owner KPIs | **IMPLEMENTED** | `GET /me/stats` |
| Reviews + reply | **IMPLEMENTED** | |
| My events (list) | **IMPLEMENTED** | **Phase 5:** create wired — a "Yangi tadbir" modal (business picker + title/description/dates/venue) now calls `POST /me/events`, replacing the previously dead button. **Edit and delete endpoints still have no UI** — deprioritized this phase for scope, not blocked |
| **Business claim flow** (`/uz/claim`) | **IMPLEMENTED** | 8 screens, live preview; submits a **new** listing to `POST /businesses` — despite the name, not a claim on an existing listing (see next row) |
| **Claim an existing business** | **IMPLEMENTED (Phase 9)** | "Bu sizning biznesingizmi?" card on `BusinessDetailPage` for listings with `ownerId = null` → `POST /me/claims` (`PENDING`). Login-gated; 409 conflict message for already-owned / already-pending. See `ARCHITECTURE.md` §26 |
| Claim status visibility | **IMPLEMENTED (Phase 9)** | `ProfilePage` "Mening da'volarim" via `GET /me/claims` — per-claim pending/approved/rejected badge. **Phase 16D:** a rejected claim shows the admin's reason; on `BusinessDetailPage` a claimant with a pending claim sees "under review" instead of the claim CTA after a reload |
| Owner access after approval | **IMPLEMENTED (Phase 9)** | Approval sets `ownerId` and promotes a `CUSTOMER` to `BUSINESS_OWNER`; effective on the next request (role is reloaded from the DB per request). Claimed ≠ verified (D-58) |
| Add business (3-step) | **IMPLEMENTED** | `AddBusinessPage` |
| Multi-branch management | **PARTIALLY IMPLEMENTED** | `POST /me/businesses/:id/branches` + `PATCH /me/branches/:id` exist; branch **creation** has no UI |
| Menu / product & service catalog management | **IMPLEMENTED (Phase 10)** | `InventoryView` on the real API (`GET /me/businesses/:id/menu` + POST/PATCH/DELETE): create/edit name, type (product/service), category, price, description, photo; publish/hide (`isActive`); delete with confirmation; business picker. Mock data and SKU/quantity removed (D-61). See `ARCHITECTURE.md` §27 |
| Catalog on business detail page (customer) | **IMPLEMENTED** | `MenuSection` → public `GET /businesses/:id/menu` (APPROVED businesses, published items only — Phase 10). Loading, empty, and **error + retry** (Phase 10) states, localized uz/ru/en |
| Owner analytics | **PARTIALLY IMPLEMENTED** | 6 endpoints. Collection is wired from the frontend (Phase 4) and de-duplicated/capped server-side since Phase 16G.1 (API PR #23, merged, not deployed). The 7-day overview has a UI since Phase 16G.2 (frontend PR #22); the other five endpoints have none |
| Health score for owners | **PARTIALLY IMPLEMENTED** | Full engine + localized recommendations; **no UI** |
| **Owner settings (hours)** | **BROKEN** | Form saves nothing |
| Ads management | **PLANNED** | Honest "coming soon" empty state |

## 9. Admin panel

| Feature | Status | Notes |
| --- | --- | --- |
| Admin shell | **IMPLEMENTED** | 10 views, sidebar/drawer |
| Platform stats | **IMPLEMENTED** | |
| Business list + approve/reject | **IMPLEMENTED** | Reject requires a non-empty `reason`. **Phase 11:** status filter is server-side and covers every status (incl. SUSPENDED/HIDDEN/DRAFT); "Ko'rish" opens the public page; the dead "O'chirish" button was removed (no admin delete endpoint). **Phase 16I.1 (branch, not deployed):** a PENDING listing that still carries a `rejectionReason` (back after an owner resubmit, or the D-73 unhide fallback) gets a "Qayta ko'rib chiqish" badge and "Oldingi sabab: …" in the queue row and at the top of the review drawer; frontend-only, it reads the existing `GET /admin/businesses` field and shows nothing until a PENDING row carries a reason |
| **Business verification** (grant/revoke badge) | **IMPLEMENTED (Phase 11)** | `AdminBusinessesView` row action → `POST …/verify` / new `POST …/unverify` (confirm). "Verifikatsiyalangan" badge in the list. Claimed ≠ verified (D-58) |
| **Business suspension** (suspend/restore) | **IMPLEMENTED (Phase 11)** | Suspend an APPROVED listing with a required reason; restore with new `POST …/unsuspend` → APPROVED. Reason shown on suspended rows. Preconditions enforced server-side (D-63) |
| **Business promotion** (start/end) | **IMPLEMENTED (Phase 11)** | Promote until a chosen date (`POST …/promote`); end early with new `POST …/unpromote`. "Reklama · … gacha" badge. Admin-granted flag only — no payments, no ranking change |
| Business hide (SUPER_ADMIN) | **PARTIALLY IMPLEMENTED** | Endpoint only; no unhide and no UI — restore semantics undecided (D-63) |
| Featured / Editor's Pick control | **NOT IMPLEMENTED** | `isFeatured` is read publicly but no admin endpoint sets it (D-66) |
| Business edit + branch edit | **IMPLEMENTED** | |
| User list | **IMPLEMENTED** | |
| Category CRUD | **PARTIALLY IMPLEMENTED** | List/create/update wired; delete + reorder endpoints unused |
| Event list | **IMPLEMENTED** | Approve/reject endpoints unused |
| Audit log | **IMPLEMENTED** | `GET /admin/audit` |
| Analytics view | **PARTIALLY IMPLEMENTED** | Real endpoints, but the underlying tables are unfed |
| Regions view | **PARTIALLY IMPLEMENTED** | Reads the **public** geography endpoint; district/city edit endpoints unused |
| **Review moderation** | **IMPLEMENTED** | **Phase 6:** real list + hide/restore, replacing the mock |
| **Admin settings** | **BROKEN** | Local state only; `/admin/settings` does not exist; `PlatformSetting` table unused |
| **Claims moderation** | **IMPLEMENTED (Phase 9)** | `AdminClaimsView`: status filter, inline evidence/contact/claimant, approve, reject with reason; "pending claims" KPI on the admin home. Approval is atomic (D-60) |
| Reports moderation | **IMPLEMENTED (Phase 12)** | `AdminReportsView` ("Shikoyatlar"): pending queue by default + history filters; report/review/business context and report count; hide review (→ RESOLVED) or dismiss (→ DISMISSED) with optional note; 409 conflicts surfaced and refreshed. ADMIN+ only |
| Moderator admin access | **NOT IMPLEMENTED** | Needs a privilege decision — every admin read is ADMIN-only (D-68) |
| Verify / suspend / promote business | **PLANNED** | 3 endpoints exist; no UI |
| Suspend / activate user | **PLANNED** | 2 endpoints exist; no UI |
| **Command centre** (founder analytics) | **PLANNED** | **10 endpoints exist; no UI whatsoever** |
| Health-score recalculation | **PLANNED** | Endpoint exists; no UI |

## 10. SEO

| Feature | Status | Notes |
| --- | --- | --- |
| Per-page title + description | **IMPLEMENTED** | `MetaTags` |
| Canonical URLs | **IMPLEMENTED** | Language-aware |
| hreflang alternates | **IMPLEMENTED** | 3 languages + `x-default` |
| Open Graph + Twitter cards | **IMPLEMENTED** | With `og:locale:alternate` |
| JSON-LD structured data | **IMPLEMENTED** | `LocalBusiness`, `WebSite`+`SearchAction`, `BreadcrumbList`; correctly omits `aggregateRating` when `reviewCount` is 0 |
| `robots.txt` | **IMPLEMENTED** | Wildcards private routes under every language prefix |
| Sitemap index | **IMPLEMENTED** | 4 sub-sitemaps |
| Sitemap: pages / categories / locations | **IMPLEMENTED** | 9 / 24 / 42 URLs. **Phase 7 (2026-10-01):** category/location URLs now resolve to real dedicated pages (previously generic search); location count dropped from 72 to 42 — city URLs removed since no `/city/:slug` route exists |
| **Category landing pages** (`/:lang/category/:slug`) | **IMPLEMENTED** | **Phase 7.** Real name, real business list (`GET /businesses?category=`), unique meta/canonical/hreflang, `BreadcrumbList`. The `oziq-ovqat` homepage tile still links to the specialized `/search?category=oziq-ovqat` UI instead (D-21) |
| **District landing pages** (`/:lang/district/:slug`) | **IMPLEMENTED** | **Phase 7.** District resolved client-side from the already-fetched `GET /geography/regions`; real business list (`GET /businesses?district=`); same SEO treatment as category pages |
| **Sitemap: businesses** | **PARTIALLY IMPLEMENTED** | **Superseded 2026-09-29 (Phase 5):** `npm run sitemap` re-run against live production — now **12 URLs** (4 businesses × 3 languages), `lastmod` refreshed. **Still not automated** — nothing re-runs it on a schedule or at deploy time, so it will go stale again as businesses are added; deliberately not wired into CI (would make every `npm run build` depend on the live production API — see `DECISIONS.md`) |
| `noIndex` on private routes | **IMPLEMENTED** | `MetaTags` prop |
| Per-business SEO overrides | **PARTIALLY IMPLEMENTED** | `metaTitle*`/`metaDescription*` columns exist; no admin/owner UI edits them |
| **SSR / SSG / prerendering** | **PLANNED** | Deliberately deferred with a 5-step plan in `docs/SSG.md` |
| Social-scraper previews | **BROKEN** | Scrapers don't run JS → every shared link previews with the generic `index.html` title |
| Stale `lastmod` | **BROKEN** | All four sub-sitemaps say `2026-08-13` |

## 11. AI features

| Feature | Status | Notes |
| --- | --- | --- |
| **Any AI/LLM feature** | **NOT PRESENT** | Zero matches for `openai`, `anthropic`, `gpt`, `gemini`, `llm`, `embedding` across both `src` trees. No AI SDK, no model call, no vector store. |
| Health-score "recommendation engine" | **IMPLEMENTED** | **Deterministic rule engine**, not AI — pre-authored, pre-translated rows keyed by a stable rule `code` |
| AI-assisted development | **IMPLEMENTED** | Claude Code across ~7 sessions. A *process*, not a product feature. |

See `AI.md`.

## 12. Notifications

| Feature | Status | Notes |
| --- | --- | --- |
| In-app notifications | **PLANNED** | `Notification` table + 10-value `NotificationType` enum exist. **No module, no endpoints, nothing writes to the table.** |
| SMS notifications | **PARTIALLY IMPLEMENTED** | `SmsService` (Eskiz) built for OTP only; **unconfigured** |
| Email notifications | **PLANNED** | No provider |
| Telegram notifications | **PLANNED** | `Business.telegram` is a contact field only |
| Push notifications | **PLANNED** | — |
| Event reminders | **PLANNED** | `EVENT_REMINDER` enum value exists; no scheduler |
| Notification preferences | **PARTIALLY IMPLEMENTED** | `notificationsEnabled` column; nothing reads it |

## 13. Analytics

| Feature | Status | Notes |
| --- | --- | --- |
| Analytics schema | **IMPLEMENTED** | `BusinessAnalytics` (daily grain), `SearchAnalytics`, `ActivityLog`, `PlatformMetric` |
| Ingestion endpoints | **IMPLEMENTED** | `POST /analytics/view\|click\|search` |
| **Ingestion wiring** | **PARTIALLY IMPLEMENTED** | **Phase 4 (2026-09-29):** wired from the frontend — `useBusiness` fires a view on initial business-detail load; `ActionButtons` fires a click for CALL/DIRECTION/SHARE/FAVORITE; `useSearchBusinesses` fires a search (query + district/city + result count) whenever a text query resolves. Not yet wired: WEBSITE clicks (no website link exists in the current UI) and category-id attribution on search (the UI only has the category *slug*, not its numeric id). **Phase 16G.2:** no view is recorded when the signed-in viewer owns the listing (`useBusiness` + `ownsBusiness`). |
| Owner analytics API | **IMPLEMENTED** | 6 endpoints |
| Owner analytics UI | **PARTIALLY IMPLEMENTED** | **Phase 16G.2 (frontend PR #22, `41fb0fa`):** `DashboardHomeView` shows a "So'nggi 7 kun" panel — views, calls, direction requests and favourites for the last 7 days with the change vs the previous 7 — from `GET /me/analytics/overview`. Still not fed: `TrafficChart`, `Sparkline` (they render only in `PremiumView`'s upsell mock); traffic, demographics, search terms, peak hours and competitors have no UI |
| Admin analytics | **PARTIALLY IMPLEMENTED** | 2 endpoints wired to `AnalyticsView` |
| Command centre | **PLANNED** | 10 endpoints, no UI |
| Daily metric aggregation | **PARTIALLY IMPLEMENTED** | `POST /admin/analytics/aggregate` exists; **nothing schedules it** |
| Audit log | **IMPLEMENTED** | `AuditLog` with before/after JSON, IP, user agent |
| Privacy-preserving activity log | **IMPLEMENTED** | `metadata.ipHash`, never a raw IP |
| Third-party analytics (GA/Plausible) | **NOT PRESENT** | First-party only |
| Error tracking (Sentry) | **NOT PRESENT** | |

## 14. Monetization

| Feature | Status | Notes |
| --- | --- | --- |
| Pricing page | **IMPLEMENTED** | 3 tiers, monthly/yearly toggle, 20% yearly discount |
| Premium badges / tiers | **IMPLEMENTED** | Gold/silver/bronze, `PremiumBadge` |
| Featured listing card | **IMPLEMENTED** | Gold gradient, ribbon, priority indicator, mini-chart |
| Upgrade modal | **IMPLEMENTED** | With confirmation |
| Premium view in owner dashboard | **IMPLEMENTED** | |
| Promotion flags | **IMPLEMENTED** | `isPromoted`/`isFeatured` + `*Until` |
| Promotion granting | **PARTIALLY IMPLEMENTED** | Admin-granted via `AdminBusinessesView` (Phase 11: promote + end early) — never purchased |
| **Payments (Click/Payme/Uzum/cash)** | **PLANNED** | **UI labels only. No provider, no integration, no billing/subscription table.** |
| **Advertising module** | **PLANNED** | Table + enums exist; explicitly *"DEFERRED TO PHASE 2 (ships with Click payments)"* |
| Health score as an upsell funnel | **IMPLEMENTED** | Backend only; nudges with **estimated, not measured**, impact figures |
| Invoicing / receipts / tax | **PLANNED** | — |

## 15. 3D / immersive experiences

| Feature | Status | Notes |
| --- | --- | --- |
| **Any 3D, WebGL, AR/VR, 360°, or virtual-tour feature** | **NOT PRESENT** | No Three.js, no `react-three-fiber`, no Babylon, no `<canvas>` 3D, no panorama viewer, no model formats anywhere in either repo. Nothing in the schema, code, or recovered session history mentions an immersive experience. |

> Listed because the handoff brief asked. **Treat this as a genuine blank, not an omission** — if an immersive feature is desired, it would be entirely new work with no existing foundation.

## 16. Internationalization

| Feature | Status | Notes |
| --- | --- | --- |
| Three languages (uz / ru / en) | **IMPLEMENTED** | **385 keys each, exact parity** |
| Compiler-enforced completeness | **IMPLEMENTED** | `TranslationKey = keyof typeof uz` — a missing `ru`/`en` key is a build error |
| Language-prefixed routes | **IMPLEMENTED** | `/:lang/...`, `/` → `/uz` |
| Language persistence | **IMPLEMENTED** | `localStorage.myandijan_lang`; switching preserves path + query |
| Localized DB content | **IMPLEMENTED** | `name{Uz,Ru,En}` on `Category`, `Region`, `District`, `City`, `BusinessType`, `BusinessRecommendation` |
| **Localized business names** | **NOT PRESENT** | `Business`/`Branch` have a single `name` — hence the frontend normalisation layer |
| String interpolation in `t()` | **NOT PRESENT** | **By design.** Callers use `.replace("{x}", value)` |
| Pluralization | **NOT PRESENT** | |
| Date/number localization | **UNKNOWN** | No `Intl` usage verified |
| RTL support | **NOT PRESENT** | Not needed for uz/ru/en |

## 17. Platform & infrastructure

| Feature | Status | Notes |
| --- | --- | --- |
| API deployment (Railway) | **IMPLEMENTED** | Auto-migrate on boot, `&&`-chained |
| Frontend deployment (Vercel) | **IMPLEMENTED** | Live and current as of 2026-09-28. Deployed from a developer machine via the Vercel CLI; the project is **not** Git-connected, so pushes to GitHub do not auto-deploy. |
| SPA deep-link rewrite | **IMPLEMENTED** | `vercel.json` catch-all |
| Local Postgres via Docker | **IMPLEMENTED** | `docker-compose.yml` |
| Swagger API docs | **IMPLEMENTED** | `/docs` — **publicly exposed in production** |
| **Tests** | **PARTIALLY IMPLEMENTED** | **Superseded by Phase 3 (2026-09-28)/Phase 4 (2026-09-29).** Jest (backend, 37 tests) + Vitest/RTL (frontend, 10 tests) now cover auth, business listing/search/detail, category/geography endpoints, the homepage/search/detail/protected-route smoke tests, and the Phase 4 refresh-token + search-analytics wiring. Not a full suite — most admin/owner flows and UI components remain untested. |
| CI/CD | **PARTIALLY IMPLEMENTED** | **Superseded by Phase 3.** A minimal GitHub Actions workflow exists in both repos (install → test → build on push/PR to `main`); no deployment automation |
| Staging environment | **NOT PRESENT** | |
| Error tracking | **NOT PRESENT** | |
| Rate limiting (general) | **NOT PRESENT** | Only the hand-rolled OTP cap |
| Caching | **NOT PRESENT** | No Redis, no cache module, no HTTP cache headers |
| Background jobs / cron | **NOT PRESENT** | |
| Database backups (in-repo config) | **NOT PRESENT** | Railway may provide them — **UNKNOWN** |
| Accessibility: reduced motion | **IMPLEMENTED** | `MotionConfig reducedMotion="user"` app-wide |
| Accessibility: audit / WCAG | **UNKNOWN** | No audit performed |
| Privacy policy | **PARTIALLY IMPLEMENTED** | `PRIVACY_POLICY.md` exists in the API repo (842 bytes); not surfaced in the app |
| Terms of service | **NOT PRESENT** | Signup shows legal consent text above the CTA, but no ToS document exists |

---

## 18. Headline counts

| | Count |
| --- | --- |
| API routes built | **118** |
| API routes the frontend calls | **~46** (Phase 4: refresh/logout/analytics/homepage-categories; Phase 5: events detail/RSVP/owner-create; Phase 6: `GET /admin/reviews`) |
| API routes with no frontend usage | **~72** |
| Database models | **31** |
| Models entirely unused by code | **3** (`Notification`, `PlatformSetting`, `Advertisement`) |
| Frontend route pages | **12** + 3 redirects |
| Owner dashboard views | 8 (0 mock as of Phase 10 — Inventory now real; 1 non-persisting, 1 placeholder) |
| Admin dashboard views | 10 (0 mock as of Phase 6 — Reviews now real; 1 non-persisting — Settings) |
| i18n keys | **434 × 3 languages, full parity** (Phase 12) |
| Tests | **409** (299 backend + 110 frontend, Phase 12) |
| AI features | **0** |
| 3D / immersive features | **0** |
