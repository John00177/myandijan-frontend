import { testUser } from "../../test/roleCapabilities";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../contexts/AuthContext";
import { LanguageProvider } from "../../contexts/LanguageContext";
import OwnerDashboard from "../OwnerDashboard";

vi.mock("../../lib/api", () => import("../../test/apiMock"));
// Only the gate is under test: stand in for the owner home view's data.
vi.mock("../dashboard/views/DashboardHomeView", () => ({ default: () => <div>owner-home</div> }));

import { getMe } from "../../test/apiMock";

// Phase 15D.2 (D-75): the owner dashboard is driven by the server-issued
// `business.manage_own` capability, which only BUSINESS_OWNER holds. Platform
// staff (MODERATOR / ADMIN / SUPER_ADMIN) and SUPPORT see the "not a business
// owner" screen — capability → UI, never role → UI. The server refuses every
// owner route for them anyway; this is UX, not the security boundary.
const NOT_OWNER = "Siz biznes egasi emassiz";

function signIn(user: ReturnType<typeof testUser>) {
  localStorage.setItem("myandijan_token", "fake-token");
  localStorage.setItem("myandijan_refresh_token", "fake-refresh-token");
  localStorage.setItem("myandijan_user", JSON.stringify(user));
  getMe.mockResolvedValue(user);
}

function renderDashboard() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/uz/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/:lang/dashboard"
              element={
                <LanguageProvider>
                  <OwnerDashboard />
                </LanguageProvider>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("OwnerDashboard capability gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it.each(["CUSTOMER", "SUPPORT", "MODERATOR", "ADMIN", "SUPER_ADMIN"])(
    "shows %s the not-an-owner screen (no business.manage_own)",
    async (role) => {
      signIn(testUser(role));
      renderDashboard();
      expect(await screen.findByText(NOT_OWNER)).toBeInTheDocument();
    },
  );

  it("opens the dashboard for a BUSINESS_OWNER", async () => {
    signIn(testUser("BUSINESS_OWNER"));
    renderDashboard();
    expect(await screen.findByText("owner-home")).toBeInTheDocument();
    await waitFor(() => expect(getMe).toHaveBeenCalled());
    expect(screen.queryByText(NOT_OWNER)).not.toBeInTheDocument();
  });

  it("decides from capabilities, not the role name (fails closed without them)", async () => {
    signIn({ ...testUser("BUSINESS_OWNER"), capabilities: [] });
    renderDashboard();
    expect(await screen.findByText(NOT_OWNER)).toBeInTheDocument();
  });
});
