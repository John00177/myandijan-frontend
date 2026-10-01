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
| PATCH | `/businesses/:id` | 🔒 `BUSINESS_OWNER` | Update — the one general-purpose path `EditBusinessModal` saves through, from either owner or admin context | ✅ |
| PUT | `/businesses/:id/hours` | 🔒 `BUSINESS_OWNER` | Replace the **primary branch's** 7-day hours wholesale | ✅ |
| GET | `/businesses/featured` | — | `isFeatured` businesses | ✅ |
| GET | `/businesses/promoted` | — | `isPromoted` businesses | **⭕** |
| GET | `/businesses` | — | **List + filter + paginate** (name `contains`, no ranking) — used for category/district-only browsing | ✅ |
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

## 7. Reviews — `/reviews` (6 routes)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| POST | `/reviews` | 🔒 | Create a review (branch-scoped) | **⭕** |
| GET | `/reviews/:id` | — | One review | **⭕** |
| PATCH | `/reviews/:id` | 🔒 | Edit own review | **⭕** |
| DELETE | `/reviews/:id` | 🔒 | Delete own review | **⭕** |
| POST | `/reviews/:id/reply` | 🔒 `BUSINESS_OWNER` | Create an owner reply | **⭕** |
| PATCH | `/reviews/:id/reply` | 🔒 `BUSINESS_OWNER` | Edit an owner reply | ✅ |

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
| GET | `/me/businesses/:id/menu` | 🔒 `BUSINESS_OWNER`+ | **Owner** catalog: all non-deleted items incl. deactivated, any business status | ✅ `InventoryView` |
| POST | `/businesses/:id/menu` | 🔒 `BUSINESS_OWNER`+ | Create an item | ✅ |
| PATCH | `/menu/:id` | 🔒 `BUSINESS_OWNER`+ | Update an item (partial) | ✅ |
| DELETE | `/menu/:id` | 🔒 `BUSINESS_OWNER`+ | Soft-delete an item (`deletedAt`) | ✅ |

**Authorization (two layers).** `RolesGuard` is a role *floor*; the real boundary is `ProductsService.assertCanManage`: caller must be the business's `ownerId` **or** `MODERATOR`/`ADMIN`/`SUPER_ADMIN`. A `BUSINESS_OWNER` touching another owner's business/item gets **403**; an unknown or soft-deleted business/item gets **404**; anonymous gets **401**. `SUPPORT` passes the role floor (hierarchy quirk, CURRENT_STATE bug #9) but is rejected with 403 by the service check.

**Public list behaviour (changed Phase 10).** `GET /businesses/:id/menu` now 404s for any business that is not `APPROVED` (DRAFT/PENDING/REJECTED/SUSPENDED/HIDDEN), matching `GET /businesses/:id`. Before Phase 10 it served the catalog of unpublished businesses. Items filtered: `isActive = true`, `deletedAt IS NULL`; ordered `sortOrder, createdAt`.

**`POST` body (`CreateMenuItemDto`):** `name` (required, ≤200 chars), `price` (required, **integer** so'm ≥ 0), `description?`, `photo?` (URL ≤500 chars — stored as `imageUrl`), `type?` (`PRODUCT` \| `SERVICE`, **Phase 10**; DB default `PRODUCT`), `categoryId?` (**Phase 10**; must reference a non-deleted category, else 404). The slug is server-generated and unique per business (`osh`, `osh-2`, …).

**`PATCH` body (`UpdateMenuItemDto`):** every create field optional, plus `isAvailable?` (soft "sold out" flag, item stays listed) and `isActive?` (**Phase 10** — the publish switch; `false` hides the item from the public catalog, from `GET /businesses/:id`, and from product full-text search). Absent fields are left untouched. Unknown fields (e.g. `businessId`, `ownerId`) are rejected with 400 by the global `forbidNonWhitelisted` ValidationPipe, so an item cannot be moved to another business.

Not editable through this API (no columns or deliberately server-owned): SKU, stock quantity (do not exist — D-61), `slug`, `sortOrder`, `priceMax`, `currency`, `unit`.

---

## 10. Events — `/events` (4 routes)

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/events` | — | Paginated list | ✅ |
| POST | `/events` | 🔒 `BUSINESS_OWNER` | Create an event | **⭕** |
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

**`POST /me/claims` (`CreateClaimDto`) — added Phase 9.** Any authenticated user (class-level `JwtAuthGuard`; no role floor — a claim is how an unverified representative first establishes a relationship to a listing). Body: `businessId` (int, required), `evidence?` (≤2000), `contactPhone?` (≤20), `contactNote?` (≤1000). Response: the new `BusinessClaim` (`status: "PENDING"`) with `business: {id, slug, name}`.

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
| POST | `/analytics/view` | — | Record a business view (`RecordViewDto`) | **⭕** |
| POST | `/analytics/click` | — | Record a click (`RecordClickDto`) | **⭕** |
| POST | `/analytics/search` | — | Record a search (`RecordSearchDto`) | **⭕** |

> **⚠ The single most consequential gap in the API surface.** These three are the only writers for `BusinessAnalytics`, `SearchAnalytics` and `ActivityLog`, and **the frontend calls none of them.** Every owner and admin analytics screen therefore reads from tables nothing populates. Wiring these is a small change with large downstream effect.
> They are also **unauthenticated and unthrottled** — see `SECURITY.md`.

### 13.2 Owner-facing reports (🔒)

| Method | Path | Purpose | FE |
| --- | --- | --- | --- |
| GET | `/me/analytics/overview` | Summary | **⭕** |
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

## 15. Admin — `/admin` (34 routes; +3 in Phase 11)

Class-level 🔒 `JwtAuthGuard, RolesGuard` + `@Roles(ADMIN)`, with per-route overrides in **both** directions. Every business operation below is pinned by `business-ops.authorization.spec.ts` (real decorator metadata, every role). All return `401` anonymous, `403` below the floor, `404` unknown/soft-deleted business, `409` when the business isn't in the state the operation needs.

| Method | Path | Auth | Purpose | FE |
| --- | --- | --- | --- | --- |
| GET | `/admin/stats` | `ADMIN` | Platform stats | ✅ |
| GET | `/admin/businesses` | `ADMIN` | List businesses (paginated; `?status=` any `BusinessStatus`, `?district=`, `?search=`) | ✅ (status filter server-side since Phase 11) |
| POST | `/admin/businesses/:id/approve` | **`MODERATOR`** ↓ | Approve | ✅ |
| POST | `/admin/businesses/:id/reject` | **`MODERATOR`** ↓ | Reject — body `{ reason }` **required** (`@IsNotEmpty`) | ✅ |
| PATCH | `/admin/businesses/:id/hide` | **`SUPER_ADMIN`** ↑ | Hide (any status → `HIDDEN`). **No unhide route** — the prior status isn't stored, so restoring needs a product decision (deferred, D-63) | **⭕** (deferred) |
| PATCH | `/admin/businesses/:id` | `ADMIN` | Edit `name`/`description`/`categoryId` | ✅ |
| PATCH | `/admin/businesses/:id/branch` | `ADMIN` | Edit the **primary** branch's `phone`/`address`/`districtId` | ✅ |
| POST | `/admin/businesses/:id/verify` | `ADMIN` | Set `isVerified` (+ `verifiedAt`/`verifiedById`). `409` if already verified | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/unverify` | `ADMIN` | **New Phase 11.** Clear `isVerified` only (`verifiedAt`/`verifiedById` kept — they double as the approval record). `409` if not verified | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/suspend` | `ADMIN` | `APPROVED` → `SUSPENDED`, body `{ reason }` required (stored in `rejectionReason`). **Phase 11: `409` unless currently `APPROVED`** (previously any status); compare-and-set update | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/unsuspend` | `ADMIN` | **New Phase 11.** `SUSPENDED` → `APPROVED`, clears `rejectionReason`. `409` unless currently `SUSPENDED`; compare-and-set. Cannot approve a PENDING or restore a HIDDEN listing | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/promote` | `ADMIN` | `isPromoted = true`, `promotedUntil = until` (body `{ until }` ISO date, must be future → else `400`). Sets **promotion only** — `isFeatured` has no admin endpoint | ✅ **(Phase 11)** |
| POST | `/admin/businesses/:id/unpromote` | `ADMIN` | **New Phase 11.** End a promotion early: `isPromoted = false`, `promotedUntil = null`. Allowed for an already-expired promotion. `409` if not promoted | ✅ **(Phase 11)** |
| GET | `/admin/claims` | `ADMIN` | List claims (paginated, `?status=PENDING\|APPROVED\|REJECTED`); each row includes evidence, contact, claimant and business — there is no separate detail endpoint | ✅ **(Phase 9)** |
| POST | `/admin/claims/:id/approve` | `ADMIN` | Approve → atomically sets `Business.ownerId` (only if still null), promotes a `CUSTOMER` claimant to `BUSINESS_OWNER`, auto-rejects other pending claims on that business. `404` unknown claim, `409` already reviewed / business already owned / lost a concurrent race | ✅ **(Phase 9)** |
| POST | `/admin/claims/:id/reject` | `ADMIN` | Reject with required `reason`; never touches ownership or roles. `409` if already reviewed | ✅ **(Phase 9)** |
| GET | `/admin/reports` | `ADMIN` | List **review** reports (`ReviewReport`; no business-report model exists). **Always empty today: no endpoint creates a report** | **⭕** (deferred) |
| POST | `/admin/reports/:id/resolve` | `ADMIN` | Body `{ action: HIDE_REVIEW \| DISMISS, note? }`. `HIDE_REVIEW` → report `RESOLVED` + review hidden + aggregates recalculated; `DISMISS` → report **`DISMISSED`** (Phase 11 fix — was stored as `RESOLVED`). `409` if already handled | **⭕** (deferred) |
| GET | `/admin/reviews` | `ADMIN` | List reviews, paginated, optional `?status=` filter — **added Phase 6 (2026-09-29)** | ✅ |
| POST | `/admin/reviews/:id/hide` | `ADMIN` | Hide a review | ✅ |
| POST | `/admin/reviews/:id/restore` | `ADMIN` | Restore a review | ✅ |
| GET | `/admin/events` | `ADMIN` | List events | ✅ |
| POST | `/admin/events/:id/approve` | `ADMIN` | Approve | **⭕** |
| POST | `/admin/events/:id/reject` | `ADMIN` | Reject | **⭕** |
| GET | `/admin/categories` | `ADMIN` | List | ✅ |
| POST | `/admin/categories` | `ADMIN` | Create | ✅ |
| PATCH | `/admin/categories/reorder` | `ADMIN` | Bulk `sortOrder` | **⭕** |
| PATCH | `/admin/categories/:id` | `ADMIN` | Update | ✅ |
| DELETE | `/admin/categories/:id` | `ADMIN` | Soft delete | **⭕** |
| PATCH | `/admin/districts/:id` | `ADMIN` | Edit a district | **⭕** |
| PATCH | `/admin/cities/:id` | `ADMIN` | Edit a city | **⭕** |
| GET | `/admin/users` | `ADMIN` | List users | ✅ |
| POST | `/admin/users/:id/suspend` | `ADMIN` | Suspend | **⭕** |
| POST | `/admin/users/:id/activate` | `ADMIN` | Reactivate | **⭕** |
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
