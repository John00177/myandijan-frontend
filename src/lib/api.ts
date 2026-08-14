import type {
  AdminBusiness,
  AdminEvent,
  AdminListResult,
  AdminStats,
  AdminUser,
  AuthResponse,
  Business,
  Category,
  CreateBusinessPayload,
  Event,
  Lang,
  LoginPayload,
  PaginatedResponse,
  Region,
  RegisterPayload,
  SearchBusinessesParams,
} from "../types";

const BASE = import.meta.env.VITE_API_URL || "https://myandijan-api-production.up.railway.app";
const TIMEOUT_MS = 10_000;
const TOKEN_KEY = "myandijan_token";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
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
    const res = await fetch(url.toString(), { headers, signal: controller.signal });
    if (!res.ok) {
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

export function getFeaturedBusinesses(lang?: Lang): Promise<Business[]> {
  return request<Business[]>("/businesses/featured", { lang });
}

export function searchBusinesses(params: SearchBusinessesParams): Promise<PaginatedResponse<Business>> {
  const { lang: _lang, ...rest } = params;
  return request<PaginatedResponse<Business>>("/businesses", rest);
}

export function getBusiness(slug: string, lang?: Lang): Promise<Business> {
  return request<Business>(`/businesses/${slug}`, { lang });
}

export function getEvents(): Promise<PaginatedResponse<Event>> {
  return request<PaginatedResponse<Event>>("/events");
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
    const res = await fetch(new URL(path, BASE).toString(), {
      method: "DELETE",
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
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
async function authedPostJson<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(new URL(path, BASE).toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
      throw new ApiError(message ?? `Request failed: ${res.status}`, res.status);
    }
    return (await res.json().catch(() => undefined)) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function createBusiness(payload: CreateBusinessPayload): Promise<Business> {
  return authedPostJson<Business>("/businesses", payload);
}

export function getFavorites(lang?: Lang): Promise<Business[]> {
  return request<Business[]>("/favorites", { lang });
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

export async function getAdminBusinesses(params?: {
  page?: number;
  limit?: number;
}): Promise<AdminListResult<AdminBusiness>> {
  const raw = await request<unknown>("/admin/businesses", params);
  return normalizeAdminList<AdminBusiness>(raw);
}

export async function getAdminUsers(params?: { page?: number; limit?: number }): Promise<AdminListResult<AdminUser>> {
  const raw = await request<unknown>("/admin/users", params);
  return normalizeAdminList<AdminUser>(raw);
}

export async function getAdminEvents(): Promise<AdminListResult<AdminEvent>> {
  const raw = await request<unknown>("/admin/events");
  return normalizeAdminList<AdminEvent>(raw);
}

export async function getAdminCategories(): Promise<AdminListResult<Category>> {
  const raw = await request<unknown>("/admin/categories");
  return normalizeAdminList<Category>(raw);
}

export { ApiError };
