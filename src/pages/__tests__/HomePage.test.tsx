import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import HomePage from "../HomePage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

function renderHomePage() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/uz"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang"
              element={
                <LanguageProvider>
                  <HomePage />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("HomePage", () => {
  it("renders the hero heading and search input without crashing", async () => {
    renderHomePage();

    expect(await screen.findByText("ANDIJON VILOYATI")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Restoran, do'kon, xizmat...")).toBeInTheDocument();
  });
});
