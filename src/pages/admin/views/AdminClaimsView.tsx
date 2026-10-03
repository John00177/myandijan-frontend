import { Check, ClipboardCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { ApiError, approveAdminClaim, getAdminClaims, rejectAdminClaim } from "../../../lib/api";
import type { AdminClaim } from "../../../types";
import { renderAdminState } from "../AdminFetchState";
import { ClaimStatusBadge, formatDate } from "../statusLabels";

const inputClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink outline-none focus:border-primary/50";

// Matches the API's ApproveClaimDto (@MaxLength(1000)).
const VERIFICATION_NOTE_MAX_LENGTH = 1000;

const STATUS_OPTIONS = [
  { value: "", label: "Barchasi" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "APPROVED", label: "Tasdiqlangan" },
  { value: "REJECTED", label: "Rad etilgan" },
];

export default function AdminClaimsView() {
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const fetcher = useCallback(
    () => getAdminClaims({ status: statusFilter || undefined, limit: 50 }),
    [statusFilter],
  );
  const { data, state, status, reload } = useAdminResource(fetcher);
  const claims = data?.items ?? [];

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleApprove(claim: AdminClaim) {
    // Phase 16C.1: approving grants ownership, so the API requires a note on
    // how the claimant was verified. Cancelling aborts silently, like reject;
    // a blank or over-long note is refused here with a visible error rather
    // than a round-trip 400.
    const input = window.prompt(
      "Tekshiruv izohi — da'vogar qanday tasdiqlandi (masalan: ro'yxatdagi telefon raqamiga qo'ng'iroq qilindi):",
    );
    if (input === null) return;
    const verificationNote = input.trim();
    if (!verificationNote) {
      setToast({ tone: "error", text: "Tekshiruv izohi majburiy" });
      return;
    }
    if (verificationNote.length > VERIFICATION_NOTE_MAX_LENGTH) {
      setToast({ tone: "error", text: `Tekshiruv izohi ${VERIFICATION_NOTE_MAX_LENGTH} belgidan oshmasligi kerak` });
      return;
    }

    setPendingActionId(claim.id);
    try {
      await approveAdminClaim(claim.id, verificationNote);
      setToast({ tone: "success", text: "Da'vo tasdiqlandi — biznes egasi tayinlandi" });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleReject(claim: AdminClaim) {
    const reason = window.prompt("Rad etish sababi:");
    if (!reason || !reason.trim()) return;

    setPendingActionId(claim.id);
    try {
      await rejectAdminClaim(claim.id, reason.trim());
      setToast({ tone: "success", text: "Da'vo rad etildi" });
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
        <p className="text-sm text-ink-muted">{state === "ok" ? `${claims.length} ta da'vo` : "Da'volar"}</p>
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
        ) : claims.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="Da'volar topilmadi" body="Filtrni o'zgartirib ko'ring." />
        ) : (
          <div className="flex flex-col gap-3">
            {claims.map((claim) => (
              <div key={claim.id} className="bg-card border border-white/[0.08] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{claim.business?.name ?? "Noma'lum biznes"}</div>
                    <div className="text-xs text-ink-muted truncate">
                      {claim.claimant?.fullName ?? "Noma'lum"} · {claim.claimant?.phone ?? "—"} ·{" "}
                      {formatDate(claim.createdAt)}
                    </div>
                  </div>
                  <ClaimStatusBadge status={claim.status} />
                </div>

                {claim.evidence && <p className="text-sm text-ink-body mt-3">{claim.evidence}</p>}

                {(claim.contactPhone || claim.contactNote) && (
                  <div className="mt-2 text-xs text-ink-muted">
                    {claim.contactPhone && <div>Aloqa telefoni: {claim.contactPhone}</div>}
                    {claim.contactNote && <div>Izoh: {claim.contactNote}</div>}
                  </div>
                )}

                {claim.status === "REJECTED" && claim.rejectionReason && (
                  <div className="mt-2 pl-3 border-l-2 border-danger/30 text-sm text-danger">
                    {claim.rejectionReason}
                  </div>
                )}

                {claim.status === "PENDING" && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!text-success hover:!bg-success/10"
                      disabled={pendingActionId === claim.id}
                      onClick={() => handleApprove(claim)}
                    >
                      <Check size={14} />
                      Tasdiqlash
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!text-danger hover:!bg-danger/10"
                      disabled={pendingActionId === claim.id}
                      onClick={() => handleReject(claim)}
                    >
                      <X size={14} />
                      Rad etish
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
