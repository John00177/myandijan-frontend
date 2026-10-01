# ARCHITECTURE — My Andijan

> Describes the architecture **as it actually exists** on 2026-09-28. Versions are taken from the two `package.json` files and are exact. Anything not verifiable is marked **UNKNOWN**.

---

## 1. System shape

```
                    ┌─────────────────────────────────────┐
                    │  Browser (mobile-first, dark theme) │
                    └──────────────┬──────────────────────┘
                                   │ HTTPS, JSON + multipart
                                   │ Bearer <access token from localStorage>
                    ┌──────────────▼──────────────────────┐
   myandijan.uz  →  │  React 19 SPA (Vite 8 build)        │
   (Vercel)         │  SPA catch-all rewrite → index.html │
                    └──────────────┬──────────────────────┘
                                   │
   myandijan-api-production        │
   .up.railway.app  ──────────────▼──────────────────────┐
   (Railway)        │  NestJS 10 monolith, 17 modules    │
                    │  Global ValidationPipe, open CORS  │
                    │  Swagger at /docs (public)         │
                    └───┬──────────────┬─────────────────┘
                        │              │
              Prisma 5.22             │ @supabase/supabase-js
                        │              │ (service_role key)
            ┌───────────▼──────┐   ┌───▼─────────────────────┐
            │ PostgreSQL       │   │ Supabase Storage        │
            │ (Railway)        │   │ bucket "myandijan-images"│
            │ + pg_trgm        │   └─────────────────────────┘
            └──────────────────┘
                        ▲
                        │ (unconfigured)
            ┌───────────┴──────┐
            │ Eskiz.uz SMS     │  ← ESKIZ_* env vars NOT set
            └──────────────────┘
```

**Two separate repositories, no monorepo tooling, no shared type package.**

| Repo | Path | Role |
| --- | --- | --- |
| `myandijan-frontend` | `C:\Users\JKT443\Desktop\myandijan-frontend` | React SPA |
| `my-andijan-api` | `C:\Users\JKT443\Desktop\my-andijan-api` | NestJS REST API |

---

## 2. Frontend architecture

### 2.1 Stack (exact versions)

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | React + React DOM | `^19.2.8` |
| Language | TypeScript | `~6.0.2` |
| Build | Vite + `@vitejs/plugin-react` | `^8.2.0` / `^6.0.4` |
| Styling | Tailwind CSS + PostCSS + Autoprefixer | `^3.4.19` / `^8.5.26` / `^10.5.4` |
| Routing | `react-router-dom` | `^7.18.2` |
| Animation | `framer-motion` | `^13.1.0` |
| Maps | `leaflet` + `react-leaflet` | `^1.9.4` / `^5.0.0` |
| Charts | `recharts` | `^3.10.1` |
| Icons | `lucide-react` | `^1.31.0` |
| Head / SEO | `react-helmet-async` | `^3.0.0` |
| Lint | `oxlint` | `^1.75.0` |
| Image tooling (scripts) | `sharp` | `^0.35.3` |
| Script runner | `tsx` | `^4.23.12` |

Node 24+ (developed on 24.18, npm 11.16). **No state-management library, no data-fetching library, no form library, no test runner.**

### 2.2 Composition

`main.tsx` → `App.tsx`, which nests, outermost first:

```
HelmetProvider
└── MotionConfig reducedMotion="user"
    └── ErrorBoundary
        └── BrowserRouter
            └── AuthProvider
                └── Routes
                    /                       → redirect to /uz
                    /:lang  (LangShell: LanguageProvider + the single AuthModal)
                    ├── Layout  (header, footer, mobile bottom nav, Suspense)
                    │   ├── index            HomePage
                    │   ├── search           SearchPage
                    │   ├── business/:slug   BusinessDetailPage
                    │   ├── events           EventsPage
                    │   ├── favorites        FavoritesPage
                    │   ├── profile          ProfilePage
                    │   ├── pricing          PricingPage
                    │   ├── signup           SignupPage
                    │   ├── claim            ClaimPage
                    │   ├── business/claim   → redirect to claim
                    │   └── register         → redirect to signup
                    └── LazyRouteShell  (own Suspense, no site chrome)
                        ├── dashboard                    OwnerDashboard
                        ├── dashboard/business/new       AddBusinessPage
                        ├── dashboard/business/:id/edit  → redirect to dashboard
                        └── admin                        AdminDashboard
```

Three structural decisions worth knowing:

1. **`LangShell` owns the language context and the one shared `AuthModal` instance** for everything under `/:lang`. There is exactly one auth modal in the app.
2. **Dashboards are siblings of `Layout`, not children** — so they never inherit the marketing header/footer/bottom-nav.
3. **`LazyRouteShell` exists because `Layout` holds the site's only `Suspense` boundary.** Dashboard/admin routes are lazy but sit outside `Layout`, so without their own boundary their chunk load would have no fallback.

### 2.3 Code splitting

All 12 route pages are `lazy()`-loaded. The stated goal is that the initial bundle carries only the shell plus the homepage — specifically so **Leaflet is not downloaded until `/search` is opened**. `ErrorBoundary` detects chunk-load failures (`/dynamically imported module|Importing a module script failed|Failed to fetch/i`) and offers a reload, which is the correct handling for a stale-bundle-after-deploy situation.

### 2.4 Directory layout

```
src/
  components/     Shared UI
    ui/           Badge, Button, Card, EmptyState, Footer, Header, MobileNav, Skeleton
    auth/         AuthModal, LoginForm, ForgotPasswordFlow, OtpInput
    business/     EditBusinessModal, OpenNowBadge, ReviewForm, SocialLinks
    premium/      PremiumBadge, FeaturedListingCard, PlanCard, UpgradeModal,
                  TrafficChart, Sparkline, PhotoGalleryManager, EditorsPickCarousel
    search/       RestaurantCard, CuisineChips, FilterPills, SortDropdown
    claim/        BusinessPreview
    profile/      AvatarPicker, ProfileCompletionBanner
    seo/          MetaTags, JsonLd
    (root)        AnimatedCard, ErrorBoundary, LangShell, Layout, PageTransition,
                  RouteFallback, SafeScrollReveal, StaggerContainer
  contexts/       AuthContext, LanguageContext
  hooks/          14 hooks — useBusiness, useSearchBusinesses, useCategories,
                  useRegions, useEvents, useFavorites, useFeaturedBusinesses,
                  useClaimFlow, useSignup, useAdminResource, useRequireAuth,
                  useDebouncedValue, useMediaQuery
  i18n/           uz.ts (source of truth), ru.ts, en.ts, index.ts
  lib/            api.ts, seo.ts, premium.ts, phone.ts, localize.ts, initials.ts,
                  categoryVisuals.ts, chart-theme.tsx, foodCategory.ts,
                  motion-config.ts, profileCompletion.ts, restaurantMock.ts
  pages/          Route pages, grouped by area: home/, search/, business/, events/,
                  signup/, claim/, dashboard/ (+ views/, addBusiness/), admin/ (+ views/, charts/)
  types/          index.ts — all shared types
public/           favicon.svg, icons.svg, robots.txt, og-default.{jpg,svg}, 5 sitemaps
scripts/          generate-sitemap.ts, generate-og-image.ts
```

168 source files, 132 `.tsx` components.

---

## 3. Backend / API architecture

### 3.1 Stack (exact versions)

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | NestJS (`common`/`core`/`platform-express`) | `^10.4.15` |
| Language | TypeScript | `^5.7.2` |
| ORM | Prisma + `@prisma/client` | `^5.22.0` |
| Database | PostgreSQL | `postgres:16` locally; Railway-managed in prod |
| Auth | `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt` | `^10.2.0`, `^10.0.3`, `^0.7.0`, `^4.0.1` |
| Hashing | `bcrypt` | `^5.1.1` |
| Validation | `class-validator` + `class-transformer` | `^0.14.1` / `^0.5.1` |
| API docs | `@nestjs/swagger` | `^7.4.2` |
| Object storage | `@supabase/supabase-js` | `^2.112.3` |
| Misc | `uuid`, `rxjs`, `reflect-metadata` | `^10.0.0`, `^7.8.1`, `^0.2.2` |

`"engines": { "node": "22.x" }`. **No test framework, no `@nestjs/throttler`, no `@nestjs/config`, no `@nestjs/schedule`, no cache module, no Redis, no queue.** Environment variables are read directly from `process.env`.

### 3.2 Bootstrap (`src/main.ts`)

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,            // strip unknown properties
  forbidNonWhitelisted: true, // 400 on unknown properties
  transform: true,            // coerce to DTO types
}));
app.enableCors();             // ← NO origin restriction
SwaggerModule.setup('docs', app, document);  // ← public in production
app.listen(process.env.PORT ?? 3000);
```

Notable: **no global route prefix** (endpoints are at `/auth/...`, not `/api/auth/...`), **no global exception filter**, **no global interceptors**, **no helmet**, **no compression**.

### 3.3 Modules (17 imported by `AppModule`, 18 module files + `AppModule`)

`PrismaModule`, `AuthModule`, `UsersModule`, `GeographyModule`, `CategoriesModule`, `BusinessesModule`, `SearchModule`, `ReviewsModule`, `FavoritesModule`, `EventsModule`, `AdminModule`, `OwnerModule`, `AnalyticsModule`, `CommandCenterModule`, `HealthScoreModule`, `ProductsModule`, `UploadModule`.

Plus **`SmsModule`**, declared `@Global` — **but never imported by any module, so it is dead code.** `AuthModule` provides both `SmsService` **and** `UploadService` **directly** in its `providers` array. For `UploadService` that is deliberate and documented (importing `UploadModule` would re-mount `UploadController`); for `SmsService` it means `SmsModule`'s `@Global` declaration has no effect and the file is never loaded. Harmless, but misleading — see the dead-code findings in `HANDOFF_INDEX.md`.

Each feature module follows the same shape: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/*.dto.ts`. **45 DTOs** total. `PrismaService` extends `PrismaClient` and wires `$connect`/`$disconnect` to `OnModuleInit`/`OnModuleDestroy`.

### 3.4 Route surface — 118 routes

| Module | Routes | Base paths |
| --- | --- | --- |
| Admin | 31 | `/admin/*` |
| Owner | 14 | `/me/*` |
| Analytics | 11 | `/analytics/*`, `/me/analytics/*`, `/admin/analytics/*` |
| Auth | 10 | `/auth/*` |
| Businesses | 10 | `/businesses/*` |
| Command Centre | 10 | `/admin/command-center/*`, `/admin/analytics/aggregate` |
| Reviews | 6 | `/reviews/*` |
| Geography | 5 | `/geography/*` |
| Events | 4 | `/events/*` |
| Products | 5 | `/businesses/:id/menu`, `/me/businesses/:id/menu` (Phase 10), `/menu/:id` |
| Categories | 3 | `/categories/*` |
| Favorites | 3 | `/favorites/*` |
| Health Score | 3 | `/me/health-score*`, `/admin/health-scores/recalculate` |
| Users | 2 | `/users/me` |
| Search | 1 | `/search` |
| Upload | 1 | `/upload/image` |

Note the deliberate path overlaps: **three separate controllers serve `/admin`** (`AdminController`, `CommandCenterController`, and the admin half of `HealthScoreController`), **three serve `/me`** (`OwnerController`, `HealthScoreController`, and part of `AnalyticsController`), and `ProductsController` is declared on `/businesses` and `/menu`. Full listing in `API.md`.

---

## 4. Database architecture

Full per-model detail in `DATABASE.md`. The shape:

- **PostgreSQL**, accessed only through Prisma. Provider locked in `prisma/migrations/migration_lock.toml`.
- **31 models, 19 enums, 11 migrations.**
- **`Int @default(autoincrement())` primary keys throughout** — chosen to match the auth module, JWT payload (`sub: number`), guards and seed script.
- **`snake_case` table and column names** via `@map`/`@@map`; `camelCase` in code.
- **Soft deletes** via a nullable `deletedAt` on `User`, `Category`, `Business`, `Branch`, `Product`, `Review`, `ReviewReply`, `Event` — each with an index on `deletedAt`.
- **Vanilla-only constraint**, stated at the top of the schema: the database must be relocatable to an Uzbek host. The one extension used is `pg_trgm` (standard contrib).

### 4.1 The central modelling decision

```
Business  (brand: name, slug, description, logo, socials, SEO, status, promotion, aggregates)
   │  1..n
   └── Branch  (ALL location data: district, city, address, landmark, phone, lat/lng)
         ├── BranchHour   (7 rows max, unique per [branchId, dayOfWeek], 0=Mon…6=Sun)
         ├── BranchPhoto
         └── Review       ← reviews attach HERE, not to Business
```

`Business` carries **no** address, phone, coordinates or hours. Every geographic query routes through `Branch`. Reviews are branch-scoped because service quality is location-specific; **favourites are business-scoped** because users favourite a brand, not an address.

### 4.2 Geography hierarchy

```
Region (1: Andijan) → District (14) → City (11)
```
`City.districtId` is **nullable** and `City.isRegionLevel` flags region-level cities (Andijan city reports directly to the region, not to a district). The schema documents the trap this models: *Andijan CITY is not Andijon DISTRICT* (whose seat is Kuyganyor).

### 4.3 Denormalization, deliberate

- `Business.ratingAvg`, `reviewCount`, `branchCount`, `viewCount`, `favoriteCount` — recalculated on write
- `Branch.ratingAvg`, `reviewCount`
- `BusinessHealthScore` — one row per business, recomputed on write (explicitly **not** a cron job), so the owner dashboard and the founder health-overview each read one indexed row
- `PlatformMetric` — pre-aggregated daily rollups so the founder dashboard never scans raw event tables

### 4.4 Append-only log tables with no foreign keys

`PlatformMetric`, `SearchAnalytics` and `ActivityLog` are intentionally **not** foreign-keyed to `Business`/`Category`/`District`/`City`/`User`. The schema states why: they are high-volume write-heavy logs; skipping FK constraints avoids a check on every insert and means they never block deleting a business or user. Orphaned references are acceptable and expected in anonymized historical logs.

---

## 5. Authentication

**JWT, phone-first, with rotating refresh tokens.**

| Aspect | Implementation |
| --- | --- |
| Identifier | Phone, `+998XXXXXXXXX`, enforced by `/^\+998\d{9}$/` in six DTOs |
| Password hashing | bcrypt, cost **12** (`BCRYPT_ROUNDS`) |
| Access token | `@nestjs/jwt`, secret `JWT_ACCESS_SECRET`, default TTL `15m` |
| Refresh token | Separate secret `JWT_REFRESH_SECRET`, default TTL `30d`; stored as `RefreshToken.tokenHash` (unique), with `expiresAt`, `revokedAt`, `userAgent`, `ipAddress` — so rotation and revocation are both possible |
| Strategy | `passport-jwt`, bearer from `Authorization` header, `ignoreExpiration: false` |
| Per-request check | `JwtStrategy.validate()` **queries the database on every request** and rejects unless `status === ACTIVE` and `deletedAt` is null. A suspended user is locked out immediately without waiting for token expiry — at the cost of one query per request. |
| Token payload | `{ sub: number, phone: string, role: UserRole }` |
| OTP | 6 digits via `crypto.randomInt`, hashed into `OtpCode.codeHash`, 5-min TTL, single-use (`usedAt`), max 5 attempts, **3 SMS per phone per 10 min**. Purposes: `PHONE_VERIFY`, `PASSWORD_RESET`, `LOGIN`. |
| OTP storage | **PostgreSQL, not Redis.** The spec called for Redis; the `OtpCode` table already provides TTL + attempt counting, so a dependency was avoided. |
| OTP-created users | Get `passwordHash = bcrypt(crypto.randomBytes(48).hex)` and `fullName: ''` — an unusable password, so the account exists but cannot be password-logged-in until a password is set. |
| Client-side storage | `localStorage`: `myandijan_token`, `myandijan_user` |

**Gap:** the frontend never stores or uses the refresh token and never calls `POST /auth/refresh` or `POST /auth/logout`. See `CURRENT_STATE.md` §5, bug 1.

---

## 6. Authorization

Two guards, composed as `@UseGuards(JwtAuthGuard, RolesGuard)`.

**`RolesGuard` is a hierarchy floor check, not an exact match:**

```ts
const requiredLevel = Math.min(...requiredRoles.map(r => ROLE_HIERARCHY[r]));
return ROLE_HIERARCHY[user.role] >= requiredLevel;
```

```
CUSTOMER 1 < BUSINESS_OWNER 2 < SUPPORT 3 < MODERATOR 4 < ADMIN 5 < SUPER_ADMIN 6
```

So `@Roles(...)` declares the **lowest** acceptable role and everyone above passes — which is what lets `SUPER_ADMIN` satisfy every check without being listed on each route. `@Roles` is read with `getAllAndOverride` across handler **and** class, so a method-level `@Roles` overrides the controller-level one. `AdminController` uses this to lower its class-level `ADMIN` floor down to `MODERATOR` for approve/reject, and to raise it to `SUPER_ADMIN` for `businesses/:id/hide`.

Also:
- `@CurrentUser()` decorator supplies the authenticated user to handlers.
- The frontend mirrors the hierarchy in `AuthContext`: `isOwner` = `BUSINESS_OWNER|ADMIN|SUPER_ADMIN`, `isAdmin` = `ADMIN|SUPER_ADMIN`, `isSuperAdmin` = `SUPER_ADMIN`. `MODERATOR`/`SUPPORT` are excluded from both — they get only the specific admin actions the backend grants.
- **Schema-level security requirement:** `User.role` carries the comment *"the public /auth/register endpoint MUST reject role=ADMIN. Admins are created via seed or promoted by an existing admin only."*
- **Ownership checks** are done in service methods (e.g. `OwnerService` scoping by `ownerId`), not by a guard.
- **`SUPPORT` (3) outranks `BUSINESS_OWNER` (2)**, so `@Roles(BUSINESS_OWNER)` routes are also open to support staff. Possibly intended; undocumented.

---

## 7. API communication

**Frontend client: `src/lib/api.ts`** — hand-written, no Axios, no React Query.

- Base URL: `import.meta.env.VITE_API_URL || "https://myandijan-api-production.up.railway.app"` — **a hardcoded production fallback**, so a missing env var silently points at production.
- Timeouts: **10 s** for JSON, **30 s** for uploads, both via `AbortController`.
- Bearer token read from `localStorage` per request.
- Four request helpers: `request` (GET + query params), `authedJson` (POST/PATCH/PUT), `authedDelete`, `authedFormData` (multipart — deliberately sets no `Content-Type` so the browser supplies the boundary).
- **Centralised 401 handling:** `handleUnauthorized(hadToken, status)` clears storage and dispatches `SESSION_EXPIRED_EVENT` — but only when a token was actually sent, so a 401 from `/auth/login` is treated as a wrong password rather than an expired session. `AuthContext` listens for that event and clears React state.
- **`ApiError`** carries `status`, so callers can distinguish 404-means-not-launched-yet from a real failure.
- **Normalisation at the boundary:** `normalizeBusiness()` / `normalizeBranch()` adapt the API's non-localized `Business`/`Branch` shape to the frontend's localized types, lift `phone`/`address` up from `branches[0]`, and `Number()`-coerce `ratingAvg` (the API sends it as a string). This is the fix for blank names, missing contact details, and `NaN` ratings.
- **List-shape tolerance:** `normalizeAdminList()` accepts either a bare array or a `{data, meta}` envelope, because admin response bodies could not be observed at the time (they need an `ADMIN` token and registration only issues `CUSTOMER`/`BUSINESS_OWNER`).
- Response envelope from the API for paginated endpoints: `{ data: T[], meta: { page, limit, total, totalPages } }`.

---

## 8. File / image storage

**Supabase Storage**, bucket `myandijan-images`.

| Aspect | Detail |
| --- | --- |
| Endpoint | `POST /upload/image`, multipart field `file`, `JwtAuthGuard` only (any authenticated user) |
| Limits | **5 MB** (`FileInterceptor` limit), MIME allow-list `image/jpeg|png|webp|gif` |
| Filename | `${Date.now()}-${originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}` — sanitised because the client fully controls the value and it lands in a storage object key |
| Key used | **`SUPABASE_SERVICE_KEY` (service_role), server-side only.** The `anon` key made every upload fail with *"new row violates row-level security policy"* — it is meant for browser-to-Supabase calls under RLS, and this backend holds no Supabase Auth session for RLS to authorize. `service_role` bypasses RLS, which is the correct trust boundary for a backend that already decides via `JwtAuthGuard` who may upload. |
| Client lifetime | Built once per process, not per request |
| Return | `{ url }` from `getPublicUrl()` — public, unsigned |
| Authorization note | The controller comments that permission to *attach* a URL is enforced by whichever write endpoint the frontend calls next, not here |
| Client-side guard | `assertUploadable(file)` in `api.ts` rejects >5 MB and non-image types before the request, because `accept="image/*"` is only a picker hint |
| Avatar path | `PUT /auth/profile` accepts `photo` via `FileInterceptor('photo')` and uploads server-side, so the frontend makes one request, not two |
| Legacy | `BranchPhoto.publicId` is commented `// Cloudinary` — a vestige of an earlier storage choice. Cloudinary is **not** a dependency. |

---

## 9. Search

The most technically substantial part of the backend. **As of Phase 8, the frontend uses it** for free-text queries — see §25.

**Migration `20260810160018_add_search_fts_trgm`** creates:

- `CREATE EXTENSION IF NOT EXISTS pg_trgm`
- `public.search_normalize(text)` — transliteration folding for Uzbek Latin/Cyrillic variants
- `public.business_search_doc(name, description)` and `public.product_search_doc(name)` — tsvector builders
- `public.search_tsquery(q)` — query builder
- Four indexes: `businesses_search_doc_idx`, `businesses_name_trgm_idx`, `products_search_doc_idx`, `products_name_trgm_idx`

**`SearchService`** builds one CTE (`buildHitsCte`) and splices it into two parallel raw queries — a paged `SELECT` and a `count(*)` — so page and count always agree. It ranks businesses **and** products in a single unified result set (`kind: 'BUSINESS' | 'PRODUCT'`), then hydrates. Category filtering for a product matches through its own category or, when it has none, through its business's category. Geographic filtering is applied per-kind via a shared `geoClause`. The response exposes `normalizedQuery` so callers can see what the query folded down to.

**Frontend search, as of Phase 8:** free-text queries use `GET /search?type=business` (real FTS ranking); category/district-only browsing (no text) still uses `GET /businesses` (see §25). For the food category (`?category=oziq-ovqat`) `SearchPage` dispatches to `CategorySearchPage`, which fetches `limit=100` and does filtering, sorting and pagination **client-side** (`PAGE_SIZE = 12`, D-23) — untouched by Phase 8, since it is a separate, already-decided UI with no product/text-search integration point.

---

## 10. Maps / location

- **Leaflet 1.9 + React Leaflet 5**, loaded only on the search route (the main reason for code splitting).
- `src/pages/search/SearchMap.tsx` renders markers via Leaflet `divIcon` with **`escapeHtml()` applied to API-sourced text first** — a deliberate XSS fix, since `divIcon` takes raw HTML. Includes `pinTier()` for gold/grey pin styling by promotion tier.
- Coordinates: `Decimal(10,8)` for `lat`, `Decimal(11,8)` for `lng`, on `Region`, `District`, `City`, `Branch` and `Event`. All nullable.
- `Branch` has a composite `@@index([lat, lng])`.
- **No PostGIS, no geospatial radius search, no distance sorting.** The vanilla-PostgreSQL constraint rules PostGIS out.
- "Directions" is a click-tracked outbound action (`directionClicks` in `BusinessAnalytics`), not an in-app routing feature.
- **UNKNOWN:** which tile provider is configured — not inspected in this pass.

---

## 11. Reviews

```
Review (branchId, userId, rating, title?, comment, photos String[])
  ├── ReviewReply   (one per review — reviewId is @unique; author = business owner)
  └── ReviewReport  (reason enum, status, resolver)
```

- **`@@unique([branchId, userId])`** — one review per user per branch. The schema calls this *"the primary anti-spam control"*.
- **`@@unique([reviewId, reporterId])`** — one report per user per review, *"prevents report-spam brigading"*.
- `ReviewStatus`: `PENDING | PUBLISHED | REJECTED | HIDDEN`, defaulting to **`PUBLISHED`** — reviews go live without moderation, and moderation is reactive.
- `photos String[]` (added in migration `20260823062534_add_review_photos`), `helpfulCount`, `reportCount`, `moderationNote`.
- Two write paths: `POST /reviews` (branch-scoped) and `POST /businesses/:id/reviews` (business-scoped convenience — resolves to the primary branch server-side).
- Two reply paths: `POST /me/reviews/:id/reply` (owner dashboard) and `POST|PATCH /reviews/:id/reply`.
- Moderation: `POST /admin/reviews/:id/hide` and `/restore` exist; **no `GET` list endpoint** — which is why the admin reviews view is still mock.

---

## 12. Business listings

**Status workflow:** `DRAFT → PENDING → APPROVED | REJECTED | SUSPENDED | HIDDEN`.

**Ownership** is expressed solely by `Business.ownerId`, which is nullable until a claim is approved. `claimedAt`/`claimedById` were **removed** from `Business` — claim history lives in `BusinessClaim`, because a business may be claimed, rejected and re-claimed, and that history is an entity rather than two columns.

**`BusinessType` is a capability row, not a hardcoded type branch.** MVP flags: `catalogEnabled`, `eventsEnabled`, `advertisingEnabled`. Phase-2 flags already present: `inventoryEnabled`, `warehouseEnabled`, `bookingEnabled`, `deliveryEnabled`, `orderingEnabled`. The schema states this is what lets those modules attach in Phase 2 **without a core migration**.

**Per-language SEO overrides** live on the business itself (`metaTitleUz/Ru/En`, `metaDescriptionUz/Ru/En`), falling back to generated values when null.

**Claims:** `BusinessClaim` captures `evidence`, `contactPhone`, `contactNote`, reviewer and rejection reason. The schema notes that *"only one PENDING claim per business" cannot be expressed as a Prisma unique constraint (needs a partial index) — enforce in the service layer.*

---

## 13. Admin functionality

`AdminController` — 31 routes, class-level `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(ADMIN)`, with per-route overrides in both directions:

| Area | Routes |
| --- | --- |
| Stats | `GET /admin/stats` |
| Businesses | list, approve¹, reject¹, hide², `PATCH :id`, `PATCH :id/branch`, verify, suspend, promote |
| Claims | list, approve, reject |
| Reports | list, resolve |
| Reviews | hide, restore |
| Events | list, approve, reject |
| Categories | list, create, **reorder**, update, delete |
| Geography | `PATCH /admin/districts/:id`, `PATCH /admin/cities/:id` |
| Users | list, suspend, activate |
| Audit | `GET /admin/audit` |

¹ lowered to `@Roles(MODERATOR, ADMIN, SUPER_ADMIN)`  ² raised to `@Roles(SUPER_ADMIN)`

**Plus** `CommandCenterController` (also `/admin`, `@Roles(ADMIN)`): `POST /admin/analytics/aggregate` and nine read endpoints — overview, growth, geography, categories, search-intelligence, users, moderation, business-health, health-overview. And `POST /admin/health-scores/recalculate` from `HealthScoreController`.

**`AuditLog`** records every sensitive admin action with `before`/`after` JSON snapshots, actor, IP and user agent. The schema's justification: *"cheap now, unbackfillable later."* It is deliberately distinct from `ActivityLog`, which records ordinary (often anonymous) end-user behaviour for product analytics.

---

## 14. AI functionality

**None.** A repository-wide search for `openai`, `anthropic`, `gpt`, `gemini`, `llm`, `embedding` and related terms across both `src` trees returns **zero** matches.

The only near-hit is a comment in `src/health-score/scoring.ts` referring to a *"recommendation engine"* — which is a **deterministic rule engine**, not machine learning: it detects specific profile/engagement/visibility/response gaps and emits pre-authored, pre-translated recommendation rows keyed by a stable `code`.

AI's actual role in this project is **as the development tool** (Claude Code across ~7 sessions), not as a product feature. See `AI.md`.

---

## 15. Third-party integrations

| Service | Purpose | Status |
| --- | --- | --- |
| **Railway** | API + PostgreSQL hosting | **Active.** `railway.json`: NIXPACKS, `npm run build`, start `npx prisma migrate deploy && npm run start:prod`, restart `ON_FAILURE` max 3 |
| **Vercel** | Frontend hosting | **Active and current** (2026-09-28). Project `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH`, team `john-s3`. Not Git-connected. |
| **Supabase Storage** | Image storage | **Active.** Bucket `myandijan-images`, service_role key |
| **Eskiz.uz** | SMS / OTP delivery | **Built, NOT configured.** `ESKIZ_*` unset on Railway → degrades to logging |
| **Leaflet / OSM tiles** | Maps | Active (provider config not verified) |
| Click / Payme / Uzum | Payments | **UI only, no integration** |
| Telegram / Google login | Social auth | **UI buttons only, no backend** |
| Cloudinary | Image storage | **Not used.** Vestigial `publicId // Cloudinary` comment only |
| Analytics (GA/Plausible/etc.) | — | **None.** Analytics is entirely first-party |
| Error tracking (Sentry etc.) | — | **None** |
| Email | — | **None.** No email provider; `email` fields exist but nothing sends |

---

## 16. Background jobs

**None.** No `@nestjs/schedule`, no `@Cron`, no queue (no BullMQ), no worker process, no `setInterval` in the API.

Everything that might have been a job is either **on-write** or **on-demand**:

- **Health scores** recompute on write — explicitly *"deliberately NOT a cron job"* — with `POST /admin/health-scores/recalculate` as a manual trigger.
- **Daily metric rollups** are produced by `POST /admin/analytics/aggregate`, an **endpoint someone or something must call**. Nothing schedules it. Unless an external scheduler exists (**UNKNOWN**), `PlatformMetric` is only populated when that route is hit manually.
- **Denormalized counters** are recalculated on write.

---

## 17. Caching

**None at any layer.**

- No `CacheModule`, no Redis, no in-memory cache, no HTTP cache headers set by the API.
- No `stale-while-revalidate` or client cache in `api.ts` — every hook fetch is a fresh network request.
- `JwtStrategy` hits the database on **every authenticated request** to re-check status — correct for security, uncached.
- The only cache-like thing is `SmsService`'s in-memory Eskiz bearer token (25-day TTL, single in-flight login so N concurrent sends trigger one login).
- Vercel's CDN caches static assets (`X-Vercel-Cache: HIT` observed).

---

## 18. Error handling

**Backend**
- Global `ValidationPipe` with `forbidNonWhitelisted: true` → unknown body properties produce a `400` listing them.
- Standard Nest HTTP exceptions (`BadRequestException`, `UnauthorizedException`, `InternalServerErrorException`) thrown from services.
- **No global exception filter**, so unhandled errors surface as Nest's default 500 with the default body shape.
- `SmsService` **never throws** — an SMS outage must not fail the OTP endpoint, since the code has already been persisted. It logs instead. This is a deliberate trade that also makes a misconfiguration invisible to callers.

**Frontend**
- `ErrorBoundary` at the app root, with chunk-load-error detection and a reload offer.
- `ApiError` with a `status` field; `handleUnauthorized` centralises 401 → session-clear + `SESSION_EXPIRED_EVENT`.
- `AuthContext`'s mount-time `getMe()` distinguishes 401 (clear session) from any other failure (keep serving the cached user, since offline/5xx is transient).
- A `writeSeqRef` counter in `AuthContext` drops a stale `getMe()` response if a local authoritative write landed while it was in flight — the fix for the profile-completion banner resurfacing.
- `RouteFallback` and `Skeleton` for loading states; `EmptyState` for empty results; `AdminFetchState` for admin views.
- `SafeScrollReveal` carries a **3000 ms watchdog** against animation callbacks that never fire.

---

## 19. Logging

- **Backend:** Nest's built-in `Logger`, used meaningfully only in `SmsService` (`logger.warn` / `logger.error`). Two `console.log` calls in `main.ts` for the boot banner. **No request logging, no request IDs, no correlation IDs, no log shipping.** Railway captures stdout.
- **Application-level audit trail** is the real logging story, and it is strong: `AuditLog` (privileged actions, with before/after JSON, IP, user agent) and `ActivityLog` (end-user behaviour). **Privacy note in the schema:** `ActivityLog.metadata` stores an **`ipHash`, never a raw IP**.
- **Frontend:** no logging service. Errors reach the browser console only.

---

## 20. Deployment architecture

### API — Railway
```json
{ "build":  { "builder": "NIXPACKS", "buildCommand": "npm run build" },
  "deploy": { "startCommand": "npx prisma migrate deploy && npm run start:prod",
              "restartPolicyType": "ON_FAILURE", "restartPolicyMaxRetries": 3 } }
```
Migrations run on every boot, **`&&`-chained** — so the app only starts if migrations succeed. A useful corollary: **a running production API proves all prior migrations applied cleanly**, which is how migration state was reasoned about without DB access. `postinstall` runs `prisma generate`. Deployed via `railway up --detach`.

### Frontend — Vercel
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
SPA catch-all, so deep links like `/uz/claim` resolve. **Consequence to remember when verifying anything: every URL on the domain returns 200 with HTML, including non-existent assets. Status codes prove nothing — check `content-type`.**

Deployed with `npx vercel --prod` from this machine (no Git integration). Project is not Git-connected, which is why the Vercel MCP server can read the account but cannot trigger a build.

### Local development
- API: `docker-compose.yml` → `postgres:16`, user/db `andijan`/`my_andijan`, port 5432, healthcheck via `pg_isready`. Then `npm run start:dev` (Nest watch) on port 3000 (3001 was also used in session).
- Frontend: `npm run dev` → Vite. **Port 5173 is occupied on this machine by an unrelated `crm-os` server, so this project uses 5180** via `.claude/launch.json`.

### Production deployment baseline — verified 2026-09-28

| | API | Frontend |
| --- | --- | --- |
| Platform | **Railway** (`myandijan-api`, env `production`, project `3910b9c5-e86d-4c06-8058-def605847424`) | **Vercel** (project `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH`, team `john-s3`) |
| Mechanism | `railway up` from a developer machine | Vercel CLI (`vercel --prod`) from a developer machine |
| Git-connected? | **No** | **No** |
| Version running | Built from `main` `4c5bcd0`; Railway deployment `08b23ee0`, status SUCCESS | Bundle byte-identical to a local build of `main` `0f4ecc8` |
| Identified by | Railway deployment id + container content fingerprint | Vite content-hashed asset names (`index-NERlrCqp.js`) |

**Neither platform auto-deploys from GitHub.** Pushing to `main` does **not** ship. Every deploy is a manual action from a developer machine, so `main` and production can silently diverge — re-verify after any commit.

#### Why version is identified by content, not commit SHA

Neither platform records a commit, because neither is Git-connected. Both were therefore verified by content:

- **API** — `railway ssh` into the running container and check markers that differ between revisions (for example whether `scripts/seed-role-accounts.js` reads `process.env.SEED_ROLE_PASSWORD`), plus the `dist/main.js` mtime.
- **Frontend** — download the served entry chunk and `cmp` it against a local `npm run build` of `main`. Vite hashes asset names from content, so identical names *and* a byte-identical file prove identical source. Confirmed for `index-NERlrCqp.js` (451,121 bytes) and `createLucideIcon-C9cll_Zg.js` (17,960 bytes, which is where `src/lib/api.ts` lands).

#### Required production variables — names only

**Railway (API), all present:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `SEED_ADMIN_PHONE`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL`, `SEED_ROLE_PASSWORD`, `FRONTEND_URL`, `NODE_ENV`, plus Railway-injected `PORT` / `RAILWAY_*`.

**Absent by design or still outstanding:** `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM` — **still unset, so no SMS is sent**; `JWT_REFRESH_SECRET` is set but read by no code.

**Vercel (frontend):** `VITE_API_URL` — confirmed *effective* (the production bundle embeds `https://myandijan-api-production.up.railway.app`, matching the deployed Railway service, and contains no `localhost`). The Vercel variable list itself could not be enumerated: the CLI is logged out and the Vercel API returned 403/404 for this project under the available token.

#### Production verification procedure

```bash
curl -s -o /dev/null -w '%{http_code}
' https://myandijan-api-production.up.railway.app/categories
```

1. **API health** — expect `200` on `/categories`, `/geography/regions`, `/businesses`, `/businesses/featured`, `/businesses/promoted`, `/events`, `/search?q=osh`, `/docs`; expect `401` on `/users/me`, `/favorites`, `/me/stats`, `/me/businesses`, `/admin/stats`.
2. **Frontend version** — fetch the entry chunk named in `/uz`'s HTML and `cmp` it against `dist/assets/` after `npm run build`.
3. **Rendering** — `/uz` (hero, districts, categories, Editor's Pick), `/ru/search` (Russian category names prove the localized taxonomy), `/uz/business/<slug>` (open-now badge, branch phone, dynamic `<title>`).
4. **Auth gate** — `/uz/profile` must present the login dialog while unauthenticated. **Do not test credentials against production.**

> **Verification trap:** `vercel.json` rewrites `/(.*)` → `/index.html`, so **every** URL on `myandijan.uz` returns `200` with `text/html`, including assets that do not exist. Always check `content-type` and size; use a deliberately fake asset path as a control.

#### Known deployment limitations

1. **No CI/CD and no Git-connected deploys** — deployment depends on one developer's machine and local CLI auth.
2. **Vercel CLI auth expires**, and on this machine PowerShell's execution policy blocks the `npx.ps1` shim; use `npx.cmd`.
3. **No `/health` endpoint** — use `GET /categories` as the liveness probe.
4. **No staging environment**; `railway up` deploys straight to production.
5. **Migrations run on boot**, `&&`-chained — the app will not start if they fail.
6. **No error tracking or uptime monitoring.**
7. **CORS is open** — verified `access-control-allow-origin: *` for an arbitrary origin.
8. **`/docs` is publicly reachable in production.**

### Not present
No staging environment, no preview-deploy workflow, no Dockerfile for the API, no infrastructure-as-code, no automated database backups configured in-repo. **Superseded 2026-09-28 (Phase 3):** a minimal GitHub Actions workflow now exists in both repos (install → test → build on push/PR to `main`).

## 21. Frontend/backend integration audit — 2026-09-29 (Phase 4)

A full route-by-route audit compared all 118 backend HTTP routes against `myandijan-frontend/src/lib/api.ts` (confirmed the only file performing network calls) and its callers. Full per-route detail lives in the audit itself, not reproduced here; headline results:

- **~42 of 118 routes are called from the frontend** (up from ~38 — see Phase 4 connections below); ~76 have no frontend caller.
- **Controllers with zero frontend usage:** `command-center` (9 routes), `health-score` (3 routes), `search` (`GET /search`), most of `geography` beyond `regions`, most of `categories` beyond the tree (until Phase 4 added `/categories/homepage`), and the standalone `reviews.controller.ts` routes (the app instead goes through `/businesses/:id/reviews` and `/me/reviews`).
- **No route in the frontend calls a backend path that doesn't exist** — `lib/api.ts` is fully consistent with the live route table (two stale 2026-08-13 code comments claim otherwise; the routes they reference now exist).
- **Dead code in `lib/api.ts`:** `register` (signup uses OTP instead), `getUserAnalytics`, `updateAdminBusiness`, `updateMenuItem` (now used by `InventoryView` since Phase 10), `replyToReview`'s underlying `POST /reviews/:id/reply` (the PATCH alias is what's actually called) are exported but never imported anywhere.

### Phase 4 connections (implemented this pass)

1. **Refresh-token session persistence** — `AuthContext.login`/`register` now take and persist the `refreshToken` field the backend already returned (the `AuthResponse` type was missing it). `lib/api.ts`'s five internal fetch wrappers (`request`, `authedDelete`, `authedJson`, `authedFormData`, `uploadImage`) each attempt one silent `POST /auth/refresh` (single-flight, deduped across concurrent 401s) before falling back to the existing logout-on-401 path. Fixes the previously BROKEN behavior where sessions died after the 15-minute access-token lifetime.
2. **Logout revocation** — `AuthContext.logout()` now calls `POST /auth/logout` (best-effort, not awaited) to revoke the stored refresh token server-side, in addition to clearing `localStorage`.
3. **Analytics ingestion wiring** — `POST /analytics/view` fires from `useBusiness` on a business detail page's initial load; `POST /analytics/click` fires from `ActionButtons` for CALL/DIRECTION/SHARE/FAVORITE; `POST /analytics/search` fires from `useSearchBusinesses` whenever a text-query search resolves (query, district/city id, result count — category id is omitted since the UI only holds the category *slug*). All three are fire-and-forget and never surface a failure to the user. This is the first frontend traffic these previously-empty analytics tables will ever receive.
4. **Homepage categories via the dedicated endpoint** — `CategoriesSection` now calls the purpose-built `GET /categories/homepage` (new `getCategoriesHomepage()` + `useCategoriesHomepage` hook) instead of fetching the full category tree via `GET /categories` and filtering client-side for `showOnHomepage`. Same rendered output, smaller payload, server is now the source of truth for the filter.

### Evaluated and explicitly NOT implemented (require a product decision)

- **Advanced FTS search (`GET /search`)** — its `hydrate()` response is a heterogeneous, smaller field set than the `Business` type the search UI renders (missing localized names, rating, delivery/promoted flags, hours). Wiring it as-is would either degrade result cards or require designing UI for mixed business/product hits. See `FEATURES.md` §2.
- **Claim status visibility (`GET /me/claims`)** — no backend endpoint ever creates a `BusinessClaim` row (the existing claim flow creates a `Business` directly via `POST /businesses`), so this UI would always show an empty list until someone decides how/whether the claim flow should produce real claim records. See `FEATURES.md` §8.
- **`GET /businesses/promoted`** — no business in the current dataset has `isPromoted` set, and its visual placement/relationship to the existing "Editor's Pick" carousel (which already derives from `isFeatured`) is a design decision, not a mechanical connection.

## 22. MVP gap audit and next batch — 2026-09-29 (Phase 5)

A 20-capability MVP gap matrix (geography through audit logging) was built against the current codebase, not the historical `ROADMAP.md`/`TODO.md` (both dated 2026-09-28, now partially superseded by Phases 3/4). Full matrix in the Phase 5 session report; selected and implemented:

1. **Events — customer detail page + RSVP.** New `/:lang/events/:slug` route (`GET /events/:slug`), a "Ishtirok etaman" button wired to `POST /events/:slug/attend`. Found and fixed a live bug in the process: the `Event` frontend type and `EventCard` used field names that don't exist in the real `GET /events` response, so the events list was rendering blank titles/dates/images in production.
2. **Events — owner creation.** The owner dashboard's "Yangi tadbir" button was rendered but had no `onClick` at all. Now opens a modal (business picker + title/description/start/end/venue) that calls the previously-unwired `POST /me/events`.
3. **`sitemap-businesses.xml` populated.** Re-ran `npm run sitemap` against live production: 0 → 12 URLs (4 businesses × 3 languages), `lastmod` refreshed. **Not automated** — see D-53 in `DECISIONS.md` for why this stays a manual/deploy-time step rather than a CI step.

### Evaluated and explicitly NOT implemented (require a product decision)

- **Owner "Inventory" management (`InventoryView`).** The mock `Product` type carries `sku` and `quantity` (stock-keeping fields); the real backend's menu/catalog model (`GET/POST /businesses/:id/menu`) has neither — it's a simple name/description/price/photo/availability catalog, with no stock concept at all. Wiring `InventoryView` to the real API as-is would silently drop SKU/quantity from the UI, reframing "inventory management" as "menu management." Building stock tracking for real would need new schema fields. ~~This needs a decision~~ — **resolved and implemented in Phase 10 as the catalog concept (D-61), see §27.**
- **Admin review moderation (`GET /admin/reviews` doesn't exist).** Deprioritized in Phase 5 to keep that batch small; **implemented in Phase 6, see §23.**
- **Admin claims moderation UI.** Skipped for the same reason as Phase 4: no endpoint anywhere creates a `BusinessClaim` row, so a moderation queue would always be empty.

## 23. Review moderation & trust layer — 2026-09-29 (Phase 6)

Completed the review moderation workflow: customer submits a review → it exists in the backend → the business can reply where already supported → admin can now see and moderate it through a real UI.

### What was already connected (unchanged this phase)

- Review creation (`POST /businesses/:id/reviews`), display, and owner replies (`POST /me/reviews/:id/reply`) were already fully wired — see `FEATURES.md` §4.
- `POST /admin/reviews/:id/hide` and `POST /admin/reviews/:id/restore` already existed in `AdminService`/`AdminController`; they were simply unreachable from the UI because nothing could list reviews to act on.

### What was newly connected

1. **`GET /admin/reviews`** — new route, `@Roles(ADMIN)` (inherited from `AdminController`'s class-level guard, same as every other admin route). `AdminService.findReviews(query)` mirrors the existing `findEvents`/`findReports` shape exactly: `{status?, page, limit}` → `{data, meta}` via the same `paginate()` helper, `$transaction([findMany, count])`, and `deletedAt: null` convention. Includes `user` (id/fullName/avatarUrl), `branch.business` (id/slug/name), and `reply` (id/body/createdAt) — the same join shape `AdminService.findReports` already used for its embedded review preview, so no new query pattern was invented.
2. **`AdminReviewsView`** — the mock `adminMockData.ts` (`ADMIN_MOCK_REVIEWS`) is gone; the view now uses `useAdminResource` + `getAdminReviews()`, with the existing `renderAdminState`/`AdminForbidden`/`AdminError` components for loading/forbidden/error, and a status filter (`PENDING`/`PUBLISHED`/`REJECTED`/`HIDDEN`) that maps directly to the new endpoint's `?status=` param. `adminMockData.ts` was deleted outright — after this change nothing else imported it.
3. **Moderation actions** — "Yashirish" (hide) shown unless already `HIDDEN`; "Tiklash" (restore) shown unless already `PUBLISHED` — matching `hideReview`/`restoreReview`'s own guard conditions in `AdminService` exactly, so the UI never offers an action the backend would reject as a conflict. Same toast/pending-button pattern as `AdminBusinessesView`'s approve/reject.

### Authorization

No new guard logic was needed: `GET /admin/reviews` sits under `AdminController`'s existing class-level `@UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)`, identical to every other admin route. Added `roles.guard.spec.ts` — the first unit test on `RolesGuard` itself — covering no-user, non-admin (CUSTOMER/BUSINESS_OWNER), admin, and SUPER_ADMIN-via-hierarchy cases, since this one guard protects the entire admin surface.

### Tests

Backend: `roles.guard.spec.ts` (6 tests), `admin.service.spec.ts` (4 tests — pagination, status filter, skip/take, include shape), `admin.controller.spec.ts` (1 test — delegation). Frontend: `AdminReviewsView.test.tsx` (5 tests — list rendering, empty state, 403-forbidden state, hide-action success, hide-action failure).

### Deliberately not implemented

- **Reports queue UI, claims moderation UI, verify/suspend/promote UI** — out of scope per this phase's guardrails; unrelated admin modules.
- **Edit/delete a review's own content from the admin panel** — not requested; `ReviewsService.update`/`remove` are user-scoped (owner-of-review only) by design, and giving admin a bypass would be a new business rule, not a connection of an existing one.
- **`ReviewReport` (user-submitted reports) surfacing on this view** — `GET /admin/reports` already exists as its own endpoint/view; folding report counts into the reviews list was considered scope creep for this task and left as `reportCount` on the type (unused in the UI) for a future pass.

## 24. SEO landing pages & discovery architecture — 2026-10-01 (Phase 7)

Turned the two undedicated discovery concepts — category and district browsing — into real, indexable landing pages, closing what `SEO.md` had called "the largest structural SEO gap in the project."

### URL decision

`/:lang/category/:slug` and `/:lang/district/:slug` — the exact structure requested, adopted as-is (see `DECISIONS.md` D-55). No alternative convention was needed: both slugs already exist and are already unique (`Category.slug`, `District.slug`, both `@unique` in the schema), and `MetaTags`' canonical/hreflang logic already derives everything from `useLocation().pathname`, so a real path-based route gets correct canonical/hreflang for free — no changes to `MetaTags` were needed.

### What was reused vs. added

**Zero backend changes.** Both pages run entirely on endpoints that already existed and were already unused:
- `GET /categories/:slug` (`CategoriesService.findBySlug`) — category name/description. Flagged as unused in the Phase 4 audit; now wired.
- `GET /geography/regions` (`GeographyService.findAllRegions`) — already fetched by `useRegions` for the search filters and `DistrictsSection`; districts are resolved from its nested list client-side. No `GET /geography/districts/:slug` was added — with only ~14 districts, a dedicated lookup endpoint would be a needless round trip.
- `GET /businesses?category=<slug>` / `?district=<id>` — the same `useSearchBusinesses` hook `SearchPage` already uses, unmodified.

**New frontend-only additions:** `getCategoryBySlug()` in `lib/api.ts`; `useCategoryDetail` hook (mirrors `useBusiness`/`useEventDetail`); `CategoryLandingPage.tsx` and `DistrictLandingPage.tsx`, both reusing `BusinessListCard`, `Pagination`, `MetaTags`, and `JsonLd`'s existing `BreadcrumbList` type (built in an earlier phase, never used until now) verbatim — no duplicate business-card component, no new JSON-LD schema type invented.

### Real-data discipline

Business counts shown in the title, meta description, and on-page copy come from the businesses list's own `meta.total` (status-filtered to `APPROVED`), never from `CategoriesService.findBySlug`'s `_count.businesses` (which counts every status, not just approved) and never invented. When a category/district has zero approved businesses, the copy switches to a count-free sentence rather than showing "0" or a fabricated number.

### Internal linking

Homepage `CategoriesSection` and `DistrictsSection` tiles now navigate to the dedicated pages instead of `/search?category=`/`?district=`. One deliberate exception: `oziq-ovqat` (food) keeps navigating to `/search?category=oziq-ovqat` to preserve the specialized restaurant search UI (`CategorySearchPage`, locked decision D-21) — `/category/oziq-ovqat` still exists and is still sitemapped as that category's canonical URL; only the one homepage click target was special-cased.

### Canonical/indexing safety (Phase 7 STEP 9 check)

Found and fixed one real issue: `scripts/generate-sitemap.ts` already emitted `city/:slug` sitemap entries (written in anticipation of routes that were never built), but no `/:lang/city/:slug` route exists anywhere in the app — those URLs would have resolved to the SPA's empty-`Layout` fallback (the same missing-404-route gap `TODO.md` already documented) rather than real content. City entries were removed from the generator; `sitemap-locations.xml` dropped from 72 to 42 URLs (districts only). No duplicate-content, trailing-slash, or language-duplication issues were found — every route is a single canonical path per language, and `MetaTags`' existing canonical/hreflang machinery covers the new pages without modification.

### Tests

`CategoryLandingPage.test.tsx` and `DistrictLandingPage.test.tsx` (4 tests each): real business rendering + link to detail page, empty state, not-found state, unique title/meta assertion. No backend changes, so no backend tests were added this phase.

### Deliberately not implemented

- **A city landing page (`/:lang/city/:slug`).** Out of scope for this phase (only category + district were requested); flagged as the natural next step given the sitemap already had city data available.
- **Subcategory hierarchy navigation on the category page.** `Category.parentId`/`children` exist and `findBySlug` already returns them, but rendering a subcategory nav UI was judged beyond "provide useful navigation back to discovery" and into new UI surface — deferred, not blocked.
- **Breadcrumbs on `SearchPage`/`BusinessDetailPage`/`EventDetailPage`.** Only the two new pages got `BreadcrumbList`; retrofitting existing pages was out of scope.

---

## 25. Advanced search integration — 2026-10-01 (Phase 8)

Integrated the existing PostgreSQL FTS/trigram search (§9) into the public search page, which had been calling `GET /businesses?search=` (a plain case-insensitive `contains` on `name`, no ranking, no transliteration folding) instead of the sophisticated `GET /search` endpoint that already existed and had zero callers (confirmed by grep before any change was made — `CURRENT_STATE.md` and `API.md` had both already documented this gap from an earlier audit).

### Root cause of the frontend/backend mismatch

Two contract-shape problems, not just "nobody wired it up":
1. `GET /search` unconditionally unions `BUSINESS` and `PRODUCT` hits into one ranked list (`kind` discriminator). The frontend has no product-result card — only `BusinessListCard` — so a naive switch to `GET /search` would either crash rendering product-shaped rows through a business card, or silently under-render while `meta.total` (which counts both kinds) told the user a bigger, wrong number.
2. `GET /search`'s `q` is required and non-empty, but the search page also supports pure category/district *browsing* with no text at all — a query the FTS endpoint was never designed to answer (there is nothing to rank without a query term).

### Canonical contract adopted (D-57, locked)

- **A real text query** → `GET /search?q=&type=business&category=&district=&city=&page=&limit=` via the new `searchBusinessesFts()` in `src/lib/api.ts`. `type` is a new optional `SearchQueryDto` field (`"business" | "product"`, added this phase) that restricts which CTE(s) feed the `hits` union in `SearchService.buildHitsCte` — the smallest safe backend change that resolves problem 1 without touching ranking, indexes, or the response shape for any other caller. Omitting `type` is fully backward-compatible (both kinds, as before).
- **No text query (pure browsing)** → `GET /businesses?category=&district=&city=&page=&limit=` via the existing `searchBusinesses()`, unchanged. This resolves problem 2 without loosening `SearchQueryDto`'s `q` validation or inventing a "browse mode" inside the FTS system.
- `useSearchBusinesses.ts` picks between the two based on whether `search` is a non-empty string; `SearchPage.tsx` itself required **zero changes** — it already passed the same params either way.

### Response hydration

`SearchService.hydrate()`'s business shape (`id, slug, name, description, logoUrl, ratingAvg, reviewCount, category, primaryBranch`) is close enough to `GET /businesses`' list shape that the existing `normalizeBusiness()` adapter in `lib/api.ts` handles both without modification — `rating`/`ratingAvg`, `descriptionUz`/`description`, and `district`/`city` (derived from `primaryBranch`) fallbacks already existed for exactly this kind of shape variance. Fields `GET /search` doesn't return (`isPromoted`, `isFeatured`, `hasDelivery`, `coverUrl`) come through as `undefined`, which `BusinessListCard` already treats as "unknown," not fabricated data.

### Relevance / ranking

Preserved exactly as implemented: `ts_rank` over the weighted tsvector document when the normalized query matches (`0.6 + ts_rank(...)`), falling back to trigram `word_similarity` for typo/transliteration tolerance, `GREATEST` of the two. The frontend applies **no client-side re-sort** to FTS results — the existing "Reyting bo'yicha" / "Nomi bo'yicha" sort dropdown still works exactly as before (it only re-sorts the already-fetched page, same as it did for `GET /businesses` results), and the default "no sort selected" state now shows the backend's real relevance order instead of raw insertion order.

### Visibility / security

No change needed — `SearchService`'s CTEs already filter `b.status = 'APPROVED'` / `b.deletedAt IS NULL` (business side) and `p.isActive = true` / `p.deletedAt IS NULL` plus the owning business's `APPROVED` status (product side). Verified directly in `search.service.spec.ts` by asserting these clauses are present in the generated SQL.

### Performance

No new indexes needed — the four GIN indexes from migration `20260810160018_add_search_fts_trgm` already cover both the tsvector documents and the trigram similarity lookups for businesses and products. The `type` filter is implemented by omitting the unreferenced CTE from the final `UNION ALL` rather than post-filtering, so PostgreSQL never executes the kind that wasn't requested.

### Tests

- Backend: `search.service.spec.ts` (new, 10 tests) — response contract/hydration, empty results, pagination offset/limit math, the new `type` filter (asserted against the generated SQL text for both `business` and `product`, plus the unchanged default), visibility-rule SQL assertions, category/district filter SQL assertions. `search-query.dto.spec.ts` gained 2 tests for the new `type` field's validation.
- Frontend: `useSearchBusinesses.test.ts` updated (not removed) to assert the FTS-vs-list branching by query presence; `SearchPage.test.tsx` gained a new test asserting a `?q=` URL renders via `searchBusinessesFts()` while a query-less URL still uses `searchBusinesses()`.

### Deliberately not implemented

- **Product results in the public search UI.** `GET /search` still supports `type=product` (or the mixed default) for a future caller; the public `SearchPage` always passes `type=business` because there is no product/menu-item result card. Building one was judged beyond "integrate the existing capability" and into new UI surface.
- **FTS for `CategorySearchPage`** (the food-category specialized restaurant search, D-21/D-23). It fetches up to 100 matching businesses and filters/sorts/paginates client-side by design (D-23, revisitable) with no text-search input at all today — out of scope for this phase, which targeted the generic `SearchPage` only.
- **Retrofitting i18n onto pre-existing `SearchPage`/`SearchHeader` strings.** Several UI strings (search placeholder/button, filter labels, empty-state text, the "N ta natija topildi" result count) are hardcoded Uzbek predating this phase — `search.placeholder`/`search.button` i18n keys already exist in `i18n/*.ts` but were never wired in. This is real, pre-existing tech debt (documented in `TODO.md`), not something Phase 8 introduced, and a full retrofit was judged to be "redesigning the SearchPage" rather than "integrating advanced search" — deferred rather than expanded into scope.
- **Category+district combination as a dedicated discovery surface.** `GET /search` already accepts `category`, `district`, and `city` together (all three are applied to whichever CTE is active), so this is already available through the existing generic search page's filters — no separate "combo" endpoint or page was needed or built.

---

## 26. Business claims & verification — 2026-10-01 (Phase 9)

Completed the claim lifecycle on top of a data model that already existed end-to-end: the `BusinessClaim` model + `ClaimStatus` enum (`PENDING`/`APPROVED`/`REJECTED`) were in the initial migration, and `GET /admin/claims`, `POST /admin/claims/:id/approve|reject` and `GET /me/claims` were already implemented. What was missing was any way to **create** a claim, any UI, and atomicity on approval. **No migration was needed.**

### Two things called "claim"

`/uz/claim` (`ClaimPage` / `useClaimFlow`, Phase 1) is a misnomer: it submits a **brand-new** listing through `POST /businesses`, owned by its submitter from creation (`OwnerService.createMyBusiness` sets `ownerId = user.id`). It never touches `BusinessClaim`. Phase 9's claim is the other case — a representative claiming an **existing** listing that has `ownerId = null` (seeded or admin-added). The two are deliberately kept separate, including in i18n (`claim.*` vs `businessClaim.*`, D-59).

### Lifecycle

1. **Create** — `POST /me/claims` → `OwnerService.createClaim`. Any authenticated user. Rejects: missing/deleted business (404), business not `APPROVED` (400), business already owned (409), caller already has a `PENDING` claim on it (409). Persists `status = PENDING`.
2. **Status** — `GET /me/claims` (scoped to `claimantId = caller`), shown on `ProfilePage`.
3. **Approve** — `AdminService.approveClaim`, one interactive transaction:
   - `business.updateMany({ where: { id, ownerId: null }, data: { ownerId: claimantId } })` — `count === 0` → 409, nothing else happens.
   - claim `PENDING → APPROVED` via a conditional `updateMany({ where: { id, status: PENDING } })` — `count === 0` → 409.
   - `CUSTOMER` claimant → `BUSINESS_OWNER` (higher roles untouched).
   - every other `PENDING` claim on that business → `REJECTED` (also conditional).
4. **Reject** — `AdminService.rejectClaim`: conditional `PENDING → REJECTED` with required reason; never touches `Business` or `User`.

### Concurrency (the Phase 9 audit's critical finding)

Approval originally read `business.ownerId`, checked it, then wrote — two concurrent approvals of different claims on the same business could both pass the check and the later write would win. Every state change is now a **compare-and-set** (`updateMany` with the expected current value in `WHERE`). Under Postgres, a concurrent `UPDATE` of the same row blocks on the row lock and then re-evaluates its `WHERE` against the committed row, so exactly one approval can match `ownerId IS NULL`, and exactly one approve/reject can match `status = PENDING`. Any lost race throws inside the interactive transaction, which **rolls back everything** — ownership is never assigned without the claim being `APPROVED`, and vice versa. The same mechanism closes the approve-vs-reject race on a single claim (which previously could leave a claim `REJECTED` while ownership had been granted). Ownership is assigned *before* the claim transition so the conflict most likely to occur is detected first.

### Authorization

- `OwnerController` (all `/me/*`): class-level `JwtAuthGuard` → unauthenticated `401`.
- `AdminController`: class-level `JwtAuthGuard` + `RolesGuard` + `@Roles(ADMIN)`; the claim routes have no lower override, so only `ADMIN`/`SUPER_ADMIN` pass (hierarchy floor). `MODERATOR`, `SUPPORT`, `BUSINESS_OWNER`, `CUSTOMER` → `403`. Asserted against the **real** decorator metadata in `claims.authorization.spec.ts`.
- `JwtStrategy.validate` reloads the user's role from the DB on every request, so a claimant promoted on approval gets owner access on their very next request — no stale-token window.

### Claimed ≠ verified (D-58)

Approval sets `ownerId` only. It never touches `isVerified`/`verifiedAt`/`verifiedById`; verification remains the separate admin action `POST /admin/businesses/:id/verify`, and the public "verified" badge reads `isVerified`. Owning a listing and having it vetted by the platform are different trust signals.

### Audit logging

Through the existing `AdminService.writeAudit` (`AuditLog`): approve writes `UPDATE Business` (ownerId), `APPROVE BusinessClaim`, `ROLE_CHANGE User` (when promoted) and `REJECT BusinessClaim` for each auto-rejected sibling; reject writes `REJECT BusinessClaim`. Claim **creation** is not audited — consistent with every other user self-service write in the codebase (e.g. `POST /businesses`); the claim row itself (`createdAt`, `claimantId`) is the record.

### Frontend

- `pages/business/ClaimBusinessSection.tsx` on `BusinessDetailPage`, rendered only when `ownerId` is null. Unauthenticated → opens the shared auth modal. States: idle, form, submitting (button disabled), submitted ("pending review"), error (`401` / `409` → `businessClaim.errorConflict` / network).
- `ProfilePage` "Mening da'volarim" via `useMyClaims` — per-claim `PENDING`/`APPROVED`/`REJECTED` badge; hidden when the user has no claims.
- `pages/admin/views/AdminClaimsView.tsx` — status filter, inline details, approve, reject with `window.prompt` reason (the existing `AdminBusinessesView` pattern), loading/empty/forbidden/error states, plus a "pending claims" KPI on `AdminHomeView` (from the already-existing `AdminStats.pendingClaims`). Admin views stay Uzbek-only, matching every other admin view.

### Tests

- Backend: `owner.service.spec.ts` (5), `owner.controller.spec.ts` (1), `admin.service.claims.spec.ts` (12 — includes the ownership-conflict and lost-race paths), `claims.authorization.spec.ts` (23 — real metadata, every role on every admin claim route).
- Frontend: `ClaimBusinessSection.test.tsx` (6), `AdminClaimsView.test.tsx` (10), `ProfilePage.test.tsx` (+2).

### Deliberately not implemented (non-blocking)

- **Duplicate-submission race** — `createClaim`'s "no PENDING claim by this user" check is check-then-insert; two simultaneous submissions could create two `PENDING` rows. Bounded: approving either auto-rejects the other. A partial unique index (`TODO.md`) would close it at the DB level.
- **Claim-creation audit entry** — see above.
- **`GET /admin/claims/:id`** — the list already returns full detail.
- **Pending state on the business page after reload** — the CTA reappears (the page doesn't fetch the caller's claims); a resubmit returns the 409 conflict message. Status is authoritative on `ProfilePage`.
- **Rejection reason on `ProfilePage`** — shown to admins, not yet to claimants.
- **Owner-initiated verification workflow** (documents, SMS/call) — verification is admin-initiated only.

## 27. Product & service catalog — 2026-10-01 (Phase 10)

Owners manage a real catalog; customers see it on the business page. The backend CRUD already existed (Phase 3); the owner dashboard was 100 % mock. No migration — every field used already existed on `Product`.

### Data model (unchanged)

`Product`: `businessId`, `categoryId?`, `type` (`PRODUCT` \| `SERVICE`), `name`, `slug` (unique per business, server-generated), `description`, `imageUrl`, `price` (integer so'm), `priceMax`, `currency`, `unit`, `isAvailable`, `isActive`, `sortOrder`, `deletedAt`. Two flags with different meanings:

- **`isActive`** — the **publish switch**. `false` removes the item from the public catalog, from `GET /businesses/:id`'s embedded `products`, and from product FTS (`SearchService` already filters `p.is_active = true`). Owner UI: "E'lon qilingan" / "Yashirilgan".
- **`isAvailable`** — soft "sold out"; item stays listed. Settable via PATCH, not surfaced in the owner UI this phase.

"Inventory" means this catalog — no SKU, no stock quantity (D-61, resolving D-54).

### Endpoints

| Route | Audience | Visibility |
| --- | --- | --- |
| `GET /businesses/:id/menu` | public | `APPROVED` business only (404 otherwise — **changed**); `isActive` items |
| `GET /me/businesses/:id/menu` | owner / MODERATOR+ (**new**) | any business status; all non-deleted items incl. deactivated |
| `POST /businesses/:id/menu` | owner / MODERATOR+ | + `type`, `categoryId` (**new**) |
| `PATCH /menu/:id` | owner / MODERATOR+ | + `type`, `categoryId`, `isActive` (**new**) |
| `DELETE /menu/:id` | owner / MODERATOR+ | soft delete |

The owner endpoint is a separate read, not a duplicate: once deactivation is possible a public-only list would hide an item from its own owner, and a business at `PENDING` needs its catalog filled before approval (D-62).

### Authorization

Two layers. `RolesGuard` (`@Roles(BUSINESS_OWNER, MODERATOR, ADMIN, SUPER_ADMIN)`) is a floor: `CUSTOMER` and anonymous are rejected there. The boundary is `ProductsService.assertCanManage(business, user)`: `business.ownerId === user.id` **or** role ≥ `MODERATOR`. Every write resolves the target first — `getBusinessOrThrow` for create/owner-list, `getOwnedProduct` (product → its `business`) for update/delete — so an owner cannot read, edit or delete another owner's items (403), and an unknown/soft-deleted target is 404. DTOs contain no `businessId`, and the global `ValidationPipe({ whitelist, forbidNonWhitelisted })` rejects one if sent (400), so an item can't be re-parented. `categoryId` is validated against non-deleted categories (404). Known quirk: `SUPPORT` (rank 3) clears the `BUSINESS_OWNER` floor but is stopped by the service check — tests pin both halves.

### Search compatibility

Untouched: `product_search_doc`, `search_normalize`, product FTS indexes and `GET /search?type=product` have no changes. Setting `categoryId` makes an item match the product branch's category filter (`pc.slug`); deactivating removes it from product hits via the existing `is_active` filter.

### Frontend

- **`InventoryView`** (owner dashboard): `getMyBusinesses` → business picker (only shown with >1 business) → `useAdminResource(getMyBusinessMenu)`. KPIs: total / published / services. States: loading skeleton, no-business, empty, forbidden (403), error with retry. Create/edit through `ProductModal`; inline publish/hide toggle and two-step delete in `ProductRow`; photo uploads first via `uploadImage`, then the item is saved with the returned URL. Save errors stay inside the modal. Uzbek-only, like every other dashboard view.
- **`ProductModal`/`ProductRow`** rebuilt on real fields — name, type, category (real `GET /categories`), price, description, photo, published.
- **`MenuSection`** (business detail page, customer): already used the real public endpoint; now distinguishes a **failed** request (new `menuLoadFailed` error state + retry, localized uz/ru/en) from a genuinely **empty** menu, which it previously conflated.
- `src/pages/dashboard/mockData.ts` deleted.

### Tests

- Backend: `products.service.spec.ts` (19 — public/owner visibility, cross-owner 403, MODERATOR allowed, SUPPORT non-owner 403, category validation, slug suffixing, partial PATCH, soft delete), `catalog.authorization.spec.ts` (32 — real decorator metadata, every role on every catalog route).
- Frontend: `InventoryView.test.tsx` (16), `MenuSection.test.tsx` (8).

### Deliberately not implemented

- **`catalogEnabled` gate on the menu endpoint.** `GET /businesses/:id` hides embedded products when `BusinessType.catalogEnabled` is false; `GET /businesses/:id/menu` does not check it. Aligning them would visibly hide existing catalogs — left for a product decision.
- **Reordering (`sortOrder`), `priceMax`/`unit`/`currency`, `isAvailable` toggle** in the owner UI — supported by the schema, not requested.
- **Product hits in public search UI** — still deferred (Phase 8).
- **Edit/hide in the inline `MenuSection` owner controls** — the business page keeps its existing add/delete shortcut; full management lives in the dashboard.

## 28. Admin business operations — 2026-10-01 (Phase 11)

Completes the admin business-operations layer on top of what already existed. Claims (Phase 9) and review moderation (Phase 6) were audited and needed no change. No migration.

### Audit summary

| Capability | Before Phase 11 | After |
| --- | --- | --- |
| Verify | `POST …/verify`, no reversal, no UI | + `POST …/unverify`; UI grant/revoke |
| Suspend | `POST …/suspend` from **any** status, one-way, no UI | APPROVED-only; + `POST …/unsuspend`; UI suspend/restore |
| Promote | `POST …/promote`, no reversal, no UI | + `POST …/unpromote`; UI start/end |
| Hide (SUPER_ADMIN) | `PATCH …/hide`, no reversal, no UI | unchanged — deferred (D-63) |
| Featured | read-only flag, no admin route | unchanged — not invented (D-66) |
| Review reports | list/resolve endpoints; nothing creates reports; DISMISS stored `RESOLVED` | DISMISS → `DISMISSED`; UI deferred (D-65) |
| Claims | complete (Phase 9) | unchanged |

### State machine (business status)

```
PENDING ──approve (MODERATOR+)──▶ APPROVED ──suspend (ADMIN+, reason)──▶ SUSPENDED
   │                                  ▲                                     │
   └──reject (MODERATOR+)──▶ REJECTED └────────unsuspend (ADMIN+)───────────┘
any ──hide (SUPER_ADMIN)──▶ HIDDEN   (no route back — deferred)
```

`isVerified` and `isPromoted` are orthogonal flags, not statuses. Suspend/unsuspend are compare-and-set (`updateMany` with the expected status in `WHERE`, `count === 0 → 409`), the same technique as claims (D-60). The APPROVED-only precondition on suspend is what makes `unsuspend → APPROVED` safe: it can never approve a PENDING listing or reverse a SUPER_ADMIN hide (D-63). Unverify keeps `verifiedAt`/`verifiedById` because `approveBusiness` also writes them as the approval record (D-64). Every operation writes an `AuditLog` row in the same transaction (`SUSPEND`, `RESTORE`, or `UPDATE`).

### Authorization

Unchanged architecture: class-level `JwtAuthGuard + RolesGuard + @Roles(ADMIN)` on `AdminController`; the three new reversal routes add no override, so they share the ADMIN floor of the action they undo. `business-ops.authorization.spec.ts` checks the real decorator metadata for every business-ops and report route against all six roles (+ anonymous): approve/reject → MODERATOR+, hide → SUPER_ADMIN, everything else → ADMIN+; `BUSINESS_OWNER`, `CUSTOMER` and `SUPPORT` are denied everywhere. The frontend admin shell is additionally gated to ADMIN+ (`isAdmin`), but that is convenience only — every mutation is enforced server-side.

### Frontend (`AdminBusinessesView`)

- Status filter moved server-side (`?status=`), with every `BusinessStatus` value, so suspended/hidden businesses beyond the first page are reachable; page resets to 1 on change. Name search and category filter remain client-side over the current page (pre-existing).
- Per-row actions by state: PENDING → approve/reject (unchanged); APPROVED → verify, suspend (reason prompt), promote (date prompt, end of chosen local day), public-page link; SUSPENDED → restore; any verified row → revoke verification; any promoted row → end promotion. Revocations ask for confirmation. Errors (incl. backend 409 messages) surface as a toast; success reloads the list.
- Badges: "Verifikatsiyalangan", "Reklama · <date> gacha", suspension reason, plus SUSPENDED/HIDDEN/DRAFT status labels (`statusLabels.tsx`).
- Removed the dead "O'chirish" button (there is no admin business-delete endpoint); "Ko'rish" now links to the public page for APPROVED listings.
- Uses the existing `window.prompt`/`confirm` pattern from reject; Uzbek-only like every admin view.

### Tests

- Backend: `admin.service.business-ops.spec.ts` (31 — every transition, 404, 409 for every invalid source status, compare-and-set loss, past promotion date, report DISMISS/HIDE_REVIEW/double-resolve/404); `business-ops.authorization.spec.ts` (100).
- Frontend: `AdminBusinessesView.test.tsx` (16 — load, server-side filter, empty, forbidden, error, per-state actions, verify/unverify, suspend/cancel/restore, 409 toast, promote/invalid date/unpromote).

### Deliberately not implemented

- **Unhide / hide UI** — restore target undecided (D-63).
- **Admin reports view, user-side "report review"** — queue has no producer; would be a new reporting system (D-65).
- **`isFeatured` admin control** — new endpoint (D-66).
- **Expired promotions still sort first in `GET /businesses`** (`orderBy isPromoted desc` ignores `promotedUntil`, unlike `/businesses/promoted`). A ranking change — out of scope; `unpromote` lets an admin clear a stale flag.
- **MODERATOR access to the admin UI** — the backend lets MODERATOR approve/reject businesses, but the frontend admin shell is ADMIN-only (pre-existing).
- **User suspend/activate UI** — endpoints exist; user operations were not in Phase 11's business scope.

### Deployment (2026-10-01)

- Backend: Railway deployment `f0361a31-0d78-4660-84a8-204700eeeac0` serving `ce7ec66` (= `337fd6e` + the `nixpacks.toml` build fix, D-67). Two earlier attempts at `337fd6e` (`e8ec6579`, `a8d0d6f8`) failed at image build with `nest: not found`; production stayed on the previous image throughout.
- Pushes still do **not** auto-deploy: Railway's source config keeps losing its branch, and each deploy was triggered by reconnecting the service to `main`. Installing/re-authorizing the Railway GitHub App for `my-andijan-api` is an outstanding owner action.
- Frontend: Vercel serves `c23b8ef` (bundle `index-BYDIYvrS.js` identical to the local build).
- Production smoke: every business-ops, claims and reports admin route returns `401` anonymously and with an invalid token; public endpoints (`/businesses`, `/businesses/promoted`, `/businesses/featured`, `/search`, `/categories`, `/geography/regions`, `/events`, public menu) unchanged; OpenAPI lists the three new routes. No production data was read or written through admin routes.

## 29. Moderation inputs — review reports — 2026-10-01 (Phase 12)

Closes the loop the Phase 11 audit found open: the admin report endpoints existed but nothing produced reports. No migration — `ReviewReport`, `ReportReason`, `ReportStatus` and `Review.reportCount` all already existed.

**Flow.** Customer clicks "Shikoyat qilish" on a review (`ReviewsSection` → `ReportReview`) → signed-out: shared auth modal; signed-in: reason (`ReportReason`) + optional note → `POST /reviews/:id/report` → `ReviewReport{status: PENDING}` + `reportCount++` (one transaction) → appears in `AdminReportsView` (default filter PENDING) → ADMIN+ picks **hide review** (`HIDE_REVIEW` → report RESOLVED, review HIDDEN, aggregates recalculated) or **dismiss** (`DISMISS` → report DISMISSED), each with an optional note.

**Rules (D-70).** Authenticated, no role floor (same as writing a review). Only publicly visible reviews are reportable (PUBLISHED, not deleted, live branch of an APPROVED business) → else 404. `@@unique([reviewId, reporterId])` → 409 on a repeat, which the UI shows as "already reported", not as an error. The reporter is never returned to the reporting client. Moderation stays ADMIN-floor; an already-handled report is 409 and the admin list refreshes.

**Moderator access — deferred (D-68).** MODERATOR's only admin rights are business approve/reject; every admin list is ADMIN-only, so a moderator panel would have nothing to show. The frontend gate stays ADMIN+, now pinned by `AdminDashboard.access.test.tsx`; widening moderator reads needs a product decision.

**Unhide — deferred (D-69).** Hide accepts any status and the prior status is only in audit-log JSON; three concrete restore rules are listed for decision.

**Tests.** Backend `reviews.report.spec.ts` (16: creation + reportCount, response omits reporter, visibility filter, 404, 409 duplicate, unexpected-error rethrow, DTO validation for every reason/missing/unknown/note length, guard metadata = JwtAuthGuard only, no role floor). Report moderation authorization (ADMIN floor; MODERATOR/SUPPORT/BUSINESS_OWNER/CUSTOMER/anonymous denied) remains pinned by `business-ops.authorization.spec.ts`. Frontend: `ReviewReport.test.tsx` (9), `AdminReportsView.test.tsx` (11), `AdminDashboard.access.test.tsx` (6).
