import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../../../contexts/AuthContext";
import { LanguageProvider } from "../../../../contexts/LanguageContext";
import AdminBusinessesView from "../AdminBusinessesView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import {
  ApiError,
  approveAdminBusiness,
  getAdminBusinesses,
  getMe,
  hideAdminBusiness,
  mockAdminBusiness,
  promoteAdminBusiness,
  suspendAdminBusiness,
  unhideAdminBusiness,
  unpromoteAdminBusiness,
  unsuspendAdminBusiness,
  unverifyAdminBusiness,
  updateAdminBusiness,
  updateAdminBusinessHours,
  updateBusiness,
  updateBusinessHours,
  verifyAdminBusiness,
} from "../../../../test/apiMock";

/** Renders the view as a signed-in user of the given role (default ADMIN). */
function renderView(role = "ADMIN") {
  const user = { id: 1, fullName: "Test", phone: "+998901234567", role };
  localStorage.setItem("myandijan_token", "fake-token");
  localStorage.setItem("myandijan_refresh_token", "fake-refresh-token");
  localStorage.setItem("myandijan_user", JSON.stringify(user));
  getMe.mockResolvedValue(user);
  return render(
    <MemoryRouter initialEntries={["/uz/admin"]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/:lang/admin"
            element={
              <LanguageProvider>
                <AdminBusinessesView />
              </LanguageProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function listOf(...rows: (typeof mockAdminBusiness)[]) {
  getAdminBusinesses.mockResolvedValue({ items: rows, total: rows.length });
}

/** DataTable renders a desktop table AND mobile cards, so names appear more than once. */
async function waitForRow(name = mockAdminBusiness.name as string) {
  await waitFor(() => expect(screen.getAllByText(name).length).toBeGreaterThan(0));
}

describe("AdminBusinessesView — business operations", () => {
  beforeEach(() => {
    // clearAllMocks keeps apiMock's default implementations (restoreAllMocks
    // would strip them); prompt/confirm get fresh stubs per test instead.
    vi.clearAllMocks();
    localStorage.clear();
    window.prompt = vi.fn(() => null);
    window.confirm = vi.fn(() => false);
    listOf(mockAdminBusiness);
  });

  // ---- role boundaries (Phase 14, D-72/D-73) -----------------------------------

  const ADMIN_ONLY_ACTIONS = ["Verifikatsiya qilish", "To'xtatish", "Reklamaga qo'yish", "Tahrirlash"];

  it("gives a MODERATOR approve/reject on a PENDING listing and nothing ADMIN-only", async () => {
    listOf({ ...mockAdminBusiness, status: "PENDING" });
    renderView("MODERATOR");
    await waitForRow();

    expect(screen.getByRole("button", { name: /Tasdiqlash/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rad etish/ })).toBeInTheDocument();
    for (const label of [...ADMIN_ONLY_ACTIONS, "Yashirish"]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
  });

  it("gives a MODERATOR no operations at all on a live listing (only the public link)", async () => {
    renderView("MODERATOR");
    await waitForRow();

    for (const label of [...ADMIN_ONLY_ACTIONS, "Yashirish"]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Ko'rish" })).toBeInTheDocument();
  });

  it("does not offer hide to an ADMIN (SUPER_ADMIN only)", async () => {
    renderView("ADMIN");
    await waitForRow();

    expect(screen.getByRole("button", { name: "To'xtatish" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Yashirish" })).not.toBeInTheDocument();
  });

  it("lets a SUPER_ADMIN hide a listing after confirmation", async () => {
    window.confirm = vi.fn(() => true);
    renderView("SUPER_ADMIN");
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "Yashirish" }));

    await waitFor(() => expect(hideAdminBusiness).toHaveBeenCalledWith(mockAdminBusiness.id));
    expect(await screen.findByText("Biznes yashirildi")).toBeInTheDocument();
  });

  it("shows a SUPER_ADMIN the recorded restore target and restores it", async () => {
    listOf({ ...mockAdminBusiness, status: "HIDDEN", statusBeforeHide: "SUSPENDED" });
    window.confirm = vi.fn(() => true);
    renderView("SUPER_ADMIN");
    await waitForRow();

    expect(screen.getAllByText("Tiklanganda: To'xtatilgan").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Yashirishni bekor qilish" }));

    await waitFor(() => expect(unhideAdminBusiness).toHaveBeenCalledWith(mockAdminBusiness.id));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("To'xtatilgan"));
    expect(await screen.findByText("Biznes tiklandi")).toBeInTheDocument();
  });

  it("tells a SUPER_ADMIN an unrecorded hidden listing restores to PENDING re-review", async () => {
    listOf({ ...mockAdminBusiness, status: "HIDDEN", statusBeforeHide: null });
    renderView("SUPER_ADMIN");
    await waitForRow();

    expect(screen.getAllByText("Tiklanganda: Kutilmoqda (qayta ko'rib chiqish)").length).toBeGreaterThan(0);
  });

  it("does not unhide when the SUPER_ADMIN cancels the confirmation", async () => {
    listOf({ ...mockAdminBusiness, status: "HIDDEN", statusBeforeHide: "APPROVED" });
    renderView("SUPER_ADMIN");
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "Yashirishni bekor qilish" }));

    expect(unhideAdminBusiness).not.toHaveBeenCalled();
  });

  it("surfaces a 409 when another SUPER_ADMIN restored it first", async () => {
    listOf({ ...mockAdminBusiness, status: "HIDDEN", statusBeforeHide: "APPROVED" });
    window.confirm = vi.fn(() => true);
    unhideAdminBusiness.mockRejectedValueOnce(new ApiError("Business 5 is not hidden (current status: APPROVED)", 409));
    renderView("SUPER_ADMIN");
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "Yashirishni bekor qilish" }));

    expect(await screen.findByText("Business 5 is not hidden (current status: APPROVED)")).toBeInTheDocument();
  });

  // ---- loading / list / filter / empty / error ---------------------------------

  it("loads the real business list from the admin endpoint", async () => {
    renderView();
    await waitForRow();

    expect(getAdminBusinesses).toHaveBeenCalledWith({ page: 1, limit: 20, status: undefined });
  });

  it("filters by status server-side, including SUSPENDED, and resets to page 1", async () => {
    renderView();
    await waitForRow();

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "SUSPENDED" } });

    await waitFor(() =>
      expect(getAdminBusinesses).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: "SUSPENDED" }),
    );
  });

  it("shows the empty state when no business matches", async () => {
    listOf();
    renderView();

    expect(await screen.findByText("Bizneslar topilmadi")).toBeInTheDocument();
  });

  it("shows the forbidden state for a non-admin token (403)", async () => {
    getAdminBusinesses.mockRejectedValue(new ApiError("Forbidden", 403));
    renderView();

    expect(await screen.findByText("Admin huquqi talab qilinadi")).toBeInTheDocument();
  });

  it("shows the error state when the request fails", async () => {
    getAdminBusinesses.mockRejectedValue(new ApiError("Server error", 500));
    renderView();

    expect(await screen.findByText("Ma'lumotni yuklab bo'lmadi")).toBeInTheDocument();
  });

  it("offers no delete action (no admin delete endpoint exists) and links Ko'rish to the public page", async () => {
    renderView();
    await waitForRow();

    expect(screen.queryByRole("button", { name: "O'chirish" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ko'rish" })).toHaveAttribute(
      "href",
      `/uz/business/${mockAdminBusiness.slug}`,
    );
  });

  it("shows approve/reject — and no live-listing operations — for a PENDING business", async () => {
    listOf({ ...mockAdminBusiness, status: "PENDING" });
    renderView();
    await waitForRow();

    expect(screen.getByRole("button", { name: /Tasdiqlash/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "To'xtatish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verifikatsiya qilish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reklamaga qo'yish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ko'rish" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Tasdiqlash/ }));
    await waitFor(() => expect(approveAdminBusiness).toHaveBeenCalledWith(mockAdminBusiness.id));
  });

  // ---- verification --------------------------------------------------------------

  it("verifies an approved business, reports success and reloads", async () => {
    renderView();
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "Verifikatsiya qilish" }));

    await waitFor(() => expect(verifyAdminBusiness).toHaveBeenCalledWith(mockAdminBusiness.id));
    expect(await screen.findByText("Biznes verifikatsiya qilindi")).toBeInTheDocument();
    expect(getAdminBusinesses).toHaveBeenCalledTimes(2);
  });

  it("revokes verification only after confirmation", async () => {
    listOf({ ...mockAdminBusiness, isVerified: true });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderView();
    await waitForRow();

    expect(screen.getAllByText("Verifikatsiyalangan").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Verifikatsiyani bekor qilish" }));
    expect(unverifyAdminBusiness).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Verifikatsiyani bekor qilish" }));
    await waitFor(() => expect(unverifyAdminBusiness).toHaveBeenCalledWith(mockAdminBusiness.id));
  });

  // ---- suspension ------------------------------------------------------------------

  it("suspends with the entered reason", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("  Soxta ma'lumot  ");
    renderView();
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "To'xtatish" }));

    await waitFor(() => expect(suspendAdminBusiness).toHaveBeenCalledWith(mockAdminBusiness.id, "Soxta ma'lumot"));
    expect(await screen.findByText("Biznes to'xtatildi")).toBeInTheDocument();
  });

  it("does not suspend when the reason prompt is cancelled", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);
    renderView();
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "To'xtatish" }));

    expect(suspendAdminBusiness).not.toHaveBeenCalled();
  });

  it("shows a suspended business with its reason and only the restore action", async () => {
    listOf({ ...mockAdminBusiness, status: "SUSPENDED", rejectionReason: "Soxta ma'lumot" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderView();
    await waitForRow();

    expect(screen.getAllByText("To'xtatilgan").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sabab: Soxta ma'lumot").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "To'xtatish" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verifikatsiya qilish" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Qayta faollashtirish" }));

    await waitFor(() => expect(unsuspendAdminBusiness).toHaveBeenCalledWith(mockAdminBusiness.id));
    expect(await screen.findByText("Biznes qayta faollashtirildi")).toBeInTheDocument();
  });

  it("surfaces a backend conflict (409) as an error toast", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Spam");
    suspendAdminBusiness.mockRejectedValueOnce(
      new ApiError("Only an approved business can be suspended (current status: PENDING)", 409),
    );
    renderView();
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "To'xtatish" }));

    expect(
      await screen.findByText("Only an approved business can be suspended (current status: PENDING)"),
    ).toBeInTheDocument();
  });

  // ---- promotion -------------------------------------------------------------------

  it("promotes until the end of the chosen day", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("2099-12-31");
    renderView();
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "Reklamaga qo'yish" }));

    await waitFor(() =>
      expect(promoteAdminBusiness).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        new Date("2099-12-31T23:59:59").toISOString(),
      ),
    );
    expect(await screen.findByText("Reklama yoqildi")).toBeInTheDocument();
  });

  it("rejects an unparseable promotion date without calling the API", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("ertaga");
    renderView();
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "Reklamaga qo'yish" }));

    expect(await screen.findByText("Sana noto'g'ri. Format: YYYY-MM-DD")).toBeInTheDocument();
    expect(promoteAdminBusiness).not.toHaveBeenCalled();
  });

  it("ends an active promotion after confirmation", async () => {
    listOf({ ...mockAdminBusiness, isPromoted: true, promotedUntil: "2099-12-31T18:59:59.000Z" });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderView();
    await waitForRow();

    fireEvent.click(screen.getByRole("button", { name: "Reklamani to'xtatish" }));

    await waitFor(() => expect(unpromoteAdminBusiness).toHaveBeenCalledWith(mockAdminBusiness.id));
    expect(await screen.findByText("Reklama to'xtatildi")).toBeInTheDocument();
  });

  // ---- staff edit path (Phase 15B, D-74) ---------------------------------------
  // Staff edit someone else's business only through the audited /admin routes,
  // with a reason — never through the owner-only PATCH /businesses/:id.

  async function openEditAndSave() {
    renderView("ADMIN");
    await waitForRow();
    fireEvent.click(screen.getAllByRole("button", { name: /Tahrirlash/ })[0]);
    // Save stays disabled while the modal pre-fills from getBusinessById.
    const save = await screen.findByRole("button", { name: "Saqlash" });
    await waitFor(() => expect(save).toBeEnabled());
    fireEvent.click(save);
  }

  it("saves an admin edit through the /admin endpoints with the entered reason", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("  Egasi telefon orqali so'radi  ");

    await openEditAndSave();

    await waitFor(() =>
      expect(updateAdminBusiness).toHaveBeenCalledWith(
        mockAdminBusiness.id,
        expect.objectContaining({ reason: "Egasi telefon orqali so'radi" }),
      ),
    );
    expect(updateAdminBusinessHours).toHaveBeenCalledWith(mockAdminBusiness.id, {
      reason: "Egasi telefon orqali so'radi",
      hours: expect.any(Array),
    });
    expect(updateBusiness).not.toHaveBeenCalled();
    expect(updateBusinessHours).not.toHaveBeenCalled();
  });

  it("does not save anything when the reason prompt is cancelled", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);

    await openEditAndSave();

    expect(window.prompt).toHaveBeenCalledWith("Tahrirlash sababi:");
    expect(updateAdminBusiness).not.toHaveBeenCalled();
    expect(updateAdminBusinessHours).not.toHaveBeenCalled();
    expect(updateBusiness).not.toHaveBeenCalled();
  });
});
