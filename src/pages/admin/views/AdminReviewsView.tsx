import { EyeOff, MessageSquare, RotateCcw, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { initials } from "../../../lib/initials";
import { ApiError, getAdminReviews, hideAdminReview, restoreAdminReview } from "../../../lib/api";
import type { AdminReview } from "../../../types";
import { renderAdminState } from "../AdminFetchState";
import { formatDate, ReviewStatusBadge } from "../statusLabels";

const inputClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink outline-none focus:border-primary/50";

const STATUS_OPTIONS = [
  { value: "", label: "Barchasi" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "PUBLISHED", label: "Chop etilgan" },
  { value: "REJECTED", label: "Rad etilgan" },
  { value: "HIDDEN", label: "Yashirilgan" },
];

export default function AdminReviewsView() {
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const fetcher = useCallback(
    () => getAdminReviews({ status: statusFilter || undefined, limit: 50 }),
    [statusFilter],
  );
  const { data, state, status, reload } = useAdminResource(fetcher);
  const reviews = data?.items ?? [];

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleHide(review: AdminReview) {
    setPendingActionId(review.id);
    try {
      await hideAdminReview(review.id);
      setToast({ tone: "success", text: "Sharh yashirildi" });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleRestore(review: AdminReview) {
    setPendingActionId(review.id);
    try {
      await restoreAdminReview(review.id);
      setToast({ tone: "success", text: "Sharh tiklandi" });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
    } finally {
      setPendingActionId(null);
    }
  }

  const stateEl = renderAdminState(state, status);

  return (
    <div>
      {toast && (
        <div
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
            toast.tone === "success"
              ? "bg-success/10 border-success/30 text-success"
              : "bg-danger/10 border-danger/30 text-danger"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{state === "ok" ? `${reviews.length} ta sharh` : "Sharhlar"}</p>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClasses}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {stateEl ??
        (state === "loading" ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Sharhlar topilmadi" body="Filtrni o'zgartirib ko'ring." />
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <div key={review.id} className="bg-card border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {initials(review.user?.fullName ?? "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{review.user?.fullName ?? "Noma'lum"}</div>
                    <div className="text-xs text-ink-muted truncate">
                      {review.branch?.business?.name ?? review.branch?.name ?? "—"} · {formatDate(review.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-warning shrink-0">
                    <Star size={14} className="fill-warning" />
                    <span className="text-sm font-semibold">{review.rating}</span>
                  </div>
                  <ReviewStatusBadge status={review.status} />
                </div>

                <p className="text-sm text-ink-body mt-3">{review.comment}</p>

                {review.reply && (
                  <div className="mt-3 pl-3 border-l-2 border-primary/30">
                    <div className="text-xs font-medium text-primary">Biznes javobi</div>
                    <p className="text-sm text-ink-body mt-1">{review.reply.body}</p>
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  {review.status !== "HIDDEN" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!text-danger hover:!bg-danger/10"
                      disabled={pendingActionId === review.id}
                      onClick={() => handleHide(review)}
                    >
                      <EyeOff size={14} />
                      Yashirish
                    </Button>
                  )}
                  {review.status !== "PUBLISHED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!text-success hover:!bg-success/10"
                      disabled={pendingActionId === review.id}
                      onClick={() => handleRestore(review)}
                    >
                      <RotateCcw size={14} />
                      Tiklash
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
