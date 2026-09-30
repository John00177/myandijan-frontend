import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import SearchPage from "../SearchPage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));
// Leaflet needs real layout measurement that jsdom doesn't provide — the map
// panel isn't part of what these tests are checking, so it's stubbed out.
vi.mock("../search/SearchMap", () => ({ default: () => null }));

import { mockBusiness, emptyPage, searchBusinesses, searchBusinessesFts } from "../../test/apiMock";

function renderSearchPage(initialPath = "/uz/search") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang/search"
              element={
                <LanguageProvider>
                  <SearchPage />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("SearchPage", () => {
  afterEach(() => {
    searchBusinesses.mockReset();
    searchBusinessesFts.mockReset();
  });

  it("shows a no-results state when the search returns nothing", async () => {
    searchBusinesses.mockResolvedValue(emptyPage);

    renderSearchPage();

    expect(await screen.findByText("Hech narsa topilmadi")).toBeInTheDocument();
  });

  it("lists a business card when browsing without a text query", async () => {
    searchBusinesses.mockResolvedValue({
      data: [mockBusiness],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderSearchPage();

    expect(await screen.findByText(mockBusiness.nameUz)).toBeInTheDocument();
    expect(searchBusinessesFts).not.toHaveBeenCalled();
  });

  it("uses the FTS endpoint and lists a business card when a text query is present in the URL", async () => {
    searchBusinessesFts.mockResolvedValue({
      data: [mockBusiness],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    renderSearchPage("/uz/search?q=osh");

    expect(await screen.findByText(mockBusiness.nameUz)).toBeInTheDocument();
    expect(searchBusinessesFts).toHaveBeenCalledWith(expect.objectContaining({ search: "osh" }));
    expect(searchBusinesses).not.toHaveBeenCalled();
  });
});
