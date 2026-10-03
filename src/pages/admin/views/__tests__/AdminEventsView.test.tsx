import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminEventsView from "../AdminEventsView";
import { VIEW_CAPABILITY } from "../../types";
import { hasCapability } from "../../../../lib/capabilities";
import { testUser } from "../../../../test/roleCapabilities";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import {
  ApiError,
  approveAdminEvent,
  getAdminEvents,
  mockAdminEvent,
  rejectAdminEvent,
} from "../../../../test/apiMock";

// Phase 16E.2: the event moderation queue's approve/reject buttons used to
// have no handler. These pin the wired workflow against the real API contract
// (POST /admin/events/:id/approve, /reject { reason }).
describe("AdminEventsView", () => {
  beforeEach(() => {
    getAdminEvents.mockResolvedValue({ items: [mockAdminEvent], total: 1 });
  });

  afterEach(() => {
    getAdminEvents.mockReset();
    approveAdminEvent.mockReset();
    rejectAdminEvent.mockReset();
    vi.restoreAllMocks();
  });

  it("opens on the PENDING queue and renders the real event fields", async () => {
    render(<AdminEventsView />);

    expect(await screen.findByText(mockAdminEvent.title!)).toBeInTheDocument();
    expect(screen.getByText(/Soy milliy taomlar ·/)).toHaveTextContent("Bobur xiyoboni");
    expect(screen.getByText("Kutilmoqda", { selector: "span" })).toBeInTheDocument();
    expect(getAdminEvents).toHaveBeenCalledWith({ status: "PENDING" });
  });

  it("refetches with the selected status filter, and without one for 'Barchasi'", async () => {
    render(<AdminEventsView />);
    await screen.findByText(mockAdminEvent.title!);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });

    await waitFor(() => expect(getAdminEvents).toHaveBeenLastCalledWith({ status: undefined }));
  });

  it("approves a pending event, reports success, and reloads the queue", async () => {
    approveAdminEvent.mockResolvedValue({ ...mockAdminEvent, status: "PUBLISHED" });

    render(<AdminEventsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    await waitFor(() => expect(approveAdminEvent).toHaveBeenCalledWith(mockAdminEvent.id));
    expect(await screen.findByText("Tadbir tasdiqlandi va chop etildi")).toBeInTheDocument();
    expect(getAdminEvents).toHaveBeenCalledTimes(2);
  });

  it.each([
    [403, "Forbidden: you cannot review your own business's event"],
    [409, "Event 3 is not pending review (current status: PUBLISHED)"],
  ])("surfaces the API's %i refusal of an approval", async (status, message) => {
    approveAdminEvent.mockRejectedValue(new ApiError(message, status));

    render(<AdminEventsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(getAdminEvents).toHaveBeenCalledTimes(1);
  });

  it("disables both actions while a decision is in flight", async () => {
    approveAdminEvent.mockReturnValue(new Promise(() => {}));

    render(<AdminEventsView />);
    fireEvent.click(await screen.findByRole("button", { name: /tasdiqlash/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /tasdiqlash/i })).toBeDisabled());
    expect(screen.getByRole("button", { name: /rad etish/i })).toBeDisabled();
  });

  it("rejects a pending event with the trimmed reason from the prompt", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("  Sana noto'g'ri ko'rsatilgan  ");
    rejectAdminEvent.mockResolvedValue({ ...mockAdminEvent, status: "REJECTED" });

    render(<AdminEventsView />);
    fireEvent.click(await screen.findByRole("button", { name: /rad etish/i }));

    await waitFor(() => expect(rejectAdminEvent).toHaveBeenCalledWith(mockAdminEvent.id, "Sana noto'g'ri ko'rsatilgan"));
    expect(await screen.findByText("Tadbir rad etildi")).toBeInTheDocument();
  });

  it("does nothing when the reason prompt is cancelled", async () => {
    vi.spyOn(window, "prompt").mockReturnValue(null);

    render(<AdminEventsView />);
    fireEvent.click(await screen.findByRole("button", { name: /rad etish/i }));

    expect(rejectAdminEvent).not.toHaveBeenCalled();
    expect(screen.queryByText("Rad etish sababi majburiy")).not.toBeInTheDocument();
  });

  it.each([
    ["blank", "   ", "Rad etish sababi majburiy"],
    ["over 1000 characters", "x".repeat(1001), "Rad etish sababi 1000 belgidan oshmasligi kerak"],
  ])("refuses a %s reason with a clear error and does not call the API", async (_name, input, error) => {
    vi.spyOn(window, "prompt").mockReturnValue(input);

    render(<AdminEventsView />);
    fireEvent.click(await screen.findByRole("button", { name: /rad etish/i }));

    expect(await screen.findByText(error)).toBeInTheDocument();
    expect(rejectAdminEvent).not.toHaveBeenCalled();
  });

  it("offers no actions on already-decided events, and shows a rejection reason", async () => {
    getAdminEvents.mockResolvedValue({
      items: [
        { ...mockAdminEvent, id: 4, title: "Chop etilgan tadbir", status: "PUBLISHED" },
        { ...mockAdminEvent, id: 5, title: "Rad etilgan tadbir", status: "REJECTED", rejectionReason: "Sana noto'g'ri" },
      ],
      total: 2,
    });

    render(<AdminEventsView />);

    expect(await screen.findByText("Sana noto'g'ri")).toBeInTheDocument();
    expect(screen.getByText("Chop etilgan", { selector: "span" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tasdiqlash/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rad etish/i })).not.toBeInTheDocument();
  });

  it("no longer shows the unwired 'Yangi tadbir' button", async () => {
    render(<AdminEventsView />);
    await screen.findByText(mockAdminEvent.title!);

    expect(screen.queryByRole("button", { name: /yangi tadbir/i })).not.toBeInTheDocument();
  });

  it("shows an empty state when the queue is empty", async () => {
    getAdminEvents.mockResolvedValue({ items: [], total: 0 });

    render(<AdminEventsView />);

    expect(await screen.findByText("Tadbirlar topilmadi")).toBeInTheDocument();
  });

  it("shows the forbidden state when the list request is refused (403)", async () => {
    getAdminEvents.mockRejectedValue(new ApiError("Forbidden", 403));

    render(<AdminEventsView />);

    expect(await screen.findByText("Admin huquqi talab qilinadi")).toBeInTheDocument();
  });

  it("is only offered to holders of event.review (ADMIN, SUPER_ADMIN), mirroring the API", () => {
    expect(VIEW_CAPABILITY.events).toBe("event.review");
    for (const role of ["CUSTOMER", "BUSINESS_OWNER", "SUPPORT", "MODERATOR"]) {
      expect({ role, can: hasCapability(testUser(role), VIEW_CAPABILITY.events) }).toEqual({ role, can: false });
    }
    for (const role of ["ADMIN", "SUPER_ADMIN"]) {
      expect({ role, can: hasCapability(testUser(role), VIEW_CAPABILITY.events) }).toEqual({ role, can: true });
    }
  });
});
