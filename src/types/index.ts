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

export interface Review {
  id: number;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface Business {
  id: number;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  descriptionUz?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  coverImageUrl?: string | null;
  coverPhoto?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  phone?: string | null;
  address?: string | null;
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

export interface Event {
  id: number;
  slug: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  type: string | null;
  image: string | null;
  startsAt: string;
  location: string | null;
  categoryLabel: string | null;
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

/** These match the live API's actual role strings — confirmed via POST /auth/register (2026-08-13), not guessed. */
export type UserRole = "CUSTOMER" | "BUSINESS_OWNER" | "ADMIN";

export interface AuthUser {
  id: number;
  fullName: string;
  phone: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
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
  status?: string | null;
  createdAt?: string | null;
  owner?: { id?: number; fullName?: string | null; phone?: string | null } | null;
  ownerId?: number | null;
  category?: { id?: number; nameUz?: string | null; slug?: string | null } | null;
  district?: { id?: number; nameUz?: string | null } | null;
}

export interface AdminEvent {
  id: number;
  nameUz?: string | null;
  nameRu?: string | null;
  nameEn?: string | null;
  title?: string | null;
  status?: string | null;
  startsAt?: string | null;
  location?: string | null;
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
  category?: { id: number; slug: string; nameUz: string } | null;
  businessType?: { id: number; slug: string; nameUz: string } | null;
  branches: MyBranch[];
  _count?: { branches: number };
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
