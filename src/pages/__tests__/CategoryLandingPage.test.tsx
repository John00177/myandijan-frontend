import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import CategoryLandingPage from "../CategoryLandingPage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

import { ApiError, emptyPage, getCategoryBySlug, mockBusiness, mockCategories, searchBusinesses } from "../../test/apiMock";

function renderCategoryPage(slug = mockCategories[0].slug) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/uz/category/${slug}`]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang/category/:slug"
              element={
                <LanguageProvider>
                  <CategoryLandingPage />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("CategoryLandingPage", () => {
  beforeEach(() => {
    getCategoryBySlug.mockReset();
    searchBusinesses.mockReset();
    getCategoryBySlug.mockResolvedValue(mockCategories[0]);
    searchBusinesses.mockResolvedValue(emptyPage);
  });

  it("renders the category name and a real business, linking to its detail page", async () => {
    searchBusinesses.mockResolvedValue({
      data: [mockBusiness],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderCategoryPage();

    expect(await screen.findByRole("heading", { name: "Ovqatlanish" })).toBeInTheDocument();
    const link = await screen.findByRole("link", { name: new RegExp(mockBusiness.nameUz) });
    expect(link).toHaveAttribute("href", expect.stringContaining(`/business/${mockBusiness.slug}`));
  });

  it("shows an empty state when the category has no businesses", async () => {
    searchBusinesses.mockResolvedValue(emptyPage);

    renderCategoryPage();

    expect(await screen.findByText("Ovqatlanish toifasida hozircha tasdiqlangan biznes yo'q.")).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown category slug", async () => {
    getCategoryBySlug.mockRejectedValue(new ApiError("Not found", 404));

    renderCategoryPage("does-not-exist");

    expect(await screen.findByText("Turkum topilmadi")).toBeInTheDocument();
  });

  // Phase 16F.1: a confirmed not-found is noindex; a transient failure is not.
  it("marks an unknown category slug noindex", async () => {
    getCategoryBySlug.mockRejectedValue(new ApiError("Not found", 404));

    renderCategoryPage("does-not-exist");

    await screen.findByText("Turkum topilmadi");
    await waitFor(() =>
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow"),
    );
    expect(document.title).toBe("Turkum topilmadi — My Andijan");
  });

  it("does not noindex the category page when the lookup fails transiently", async () => {
    getCategoryBySlug.mockRejectedValue(new ApiError("Internal server error", 500));

    renderCategoryPage();

    await screen.findByText("Turkum topilmadi");
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("sets a unique, category-specific title and description", async () => {
    searchBusinesses.mockResolvedValue({
      data: [mockBusiness],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderCategoryPage();

    await screen.findByRole("heading", { name: "Ovqatlanish" });
    expect(document.title).toBe("Ovqatlanish — Andijon viloyati | My Andijan");
    expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toContain("Ovqatlanish");
  });
});
