import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRegions } from "../api";

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
});
