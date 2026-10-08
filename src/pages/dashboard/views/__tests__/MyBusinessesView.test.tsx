import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../contexts/LanguageContext";
import MyBusinessesView from "../MyBusinessesView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import { getMyBusinesses, mockMyBusiness } from "../../../../test/apiMock";

// Phase 16D: the owner's status panel — every status labelled, and the reason
// for a rejected or suspended listing shown.

function renderView() {
  return render(
    <MemoryRouter initialEntries={["/uz/dashboard"]}>
      <Routes>
        <Route
          path="/:lang/dashboard"
          element={
            <LanguageProvider>
              <MyBusinessesView />
            </LanguageProvider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

function listing(id: number, name: string, status: string, rejectionReason: string | null = null) {
  return { ...mockMyBusiness, id, slug: `biz-${id}`, name, status, rejectionReason, branches: [] };
}

/** The card for `name` — the element holding both the name and the badge. */
function card(name: string) {
  return screen.getByText(name).closest("div.p-4") as HTMLElement;
}

describe("MyBusinessesView — owner status panel (Phase 16D)", () => {
  afterEach(() => {
    getMyBusinesses.mockReset().mockResolvedValue([mockMyBusiness]);
  });

  it("labels a hidden listing instead of rendering an empty badge", async () => {
    getMyBusinesses.mockResolvedValue([listing(1, "Huzur Kafe", "HIDDEN")]);

    renderView();

    expect(await screen.findByText("Yashirilgan")).toBeInTheDocument();
  });

  it("shows the reason for a rejected and for a suspended listing", async () => {
    getMyBusinesses.mockResolvedValue([
      listing(1, "Huzur Kafe", "REJECTED", "  Manzil noto'g'ri  "),
      listing(2, "Soy taomlar", "SUSPENDED", "Shikoyatlar tekshirilmoqda"),
    ]);

    renderView();

    await screen.findByText("Huzur Kafe");
    expect(within(card("Huzur Kafe")).getByText("Rad etilgan")).toBeInTheDocument();
    expect(within(card("Huzur Kafe")).getByText(/Manzil noto'g'ri/)).toBeInTheDocument();
    expect(within(card("Soy taomlar")).getByText("To'xtatilgan")).toBeInTheDocument();
    expect(within(card("Soy taomlar")).getByText(/Shikoyatlar tekshirilmoqda/)).toBeInTheDocument();
  });

  it("shows no reason for other statuses, even when the column still holds an old one", async () => {
    getMyBusinesses.mockResolvedValue([
      listing(1, "Huzur Kafe", "HIDDEN", "eski sabab"),
      listing(2, "Soy taomlar", "APPROVED", null),
    ]);

    renderView();

    await screen.findByText("Huzur Kafe");
    expect(screen.queryByText(/Sabab:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/eski sabab/)).not.toBeInTheDocument();
  });
});
