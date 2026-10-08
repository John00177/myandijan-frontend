import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, resubmitMyBusiness } from "../api";

// Phase 16I: an owner sends a REJECTED listing back to moderation.
// (Its own file so it never collides with frontend PR #6's api.test.ts edits.)

const TOKEN_KEY = "myandijan_token";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("resubmitMyBusiness()", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, "access-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs /me/businesses/:id/resubmit with the owner's token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 5, status: "PENDING" }, 201));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resubmitMyBusiness(5)).resolves.toMatchObject({ id: 5, status: "PENDING" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe("/me/businesses/5/resubmit");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer access-token" });
  });

  it("surfaces the API's 409 (no longer REJECTED) as an ApiError with that status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Only a rejected listing can be resubmitted" }, 409)),
    );

    const error = await resubmitMyBusiness(5).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
  });
});
