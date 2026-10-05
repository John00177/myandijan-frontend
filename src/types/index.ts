export type Lang = "uz" | "ru" | "en";

export interface City {
  id: number;
  regionId: number;
  districtId: number | null;
  isRegionLevel: boolean;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
  lat: number | null;
  lng: number | null;
}

export interface District {
  id: number;
  regionId: number;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
  lat: number | null;
  lng: number | null;
  cities: City[];
  businessCount?: number;
}

export interface Region {
  id: number;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
  lat: number | null;
  lng: number | null;
  districts: District[];
}

export interface Category {
  id: number;
  parentId: number | null;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  descriptionUz: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
  icon: string | null;
  colorHex: string | null;
  imageUrl: string | null;
  isActive: boolean;
  showOnHomepage: boolean;
  allowBusiness: boolean;
  sortOrder: number;
  children: Category[];
  businessCount?: number;
}

export interface BusinessHours {
  day: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export interface Branch {
  id: number;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  address: string | null;
  phone: string | null;
  lat?: number | null;
  lng?: number | null;
  hours?: BusinessHours[];
}

export interface ReviewReply {
  id: number;
  body: string;
  createdAt: string;
  author?: { id: number; fullName: string } | null;
}

// Real GET /businesses/:id shape (see ReviewsService's REVIEW_INCLUDE on the
// backend) — user.fullName/comment/photos, not authorName/text, and reply is
// a nested ReviewReply, not a flat string.
export interface Review {
  id: number;
  rating: number;
  title?: string | null;
  comment: string;
  photos?: string[];
  createdAt: string;
  user?: { id: number; fullName: string; avatarUrl?: string | null } | null;
  reply?: ReviewReply | null;
}

/** Prisma ReportReason enum — the reasons a customer can pick when reporting a review. */
export const REPORT_REASONS = ["SPAM", "OFFENSIVE", "FAKE", "IRRELEVANT", "PERSONAL_INFO", "OTHER"] as const;
export type ReportReasonValue = (typeof REPORT_REASONS)[number];

/** Matches GET /admin/reports (AdminService.findReports). */
export interface AdminReviewReport {
  id: number;
  reason: ReportReasonValue;
  note: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  /** fullName is omitted for MODERATOR viewers (D-72). */
  reporter: { id: number; fullName?: string | null } | null;
  review: {
    id: number;
    rating: number;
    comment: string | null;
    status: string;
    reportCount: number;
    user: { id: number; fullName: string | null } | null;
    branch: { id: number; name: string; business: { id: number; slug: string; name: string } | null } | null;
  } | null;
}

export type ProductTypeValue = "PRODUCT" | "SERVICE";

/**
 * A catalog item. Backed by the `Product` table (there is no separate MenuItem
 * model — "menu" is just the catalog view of it), and ProductsService returns
 * every scalar column, so these are real fields rather than a guessed subset.
 *
 * `isActive` vs `isAvailable`: isActive is the publish switch — false hides the
 * item from GET /businesses/:id/menu and from GET /search?type=product
 * entirely. isAvailable is the softer "temporarily sold out" flag and leaves
 * the item listed. Only the owner catalog view ever sees isActive: false items.
 */
export interface MenuItem {
  id: number;
  businessId: number;
  categoryId?: number | null;
  type?: ProductTypeValue;
  name: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | string | null;
  currency?: string;
  unit?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

/** Shared by POST /businesses/:id/menu and PATCH /menu/:id (all optional there). */
export interface MenuItemPayload {
  name: string;
  price: number;
  description?: string;
  photo?: string;
  type?: ProductTypeValue;
  categoryId?: number;
}

export interface Business {
  id: number;
  ownerId?: number | null;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  descriptionUz?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  coverImageUrl?: string | null;
  coverPhoto?: string | null;
  hasDelivery?: boolean | null;
  deliveryFee?: number | null;
  deliveryTime?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  phone?: string | null;
  address?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  website?: string | null;
  verified?: boolean;
  isPromoted?: boolean;
  isOpen?: boolean;
  categoryId?: number | null;
  category?: Category | null;
  districtId?: number | null;
  district?: District | null;
  cityId?: number | null;
  city?: City | null;
  branches?: Branch[];
  reviews?: Review[];
  similar?: Business[];
  primaryBranch?: Branch | null;
}

// Matches EVENT_LIST_SELECT on the backend (GET /events) — Event.title is a
// single, non-localized column, unlike the taxonomy entities.
export interface Event {
  id: number;
  slug: string;
  title: string;
  type: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string;
  venueName: string | null;
  address: string | null;
  isFree: boolean;
  price: number | string | null;
  currency: string | null;
  attendeeCount: number;
  business: { id: number; slug: string; name: string; logoUrl: string | null } | null;
  district: { id: number; slug: string; nameUz: string } | null;
}

// GET /events/:slug returns every scalar Event column (Prisma `include`, not
// `select`) plus these relations — a strict superset of the list shape.
export interface EventDetail extends Event {
  description: string;
  allowRsvp: boolean;
  maxAttendees: number | null;
  registrationUrl: string | null;
  category: { id: number; slug: string; nameUz: string; nameRu: string; nameEn: string } | null;
}

export interface CreateEventPayload {
  businessId: number;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  venueName?: string;
  address?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchBusinessesParams {
  category?: string;
  district?: number;
  city?: number;
  search?: string;
  page?: number;
  limit?: number;
  lang?: Lang;
}

/**
 * Payload for POST /businesses. The endpoint doesn't exist yet on the live
 * API (confirmed 404, 2026-08-13), so this shape is a reasonable best guess
 * built from the fields the rest of the app already reads off `Business` —
 * not a verified contract. Revisit once the backend ships the real DTO.
 */
export interface CreateBusinessPayload {
  name: string;
  categoryId: number;
  description?: string;
  phone: string;
  secondaryPhone?: string;
  districtId: number;
  cityId?: number;
  address: string;
  landmark?: string;
  mapUrl?: string;
  email?: string;
  telegram?: string;
  instagram?: string;
  website?: string;
  hours: BusinessHours[];
}

/**
 * These match the live API's actual role strings. CUSTOMER/BUSINESS_OWNER/ADMIN
 * confirmed via POST /auth/register (2026-08-13); MODERATOR/SUPPORT/SUPER_ADMIN
 * added when the backend rolled out its role hierarchy (2026-08-15) — see
 * UserRole enum in my-andijan-api/prisma/schema.prisma.
 */
export type UserRole = "CUSTOMER" | "BUSINESS_OWNER" | "MODERATOR" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN";

export interface AuthUser {
  id: number;
  fullName: string;
  phone: string;
  role: UserRole;
  /**
   * The role's capabilities as issued by the server (GET /users/me and auth
   * responses, D-75). The UI renders from these via `useAuth().can()`;
   * absent → every check fails closed until the next /users/me refresh.
   */
  capabilities?: string[];
  // Profile-completion fields. Not persisted server-side yet — the backend
  // has no /users/me PATCH endpoint and no age/gender columns (confirmed
  // against prisma/schema.prisma, 2026-08-15) — so these live in
  // localStorage via AuthContext.updateUser until the backend catches up.
  email?: string | null;
  age?: number | null;
  gender?: "MALE" | "FEMALE" | null;
  districtId?: number | null;
  avatarId?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface RegisterPayload {
  phone: string;
  password: string;
  fullName: string;
  role: "user" | "owner";
}

/** Matches the real response shape of GET /admin/analytics/users (SUPER_ADMIN only) — see AnalyticsService.getUserAnalytics on the backend. */
export interface UserAnalytics {
  totalUsers: number;
  ageGroups: { range: string; count: number }[];
  genderSplit: { gender: string; count: number }[];
  cityBreakdown: { city: string; count: number }[];
}

/** Matches GET /admin/analytics/dashboard (SUPER_ADMIN only) — see AnalyticsService.getDashboardAnalytics on the backend. */
export interface DashboardAnalytics {
  users: UserAnalytics & { newThisMonth: number };
  businesses: {
    totalBusinesses: number;
    byStatus: { status: string; count: number }[];
    byCategory: { category: string; count: number }[];
    newThisMonth: number;
  };
}

/**
 * Admin entity shapes.
 *
 * `/admin/*` requires an ADMIN token, and registration only accepts
 * CUSTOMER/BUSINESS_OWNER, so these response bodies could not be observed
 * directly. AdminUser mirrors the user object the register/login endpoints
 * genuinely return (that part IS verified). The rest is typed permissively —
 * everything beyond an id is optional — so an unexpected payload renders
 * partially rather than throwing.
 */
export interface AdminUser {
  id: number;
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  role?: UserRole | string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface AdminBusiness {
  id: number;
  slug?: string | null;
  nameUz?: string | null;
  nameRu?: string | null;
  nameEn?: string | null;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
  coverPhoto?: string | null;
  hasDelivery?: boolean | null;
  deliveryFee?: number | null;
  deliveryTime?: string | null;
  coverUrl?: string | null;
  website?: string | null;
  email?: string | null;
  telegram?: string | null;
  instagram?: string | null;
  /** Denormalized count across all branches; only the primary one is in `branches`. */
  branchCount?: number | null;
  /** phone/email are only returned to ADMIN+; a MODERATOR gets { id, fullName } (D-72). */
  owner?: { id?: number; fullName?: string | null; phone?: string | null; email?: string | null } | null;
  ownerId?: number | null;
  businessType?: { id?: number; nameUz?: string | null; slug?: string | null } | null;
  // Business-operation state (GET /admin/businesses returns every scalar).
  isVerified?: boolean | null;
  isPromoted?: boolean | null;
  promotedUntil?: string | null;
  /** Rejection OR suspension reason — the schema shares one column. */
  rejectionReason?: string | null;
  /** Status recorded when a SUPER_ADMIN hid the listing; unhide restores it (D-73). */
  statusBeforeHide?: string | null;
  category?: { id?: number; nameUz?: string | null; slug?: string | null } | null;
  // The real GET /admin/businesses response nests district under the
  // primary branch (`branches[0].district`) — there is no top-level
  // `district` field on the business itself, since district is a Branch
  // concept (a business can have several). Kept `district` below as a
  // permissive extra in case a future response shape does flatten it, but
  // callers should read branches[0].district for the real data.
  district?: { id?: number; nameUz?: string | null } | null;
  branches?: { id: number; address?: string | null; phone?: string | null; district?: { id?: number; nameUz?: string | null } | null }[] | null;
}

/**
 * Matches GET /admin/events (AdminService.findEvents: Event row + business + district).
 * The real columns are `title`, `startAt`, `venueName`/`address` and
 * `rejectionReason`; the older guessed names (`nameUz`…, `startsAt`,
 * `location`) are kept optional only so nothing that still reads them breaks.
 */
export interface AdminEvent {
  id: number;
  title?: string | null;
  nameUz?: string | null;
  nameRu?: string | null;
  nameEn?: string | null;
  status?: string | null;
  startAt?: string | null;
  startsAt?: string | null;
  venueName?: string | null;
  address?: string | null;
  location?: string | null;
  rejectionReason?: string | null;
  business?: { id: number; slug: string; name: string } | null;
}

/** Matches GET /admin/reviews (see AdminService.findReviews). */
export interface AdminReview {
  id: number;
  rating: number;
  title?: string | null;
  comment: string;
  status: string;
  reportCount: number;
  createdAt: string;
  user: { id: number; fullName: string; avatarUrl?: string | null } | null;
  branch: {
    id: number;
    name: string;
    business: { id: number; slug: string; name: string } | null;
  } | null;
  reply: { id: number; body: string; createdAt: string } | null;
}

export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Matches GET /admin/claims (see AdminService.findClaims). */
export interface AdminClaim {
  id: number;
  status: ClaimStatus;
  evidence: string | null;
  contactPhone: string | null;
  contactNote: string | null;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  business: { id: number; slug: string; name: string; ownerId: number | null } | null;
  claimant: { id: number; fullName: string; phone: string; email: string | null; role: string } | null;
  reviewedBy: { id: number; fullName: string } | null;
}

/** Matches GET /me/claims and the response of POST /me/claims (see OwnerService). */
export interface MyClaim {
  id: number;
  status: ClaimStatus;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  business: { id: number; slug: string; name: string } | null;
  reviewedBy: { id: number; fullName: string } | null;
}

/**
 * Matches the live GET /admin/stats response exactly (confirmed 2026-08-15,
 * not guessed) — it does NOT have flat `businesses`/`users`/`reviews`/`events`
 * fields the way the old (never-actually-observed) shape assumed. Totals are
 * broken down by status/role instead, and "reviews"/"events" only ever exist
 * as pending counts — there is no all-time total for either.
 */
export interface AdminStats {
  businessesByStatus: Record<BusinessStatusValue, number>;
  usersByRole: Record<string, number>;
  pendingClaims: number;
  pendingReviews: number;
  pendingEvents: number;
  openReports: number;
  newSignups7d: number;
}

/** Normalized list result: the API may return a bare array or {data, meta}. */
export interface AdminListResult<T> {
  items: T[];
  total: number | null;
}

/** Matches the live API's CreateCategoryDto/UpdateCategoryDto (both POST and PATCH accept the same shape). */
export interface AdminCategoryPayload {
  nameUz: string;
  nameRu: string;
  nameEn: string;
  slug?: string;
  icon?: string;
  colorHex?: string;
}

/**
 * Owner-scoped (/me/*) response shapes. Deliberately separate from the public
 * Business/Branch/Review/Event types above: those are shaped for the
 * localized (nameUz/nameRu/nameEn) public read API, while /me/* returns the
 * raw Prisma shape — a single `name`, `comment` not `text`, `body` not
 * `text` on replies, etc. Confirmed against the real API responses
 * (2026-08-14/15), not guessed.
 */
export type BusinessStatusValue = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type ReviewStatusValue = "PENDING" | "PUBLISHED" | "REJECTED" | "HIDDEN";
export type EventStatusValue = "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED" | "CANCELLED" | "COMPLETED";

interface MyDistrictRef {
  id: number;
  slug: string;
  nameUz: string;
  nameRu?: string;
  nameEn?: string;
}

export interface MyBranchHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  is24Hours?: boolean;
}

export interface MyBranch {
  id: number;
  name: string;
  address: string;
  landmark?: string | null;
  phone: string;
  isPrimary: boolean;
  district?: MyDistrictRef | null;
  city?: MyDistrictRef | null;
  hours?: MyBranchHour[];
}

export interface MyBusiness {
  id: number;
  slug: string;
  name: string;
  status: BusinessStatusValue;
  coverPhoto?: string | null;
  hasDelivery?: boolean | null;
  deliveryFee?: number | null;
  deliveryTime?: string | null;
  // Real Business columns — OwnerService.findMyBusinesses uses Prisma
  // `include` (not `select`), so every scalar column comes back on the wire
  // whether or not it's typed here. viewCount has no writer anywhere in the
  // app yet, so it reads 0 today — still real data, not mocked.
  ratingAvg?: number | string | null;
  reviewCount?: number | null;
  viewCount?: number | null;
  favoriteCount?: number | null;
  category?: { id: number; slug: string; nameUz: string } | null;
  businessType?: { id: number; slug: string; nameUz: string } | null;
  branches: MyBranch[];
  _count?: { branches: number };
}

/** GET /me/businesses/:id — same as MyBusiness plus the fields the list endpoint omits. */
export interface MyBusinessDetail extends MyBusiness {
  description?: string | null;
}

/**
 * GET /businesses/:id (also accepts a slug) — the endpoint EditBusinessModal
 * fetches from directly when opened with a businessId. Only returns
 * APPROVED, non-deleted businesses (see BusinessesService.findOne on the
 * backend), so the modal falls back to whatever `initial` data the caller
 * already has (e.g. from /me/businesses or /admin/businesses) when this
 * 404s for a DRAFT/PENDING listing.
 */
export interface BusinessEditBranch {
  id: number;
  address: string;
  phone: string;
  isPrimary: boolean;
  district?: MyDistrictRef | null;
  hours?: MyBranchHour[];
}

export interface BusinessEditDetail {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  status?: string | null;
  coverPhoto?: string | null;
  hasDelivery?: boolean | null;
  deliveryFee?: number | null;
  deliveryTime?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  website?: string | null;
  category?: { id: number; slug: string; nameUz: string } | null;
  branches?: BusinessEditBranch[];
}

export interface MyStats {
  businessCount: number;
  totalReviews: number;
  avgRating: number;
  upcomingEvents: number;
  pendingClaims: number;
  healthScore: {
    average: number | null;
    businessesScored: number;
    openRecommendations: number;
  };
}

export interface MyReview {
  id: number;
  rating: number;
  title?: string | null;
  comment: string;
  status: ReviewStatusValue;
  createdAt: string;
  user?: { id: number; fullName: string; avatarUrl?: string | null } | null;
  reply?: { id: number; body: string; createdAt: string } | null;
  branch?: { id: number; name: string; business?: { id: number; slug: string; name: string } | null } | null;
}

export type AuditActionValue =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "REJECT"
  | "SUSPEND"
  | "RESTORE"
  | "LOGIN"
  | "ROLE_CHANGE";

export interface AdminAuditLog {
  id: number;
  action: AuditActionValue;
  entityType: string;
  entityId: number | null;
  note: string | null;
  createdAt: string;
  actor: { id: number; fullName: string; role: string } | null;
}

export interface MyEvent {
  id: number;
  slug: string;
  title: string;
  status: EventStatusValue;
  startAt: string;
  endAt: string;
  district?: MyDistrictRef | null;
  business?: { id: number; slug: string; name: string } | null;
}
