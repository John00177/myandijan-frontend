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
| Products | 4 | `/businesses/:id/menu`, `/menu/:id` |
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

The most technically substantial part of the backend — and currently unused by the frontend.

**Migration `20260810160018_add_search_fts_trgm`** creates:

- `CREATE EXTENSION IF NOT EXISTS pg_trgm`
- `public.search_normalize(text)` — transliteration folding for Uzbek Latin/Cyrillic variants
- `public.business_search_doc(name, description)` and `public.product_search_doc(name)` — tsvector builders
- `public.search_tsquery(q)` — query builder
- Four indexes: `businesses_search_doc_idx`, `businesses_name_trgm_idx`, `products_search_doc_idx`, `products_name_trgm_idx`

**`SearchService`** builds one CTE (`buildHitsCte`) and splices it into two parallel raw queries — a paged `SELECT` and a `count(*)` — so page and count always agree. It ranks businesses **and** products in a single unified result set (`kind: 'BUSINESS' | 'PRODUCT'`), then hydrates. Category filtering for a product matches through its own category or, when it has none, through its business's category. Geographic filtering is applied per-kind via a shared `geoClause`. The response exposes `normalizedQuery` so callers can see what the query folded down to.

**Frontend search is separate and simpler.** It calls `GET /businesses` with filter params, and for the food category (`?category=oziq-ovqat`) `SearchPage` dispatches to `CategorySearchPage`, which fetches `limit=100` and does filtering, sorting and pagination **client-side** (`PAGE_SIZE = 12`) so the displayed count and the current page always agree.

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
- **Dead code in `lib/api.ts`:** `register` (signup uses OTP instead), `getUserAnalytics`, `updateAdminBusiness`, `updateMenuItem`, `replyToReview`'s underlying `POST /reviews/:id/reply` (the PATCH alias is what's actually called) are exported but never imported anywhere.

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

- **Owner "Inventory" management (`InventoryView`).** The mock `Product` type carries `sku` and `quantity` (stock-keeping fields); the real backend's menu/catalog model (`GET/POST /businesses/:id/menu`) has neither — it's a simple name/description/price/photo/availability catalog, with no stock concept at all. Wiring `InventoryView` to the real API as-is would silently drop SKU/quantity from the UI, reframing "inventory management" as "menu management." Building stock tracking for real would need new schema fields. **This needs a decision: is "Inventory" meant to be warehouse/stock tracking (new schema work) or the existing menu/catalog concept (drop SKU/quantity from the UI)?** Not implemented either way.
- **Admin review moderation (`GET /admin/reviews` doesn't exist).** Building it would be a genuine new backend route, not just a frontend connection — reasonable in scope, but deprioritized this phase in favor of the three items above to keep the batch small and verifiable in one pass. Flagged as the top candidate for the next batch, not blocked by ambiguity.
- **Admin claims moderation UI.** Skipped for the same reason as Phase 4: no endpoint anywhere creates a `BusinessClaim` row, so a moderation queue would always be empty.
