import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import ProfilePage from "../ProfilePage";

vi.mock("../../lib/api", () => import("../../test/apiMock"));

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
