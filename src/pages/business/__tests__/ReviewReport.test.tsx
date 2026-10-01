import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../../../contexts/AuthContext";
import { LanguageProvider } from "../../../contexts/LanguageContext";
import type { Review } from "../../../types";
import ReviewsSection from "../ReviewsSection";

vi.mock("../../../lib/api", () => import("../../../test/apiMock"));

import { ApiError, getMe, reportReview } from "../../../test/apiMock";

const review: Review = {
  id: 11,
  rating: 2,
  comment: "Xizmat juda sekin edi",
  createdAt: "2026-09-20T10:00:00.000Z",
  user: { id: 9, fullName: "Ali Valiyev" },
};

function AuthModalProbe() {
  const { isAuthModalOpen } = useAuth();
  return <div data-testid="auth-modal-open">{String(isAuthModalOpen)}</div>;
}

function renderReviews(lang = "uz") {
  return render(
    <MemoryRouter initialEntries={[`/${lang}/business/soy-milliy-taomlar`]}>
      <AuthProvider>
        <AuthModalProbe />
        <Routes>
          <Route
            path="/:lang/business/:slug"
            element={
              <LanguageProvider>
                <ReviewsSection businessId={1} ownerId={null} reviews={[review]} onChanged={() => {}} />
              </LanguageProvider>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const signedInUser = { id: 7, fullName: "Sardor Aliyev", phone: "+998901234567", role: "CUSTOMER" };

function signIn() {
  localStorage.setItem("myandijan_token", "fake-token");
  localStorage.setItem("myandijan_refresh_token", "fake-refresh-token");
  localStorage.setItem("myandijan_user", JSON.stringify(signedInUser));
  getMe.mockResolvedValue(signedInUser);
}

function openReportForm() {
  fireEvent.click(screen.getByRole("button", { name: "Shikoyat qilish" }));
}

describe("Reporting a review (customer)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getMe.mockRejectedValue(new Error("not authenticated"));
    reportReview.mockResolvedValue({ id: 1, reviewId: review.id, reason: "SPAM", status: "PENDING" });
  });

  it("opens the login modal for a signed-out visitor instead of the report form", () => {
    renderReviews();

    openReportForm();

    expect(screen.getByTestId("auth-modal-open")).toHaveTextContent("true");
    expect(screen.queryByLabelText("Shikoyat sababi")).not.toBeInTheDocument();
    expect(reportReview).not.toHaveBeenCalled();
  });

  it("submits the default reason without a note and confirms success", async () => {
    signIn();
    renderReviews();

    openReportForm();
    fireEvent.click(screen.getByRole("button", { name: "Shikoyatni yuborish" }));

    await waitFor(() => expect(reportReview).toHaveBeenCalledWith(review.id, { reason: "SPAM", note: undefined }));
    expect(await screen.findByText("Rahmat! Shikoyatingiz moderatorlarga yuborildi.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Shikoyat qilish" })).not.toBeInTheDocument();
  });

  it("sends the chosen reason and a trimmed note", async () => {
    signIn();
    renderReviews();

    openReportForm();
    fireEvent.change(screen.getByLabelText("Shikoyat sababi"), { target: { value: "PERSONAL_INFO" } });
    fireEvent.change(screen.getByLabelText("Izoh (ixtiyoriy)"), { target: { value: "  Telefon raqamim yozilgan  " } });
    fireEvent.click(screen.getByRole("button", { name: "Shikoyatni yuborish" }));

    await waitFor(() =>
      expect(reportReview).toHaveBeenCalledWith(review.id, { reason: "PERSONAL_INFO", note: "Telefon raqamim yozilgan" }),
    );
  });

  it("disables the submit button while the request is in flight", async () => {
    signIn();
    let resolve!: (value: unknown) => void;
    reportReview.mockReturnValue(new Promise((r) => (resolve = r)));
    renderReviews();

    openReportForm();
    fireEvent.click(screen.getByRole("button", { name: "Shikoyatni yuborish" }));

    expect(await screen.findByRole("button", { name: "Yuborilmoqda..." })).toBeDisabled();
    resolve({ id: 1 });
  });

  it("treats a 409 (already reported) as a final, non-error state", async () => {
    signIn();
    reportReview.mockRejectedValue(new ApiError("You have already reported this review", 409));
    renderReviews();

    openReportForm();
    fireEvent.click(screen.getByRole("button", { name: "Shikoyatni yuborish" }));

    expect(await screen.findByText("Siz bu sharh haqida allaqachon shikoyat qilgansiz.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports a 404 (review gone) inside the form", async () => {
    signIn();
    reportReview.mockRejectedValue(new ApiError("Review 11 not found", 404));
    renderReviews();

    openReportForm();
    fireEvent.click(screen.getByRole("button", { name: "Shikoyatni yuborish" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Bu sharh endi mavjud emas.");
    expect(screen.getByLabelText("Shikoyat sababi")).toBeInTheDocument();
  });

  it("shows a retryable generic error for other failures", async () => {
    signIn();
    reportReview.mockRejectedValueOnce(new ApiError("Server error", 500));
    renderReviews();

    openReportForm();
    fireEvent.click(screen.getByRole("button", { name: "Shikoyatni yuborish" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Shikoyatni yuborib bo'lmadi");

    fireEvent.click(screen.getByRole("button", { name: "Shikoyatni yuborish" }));
    expect(await screen.findByText("Rahmat! Shikoyatingiz moderatorlarga yuborildi.")).toBeInTheDocument();
  });

  it("closes the form on cancel without sending anything", () => {
    signIn();
    renderReviews();

    openReportForm();
    fireEvent.click(screen.getByRole("button", { name: "Bekor qilish" }));

    expect(screen.queryByLabelText("Shikoyat sababi")).not.toBeInTheDocument();
    expect(reportReview).not.toHaveBeenCalled();
  });

  it("is localized (Russian)", () => {
    signIn();
    renderReviews("ru");

    fireEvent.click(screen.getByRole("button", { name: "Пожаловаться" }));

    expect(screen.getByLabelText("Причина жалобы")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Фейковый отзыв" })).toBeInTheDocument();
  });
});
