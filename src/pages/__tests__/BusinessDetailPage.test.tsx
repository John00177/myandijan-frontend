import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import BusinessDetailPage from "../BusinessDetailPage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

import { mockBusiness } from "../../test/apiMock";

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
});
