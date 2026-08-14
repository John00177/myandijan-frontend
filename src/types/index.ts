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

export interface AdminStats {
  businesses?: number | null;
  pendingBusinesses?: number | null;
  users?: number | null;
  reviews?: number | null;
  events?: number | null;
  createdToday?: number | null;
}

/** Normalized list result: the API may return a bare array or {data, meta}. */
export interface AdminListResult<T> {
  items: T[];
  total: number | null;
}
