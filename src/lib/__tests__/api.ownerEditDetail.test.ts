import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getMyBusinessEditDetail } from "../api";

// The owner edit modal's prefill: GET /me/businesses/:id (owner-scoped, any
// status) mapped to the modal's BusinessEditDetail. Kept in its own file so it
// never collides with other branches' edits to api.test.ts.

const TOKEN_KEY = "myandijan_token";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const ownerDetail = {
  id: 7,
  slug: "soy",
  name: "Soy milliy taomlar",
  status: "PENDING",
  description: "Milliy taomlar",
  coverPhoto: null,
  hasDelivery: true,
  deliveryFee: 10000,
  deliveryTime: "30-40 daqiqa",
  instagram: "soy_taom",
  telegram: "@soy",
  website: "https://soy.example",
  category: { id: 1, slug: "food", nameUz: "Ovqatlanish" },
  branches: [
    {
      id: 11,
      name: "Asosiy",
      address: "Bobur shoh 1",
      phone: "+998900000001",
      isPrimary: true,
      district: { id: 1, slug: "andijon", nameUz: "Andijon" },
      hours: [
        { dayOfWeek: 0, openTime: "09:00", closeTime: "18:00", isClosed: false, is24Hours: false },
        { dayOfWeek: 4, openTime: null, closeTime: null, isClosed: false, is24Hours: true },
      ],
    },
    { id: 12, name: "Ikkinchi", address: "Navoiy 5", phone: "+998900000002", isPrimary: false, hours: [] },
  ],
};

describe("getMyBusinessEditDetail (owner edit prefill)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(TOKEN_KEY, "access-token");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads GET /me/businesses/:id with the owner's token — a PENDING listing included", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ownerDetail));
    vi.stubGlobal("fetch", fetchMock);

    const detail = await getMyBusinessEditDetail(7);

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(String(url)).pathname).toBe("/me/businesses/7");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer access-token" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(detail).toMatchObject({
      id: 7,
      name: "Soy milliy taomlar",
      status: "PENDING",
      description: "Milliy taomlar",
      instagram: "soy_taom",
      telegram: "@soy",
      website: "https://soy.example",
      category: { id: 1, slug: "food", nameUz: "Ovqatlanish" },
    });
  });

  it("keeps the primary branch first and its hours verbatim, is24Hours included", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(ownerDetail)));

    const detail = await getMyBusinessEditDetail(7);

    expect(detail.branches?.map((b) => b.id)).toEqual([11, 12]);
    expect(detail.branches?.[0]).toMatchObject({
      address: "Bobur shoh 1",
      phone: "+998900000001",
      isPrimary: true,
      district: { id: 1, slug: "andijon", nameUz: "Andijon" },
      hours: ownerDetail.branches[0].hours,
    });
    expect(detail.branches?.[0].hours?.[1]).toMatchObject({ dayOfWeek: 4, is24Hours: true });
  });

  it("fails when the primary branch has no hours list, so the modal keeps the hours locked", async () => {
    const incomplete = {
      ...ownerDetail,
      branches: [{ id: 11, name: "Asosiy", address: "", phone: "", isPrimary: true }],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(incomplete)));

    await expect(getMyBusinessEditDetail(7)).rejects.toThrow(/no hours list/);
  });

  it("passes a business with no branch through, with no branches", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ...ownerDetail, branches: [] })));

    await expect(getMyBusinessEditDetail(7)).resolves.toMatchObject({ id: 7, branches: [] });
  });

  it("propagates an API failure (403/404/500) instead of guessing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Forbidden" }, 403)));

    await expect(getMyBusinessEditDetail(7)).rejects.toBeInstanceOf(ApiError);
  });
});
