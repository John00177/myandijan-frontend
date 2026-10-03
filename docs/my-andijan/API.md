# API — My Andijan

> **118 routes** across 16 controllers in 17 feature modules. Extracted from the route decorators in `my-andijan-api/src/**/*.controller.ts` on 2026-09-28 and cross-referenced against the frontend's `src/lib/api.ts`.

---

## 0. Conventions

| | |
| --- | --- |
| Base URL (production) | `https://myandijan-api-production.up.railway.app` |
| Base URL (local) | `http://localhost:3000` (port 3001 was also used during development) |
| **Global prefix** | **None.** Routes are `/auth/login`, *not* `/api/auth/login`. Session prompts referring to `/api/auth/otp/*` were wrong; the real paths have no `/api`. |
| Auth | `Authorization: Bearer <accessToken>` |
| Validation | Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` → **unknown body properties produce `400`** |
| Paginated response | `{ "data": T[], "meta": { "page", "limit", "total", "totalPages" } }` |
| Error response | Nest default: `{ "statusCode", "message": string \| string[], "error" }` |
| Interactive docs | `GET /docs` — Swagger UI, **publicly reachable in production** |
| `Decimal` over JSON | Serialised as **strings** (e.g. `ratingAvg: "5"`). Clients must coerce. |

### Auth legend

| Symbol | Meaning |
| --- | --- |
| — | Public, no token |
| 🔒 | `JwtAuthGuard` — any authenticated active user |
| 🔒 `ROLE` | `JwtAuthGuard` + `RolesGuard`, where `ROLE` is the **minimum** level (hierarchy floor: `CUSTOMER` 1 < `BUSINESS_OWNER` 2 < `SUPPORT` 3 < `MODERATOR` 4 < `ADMIN` 5 < `SUPER_ADMIN` 6) |

### Frontend-usage legend

| Symbol | Meaning |
| --- | --- |
| ✅ | Called by the frontend |
| ⭕ | **Exists on the API but no frontend code calls it** |

---

## 1. Auth — `/auth` (10 routes)

> **Phase 15B.** Every credential / SMS-code route is rate limited per client address (per minute) and per `body.phone` (per 15 min) — exceeding either returns **`429`** (limits in `src/auth/auth-throttle.ts`; `/auth/refresh` is address-only; `/auth/logout` and `/auth/profile` are exempt). Access tokens carry `sv` (the user's `session_version`); a password reset or suspension invalidates every earlier access and refresh token (`401 Session has been revoked`). CORS is an allowlist (`myandijan.uz`, `www.myandijan.uz`, `FRONTEND_URL`, optional `CORS_ORIGINS`; localhost outside production). Every response carries `X-Request-Id`.

`src/auth/auth.controller.ts`

| Method | Path | Auth | Purpose | Request | FE |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/register` | — | Create an account with a password | `RegisterDto`: `phone` `/^\+998\d{9}$/` **req**, `password` min 8 **req**, `fullName` min 2 **req**, `email?`, `role?` restricted to `CUSTOMER\|BUSINESS_OWNER`, `marketingConsent?` (default false), `districtId?` | ✅ |
| POST | `/auth/login` | — | Password login | `LoginDto`: `phone`, `password` | ✅ |
| POST | `/auth/refresh` | — | Exchange a refresh token for a new pair (rotating) | `RefreshDto` | **⭕** |
| POST | `/auth/logout` | 🔒 | Revoke the current refresh token | — | **⭕** |
| POST | `/auth/otp/request` | — | Send a 6-digit OTP | `RequestOtpDto`: `phone` `/^\+998\d{9}$/` | ✅ |
| POST | `/auth/otp/verify` | — | Verify OTP; creates the user if new | `VerifyOtpDto`: `phone`, `otp` `/^\d{6}$/` | ✅ |
| PUT | `/auth/profile` | 🔒 | Set name + avatar after OTP signup | **multipart**: `firstName`, `lastName`, `photo?` (image, ≤5 MB) | ✅ |
| POST | `/auth/forgot-password` | — | Start password reset | `ForgotPasswordDto`: `phone` | ✅ |
| POST | `/auth/verify-reset-code` | — | Verify the reset code | `VerifyResetCodeDto`: `phone`, `code` | ✅ |
| POST | `/auth/reset-password` | — | Set a new password | `ResetPasswordDto`: `phone`, `code`, `newPassword` | ✅ |

**Responses.** `/auth/login`, `/auth/register` and `/auth/otp/verify` all return the same envelope: `{ user, accessToken, refreshToken }`. `/auth/otp/request` returns `{ success: true, message: "Kod yuborildi" }`. `/auth/profile` returns `{ success: true, user }`.

**Errors.** `400` bad phone format; `400 "Kod noto'g'ri yoki muddati tugagan"` wrong/expired OTP; `401` bad credentials or inactive user; **`429`** OTP rate limit (3 per phone per 10 min).

**Behaviour to know.**
- `RegisterDto.role` uses `@IsIn([CUSTOMER, BUSINESS_OWNER])`, which **is** the enforcement of the schema's *"the public /auth/register endpoint MUST reject role=ADMIN"* requirement.
- OTP: 6 digits via `crypto.randomInt`, hashed, 5-minute TTL, single-use, max 5 attempts.
- OTP-created users get an unusable random password hash and `fullName: ''`.
- **`/auth/profile` is `PUT` and multipart**, not JSON — the avatar rides along with the name in one request, so the client needs no separate upload call.
- `PUT /auth/profile` is the OTP-signup profile setter; `PATCH /users/me` is the general profile editor. **Two different endpoints for overlapping concerns.**

**Models touched:** `User`, `RefreshToken`, `OtpCode`.

---

## 2. Users — `/users` (2 routes)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/users/me` | 🔒 | Current user profile | ✅ |
| PATCH | `/users/me` | 🔒 | Update profile (`UpdateProfileDto`) | ✅ |

Used by `AuthContext`'s mount-time refresh and `ProfilePage`. Supports `age`, `gender`, `avatarId` (migration `add_profile_fields`).

> **Stale comment alert:** `src/contexts/AuthContext.tsx` claims *"the backend has no profile-update endpoint or age/gender columns yet."* It does. Both.

---

## 3. Geography — `/geography` (5 routes)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/geography/regions` | — | Regions (with districts) | ✅ |
| GET | `/geography/districts` | — | All districts | **⭕** |
| GET | `/geography/districts/:id/cities` | — | Cities in a district | **⭕** |
| GET | `/geography/cities` | — | All cities | **⭕** |
| GET | `/geography/cities/:id` | — | One city | **⭕** |

The frontend derives districts from `regions[0].districts` (see `AdminRegionsView`, `useRegions`) rather than calling the dedicated endpoints.

---

## 4. Categories — `/categories` (3 routes)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/categories/homepage` | — | Categories with `showOnHomepage = true` | **⭕** |
| GET | `/categories` | — | Full category list/tree | ✅ |
| GET | `/categories/:slug` | — | One category by slug | **⭕** |

The frontend fetches the whole list and filters client-side, so the purpose-built `homepage` endpoint is unused.

---

## 5. Businesses — `/businesses` (10 routes)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| POST | `/businesses` | 🔒 `CUSTOMER` | Create a business (any authenticated user) | ✅ |
| DELETE | `/businesses/:id` | 🔒 **`SUPER_ADMIN`** | Delete a business | **⭕** |
| PATCH | `/businesses/:id` | 🔒 **owner only** (Phase 15B — any role, must own it; no staff bypass) | Update — the owner dashboard's `EditBusinessModal` save path. Staff use `PATCH /admin/businesses/:id` | ✅ |
| PUT | `/businesses/:id/hours` | 🔒 **owner only** (Phase 15B) | Replace the **primary branch's** 7-day hours wholesale. Staff use `PUT /admin/businesses/:id/hours` | ✅ |
| GET | `/businesses/featured` | — | `isFeatured` businesses | ✅ |
| GET | `/businesses/promoted` | — | `isPromoted` businesses | **⭕** |
| GET | `/businesses` | — | **List + filter + paginate** (name `contains`, no ranking) — used for category/district-only browsing. Each item carries `updatedAt` since Phase 16F.6 (also on `/featured` and `/promoted`, which share the projection): the last real edit of the listing — views and favourites no longer move it — for the sitemap's `lastmod` | ✅ |
| GET | `/businesses/:id` | — | Detail by **id or slug**; only `APPROVED` | ✅ |
| GET | `/businesses/:id/reviews` | — | Reviews for a business | ✅ |
| POST | `/businesses/:id/reviews` | 🔒 `CUSTOMER` | Create a review; resolves to the primary branch server-side | ✅ |

**`GET /businesses` query (`ListBusinessesQueryDto`)** — this is the app's real search endpoint:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `category` | string | — | category slug |
| `district` | int | — | district id |
| `city` | int | — | city id |
| `search` | string | — | free text |
| `page` | int ≥1 | `1` | |
| `limit` | int 1–100 | `20` | **max 100** |

**`POST /businesses` (`CreateBusinessDto`)** — required: `name` (2–200), `categoryId`, `phone` `/^\+998\d{9}$/`, `districtId`, `address` (5–500). Optional: `businessTypeId`, `description`, `secondaryPhone`, `cityId`, `landmark`, `hours[]` (`{day: 0–6, openTime?, closeTime?, isClosed?}`), and more.

> **Known spec divergence:** the claim flow specced address as optional. `CreateBusinessDto` hard-requires `address` (min 5) **and** `districtId`, so the claim flow had to make both required. `useClaimFlow.ts` defaults `DEFAULT_DISTRICT_ID = "1"` (Andijon).
> **Historical trap:** commit `762ac15` fixed a frontend/backend mismatch — the field is **`hours`**, not `workingHours`.
> **Stale comment alert:** `src/lib/api.ts` says `POST /businesses` was *"Confirmed absent on the live API (2026-08-13) … 404"*. It exists.

**Models:** `Business`, `Branch`, `BranchHour`, `Category`, `BusinessType`, `Review`.

---

## 6. Search — `/search` (1 route)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/search` | — | Unified full-text search over businesses **and** products | ✅ **(Phase 8)** |

**Query (`SearchQueryDto`):** `q` **required**, non-empty, ≤200 chars; `category?`, `district?`, `city?`, `page` (default 1), `limit` (1–100, default 20), `type?` (`"business"` \| `"product"` — **added Phase 8**, restricts the result set to one kind; omitted returns both, unchanged from before).

**Response:** `{ data, meta: { page, limit, total, totalPages, query, normalizedQuery } }` where each `data` item carries a `type: "business" | "product"` discriminator and a relevance `score`, and `normalizedQuery` exposes what the query folded down to after Uzbek transliteration normalisation.

**Frontend integration (Phase 8):** `SearchPage`/`useSearchBusinesses` now call `GET /search?type=business` (via `searchBusinessesFts()` in `src/lib/api.ts`) whenever the user has typed a text query, so free-text search gets real `pg_trgm`/tsvector ranking and transliteration folding instead of the old `GET /businesses?search=` case-insensitive substring match. Pure category/district browsing (no text) still uses `GET /businesses`, which already paginates and filters correctly server-side — there is nothing to *rank* without a query term, so FTS adds no value there. See `ARCHITECTURE.md` §25 and `DECISIONS.md` D-57.

**Product hits are intentionally excluded from the public search UI** — `type=business` is always passed — because the app has no product/menu-item result card; showing `PRODUCT`-kind hits would require a new card component and mixed-type rendering, which is out of Phase 8's scope. `GET /search` without `type` (or `type=product`) is unchanged and still available for a future caller.

---

## 7. Reviews — `/reviews` (7 routes; +1 Phase 12)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| POST | `/reviews` | 🔒 | Create a review (branch-scoped) | **⭕** |
| GET | `/reviews/:id` | — | One review | **⭕** |
| PATCH | `/reviews/:id` | 🔒 | Edit own review | **⭕** |
| DELETE | `/reviews/:id` | 🔒 | Delete own review | **⭕** |
| POST | `/reviews/:id/reply` | 🔒 **owner of the reviewed business** (Phase 15B; no staff bypass) | Create an owner reply | **⭕** |
| PATCH | `/reviews/:id/reply` | 🔒 **owner of the reviewed business** (Phase 15B) | Edit an owner reply | ✅ |
| POST | `/reviews/:id/report` | 🔒 any signed-in role | **New Phase 12.** Report a review. Body `{ reason: SPAM\|OFFENSIVE\|FAKE\|IRRELEVANT\|PERSONAL_INFO\|OTHER, note? ≤1000 }`. Only a publicly visible review (PUBLISHED, not deleted, live branch of an APPROVED business) → else `404`. One report per user per review (`@@unique`) → repeat `409`. Increments `Review.reportCount` in the same transaction. Response omits the reporter | ✅ `ReviewsSection` |

The frontend writes reviews through `POST /businesses/:id/reviews` and replies through `POST /me/reviews/:id/reply`, so most of this controller is unused. **`api.ts`'s `replyToReview()` uses `PATCH /reviews/:id/reply`** — edit, not create — which will fail if no reply exists yet. Worth verifying.

**Constraints:** one review per user per branch; one reply per review; `rating` has no DB-level range check.

---

## 8. Favorites — `/favorites` (3 routes)

Class-level 🔒 `JwtAuthGuard`.

| Method | Path | Purpose | FE |
| --- | --- | --- | --- |
| POST | `/favorites` | Add — body `{ businessId }` | ✅ |
| DELETE | `/favorites/:businessId` | Remove | ✅ |
| GET | `/favorites` | List | ✅ |

**`GET /favorites` returns `{ favoritedAt, business }[]`, not a flat `Business[]`** — `api.ts` unwraps it so callers keep working with plain business objects.

---

## 9. Products / "menu" — catalog (5 routes; Phase 10)

Three controllers in `src/products/`: `BusinessMenuController` (`/businesses/:id/menu`), `OwnerMenuController` (`/me/businesses/:id/menu`, **added Phase 10**) and `MenuItemController` (`/menu/:id`). Backed by the `Product` model — there is deliberately no separate `MenuItem`.

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/businesses/:id/menu` | — | **Public** catalog: active items of an **APPROVED** business | ✅ `MenuSection` |
| GET | `/me/businesses/:id/menu` | 🔒 **owner only** (Phase 15B) | **Owner** catalog: all non-deleted items incl. deactivated, any business status | ✅ `InventoryView` |
| POST | `/businesses/:id/menu` | 🔒 **owner only** (Phase 15B) | Create an item | ✅ |
| PATCH | `/menu/:id` | 🔒 **owner only** (Phase 15B) | Update an item (partial) | ✅ |
| DELETE | `/menu/:id` | 🔒 **owner only** (Phase 15B) | Soft-delete an item (`deletedAt`) | ✅ |

**Authorization (two layers).** `RolesGuard` is a role *floor*; the real boundary is `ProductsService.assertCanManage`: caller must be the business's `ownerId` **or** `MODERATOR`/`ADMIN`/`SUPER_ADMIN`. A `BUSINESS_OWNER` touching another owner's business/item gets **403**; an unknown or soft-deleted business/item gets **404**; anonymous gets **401**. `SUPPORT` passes the role floor (hierarchy quirk, CURRENT_STATE bug #9) but is rejected with 403 by the service check.

**Public list behaviour (changed Phase 10).** `GET /businesses/:id/menu` now 404s for any business that is not `APPROVED` (DRAFT/PENDING/REJECTED/SUSPENDED/HIDDEN), matching `GET /businesses/:id`. Before Phase 10 it served the catalog of unpublished businesses. Items filtered: `isActive = true`, `deletedAt IS NULL`; ordered `sortOrder, createdAt`.

**`POST` body (`CreateMenuItemDto`):** `name` (required, ≤200 chars), `price` (required, **integer** so'm ≥ 0), `description?`, `photo?` (URL ≤500 chars — stored as `imageUrl`), `type?` (`PRODUCT` \| `SERVICE`, **Phase 10**; DB default `PRODUCT`), `categoryId?` (**Phase 10**; must reference a non-deleted category, else 404). The slug is server-generated and unique per business (`osh`, `osh-2`, …).

**`PATCH` body (`UpdateMenuItemDto`):** every create field optional, plus `isAvailable?` (soft "sold out" flag, item stays listed) and `isActive?` (**Phase 10** — the publish switch; `false` hides the item from the public catalog, from `GET /businesses/:id`, and from product full-text search). Absent fields are left untouched. Unknown fields (e.g. `businessId`, `ownerId`) are rejected with 400 by the global `forbidNonWhitelisted` ValidationPipe, so an item cannot be moved to another business.

Not editable through this API (no columns or deliberately server-owned): SKU, stock quantity (do not exist — D-61), `slug`, `sortOrder`, `priceMax`, `currency`, `unit`.

---

## 10. Events — `/events` (4 routes)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/events` | — | Paginated list. Each item carries `updatedAt` since Phase 16F.6: the last real edit of the event — RSVPs no longer move it — for the sitemap's `lastmod` | ✅ |
| POST | `/events` | 🔒 **owner of `businessId`** (Phase 15B; no role floor) | Create an event | **⭕** |
| GET | `/events/:slug` | — | Detail by slug | **⭕** |
| POST | `/events/:slug/attend` | 🔒 | RSVP (`EventAttendee`) | **⭕** |

The frontend has an events **list** only — no detail page and no RSVP UI, despite both endpoints existing.

---

## 11. Upload — `/upload` (1 route)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| POST | `/upload/image` | 🔒 | Upload an image to Supabase Storage | ✅ |

`multipart/form-data`, field **`file`**. Max **5 MB**; MIME allow-list `image/jpeg`, `image/png`, `image/webp`, `image/gif`. Returns `{ url }` — a public unsigned Supabase URL.

Errors: `400 "No file uploaded (expected multipart field \"file\")"`, `400 "Unsupported file type: <mime>"`, `500` when `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` are missing.

> Authorization note from the controller: any authenticated user may upload, because the endpoint only returns a URL. Permission to *attach* that URL is enforced by whichever write endpoint the client calls next.
> The client also pre-validates (`assertUploadable`) and allows `image/heic`/`image/heif`, **which the server rejects** — an iPhone HEIC upload passes the client check and then fails server-side with a 400.

---

## 12. Owner — `/me` (14 routes)

Class-level 🔒 `JwtAuthGuard`. `OwnerService` scopes everything by `ownerId`.

| Method | Path | Purpose | FE |
| --- | --- | --- | --- |
| GET | `/me/stats` | Owner KPI summary | ✅ |
| GET | `/me/businesses` | My businesses (lean summary shape) | ✅ |
| POST | `/me/businesses` | Create a business as owner | **⭕** |
| GET | `/me/businesses/:id` | **Full** detail — backs the edit modal | ✅ |
| PATCH | `/me/businesses/:id` | Update my business | ✅ |
| POST | `/me/businesses/:id/branches` | Add a branch | **⭕** |
| PATCH | `/me/branches/:id` | Update a branch (`phone`, `address`, `districtId`) | ✅ |
| GET | `/me/reviews` | Reviews on my businesses (paginated) | ✅ |
| POST | `/me/reviews/:id/reply` | Reply to a review | ✅ |
| GET | `/me/events` | My events (paginated) | ✅ |
| POST | `/me/events` | Create an event | **⭕** |
| PATCH | `/me/events/:id` | Update an event | **⭕** |
| DELETE | `/me/events/:id` | Delete an event | **⭕** |
| GET | `/me/claims` | My submitted claims (paginated, own claims only) | ✅ **(Phase 9)** |
| POST | `/me/claims` | Claim an existing, unowned business | ✅ **(Phase 9)** |

> `GET /me/businesses` returns a lean shape without description or branch phone/address/district — which is why `GET /me/businesses/:id` exists and why the edit modal opens with real data rather than a partially blank form.

**`POST /me/claims` (`CreateClaimDto`) — added Phase 9.** Any authenticated user (class-level `JwtAuthGuard`; no role floor — a claim is how an unverified representative first establishes a relationship to a listing). Body: `businessId` (int, required), `evidence?` (≤2000), `contactPhone?` (≤20), `contactNote?` (≤1000). Response: the new `BusinessClaim` (`status: "PENDING"`) with `business: {id, slug, name}`. **Phase 16H:** a second pending claim by the same user for the same listing is `409` *"You already have a pending claim for this business"* even when both requests race (database partial unique index); a claim that loses a race with an approval of another claim is `409` *"This business is already claimed or no longer open to claims"* (or, if it committed first, is auto-rejected by that approval).

| Status | When |
| --- | --- |
| `201` | Claim created, `status = PENDING` |
| `400` | Validation failure, or the business is not `APPROVED` (draft/pending/rejected/suspended/hidden listings can't be claimed) |
| `401` | No/invalid token |
| `404` | Business doesn't exist or is soft-deleted |
| `409` | Business already has an owner (`ownerId` set), **or** this user already has a `PENDING` claim on it |

> **Not the same as `/uz/claim`.** Despite its name, that 8-screen frontend flow submits a brand-new listing via `POST /businesses` (owned by its submitter from creation). `POST /me/claims` is for an *existing* listing with `ownerId = null`. See `ARCHITECTURE.md` §26.
> `GET /me/claims` is scoped server-side to `claimantId = <caller>` — no cross-user visibility. The frontend reads it on `ProfilePage` ("Mening da'volarim").

---

## 13. Analytics — 11 routes

`AnalyticsController` is declared on `@Controller()` (root) and spans three path families.

### 13.1 Ingestion (public)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| POST | `/analytics/view` | — | Record a business view (`RecordViewDto`). Since Phase 16F.6 the `viewCount` increment is a plain SQL update that does **not** move the business's `updatedAt` (same for favourite ±1 and RSVP `attendeeCount` +1 — `src/common/counters.ts`). Since Phase 16G.1 one view per client (address + user-agent) per business per 30 min is recorded; repeats answer the same `{ success: true }` and write nothing (`AnalyticsGate`, which also caps each address at 300 events / 10 min across all three collectors) | **⭕** |
| POST | `/analytics/click` | — | Record a click (`RecordClickDto`). Phase 16G.1: the same click again within 10 s is not recorded | **⭕** |
| POST | `/analytics/search` | — | Record a search (`RecordSearchDto`). Phase 16G.1: the same query + filters (case/space-insensitive) within a minute is not recorded | **⭕** |

> **⚠ The single most consequential gap in the API surface.** These three are the only writers for `BusinessAnalytics`, `SearchAnalytics` and `ActivityLog`, and **the frontend calls none of them.** Every owner and admin analytics screen therefore reads from tables nothing populates. Wiring these is a small change with large downstream effect.
> They are also **unauthenticated and unthrottled** — see `SECURITY.md`.

### 13.2 Owner-facing reports (🔒)

| Method | Path | Purpose | FE |
| --- | --- | --- | --- |
| GET | `/me/analytics/overview` | Summary: the last 7 days vs the previous 7, over all the caller's businesses | ✅ **(Phase 16G.2)** — owner dashboard home panel |
| GET | `/me/analytics/traffic` | Time series (`TrafficQueryDto`) | **⭕** |
| GET | `/me/analytics/demographics` | Visitor cities | **⭕** |
| GET | `/me/analytics/search-terms` | Terms that led to the business | **⭕** |
| GET | `/me/analytics/peak-hours` | Busiest hours | **⭕** |
| GET | `/me/analytics/competitors` | Category comparison | **⭕** |

### 13.3 Admin (🔒 `SUPER_ADMIN`)

| Method | Path | Purpose | FE |
| --- | --- | --- | --- |
| GET | `/admin/analytics/users` | User analytics | ✅ |
| GET | `/admin/analytics/dashboard` | Dashboard analytics | ✅ |

---

## 14. Health score — 3 routes

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/me/health-score` | 🔒 | Scores + recommendations for my business | **⭕** |
| POST | `/me/health-score/recommendations/:id/complete` | 🔒 | Mark a recommendation done | **⭕** |
| POST | `/admin/health-scores/recalculate` | 🔒 `ADMIN` | Recalculate platform-wide | **⭕** |

Four sub-scores (profile, engagement, visibility, response) plus a weighted `overallScore`; weights live in `HealthScoreService`, not the schema. Recommendations are keyed by a stable `code` so recalculation is an idempotent upsert that preserves `isCompleted`. **No frontend surface exists for any of it.**

---

## 15. Admin — `/admin` (36 routes; +3 in Phase 11, +1 in Phase 14, +1 in Phase 15B)

> **Phase 15B (D-74).** Staff edits of a business someone else owns happen **only** here, each with a required `reason` (recorded as the audit note): `PATCH /admin/businesses/:id` (now also `coverPhoto`, `hasDelivery`, `deliveryFee`, `deliveryTime`, `website`, `telegram`, `instagram`), `PATCH …/branch`, and **new `PUT /admin/businesses/:id/hours`** (`{ reason, hours: [...] }`). `POST /admin/users/:id/suspend|activate` now require `{ reason }` and follow an explicit actor→target table: never yourself, never a `SUPER_ADMIN`; `ADMIN` → `CUSTOMER`/`BUSINESS_OWNER`; `SUPER_ADMIN` → also `MODERATOR`/`SUPPORT` and an emergency freeze of an `ADMIN` that no role can reinstate (`403` otherwise; `409` on a wrong current status or a lost race). Suspension revokes all of the target's sessions. There is **no** role-change endpoint. Every admin audit row now records actor role, request id, IP and user agent.

> **Phase 14 (D-72/D-73).** `MODERATOR` now reaches `GET /admin/businesses` (owner returned as `{ id, fullName }`; `phone`/`email` only for ADMIN+), review list/hide/restore and report list/resolve (reporter returned as `{ id }`; name only for ADMIN+), in addition to business approve/reject. **New `PATCH /admin/businesses/:id/unhide`** (`SUPER_ADMIN`): only from `HIDDEN` (`409` otherwise); restores `statusBeforeHide` (recorded by `…/hide`) or `PENDING` if none. Approve/reject, review hide/restore, report resolve, hide and unhide are compare-and-set — `409` when another moderator acted first.

Class-level 🔒 `JwtAuthGuard, RolesGuard` + `@Roles(ADMIN)`, with per-route overrides in **both** directions. Every business operation below is pinned by `business-ops.authorization.spec.ts` (real decorator metadata, every role). All return `401` anonymous, `403` below the floor, `404` unknown/soft-deleted business, `409` when the business isn't in the state the operation needs.

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/admin/stats` | `ADMIN` | Platform stats | ✅ |
| GET | `/admin/businesses` | **`MODERATOR`** ↓ (Phase 14; owner PII ADMIN+ only) | List businesses (paginated; `?status=` any `BusinessStatus`, `?district=`, `?search=`) | ✅ (status filter server-side since Phase 11) |
| POST | `/admin/businesses/:id/approve` | **`MODERATOR`** ↓ | Approve | ✅ |
| POST | `/admin/businesses/:id/reject` | **`MODERATOR`** ↓ | Reject — body `{ reason }` **required** (`@IsNotEmpty`) | ✅ |
| PATCH | `/admin/businesses/:id/hide` | **`SUPER_ADMIN`** ↑ | Hide (any status → `HIDDEN`); records the prior status in `statusBeforeHide` (Phase 14) | ✅ **(Phase 14)** |
| PATCH | `/admin/businesses/:id/unhide` | **`SUPER_ADMIN`** ↑ | **New Phase 14.** `HIDDEN` → recorded `statusBeforeHide`, else `PENDING`; clears the column; audited `RESTORE` | ✅ **(Phase 14)** |
| PATCH | `/admin/businesses/:id` | `ADMIN` | Edit `name`/`description`/`categoryId` | ✅ |
| PATCH | `/admin/businesses/:id/branch` | `ADMIN` | Edit the **primary** branch's `phone`/`address`/`districtId`; **`reason` required** (Phase 15B) | ✅ |
| PUT | `/admin/businesses/:id/hours` | `ADMIN` | **New Phase 15B.** Body `{ reason, hours: BusinessHourInput[] }` — replace the primary branch's hours; audited `BranchHours` before/after | ✅ **(Phase 15B)** admin edit modal |
| POST | `/admin/businesses/:id/verify` | `ADMIN` | Set `isVerified` (+ `verifiedAt`/`verifiedById`). `409` if already verified | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/unverify` | `ADMIN` | **New Phase 11.** Clear `isVerified` only (`verifiedAt`/`verifiedById` kept — they double as the approval record). `409` if not verified | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/suspend` | `ADMIN` | `APPROVED` → `SUSPENDED`, body `{ reason }` required (stored in `rejectionReason`). **Phase 11: `409` unless currently `APPROVED`** (previously any status); compare-and-set update | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/unsuspend` | `ADMIN` | **New Phase 11.** `SUSPENDED` → `APPROVED`, clears `rejectionReason`. `409` unless currently `SUSPENDED`; compare-and-set. Cannot approve a PENDING or restore a HIDDEN listing | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/promote` | `ADMIN` | `isPromoted = true`, `promotedUntil = until` (body `{ until }` ISO date, must be future → else `400`). Sets **promotion only** — `isFeatured` has no admin endpoint | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/unpromote` | `ADMIN` | **New Phase 11.** End a promotion early: `isPromoted = false`, `promotedUntil = null`. Allowed for an already-expired promotion. `409` if not promoted | ✅ **(Phase 11)** |
| GET | `/admin/claims` | `ADMIN` | List claims (paginated, `?status=PENDING\|APPROVED\|REJECTED`); each row includes evidence, contact, claimant and business — there is no separate detail endpoint. Since Phase 16E.1 each row also carries review context: `business.status`, `business.deletedAt`, `business._count.claims` (that business's `PENDING` claims, this one included) and `claimant.status`; the admin queue warns on and disables approval of claims whose business or claimant would fail the approval checks, and flags competing claims | ✅ **(Phase 9, 16E.1)** |
| POST | `/admin/claims/:id/approve` | `ADMIN` | Approve → atomically sets `Business.ownerId` (only if still null), promotes a `CUSTOMER` claimant to `BUSINESS_OWNER`, auto-rejects other pending claims on that business. `404` unknown claim, `409` already reviewed / business already owned / lost a concurrent race | ✅ **(Phase 9)** |
| POST | `/admin/claims/:id/reject` | `ADMIN` | Reject with required `reason`; never touches ownership or roles. `409` if already reviewed | ✅ **(Phase 9)** |
| GET | `/admin/reports` | **`MODERATOR`** ↓ (Phase 14; reporter name ADMIN+ only) | List **review** reports (`ReviewReport`; no business-report model exists), paginated, `?status=PENDING\|RESOLVED\|DISMISSED`. Fed by `POST /reviews/:id/report` since Phase 12 | ✅ **(Phase 12)** `AdminReportsView` |
| POST | `/admin/reports/:id/resolve` | **`MODERATOR`** ↓ (Phase 14) | Body `{ action: HIDE_REVIEW \| DISMISS, note? }`. `HIDE_REVIEW` → report `RESOLVED` + review hidden + aggregates recalculated; `DISMISS` → report **`DISMISSED`** (Phase 11 fix — was stored as `RESOLVED`). `409` if already handled | ✅ **(Phase 12)** |
| GET | `/admin/reviews` | **`MODERATOR`** ↓ (Phase 14) | List reviews, paginated, optional `?status=` filter — **added Phase 6 (2026-09-29)** | ✅ |
| POST | `/admin/reviews/:id/hide` | **`MODERATOR`** ↓ (Phase 14) | Hide a review | ✅ |
| POST | `/admin/reviews/:id/restore` | **`MODERATOR`** ↓ (Phase 14) | Restore a review | ✅ |
| GET | `/admin/events` | `ADMIN` | List events (`?status=`; the admin queue opens on `PENDING`). Rows are the `Event` columns (`title`, `startAt`, `venueName`, `address`, `rejectionReason`, …) plus `business` and `district` | ✅ |
| POST | `/admin/events/:id/approve` | `ADMIN` | Approve → `PUBLISHED` (no body). `409` unless `PENDING`, `403` on your own business's event | ✅ **(Phase 16E.2)** |
| POST | `/admin/events/:id/reject` | `ADMIN` | Reject → `REJECTED`, body `{ reason }` (non-empty, ≤1000 chars). Same `409`/`403` | ✅ **(Phase 16E.2)** |
| GET | `/admin/categories` | `ADMIN` | List | ✅ |
| POST | `/admin/categories` | `ADMIN` | Create | ✅ |
| PATCH | `/admin/categories/reorder` | `ADMIN` | Bulk `sortOrder` | **⭕** |
| PATCH | `/admin/categories/:id` | `ADMIN` | Update | ✅ |
| DELETE | `/admin/categories/:id` | `ADMIN` | Soft delete | **⭕** |
| PATCH | `/admin/districts/:id` | `ADMIN` | Edit a district | **⭕** |
| PATCH | `/admin/cities/:id` | `ADMIN` | Edit a city | **⭕** |
| GET | `/admin/users` | `ADMIN` | List users | ✅ |
| POST | `/admin/users/:id/suspend` | `ADMIN` floor + target table (Phase 15B) | Suspend. Body `{ reason }`. Revokes the target's sessions | **⭕** |
| POST | `/admin/users/:id/activate` | `ADMIN` floor + target table (Phase 15B) | Reactivate. Body `{ reason }`. No role can reinstate an `ADMIN` (emergency freeze) or a `SUPER_ADMIN` | **⭕** |
| GET | `/admin/audit` | `ADMIN` | Audit log (paginated) | ✅ |

> **⚠ Route-ordering hazard:** `PATCH /admin/categories/reorder` is declared **before** `PATCH /admin/categories/:id`, which is what makes `reorder` reachable rather than being swallowed as `:id = "reorder"`. **Do not reorder these declarations.**
> **Superseded 2026-09-29 (Phase 6):** `GET /admin/reviews` now exists (`AdminService.findReviews`, paginated, optional `?status=` filter) and `AdminReviewsView` is wired to it, with hide/restore as real moderation actions. This was the last "genuinely missing" piece of the review workflow.
> **12 of 31 admin routes are now wired; 19 are not.**

> **Stale comment alert:** `src/lib/api.ts` says *"genuinely absent → /admin/reviews, /admin/audit-logs, /admin/settings (404)"*. `/admin/audit` exists (the probed path was wrong, and this was later corrected in the same file); review hide/restore exist; `/admin/reviews` (list) exists as of Phase 6. Only `/admin/settings` is genuinely absent.

---

## 16. Command centre — `/admin` (10 routes)

Separate controller, same `/admin` base, 🔒 `ADMIN`. **Founder-level analytics. Nothing in the frontend calls any of it.**

| Method | Path | Purpose | FE |
| --- | --- | --- | --- |
| POST | `/admin/analytics/aggregate` | Build daily `PlatformMetric` rollups | **⭕** |
| GET | `/admin/command-center/overview` | Top-line metrics | **⭕** |
| GET | `/admin/command-center/growth` | Growth over time | **⭕** |
| GET | `/admin/command-center/geography` | Per-district breakdown | **⭕** |
| GET | `/admin/command-center/categories` | Per-category breakdown | **⭕** |
| GET | `/admin/command-center/search-intelligence` | Query analytics | **⭕** |
| GET | `/admin/command-center/users` | User cohorts | **⭕** |
| GET | `/admin/command-center/moderation` | Moderation queue health | **⭕** |
| GET | `/admin/command-center/business-health` | Health distribution | **⭕** |
| GET | `/admin/command-center/health-overview` | "Who needs help" list | **⭕** |

> `POST /admin/analytics/aggregate` is the only writer for `PlatformMetric`, and **nothing schedules it** (there is no cron in the API). Unless an external scheduler exists (**UNKNOWN**), the table is only populated when someone calls this route by hand.

---

## 17. Endpoints the frontend references that do NOT exist

Verified by comparing every path in `src/` against the route list.

| Referenced | Reality |
| --- | --- |
| `/admin/settings` | **Does not exist.** `AdminSettingsView` therefore keeps its state in `useState` and persists nothing. The `PlatformSetting` table exists and is unused — this is the missing module. |
| `/health` | **Does not exist and never did.** Deploy checklists expecting it will 404. Use `GET /categories` as a liveness probe. |
| `/api/auth/otp/*` | **Wrong prefix.** There is no global `/api` prefix; the real paths are `/auth/otp/*`. Several session specs used the wrong form. |

## 18. Endpoints referenced in specs/plans that were never built

| Referenced | Status |
| --- | --- |
| Notifications (any path) | **Not built.** `Notification` table + enum exist; no module, no endpoints, no writer. |
| Advertisements (any path) | **Not built.** Deferred to Phase 2 with Click payments. |
| Payments / subscriptions | **Not built.** No provider, no billing model. |
| Telegram / Google OAuth | **Not built.** Signup shows the buttons. |
| `/me/products` | Never existed — the real paths are `/businesses/:id/menu` (public) and `/me/businesses/:id/menu` (owner, Phase 10). |

---

## 19. Coverage summary

| | Count |
| --- | --- |
| Total routes | **118** |
| Called by the frontend | **~38** |
| **Built but unused (⭕)** | **~80** |

The imbalance is concentrated in five areas, and it is the clearest single fact about this codebase's state:

1. **Search** (1 route) — the most sophisticated endpoint in the API, unused.
2. **Analytics ingestion** (3 routes) — unused, which starves every analytics feature downstream.
3. **Command centre** (10 routes) — unused; no founder dashboard exists.
4. **Health score** (3 routes) — unused; no owner-facing surface.
5. **Admin actions** (20 of 31) — unused; claims, reports, review moderation, verification, promotion, suspension and geography editing all lack UI.

Consequence for planning: **the backend is not the bottleneck.** Most near-term product value is unlocked by frontend wiring against endpoints that already exist and already work.


## Appendix — authorization of every route (Phase 15D, D-75)

Authoritative and generated from the backend's committed `src/authz/route-authorization.snapshot.json` (127 routes). Where an older "Auth" column above names a role floor, **this table wins** — the rank model was removed. "authenticated" = any signed-in account acting on its own data; a capability is required in full (see the matrix in `DECISIONS.md` D-75). Owner routes additionally check ownership; staff routes additionally refuse conflicts of interest; anything undeclared is refused.

| Method | Path | Rule |
| --- | --- | --- |
| DELETE | `/admin/categories/:id` | `taxonomy.manage` |
| DELETE | `/businesses/:id` | `business.delete` |
| DELETE | `/favorites/:businessId` | authenticated |
| DELETE | `/me/events/:id` | `business.manage_own` |
| DELETE | `/menu/:id` | `business.manage_own` |
| DELETE | `/reviews/:id` | `review.write` |
| GET | `/admin/analytics/dashboard` | `analytics.users` |
| GET | `/admin/analytics/users` | `analytics.users` |
| GET | `/admin/audit` | `audit.read` |
| GET | `/admin/businesses` | `business.review` |
| GET | `/admin/categories` | `taxonomy.manage` |
| GET | `/admin/claims` | `claim.review` |
| GET | `/admin/command-center/business-health` | `analytics.platform` |
| GET | `/admin/command-center/categories` | `analytics.platform` |
| GET | `/admin/command-center/geography` | `analytics.platform` |
| GET | `/admin/command-center/growth` | `analytics.platform` |
| GET | `/admin/command-center/health-overview` | `analytics.platform` |
| GET | `/admin/command-center/moderation` | `analytics.platform` |
| GET | `/admin/command-center/overview` | `analytics.platform` |
| GET | `/admin/command-center/search-intelligence` | `analytics.platform` |
| GET | `/admin/command-center/users` | `analytics.platform` |
| GET | `/admin/events` | `event.review` |
| GET | `/admin/reports` | `report.resolve` |
| GET | `/admin/reviews` | `review.moderate` |
| GET | `/admin/stats` | `analytics.platform` |
| GET | `/admin/users` | `user.pii.read` |
| GET | `/businesses` | public |
| GET | `/businesses/:id` | public |
| GET | `/businesses/:id/menu` | public |
| GET | `/businesses/:id/reviews` | public |
| GET | `/businesses/featured` | public |
| GET | `/businesses/promoted` | public |
| GET | `/categories` | public |
| GET | `/categories/:slug` | public |
| GET | `/categories/homepage` | public |
| GET | `/events` | public |
| GET | `/events/:slug` | public |
| GET | `/favorites` | authenticated |
| GET | `/geography/cities` | public |
| GET | `/geography/cities/:id` | public |
| GET | `/geography/districts` | public |
| GET | `/geography/districts/:id/cities` | public |
| GET | `/geography/regions` | public |
| GET | `/me/analytics/competitors` | `business.manage_own` |
| GET | `/me/analytics/demographics` | `business.manage_own` |
| GET | `/me/analytics/overview` | `business.manage_own` |
| GET | `/me/analytics/peak-hours` | `business.manage_own` |
| GET | `/me/analytics/search-terms` | `business.manage_own` |
| GET | `/me/analytics/traffic` | `business.manage_own` |
| GET | `/me/businesses` | `business.manage_own` |
| GET | `/me/businesses/:id` | `business.manage_own` |
| GET | `/me/businesses/:id/menu` | `business.manage_own` |
| GET | `/me/claims` | `business.claim` |
| GET | `/me/events` | `business.manage_own` |
| GET | `/me/health-score` | `business.manage_own` |
| GET | `/me/reviews` | `business.manage_own` |
| GET | `/me/stats` | `business.manage_own` |
| GET | `/reviews/:id` | public |
| GET | `/search` | public |
| GET | `/users/me` | authenticated |
| PATCH | `/admin/businesses/:id` | `business.edit_any` |
| PATCH | `/admin/businesses/:id/branch` | `business.edit_any` |
| PATCH | `/admin/businesses/:id/hide` | `business.hide` |
| PATCH | `/admin/businesses/:id/unhide` | `business.hide` |
| PATCH | `/admin/categories/:id` | `taxonomy.manage` |
| PATCH | `/admin/categories/reorder` | `taxonomy.manage` |
| PATCH | `/admin/cities/:id` | `taxonomy.manage` |
| PATCH | `/admin/districts/:id` | `taxonomy.manage` |
| PATCH | `/businesses/:id` | `business.manage_own` |
| PATCH | `/me/branches/:id` | `business.manage_own` |
| PATCH | `/me/businesses/:id` | `business.manage_own` |
| PATCH | `/me/events/:id` | `business.manage_own` |
| PATCH | `/menu/:id` | `business.manage_own` |
| PATCH | `/reviews/:id` | `review.write` |
| PATCH | `/reviews/:id/reply` | `business.manage_own` |
| PATCH | `/users/me` | authenticated |
| POST | `/admin/analytics/aggregate` | `analytics.platform` |
| POST | `/admin/businesses/:id/approve` | `business.review` |
| POST | `/admin/businesses/:id/promote` | `business.operate` |
| POST | `/admin/businesses/:id/reject` | `business.review` |
| POST | `/admin/businesses/:id/suspend` | `business.operate` |
| POST | `/admin/businesses/:id/unpromote` | `business.operate` |
| POST | `/admin/businesses/:id/unsuspend` | `business.operate` |
| POST | `/admin/businesses/:id/unverify` | `business.operate` |
| POST | `/admin/businesses/:id/verify` | `business.operate` |
| POST | `/admin/categories` | `taxonomy.manage` |
| POST | `/admin/claims/:id/approve` | `claim.review` |
| POST | `/admin/claims/:id/reject` | `claim.review` |
| POST | `/admin/events/:id/approve` | `event.review` |
| POST | `/admin/events/:id/reject` | `event.review` |
| POST | `/admin/health-scores/recalculate` | `analytics.platform` |
| POST | `/admin/reports/:id/resolve` | `report.resolve` |
| POST | `/admin/reviews/:id/hide` | `review.moderate` |
| POST | `/admin/reviews/:id/restore` | `review.moderate` |
| POST | `/admin/users/:id/activate` | `user.status.manage` |
| POST | `/admin/users/:id/suspend` | `user.status.manage` |
| POST | `/analytics/click` | public |
| POST | `/analytics/search` | public |
| POST | `/analytics/view` | public |
| POST | `/auth/forgot-password` | public |
| POST | `/auth/login` | public |
| POST | `/auth/logout` | authenticated |
| POST | `/auth/otp/request` | public |
| POST | `/auth/otp/verify` | public |
| POST | `/auth/refresh` | public |
| POST | `/auth/register` | public |
| POST | `/auth/reset-password` | public |
| POST | `/auth/verify-reset-code` | public |
| POST | `/businesses` | `business.create` |
| POST | `/businesses/:id/menu` | `business.manage_own` |
| POST | `/businesses/:id/reviews` | `review.write` |
| POST | `/events` | `business.manage_own` |
| POST | `/events/:slug/attend` | authenticated |
| POST | `/favorites` | authenticated |
| POST | `/me/businesses` | `business.create` |
| POST | `/me/businesses/:id/branches` | `business.manage_own` |
| POST | `/me/claims` | `business.claim` |
| POST | `/me/events` | `business.manage_own` |
| POST | `/me/health-score/recommendations/:id/complete` | `business.manage_own` |
| POST | `/me/reviews/:id/reply` | `business.manage_own` |
| POST | `/reviews` | `review.write` |
| POST | `/reviews/:id/reply` | `business.manage_own` |
| POST | `/reviews/:id/report` | `review.report` |
| POST | `/upload/image` | authenticated |
| PUT | `/admin/businesses/:id/hours` | `business.edit_any` |
| PUT | `/auth/profile` | authenticated |
| PUT | `/businesses/:id/hours` | `business.manage_own` |
