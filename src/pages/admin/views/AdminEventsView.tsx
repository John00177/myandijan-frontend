import { Calendar, Check, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { ApiError, approveAdminEvent, getAdminEvents, rejectAdminEvent } from "../../../lib/api";
import type { AdminEvent } from "../../../types";
import { renderAdminState } from "../AdminFetchState";
import { EventStatusBadge, formatDate } from "../statusLabels";

const inputClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink outline-none focus:border-primary/50";

// Matches the API's RejectEventDto (@MaxLength(1000)).
const REJECTION_REASON_MAX_LENGTH = 1000;

// A moderation queue: it opens on what needs a decision. "Barchasi" shows
// the full history.
const STATUS_OPTIONS = [
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "", label: "Barchasi" },
  { value: "PUBLISHED", label: "Chop etilgan" },
  { value: "REJECTED", label: "Rad etilgan" },
];

function eventTitle(e: AdminEvent): string {
  return e.title ?? e.nameUz ?? e.nameRu ?? e.nameEn ?? `#${e.id}`;
}

function eventPlace(e: AdminEvent): string | null {
  return e.venueName ?? e.address ?? e.location ?? null;
}

export default function AdminEventsView() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const fetcher = useCallback(() => getAdminEvents({ status: statusFilter || undefined }), [statusFilter]);
  const { data, state, status, reload } = useAdminResource(fetcher);
  const events = data?.items ?? [];

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // Phase 16E.2: the approve/reject buttons used to have no handler at all,
  // so owners' PENDING events could never be published or rejected from the
  // UI. The API decides — PENDING only (409), never your own business's event
  // (403) — and its message is shown as-is.
  async function runAction(event: AdminEvent, action: () => Promise<unknown>, successText: string) {
    setPendingActionId(event.id);
    try {
      await action();
      setToast({ tone: "success", text: successText });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
    } finally {
      setPendingActionId(null);
    }
  }

  function handleApprove(event: AdminEvent) {
    return runAction(event, () => approveAdminEvent(event.id), "Tadbir tasdiqlandi va chop etildi");
  }

  function handleReject(event: AdminEvent) {
    const input = window.prompt("Rad etish sababi:");
    if (input === null) return;
    const reason = input.trim();
    if (!reason) {
      setToast({ tone: "error", text: "Rad etish sababi majburiy" });
      return;
    }
    if (reason.length > REJECTION_REASON_MAX_LENGTH) {
      setToast({ tone: "error", text: `Rad etish sababi ${REJECTION_REASON_MAX_LENGTH} belgidan oshmasligi kerak` });
      return;
    }
    return runAction(event, () => rejectAdminEvent(event.id, reason), "Tadbir rad etildi");
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
        <p className="text-sm text-ink-muted">{state === "ok" ? `${events.length} ta tadbir` : "Tadbirlar"}</p>
        <select
          aria-label="Holat bo'yicha filtr"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
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
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon={Calendar} title="Tadbirlar topilmadi" body="Filtrni o'zgartirib ko'ring." />
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => {
              const place = eventPlace(event);
              const isPending = event.status?.toUpperCase() === "PENDING";
              return (
                <div key={event.id} className="p-4 bg-card border border-white/[0.08] rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#1F2C38] to-[#121A22] flex items-center justify-center shrink-0">
                      <Calendar size={18} className="text-ink-muted/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-ink truncate">{eventTitle(event)}</div>
                      <div className="text-xs text-ink-muted mt-1 truncate">
                        {event.business?.name ? `${event.business.name} · ` : ""}
                        {formatDate(event.startAt ?? event.startsAt)}
                        {place ? ` · ${place}` : ""}
                      </div>
                    </div>
                    <EventStatusBadge status={event.status} />
                    {isPending && (
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-success hover:!bg-success/10"
                          disabled={pendingActionId === event.id}
                          onClick={() => handleApprove(event)}
                        >
                          <Check size={14} />
                          Tasdiqlash
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!text-danger hover:!bg-danger/10"
                          disabled={pendingActionId === event.id}
                          onClick={() => handleReject(event)}
                        >
                          <X size={14} />
                          Rad etish
                        </Button>
                      </div>
                    )}
                  </div>

                  {event.status?.toUpperCase() === "REJECTED" && event.rejectionReason && (
                    <div className="mt-3 pl-3 border-l-2 border-danger/30 text-sm text-danger">{event.rejectionReason}</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}
