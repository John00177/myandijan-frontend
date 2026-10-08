import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../../contexts/AuthContext";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import BusinessDetailPage from "../../BusinessDetailPage";

vi.mock("../../../lib/api", () => import("../../../test/apiMock"));

import { ApiError, createClaim, getBusiness, getMe, getMyClaims, mockBusiness, mockMyClaim } from "../../../test/apiMock";

const noClaims = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
const claimsPage = (claims: (typeof mockMyClaim)[]) => ({
  data: claims,
  meta: { page: 1, limit: 20, total: claims.length, totalPages: 1 },
});

/** Surfaces AuthContext's modal flag so the test can assert the auth gate fired. */
function AuthModalProbe() {
  const { isAuthModalOpen } = useAuth();
  return <div data-testid="auth-modal-open">{String(isAuthModalOpen)}</div>;
}

function renderBusinessDetailPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/uz/business/${mockBusiness.slug}`]}>
        <AuthProvider>
          <AuthModalProbe />
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

const signedInUser = { id: 7, fullName: "Sardor Aliyev", phone: "+998901234567", role: "CUSTOMER" };

function signIn() {
  localStorage.setItem("myandijan_token", "fake-token");
  localStorage.setItem("myandijan_refresh_token", "fake-refresh-token");
  localStorage.setItem("myandijan_user", JSON.stringify(signedInUser));
  getMe.mockResolvedValue(signedInUser);
}

async function openClaimForm() {
  fireEvent.click(await screen.findByRole("button", { name: "Egalik qilish" }));
  return screen.findByRole("button", { name: "Yuborish" });
}

describe("ClaimBusinessSection", () => {
  beforeEach(() => {
    localStorage.clear();
    getBusiness.mockResolvedValue(mockBusiness);
    getMe.mockRejectedValue(new Error("not authenticated"));
  });

  afterEach(() => {
    createClaim.mockReset();
    getMyClaims.mockReset().mockResolvedValue(noClaims);
  });

  it("shows the claim CTA for an unclaimed business", async () => {
    renderBusinessDetailPage();

    expect(await screen.findByText("Bu sizning biznesingizmi?")).toBeInTheDocument();
  });

  it("hides the claim CTA once the business already has an owner", async () => {
    getBusiness.mockResolvedValue({ ...mockBusiness, ownerId: 99 });

    renderBusinessDetailPage();

    await screen.findByText(mockBusiness.nameUz);
    expect(screen.queryByText("Bu sizning biznesingizmi?")).not.toBeInTheDocument();
  });

  it("opens the login modal instead of the claim form for an unauthenticated visitor", async () => {
    renderBusinessDetailPage();

    fireEvent.click(await screen.findByRole("button", { name: "Egalik qilish" }));

    expect(screen.getByTestId("auth-modal-open")).toHaveTextContent("true");
    expect(screen.queryByRole("button", { name: "Yuborish" })).not.toBeInTheDocument();
    expect(createClaim).not.toHaveBeenCalled();
  });

  it("submits a claim and shows the pending-review confirmation for a signed-in user", async () => {
    signIn();
    createClaim.mockResolvedValue(mockMyClaim);

    renderBusinessDetailPage();

    const submit = await openClaimForm();
    fireEvent.change(screen.getByPlaceholderText("Masalan: men ushbu biznesning egasiman..."), {
      target: { value: "Men egasiman" },
    });
    fireEvent.click(submit);

    expect(await screen.findByText("Da'vo yuborildi")).toBeInTheDocument();
    expect(createClaim).toHaveBeenCalledWith(
      expect.objectContaining({ businessId: mockBusiness.id, evidence: "Men egasiman" }),
    );
  });

  it("shows the claim-specific conflict message when the backend returns 409", async () => {
    signIn();
    createClaim.mockRejectedValue(new ApiError("Conflict", 409));

    renderBusinessDetailPage();

    fireEvent.click(await openClaimForm());

    expect(
      await screen.findByText(
        "Bu biznes allaqachon egalik qilingan yoki sizda u uchun ko'rib chiqilayotgan da'vo bor.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Da'vo yuborildi")).not.toBeInTheDocument();
  });

  it("disables the submit button while the claim request is in flight", async () => {
    signIn();
    let resolveClaim: (value: typeof mockMyClaim) => void = () => {};
    createClaim.mockReturnValue(new Promise((resolve) => (resolveClaim = resolve)));

    renderBusinessDetailPage();

    fireEvent.click(await openClaimForm());

    await waitFor(() => expect(screen.getByRole("button", { name: "Kutilmoqda..." })).toBeDisabled());
    resolveClaim(mockMyClaim);
    expect(await screen.findByText("Da'vo yuborildi")).toBeInTheDocument();
  });

  // Phase 16D: after a reload the pending claim is shown, not the CTA.
  it("shows the under-review state instead of the CTA when the user already has a pending claim here", async () => {
    signIn();
    getMyClaims.mockResolvedValue(claimsPage([{ ...mockMyClaim, status: "PENDING" }]));

    renderBusinessDetailPage();

    expect(await screen.findByText("Da'vongiz ko'rib chiqilmoqda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Egalik qilish" })).not.toBeInTheDocument();
  });

  it("keeps the CTA when the user's claim here was rejected, or their pending claim is for another business", async () => {
    signIn();
    getMyClaims.mockResolvedValue(
      claimsPage([
        { ...mockMyClaim, id: 2, status: "REJECTED", rejectionReason: "Hujjat yetarli emas" },
        { ...mockMyClaim, id: 3, status: "PENDING", business: { id: 99, slug: "boshqa", name: "Boshqa biznes" } },
      ]),
    );

    renderBusinessDetailPage();

    expect(await screen.findByRole("button", { name: "Egalik qilish" })).toBeInTheDocument();
    expect(screen.queryByText("Da'vongiz ko'rib chiqilmoqda")).not.toBeInTheDocument();
  });

  it("does not ask for the user's claims when the business already has an owner", async () => {
    signIn();
    getBusiness.mockResolvedValue({ ...mockBusiness, ownerId: 99 });

    renderBusinessDetailPage();

    await screen.findByText(mockBusiness.nameUz);
    expect(getMyClaims).not.toHaveBeenCalled();
  });
});
