import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../contexts/LanguageContext";
import MyBusinessesView from "../MyBusinessesView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import { ApiError, getMyBusinesses, mockMyBusiness, resubmitMyBusiness } from "../../../../test/apiMock";

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

// Phase 16I: the owner sends a fixed, rejected listing back for review.
describe("MyBusinessesView — resubmit a rejected listing (Phase 16I)", () => {
  const RESUBMIT = "Qayta ko'rib chiqishga yuborish";

  afterEach(() => {
    getMyBusinesses.mockReset().mockResolvedValue([mockMyBusiness]);
    resubmitMyBusiness.mockReset().mockResolvedValue({ id: 1, status: "PENDING" });
  });

  it("offers resubmission on a rejected listing only", async () => {
    getMyBusinesses.mockResolvedValue([
      listing(1, "Huzur Kafe", "REJECTED", "Manzil noto'g'ri"),
      listing(2, "Soy taomlar", "APPROVED"),
      listing(3, "Bahor", "SUSPENDED", "Shikoyat"),
      listing(4, "Navro'z", "PENDING"),
      listing(5, "Oqtepa", "HIDDEN"),
    ]);

    renderView();

    await screen.findByText("Huzur Kafe");
    expect(within(card("Huzur Kafe")).getByRole("button", { name: RESUBMIT })).toBeInTheDocument();
    expect(within(card("Huzur Kafe")).getByText(/Kamchiliklarni tuzating/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: RESUBMIT })).toHaveLength(1);
  });

  it("resubmits, confirms, and reloads the list to show the new status", async () => {
    getMyBusinesses
      .mockResolvedValueOnce([listing(1, "Huzur Kafe", "REJECTED", "Manzil noto'g'ri")])
      .mockResolvedValue([listing(1, "Huzur Kafe", "PENDING", "Manzil noto'g'ri")]);

    renderView();

    fireEvent.click(await screen.findByRole("button", { name: RESUBMIT }));

    expect(resubmitMyBusiness).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Biznes qayta ko'rib chiqishga yuborildi")).toBeInTheDocument();
    expect(await screen.findByText("Kutilmoqda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: RESUBMIT })).not.toBeInTheDocument();
    // The kept reason is for the moderator; the owner no longer sees it once PENDING.
    expect(screen.queryByText(/Manzil noto'g'ri/)).not.toBeInTheDocument();
  });

  it("explains a 409 (no longer rejected) and reloads the real status", async () => {
    getMyBusinesses
      .mockResolvedValueOnce([listing(1, "Huzur Kafe", "REJECTED", "Manzil noto'g'ri")])
      .mockResolvedValue([listing(1, "Huzur Kafe", "PENDING")]);
    resubmitMyBusiness.mockRejectedValue(new ApiError("Only a rejected listing can be resubmitted", 409));

    renderView();

    fireEvent.click(await screen.findByRole("button", { name: RESUBMIT }));

    expect(
      await screen.findByText("Bu biznes endi rad etilgan holatda emas. Ro'yxat yangilandi."),
    ).toBeInTheDocument();
    await waitFor(() => expect(getMyBusinesses).toHaveBeenCalledTimes(2));
  });

  it("shows a retryable error for any other failure", async () => {
    getMyBusinesses.mockResolvedValue([listing(1, "Huzur Kafe", "REJECTED", "Manzil noto'g'ri")]);
    resubmitMyBusiness.mockRejectedValue(new ApiError("Internal server error", 500));

    renderView();

    fireEvent.click(await screen.findByRole("button", { name: RESUBMIT }));

    expect(await screen.findByText("Biznesni qayta yuborib bo'lmadi. Qayta urinib ko'ring.")).toBeInTheDocument();
  });
});
