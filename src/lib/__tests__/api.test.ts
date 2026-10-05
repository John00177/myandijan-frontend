import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getAdminBusinessById, getAdminBusinessEditDetail, getRegions, notifyLogout } from "../api";

const TOKEN_KEY = "myandijan_token";
const REFRESH_TOKEN_KEY = "myandijan_refresh_token";
const USER_KEY = "myandijan_user";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("request() silent refresh-and-retry", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries once with a refreshed access token after a 401, and persists the new tokens", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-access-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "valid-refresh-token");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401)) // original request
      .mockResolvedValueOnce(jsonResponse({ accessToken: "new-access-token", refreshToken: "new-refresh-token" })) // POST /auth/refresh
      .mockResolvedValueOnce(jsonResponse([{ id: 1, slug: "andijon" }])); // retried request

    vi.stubGlobal("fetch", fetchMock);

    const result = await getRegions();

    expect(result).toEqual([{ id: 1, slug: "andijon" }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem(TOKEN_KEY)).toBe("new-access-token");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("new-refresh-token");

    const refreshCall = fetchMock.mock.calls[1];
    expect(String(refreshCall[0])).toContain("/auth/refresh");
    expect(JSON.parse(refreshCall[1].body)).toEqual({ refreshToken: "valid-refresh-token" });

    const retryCall = fetchMock.mock.calls[2];
    expect(retryCall[1].headers.Authorization).toBe("Bearer new-access-token");
  });

  it("clears the session when the refresh token is also rejected", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-access-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "dead-refresh-token");
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1 }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401)) // original request
      .mockResolvedValueOnce(jsonResponse({ message: "Invalid refresh token" }, 401)); // POST /auth/refresh fails

    vi.stubGlobal("fetch", fetchMock);

    await expect(getRegions()).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  it("does not attempt a refresh when there is no stored refresh token", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-access-token");

    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getRegions()).rejects.toThrow();

    // Exactly one call — no /auth/refresh attempt without a refresh token to send.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // ---- Phase 15E.4a: coordinated refresh -------------------------------------

  it("10 concurrent 401s → exactly ONE /auth/refresh, then 10 retries with the new token", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-access-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "valid-refresh-token");

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/auth/refresh")) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return jsonResponse({ accessToken: "new-access-token", refreshToken: "new-refresh-token" });
      }
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization;
      return auth === "Bearer new-access-token" ? jsonResponse([{ id: 1 }]) : jsonResponse({ message: "Unauthorized" }, 401);
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.all(Array.from({ length: 10 }, () => getRegions()));

    for (const result of results) expect(result).toEqual([{ id: 1 }]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(21); // 10 originals + 1 refresh + 10 retries
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("new-refresh-token");
  });

  it("a transient refresh failure (5xx) keeps the session and surfaces a retryable 503", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-access-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "valid-refresh-token");
    localStorage.setItem(USER_KEY, JSON.stringify({ id: 1 }));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "Bad gateway" }, 502));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getRegions()).rejects.toMatchObject({ status: 503 });
    expect(localStorage.getItem(TOKEN_KEY)).toBe("expired-access-token");
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe("valid-refresh-token");
    expect(localStorage.getItem(USER_KEY)).not.toBeNull();
  });

  it("retry limit: a request that still gets 401 after a successful refresh is retried only once — no loop", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-access-token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "valid-refresh-token");

    const fetchMock = vi.fn(async (url: string) =>
      String(url).includes("/auth/refresh")
        ? jsonResponse({ accessToken: "new-access-token", refreshToken: "new-refresh-token" })
        : jsonResponse({ message: "Unauthorized" }, 401),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getRegions()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(3); // original, one refresh, one retry
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull(); // the session ends instead of looping
  });

  it("logout wins: after notifyLogout a 401 does not trigger a refresh", async () => {
    localStorage.setItem(TOKEN_KEY, "expired-access-token");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Unauthorized" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const pending = getRegions();
    // What AuthContext.logout does: clear storage, then notify.
    localStorage.clear();
    notifyLogout();

    await expect(pending).rejects.toThrow();
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes("/auth/refresh"))).toHaveLength(0);
  });
});

// Phase 16E.5: the admin detail (GET /admin/businesses/:id, any status) feeds
// the review drawer and the admin edit modal's prefill.
describe("admin business detail", () => {
  /** A PENDING listing as GET /admin/businesses/:id returns it. */
  const adminDetail = {
    id: 5,
    slug: "soy-milliy-taomlar",
    name: "Soy milliy taomlar",
    status: "PENDING",
    description: "Milliy taomlar",
    coverPhoto: null,
    hasDelivery: true,
    deliveryFee: 10000,
    deliveryTime: "30 daqiqa",
    instagram: null,
    telegram: "@soy",
    website: null,
    owner: { id: 7, fullName: "Sardor Aliyev" },
    category: { id: 1, slug: "food", nameUz: "Ovqatlanish" },
    businessType: { id: 2, slug: "restaurant", nameUz: "Restoran" },
    branches: [
      {
        id: 11,
        name: "Markaziy",
        address: "Bobur shoh 1",
        landmark: "Xiyobon yonida",
        phone: "+998900000001",
        phoneAlt: null,
        lat: "40.78250000",
        lng: "72.34420000",
        isPrimary: true,
        isActive: true,
        district: { id: 1, slug: "andijon", nameUz: "Andijon" },
        city: null,
        hours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "20:00", isClosed: false, is24Hours: false },
          { dayOfWeek: 1, openTime: null, closeTime: null, isClosed: false, is24Hours: true },
        ],
        photos: [{ url: "https://cdn.example/1.jpg", thumbUrl: null, caption: "Zal", isPrimary: true, sortOrder: 0 }],
      },
      {
        id: 12,
        name: "Asaka",
        address: "Asaka 5",
        phone: "+998900000002",
        isPrimary: false,
        isActive: true,
        district: { id: 2, slug: "asaka", nameUz: "Asaka" },
        city: null,
        hours: [],
        photos: [],
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, "access-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads GET /admin/businesses/:id with the staff token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(adminDetail));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAdminBusinessById(5)).resolves.toEqual(adminDetail);
    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe("/admin/businesses/5");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer access-token" });
  });

  it("prefills the admin edit from the admin detail — a PENDING listing included — keeping branch order and is24Hours", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(adminDetail));
    vi.stubGlobal("fetch", fetchMock);

    const detail = await getAdminBusinessEditDetail(5);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(detail).toMatchObject({
      id: 5,
      name: "Soy milliy taomlar",
      status: "PENDING",
      telegram: "@soy",
      category: { id: 1, slug: "food", nameUz: "Ovqatlanish" },
    });
    expect(detail.branches?.map((b) => b.id)).toEqual([11, 12]);
    expect(detail.branches?.[0]).toMatchObject({
      address: "Bobur shoh 1",
      phone: "+998900000001",
      isPrimary: true,
      district: { id: 1, slug: "andijon", nameUz: "Andijon" },
      hours: adminDetail.branches[0].hours,
    });
    expect(detail.branches?.[0].hours?.[1]).toMatchObject({ dayOfWeek: 1, is24Hours: true });
  });

  it("falls back to the public GET /businesses/:id only when the admin route answers 404 (not deployed yet)", async () => {
    const publicDetail = { id: 5, slug: "soy", name: "Soy", branches: [] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Cannot GET /admin/businesses/5" }, 404))
      .mockResolvedValueOnce(jsonResponse(publicDetail));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAdminBusinessEditDetail(5)).resolves.toEqual(publicDetail);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
      "/admin/businesses/5",
      "/businesses/5",
    ]);
  });

  it("does not fall back on any other failure, so the modal keeps the hours locked", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Internal server error" }, 500));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getAdminBusinessEditDetail(5)).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(["/admin/businesses/5"]);
  });
});
