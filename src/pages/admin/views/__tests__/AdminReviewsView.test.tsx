import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminReviewsView from "../AdminReviewsView";

vi.mock("../../../../lib/api", () => import("../../../../test/apiMock"));

import { ApiError, getAdminReviews, hideAdminReview, mockAdminReview } from "../../../../test/apiMock";

describe("AdminReviewsView", () => {
  afterEach(() => {
    getAdminReviews.mockReset();
    hideAdminReview.mockReset();
  });

  it("renders the real review list once loaded", async () => {
    getAdminReviews.mockResolvedValue({ items: [mockAdminReview], total: 1 });

    render(<AdminReviewsView />);

    expect(await screen.findByText(mockAdminReview.user!.fullName)).toBeInTheDocument();
    expect(screen.getByText(mockAdminReview.comment)).toBeInTheDocument();
    expect(screen.getByText(mockAdminReview.branch!.business!.name, { exact: false })).toBeInTheDocument();
  });

  it("shows an empty state when there are no reviews", async () => {
    getAdminReviews.mockResolvedValue({ items: [], total: 0 });

    render(<AdminReviewsView />);

    expect(await screen.findByText("Sharhlar topilmadi")).toBeInTheDocument();
  });

  it("shows a forbidden state for a non-admin (403) response", async () => {
    getAdminReviews.mockRejectedValue(new ApiError("Forbidden", 403));

    render(<AdminReviewsView />);

    expect(await screen.findByText("Admin huquqi talab qilinadi")).toBeInTheDocument();
  });

  it("hides a review via the moderation action and reports success", async () => {
    getAdminReviews.mockResolvedValue({ items: [mockAdminReview], total: 1 });
    hideAdminReview.mockResolvedValue({ ...mockAdminReview, status: "HIDDEN" });

    render(<AdminReviewsView />);

    const hideButton = await screen.findByRole("button", { name: /yashirish/i });
    fireEvent.click(hideButton);

    await waitFor(() => expect(hideAdminReview).toHaveBeenCalledWith(mockAdminReview.id));
    expect(await screen.findByText("Sharh yashirildi")).toBeInTheDocument();
  });

  it("shows an error message when the hide action fails", async () => {
    getAdminReviews.mockResolvedValue({ items: [mockAdminReview], total: 1 });
    hideAdminReview.mockRejectedValue(new ApiError("Server error", 500));

    render(<AdminReviewsView />);

    const hideButton = await screen.findByRole("button", { name: /yashirish/i });
    fireEvent.click(hideButton);

    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });
});
