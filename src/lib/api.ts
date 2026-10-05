import type {
  AdminAuditLog,
  AdminBusiness,
  AdminBusinessDetail,
  AdminCategoryPayload,
  AdminClaim,
  AdminEvent,
  AdminReview,
  AdminReviewReport,
  ReportReasonValue,
  AdminListResult,
  AdminStats,
  AdminUser,
  AuthResponse,
  AuthUser,
  Branch,
  Business,
  BusinessEditDetail,
  Category,
  CreateBusinessPayload,
  CreateEventPayload,
  Event,
  EventDetail,
  Lang,
  LoginPayload,
  MenuItem,
  MenuItemPayload,
  MyClaim,
  MyBranch,
  MyBranchHour,
  MyBusiness,
  MyBusinessDetail,
  MyEvent,
  MyReview,
  MyStats,
  PaginatedResponse,
  Region,
  Review,
  ReviewReply,
  RegisterPayload,
  SearchBusinessesParams,
  DashboardAnalytics,
  UserAnalytics,
} from "../types";
import {
  AUTH_CHANNEL_NAME,
  createRefreshCoordinator,
  type ChannelLike,
  type RefreshAttempt,
  type RefreshCoordinator,
} from "./auth/refreshCoordinator";

const BASE = import.meta.env.VITE_API_URL || "https://myandijan-api-production.up.railway.app";
const TIMEOUT_MS = 10_000;
const TOKEN_KEY = "myandijan_token";
const REFRESH_TOKEN_KEY = "myandijan_refresh_token";
const USER_KEY = "myandijan_user";

/** Fired when a request proves the stored token is no longer valid. */
export const SESSION_EXPIRED_EVENT = "myandijan:session-expired";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Central handling for "the token we sent was rejected".
 *
 * Previously only AuthContext's mount-time getMe() and useFavorites noticed a
 * 401, so a token expiring mid-session left the rest of the app (owner
 * dashboard, favourites toggles, review replies) failing with generic errors
 * while the UI still showed the user as logged in, with no way back other
 * than manually logging out. Clearing here means any 401 from any endpoint
 * ends the session exactly once, and the event lets React state follow.
 *
 * Only fires when a token was actually sent: a 401 from /auth/login is a wrong
 * password, not an expired session.
 */
function handleUnauthorized(hadToken: boolean, status: number): void {
  if (!hadToken || status !== 401) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/**
 * One POST /auth/refresh, classified. 4xx (other than 408/429) means the
 * server refused the refresh token; network errors, timeouts, 408/429 and
 * 5xx are transient and must not end a session that may still be valid.
 */
async function postRefresh(refreshToken: string, signal: AbortSignal): Promise<RefreshAttempt> {
  let res: Response;
  try {
    res = await fetch(new URL("/auth/refresh", BASE).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal,
    });
  } catch {
    return { kind: "transient" };
  }
  if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) return { kind: "rejected" };
  if (!res.ok) return { kind: "transient" };
  try {
    const data = (await res.json()) as { accessToken?: unknown; refreshToken?: unknown };
    if (typeof data.accessToken === "string" && typeof data.refreshToken === "string") {
      return { kind: "success", accessToken: data.accessToken, refreshToken: data.refreshToken };
    }
  } catch {
    // fall through
  }
  return { kind: "transient" };
}

/**
 * Silent refresh, coordinated across tabs (Phase 15E.4a — see
 * lib/auth/refreshCoordinator.ts). One coordinator per tab, created on first
 * use: one BroadcastChannel where the browser has it, plus the `storage`
 * event as the fallback channel.
 */
let coordinator: RefreshCoordinator | null = null;

function getRefreshCoordinator(): RefreshCoordinator {
  coordinator ??= createRefreshCoordinator({
    storage: localStorage,
    tokenKey: TOKEN_KEY,
    refreshTokenKey: REFRESH_TOKEN_KEY,
    performRefresh: postRefresh,
    requestTimeoutMs: TIMEOUT_MS,
    createChannel: () => {
      if (typeof BroadcastChannel !== "function") return null;
      const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      // Node (tests) keeps a process alive while a channel is open; browsers have no unref.
      (channel as unknown as { unref?: () => void }).unref?.();
      return channel as unknown as ChannelLike;
    },
    subscribeStorage: (listener) => {
      const onStorage = (event: StorageEvent) => {
        if (event.storageArea === null || event.storageArea === localStorage) listener(event.key);
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    },
  });
  return coordinator;
}

/**
 * On a 401 from an authenticated request, each request helper below calls
 * this ONCE with the access token that was rejected, then retries ONCE.
 * Returns the access token to retry with (freshly refreshed here, or already
 * refreshed by another tab), or null when the session is genuinely over (the
 * caller then runs handleUnauthorized). A transient refresh failure throws
 * ApiError 503 instead, so a flaky network never logs the user out.
 */
async function refreshAccessToken(failedAccessToken: string): Promise<string | null> {
  const result = await getRefreshCoordinator().refresh(failedAccessToken);
  if (result.status === "refreshed") return result.accessToken;
  if (result.status === "unauthenticated") return null;
  throw new ApiError("Could not refresh the session — please try again", 503);
}

/** Called by AuthContext.logout: logout wins over any refresh in flight, in every tab. */
export function notifyLogout(): void {
  getRefreshCoordinator().notifyLogout();
}

async function request<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(path, BASE);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    let res = await fetch(url.toString(), { headers, signal: controller.signal });
    if (res.status === 401 && token) {
      const newToken = await refreshAccessToken(token);
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(url.toString(), { headers, signal: controller.signal });
      }
    }
    if (!res.ok) {
      handleUnauthorized(!!token, res.status);
      throw new ApiError(`Request failed: ${res.status}`, res.status);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getRegions(lang?: Lang): Promise<Region[]> {
  return request<Region[]>("/geography/regions", { lang });
}

export function getCategories(lang?: Lang): Promise<Category[]> {
  return request<Category[]>("/categories", { lang });
}

/**
 * Purpose-built for the homepage's category tiles — the server already
 * applies the `showOnHomepage` filter, so callers that only need that subset
 * fetch it directly instead of pulling the full tree and filtering client-side.
 */
export function getCategoriesHomepage(lang?: Lang): Promise<Category[]> {
  return request<Category[]>("/categories/homepage", { lang });
}

/** Backs the /:lang/category/:slug landing page — GET /categories/:slug already existed, unused until now. */
export function getCategoryBySlug(slug: string): Promise<Category> {
  return request<Category>(`/categories/${slug}`);
}

/**
 * The backend's Business/Branch models are NOT localized (a single `name`
 * column, not nameUz/nameRu/nameEn — those only exist on Category/District/
 * City) and keep phone/address/district/hours on Branch, not Business. The
 * frontend `Business`/`Branch` types were built assuming a shape closer to
 * the localized taxonomy entities, so every endpoint that returns a business
 * needs its raw response adapted here — once, at the boundary — rather than
 * every render site guessing at fallbacks. Fixes: blank business names
 * (localizedName read nameUz, which the API never sends), missing phone/
 * address on the detail page (lived on branches[0], never copied up), and
 * NaN ratings (API sends ratingAvg as a string).
 */
function normalizeBranch(raw: any): Branch {
  const rawName = raw?.name ?? raw?.nameUz ?? null;
  return {
    id: raw.id,
    nameUz: raw.nameUz ?? rawName ?? "",
    nameRu: raw.nameRu ?? rawName ?? "",
    nameEn: raw.nameEn ?? rawName ?? "",
    address: raw.address ?? null,
    phone: raw.phone ?? null,
    lat: raw.lat != null ? Number(raw.lat) : null,
    lng: raw.lng != null ? Number(raw.lng) : null,
    hours: Array.isArray(raw.hours)
      ? raw.hours.map((h: any) => ({
          day: h.day ?? h.dayOfWeek,
          openTime: h.openTime ?? null,
          closeTime: h.closeTime ?? null,
          isClosed: !!h.isClosed,
        }))
      : undefined,
  };
}

function normalizeBusiness(raw: any): Business {
  if (!raw) return raw;

  const branches = Array.isArray(raw.branches) ? raw.branches.map(normalizeBranch) : undefined;
  const rawPrimary = raw.primaryBranch ?? raw.branches?.[0] ?? null;
  const primary = rawPrimary ? normalizeBranch(rawPrimary) : branches?.[0];
  const displayName = raw.name ?? raw.nameUz ?? raw.slug ?? "Noma'lum biznes";

  return {
    ...raw,
    nameUz: raw.nameUz ?? displayName,
    nameRu: raw.nameRu ?? displayName,
    nameEn: raw.nameEn ?? displayName,
    descriptionUz: raw.descriptionUz ?? raw.description ?? null,
    descriptionRu: raw.descriptionRu ?? raw.description ?? null,
    descriptionEn: raw.descriptionEn ?? raw.description ?? null,
    coverImageUrl: raw.coverImageUrl ?? raw.coverUrl ?? null,
    coverPhoto: raw.coverPhoto ?? null,
    rating: raw.rating != null ? Number(raw.rating) : raw.ratingAvg != null ? Number(raw.ratingAvg) : null,
    reviewCount: raw.reviewCount ?? 0,
    phone: raw.phone ?? primary?.phone ?? null,
    address: raw.address ?? primary?.address ?? null,
    verified: raw.verified ?? raw.isVerified ?? false,
    district: raw.district ?? rawPrimary?.district ?? null,
    city: raw.city ?? rawPrimary?.city ?? null,
    branches,
    primaryBranch: primary ?? null,
  };
}

export function getFeaturedBusinesses(lang?: Lang): Promise<Business[]> {
  return request<any[]>("/businesses/featured", { lang }).then((rows) => rows.map(normalizeBusiness));
}

export function searchBusinesses(params: SearchBusinessesParams): Promise<PaginatedResponse<Business>> {
  const { lang: _lang, ...rest } = params;
  return request<PaginatedResponse<any>>("/businesses", rest).then((res) => ({
    ...res,
    data: res.data.map(normalizeBusiness),
  }));
}

/**
 * GET /search — the real Postgres FTS + trigram endpoint (transliteration
 * folding, relevance ranking), scoped to `type=business` so the result shape
 * matches BusinessListCard. Only used when there's an actual text query;
 * category/district-only browsing keeps using searchBusinesses(), which
 * already paginates and filters correctly server-side without needing FTS
 * ranking (there is nothing to rank without a query term).
 */
export function searchBusinessesFts(params: SearchBusinessesParams): Promise<PaginatedResponse<Business>> {
  const { search, lang: _lang, ...rest } = params;
  return request<PaginatedResponse<any>>("/search", { ...rest, q: search, type: "business" }).then((res) => ({
    ...res,
    data: res.data.map(normalizeBusiness),
  }));
}

export function getBusiness(slug: string, lang?: Lang): Promise<Business> {
  return request<any>(`/businesses/${slug}`, { lang }).then(normalizeBusiness);
}

// GET /businesses/:id — same route as getBusiness above (it accepts either an
// id or a slug server-side), used by EditBusinessModal to pre-fill its form
// from a businessId. Only returns APPROVED businesses.
export function getBusinessById(id: number): Promise<BusinessEditDetail> {
  return request<BusinessEditDetail>(`/businesses/${id}`);
}

// PATCH /businesses/:id — OWNER ONLY since Phase 15B (D-74; enforced
// server-side, no staff bypass). The owner dashboard's EditBusinessModal
// saves through here; the admin panel uses updateAdminBusiness instead.
export function updateBusiness(
  id: number,
  payload: {
    name?: string;
    description?: string;
    categoryId?: number;
    coverPhoto?: string;
    hasDelivery?: boolean;
    deliveryFee?: number;
    deliveryTime?: string;
    instagram?: string;
    telegram?: string;
    website?: string;
  },
): Promise<BusinessEditDetail> {
  return authedPatchJson<BusinessEditDetail>(`/businesses/${id}`, payload);
}

// PUT /businesses/:id/hours — replaces the business's primary-branch hours
// wholesale from the 7-day grid in EditBusinessModal. Owner only (Phase 15B);
// the admin panel uses updateAdminBusinessHours.
export function updateBusinessHours(
  id: number,
  hours: Array<{ dayOfWeek: number; openTime?: string; closeTime?: string; isClosed?: boolean; is24Hours?: boolean }>,
): Promise<MyBranchHour[]> {
  return authedPutJson<MyBranchHour[]>(`/businesses/${id}/hours`, hours);
}

// CATALOG / MENU  (Product under the hood — see the backend's products module
// for why there's no separate MenuItem model.)

/** PUBLIC: active items of an APPROVED business. Used by the business page. */
export function getBusinessMenu(businessId: number): Promise<MenuItem[]> {
  return request<MenuItem[]>(`/businesses/${businessId}/menu`);
}

/**
 * OWNER: the management view of the same catalog. Distinct from
 * getBusinessMenu because it also returns deactivated (isActive: false) items —
 * without those, a deactivated item would vanish from the owner's own list and
 * could never be switched back on — and it works for a business that is still
 * PENDING approval. Ownership is enforced server-side (403 otherwise).
 */
export function getMyBusinessMenu(businessId: number): Promise<MenuItem[]> {
  return request<MenuItem[]>(`/me/businesses/${businessId}/menu`);
}

export function createMenuItem(businessId: number, payload: MenuItemPayload): Promise<MenuItem> {
  return authedPostJson<MenuItem>(`/businesses/${businessId}/menu`, payload);
}

export function updateMenuItem(
  id: number,
  payload: Partial<MenuItemPayload> & { isAvailable?: boolean; isActive?: boolean },
): Promise<MenuItem> {
  return authedPatchJson<MenuItem>(`/menu/${id}`, payload);
}

export function deleteMenuItem(id: number): Promise<void> {
  return authedDelete(`/menu/${id}`);
}

// REVIEWS  (business-scoped convenience — POST resolves to the business's
// primary branch server-side, same as PUT /businesses/:id/hours does.)
export function createBusinessReview(
  businessId: number,
  payload: { rating: number; title?: string; comment: string; photos?: string[] },
): Promise<Review> {
  return authedPostJson<Review>(`/businesses/${businessId}/reviews`, payload);
}

export function replyToReview(reviewId: number, body: string): Promise<ReviewReply> {
  return authedPatchJson<ReviewReply>(`/reviews/${reviewId}/reply`, { body });
}

// IMAGE UPLOAD  (POST /upload/image — multipart, returns a real Supabase
// Storage URL). A longer timeout than the JSON helpers below: a photo
// upload over a slow connection legitimately takes more than 10s, and
// aborting it early would look like a random failure.
const UPLOAD_TIMEOUT_MS = 30_000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

/**
 * Client-side guard before the request goes out. `accept="image/*"` on the
 * input is only a picker hint — drag-and-drop and "All files" both bypass it —
 * so without this a 40MB video uploads for 30s and then fails as an opaque
 * timeout. Rejecting up front costs nothing and gives a real message; the
 * server still enforces its own limits.
 */
function assertUploadable(file: File): void {
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new ApiError(`Rasm hajmi juda katta (${mb}MB). Maksimal 5MB.`, 413);
  }
  // Some browsers report an empty type for uncommon formats — only reject on
  // a type that is present AND not an image, so a valid file is never blocked
  // by a missing MIME type alone.
  if (file.type && !ALLOWED_UPLOAD_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    throw new ApiError("Faqat rasm fayllari qabul qilinadi (JPG, PNG, WEBP).", 415);
  }
}

export async function uploadImage(file: File): Promise<{ url: string }> {
  assertUploadable(file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const formData = new FormData();
  formData.append("file", file);

  try {
    // No Content-Type header here — the browser sets
    // multipart/form-data with the correct boundary itself; setting it
    // manually would drop the boundary and break the upload.
    let res = await fetch(new URL("/upload/image", BASE).toString(), {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
    if (res.status === 401 && token) {
      const newToken = await refreshAccessToken(token);
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(new URL("/upload/image", BASE).toString(), {
          method: "POST",
          headers,
          body: formData,
          signal: controller.signal,
        });
      }
    }
    if (!res.ok) {
      handleUnauthorized(!!token, res.status);
      const payload = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
      throw new ApiError(message ?? `Request failed: ${res.status}`, res.status);
    }
    return (await res.json()) as { url: string };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getEvents(): Promise<PaginatedResponse<Event>> {
  return request<PaginatedResponse<Event>>("/events");
}

export function getEventBySlug(slug: string): Promise<EventDetail> {
  return request<EventDetail>(`/events/${slug}`);
}

/** Idempotent — calling it again on an existing active RSVP just returns it. */
export function attendEvent(slug: string): Promise<unknown> {
  return authedPostJson(`/events/${slug}/attend`, {});
}

export function createMyEvent(payload: CreateEventPayload): Promise<MyEvent> {
  return authedPostJson<MyEvent>("/me/events", payload);
}

export type AnalyticsClickAction = "CALL" | "DIRECTION" | "FAVORITE" | "SHARE" | "WEBSITE";

/**
 * Fire-and-forget telemetry for the public, anonymous /analytics/* endpoints.
 * Their response is never used and a network hiccup here must never surface
 * as a user-facing error, so failures are swallowed at this single choke
 * point rather than requiring every call site to remember to catch them.
 */
function recordAnalytics(path: string, body: unknown): void {
  fetch(new URL(path, BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export function recordBusinessView(businessId: number, cityId?: number): void {
  recordAnalytics("/analytics/view", { businessId, cityId });
}

export function recordBusinessClick(businessId: number, action: AnalyticsClickAction): void {
  recordAnalytics("/analytics/click", { businessId, action });
}

export function recordSearch(payload: {
  query: string;
  categoryId?: number;
  districtId?: number;
  cityId?: number;
  businessId?: number;
  resultCount: number;
}): void {
  recordAnalytics("/analytics/search", payload);
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(new URL(path, BASE).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
      throw new ApiError(message ?? `Request failed: ${res.status}`, res.status);
    }
    // A 2xx with an empty body (common for action endpoints with no return
    // value) still parses fine here — .catch keeps that from being read as a
    // request failure.
    return (await res.json().catch(() => undefined)) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return postJson<AuthResponse>("/auth/login", payload);
}

/**
 * UI-level role values ("user"/"owner") map to the API's actual role strings
 * here, at the request boundary, so the register form and its "Mijoz" /
 * "Biznes egasi" labels never need to know the wire format.
 */
const REGISTER_ROLE_MAP: Record<RegisterPayload["role"], string> = {
  user: "CUSTOMER",
  owner: "BUSINESS_OWNER",
};

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { role, ...rest } = payload;
  return postJson<AuthResponse>("/auth/register", { ...rest, role: REGISTER_ROLE_MAP[role] });
}

/*
 * Password reset. Confirmed absent on the live API (2026-08-13): all three
 * paths 404. Calls are wired up so the flow works the moment the backend adds
 * them — callers should treat a 404 ApiError as "not launched yet", not a
 * real failure.
 */

/*
 * Phone-first OTP signup. Backed by AuthService.requestOtp/verifyOtp on the
 * API: codes are 6 digits, live 5 minutes, are single-use, and are capped at
 * 3 SMS per phone per 10 minutes (the cap answers 429).
 *
 * verify returns the same {user, accessToken, refreshToken} envelope as
 * /auth/login, so a verified phone lands in exactly the session the rest of
 * the app already understands.
 */
export function requestOtp(phone: string): Promise<{ success: boolean; message: string }> {
  return postJson<{ success: boolean; message: string }>("/auth/otp/request", { phone });
}

export function verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
  return postJson<AuthResponse>("/auth/otp/verify", { phone, otp });
}

/**
 * Profile save for signup step 3 — PUT /auth/profile, multipart because the
 * avatar rides along with the name in one request. The server composes
 * firstName + lastName into the single `fullName` column it stores and
 * uploads the photo to Supabase itself, so there is no separate upload call
 * to sequence here.
 */
export async function saveSignupProfile(input: {
  firstName: string;
  lastName: string;
  avatar?: File | null;
}): Promise<AuthUser> {
  const form = new FormData();
  form.append("firstName", input.firstName);
  form.append("lastName", input.lastName);
  if (input.avatar) form.append("photo", input.avatar);

  const res = await authedFormData<{ success: boolean; user: AuthUser }>("PUT", "/auth/profile", form);
  return res.user;
}

export function forgotPassword(phone: string): Promise<void> {
  return postJson<void>("/auth/forgot-password", { phone });
}

export function verifyResetCode(phone: string, code: string): Promise<void> {
  return postJson<void>("/auth/verify-reset-code", { phone, code });
}

export function resetPassword(phone: string, code: string, newPassword: string): Promise<void> {
  return postJson<void>("/auth/reset-password", { phone, code, newPassword });
}

async function authedDelete(path: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    let res = await fetch(new URL(path, BASE).toString(), {
      method: "DELETE",
      headers,
      signal: controller.signal,
    });
    if (res.status === 401 && token) {
      const newToken = await refreshAccessToken(token);
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(new URL(path, BASE).toString(), {
          method: "DELETE",
          headers,
          signal: controller.signal,
        });
      }
    }
    if (!res.ok) {
      handleUnauthorized(!!token, res.status);
      throw new ApiError(`Request failed: ${res.status}`, res.status);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

/*
 * Business creation. Confirmed absent on the live API (2026-08-13): POST
 * /businesses, /business, /owner/businesses, /dashboard/businesses,
 * /businesses/create and /my/businesses all 404 ("Cannot POST ..."), which is
 * the routing layer's own not-found response — the route itself doesn't
 * exist yet, not an auth or validation rejection. Wired up against the most
 * likely real shape so it activates the moment the backend ships it; callers
 * should treat a 404 ApiError as "not launched yet".
 */
async function authedJson<T>(method: "POST" | "PATCH" | "PUT", path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    let res = await fetch(new URL(path, BASE).toString(), {
      method,
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 401 && token) {
      const newToken = await refreshAccessToken(token);
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(new URL(path, BASE).toString(), {
          method,
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      }
    }
    if (!res.ok) {
      handleUnauthorized(!!token, res.status);
      const payload = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
      throw new ApiError(message ?? `Request failed: ${res.status}`, res.status);
    }
    return (await res.json().catch(() => undefined)) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Authed multipart request. Separate from authedJson because the browser must
 * set Content-Type itself here — writing multipart/form-data by hand drops the
 * boundary and the server cannot parse the body.
 */
async function authedFormData<T>(method: "POST" | "PUT" | "PATCH", path: string, body: FormData): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    let res = await fetch(new URL(path, BASE).toString(), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    if (res.status === 401 && token) {
      const newToken = await refreshAccessToken(token);
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(new URL(path, BASE).toString(), {
          method,
          headers,
          body,
          signal: controller.signal,
        });
      }
    }
    if (!res.ok) {
      handleUnauthorized(!!token, res.status);
      const payload = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
      throw new ApiError(message ?? `Request failed: ${res.status}`, res.status);
    }
    return (await res.json().catch(() => undefined)) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

function authedPostJson<T>(path: string, body: unknown): Promise<T> {
  return authedJson<T>("POST", path, body);
}

/**
 * Revokes the refresh token server-side on logout. Best-effort by design —
 * AuthContext calls this without awaiting it and clears local session state
 * regardless of the outcome, so a network failure here never blocks logout.
 */
export function revokeSession(refreshToken: string): Promise<void> {
  return authedPostJson<void>("/auth/logout", { refreshToken });
}

function authedPatchJson<T>(path: string, body: unknown): Promise<T> {
  return authedJson<T>("PATCH", path, body);
}

function authedPutJson<T>(path: string, body: unknown): Promise<T> {
  return authedJson<T>("PUT", path, body);
}

// GET/PATCH /users/me are both real and live (confirmed 2026-08-17).
export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/users/me");
}

export function updateProfile(payload: Partial<AuthUser>): Promise<AuthUser> {
  return authedPatchJson<AuthUser>("/users/me", payload);
}

export function createBusiness(payload: CreateBusinessPayload): Promise<Business> {
  return authedPostJson<Business>("/businesses", payload);
}

// ---- Claims ---------------------------------------------------------------
// "Claiming" is distinct from createBusiness() above: a claim establishes
// ownership of an EXISTING, unowned (ownerId null) directory listing, while
// createBusiness() submits a brand-new listing that is already owned by its
// submitter. See docs/my-andijan/ARCHITECTURE.md's claims section.

export function createClaim(payload: {
  businessId: number;
  evidence?: string;
  contactPhone?: string;
  contactNote?: string;
}): Promise<MyClaim> {
  return authedPostJson<MyClaim>("/me/claims", payload);
}

export function getMyClaims(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<MyClaim>> {
  return request<PaginatedResponse<MyClaim>>("/me/claims", params);
}

export async function getAdminClaims(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminListResult<AdminClaim>> {
  const raw = await request<unknown>("/admin/claims", params);
  return normalizeAdminList<AdminClaim>(raw);
}

export function approveAdminClaim(id: number): Promise<AdminClaim> {
  return authedPostJson<AdminClaim>(`/admin/claims/${id}/approve`, {});
}

export function rejectAdminClaim(id: number, reason: string): Promise<AdminClaim> {
  return authedPostJson<AdminClaim>(`/admin/claims/${id}/reject`, { reason });
}

// GET /favorites requires auth and returns `{favoritedAt, business}[]`, not
// a flat Business[] — unwrapped here so every caller keeps working with
// plain Business objects.
export function getFavorites(lang?: Lang): Promise<Business[]> {
  return request<Array<{ favoritedAt: string; business: unknown }>>("/favorites", { lang }).then((rows) =>
    rows.map((row) => normalizeBusiness(row.business)),
  );
}

export function addFavorite(businessId: number): Promise<unknown> {
  return authedPostJson("/favorites", { businessId });
}

export function removeFavorite(businessId: number): Promise<void> {
  return authedDelete(`/favorites/${businessId}`);
}

/*
 * Admin API.
 *
 * Endpoint existence was probed directly (2026-08-13):
 *   real, ADMIN-gated  → /admin/stats, /admin/businesses, /admin/users,
 *                        /admin/events, /admin/categories
 *   genuinely absent   → /admin/reviews, /admin/audit-logs, /admin/settings (404)
 *
 * The response bodies of the real ones could NOT be observed: they need an ADMIN
 * token and registration only issues CUSTOMER/BUSINESS_OWNER. So list responses
 * are normalized to tolerate either a bare array or the {data, meta} envelope the
 * public endpoints use, and every field beyond `id` is optional in the types.
 */

function normalizeAdminList<T>(raw: unknown): AdminListResult<T> {
  if (Array.isArray(raw)) {
    return { items: raw as T[], total: raw.length };
  }
  if (raw && typeof raw === "object" && "data" in raw) {
    const envelope = raw as { data?: T[]; meta?: { total?: number } };
    const items = Array.isArray(envelope.data) ? envelope.data : [];
    return { items, total: envelope.meta?.total ?? items.length };
  }
  return { items: [], total: null };
}

export function getAdminStats(): Promise<AdminStats> {
  return request<AdminStats>("/admin/stats");
}

export function getUserAnalytics(): Promise<UserAnalytics> {
  return request<UserAnalytics>("/admin/analytics/users");
}

export function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  return request<DashboardAnalytics>("/admin/analytics/dashboard");
}

export async function getAdminBusinesses(params?: {
  page?: number;
  limit?: number;
  /** Server-side BusinessStatus filter (e.g. "SUSPENDED"); omitted = all. */
  status?: string;
}): Promise<AdminListResult<AdminBusiness>> {
  const raw = await request<unknown>("/admin/businesses", params);
  return normalizeAdminList<AdminBusiness>(raw);
}

// GET /admin/businesses/:id (Phase 16E.4) — `business.review`. One listing in
// full, ANY status except soft-deleted: every branch with hours, photos and
// coordinates. Until the API deploy that adds it, production answers 404, so
// callers must treat a 404 as "not available yet", never as fatal.
export function getAdminBusinessById(id: number): Promise<AdminBusinessDetail> {
  return request<AdminBusinessDetail>(`/admin/businesses/${id}`);
}

/**
 * The admin edit modal's prefill (Phase 16E.5). The admin detail serves
 * DRAFT/PENDING/REJECTED/SUSPENDED/HIDDEN listings too, so their real hours
 * load and the hours editor unlocks (EditBusinessModal `preserveUnchangedHours`).
 * Falls back to the public GET /businesses/:id ONLY on a 404 — the route not
 * deployed yet — which is exactly the pre-16E.5 behaviour (APPROVED listings
 * prefill, others keep their hours locked). Any other failure propagates, so
 * the modal keeps the hours locked rather than guessing.
 */
export async function getAdminBusinessEditDetail(id: number): Promise<BusinessEditDetail> {
  let detail: AdminBusinessDetail;
  try {
    detail = await getAdminBusinessById(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return getBusinessById(id);
    throw err;
  }
  return {
    id: detail.id,
    slug: detail.slug ?? "",
    name: detail.name ?? detail.nameUz ?? "",
    description: detail.description ?? null,
    status: detail.status ?? null,
    coverPhoto: detail.coverPhoto ?? null,
    hasDelivery: detail.hasDelivery ?? null,
    deliveryFee: detail.deliveryFee ?? null,
    deliveryTime: detail.deliveryTime ?? null,
    instagram: detail.instagram ?? null,
    telegram: detail.telegram ?? null,
    website: detail.website ?? null,
    category:
      detail.category?.id != null
        ? { id: detail.category.id, slug: detail.category.slug ?? "", nameUz: detail.category.nameUz ?? "" }
        : null,
    // Order preserved: branches[0] is the primary branch — the one
    // PUT /admin/businesses/:id/hours replaces — and hours keep is24Hours.
    branches: detail.branches.map((branch) => ({
      id: branch.id,
      address: branch.address,
      phone: branch.phone,
      isPrimary: branch.isPrimary,
      district: branch.district
        ? { id: branch.district.id, slug: branch.district.slug ?? "", nameUz: branch.district.nameUz ?? "" }
        : null,
      hours: branch.hours,
    })),
  };
}

export function approveAdminBusiness(id: number): Promise<AdminBusiness> {
  return authedPostJson<AdminBusiness>(`/admin/businesses/${id}/approve`, {});
}

// Backend's RejectBusinessDto requires a non-empty `reason` (@IsNotEmpty()) —
// unlike approve, this can't be a bodyless POST.
export function rejectAdminBusiness(id: number, reason: string): Promise<AdminBusiness> {
  return authedPostJson<AdminBusiness>(`/admin/businesses/${id}/reject`, { reason });
}

// Business operations (Phase 11). All ADMIN-gated server-side; each reversal
// returns 409 when the business isn't in the state it reverses.
export function verifyAdminBusiness(id: number): Promise<AdminBusiness> {
  return authedPostJson<AdminBusiness>(`/admin/businesses/${id}/verify`, {});
}

export function unverifyAdminBusiness(id: number): Promise<AdminBusiness> {
  return authedPostJson<AdminBusiness>(`/admin/businesses/${id}/unverify`, {});
}

// SuspendBusinessDto requires a non-empty `reason`. Only APPROVED businesses
// can be suspended (409 otherwise).
export function suspendAdminBusiness(id: number, reason: string): Promise<AdminBusiness> {
  return authedPostJson<AdminBusiness>(`/admin/businesses/${id}/suspend`, { reason });
}

export function unsuspendAdminBusiness(id: number): Promise<AdminBusiness> {
  return authedPostJson<AdminBusiness>(`/admin/businesses/${id}/unsuspend`, {});
}

/** `until` is an ISO date string and must be in the future (400 otherwise). */
export function promoteAdminBusiness(id: number, until: string): Promise<AdminBusiness> {
  return authedPostJson<AdminBusiness>(`/admin/businesses/${id}/promote`, { until });
}

export function unpromoteAdminBusiness(id: number): Promise<AdminBusiness> {
  return authedPostJson<AdminBusiness>(`/admin/businesses/${id}/unpromote`, {});
}

// SUPER_ADMIN only (Phase 14, D-73). Hide records the current status;
// unhide restores it, or PENDING if none was recorded. 409 on wrong state.
export function hideAdminBusiness(id: number): Promise<AdminBusiness> {
  return authedPatchJson<AdminBusiness>(`/admin/businesses/${id}/hide`, {});
}

export function unhideAdminBusiness(id: number): Promise<AdminBusiness> {
  return authedPatchJson<AdminBusiness>(`/admin/businesses/${id}/unhide`, {});
}

// Staff (ADMIN/SUPER_ADMIN) edits of a business they don't own go through the
// /admin routes only, each with a required reason that is recorded in the
// audit log (Phase 15B, D-74).
export interface AdminBusinessEditPayload {
  name?: string;
  description?: string;
  categoryId?: number;
  coverPhoto?: string;
  hasDelivery?: boolean;
  deliveryFee?: number;
  deliveryTime?: string;
  instagram?: string;
  telegram?: string;
  website?: string;
}

export function updateAdminBusiness(
  id: number,
  payload: AdminBusinessEditPayload & { reason: string },
): Promise<AdminBusiness> {
  return authedPatchJson<AdminBusiness>(`/admin/businesses/${id}`, payload);
}

export function updateAdminBusinessHours(
  id: number,
  payload: {
    reason: string;
    hours: Array<{ dayOfWeek: number; openTime?: string; closeTime?: string; isClosed?: boolean; is24Hours?: boolean }>;
  },
): Promise<MyBranchHour[]> {
  return authedPutJson<MyBranchHour[]>(`/admin/businesses/${id}/hours`, payload);
}

// Targets the business's primary branch server-side — there's no branch id
// to pass because an admin editing "the business's contact info" isn't
// meant to pick among branches the way an owner managing their own listing
// might (see UpdateBusinessBranchDto on the backend).
export function updateAdminBusinessBranch(
  id: number,
  payload: { reason: string; phone?: string; address?: string; districtId?: number },
): Promise<{ id: number; phone: string; address: string; districtId: number }> {
  return authedPatchJson(`/admin/businesses/${id}/branch`, payload);
}

export async function getAdminUsers(params?: { page?: number; limit?: number }): Promise<AdminListResult<AdminUser>> {
  const raw = await request<unknown>("/admin/users", params);
  return normalizeAdminList<AdminUser>(raw);
}

export async function getAdminEvents(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminListResult<AdminEvent>> {
  const raw = await request<unknown>("/admin/events", params);
  return normalizeAdminList<AdminEvent>(raw);
}

// `event.review` (ADMIN, SUPER_ADMIN). Both only act on a PENDING event (409
// otherwise) and refuse an event of a business the reviewer owns (403) —
// AdminService.getPendingEvent. Approve takes no body.
export function approveAdminEvent(id: number): Promise<AdminEvent> {
  return authedPostJson<AdminEvent>(`/admin/events/${id}/approve`, {});
}

export function rejectAdminEvent(id: number, reason: string): Promise<AdminEvent> {
  return authedPostJson<AdminEvent>(`/admin/events/${id}/reject`, { reason });
}

export async function getAdminReviews(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminListResult<AdminReview>> {
  const raw = await request<unknown>("/admin/reviews", params);
  return normalizeAdminList<AdminReview>(raw);
}

// Review reports (Phase 12). Customers create them; ADMIN+ moderates them.
export function reportReview(
  reviewId: number,
  payload: { reason: ReportReasonValue; note?: string },
): Promise<{ id: number; reviewId: number; reason: ReportReasonValue; status: string }> {
  return authedPostJson(`/reviews/${reviewId}/report`, payload);
}

export async function getAdminReports(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<AdminListResult<AdminReviewReport>> {
  const raw = await request<unknown>("/admin/reports", params);
  return normalizeAdminList<AdminReviewReport>(raw);
}

/** HIDE_REVIEW → report RESOLVED + review hidden; DISMISS → report DISMISSED. 409 if already handled. */
export function resolveAdminReport(
  id: number,
  action: "HIDE_REVIEW" | "DISMISS",
  note?: string,
): Promise<AdminReviewReport> {
  return authedPostJson<AdminReviewReport>(`/admin/reports/${id}/resolve`, note ? { action, note } : { action });
}

export function hideAdminReview(id: number): Promise<AdminReview> {
  return authedPostJson<AdminReview>(`/admin/reviews/${id}/hide`, {});
}

export function restoreAdminReview(id: number): Promise<AdminReview> {
  return authedPostJson<AdminReview>(`/admin/reviews/${id}/restore`, {});
}

export async function getAdminCategories(): Promise<AdminListResult<Category>> {
  const raw = await request<unknown>("/admin/categories");
  return normalizeAdminList<Category>(raw);
}

// Confirmed live (2026-08-14): POST/PATCH /admin/categories, ADMIN-gated.
export function createAdminCategory(payload: AdminCategoryPayload): Promise<Category> {
  return authedPostJson<Category>("/admin/categories", payload);
}

export function updateAdminCategory(id: number, payload: AdminCategoryPayload): Promise<Category> {
  return authedPatchJson<Category>(`/admin/categories/${id}`, payload);
}

/*
 * Owner API (/me/*). Confirmed live and working (2026-08-15) — request()
 * already attaches the bearer token to every GET when one is present, so
 * these need no separate authed variant.
 */

export function getMyStats(): Promise<MyStats> {
  return request<MyStats>("/me/stats");
}

export function getMyBusinesses(): Promise<MyBusiness[]> {
  return request<MyBusiness[]>("/me/businesses");
}

// The list endpoint above returns a lean summary shape — no description,
// no branch phone/address/district. This full-detail fetch is what backs
// the edit modal opening with real data instead of a partially-blank form.
export function getMyBusinessById(id: number): Promise<MyBusinessDetail> {
  return request<MyBusinessDetail>(`/me/businesses/${id}`);
}

export function updateMyBusiness(
  id: number,
  payload: { name?: string; description?: string; categoryId?: number },
): Promise<MyBusinessDetail> {
  return authedPatchJson<MyBusinessDetail>(`/me/businesses/${id}`, payload);
}

export function updateMyBranch(
  branchId: number,
  payload: { phone?: string; address?: string; districtId?: number },
): Promise<MyBranch> {
  return authedPatchJson<MyBranch>(`/me/branches/${branchId}`, payload);
}

export function getMyReviews(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<MyReview>> {
  return request<PaginatedResponse<MyReview>>("/me/reviews", params);
}

export function replyToMyReview(reviewId: number, body: string): Promise<unknown> {
  return authedPostJson(`/me/reviews/${reviewId}/reply`, { body });
}

export function getMyEvents(params?: { page?: number; limit?: number }): Promise<PaginatedResponse<MyEvent>> {
  return request<PaginatedResponse<MyEvent>>("/me/events", params);
}

// Confirmed live (2026-08-15): GET /admin/audit — not /admin/audit-logs, the
// path an earlier session probed and concluded was 404.
export function getAdminAuditLogs(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<AdminAuditLog>> {
  return request<PaginatedResponse<AdminAuditLog>>("/admin/audit", params);
}

export { ApiError };
