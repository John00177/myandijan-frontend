import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    expect(await screen.findByRole("heading", { name: mockBusiness.nameUz })).toBeInTheDocument();
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

    expect(await screen.findByText("Xatolik yuz berdi")).toBeInTheDocument();
    expect(robots()).toBeNull();
  });

  it("keeps a found business indexable with its canonical", async () => {
    renderBusinessDetailPage();

    await screen.findByRole("heading", { name: mockBusiness.nameUz });
    await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull());
    expect(robots()).toBeNull();
  });
});

describe("BusinessDetailPage — SEO business page", () => {
  const ldBlocks = () =>
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map((el) =>
      JSON.parse(el.textContent ?? "{}"),
    );

  const seoBusiness = {
    ...mockBusiness,
    category: { id: 3, slug: "oziq-ovqat", nameUz: "Oziq-ovqat", nameRu: "Еда", nameEn: "Food" },
    district: { id: 7, slug: "asaka", nameUz: "Asaka", nameRu: "Асака", nameEn: "Asaka" },
    website: "https://soy.uz",
    instagram: "@soy",
    metaTitleUz: "Soy — Andijondagi eng yaxshi palov",
    metaDescriptionUz: "Egasi yozgan tavsif",
  } as unknown as typeof mockBusiness;

  it("renders breadcrumbs Home › Category › District › Business with matching JSON-LD", async () => {
    getBusiness.mockResolvedValueOnce(seoBusiness);
    renderBusinessDetailPage();

    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(nav.querySelector('a[href="/uz/category/oziq-ovqat"]')).not.toBeNull();
    expect(nav.querySelector('a[href="/uz/district/asaka"]')).not.toBeNull();

    await waitFor(() => expect(ldBlocks().some((b) => b["@type"] === "BreadcrumbList")).toBe(true));
    const crumbs = ldBlocks().find((b) => b["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      "Bosh sahifa",
      "Oziq-ovqat",
      "Asaka",
      mockBusiness.nameUz,
    ]);
  });

  it("uses the owner's meta overrides, the category subtype and absolute sameAs links", async () => {
    getBusiness.mockResolvedValueOnce(seoBusiness);
    renderBusinessDetailPage();

    await waitFor(() => expect(document.title).toBe("Soy — Andijondagi eng yaxshi palov"));
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
      "Egasi yozgan tavsif",
    );
    const business = ldBlocks().find((b) => b["@type"] === "FoodEstablishment");
    expect(business).toBeDefined();
    expect(business.sameAs).toEqual(["https://soy.uz"]);
  });

  it("offers a retry on a transient failure and recovers", async () => {
    getBusiness.mockRejectedValueOnce(new ApiError("Internal server error", 500));
    renderBusinessDetailPage();

    fireEvent.click(await screen.findByRole("button", { name: "Qayta urinish" }));
    expect(await screen.findByRole("heading", { name: mockBusiness.nameUz })).toBeInTheDocument();
  });
});
