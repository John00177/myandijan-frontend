import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../../contexts/LanguageContext";
import MyBusinessesView from "../MyBusinessesView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import {
  getBusinessById,
  getMyBusinessById,
  getMyBusinessEditDetail,
  getMyBusinesses,
  mockMyBusiness,
  updateBusiness,
  updateBusinessHours,
} from "../../../../test/apiMock";

// The owner "My businesses" edit modal must never overwrite stored hours:
// PUT /businesses/:id/hours replaces every row on the primary branch, and
// PATCH /businesses/:id never touches hours. So a details-only save sends no
// hours at all, and an hours edit sends the stored days verbatim (is24Hours
// kept) plus the edited days — never a 09:00–18:00 placeholder day.

// dayOfWeek 0 = Monday … 6 = Sunday. Wednesday, Thursday and Saturday have no row.
const STORED = [
  { dayOfWeek: 0, openTime: "09:00", closeTime: "18:00", isClosed: false, is24Hours: false },
  { dayOfWeek: 1, openTime: "10:00", closeTime: "19:00", isClosed: false, is24Hours: false },
  { dayOfWeek: 4, openTime: null, closeTime: null, isClosed: false, is24Hours: true },
  { dayOfWeek: 6, openTime: null, closeTime: null, isClosed: true, is24Hours: false },
];

function listing(status = "APPROVED") {
  return { ...mockMyBusiness, status, branches: [{ id: 11, name: "Asosiy", address: "Bobur shoh 1", phone: "+998900000001", isPrimary: true }] };
}

function editDetail(status = "APPROVED") {
  return {
    id: mockMyBusiness.id,
    slug: mockMyBusiness.slug,
    name: mockMyBusiness.name,
    status,
    branches: [{ id: 11, address: "Bobur shoh 1", phone: "+998900000001", isPrimary: true, district: null, hours: STORED }],
  };
}

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

async function openModal() {
  renderView();
  fireEvent.click(await screen.findByRole("button", { name: /Tahrirlash/ }));
  return screen.findByRole("dialog", { name: "Biznesni tahrirlash" });
}

/** The modal with the stored hours loaded (Monday's real time is shown). */
async function openLoadedModal() {
  const modal = await openModal();
  await waitFor(() =>
    expect((within(modal).getByLabelText("Dushanba: ochilish vaqti") as HTMLInputElement).value).toBe("09:00"),
  );
  return modal;
}

function rename(modal: HTMLElement, name: string) {
  fireEvent.change(within(modal).getByPlaceholderText("Biznes nomi"), { target: { value: name } });
}

function save(modal: HTMLElement) {
  fireEvent.click(within(modal).getByRole("button", { name: "Saqlash" }));
}

describe("MyBusinessesView — owner edit never overwrites stored hours", () => {
  beforeEach(() => {
    getMyBusinesses.mockResolvedValue([listing()]);
    getMyBusinessById.mockResolvedValue(listing());
    getMyBusinessEditDetail.mockResolvedValue(editDetail());
  });

  afterEach(() => {
    vi.clearAllMocks();
    getMyBusinesses.mockReset().mockResolvedValue([mockMyBusiness]);
    getMyBusinessById.mockReset().mockResolvedValue({ ...mockMyBusiness, branches: [] });
    getMyBusinessEditDetail.mockReset().mockResolvedValue({ ...mockMyBusiness, branches: [] });
    updateBusinessHours.mockReset().mockResolvedValue([]);
  });

  it("prefills from the owner endpoint, not the public APPROVED-only one", async () => {
    await openLoadedModal();

    expect(getMyBusinessEditDetail).toHaveBeenCalledWith(mockMyBusiness.id);
    expect(getBusinessById).not.toHaveBeenCalled();
    // No second detail fetch: replacing the modal's `initial` after it loaded
    // used to reset the form and discard the loaded hours (the race behind
    // the placeholder overwrite).
    expect(getMyBusinessById).not.toHaveBeenCalled();
  });

  it("saves a name-only edit without calling the hours endpoint", async () => {
    const modal = await openLoadedModal();

    rename(modal, "Soy — yangi nom");
    save(modal);

    await waitFor(() => expect(updateBusiness).toHaveBeenCalledTimes(1));
    expect(updateBusiness).toHaveBeenCalledWith(mockMyBusiness.id, expect.objectContaining({ name: "Soy — yangi nom" }));
    expect(await screen.findByText("Biznes yangilandi")).toBeInTheDocument();
    expect(updateBusinessHours).not.toHaveBeenCalled();
  });

  it("shows the real hours: all-day labelled, a day with no row blank (no 09:00–18:00 placeholder)", async () => {
    const modal = await openLoadedModal();

    expect(within(modal).getByText("24 soat ochiq")).toBeInTheDocument();
    expect((within(modal).getByLabelText("Chorshanba: ochilish vaqti") as HTMLInputElement).value).toBe("");
    expect((within(modal).getByLabelText("Chorshanba: yopilish vaqti") as HTMLInputElement).value).toBe("");
  });

  it("saves an intentional hours edit: stored days verbatim (is24Hours kept), no row created for empty days", async () => {
    const modal = await openLoadedModal();

    fireEvent.change(within(modal).getByLabelText("Dushanba: yopilish vaqti"), { target: { value: "20:00" } });
    save(modal);

    await waitFor(() => expect(updateBusinessHours).toHaveBeenCalledTimes(1));
    expect(updateBusinessHours).toHaveBeenCalledWith(mockMyBusiness.id, [
      { dayOfWeek: 0, openTime: "09:00", closeTime: "20:00", isClosed: false, is24Hours: false },
      { dayOfWeek: 1, openTime: "10:00", closeTime: "19:00", isClosed: false, is24Hours: false },
      { dayOfWeek: 4, openTime: undefined, closeTime: undefined, isClosed: false, is24Hours: true },
      { dayOfWeek: 6, openTime: undefined, closeTime: undefined, isClosed: true, is24Hours: false },
    ]);
  });

  it("refuses a half-filled empty day instead of filling it from a placeholder, then saves the complete day", async () => {
    const modal = await openLoadedModal();

    fireEvent.change(within(modal).getByLabelText("Chorshanba: ochilish vaqti"), { target: { value: "09:30" } });
    save(modal);

    expect(await within(modal).findByRole("alert")).toHaveTextContent("Chorshanba");
    expect(updateBusiness).not.toHaveBeenCalled();
    expect(updateBusinessHours).not.toHaveBeenCalled();

    fireEvent.change(within(modal).getByLabelText("Chorshanba: yopilish vaqti"), { target: { value: "17:00" } });
    save(modal);

    await waitFor(() => expect(updateBusinessHours).toHaveBeenCalledTimes(1));
    const [, payload] = updateBusinessHours.mock.calls[0];
    expect(payload).toContainEqual({ dayOfWeek: 2, openTime: "09:30", closeTime: "17:00", isClosed: false, is24Hours: false });
    expect(payload.map((row: { dayOfWeek: number }) => row.dayOfWeek)).toEqual([0, 1, 2, 4, 6]);
  });

  it.each(["DRAFT", "PENDING", "REJECTED"])(
    "loads a %s listing's real hours and sends none on a details-only save",
    async (status) => {
      getMyBusinesses.mockResolvedValue([listing(status)]);
      getMyBusinessById.mockResolvedValue(listing(status));
      getMyBusinessEditDetail.mockResolvedValue(editDetail(status));
      const modal = await openLoadedModal();

      expect((within(modal).getByLabelText("Shanba: ochilish vaqti") as HTMLInputElement).value).toBe("");
      rename(modal, "Yangi nom");
      save(modal);

      await waitFor(() => expect(updateBusiness).toHaveBeenCalledTimes(1));
      expect(updateBusinessHours).not.toHaveBeenCalled();
    },
  );

  it("keeps the hours locked and unsent when they cannot be loaded, but still saves the details", async () => {
    getMyBusinessEditDetail.mockRejectedValue(new Error("GET /me/businesses/1: primary branch has no hours list"));
    const modal = await openModal();

    expect(await within(modal).findByText("Ish vaqtini yuklab bo'lmadi. Saqlaganda ish vaqti o'zgarmaydi.")).toBeInTheDocument();
    expect(within(modal).queryByLabelText("Dushanba: ochilish vaqti")).not.toBeInTheDocument();

    rename(modal, "Yangi nom");
    save(modal);

    await waitFor(() => expect(updateBusiness).toHaveBeenCalledTimes(1));
    expect(updateBusinessHours).not.toHaveBeenCalled();
  });
});
