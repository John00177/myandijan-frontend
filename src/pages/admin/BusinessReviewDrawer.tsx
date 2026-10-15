import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { getAdminBusinessById } from "../../lib/api";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import type { AdminBranchDetail, AdminBusiness, AdminBusinessDetail, MyBranchHour } from "../../types";
import { reReviewReason } from "./reReview";
import { BusinessStatusBadge, formatDate } from "./statusLabels";

// dayOfWeek is 0 = Monday … 6 = Sunday (NOT Date.getDay()) — same labels as
// EditBusinessModal's hours grid.
const DAY_LABELS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

function hoursText(hour: MyBranchHour | undefined): string {
  if (!hour) return "—";
  if (hour.is24Hours) return "24 soat";
  if (hour.isClosed) return "Dam olish kuni";
  if (hour.openTime && hour.closeTime) return `${hour.openTime}–${hour.closeTime}`;
  return "—";
}

/** "40.7825, 72.3442" — plain text, never a map link (unreviewed input). */
function coordinatesText(branch: AdminBranchDetail): string | null {
  if (branch.lat == null || branch.lng == null) return null;
  const lat = Number(branch.lat);
  const lng = Number(branch.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat}, ${lng}` : null;
}

function BranchDetail({ branch }: { branch: AdminBranchDetail }) {
  const coordinates = coordinatesText(branch);
  const place = [branch.district?.nameUz, branch.city?.nameUz].filter(Boolean).join(", ");
  return (
    <section
      aria-label={`Filial: ${branch.name || branch.address}`}
      className="rounded-xl border border-white/[0.08] p-4 flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-ink break-words">{branch.name || branch.address}</span>
        {branch.isPrimary && <Badge tone="blue">Asosiy</Badge>}
        {branch.isActive === false && <Badge tone="neutral">Nofaol</Badge>}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Manzil">
          {branch.address}
          {place ? `, ${place}` : ""}
          {branch.landmark && <span className="block text-ink-muted">Mo'ljal: {branch.landmark}</span>}
        </Field>
        <Field label="Telefon">
          {branch.phone}
          {branch.phoneAlt && <span className="block">{branch.phoneAlt}</span>}
        </Field>
        <Field label="Koordinatalar">{coordinates ?? "—"}</Field>
      </dl>

      <div>
        <p className="text-xs text-ink-muted mb-1">Ish vaqti</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
          {DAY_LABELS.map((label, dayOfWeek) => (
            <li key={label} className="flex justify-between gap-3">
              <span className="text-ink-muted">{label}</span>
              <span className="text-ink-body">{hoursText(branch.hours.find((h) => h.dayOfWeek === dayOfWeek))}</span>
            </li>
          ))}
        </ul>
      </div>

      {branch.photos.length > 0 && (
        <div>
          <p className="text-xs text-ink-muted mb-1">Galereya ({branch.photos.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {branch.photos.map((photo, index) => (
              <img
                key={`${photo.url}-${index}`}
                src={photo.thumbUrl ?? photo.url}
                alt={photo.caption || `Rasm ${index + 1}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full aspect-square object-cover rounded-lg bg-elevated"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// Matches the API's RejectBusinessDto (@IsNotEmpty, @MaxLength(1000)).
export const REJECTION_REASON_MAX_LENGTH = 1000;

export type BusinessReviewMode = "review" | "reject";

interface BusinessReviewDrawerProps {
  /** The listing under review; null = closed. */
  business: AdminBusiness | null;
  mode: BusinessReviewMode;
  onModeChange: (mode: BusinessReviewMode) => void;
  onClose: () => void;
  onApprove: () => void;
  /** Called with the trimmed, validated reason. */
  onReject: (reason: string) => void;
  pending?: boolean;
  /** The API's refusal (403/409…), shown inside the drawer — the page toast sits behind the scrim. */
  error?: string | null;
}

function businessName(b: AdminBusiness): string {
  return b.nameUz ?? b.name ?? b.nameRu ?? b.nameEn ?? `#${b.id}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink-body break-words">{children}</dd>
    </div>
  );
}

/**
 * Phase 16E: what the owner actually submitted, shown before a moderator
 * decides. The summary comes from the GET /admin/businesses row the queue
 * already loaded, so it renders instantly. On open, the drawer also fetches
 * GET /admin/businesses/:id (Phase 16E.5) for every branch with its hours,
 * gallery and coordinates — any status, unlike the public endpoint, which
 * 404s for a listing that is not APPROVED. If that request fails (production
 * answers 404 until the API deploy that adds the route), the summary stays
 * and a note says the rest is unavailable; the decision buttons never wait
 * on it.
 *
 * Owner-supplied URLs/handles render as plain text, never as links: this is
 * unreviewed input, and a moderator should not be one click from it.
 */
export default function BusinessReviewDrawer({
  business,
  mode,
  onModeChange,
  onClose,
  onApprove,
  onReject,
  pending = false,
  error = null,
}: BusinessReviewDrawerProps) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const panelTransition = useMotionTransition(TRANSITIONS.smooth);

  const [detail, setDetail] = useState<AdminBusinessDetail | null>(null);
  const [detailState, setDetailState] = useState<"loading" | "loaded" | "unavailable">("loading");

  const open = business !== null;
  const businessId = business?.id ?? null;

  // A fresh reason per listing — never carry one business's reason to the next.
  useEffect(() => {
    setReason("");
    setReasonError(null);
  }, [businessId]);

  // The full listing, refetched per business; a late response for a listing
  // that is no longer open is dropped.
  useEffect(() => {
    if (businessId == null) return;
    let cancelled = false;
    setDetail(null);
    setDetailState("loading");
    getAdminBusinessById(businessId)
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
        setDetailState("loaded");
      })
      .catch(() => {
        if (!cancelled) setDetailState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function handleRejectSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("Rad etish sababi majburiy");
      return;
    }
    if (trimmed.length > REJECTION_REASON_MAX_LENGTH) {
      setReasonError(`Rad etish sababi ${REJECTION_REASON_MAX_LENGTH} belgidan oshmasligi kerak`);
      return;
    }
    setReasonError(null);
    onReject(trimmed);
  }

  const branch = business?.branches?.[0];
  const cover = business?.coverPhoto ?? business?.coverUrl ?? null;
  const extraBranches = (business?.branchCount ?? 1) - 1;
  const isPending = (business?.status ?? "").toUpperCase() === "PENDING";
  // Back for re-review (Phase 16I.1): the earlier reason, so the moderator
  // checks whether the owner fixed exactly that.
  const previousReason = business ? reReviewReason(business) : null;

  return (
    <AnimatePresence>
      {business && (
        <>
          {/* pointerEvents in both exit targets: see AdminMobileDrawer. */}
          <motion.div
            className="fixed inset-0 z-50 bg-black"
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 0.6, pointerEvents: "auto" }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={backdropTransition}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Ko'rib chiqish: ${businessName(business)}`}
            className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-lg overflow-y-auto bg-card sm:border-l border-white/[0.08] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)] flex flex-col"
            initial={shouldAnimate ? { x: "100%" } : false}
            animate={{ x: 0, pointerEvents: "auto" }}
            exit={{ x: "100%", pointerEvents: "none" }}
            transition={panelTransition}
          >
            <div className="flex items-start justify-between gap-3 p-6 border-b border-white/[0.08]">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink break-words">{businessName(business)}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <BusinessStatusBadge status={business.status} />
                  <span>
                    #{business.id} · Yuborilgan: {formatDate(business.createdAt)}
                  </span>
                </div>
              </div>
              <button onClick={onClose} aria-label="Yopish" className="text-ink-muted hover:text-ink shrink-0">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 p-6 flex flex-col gap-5">
              {previousReason && (
                <div className="pl-3 border-l-2 border-warning/40 text-sm">
                  <p className="font-semibold text-ink">Qayta ko'rib chiqish</p>
                  <p className="text-ink-muted">Oldingi sabab: {previousReason}</p>
                </div>
              )}
              {cover && (
                <img
                  src={cover}
                  alt="Muqova rasmi"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full aspect-[16/9] object-cover rounded-xl bg-elevated"
                />
              )}

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Turkum">{business.category?.nameUz ?? "—"}</Field>
                <Field label="Turi">{business.businessType?.nameUz ?? "—"}</Field>
                <Field label="Manzil">
                  {branch?.address ?? "—"}
                  {branch?.district?.nameUz ? `, ${branch.district.nameUz}` : ""}
                  {extraBranches > 0 ? ` (+${extraBranches} filial)` : ""}
                </Field>
                <Field label="Telefon">{branch?.phone ?? "—"}</Field>
                <Field label="Egasi">
                  {business.owner?.fullName ?? "—"}
                  {/* Contact details are only in the response for ADMIN+ (D-72). */}
                  {business.owner?.phone && <span className="block text-ink-muted">{business.owner.phone}</span>}
                  {business.owner?.email && <span className="block text-ink-muted">{business.owner.email}</span>}
                </Field>
                <Field label="Yetkazib berish">
                  {business.hasDelivery
                    ? [
                        "Bor",
                        business.deliveryFee != null ? `${business.deliveryFee} so'm` : null,
                        business.deliveryTime,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Yo'q"}
                </Field>
                {(business.website || business.email || business.telegram || business.instagram) && (
                  <Field label="Aloqa">
                    {[business.website, business.email, business.telegram, business.instagram]
                      .filter(Boolean)
                      .map((value) => (
                        <span key={value} className="block">
                          {value}
                        </span>
                      ))}
                  </Field>
                )}
              </dl>

              <Field label="Tavsif">
                <span className="whitespace-pre-line">{business.description?.trim() || "—"}</span>
              </Field>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-ink">Filiallar</h3>
                {detailState === "loading" && (
                  <p className="text-xs text-ink-muted">To'liq ma'lumot yuklanmoqda...</p>
                )}
                {detailState === "unavailable" && (
                  <p className="text-xs text-ink-muted">
                    Ish vaqti, galereya va qo'shimcha filiallarni hozircha yuklab bo'lmadi.
                  </p>
                )}
                {detailState === "loaded" &&
                  detail &&
                  (detail.branches.length > 0 ? (
                    detail.branches.map((b) => <BranchDetail key={b.id} branch={b} />)
                  ) : (
                    <p className="text-xs text-ink-muted">Filial kiritilmagan.</p>
                  ))}
              </div>
            </div>

            {isPending && (
              <div className="p-6 border-t border-white/[0.08]">
                {error && <p className="mb-3 text-sm text-danger">{error}</p>}

                {mode === "review" ? (
                  <div className="flex gap-2">
                    <Button
                      size="lg"
                      className="flex-1 bg-green-600 hover:bg-green-500"
                      disabled={pending}
                      onClick={onApprove}
                    >
                      <Check size={16} /> Tasdiqlash
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      disabled={pending}
                      onClick={() => onModeChange("reject")}
                    >
                      <X size={16} /> Rad etish
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleRejectSubmit} className="flex flex-col gap-3" noValidate>
                    <label htmlFor="business-rejection-reason" className="text-sm font-medium text-ink">
                      Rad etish sababi
                    </label>
                    {/* text-base: anything smaller makes iOS Safari zoom on focus. */}
                    <textarea
                      id="business-rejection-reason"
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (reasonError) setReasonError(null);
                      }}
                      maxLength={REJECTION_REASON_MAX_LENGTH}
                      rows={4}
                      autoFocus
                      placeholder="Egasi nimani tuzatishi kerak?"
                      aria-invalid={reasonError ? true : undefined}
                      aria-describedby="business-rejection-reason-hint"
                      className="w-full bg-elevated border border-white/[0.10] rounded-xl px-4 py-3 text-base text-ink placeholder:text-ink-muted outline-none focus:border-primary/50 resize-y"
                    />
                    <div id="business-rejection-reason-hint" className="flex justify-between gap-3 text-xs">
                      <span className="text-danger">{reasonError}</span>
                      <span className="text-ink-muted shrink-0">
                        {reason.trim().length}/{REJECTION_REASON_MAX_LENGTH}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1 bg-red-600 hover:bg-red-500"
                        disabled={pending}
                      >
                        Rad etishni tasdiqlash
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onModeChange("review")}
                      >
                        Orqaga
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
