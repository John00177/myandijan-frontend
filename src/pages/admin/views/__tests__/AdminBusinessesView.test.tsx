import { testUser } from "../../../../test/roleCapabilities";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../../../contexts/AuthContext";
import { LanguageProvider } from "../../../../contexts/LanguageContext";
import AdminBusinessesView from "../AdminBusinessesView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import {
  ApiError,
  approveAdminBusiness,
  getAdminBusinessById,
  getAdminBusinessEditDetail,
  getAdminBusinesses,
  getBusinessById,
  getMe,
  hideAdminBusiness,
  mockAdminBusiness,
  promoteAdminBusiness,
  rejectAdminBusiness,
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
  const user = testUser(role);
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
    // Hours were not edited, so the hours PUT (which replaces every stored
    // row) is not sent at all — see the "hours preservation" block below.
    expect(updateAdminBusinessHours).not.toHaveBeenCalled();
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

// Phase 16E: the review drawer shows what the owner submitted — straight from
// the GET /admin/businesses row — and every reject path goes through its
// reason form instead of window.prompt.
describe("AdminBusinessesView — review drawer", () => {
  const submitted = {
    ...mockAdminBusiness,
    status: "PENDING",
    description: "Milliy taomlar va choyxona",
    website: "https://soy.example",
    telegram: "@soy_taomlar",
    hasDelivery: true,
    deliveryFee: 10000,
    deliveryTime: "30-40 daqiqa",
    branchCount: 2,
    businessType: { id: 2, nameUz: "Restoran", slug: "restaurant" },
    owner: { id: 7, fullName: "Sardor Aliyev", phone: "+998901112233", email: "sardor@example.com" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.prompt = vi.fn(() => null);
    window.confirm = vi.fn(() => false);
    listOf(submitted);
  });

  async function openDrawer(role = "ADMIN") {
    renderView(role);
    await waitForRow();
    fireEvent.click(screen.getAllByRole("button", { name: "Ko'rib chiqish" })[0]);
    return screen.findByRole("dialog", { name: `Ko'rib chiqish: ${submitted.name}` });
  }

  async function openRejectForm() {
    renderView();
    await waitForRow();
    fireEvent.click(screen.getByRole("button", { name: /Rad etish/ }));
    return screen.findByRole("dialog", { name: `Ko'rib chiqish: ${submitted.name}` });
  }

  it("shows the submitted listing from the queue row, without another request", async () => {
    const drawer = await openDrawer();

    for (const text of [
      "Milliy taomlar va choyxona",
      "Ovqatlanish",
      "Restoran",
      "Andijon shahri, Andijon (+1 filial)",
      "Sardor Aliyev",
      "+998901112233",
      "sardor@example.com",
      "Bor · 10000 so'm · 30-40 daqiqa",
    ]) {
      expect(within(drawer).getByText(text)).toBeInTheDocument();
    }
    expect(getAdminBusinesses).toHaveBeenCalledTimes(1);
  });

  it("renders owner-supplied URLs as plain text, never as links", async () => {
    const drawer = await openDrawer();

    expect(within(drawer).getByText("https://soy.example")).toBeInTheDocument();
    expect(within(drawer).getByText("@soy_taomlar")).toBeInTheDocument();
    expect(within(drawer).queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows a MODERATOR the owner's name only, as the API returns it", async () => {
    listOf({ ...submitted, owner: { id: 7, fullName: "Sardor Aliyev" } });
    const drawer = await openDrawer("MODERATOR");

    expect(within(drawer).getByText("Sardor Aliyev")).toBeInTheDocument();
    expect(within(drawer).queryByText("+998901112233")).not.toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: /Tasdiqlash/ })).toBeInTheDocument();
  });

  it("approves from the drawer, closes it and reloads the queue", async () => {
    const drawer = await openDrawer();

    fireEvent.click(within(drawer).getByRole("button", { name: /Tasdiqlash/ }));

    await waitFor(() => expect(approveAdminBusiness).toHaveBeenCalledWith(submitted.id));
    expect(await screen.findByText("Biznes tasdiqlandi")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(getAdminBusinesses).toHaveBeenCalledTimes(2);
  });

  it("keeps the drawer open and shows the API's refusal inside it", async () => {
    approveAdminBusiness.mockRejectedValueOnce(new ApiError("Business 5 is not pending review", 409));
    const drawer = await openDrawer();

    fireEvent.click(within(drawer).getByRole("button", { name: /Tasdiqlash/ }));

    expect(await within(drawer).findByText("Business 5 is not pending review")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens the reason form from the row's 'Rad etish' and never uses window.prompt", async () => {
    const drawer = await openRejectForm();

    expect(within(drawer).getByLabelText("Rad etish sababi")).toBeInTheDocument();
    expect(window.prompt).not.toHaveBeenCalled();
  });

  it("rejects with the trimmed reason, closes the drawer and reports success", async () => {
    const drawer = await openRejectForm();

    fireEvent.change(within(drawer).getByLabelText("Rad etish sababi"), {
      target: { value: "  Manzil noto'g'ri ko'rsatilgan  " },
    });
    fireEvent.click(within(drawer).getByRole("button", { name: "Rad etishni tasdiqlash" }));

    await waitFor(() =>
      expect(rejectAdminBusiness).toHaveBeenCalledWith(submitted.id, "Manzil noto'g'ri ko'rsatilgan"),
    );
    expect(await screen.findByText("Biznes rad etildi")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it.each([
    ["blank", "   ", "Rad etish sababi majburiy"],
    ["over 1000 characters", "x".repeat(1001), "Rad etish sababi 1000 belgidan oshmasligi kerak"],
  ])("refuses a %s reason without calling the API", async (_name, value, message) => {
    const drawer = await openRejectForm();

    fireEvent.change(within(drawer).getByLabelText("Rad etish sababi"), { target: { value } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Rad etishni tasdiqlash" }));

    expect(await within(drawer).findByText(message)).toBeInTheDocument();
    expect(rejectAdminBusiness).not.toHaveBeenCalled();
  });

  it("keeps the typed reason when the API refuses the rejection", async () => {
    rejectAdminBusiness.mockRejectedValueOnce(new ApiError("Forbidden: you cannot review your own business", 403));
    const drawer = await openRejectForm();
    const field = within(drawer).getByLabelText("Rad etish sababi");

    fireEvent.change(field, { target: { value: "Soxta ma'lumot" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Rad etishni tasdiqlash" }));

    expect(await within(drawer).findByText("Forbidden: you cannot review your own business")).toBeInTheDocument();
    expect(field).toHaveValue("Soxta ma'lumot");
  });

  it("goes back from the reason form, and closes without deciding anything", async () => {
    const drawer = await openRejectForm();

    fireEvent.click(within(drawer).getByRole("button", { name: "Orqaga" }));
    expect(within(drawer).queryByLabelText("Rad etish sababi")).not.toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: /Tasdiqlash/ })).toBeInTheDocument();

    fireEvent.click(within(drawer).getByRole("button", { name: "Yopish" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(approveAdminBusiness).not.toHaveBeenCalled();
    expect(rejectAdminBusiness).not.toHaveBeenCalled();
  });

  it("offers no review action on a listing that is not PENDING", async () => {
    listOf({ ...submitted, status: "APPROVED" });
    renderView();
    await waitForRow();

    expect(screen.queryByRole("button", { name: "Ko'rib chiqish" })).not.toBeInTheDocument();
  });

  it("hands the edit modal's 'Rad etish' to the drawer's reason form", async () => {
    renderView("ADMIN");
    await waitForRow();
    fireEvent.click(screen.getAllByRole("button", { name: /Tahrirlash/ })[0]);
    const modal = await screen.findByRole("dialog", { name: "Biznesni tahrirlash" });

    fireEvent.click(within(modal).getByRole("button", { name: /Rad etish/ }));

    const drawer = await screen.findByRole("dialog", { name: `Ko'rib chiqish: ${submitted.name}` });
    expect(within(drawer).getByLabelText("Rad etish sababi")).toBeInTheDocument();
    expect(window.prompt).not.toHaveBeenCalled();
    expect(rejectAdminBusiness).not.toHaveBeenCalled();
  });

  // Phase 16I.1: a PENDING listing that still carries a reason is back after
  // an earlier decision (owner resubmit, or the unhide fallback).
  it("marks a listing back for re-review in the queue, with the earlier reason", async () => {
    listOf({ ...submitted, rejectionReason: "  Telefon raqami noto'g'ri  " });
    renderView();
    await waitForRow();

    expect(screen.getAllByText("Qayta ko'rib chiqish").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Oldingi sabab: Telefon raqami noto'g'ri").length).toBeGreaterThan(0);
  });

  it("shows the earlier reason inside the review drawer, above the decision", async () => {
    listOf({ ...submitted, rejectionReason: "Telefon raqami noto'g'ri" });
    const drawer = await openDrawer();

    expect(within(drawer).getByText("Qayta ko'rib chiqish")).toBeInTheDocument();
    expect(within(drawer).getByText("Oldingi sabab: Telefon raqami noto'g'ri")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: /Tasdiqlash/ })).toBeInTheDocument();
  });

  it("does not mark a first-time PENDING submission, or a blank leftover reason", async () => {
    listOf(submitted, { ...submitted, id: 99, name: "Ikkinchi biznes", nameUz: "Ikkinchi biznes", rejectionReason: "   " });
    renderView();
    await waitForRow();
    await waitForRow("Ikkinchi biznes");

    expect(screen.queryByText("Qayta ko'rib chiqish")).not.toBeInTheDocument();
    expect(screen.queryByText(/Oldingi sabab/)).not.toBeInTheDocument();

    const drawer = await (async () => {
      fireEvent.click(screen.getAllByRole("button", { name: "Ko'rib chiqish" })[0]);
      return screen.findByRole("dialog", { name: `Ko'rib chiqish: ${submitted.name}` });
    })();
    expect(within(drawer).queryByText(/Oldingi sabab/)).not.toBeInTheDocument();
  });

  it("keeps a REJECTED listing's reason out of the re-review marker", async () => {
    listOf({ ...submitted, status: "REJECTED", rejectionReason: "Hujjat yetarli emas" });
    renderView();
    await waitForRow();

    expect(screen.queryByText("Qayta ko'rib chiqish")).not.toBeInTheDocument();
    expect(screen.queryByText(/Oldingi sabab/)).not.toBeInTheDocument();
  });
});

// Phase 16E data-integrity fix: PUT /admin/businesses/:id/hours replaces
// every stored row, and GET /businesses/:id 404s for any non-APPROVED
// listing. An admin edit used to submit the modal's placeholder 09:00–18:00
// grid in that case, overwriting the business's real hours, and reset every
// 24-hour day.
describe("AdminBusinessesView — hours preservation in the admin edit", () => {
  const REASON = "Egasi so'radi";

  /** Stored hours: Mon 10:00–20:00, Tue 24 hours, Sun closed, Wed–Sat no row. */
  const storedHours = [
    { dayOfWeek: 0, openTime: "10:00", closeTime: "20:00", isClosed: false, is24Hours: false },
    { dayOfWeek: 1, openTime: null, closeTime: null, isClosed: false, is24Hours: true },
    { dayOfWeek: 6, openTime: null, closeTime: null, isClosed: true, is24Hours: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // spyOn, like the edit tests above: once window.prompt has been spied on,
    // a plain reassignment no longer replaces it.
    vi.spyOn(window, "prompt").mockReturnValue(REASON);
    window.confirm = vi.fn(() => false);
  });

  async function openEdit(business = mockAdminBusiness) {
    listOf(business);
    renderView("ADMIN");
    await waitForRow(business.name as string);
    fireEvent.click(screen.getAllByRole("button", { name: /Tahrirlash/ })[0]);
    const modal = await screen.findByRole("dialog", { name: "Biznesni tahrirlash" });
    const save = within(modal).getByRole("button", { name: "Saqlash" });
    await waitFor(() => expect(save).toBeEnabled());
    return { modal, save };
  }

  function prefillWithStoredHours() {
    getBusinessById.mockResolvedValueOnce({
      id: mockAdminBusiness.id,
      slug: mockAdminBusiness.slug,
      name: mockAdminBusiness.name,
      status: "APPROVED",
      branches: [{ id: 1, address: "Andijon shahri", phone: "+998901234567", hours: storedHours }],
    });
  }

  it("does not submit hours when the prefill 404s for a non-approved business", async () => {
    getBusinessById.mockRejectedValueOnce(new ApiError("Business \"5\" not found", 404));
    const { modal, save } = await openEdit({ ...mockAdminBusiness, status: "PENDING" });

    // The placeholder grid is not shown as if it were the business's hours.
    expect(within(modal).getByText("Ish vaqtini yuklab bo'lmadi. Saqlaganda ish vaqti o'zgarmaydi.")).toBeInTheDocument();
    expect(within(modal).queryByDisplayValue("09:00")).not.toBeInTheDocument();

    fireEvent.click(save);

    await waitFor(() => expect(updateAdminBusiness).toHaveBeenCalled());
    expect(updateAdminBusinessHours).not.toHaveBeenCalled();
  });

  it("leaves stored hours untouched when a loaded business is saved without editing them", async () => {
    prefillWithStoredHours();
    const { modal, save } = await openEdit();

    expect(within(modal).getByDisplayValue("20:00")).toBeInTheDocument();
    expect(within(modal).getByText("24 soat ochiq")).toBeInTheDocument();

    fireEvent.click(save);

    await waitFor(() => expect(updateAdminBusiness).toHaveBeenCalled());
    expect(updateAdminBusinessHours).not.toHaveBeenCalled();
  });

  it("submits an edited day, keeps the 24-hour day 24-hour, and adds no 09:00–18:00 placeholder days", async () => {
    prefillWithStoredHours();
    const { modal, save } = await openEdit();

    fireEvent.change(within(modal).getByDisplayValue("20:00"), { target: { value: "22:00" } });
    fireEvent.click(save);

    await waitFor(() =>
      expect(updateAdminBusinessHours).toHaveBeenCalledWith(mockAdminBusiness.id, {
        reason: REASON,
        hours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "22:00", isClosed: false, is24Hours: false },
          { dayOfWeek: 1, openTime: undefined, closeTime: undefined, isClosed: false, is24Hours: true },
          { dayOfWeek: 6, openTime: undefined, closeTime: undefined, isClosed: true, is24Hours: false },
        ],
      }),
    );
  });
});

// Phase 16E.5: GET /admin/businesses/:id (any status) feeds the review drawer
// and the admin edit prefill. Until the API deploy that adds it, production
// answers 404 — apiMock's default — and both fall back to the 16E.3/#12
// behaviour covered above.
describe("AdminBusinessesView — admin business detail (16E.5)", () => {
  const pending = { ...mockAdminBusiness, status: "PENDING" };

  const storedHours = [
    { dayOfWeek: 0, openTime: "10:00", closeTime: "20:00", isClosed: false, is24Hours: false },
    { dayOfWeek: 1, openTime: null, closeTime: null, isClosed: false, is24Hours: true },
    { dayOfWeek: 6, openTime: null, closeTime: null, isClosed: true, is24Hours: false },
  ];

  /** GET /admin/businesses/:id for the PENDING listing: two branches, hours, a photo, coordinates. */
  const adminDetail = {
    ...pending,
    branches: [
      {
        id: 11,
        name: "Markaziy filial",
        address: "Bobur shoh 1",
        landmark: "Xiyobon yonida",
        phone: "+998900000001",
        phoneAlt: "+998900000009",
        lat: "40.78250000",
        lng: "72.34420000",
        isPrimary: true,
        isActive: true,
        district: { id: 1, slug: "andijon", nameUz: "Andijon" },
        city: { id: 3, slug: "andijon-shahri", nameUz: "Andijon shahri" },
        hours: storedHours,
        photos: [{ url: "https://cdn.example/1.jpg", thumbUrl: "https://cdn.example/1-t.jpg", caption: "Zal", isPrimary: true, sortOrder: 0 }],
      },
      {
        id: 12,
        name: "Asaka filiali",
        address: "Asaka 5",
        landmark: null,
        phone: "+998900000002",
        phoneAlt: null,
        lat: null,
        lng: null,
        isPrimary: false,
        isActive: false,
        district: { id: 2, slug: "asaka", nameUz: "Asaka" },
        city: null,
        hours: [],
        photos: [],
      },
    ],
  };

  /** What getAdminBusinessEditDetail maps that detail to (mapping itself: api.test.ts). */
  const editDetail = {
    id: pending.id,
    slug: "soy-milliy-taomlar",
    name: "Soy milliy taomlar",
    status: "PENDING",
    category: { id: 1, slug: "food", nameUz: "Ovqatlanish" },
    branches: [
      { id: 11, address: "Bobur shoh 1", phone: "+998900000001", isPrimary: true, district: { id: 1, slug: "andijon", nameUz: "Andijon" }, hours: storedHours },
      { id: 12, address: "Asaka 5", phone: "+998900000002", isPrimary: false, district: { id: 2, slug: "asaka", nameUz: "Asaka" }, hours: [] },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(window, "prompt").mockReturnValue("Egasi so'radi");
    window.confirm = vi.fn(() => false);
    listOf(pending);
  });

  async function openDrawer() {
    renderView("ADMIN");
    await waitForRow();
    fireEvent.click(screen.getAllByRole("button", { name: "Ko'rib chiqish" })[0]);
    return screen.findByRole("dialog", { name: `Ko'rib chiqish: ${pending.name}` });
  }

  async function openEdit() {
    renderView("ADMIN");
    await waitForRow();
    fireEvent.click(screen.getAllByRole("button", { name: /Tahrirlash/ })[0]);
    const modal = await screen.findByRole("dialog", { name: "Biznesni tahrirlash" });
    const save = within(modal).getByRole("button", { name: "Saqlash" });
    await waitFor(() => expect(save).toBeEnabled());
    return { modal, save };
  }

  // ---- review drawer ------------------------------------------------------------

  it("fetches the admin detail when the drawer opens and shows every branch with hours, photos and coordinates", async () => {
    getAdminBusinessById.mockResolvedValueOnce(adminDetail);
    const drawer = await openDrawer();

    const primary = await within(drawer).findByRole("region", { name: "Filial: Markaziy filial" });
    expect(getAdminBusinessById).toHaveBeenCalledWith(pending.id);

    for (const text of [
      "Asosiy",
      "Bobur shoh 1, Andijon, Andijon shahri",
      "Mo'ljal: Xiyobon yonida",
      "+998900000009",
      "40.7825, 72.3442",
      "10:00–20:00",
      "24 soat",
      "Dam olish kuni",
    ]) {
      expect(within(primary).getByText(text)).toBeInTheDocument();
    }
    expect(within(primary).getByRole("img", { name: "Zal" })).toHaveAttribute("src", "https://cdn.example/1-t.jpg");

    const secondary = within(drawer).getByRole("region", { name: "Filial: Asaka filiali" });
    expect(within(secondary).getByText("Nofaol")).toBeInTheDocument();
    expect(within(secondary).getAllByText("—").length).toBeGreaterThanOrEqual(7); // no coordinates, no hours rows
  });

  it("keeps the list summary and says the rest is unavailable while the route 404s (not deployed yet)", async () => {
    const drawer = await openDrawer();

    expect(
      await within(drawer).findByText("Ish vaqti, galereya va qo'shimcha filiallarni hozircha yuklab bo'lmadi."),
    ).toBeInTheDocument();
    expect(within(drawer).getByText("Sardor Aliyev")).toBeInTheDocument();
    expect(within(drawer).queryByRole("region")).not.toBeInTheDocument();
  });

  it("never makes the decision wait on the detail request", async () => {
    getAdminBusinessById.mockReturnValueOnce(new Promise(() => {}));
    const drawer = await openDrawer();

    expect(within(drawer).getByText("To'liq ma'lumot yuklanmoqda...")).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole("button", { name: /Tasdiqlash/ }));

    await waitFor(() => expect(approveAdminBusiness).toHaveBeenCalledWith(pending.id));
  });

  // ---- admin edit prefill (hours safety from #12 must hold) ----------------------

  it("prefills the edit of a PENDING listing from the admin detail, unlocking its real hours", async () => {
    getAdminBusinessEditDetail.mockResolvedValueOnce(editDetail);
    const { modal } = await openEdit();

    expect(getAdminBusinessEditDetail).toHaveBeenCalledWith(pending.id);
    expect(getBusinessById).not.toHaveBeenCalled();
    expect(within(modal).getByDisplayValue("20:00")).toBeInTheDocument();
    expect(within(modal).getByText("24 soat ochiq")).toBeInTheDocument();
    expect(within(modal).queryByText("Ish vaqtini yuklab bo'lmadi. Saqlaganda ish vaqti o'zgarmaydi.")).not.toBeInTheDocument();
  });

  it("still sends no hours when the loaded hours of a PENDING listing were not edited", async () => {
    getAdminBusinessEditDetail.mockResolvedValueOnce(editDetail);
    const { save } = await openEdit();

    fireEvent.click(save);

    await waitFor(() => expect(updateAdminBusiness).toHaveBeenCalled());
    expect(updateAdminBusinessHours).not.toHaveBeenCalled();
  });

  it("sends the edited day and keeps the stored 24-hour day for a PENDING listing", async () => {
    getAdminBusinessEditDetail.mockResolvedValueOnce(editDetail);
    const { modal, save } = await openEdit();

    fireEvent.change(within(modal).getByDisplayValue("20:00"), { target: { value: "21:00" } });
    fireEvent.click(save);

    await waitFor(() =>
      expect(updateAdminBusinessHours).toHaveBeenCalledWith(pending.id, {
        reason: "Egasi so'radi",
        hours: [
          { dayOfWeek: 0, openTime: "10:00", closeTime: "21:00", isClosed: false, is24Hours: false },
          { dayOfWeek: 1, openTime: undefined, closeTime: undefined, isClosed: false, is24Hours: true },
          { dayOfWeek: 6, openTime: undefined, closeTime: undefined, isClosed: true, is24Hours: false },
        ],
      }),
    );
  });

  it("keeps the hours locked and unsent when the admin detail fails for another reason", async () => {
    getAdminBusinessEditDetail.mockRejectedValueOnce(new ApiError("Internal server error", 500));
    const { modal, save } = await openEdit();

    expect(within(modal).getByText("Ish vaqtini yuklab bo'lmadi. Saqlaganda ish vaqti o'zgarmaydi.")).toBeInTheDocument();
    fireEvent.click(save);

    await waitFor(() => expect(updateAdminBusiness).toHaveBeenCalled());
    expect(updateAdminBusinessHours).not.toHaveBeenCalled();
  });
});
