import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import BusinessDetailPage from "../BusinessDetailPage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

import { ApiError, getBusiness, mockBusiness } from "../../test/apiMock";

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;

function renderBusinessDetailPage() {
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

describe("BusinessDetailPage", () => {
  it("renders the business name once loaded", async () => {
    renderBusinessDetailPage();

    expect(await screen.findByText(mockBusiness.nameUz)).toBeInTheDocument();
  });

  // Phase 16F.1: not-found states are never indexable.
  it("marks a confirmed not-found (404) noindex, with a not-found title and no canonical", async () => {
    getBusiness.mockRejectedValueOnce(new ApiError("Business not found", 404));
    renderBusinessDetailPage();

    expect(await screen.findByText("Biznes topilmadi")).toBeInTheDocument();
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
    expect(document.title).toBe("Biznes topilmadi — My Andijan");
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelectorAll('link[rel="alternate"]')).toHaveLength(0);
  });

  it("does not noindex a transient failure — the business may well exist", async () => {
    getBusiness.mockRejectedValueOnce(new ApiError("Internal server error", 500));
    renderBusinessDetailPage();

    expect(await screen.findByText("Biznes topilmadi")).toBeInTheDocument();
    expect(robots()).toBeNull();
  });

  it("keeps a found business indexable with its canonical", async () => {
    renderBusinessDetailPage();

    await screen.findByText(mockBusiness.nameUz);
    await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull());
    expect(robots()).toBeNull();
  });
});
