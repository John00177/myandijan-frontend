import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminReportsView from "../AdminReportsView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import { ApiError, getAdminReports, mockAdminReport, resolveAdminReport } from "../../../../test/apiMock";

function listOf(...rows: (typeof mockAdminReport)[]) {
  getAdminReports.mockResolvedValue({ items: rows, total: rows.length });
}

describe("AdminReportsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.prompt = vi.fn(() => "");
    listOf(mockAdminReport);
    resolveAdminReport.mockResolvedValue({ ...mockAdminReport, status: "RESOLVED" });
  });

  it("loads the pending queue by default and shows report, review and business context", async () => {
    render(<AdminReportsView />);

    expect(await screen.findByText("Soy milliy taomlar")).toBeInTheDocument();
    expect(getAdminReports).toHaveBeenCalledWith({ status: "PENDING", limit: 50 });
    expect(screen.getByText(/Dilnoza Karimova/)).toBeInTheDocument();
    expect(screen.getByText("Spam / reklama")).toBeInTheDocument();
    expect(screen.getByText(`"${mockAdminReport.note}"`)).toBeInTheDocument();
    expect(screen.getByText(mockAdminReport.review!.comment!)).toBeInTheDocument();
    expect(screen.getByText("2 ta shikoyat")).toBeInTheDocument();
    expect(screen.getByText("1 ta shikoyat")).toBeInTheDocument();
  });

  it("refetches when the status filter changes", async () => {
    render(<AdminReportsView />);
    await screen.findByText("Soy milliy taomlar");

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "DISMISSED" } });

    await waitFor(() => expect(getAdminReports).toHaveBeenLastCalledWith({ status: "DISMISSED", limit: 50 }));
  });

  it("shows the empty state when the queue is empty", async () => {
    listOf();
    render(<AdminReportsView />);

    expect(await screen.findByText("Shikoyatlar topilmadi")).toBeInTheDocument();
  });

  it("shows the forbidden state for a non-admin token (403)", async () => {
    getAdminReports.mockRejectedValue(new ApiError("Forbidden", 403));
    render(<AdminReportsView />);

    expect(await screen.findByText("Admin huquqi talab qilinadi")).toBeInTheDocument();
  });

  it("shows the error state when loading fails", async () => {
    getAdminReports.mockRejectedValue(new ApiError("Server error", 500));
    render(<AdminReportsView />);

    expect(await screen.findByText("Ma'lumotni yuklab bo'lmadi")).toBeInTheDocument();
  });

  it("hides the review with an optional moderator note, reports success and reloads", async () => {
    window.prompt = vi.fn(() => "  Spam havola  ");
    render(<AdminReportsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Sharhni yashirish/ }));

    await waitFor(() =>
      expect(resolveAdminReport).toHaveBeenCalledWith(mockAdminReport.id, "HIDE_REVIEW", "Spam havola"),
    );
    expect(await screen.findByText("Sharh yashirildi, shikoyat hal qilindi")).toBeInTheDocument();
    expect(getAdminReports).toHaveBeenCalledTimes(2);
  });

  it("dismisses without a note when the prompt is left empty", async () => {
    render(<AdminReportsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Rad etish/ }));

    await waitFor(() => expect(resolveAdminReport).toHaveBeenCalledWith(mockAdminReport.id, "DISMISS", undefined));
    expect(await screen.findByText("Shikoyat rad etildi")).toBeInTheDocument();
  });

  it("does nothing when the moderator cancels the prompt", async () => {
    window.prompt = vi.fn(() => null);
    render(<AdminReportsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Rad etish/ }));

    expect(resolveAdminReport).not.toHaveBeenCalled();
  });

  it("surfaces a 409 conflict (already handled elsewhere) and refreshes the list", async () => {
    resolveAdminReport.mockRejectedValue(new ApiError("Report 3 has already been resolved (status: DISMISSED)", 409));
    render(<AdminReportsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Sharhni yashirish/ }));

    expect(await screen.findByText("Report 3 has already been resolved (status: DISMISSED)")).toBeInTheDocument();
    await waitFor(() => expect(getAdminReports).toHaveBeenCalledTimes(2));
  });

  it("does not reload on a non-conflict mutation error", async () => {
    resolveAdminReport.mockRejectedValue(new ApiError("Server error", 500));
    render(<AdminReportsView />);
    fireEvent.click(await screen.findByRole("button", { name: /Rad etish/ }));

    expect(await screen.findByText("Server error")).toBeInTheDocument();
    expect(getAdminReports).toHaveBeenCalledTimes(1);
  });

  it("shows handled reports without actions, with the moderator note", async () => {
    listOf({ ...mockAdminReport, status: "DISMISSED", resolutionNote: "Asossiz" });
    render(<AdminReportsView />);

    expect(await screen.findByText("Moderator izohi: Asossiz")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sharhni yashirish/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rad etish/ })).not.toBeInTheDocument();
  });
});
