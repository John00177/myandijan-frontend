import { EyeOff, Flag, Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { ApiError, getAdminReports, resolveAdminReport } from "../../../lib/api";
import type { AdminReviewReport, ReportReasonValue } from "../../../types";
import { renderAdminState } from "../AdminFetchState";
import { ReportStatusBadge, ReviewStatusBadge, formatDate } from "../statusLabels";

const inputClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink outline-none focus:border-primary/50";

// Default to the actionable queue; the other filters are the report history.
const STATUS_OPTIONS = [
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "RESOLVED", label: "Sharh yashirilgan" },
  { value: "DISMISSED", label: "Rad etilgan" },
  { value: "", label: "Barchasi" },
];

const REASON_LABELS: Record<ReportReasonValue, string> = {
  SPAM: "Spam / reklama",
  OFFENSIVE: "Haqoratli",
  FAKE: "Soxta sharh",
  IRRELEVANT: "Mavzuga aloqasiz",
  PERSONAL_INFO: "Shaxsiy ma'lumot",
  OTHER: "Boshqa",
};

/**
 * Review-report moderation queue (Phase 12). Reports are created by customers
 * via POST /reviews/:id/report; this view lists them (GET /admin/reports) and
 * applies the two actions the backend already supports:
 *   HIDE_REVIEW → report RESOLVED, review HIDDEN, rating aggregates recalculated
 *   DISMISS     → report DISMISSED, review untouched
 * A report that was already handled returns 409; the message is shown and the
 * list reloads so the stale row updates.
 */
export default function AdminReportsView() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const fetcher = useCallback(
    () => getAdminReports({ status: statusFilter || undefined, limit: 50 }),
    [statusFilter],
  );
  const { data, state, status, reload } = useAdminResource(fetcher);
  const reports = data?.items ?? [];

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleResolve(report: AdminReviewReport, action: "HIDE_REVIEW" | "DISMISS") {
    // null = cancelled; an empty string just means "no note".
    const note = window.prompt(
      action === "HIDE_REVIEW" ? "Sharhni yashirish — izoh (ixtiyoriy):" : "Shikoyatni rad etish — izoh (ixtiyoriy):",
    );
    if (note === null) return;

    setPendingActionId(report.id);
    try {
      await resolveAdminReport(report.id, action, note.trim() || undefined);
      setToast({
        tone: "success",
        text: action === "HIDE_REVIEW" ? "Sharh yashirildi, shikoyat hal qilindi" : "Shikoyat rad etildi",
      });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
      // 409 = someone else already handled it — refresh so the row shows that.
      if (err instanceof ApiError && err.status === 409) reload();
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
        <p className="text-sm text-ink-muted">{state === "ok" ? `${reports.length} ta shikoyat` : "Shikoyatlar"}</p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Status"
          className={inputClasses}
        >
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
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <EmptyState icon={Flag} title="Shikoyatlar topilmadi" body="Filtrni o'zgartirib ko'ring." />
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => {
              const review = report.review;
              return (
                <div key={report.id} className="bg-card border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink truncate">
                        {review?.branch?.business?.name ?? review?.branch?.name ?? "Noma'lum biznes"}
                      </div>
                      <div className="text-xs text-ink-muted truncate">
                        {/* Moderators get the reporter id only, not the name (D-72). */}
                        Shikoyatchi:{" "}
                        {report.reporter?.fullName ?? (report.reporter ? `#${report.reporter.id}` : "Noma'lum")} ·{" "}
                        {formatDate(report.createdAt)}
                      </div>
                    </div>
                    <ReportStatusBadge status={report.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge tone="danger">{REASON_LABELS[report.reason] ?? report.reason}</Badge>
                    {review && review.reportCount > 1 && <Badge tone="amber">{review.reportCount} ta shikoyat</Badge>}
                  </div>
                  {report.note && <p className="text-sm text-ink-body mt-2">"{report.note}"</p>}

                  {review ? (
                    <div className="mt-3 pl-3 border-l-2 border-white/[0.12]">
                      <div className="flex items-center gap-2 text-xs text-ink-muted">
                        <span>{review.user?.fullName ?? "Noma'lum"}</span>
                        <span className="inline-flex items-center gap-0.5 text-warning">
                          <Star size={12} className="fill-warning" />
                          {review.rating}/5
                        </span>
                        <ReviewStatusBadge status={review.status} />
                      </div>
                      {review.comment && <p className="text-sm text-ink-body mt-1">{review.comment}</p>}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-muted">Sharh o'chirilgan</p>
                  )}

                  {report.status !== "PENDING" && report.resolutionNote && (
                    <div className="mt-2 text-xs text-ink-muted">Moderator izohi: {report.resolutionNote}</div>
                  )}

                  {report.status === "PENDING" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!text-danger hover:!bg-danger/10"
                        disabled={pendingActionId === report.id}
                        onClick={() => handleResolve(report, "HIDE_REVIEW")}
                      >
                        <EyeOff size={14} />
                        Sharhni yashirish
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pendingActionId === report.id}
                        onClick={() => handleResolve(report, "DISMISS")}
                      >
                        <X size={14} />
                        Rad etish
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}
