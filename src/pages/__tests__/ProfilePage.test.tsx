import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import ProfilePage from "../ProfilePage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

import { getMe, getMyClaims, mockMyClaim } from "../../test/apiMock";

/** Surfaces AuthContext's modal flag so the test can assert the auth gate fired. */
function AuthModalProbe() {
  const { isAuthModalOpen } = useAuth();
  return <div data-testid="auth-modal-open">{String(isAuthModalOpen)}</div>;
}

function renderProfilePage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/uz/profile"]}>
        <AuthProvider>
          <AuthModalProbe />
          <Routes>
            <Route
              path="/:lang/profile"
              element={
                <LanguageProvider>
                  <ProfilePage />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("ProfilePage (protected route)", () => {
  it("gates an unauthenticated visitor instead of rendering profile data", async () => {
    renderProfilePage();

    // useRequireAuth opens the shared auth modal rather than redirecting —
    // the page itself shows a loading placeholder, never the profile form.
    expect(await screen.findByTestId("auth-modal-open")).toHaveTextContent("true");
    expect(screen.getByText("Yuklanmoqda...")).toBeInTheDocument();
    expect(screen.queryByText("Chiqish")).not.toBeInTheDocument();
  });
});

describe("ProfilePage — My Claims", () => {
  const signedInUser = { id: 7, fullName: "Sardor Aliyev", phone: "+998901234567", role: "CUSTOMER" };

  function signIn() {
    localStorage.setItem("myandijan_token", "fake-token");
    localStorage.setItem("myandijan_refresh_token", "fake-refresh-token");
    localStorage.setItem("myandijan_user", JSON.stringify(signedInUser));
    getMe.mockResolvedValue(signedInUser);
  }

  function claimFor(id: number, name: string, status: "PENDING" | "APPROVED" | "REJECTED") {
    return { ...mockMyClaim, id, status, business: { id, slug: `biz-${id}`, name } };
  }

  afterEach(() => {
    localStorage.clear();
    getMyClaims.mockReset();
    getMe.mockReset();
  });

  it("shows each claim with its PENDING, APPROVED or REJECTED status badge", async () => {
    signIn();
    getMyClaims.mockResolvedValue({
      data: [claimFor(1, "Huzur Kafe", "PENDING"), claimFor(2, "Soy taomlar", "APPROVED"), claimFor(3, "Asaka Market", "REJECTED")],
      meta: { page: 1, limit: 20, total: 3, totalPages: 1 },
    });

    renderProfilePage();

    expect(await screen.findByText("Mening da'volarim")).toBeInTheDocument();
    expect(within(screen.getByText("Huzur Kafe").parentElement!).getByText("Kutilmoqda")).toBeInTheDocument();
    expect(within(screen.getByText("Soy taomlar").parentElement!).getByText("Tasdiqlangan")).toBeInTheDocument();
    expect(within(screen.getByText("Asaka Market").parentElement!).getByText("Rad etilgan")).toBeInTheDocument();
  });

  // Phase 16D
  it("shows the admin's reason under a rejected claim, and no reason line for other statuses", async () => {
    signIn();
    getMyClaims.mockResolvedValue({
      data: [
        { ...claimFor(3, "Asaka Market", "REJECTED"), rejectionReason: "  Hujjat yetarli emas  " },
        { ...claimFor(1, "Huzur Kafe", "PENDING"), rejectionReason: "eski izoh" },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });

    renderProfilePage();

    expect(await screen.findByText("Sabab: Hujjat yetarli emas")).toBeInTheDocument();
    expect(screen.queryByText(/eski izoh/)).not.toBeInTheDocument();
  });

  it("omits the My Claims section entirely when the user has no claims", async () => {
    signIn();
    getMyClaims.mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });

    renderProfilePage();

    expect(await screen.findByText(signedInUser.fullName)).toBeInTheDocument();
    expect(getMyClaims).toHaveBeenCalled();
    expect(screen.queryByText("Mening da'volarim")).not.toBeInTheDocument();
  });
});
