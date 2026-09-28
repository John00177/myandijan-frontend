# DATABASE — My Andijan

> Source of truth: `my-andijan-api/prisma/schema.prisma` (1193 lines) and `prisma/migrations/` (11 migrations). Documented 2026-09-28. **31 models, 19 enums.**

---

## 0. Global conventions

| Convention | Detail |
| --- | --- |
| Engine | PostgreSQL. Provider locked in `migrations/migration_lock.toml`. |
| **Portability constraint** | Schema header: *"PostgreSQL. Vanilla only — no proprietary extensions (data-localization portability requirement: DB must be relocatable to an Uzbek host)."* The only extension used is `pg_trgm` (standard contrib). **No PostGIS.** |
| Primary keys | `Int @id @default(autoincrement())` on **every** model. Rationale in the schema: *"matches existing auth module, JWT payload, guards, and seed script."* |
| Naming | `camelCase` in Prisma, `snake_case` in Postgres via `@map` / `@@map`. |
| Timestamps | `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` on most models. |
| Soft delete | Nullable `deletedAt` on `User`, `Category`, `Business`, `Branch`, `Product`, `Review`, `ReviewReply`, `Event` — each with its own index. **Enforcement is in the service layer, not the database.** |
| Localization | Taxonomy and geography entities carry `nameUz` / `nameRu` / `nameEn` (and sometimes description/action/impact triples). **`Business` and `Branch` do NOT** — they have a single `name`. This asymmetry is why the frontend has a normalisation layer. |
| Money | `Decimal(14,2)`, `currency String @default("UZS") @db.VarChar(3)`. |
| Coordinates | `lat Decimal(10,8)`, `lng Decimal(11,8)`, always nullable. |
| Ratings | `Decimal(3,2)`, default `0`. **Serialised as a string over JSON** — the frontend must `Number()`-coerce. |
| Phone | `VarChar(20)`, format `+998XXXXXXXXX`. |
| Day-of-week | **`0 = Monday … 6 = Sunday`.** NOT the JS `Date.getDay()` convention. |

---

## 1. Enums (19)

| Enum | Values |
| --- | --- |
| `UserRole` | `CUSTOMER`, `BUSINESS_OWNER`, `MODERATOR`, `SUPPORT`, `ADMIN`, `SUPER_ADMIN` |
| `UserStatus` | `ACTIVE`, `SUSPENDED`, `DELETED` |
| `Language` | `UZ`, `RU`, `EN` |
| `Gender` | `MALE`, `FEMALE` |
| `OtpPurpose` | `PHONE_VERIFY`, `PASSWORD_RESET`, `LOGIN` |
| `BusinessStatus` | `DRAFT`, `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`, `HIDDEN` |
| `ClaimStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `ReviewStatus` | `PENDING`, `PUBLISHED`, `REJECTED`, `HIDDEN` |
| `ReportStatus` | `PENDING`, `RESOLVED`, `DISMISSED` |
| `ReportReason` | `SPAM`, `OFFENSIVE`, `FAKE`, `IRRELEVANT`, `PERSONAL_INFO`, `OTHER` |
| `EventStatus` | `DRAFT`, `PENDING`, `PUBLISHED`, `REJECTED`, `CANCELLED`, `COMPLETED` |
| `EventType` | `CONFERENCE`, `SEMINAR`, `WORKSHOP`, `CONCERT`, `CEREMONY`, `PROMOTION`, `SPORTS`, `EXHIBITION`, `OTHER` |
| `AttendeeStatus` | `INTERESTED`, `GOING`, `ATTENDED`, `CANCELLED` |
| `ProductType` | `PRODUCT`, `SERVICE` |
| `ProductUnit` | `PCS`, `KG`, `G`, `L`, `ML`, `BOX`, `PACK`, `M`, `M2`, `HOUR`, `SESSION` |
| `AdStatus` | `DRAFT`, `PENDING`, `ACTIVE`, `PAUSED`, `EXPIRED`, `REJECTED` |
| `AdPlacement` | `HOMEPAGE_BANNER`, `SEARCH_RESULTS`, `CATEGORY_PAGE`, `BUSINESS_PROFILE`, `SIDEBAR` |
| `NotificationType` | `BUSINESS_APPROVED`, `BUSINESS_REJECTED`, `CLAIM_APPROVED`, `CLAIM_REJECTED`, `REVIEW_RECEIVED`, `REVIEW_REPLIED`, `EVENT_APPROVED`, `EVENT_REMINDER`, `AD_APPROVED`, `SYSTEM` |
| `AuditAction` | `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `SUSPEND`, `RESTORE`, `LOGIN`, `ROLE_CHANGE` |

---

## 2. Identity & access

### 2.1 `User` → `users`
**Purpose:** every human in the system, all six roles in one table.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `id` | Int | PK | autoincrement |
| `phone` | VarChar(20) | ✔ | **@unique**. `+998XXXXXXXXX` |
| `email` | VarChar(255) | ✗ | **@unique** |
| `passwordHash` | String | ✔ | bcrypt cost 12. OTP-created users get a hash of 48 random bytes — unusable for login. |
| `fullName` | VarChar(150) | ✔ | OTP-created users start with `''` |
| `avatarUrl` | VarChar(500) | ✗ | |
| `role` | `UserRole` | ✔ | default `CUSTOMER`. **SECURITY (schema comment): the public `/auth/register` endpoint MUST reject `role=ADMIN`. Admins are created via seed or promoted by an existing admin only.** |
| `status` | `UserStatus` | ✔ | default `ACTIVE`. Checked on **every** authenticated request by `JwtStrategy`. |
| `phoneVerified` / `emailVerified` | Boolean | ✔ | default `false` |
| `preferredLanguage` | `Language` | ✔ | default `UZ` |
| `notificationsEnabled` | Boolean | ✔ | default `true` |
| `marketingConsent` | Boolean | ✔ | default `false` |
| `marketingConsentAt` | DateTime | ✗ | Nullable **because it records WHEN consent was granted** — no value until `marketingConsent` flips true |
| `districtId` | Int | ✗ | FK → `District`, **SetNull**. Collected at registration so a profile can be pre-located before the user has any business. SetNull so retiring a district never cascades into deleting accounts. |
| `age` | Int | ✗ | Added 2026-08-15 (`add_profile_fields`) |
| `gender` | `Gender` | ✗ | Added 2026-08-15 |
| `avatarId` | VarChar(40) | ✗ | Added 2026-08-15 — preset avatar picker id |
| `lastLoginAt` | DateTime | ✗ | |
| `createdAt` / `updatedAt` / `deletedAt` | DateTime | ✔/✔/✗ | |

**Relations (13):** `district`, `refreshTokens`, `ownedBusinesses` (`BusinessOwner`), `reviews`, `reviewReplies`, `favorites`, `eventAttendances`, `notifications`, `auditLogs` (`AuditActor`), `branchPhotos` (`PhotoUploader`), `claimsSubmitted` / `claimsReviewed`, `reportsSubmitted` / `reportsResolved`, `businessesVerified` (`BusinessVerifier`).

**Indexes:** `role`, `status`, `deletedAt`, `districtId`.

### 2.2 `RefreshToken` → `refresh_tokens`
**Purpose:** rotating refresh tokens with revocation and device attribution.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `userId` | Int | ✔ | FK → `User`, **Cascade** |
| `tokenHash` | String | ✔ | **@unique** — the token itself is never stored |
| `expiresAt` | DateTime | ✔ | |
| `revokedAt` | DateTime | ✗ | enables explicit revocation |
| `userAgent` | VarChar(500) | ✗ | |
| `ipAddress` | VarChar(45) | ✗ | 45 chars = IPv6 |

**Indexes:** `userId`, `expiresAt`.
**Status note:** fully built and issued, but **the frontend never uses it** — see `CURRENT_STATE.md`.

### 2.3 `OtpCode` → `otp_codes`
**Purpose:** one-time codes for phone verification, password reset and OTP login.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `phone` | VarChar(20) | ✔ | **not** a FK — a code can be requested before a user exists |
| `codeHash` | String | ✔ | hashed, never plaintext |
| `purpose` | `OtpPurpose` | ✔ | |
| `attempts` | Int | ✔ | default `0`; max 5 enforced in service |
| `expiresAt` | DateTime | ✔ | 5-minute TTL |
| `usedAt` | DateTime | ✗ | single-use marker |

**Indexes:** `[phone, purpose]`, `expiresAt`.
**Decision:** the table's original comment says *"Built now, unused until Phase 2 (Eskiz SMS)"* — it is now **in active use** (2026-09-26). It was also chosen **over Redis**, which the spec requested: the table already provides TTL and attempt counting, so a dependency was avoided.

---

## 3. Geography — `Region` → `District` → `City`

All three share the same shape: `slug` (**@unique**), `nameUz/Ru/En` (VarChar 150, all required), `isActive` (default `true`), `sortOrder` (default `0`), nullable `lat`/`lng`, `createdAt`, `updatedAt`.

### 3.1 `Region` → `regions`
Relations: `districts[]`, `cities[]`. Index: `[isActive, sortOrder]`. Seeded with **Andijan Region**.

### 3.2 `District` → `districts`
Adds `regionId` (FK → `Region`, **Restrict**). Relations: `region`, `cities[]`, `branches[]`, `events[]`, `users[]`. Index: `[regionId, isActive, sortOrder]`. **14 districts seeded.**

### 3.3 `City` → `cities`
Adds:

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `regionId` | Int | ✔ | FK → `Region`, **Restrict** |
| `districtId` | Int | **✗** | FK → `District`, **SetNull**. `null` for region-level cities. |
| `isRegionLevel` | Boolean | ✔ | default `false` |

Relations: `region`, `district?`, `branches[]`. Indexes: `[regionId, isActive, sortOrder]`, `[districtId, isActive]`, `isRegionLevel`. **11 cities seeded.**

> **Business logic the schema explicitly models:** cities normally sit *inside* districts, **except** region-level cities (Andijan city), which report directly to the region — hence the nullable `districtId` plus the `isRegionLevel` flag. The schema also names the trap: *"Andijan CITY is not Andijon DISTRICT (whose seat is Kuyganyor). Users searching 'Andijan' almost always mean the city."*

---

## 4. Taxonomy

### 4.1 `Category` → `categories`
**Purpose:** self-referencing category tree for businesses, products and events.

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `parentId` | Int | ✗ | FK → `Category` (`CategoryTree`), **SetNull** |
| `slug` | VarChar(120) | ✔ | **@unique** |
| `nameUz` / `nameRu` / `nameEn` | VarChar(150) | ✔ | |
| `descriptionUz/Ru/En` | Text | ✗ | |
| `icon` | VarChar(60) | ✗ | **lucide icon name** |
| `colorHex` | VarChar(7) | ✗ | |
| `imageUrl` | VarChar(500) | ✗ | |
| `isActive` | Boolean | ✔ | default `true` |
| `showOnHomepage` | Boolean | ✔ | default `false` — drives `GET /categories/homepage` |
| `allowBusiness` | Boolean | ✔ | default `true`; column `allow_business_registration` |
| `sortOrder` | Int | ✔ | default `0`; reorderable via `PATCH /admin/categories/reorder` |
| `deletedAt` | DateTime | ✗ | soft delete |

Relations: `parent`, `children[]`, `businesses[]`, `products[]`, `events[]`.
Indexes: `[parentId, isActive, sortOrder]`, `[isActive, showOnHomepage]`, `deletedAt`.

### 4.2 `BusinessType` → `business_types`
**Purpose:** **capability rows, not hardcoded type branches.** The schema states this directly: *"this is what lets the inventory/booking/ordering modules attach in Phase 2 with no core migration."*

| Field | Default | Phase |
| --- | --- | --- |
| `catalogEnabled` | `false` | MVP |
| `eventsEnabled` | `true` | MVP |
| `advertisingEnabled` | `true` | MVP |
| `inventoryEnabled` | `false` | **Phase 2** |
| `warehouseEnabled` | `false` | **Phase 2** |
| `bookingEnabled` | `false` | **Phase 2** |
| `deliveryEnabled` | `false` | **Phase 2** |
| `orderingEnabled` | `false` | **Phase 2** |

Plus `slug` (**@unique**, VarChar 80), `nameUz/Ru/En`, `isActive`, `sortOrder`. Index: `[isActive, sortOrder]`.

---

## 5. Business & branch — the core

### 5.1 `Business` → `businesses`
**Purpose:** the canonical **brand** entity. The schema header is emphatic: *"(canonical brand entity — NO location data lives here)."*

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `ownerId` | Int | **✗** | FK → `User` (`BusinessOwner`), **SetNull**. `null` until claimed/approved. |
| `categoryId` | Int | ✔ | FK → `Category`, **Restrict** |
| `businessTypeId` | Int | ✔ | FK → `BusinessType`, **Restrict** |
| `slug` | VarChar(180) | ✔ | **@unique** — canonical URL `/business/:slug` |
| `name` | VarChar(200) | ✔ | **single column, NOT localized** |
| `description` | Text | ✗ | |
| `logoUrl`, `coverUrl`, `coverPhoto` | VarChar(500) | ✗ | **three image fields** — `coverUrl` and `coverPhoto` overlap; the frontend prefers `coverPhoto`, falling back to `coverUrl`. Cleanup candidate. |
| `hasDelivery` | Boolean | ✔ | default `false` |
| `deliveryFee` | Int | ✗ | |
| `deliveryTime` | VarChar(60) | ✗ | free text, e.g. "15-25 daq" |
| `website`, `email`, `telegram`, `instagram` | VarChar | ✗ | |
| `metaTitleUz/Ru/En` | VarChar(200) | ✗ | SEO override; falls back to generated |
| `metaDescriptionUz/Ru/En` | VarChar(400) | ✗ | SEO override |
| `status` | `BusinessStatus` | ✔ | default **`DRAFT`** |
| `isVerified` | Boolean | ✔ | default `false` |
| `verifiedAt` | DateTime | ✗ | |
| `verifiedById` | Int | ✗ | FK → `User` (`BusinessVerifier`), **SetNull** |
| `rejectionReason` | Text | ✗ | |
| `isPromoted` / `promotedUntil` | Boolean / DateTime | ✔/✗ | MVP promotion |
| `isFeatured` / `featuredUntil` | Boolean / DateTime | ✔/✗ | MVP promotion |
| `ratingAvg` | Decimal(3,2) | ✔ | default `0` — **denormalized across all branches** |
| `reviewCount`, `viewCount`, `favoriteCount` | Int | ✔ | default `0` — denormalized |
| `branchCount` | Int | ✔ | default **`1`** — denormalized |
| `deletedAt` | DateTime | ✗ | soft delete |

**Relations:** `owner?`, `verifiedBy?`, `category`, `businessType`, `branches[]`, `products[]`, `events[]`, `favorites[]`, `claims[]`, `advertisements[]`, `analytics[]`, `healthScore?` (1:1).

**Indexes (7):** `ownerId`, `[categoryId, status]`, `businessTypeId`, `[status, deletedAt]`, `[isPromoted, promotedUntil]`, `[isFeatured, featuredUntil]`, `ratingAvg`.

> **Removed by decision:** `claimedAt` / `claimedById`. Schema note: *"claim history now lives in business_claims. Ownership is expressed solely by ownerId, which is set when a claim is approved."*

> **Business logic:** all five aggregate counters are recalculated on write. There is no reconciliation job, so a missed write path silently drifts them.

### 5.2 `Branch` → `branches`
**Purpose:** *"the geographically-located unit — ALL location queries route here."*

| Field | Type | Req | Notes |
| --- | --- | --- | --- |
| `businessId` | Int | ✔ | FK → `Business`, **Cascade** |
| `districtId` | Int | **✔** | FK → `District`, **Restrict** — required |
| `cityId` | Int | ✗ | FK → `City`, **SetNull** — optional, more precise |
| `name` | VarChar(200) | ✔ | e.g. "Asaka filiali" |
| `slug` | VarChar(180) | ✔ | unique **per business**, not globally |
| `address` | VarChar(500) | ✔ | |
| `landmark` | VarChar(300) | ✗ | |
| `phone` | VarChar(20) | **✔** | |
| `phoneAlt` | VarChar(20) | ✗ | |
| `lat` / `lng` | Decimal | ✗ | |
| `isPrimary` | Boolean | ✔ | default `false` — several endpoints resolve "the business's branch" to the primary one |
| `isActive` | Boolean | ✔ | default `true` |
| `ratingAvg` / `reviewCount` | Decimal(3,2) / Int | ✔ | denormalized per branch |
| `deletedAt` | DateTime | ✗ | soft delete |

Relations: `business`, `district`, `city?`, `hours[]`, `photos[]`, `reviews[]`.
**Constraint:** `@@unique([businessId, slug])`.
**Indexes:** `[businessId, isActive]`, `[districtId, isActive]`, `[cityId, isActive]`, `[lat, lng]`, `deletedAt`.

### 5.3 `BranchHour` → `branch_hours`

| Field | Type | Notes |
| --- | --- | --- |
| `branchId` | Int | FK → `Branch`, **Cascade** |
| `dayOfWeek` | Int | **0 = Monday … 6 = Sunday** |
| `openTime` / `closeTime` | VarChar(5) | `"09:00"` — **strings, not time types** |
| `isClosed` | Boolean | default `false` |
| `is24Hours` | Boolean | default `false` |

**Constraint:** `@@unique([branchId, dayOfWeek])` — at most 7 rows per branch. Index: `branchId`.

### 5.4 `BranchPhoto` → `branch_photos`

| Field | Type | Notes |
| --- | --- | --- |
| `branchId` | Int | FK → `Branch`, **Cascade** |
| `uploadedById` | Int? | FK → `User` (`PhotoUploader`), **SetNull** |
| `url` | VarChar(500) | required |
| `thumbUrl` | VarChar(500)? | **nothing generates thumbnails today** |
| `publicId` | VarChar(255)? | commented `// Cloudinary` — **vestigial**; storage is Supabase |
| `caption` | VarChar(255)? | |
| `isPrimary` | Boolean | default `false` |
| `sortOrder` | Int | default `0` |

Indexes: `[branchId, sortOrder]`, `[branchId, isPrimary]`. Added in migration `20260818012501_add_photo_delivery`.

### 5.5 `BusinessClaim` → `business_claims`
**Purpose:** extracted out of `Business` because *"a business may be claimed, rejected, and re-claimed — that history is an entity, not two columns."*

| Field | Type | Notes |
| --- | --- | --- |
| `businessId` | Int | FK → `Business`, **Cascade** |
| `claimantId` | Int | FK → `User` (`ClaimClaimant`), **Cascade** |
| `status` | `ClaimStatus` | default `PENDING` |
| `evidence` | Text? | owner-supplied proof/notes |
| `contactPhone` | VarChar(20)? | captured at claim time; may differ from the profile |
| `contactNote` | Text? | |
| `reviewedById` | Int? | FK → `User` (`ClaimReviewer`), **SetNull** |
| `reviewedAt` | DateTime? | |
| `rejectionReason` | Text? | |

Indexes: `[businessId, status]`, `claimantId`, `[status, createdAt]`.

> **⚠ Unenforced invariant, stated in the schema:** *"'only one PENDING claim per business' cannot be expressed as a Prisma unique constraint (needs a partial index) — enforce in the service layer."* **This is a database-level gap that depends on application discipline.** A partial unique index (`CREATE UNIQUE INDEX … WHERE status = 'PENDING'`) could be added via raw SQL in a migration.

---

## 6. `Product` → `products`
**Purpose:** simple catalogue ("menu"). Inventory is Phase 2. **Business-scoped, not branch-scoped** — *"a menu belongs to the brand, not to one address."*

| Field | Type | Notes |
| --- | --- | --- |
| `businessId` | Int | FK → `Business`, **Cascade** |
| `categoryId` | Int? | FK → `Category`, **SetNull** |
| `type` | `ProductType` | default `PRODUCT` |
| `name` | VarChar(200) | |
| `slug` | VarChar(180) | unique per business |
| `description` | Text? | |
| `imageUrl` | VarChar(500)? | |
| `price` | Decimal(14,2)? | |
| `priceMax` | Decimal(14,2)? | for ranges |
| `currency` | VarChar(3) | default `"UZS"` |
| `unit` | `ProductUnit` | default `PCS` |
| `isAvailable` / `isActive` | Boolean | default `true` |
| `sortOrder` | Int | default `0` |
| `deletedAt` | DateTime? | soft delete |

**Constraint:** `@@unique([businessId, slug])`. Indexes: `[businessId, isActive, sortOrder]`, `categoryId`, `deletedAt`.
Also indexed for search: `products_search_doc_idx`, `products_name_trgm_idx`.

> **Naming note:** the API exposes this as "menu" (`/businesses/:id/menu`, `/menu/:id`) — there is no separate `MenuItem` model.

---

## 7. Reviews

### 7.1 `Review` → `reviews`
**Branch-scoped** — *"service quality is location-specific."*

| Field | Type | Notes |
| --- | --- | --- |
| `branchId` | Int | FK → `Branch`, **Cascade** |
| `userId` | Int | FK → `User`, **Cascade** |
| `rating` | Int | **no DB-level range constraint** — 1–5 must be enforced by the DTO |
| `title` | VarChar(200)? | |
| `comment` | Text | **required** |
| `photos` | `String[]` | default `[]` — Postgres `text[]`, added 2026-08-23 |
| `status` | `ReviewStatus` | default **`PUBLISHED`** — reviews go live unmoderated |
| `moderationNote` | Text? | |
| `helpfulCount` / `reportCount` | Int | default `0` |
| `deletedAt` | DateTime? | soft delete |

**Constraint:** `@@unique([branchId, userId])` — *"One review per user per branch — primary anti-spam control."*
Indexes: `[branchId, status, createdAt]`, `userId`, `[status, createdAt]`.
Relations: `branch`, `user`, `reply?` (1:1), `reports[]`.

### 7.2 `ReviewReply` → `review_replies`
`reviewId` is **`@unique`** → one reply per review. `authorId` → `User` (business owner), **Cascade**. `body Text`, soft delete. Index: `authorId`.

### 7.3 `ReviewReport` → `review_reports`
`reviewId` (Cascade), `reporterId` (`ReportReporter`, Cascade), `reason ReportReason`, `note Text?`, `status ReportStatus` default `PENDING`, `resolvedById?` (`ReportResolver`, SetNull), `resolvedAt?`, `resolutionNote Text?`.

**Constraint:** `@@unique([reviewId, reporterId])` — *"One report per user per review — prevents report-spam brigading."*
Indexes: `[status, createdAt]`, `reviewId`.

---

## 8. `Favorite` → `favorites`
**Business-scoped** — *"users favorite the brand, not an address."*

`userId` (Cascade), `businessId` (Cascade), `createdAt`.
**Constraint:** `@@unique([userId, businessId])`. Indexes: `[userId, createdAt]`, `businessId`.

---

## 9. Events

### 9.1 `Event` → `events`

| Field | Type | Notes |
| --- | --- | --- |
| `businessId` | Int | FK → `Business`, **Cascade** — **every event belongs to a business** |
| `districtId` | Int | FK → `District`, **Restrict** — required |
| `categoryId` | Int? | FK → `Category`, **SetNull** |
| `slug` | VarChar(180) | **@unique** — events are addressed by slug |
| `title` | VarChar(250) | |
| `description` | Text | required |
| `type` | `EventType` | default `OTHER` |
| `coverUrl` | VarChar(500)? | |
| `startAt` / `endAt` | DateTime | both required |
| `timezone` | VarChar(60) | default **`"Asia/Tashkent"`** |
| `venueName` | VarChar(250)? | |
| `address` | VarChar(500)? | |
| `lat` / `lng` | Decimal? | events carry their own coordinates, independent of `Branch` |
| `price` | Decimal(14,2)? | |
| `currency` | VarChar(3) | default `"UZS"` |
| `isFree` | Boolean | default **`true`** |
| `maxAttendees` | Int? | |
| `registrationUrl` | VarChar(500)? | external registration |
| `allowRsvp` | Boolean | default `true` |
| `status` | `EventStatus` | default `DRAFT` |
| `rejectionReason` | Text? | |
| `publishedAt` | DateTime? | |
| `viewCount` / `attendeeCount` | Int | default `0` — denormalized |
| `deletedAt` | DateTime? | soft delete |

Indexes: `[businessId, status]`, `[districtId, status, startAt]`, `[status, startAt]`, `deletedAt`.

> **No DB constraint that `endAt > startAt`**, and no constraint tying `isFree` to `price`. Both must be enforced in DTOs.

### 9.2 `EventAttendee` → `event_attendees`
`eventId` (Cascade), `userId` (Cascade), `status AttendeeStatus` default `INTERESTED`.
**Constraint:** `@@unique([eventId, userId])`. Indexes: `[eventId, status]`, `userId`.
**Status:** endpoint exists (`POST /events/:slug/attend`); **no frontend UI calls it.**

---

## 10. `Advertisement` → `advertisements`
**Status: DEFERRED TO PHASE 2.** Schema comment: *"ships with Click payments. Table retained so the module attaches without a core migration. MVP promotion is handled by Business.isPromoted / isFeatured."*

Fields: `businessId` (Cascade), `title`, `description?`, `imageUrl` (required), `ctaText?`, `ctaUrl?`, `placement AdPlacement`, `status AdStatus` default `DRAFT`, `startDate`, `endDate`, `targetDistrictId?`, `targetCategoryId?`, `priceUzs Decimal(14,2)?`, `paymentStatus VarChar(20)` default `"UNPAID"`, `impressions Int`, `clicks Int`, `approvedById?`, `approvedAt?`, `rejectionReason?`.

Indexes: `[businessId, status]`, `[status, placement, startDate, endDate]`.

> `targetDistrictId` and `targetCategoryId` are **plain integers with no FK** — consistent with the module being unbuilt. **No controller, service or module exists.** Nothing reads or writes this table.

---

## 11. `Notification` → `notifications`
In-app only for MVP; SMS/Telegram channels are Phase 2.

`userId` (Cascade), `type NotificationType`, `title VarChar(200)`, `body Text`, `link VarChar(500)?`, `entityType VarChar(60)?`, `entityId Int?`, `isRead Boolean` default `false`, `readAt?`.
Index: `[userId, isRead, createdAt]`.

> **No notifications module, no endpoints, and nothing writes to this table.** It is fully unused.

---

## 12. `AuditLog` → `audit_logs`
*"every sensitive admin action — cheap now, unbackfillable later."*

`actorId Int?` (FK → `User` `AuditActor`, **SetNull** — so deleting a user preserves the trail), `action AuditAction`, `entityType VarChar(60)`, `entityId Int?`, `before Json?`, `after Json?`, `note Text?`, `ipAddress VarChar(45)?`, `userAgent VarChar(500)?`.

Indexes: `[entityType, entityId]`, `[actorId, createdAt]`, `createdAt`.
Read via `GET /admin/audit`. **Deliberately distinct from `ActivityLog`** — this is privileged-action accountability; that is end-user product analytics.

---

## 13. `PlatformSetting` → `platform_settings`
`key VarChar(120)` **@unique**, `value Json`, `description Text?`, `isPublic Boolean` default `false`, `updatedById Int?` (**plain int, no FK**).

> **No module reads or writes this table.** It is what `AdminSettingsView` should persist to — that view currently holds its state in `useState` and discards it.

---

## 14. Analytics

### 14.1 `BusinessAnalytics` → `business_analytics`
**Date-grain: one row per business per day.**

`businessId` (FK → `Business`, **no onDelete specified** → Prisma default `Restrict`), `date @db.Date`, then counters: `pageViews`, `callClicks`, `directionClicks`, `favoriteClicks`, `shareClicks`, `websiteClicks` (all Int default 0), plus `searchQueries String[]` (top terms that led here) and `visitorCities Int[]` (anonymized city IDs).

**Constraint:** `@@unique([businessId, date])`. Indexes: `businessId`, `date`.

> Schema note worth preserving: *"the businessId FK is intentionally NOT @unique on its own — only the compound @@unique([businessId, date]) is, since one-row-per-business-EVER would contradict the whole point of a daily table. (An earlier draft had this backwards; fixed here.)"*
> Arrays are plain Postgres `text[]` / `integer[]` — vanilla, no extension — appended via Prisma's `push`.
> **⚠ This table receives no data from the web app** — the frontend never calls `POST /analytics/*`.

### 14.2 `SearchQueryLog` → `search_query_logs` — **DEPRECATED**
Schema comment: *"superseded by SearchAnalytics, which is a strict superset (adds clickCount). Nothing writes here anymore; existing rows were backfilled into search_analytics. Kept only so the migration is non-destructive — safe to drop once you've confirmed the backfill."*

Fields: `query`, `businessId?`, `categoryId?`, `districtId?`, `cityId?`, `resultCount`. Indexes: `query`, `businessId`, `createdAt`.
**Action:** verify the backfill, then drop.

---

## 15. Platform command centre

Three tables, **deliberately without foreign keys.** Schema rationale: *"they are high-volume, write-heavy append-only logs. Skipping FK constraints avoids a constraint check on every insert and means they never block deleting a business or user. Orphaned references are acceptable (and expected) in anonymized historical logs."*

### 15.1 `PlatformMetric` → `platform_metrics`
`metricType String`, `date @db.Date`, `value Int`, `metadata Json?`.
**Constraint:** `@@unique([metricType, date])`. Index: `[metricType, date]`.

Known `metricType` values (from the schema comment): `DAILY_ACTIVE_USERS`, `NEW_SIGNUPS`, `NEW_BUSINESSES`, `REVIEWS_POSTED`, `SEARCH_QUERIES`, `PAGE_VIEWS`, `REVENUE_ESTIMATE`.

> **Important constraint noted in the schema:** *"@@unique([metricType, date]) makes each metric global-per-day, so `metadata` cannot hold per-district/per-category breakdowns as separate rows. It carries supporting detail for the single global figure only."*
> Populated by `POST /admin/analytics/aggregate`. **Nothing schedules that call.**

### 15.2 `SearchAnalytics` → `search_analytics`
Canonical search log. `query String`, `resultCount Int`, `clickCount Int` default 0, `businessId?`, `districtId?`, `categoryId?`, `cityId?`. Indexes: `query`, `createdAt`.
`cityId` was carried over from the deprecated `SearchQueryLog` so switching tables lost no geographic signal.

### 15.3 `ActivityLog` → `activity_logs`
Raw user-action stream. `actionType String`, `userId Int?`, `businessId Int?`, `metadata Json?`. Indexes: `[actionType, createdAt]`, `businessId`, `userId`.

Known `actionType` values: `BUSINESS_VIEWED`, `SEARCH_PERFORMED`, `CALL_CLICKED`, `DIRECTION_CLICKED`, `FAVORITE_ADDED`, `REVIEW_POSTED`, `CLAIM_SUBMITTED`.

> **PRIVACY (schema comment): `metadata` stores an `ipHash`, never a raw IP address.** Example shape: `{ ipHash: "abc123", cityId: 1, deviceType: "mobile" }`. Preserve this when extending.

---

## 16. Business health score

### 16.1 `BusinessHealthScore` → `business_health_scores`
A denormalized scorecard, **one row per business**, recomputed on write — *"deliberately NOT a cron job."* Both the owner dashboard and the founder health-overview read this single indexed row instead of re-deriving a dozen aggregates per business per request.

`businessId Int @unique` (FK → `Business`, **Cascade**), `overallScore`, `profileScore`, `engagementScore`, `visibilityScore`, `responseScore` (all Int), `createdAt`, `lastCalculatedAt` (`@updatedAt`).

**Index:** `overallScore` — *"Sorting the platform-wide 'who needs help' list is the hot read path."*

> The four sub-scores are each 0–100 and independently meaningful. `overallScore` is a weighted blend, and **the weights live in `HealthScoreService`, not in the schema, so they can be tuned without a migration.**

### 16.2 `BusinessRecommendation` → `business_recommendations`
One actionable instruction for an owner, generated from a specific detected gap.

| Field | Type | Notes |
| --- | --- | --- |
| `healthScoreId` | Int | FK → `BusinessHealthScore`, **Cascade** |
| **`code`** | VarChar(60) | **Stable rule identifier** (e.g. `PROFILE_COVER_PHOTO`) |
| `type` | VarChar(20) | `PROFILE` / `ENGAGEMENT` / `VISIBILITY` / `RESPONSE` — **string, not an enum** |
| `priority` | VarChar(10) | `HIGH` / `MEDIUM` / `LOW` — **string, not an enum** |
| `titleUz/Ru/En` | VarChar(200) | all required |
| `descriptionUz/Ru/En` | Text | all required |
| `actionTextUz/Ru/En` | VarChar(120) | button label, all required |
| `actionUrl` | VarChar(500)? | deep link to the edit page |
| `impactUz/Ru/En` | VarChar(120) | nudge copy, e.g. "+40% ko'rishlar" |
| `isCompleted` | Boolean | default `false` |
| `completedAt` | DateTime? | |

**Constraint:** `@@unique([healthScoreId, code])` — *"One row per rule per business — makes recalculation an idempotent upsert."* Index: `[healthScoreId, isCompleted]`.

Three design notes the schema records, all worth keeping:

1. **Why `code` exists** (it was not in the original spec): *"without a stable key, recalculation cannot distinguish 'the same recommendation as last time' from 'a new one', so it would either duplicate rows on every write or reset isCompleted. Titles are display copy and will be edited, so they cannot serve as the key."*
2. **Row ownership:** *"a gap that closes deletes its row, a gap that persists keeps the existing row untouched (which is what preserves the owner's isCompleted flag across recalculations)."*
3. **`impact*` honesty:** *"These are directional estimates chosen by the product, NOT measured lift — there is no experiment framework yet."*

---

## 17. Migrations (11, all in `prisma/migrations/`)

| Order | Migration | Size | What it does |
| --- | --- | --- | --- |
| 1 | `20260810152434_init` | 155 DDL / 867 lines | Entire base schema |
| 2 | `20260810160018_add_search_fts_trgm` | 9 DDL / 131 lines | `pg_trgm`; functions `search_normalize`, `business_search_doc`, `product_search_doc`, `search_tsquery`; 4 search indexes |
| 3 | `20260811012749_add_marketing_consent` | 1 DDL | `users.marketing_consent*` |
| 4 | `20260811015642_add_analytics` | 9 DDL | `business_analytics`, `search_query_logs` |
| 5 | `20260811021132_add_command_center` | 10 DDL | `platform_metrics`, `search_analytics`, `activity_logs` |
| 6 | `20260811083122_add_business_health_score` | 8 DDL | `business_health_scores`, `business_recommendations` |
| 7 | `20260814053136_add_user_district` | 3 DDL | `users.district_id` + FK + index |
| 8 | `20260815101125_final_roles` | 4 DDL | Final `UserRole` enum shape |
| 9 | `20260815150053_add_profile_fields` | 2 DDL | `users.age`, `gender`, `avatar_id` |
| 10 | `20260818012501_add_photo_delivery` | 1 DDL | `branch_photos` / delivery fields |
| 11 | `20260823062534_add_review_photos` | 1 DDL | `reviews.photos text[]` |

**All 11 are additive.** No destructive migration exists.

**Production migration state:** Railway's start command is `npx prisma migrate deploy && npm run start:prod`. Because it is `&&`-chained, **a running production API proves every prior migration applied cleanly** — which is how migration state was reasoned about without direct DB access.

---

## 18. Seed data & scripts

### `prisma/seed.ts` (323 lines) — `npm run db:seed`
Seeds the Andijan geography and taxonomy. Explicitly documented in the file:

> *"14 tumans (districts) + 1 city of regional subordination (Andijon shahri, seeded separately below as the region-level City 'Andijon') = 15 administrative-territorial units total in the region. 'Andijon shahri' is NOT a tuman — Andijon tumani (admin center: Kuyganyor) is the real 14th one."*

Includes a `slugify()` that strips Uzbek apostrophe variants (`'`, `’`, `ʻ`, `ʼ`, `` ` ``). Also creates the seed admin from `SEED_ADMIN_PHONE` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_EMAIL`.

### `prisma/demo-data.ts` (324 lines)
Demo/sample content. Not wired into the `prisma.seed` key — run manually.

### `scripts/`
| Script | Purpose | Risk |
| --- | --- | --- |
| `cleanup-db.ts` | Database cleanup | **Destructive — read it before running** |
| `promote-super-admin.ts` | Promote a user to `SUPER_ADMIN` | Privileged |
| `rename-andijon-district.js` | One-off data fix for the Andijon district/city naming trap | Safe |
| `seed-role-accounts.js` | Creates/updates one demo account per role tier | **⚠ Contains `PLAIN_PASSWORD = '<REDACTED>'` in plaintext, applied to `SUPER_ADMIN` (+998994796431), `ADMIN`, `MODERATOR`, `SUPPORT`, `BUSINESS_OWNER`, `CUSTOMER`, and prints it to stdout. Header documents running it against production via `railway ssh`. MUST be rotated and parameterized.** |

---

## 19. Current database provider

| Environment | Provider |
| --- | --- |
| Local | Docker `postgres:16` — `andijan` / `my_andijan` on 5432 (`docker-compose.yml`) |
| Production | Railway-managed PostgreSQL, via `DATABASE_URL`. Exact engine version **UNKNOWN** from the repo. |
| Migration runner | `prisma migrate deploy` on every Railway boot |

**Live content volume (probed 2026-09-28):** 4 businesses, 0 featured, 0 events, categories and regions seeded. Effectively pre-launch.

---

## 20. Known schema problems

| # | Severity | Problem |
| --- | --- | --- |
| 1 | Medium | **`BusinessClaim` "one PENDING claim per business" is not enforced by the database.** Needs a partial unique index; currently service-layer only. |
| 2 | Medium | **`Review.rating` has no range constraint.** Nothing at the DB level prevents `rating = 99`. |
| 3 | Medium | **`Event` has no `endAt > startAt` check**, and no constraint linking `isFree` to `price`. |
| 4 | Medium | **Three overlapping cover-image fields on `Business`**: `logoUrl`, `coverUrl`, `coverPhoto`. `coverUrl` and `coverPhoto` duplicate each other and the frontend has to fall back between them. |
| 5 | Low–Med | **Denormalized counters have no reconciliation job.** `ratingAvg`, `reviewCount`, `branchCount`, `viewCount`, `favoriteCount` on `Business`, plus the `Branch` pair, drift silently if any write path misses an update. |
| 6 | Low | **`SearchQueryLog` is dead** but still present. Drop after confirming the backfill. |
| 7 | Low | **`BusinessRecommendation.type` and `.priority` are `VarChar`, not enums** — no DB-level validation of `PROFILE|ENGAGEMENT|VISIBILITY|RESPONSE` or `HIGH|MEDIUM|LOW`. |
| 8 | Low | **`PlatformMetric.metricType` and `ActivityLog.actionType` are free strings** with their valid values only in comments. A typo creates a silent new metric. |
| 9 | Low | **`PlatformSetting.updatedById` and `Advertisement.targetDistrictId`/`targetCategoryId` are integers with no FK.** |
| 10 | Low | **Three tables are entirely unused by any code**: `Notification`, `PlatformSetting`, `Advertisement`. (`EventAttendee` has an endpoint but no UI.) |
| 11 | Low | **`BranchPhoto.thumbUrl` is never populated** — no thumbnailing exists. `publicId` is a vestigial Cloudinary field. |
| 12 | Low | **`BranchHour.openTime`/`closeTime` are `VarChar(5)` strings**, so "09:00" vs "9:00" is not prevented and time comparison is lexical. |
| 13 | Informational | **`BusinessAnalytics.businessId` FK omits `onDelete`**, so it defaults to `Restrict` — deleting a business with analytics rows will fail, unlike the deliberately FK-free command-centre logs. Possibly unintended asymmetry. |
