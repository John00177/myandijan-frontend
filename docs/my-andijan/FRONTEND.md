# FRONTEND — My Andijan

> `myandijan-frontend` at `HEAD = dd08485`. 168 source files, 132 `.tsx` components. Documented 2026-09-28.

---

## 1. Pages & routes

Every user-facing route is language-prefixed: `/:lang/...` where `lang ∈ {uz, ru, en}`. `/` redirects to `/uz`.

| Route | Component | In `Layout`? | Lazy | Notes |
| --- | --- | --- | --- | --- |
| `/` | — | — | — | `<Navigate to="/uz" replace />` |
| `/:lang` | `HomePage` | ✔ | ✔ | index route |
| `/:lang/search` | `SearchPage` | ✔ | ✔ | **dispatcher** — see §1.1 |
| `/:lang/business/:slug` | `BusinessDetailPage` | ✔ | ✔ | |
| `/:lang/events` | `EventsPage` | ✔ | ✔ | list only; no detail page exists |
| `/:lang/favorites` | `FavoritesPage` | ✔ | ✔ | auth-gated via `useRequireAuth` |
| `/:lang/profile` | `ProfilePage` | ✔ | ✔ | auth-gated |
| `/:lang/pricing` | `PricingPage` | ✔ | ✔ | **not in production** |
| `/:lang/signup` | `SignupPage` | ✔ | ✔ | **not in production** |
| `/:lang/claim` | `ClaimPage` | ✔ | ✔ | **not in production** |
| `/:lang/business/claim` | redirect | ✔ | — | → `/:lang/claim` |
| `/:lang/register` | redirect | ✔ | — | → `/:lang/signup` |
| `/:lang/dashboard` | `OwnerDashboard` | ✗ | ✔ | own shell |
| `/:lang/dashboard/business/new` | `AddBusinessPage` | ✗ | ✔ | |
| `/:lang/dashboard/business/:id/edit` | redirect | ✗ | — | → dashboard with `state.view = "businesses"`; kept for old bookmarks |
| `/:lang/admin` | `AdminDashboard` | ✗ | ✔ | own shell |

**There is no 404 route.** An unmatched path under `/:lang` renders nothing inside `Layout`.

### 1.1 The `SearchPage` dispatcher

`SearchPage` is a router, not a page:

```tsx
export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";
  if (category === FOOD_CATEGORY_SLUG) return <CategorySearchPage />;
  return <GenericSearchPage />;
}
```

`FOOD_CATEGORY_SLUG = "oziq-ovqat"` (`src/lib/foodCategory.ts`). `CategorySearchPage` fetches `limit=100` and does filtering, sorting and pagination **client-side** (`PAGE_SIZE = 12`) so the result count and the current page always agree. This is the restaurant-specific experience, and it **is** live in production.

### 1.2 Dashboards are view-switchers, not nested routes

`OwnerDashboard` and `AdminDashboard` each render one shell and swap an internal `view`. Consequences: dashboard sub-views are **not deep-linkable**, and back/forward does not move between them.

- **Owner views (8):** `DashboardHomeView`, `MyBusinessesView`, `ReviewsView`, `EventsView`, `InventoryView`, `AdsView`, `PremiumView`, `SettingsView`
- **Admin views (10):** `AdminHomeView`, `AdminBusinessesView`, `AdminCategoriesView`, `AdminRegionsView`, `AdminUsersView`, `AdminReviewsView`, `AdminEventsView`, `AdminAuditLogsView`, `AnalyticsView`, `AdminSettingsView`

---

## 2. Component inventory

### 2.1 `components/ui/` — primitives
`Badge`, `Button`, `Card`, `EmptyState`, `Skeleton`, `Header`, `Footer`, `MobileNav`

### 2.2 `components/` — structural
| Component | Role |
| --- | --- |
| `LangShell` | Provides `LanguageProvider` **and the app's single `AuthModal` instance** for everything under `/:lang` |
| `Layout` | Header + footer + mobile bottom nav + the site's only `Suspense` boundary |
| `LazyRouteShell` (in `App.tsx`) | A second `Suspense` for dashboard/admin, which sit outside `Layout` |
| `ErrorBoundary` | Class component at the app root; detects chunk-load failures and offers reload |
| `RouteFallback` | Suspense fallback |
| `PageTransition`, `AnimatedCard`, `StaggerContainer` | Motion wrappers |
| `SafeScrollReveal` | Scroll-reveal **with a 3000 ms watchdog** against animation callbacks that never fire |

### 2.3 `components/auth/`
`AuthModal` (login + forgot-password tabs; register tab now navigates to `/signup`), `LoginForm`, `ForgotPasswordFlow`, `OtpInput`

**`OtpInput` is the most carefully built input in the app** — 6 segmented boxes, auto-advance, full-code paste fills all six, backspace clears then walks back, arrow-key navigation, `autoComplete="one-time-code"` for the WebOTP API, error shake keyed on `error ? "otp-error" : "otp-idle"`, and `prefers-reduced-motion` respected. It was **upgraded in place and kept API-compatible** so `ForgotPasswordFlow` continued to work unchanged.

### 2.4 `components/business/`
`EditBusinessModal` (the single edit surface for both owner and admin contexts), `OpenNowBadge`, `ReviewForm`, `SocialLinks`

### 2.5 `components/premium/` — monetization UI
`PremiumBadge`, `FeaturedListingCard`, `PlanCard`, `UpgradeModal`, `TrafficChart`, `Sparkline`, `PhotoGalleryManager`, `EditorsPickCarousel`

### 2.6 `components/search/`
`RestaurantCard`, `CuisineChips`, `FilterPills`, `SortDropdown`

### 2.7 `components/seo/`
`MetaTags`, `JsonLd` — see `SEO.md`

### 2.8 `components/claim/` and `components/profile/`
`BusinessPreview` — composes `HeroImage` + `BusinessInfoHeader` from a synthesized `Business` object. **Deliberately does NOT reuse `BusinessDetailPage`**, despite the spec asking for that, because the page fetches its own data. `AvatarPicker`, `ProfileCompletionBanner`.

### 2.9 Page-local components
- `pages/home/`: `HeroSection`, `CategoriesSection`, `DistrictsSection`, `FeaturedBusinesses`, `StatsStrip`, `UsefulServices`, `CtaBanner`
- `pages/business/`: `HeroImage`, `BusinessInfoHeader`, `DescriptionSection`, `MenuSection`, `ReviewsSection`, `BranchesSection`, `SimilarBusinesses`, `ActionButtons`, `ContactCTA`
- `pages/search/`: `SearchHeader`, `SearchMap`, `BusinessListCard`, `FilterSelect`, `Pagination`, `CategorySearchPage`
- `pages/signup/`: `PhoneScreen`, `OtpScreen`, `ProfileScreen`
- `pages/claim/`: `StepShell` + 8 steps
- `pages/dashboard/`: `DashboardLayout`, `Sidebar`, `TopBar`, `MobileDrawer`, `KpiCard`, `ProductModal`, `ProductRow`, `addBusiness/` (`Step1BasicInfo`, `Step2Location`, `Step3Hours`, `StepIndicator`, `FormField`)
- `pages/admin/`: `AdminLayout`, `AdminSidebar`, `AdminTopBar`, `AdminMobileDrawer`, `DataTable`, `CategoryModal`, `BusinessReviewDrawer`, `AdminFetchState`, `statusLabels`, `auditFormat`, `charts/ChartCard`

---

## 3. Layouts

Three distinct shells:

1. **`Layout`** — marketing/consumer chrome: `Header`, `Footer`, `MobileNav` (bottom bar on small screens), plus the site's only `Suspense`.
2. **`DashboardLayout`** — `Sidebar` (desktop) / `MobileDrawer` (mobile) + `TopBar`.
3. **`AdminLayout`** — `AdminSidebar` / `AdminMobileDrawer` + `AdminTopBar`.

Dashboards are **siblings** of `Layout`, not children, so they never inherit the marketing header/footer/bottom-nav.

---

## 4. Navigation

- `Header`: logo, search entry, language switcher, auth entry point
- `MobileNav`: fixed bottom bar, primary destinations
- `Footer`: secondary links
- **Language switching** (`LanguageContext.setLang`) rewrites the first path segment and **preserves the rest of the path and the query string**, then persists the choice to `localStorage` under `myandijan_lang`. So switching language on `/uz/search?category=oziq-ovqat` lands on `/ru/search?category=oziq-ovqat`.
- Legacy-path redirects: `/register` → `/signup`, `/business/claim` → `/claim`, `/dashboard/business/:id/edit` → `/dashboard`.

---

## 5. Forms

No form library. Every form is `useState` + hand-rolled validation.

| Form | Location | Notes |
| --- | --- | --- |
| Login | `LoginForm` | phone + password |
| Forgot password | `ForgotPasswordFlow` | phone → code → new password; reuses `OtpInput` |
| Signup (3 steps) | `pages/signup/*` via `useSignup` | steps `phone \| otp \| profile \| success`; `OTP_LENGTH = 6`, `RESEND_COOLDOWN_SECONDS = 45`; **account is created at the OTP step**, so step 3 is genuinely skippable |
| Claim (8 steps) | `pages/claim/steps/*` via `useClaimFlow` | one field per screen, **no progress bar**, Skip on optional steps, live preview |
| Add business (3 steps) | `pages/dashboard/addBusiness/*` | `StepIndicator` **is** shown here — unlike signup/claim |
| Edit business | `EditBusinessModal` | details + 7-day hours grid; saves via `PATCH /businesses/:id` and `PUT /businesses/:id/hours` |
| Review | `ReviewForm` | rating + title + comment + photos |
| Menu item | `ProductModal` | name, price, description, photo |
| Category | `CategoryModal` (admin) | localized name triples, icon, colour |
| Profile | `ProfilePage` | name, age, gender, avatar |
| **Admin settings** | `AdminSettingsView` | **⚠ pure `useState`, no endpoint, persists nothing** |
| **Dashboard settings** | `dashboard/views/SettingsView` | **⚠ local hours form, persists nothing** |

`StepShell` (claim) exports `FIELD_CLASSES` so every step's input is styled identically.

---

## 6. State management

**No state library.** Three layers:

1. **`AuthContext`** — `user`, `token`, `isOwner`/`isAdmin`/`isSuperAdmin`, `login`/`register`/`logout`/`updateUser`, and the auth-modal open/close state. Backed by `localStorage` (`myandijan_token`, `myandijan_user`).

   Two subtleties worth preserving:
   - **`writeSeqRef`** — a ref bumped on every local authoritative write. The mount-time `getMe()` reads it before starting and compares on resolve; if a save landed in between, the response is stale and is **dropped**. This is the actual fix for the profile-completion banner resurfacing. A ref, not state, deliberately: bumping it must never trigger a render.
   - **401 handling** — `api.ts` clears storage and fires `SESSION_EXPIRED_EVENT`; `AuthContext` listens and clears React state, so the UI stops showing a logged-in user the moment the session dies. On any *other* failure (offline, 5xx) the cached user is kept rather than blanked.

2. **`LanguageContext`** — `lang`, `setLang`, `t`. `lang` resolves from the URL param first, then `localStorage`, then `"uz"`.

3. **Hooks** — 14 of them, each owning its own fetch + loading + error state:
   `useBusiness`, `useSearchBusinesses`, `useFeaturedBusinesses`, `useCategories`, `useRegions`, `useEvents`, `useFavorites`, `useClaimFlow`, `useSignup`, `useAdminResource`, `useRequireAuth`, `useDebouncedValue`, `useMediaQuery`.

   **`useAdminResource`** is the shared fetch/loading/error wrapper behind every real admin view, paired with `AdminFetchState` for rendering.

**There is no client-side cache.** Every mount refetches. No deduplication, no background revalidation.

---

## 7. API integration

All traffic goes through **`src/lib/api.ts`** — see `ARCHITECTURE.md` §7 for the mechanics. Frontend-side essentials:

- Base URL: `VITE_API_URL` with a **hardcoded production fallback**, so a missing env var silently points at production.
- 10 s timeout for JSON, 30 s for uploads.
- `normalizeBusiness()` / `normalizeBranch()` adapt the API's non-localized `Business`/`Branch` shape, lift `phone`/`address` up from `branches[0]`, and coerce string ratings to numbers.
- `ApiError.status` lets callers treat `404` as "not launched yet" rather than a real failure — a pattern several wrappers still rely on.
- `normalizeAdminList()` accepts either a bare array or a `{data, meta}` envelope.

> **Several comments in `api.ts` are now wrong** — they assert that password reset, `POST /businesses`, `/admin/audit-logs` and `/admin/reviews` are 404. See `CURRENT_STATE.md` §5 and `API.md`. Read the API's controllers, not these comments.

---

## 8. Authentication UI

- One `AuthModal` for the whole app, owned by `LangShell`, opened via `AuthContext.openAuthModal()`.
- `useRequireAuth` guards `FavoritesPage` and `ProfilePage`.
- Role gating is client-side only, mirroring the backend hierarchy (`isOwner` = `BUSINESS_OWNER|ADMIN|SUPER_ADMIN`, `isAdmin` = `ADMIN|SUPER_ADMIN`). The real enforcement is server-side.
- `ProfileCompletionBanner` nudges users to finish their profile. It is rendered from `Layout` with a `key` derived from the user's fields so it re-evaluates on save. **Note: `src/lib/profileCompletion.ts` was written to be the shared source of truth for this logic — its own header says it exists because "ProfileCompletionBanner [had it] while ProfilePage had no notion of it at all" — but the banner never imports it. The extraction was written and never wired in, so the module is dead code.** See the dead-code findings in `HANDOFF_INDEX.md`.
- Signup is a **full page**, not a modal — the modal's register tab now closes itself and navigates to `/:lang/signup`. `RegisterForm.tsx` was deleted.

---

## 9. Business listing UI

**Detail page** (`BusinessDetailPage`) composes: `HeroImage` → `BusinessInfoHeader` (name, rating, verified/premium badges, `OpenNowBadge`) → `ActionButtons` (call / directions / favourite / share) → `DescriptionSection` → `MenuSection` → `ReviewsSection` → `BranchesSection` → `SimilarBusinesses` → `ContactCTA`, plus `MetaTags` and `JsonLd`.

**Cards:** `BusinessListCard` (generic search), `RestaurantCard` (food category), `FeaturedListingCard` (premium).

**Editing:** `EditBusinessModal` in place from `MyBusinessesView` — which is why the `/dashboard/business/:id/edit` route is now a redirect.

**`src/lib/categoryVisuals.ts`** maps categories to icon + colour treatments so cards stay visually consistent.

---

## 10. Search UI

**Generic:** `SearchHeader` (query input + `useDebouncedValue`), `FilterSelect` (category/district/city), `BusinessListCard` list, `SearchMap`, `Pagination`.

**Restaurant (`CategorySearchPage`):** `CuisineChips` (6 cuisines), `FilterPills` (price / delivery / rating ≥4.5 / open now), `SortDropdown`, `RestaurantCard` grid, client-side filter+sort+paginate at 12 per page.

> **`src/lib/restaurantMock.ts` supplies invented display data.** `CUISINE_SLUGS`, `PRICE_BUCKETS`, `TAG_POOL` and `getRestaurantDisplayData(business)` derive cuisine, price bucket, tags and delivery time **deterministically from `business.id`** via the fractional part of `Math.sin(id * k)`. Stable across reloads, and honestly labelled in code — but **restaurant cards in production display cuisine, price and delivery information the API never provided.** Replacing this requires real backend fields.

---

## 11. Map UI

`src/pages/search/SearchMap.tsx` — Leaflet + React Leaflet, loaded only on `/search`.

- Markers are Leaflet `divIcon`s. **`escapeHtml()` is applied to all API-sourced text before interpolation** — `divIcon` takes raw HTML, so this is a real XSS fix, not defensive decoration.
- `pinTier()` styles pins gold vs grey by promotion tier.
- No clustering, no radius search, no distance sorting (no PostGIS server-side).
- Tile provider: **UNKNOWN** — not inspected in this pass.

---

## 12. Review UI

- `ReviewsSection` on the detail page; `ReviewForm` to submit (rating, title, comment, photos).
- Owner replies from `dashboard/views/ReviewsView` via `POST /me/reviews/:id/reply`.
- **Admin review moderation is mock** (`adminMockData.ts`) because no `GET /admin/reviews` exists.
- **No report-a-review UI**, although `ReviewReport` and `POST /admin/reports/:id/resolve` both exist server-side.

---

## 13. Admin UI

| View | Data source |
| --- | --- |
| `AdminHomeView` | real — `getAdminStats`, `getAdminAuditLogs` |
| `AdminBusinessesView` | real — list / approve / reject / edit / edit-branch; PENDING listings open `BusinessReviewDrawer` (submitted details from the list row + a validated rejection-reason form, replacing `window.prompt`) — Phase 16E. Since 16E.5 the drawer also fetches `GET /admin/businesses/:id` for every branch's hours, photos and coordinates, and the admin edit modal prefills from it (`getAdminBusinessEditDetail`, any status; falls back to `GET /businesses/:id` only on a 404 — the route not deployed yet) |
| `AdminCategoriesView` | real — list / create / update (+`CategoryModal`) |
| `AdminUsersView` | real — `getAdminUsers` |
| `AdminEventsView` | real — `getAdminEvents` |
| `AdminAuditLogsView` | real — `getAdminAuditLogs` (+`auditFormat`) |
| `AnalyticsView` | real — `getUserAnalytics`, `getDashboardAnalytics` (+ `recharts`, `useMediaQuery`) |
| `AdminRegionsView` | real, but reads the **public** `/geography/regions` — no admin token needed |
| **`AdminReviewsView`** | **mock** (`adminMockData.ts`) |
| **`AdminSettingsView`** | **local `useState` only — saves nothing** |

Shared: `DataTable`, `AdminFetchState`, `statusLabels`, `charts/ChartCard`.

> **20 of the 31 admin endpoints have no UI** — claims, reports, review hide/restore, verify, suspend, promote, event approve/reject, category delete/reorder, district/city editing, user suspend/activate. The admin dashboard is a fraction of the moderation capability that exists.

---

## 14. Responsive behaviour

**Mobile-first**, Tailwind default breakpoints.

| Prefix | Uses |
| --- | --- |
| `sm:` | 88 |
| `lg:` | 48 |
| `md:` | 38 |
| `xl:` / `2xl:` | **0** |

So layouts are designed for phone → tablet → laptop, with **nothing above `lg` (1024px)**. On very wide screens the layout simply stops adapting.

Patterns:
- Bottom nav (`MobileNav`) on small screens; `Header` nav above
- Sidebar ⇄ drawer swap in both dashboards (`MobileDrawer`, `AdminMobileDrawer`)
- Claim page: `grid lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]`, preview `lg:sticky lg:top-24`; single column below `lg`
- **iOS zoom prevention:** inputs use 16px (`text-base`), since Safari zooms on focus for anything smaller
- `useMediaQuery` is used in exactly one place (`AnalyticsView`) — responsiveness is otherwise pure CSS

**The mobile verification pass at 375px was queued and never run** — no horizontal overflow, bottom nav visible, no iOS zoom.

---

## 15. Important reusable components

If you change one of these, check every consumer:

| Component / module | Why it matters |
| --- | --- |
| `src/lib/api.ts` | Every network call. Holds the normalisation layer and centralised 401 handling. |
| `AuthContext` | Session truth for the whole app, including the stale-response guard. |
| `LanguageContext` + `src/i18n/*` | `uz` is the compiler-enforced source of truth; adding a key there breaks the build until `ru` and `en` follow. |
| `MetaTags` / `JsonLd` | All SEO output. |
| `OtpInput` | Shared by signup **and** forgot-password. Its API was deliberately kept stable. |
| `EditBusinessModal` | Single edit surface for owner and admin. |
| `StepShell` + `FIELD_CLASSES` | Consistency across all 8 claim steps. |
| `useAdminResource` + `AdminFetchState` | Fetch/loading/error for every real admin view. |
| `Button`, `Card`, `Badge`, `EmptyState`, `Skeleton` | The primitive vocabulary. |
| `src/lib/premium.ts` | `PlanId`, `PLANS`, `PAYMENT_METHODS`, `YEARLY_DISCOUNT`, `getBusinessPremium()`, `comparePremiumPriority()` — all monetization logic. |
| `src/lib/phone.ts` | `digitsOf`, `formatNational`, `isValidUzPhone`, `toE164(input, {pretty})`, `UZ_NATIONAL_LENGTH = 9`. |
| `src/lib/localize.ts` | `localizedName()` — picks the right `name{Uz,Ru,En}`. |

---

## 16. Current UX issues

Ordered by user impact.

1. **Sessions expire after ~15 minutes with no refresh.** A user filling in the 8-step claim flow can be silently logged out mid-flow and lose the submission.
2. **OTP codes never arrive.** The signup flow shows "Kod yuborildi" and then cannot be completed by a real user.
3. **Two settings forms accept input, show success, and save nothing.**
4. **Dashboard sub-views are not deep-linkable**, and the browser back button does not move between them.
5. **No 404 page.** A mistyped URL renders an empty `Layout`.
6. **Restaurant cards show invented cuisine, price and delivery data.** Deterministic and stable, but not true.
7. **Inventory shows "Demo" mock rows** while a working menu API exists.
8. **`AddBusinessPage` shows a step indicator; signup and claim deliberately do not.** Inconsistent, and the inconsistency is undocumented in the UI.
9. **Home hero shows placeholder weather** (`HeroSection.tsx:30`).
10. **Claim flow cannot show claim status** — `GET /me/claims` exists but nothing calls it, so after submitting there is no way to see what happened.
11. **Social login buttons are prominent and non-functional** — they sit *above* the phone field, so they are the first thing a user sees.
12. **No events detail page and no RSVP UI**, though both endpoints exist.
13. **HEIC uploads pass the client check and fail server-side** — `api.ts` allows `image/heic`/`image/heif`, the server does not. iPhone photos hit a 400.
14. **Nothing above `lg`** — very wide screens get no layout benefit.

---

## 17. Current UI design system

Dark-first. Full token table in `DESIGN_SYSTEM.md`. In brief:

- **Base palette:** `base #0B1120` (page), `surface #111827`, `card #1E293B`, `elevated #243447`, with `border rgba(255,255,255,0.08)`
- **Text:** `ink #F8FAFC`, `ink-body #CBD5E1`, `ink-muted #94A3B8`
- **Accents:** `primary #3B82F6`, `accent #06B6D4`, `secondary #8B5CF6`, `success #10B981`, `warning #F59E0B`, `danger #EF4444`
- **Monetization accents:** `gold #FFD700`, `gold-deep #B8860B`, `silver #C0C7D0`, `bronze #CD7F32`, plus `navy #1A3A5C` and `brand-green #2E7D32`
- **Type:** Inter → `system-ui` → `sans-serif`
- **Radii:** `card 16px`, `btn 12px`, `badge 999px`
- **Shadow:** one `card` token combining an outer drop shadow with an inset top highlight
- **Motion:** Framer Motion under `MotionConfig reducedMotion="user"`, so every animation honours `prefers-reduced-motion` without per-component opt-in
- **Icons:** `lucide-react`; `Category.icon` stores lucide icon names, so the backend chooses the icon
- `html { color-scheme: dark }` and an explicit `body` background — **there is no light theme**
