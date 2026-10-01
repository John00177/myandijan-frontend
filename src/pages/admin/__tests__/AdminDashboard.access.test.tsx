import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../../contexts/AuthContext";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import AdminDashboard from "../AdminDashboard";

vi.mock("../../../lib/api", () => import("../../../test/apiMock"));

import { getAdminBusinesses, getAdminStats, getMe } from "../../../test/apiMock";

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

// The frontend gate mirrors the server's floors (Phase 14, D-72): MODERATOR+
// may open the panel, but a MODERATOR only sees the three views whose routes
// are MODERATOR+ on the server; every other view's data is ADMIN-only.
const ADMIN_ONLY_NAV = ["Boshqaruv paneli", "Analitika", "Foydalanuvchilar", "Da'volar", "Audit jurnali", "Sozlamalar"];

describe("AdminDashboard role gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it.each(["CUSTOMER", "BUSINESS_OWNER", "SUPPORT"])("keeps %s out of the admin panel", async (role) => {
    signInAs(role);
    renderAdmin();

    expect(await screen.findByText("Sizda admin huquqlari yo'q")).toBeInTheDocument();
    expect(screen.queryByText("Shikoyatlar")).not.toBeInTheDocument();
  });

  it("lets a MODERATOR in with only the business, review and report views", async () => {
    signInAs("MODERATOR");
    renderAdmin();

    expect((await screen.findAllByText("Shikoyatlar")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bizneslar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sharhlar").length).toBeGreaterThan(0);
    for (const label of ADMIN_ONLY_NAV) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.getAllByText("Moderator").length).toBeGreaterThan(0);
    expect(screen.queryByText("Sizda admin huquqlari yo'q")).not.toBeInTheDocument();
  });

  it("lands a MODERATOR on the business queue, never the ADMIN-only home/stats view", async () => {
    signInAs("MODERATOR");
    renderAdmin();

    await waitFor(() => expect(getAdminBusinesses).toHaveBeenCalled());
    expect(getAdminStats).not.toHaveBeenCalled();
  });

  it("still shows the full navigation to an ADMIN", async () => {
    signInAs("ADMIN");
    renderAdmin();

    expect((await screen.findAllByText("Foydalanuvchilar")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Audit jurnali").length).toBeGreaterThan(0);
  });

  it.each(["ADMIN", "SUPER_ADMIN"])("lets %s in, with the review-report queue in the navigation", async (role) => {
    signInAs(role);
    renderAdmin();

    expect((await screen.findAllByText("Shikoyatlar")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Sizda admin huquqlari yo'q")).not.toBeInTheDocument();
  });
});
