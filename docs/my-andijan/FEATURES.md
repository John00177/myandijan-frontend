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
| Events listing | **IMPLEMENTED** | `/:lang/events`; **live API returns 0 events** |
| Event detail page | **PLANNED** | `GET /events/:slug` exists; no page |
| 404 page | **PLANNED** | No catch-all route |

## 2. Search & filtering

| Feature | Status | Notes |
| --- | --- | --- |
| Text search | **IMPLEMENTED** | Via `GET /businesses?search=`; debounced input |
| **Advanced FTS search** (`GET /search`) | **PARTIALLY IMPLEMENTED** | `pg_trgm` + tsvector, 4 custom PG functions, **Uzbek transliteration normalisation**, unified business+product ranking. **Nothing calls it.** The most capable unused asset in the project. |
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
| Product/menu search | **PARTIALLY IMPLEMENTED** | Server ranks products; no UI surfaces product hits |
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
| Report a review | **PARTIALLY IMPLEMENTED** | `ReviewReport` model + admin resolve endpoint; **no report UI** |
| "Helpful" voting | **PLANNED** | `helpfulCount` column exists; nothing increments it |
| Review moderation queue | **BROKEN** | Hide/restore endpoints exist but **no `GET /admin/reviews`**, so `AdminReviewsView` is mock |
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
| **Refresh tokens** | **BROKEN** | Fully built server-side (hashed, rotating, revocable); **frontend never stores or uses them** → sessions die after ~15 min |
| Logout | **PARTIALLY IMPLEMENTED** | `POST /auth/logout` exists; frontend only clears `localStorage` |
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
| My businesses | **IMPLEMENTED** | Lean list + full-detail fetch |
| Edit business | **IMPLEMENTED** | `EditBusinessModal`; details + 7-day hours |
| Owner KPIs | **IMPLEMENTED** | `GET /me/stats` |
| Reviews + reply | **IMPLEMENTED** | |
| My events (list) | **IMPLEMENTED** | Create/edit/delete endpoints exist; **no UI** |
| **Business claim flow** | **IMPLEMENTED** | 8 screens, live preview; submits to `POST /businesses` |
| Claim status visibility | **PLANNED** | `GET /me/claims` exists; nothing calls it — an owner cannot see what happened to their claim |
| Add business (3-step) | **IMPLEMENTED** | `AddBusinessPage` |
| Multi-branch management | **PARTIALLY IMPLEMENTED** | `POST /me/businesses/:id/branches` + `PATCH /me/branches/:id` exist; branch **creation** has no UI |
| Menu / product management | **PARTIALLY IMPLEMENTED** | API + `api.ts` wrappers + `ProductModal` exist; **`InventoryView` still renders mock data** |
| Owner analytics | **PARTIALLY IMPLEMENTED** | 6 endpoints exist; no UI, and the source tables are empty |
| Health score for owners | **PARTIALLY IMPLEMENTED** | Full engine + localized recommendations; **no UI** |
| **Owner settings (hours)** | **BROKEN** | Form saves nothing |
| Ads management | **PLANNED** | Honest "coming soon" empty state |

## 9. Admin panel

| Feature | Status | Notes |
| --- | --- | --- |
| Admin shell | **IMPLEMENTED** | 10 views, sidebar/drawer |
| Platform stats | **IMPLEMENTED** | |
| Business list + approve/reject | **IMPLEMENTED** | Reject requires a non-empty `reason` |
| Business edit + branch edit | **IMPLEMENTED** | |
| User list | **IMPLEMENTED** | |
| Category CRUD | **PARTIALLY IMPLEMENTED** | List/create/update wired; delete + reorder endpoints unused |
| Event list | **IMPLEMENTED** | Approve/reject endpoints unused |
| Audit log | **IMPLEMENTED** | `GET /admin/audit` |
| Analytics view | **PARTIALLY IMPLEMENTED** | Real endpoints, but the underlying tables are unfed |
| Regions view | **PARTIALLY IMPLEMENTED** | Reads the **public** geography endpoint; district/city edit endpoints unused |
| **Review moderation** | **BROKEN** | Mock — no list endpoint |
| **Admin settings** | **BROKEN** | Local state only; `/admin/settings` does not exist; `PlatformSetting` table unused |
| Claims moderation | **PLANNED** | 3 endpoints exist; no UI |
| Reports moderation | **PLANNED** | 2 endpoints exist; no UI |
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
| Sitemap: pages / categories / locations | **IMPLEMENTED** | 9 / 24 / 72 URLs |
| **Sitemap: businesses** | **BROKEN** | **0 URLs** — the highest-value file is empty |
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
| **Ingestion wiring** | **BROKEN** | **The frontend calls none of them.** Every analytics feature downstream reads empty tables. |
| Owner analytics API | **IMPLEMENTED** | 6 endpoints |
| Owner analytics UI | **PLANNED** | `TrafficChart`, `Sparkline` components exist but are not fed |
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
| Promotion granting | **PARTIALLY IMPLEMENTED** | Only `POST /admin/businesses/:id/promote` — admin-granted, never purchased |
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
| **Tests** | **NOT PRESENT** | **Zero test files, no runner, no `test` script in either repo** |
| CI/CD | **NOT PRESENT** | No GitHub Actions, no pipeline |
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
| API routes the frontend calls | **~38** |
| API routes with no frontend usage | **~80** |
| Database models | **31** |
| Models entirely unused by code | **3** (`Notification`, `PlatformSetting`, `Advertisement`) |
| Frontend route pages | **12** + 3 redirects |
| Owner dashboard views | 8 (1 mock, 1 non-persisting, 1 placeholder) |
| Admin dashboard views | 10 (1 mock, 1 non-persisting) |
| i18n keys | **385 × 3 languages, full parity** |
| Tests | **0** |
| AI features | **0** |
| 3D / immersive features | **0** |
