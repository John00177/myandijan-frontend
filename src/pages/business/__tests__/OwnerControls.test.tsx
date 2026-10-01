import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../../contexts/AuthContext";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import { ownsBusiness } from "../../../lib/ownership";
import type { Review } from "../../../types";
import BusinessDetailPage from "../../BusinessDetailPage";
import ReviewsSection from "../ReviewsSection";

vi.mock("../../../lib/api", () => import("../../../test/apiMock"));

import { getBusiness, getBusinessMenu, getMe, mockBusiness, mockMenuItem } from "../../../test/apiMock";

// Phase 15B (D-74): business content controls on the public page — catalog
// management and replying to reviews — are shown to the business OWNER only.
// Staff roles no longer get them on someone else's business (the server
// refuses those requests too; this is UX, not the security boundary).
const STAFF_ROLES = ["SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
const ALL_ROLES = ["CUSTOMER", "BUSINESS_OWNER", ...STAFF_ROLES] as const;
const ME = 7;
const SOMEONE_ELSE = 99;

function signInAs(role: string) {
  const user = { id: ME, fullName: "Test", phone: "+998901234567", role };
  localStorage.setItem("myandijan_token", "fake-token");
  localStorage.setItem("myandijan_refresh_token", "fake-refresh-token");
  localStorage.setItem("myandijan_user", JSON.stringify(user));
  getMe.mockResolvedValue(user);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("ownsBusiness", () => {
  it.each(ALL_ROLES)("is true for a %s who owns the business", (role) => {
    expect(ownsBusiness({ id: ME, role } as { id: number }, ME)).toBe(true);
  });

  it.each(ALL_ROLES)("is false for a %s who does not — no role is an override", (role) => {
    expect(ownsBusiness({ id: ME, role } as { id: number }, SOMEONE_ELSE)).toBe(false);
  });

  it("is false for a signed-out visitor and for an unclaimed business", () => {
    expect(ownsBusiness(null, ME)).toBe(false);
    expect(ownsBusiness({ id: ME }, null)).toBe(false);
  });
});

describe("Review reply control", () => {
  const review = {
    id: 11,
    rating: 4,
    comment: "Yaxshi",
    createdAt: "2026-09-20T10:00:00.000Z",
    user: { id: 3, fullName: "Ali Valiyev" },
    reply: null,
  } as unknown as Review;

  function renderReviews(ownerId: number) {
    return render(
      <MemoryRouter initialEntries={["/uz/business/soy"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang/business/:slug"
              element={
                <LanguageProvider>
                  <ReviewsSection businessId={1} ownerId={ownerId} reviews={[review]} onChanged={() => {}} />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it.each(STAFF_ROLES)("is hidden from a %s on a business it doesn't own", async (role) => {
    signInAs(role);
    renderReviews(SOMEONE_ELSE);

    expect(await screen.findByText("Yaxshi")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Javob berish" })).not.toBeInTheDocument();
  });

  it("is shown to the business owner", async () => {
    signInAs("BUSINESS_OWNER");
    renderReviews(ME);

    expect(await screen.findByRole("button", { name: "Javob berish" })).toBeInTheDocument();
  });
});

describe("Catalog management control on the business page", () => {
  function renderPage(ownerId: number) {
    getBusiness.mockResolvedValue({ ...mockBusiness, ownerId });
    getBusinessMenu.mockResolvedValue([mockMenuItem]);
    return render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[`/uz/business/${mockBusiness.slug}`]}>
          <AuthProvider>
            <Routes>
              <Route
                path="/:lang/business/:slug"
                element={
                  <LanguageProvider>
                    <BusinessDetailPage />
                  </LanguageProvider>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </HelmetProvider>,
    );
  }

  async function openMenuTab() {
    fireEvent.click(await screen.findByRole("button", { name: "Menyu" }));
    await waitFor(() => expect(getBusinessMenu).toHaveBeenCalled());
  }

  it.each(STAFF_ROLES)("is hidden from a %s on a business it doesn't own", async (role) => {
    signInAs(role);
    renderPage(SOMEONE_ELSE);
    await openMenuTab();

    expect(await screen.findByText(mockMenuItem.name)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Taom qo'shish/ })).not.toBeInTheDocument();
  });

  it("is shown to the business owner", async () => {
    signInAs("BUSINESS_OWNER");
    renderPage(ME);
    await openMenuTab();

    expect(await screen.findByRole("button", { name: /Taom qo'shish/ })).toBeInTheDocument();
  });
});
