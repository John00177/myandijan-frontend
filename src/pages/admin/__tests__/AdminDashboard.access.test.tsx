import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../../contexts/AuthContext";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import AdminDashboard from "../AdminDashboard";

vi.mock("../../../lib/api", () => import("../../../test/apiMock"));

import { getMe } from "../../../test/apiMock";

function signInAs(role: string) {
  const user = { id: 1, fullName: "Test User", phone: "+998901234567", role };
  localStorage.setItem("myandijan_token", "fake-token");
  localStorage.setItem("myandijan_refresh_token", "fake-refresh-token");
  localStorage.setItem("myandijan_user", JSON.stringify(user));
  getMe.mockResolvedValue(user);
}

function renderAdmin() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/uz/admin"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang/admin"
              element={
                <LanguageProvider>
                  <AdminDashboard />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

// The admin panel's reads (stats, businesses, reviews, reports, claims) are all
// ADMIN-floor on the server, so the frontend gate must match: a MODERATOR —
// who can only POST approve/reject on a business id it has no way to list —
// would otherwise land in a panel where every view 403s (Phase 12, D-68).
describe("AdminDashboard role gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it.each(["CUSTOMER", "BUSINESS_OWNER", "SUPPORT", "MODERATOR"])("keeps %s out of the admin panel", async (role) => {
    signInAs(role);
    renderAdmin();

    expect(await screen.findByText("Sizda admin huquqlari yo'q")).toBeInTheDocument();
    expect(screen.queryByText("Shikoyatlar")).not.toBeInTheDocument();
  });

  it.each(["ADMIN", "SUPER_ADMIN"])("lets %s in, with the review-report queue in the navigation", async (role) => {
    signInAs(role);
    renderAdmin();

    expect((await screen.findAllByText("Shikoyatlar")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Sizda admin huquqlari yo'q")).not.toBeInTheDocument();
  });
});
