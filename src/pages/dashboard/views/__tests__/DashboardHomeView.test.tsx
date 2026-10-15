import { act, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../contexts/LanguageContext";
import DashboardHomeView from "../DashboardHomeView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import { ApiError, getMyAnalyticsOverview, mockMyBusiness, mockOwnerOverview } from "../../../../test/apiMock";

// Phase 16G.2: the owner overview panel (GET /me/analytics/overview).

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/uz/dashboard"]}>
      <Routes>
        <Route
          path="/:lang/dashboard"
          element={
            <LanguageProvider>
              <DashboardHomeView onSelectView={() => {}} onEditBusiness={() => {}} />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

const panel = () => screen.getByRole("region", { name: "So'nggi 7 kun" });

/** The KpiCard whose label is `label`, scoped to the overview panel. */
function card(label: string) {
  return within(panel()).getByText(label).parentElement as HTMLElement;
}

describe("DashboardHomeView — owner overview panel", () => {
  beforeEach(() => {
    vi.mocked(getMyAnalyticsOverview).mockReset().mockResolvedValue(mockOwnerOverview);
  });

  // The view also loads stats and the business list; let them settle inside
  // the test so their state updates don't land after it (act warnings).
  afterEach(async () => {
    await screen.findByText(mockMyBusiness.name);
    await act(async () => {});
  });

  it("shows the last 7 days for views, calls, directions and favourites, with the change vs the 7 before", async () => {
    renderHome();

    expect(await within(panel()).findByText("128")).toBeInTheDocument();
    expect(within(card("Ko'rishlar")).getByText("+28%")).toBeInTheDocument();
    expect(within(card("Qo'ng'iroqlar")).getByText("6")).toBeInTheDocument();
    expect(within(card("Qo'ng'iroqlar")).getByText("-40%")).toBeInTheDocument();
    expect(within(card("Yo'nalish so'rovlari")).getByText("0%")).toBeInTheDocument();
    expect(within(card("Sevimlilarga qo'shildi")).getByText("+100%")).toBeInTheDocument();
    expect(screen.getByText("Oldingi 7 kunga nisbatan")).toBeInTheDocument();
    expect(getMyAnalyticsOverview).toHaveBeenCalledTimes(1);
  });

  it("colours a rise green, a fall red and no change neutral-blue", async () => {
    renderHome();
    await within(panel()).findByText("+28%");

    expect(within(panel()).getByText("+28%").className).toContain("text-success");
    expect(within(panel()).getByText("-40%").className).toContain("text-danger");
    expect(within(panel()).getByText("0%").className).toContain("text-blue-300");
  });

  it("leaves the rating out of the panel (the card above already shows it)", async () => {
    renderHome();
    await within(panel()).findByText("128");
    expect(within(panel()).queryByText("+0.1")).not.toBeInTheDocument();
  });

  it("shows placeholders while loading, even once the rest of the page has loaded", async () => {
    vi.mocked(getMyAnalyticsOverview).mockReturnValue(new Promise(() => {}));
    renderHome();
    expect(within(panel()).getAllByText("—")).toHaveLength(4);
    await screen.findByText(mockMyBusiness.name);
    expect(within(panel()).getAllByText("—")).toHaveLength(4);
  });

  it("says the statistics could not be loaded, instead of showing zeros, when the request fails", async () => {
    vi.mocked(getMyAnalyticsOverview).mockRejectedValue(new ApiError("boom", 500));
    renderHome();
    expect(await within(panel()).findByText("Statistikani yuklab bo'lmadi.")).toBeInTheDocument();
    expect(within(panel()).queryByText("0")).not.toBeInTheDocument();
  });
});
