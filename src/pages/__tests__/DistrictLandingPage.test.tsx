import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import DistrictLandingPage from "../DistrictLandingPage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

import { emptyPage, getRegions, mockBusiness, mockDistrict, mockRegions, searchBusinesses } from "../../test/apiMock";

function renderDistrictPage(slug = mockDistrict.slug) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/uz/district/${slug}`]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang/district/:slug"
              element={
                <LanguageProvider>
                  <DistrictLandingPage />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("DistrictLandingPage", () => {
  beforeEach(() => {
    getRegions.mockReset();
    searchBusinesses.mockReset();
    getRegions.mockResolvedValue([{ ...mockRegions[0], districts: [mockDistrict] }]);
    searchBusinesses.mockResolvedValue(emptyPage);
  });

  it("renders the district name and a real business, linking to its detail page", async () => {
    searchBusinesses.mockResolvedValue({
      data: [mockBusiness],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderDistrictPage();

    expect(await screen.findByRole("heading", { name: mockDistrict.nameUz })).toBeInTheDocument();
    const link = await screen.findByRole("link", { name: new RegExp(mockBusiness.nameUz) });
    expect(link).toHaveAttribute("href", expect.stringContaining(`/business/${mockBusiness.slug}`));
  });

  it("shows an empty state when the district has no businesses", async () => {
    searchBusinesses.mockResolvedValue(emptyPage);

    renderDistrictPage();

    expect(
      await screen.findByText(`${mockDistrict.nameUz} tumanida hozircha tasdiqlangan biznes yo'q.`),
    ).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown district slug", async () => {
    renderDistrictPage("does-not-exist");

    expect(await screen.findByText("Tuman topilmadi")).toBeInTheDocument();
  });

  it("sets a unique, district-specific title", async () => {
    searchBusinesses.mockResolvedValue({
      data: [mockBusiness],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderDistrictPage();

    await screen.findByRole("heading", { name: mockDistrict.nameUz });
    expect(document.title).toBe(`${mockDistrict.nameUz} tumanidagi bizneslar | My Andijan`);
  });
});
