import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminClaimsView from "../AdminClaimsView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import {
  ApiError,
  approveAdminClaim,
  getAdminClaims,
  mockAdminClaim,
  rejectAdminClaim,
} from "../../../../test/apiMock";

describe("AdminClaimsView", () => {
  beforeEach(() => {
    getAdminClaims.mockResolvedValue({ items: [mockAdminClaim], total: 1 });
  });

  afterEach(() => {
    getAdminClaims.mockReset();
    approveAdminClaim.mockReset();
    rejectAdminClaim.mockReset();
    vi.restoreAllMocks();
  });

  it("renders the real claim list with business, claimant and evidence", async () => {
    render(<AdminClaimsView />);

    expect(await screen.findByText(mockAdminClaim.business!.name)).toBeInTheDocument();
    expect(screen.getByText(mockAdminClaim.claimant!.fullName, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(mockAdminClaim.evidence!)).toBeInTheDocument();
    expect(screen.getByText("1 ta da'vo")).toBeInTheDocument();
  });

  it("refetches with the selected status filter", async () => {
    render(<AdminClaimsView />);
    await screen.findByText(mockAdminClaim.business!.name);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "APPROVED" } });

    await waitFor(() => expect(getAdminClaims).toHaveBeenLastCalledWith({ status: "APPROVED", limit: 50 }));
  });

  it("approves a pending claim with the trimmed verification note, reports success, and reloads the list", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("  Ro'yxatdagi raqamga qo'ng'iroq qilindi  ");
    approveAdminClaim.mockResolvedValue({ ...mockAdminClaim, status: "APPROVED" });

    render(<AdminClaimsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    await waitFor(() =>
      expect(approveAdminClaim).toHaveBeenCalledWith(mockAdminClaim.id, "Ro'yxatdagi raqamga qo'ng'iroq qilindi"),
    );
    expect(await screen.findByText("Da'vo tasdiqlandi — biznes egasi tayinlandi")).toBeInTheDocument();
    expect(getAdminClaims).toHaveBeenCalledTimes(2);
  });

  it("surfaces the backend error when approval conflicts (e.g. business already owned)", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("Qo'ng'iroq qilindi");
    approveAdminClaim.mockRejectedValue(new ApiError("Business 1 already has an owner", 409));

    render(<AdminClaimsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    expect(await screen.findByText("Business 1 already has an owner")).toBeInTheDocument();
  });

  it("does not approve, and shows nothing, when the verification-note prompt is cancelled", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue(null);

    render(<AdminClaimsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(approveAdminClaim).not.toHaveBeenCalled();
    expect(screen.queryByText("Tekshiruv izohi majburiy")).not.toBeInTheDocument();
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", "   \n\t "],
  ])("refuses an %s verification note with a clear error and does not call the API", async (_name, note) => {
    vi.spyOn(window, "prompt").mockReturnValue(note);

    render(<AdminClaimsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    expect(await screen.findByText("Tekshiruv izohi majburiy")).toBeInTheDocument();
    expect(approveAdminClaim).not.toHaveBeenCalled();
  });

  it("refuses a verification note over 1000 characters and does not call the API", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("x".repeat(1001));

    render(<AdminClaimsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    expect(await screen.findByText("Tekshiruv izohi 1000 belgidan oshmasligi kerak")).toBeInTheDocument();
    expect(approveAdminClaim).not.toHaveBeenCalled();
  });

  it("accepts a verification note of exactly 1000 characters", async () => {
    const note = "x".repeat(1000);
    vi.spyOn(window, "prompt").mockReturnValue(note);
    approveAdminClaim.mockResolvedValue({ ...mockAdminClaim, status: "APPROVED" });

    render(<AdminClaimsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    await waitFor(() => expect(approveAdminClaim).toHaveBeenCalledWith(mockAdminClaim.id, note));
    // Let the post-approval reload settle before afterEach resets the mocks.
    expect(await screen.findByText("Da'vo tasdiqlandi — biznes egasi tayinlandi")).toBeInTheDocument();
  });

  it("rejects a pending claim with the reason entered in the prompt", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("  Hujjat yetarli emas  ");
    rejectAdminClaim.mockResolvedValue({ ...mockAdminClaim, status: "REJECTED" });

    render(<AdminClaimsView />);
    fireEvent.click(await screen.findByRole("button", { name: /rad etish/i }));

    await waitFor(() => expect(rejectAdminClaim).toHaveBeenCalledWith(mockAdminClaim.id, "Hujjat yetarli emas"));
    expect(await screen.findByText("Da'vo rad etildi")).toBeInTheDocument();
  });

  it("does not reject when the reason prompt is cancelled or left blank", async () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValueOnce(null).mockReturnValueOnce("   ");

    render(<AdminClaimsView />);
    const rejectButton = await screen.findByRole("button", { name: /rad etish/i });
    fireEvent.click(rejectButton);
    fireEvent.click(rejectButton);

    expect(prompt).toHaveBeenCalledTimes(2);
    expect(rejectAdminClaim).not.toHaveBeenCalled();
  });

  it("shows no approve/reject actions for an already-reviewed claim, and shows its rejection reason", async () => {
    getAdminClaims.mockResolvedValue({
      items: [{ ...mockAdminClaim, status: "REJECTED", rejectionReason: "Hujjat yetarli emas" }],
      total: 1,
    });

    render(<AdminClaimsView />);

    expect(await screen.findByText("Hujjat yetarli emas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tasdiqlash/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rad etish/i })).not.toBeInTheDocument();
  });

  describe("review context (Phase 16E.1)", () => {
    const withContext = (
      business: Partial<NonNullable<typeof mockAdminClaim.business>> = {},
      claimant: Partial<NonNullable<typeof mockAdminClaim.claimant>> = {},
      status: typeof mockAdminClaim.status = "PENDING",
    ) => ({
      ...mockAdminClaim,
      status,
      business: { ...mockAdminClaim.business!, status: "APPROVED", deletedAt: null, _count: { claims: 1 }, ...business },
      claimant: { ...mockAdminClaim.claimant!, status: "ACTIVE", ...claimant },
    });
    const approveButton = () => screen.findByRole("button", { name: /tasdiqlash/i });

    it("shows no warning and keeps approval available for a clean, uncontested claim", async () => {
      getAdminClaims.mockResolvedValue({ items: [withContext()], total: 1 });
      approveAdminClaim.mockResolvedValue({ ...mockAdminClaim, status: "APPROVED" });
      // Approval still goes through the 16C.1 verification-note prompt.
      vi.spyOn(window, "prompt").mockReturnValue("Qo'ng'iroq qilindi");

      render(<AdminClaimsView />);
      fireEvent.click(await approveButton());

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(/raqobatdosh/)).not.toBeInTheDocument();
      await waitFor(() => expect(approveAdminClaim).toHaveBeenCalledWith(mockAdminClaim.id, "Qo'ng'iroq qilindi"));
      expect(await screen.findByText("Da'vo tasdiqlandi — biznes egasi tayinlandi")).toBeInTheDocument();
    });

    it.each([
      ["the business is no longer approved", withContext({ status: "SUSPENDED" }), "Biznes tasdiqlangan holatda emas (holati: SUSPENDED)"],
      ["the business is deleted", withContext({ deletedAt: "2026-10-01T00:00:00.000Z" }), "Biznes o'chirilgan"],
      ["the business already has an owner", withContext({ ownerId: 99 }), "Biznesning egasi allaqachon bor"],
      ["the claimant is suspended", withContext({}, { status: "SUSPENDED" }), "Da'vogar hisobi faol emas (holati: SUSPENDED)"],
    ])("warns and disables approval when %s, leaving reject available", async (_name, claim, reason) => {
      getAdminClaims.mockResolvedValue({ items: [claim], total: 1 });

      render(<AdminClaimsView />);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Tasdiqlab bo'lmaydi:");
      expect(alert).toHaveTextContent(reason);
      const approve = await approveButton();
      expect(approve).toBeDisabled();
      fireEvent.click(approve);
      expect(approveAdminClaim).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /rad etish/i })).toBeEnabled();
    });

    it("lists every blocker at once", async () => {
      getAdminClaims.mockResolvedValue({
        items: [withContext({ status: "HIDDEN", ownerId: 99 }, { status: "SUSPENDED" })],
        total: 1,
      });

      render(<AdminClaimsView />);

      const items = (await screen.findByRole("alert")).querySelectorAll("li");
      expect(items).toHaveLength(3);
    });

    it("flags competing pending claims on the same business without blocking approval", async () => {
      getAdminClaims.mockResolvedValue({ items: [withContext({ _count: { claims: 3 } })], total: 1 });

      render(<AdminClaimsView />);

      expect(await screen.findByText("+2 raqobatdosh da'vo")).toBeInTheDocument();
      expect(screen.getByText(/Shu biznesga yana 2 ta kutilayotgan da'vo bor/)).toBeInTheDocument();
      expect(await approveButton()).toBeEnabled();
    });

    it("shows no context and no false warnings when the API omits the context fields (older API)", async () => {
      // mockAdminClaim carries none of the 16E.1 fields.
      render(<AdminClaimsView />);

      expect(await approveButton()).toBeEnabled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(/raqobatdosh/)).not.toBeInTheDocument();
    });

    it("does not judge an already-reviewed claim against its business's current state", async () => {
      getAdminClaims.mockResolvedValue({
        items: [withContext({ status: "SUSPENDED", ownerId: 7, _count: { claims: 2 } }, {}, "APPROVED")],
        total: 1,
      });

      render(<AdminClaimsView />);

      await screen.findByText(mockAdminClaim.business!.name);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText(/raqobatdosh/)).not.toBeInTheDocument();
    });
  });

  it("shows an empty state when there are no claims", async () => {
    getAdminClaims.mockResolvedValue({ items: [], total: 0 });

    render(<AdminClaimsView />);

    expect(await screen.findByText("Da'volar topilmadi")).toBeInTheDocument();
  });

  it("shows a forbidden state for a non-admin (403) response", async () => {
    getAdminClaims.mockRejectedValue(new ApiError("Forbidden", 403));

    render(<AdminClaimsView />);

    expect(await screen.findByText("Admin huquqi talab qilinadi")).toBeInTheDocument();
  });

  it("shows an error state when the list request fails", async () => {
    getAdminClaims.mockRejectedValue(new ApiError("Server error", 500));

    render(<AdminClaimsView />);

    expect(await screen.findByText("Ma'lumotni yuklab bo'lmadi")).toBeInTheDocument();
  });
});
