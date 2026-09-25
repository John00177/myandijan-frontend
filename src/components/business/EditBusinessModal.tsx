import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, ImageOff, Truck, Upload, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCategories } from "../../hooks/useCategories";
import { useRegions } from "../../hooks/useRegions";
import { ApiError, getBusinessById, uploadImage } from "../../lib/api";
import { localizedName } from "../../lib/localize";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import type { MyBranchHour } from "../../types";

const inputClasses =
  "h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

// Real BusinessStatus values are DRAFT/PENDING/APPROVED/REJECTED/SUSPENDED/
// HIDDEN (see schema.prisma). "Faol" here reads from APPROVED, since that's
// the live-and-visible state — there is no "ACTIVE" status on this platform.
const STATUS_LABEL: Record<string, { label: string; tone: "success" | "amber" | "danger" | "neutral" }> = {
  DRAFT: { label: "Qoralama", tone: "neutral" },
  PENDING: { label: "Kutilmoqda", tone: "amber" },
  APPROVED: { label: "Faol", tone: "success" },
  REJECTED: { label: "Rad etilgan", tone: "danger" },
  SUSPENDED: { label: "To'xtatilgan", tone: "danger" },
  HIDDEN: { label: "Yashirilgan", tone: "neutral" },
};

const DAY_LABELS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

/** Minimal shape both the owner and admin business types can be adapted to. */
export interface EditableBusiness {
  id: number;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  status?: string | null;
  branchId?: number | null;
  phone?: string | null;
  address?: string | null;
  districtId?: number | null;
  coverPhoto?: string | null;
  hasDelivery?: boolean | null;
  deliveryFee?: number | null;
  deliveryTime?: string | null;
  instagram?: string | null;
  telegram?: string | null;
  website?: string | null;
}

export interface HourFormRow {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface EditBusinessFormState {
  name: string;
  description: string;
  categoryId: string;
  phone: string;
  address: string;
  districtId: string;
  coverPhoto: string;
  hasDelivery: boolean;
  deliveryFee: string;
  deliveryTime: string;
  instagram: string;
  telegram: string;
  website: string;
  hours: HourFormRow[];
}

function defaultHours(): HourFormRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    openTime: "09:00",
    closeTime: "18:00",
    isClosed: false,
  }));
}

function hoursToGrid(hours: MyBranchHour[] | undefined): HourFormRow[] {
  const grid = defaultHours();
  if (!hours) return grid;
  for (const hour of hours) {
    const row = grid[hour.dayOfWeek];
    if (!row) continue;
    row.openTime = hour.openTime ?? row.openTime;
    row.closeTime = hour.closeTime ?? row.closeTime;
    row.isClosed = hour.isClosed;
  }
  return grid;
}

function toEmptyForm(business: EditableBusiness | null): EditBusinessFormState {
  return {
    name: business?.name ?? "",
    description: business?.description ?? "",
    categoryId: business?.categoryId != null ? String(business.categoryId) : "",
    phone: business?.phone ?? "",
    address: business?.address ?? "",
    districtId: business?.districtId != null ? String(business.districtId) : "",
    coverPhoto: business?.coverPhoto ?? "",
    hasDelivery: business?.hasDelivery ?? false,
    deliveryFee: business?.deliveryFee != null ? String(business.deliveryFee) : "",
    deliveryTime: business?.deliveryTime ?? "",
    instagram: business?.instagram ?? "",
    telegram: business?.telegram ?? "",
    website: business?.website ?? "",
    hours: defaultHours(),
  };
}

/**
 * Live preview for the cover photo URL field — re-checks `errored` whenever
 * the URL itself changes (a fixed typo shouldn't stay stuck on the broken
 * placeholder from the previous attempt).
 */
function CoverPhotoPreview({ url }: { url: string }) {
  const trimmed = url.trim();
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [trimmed]);

  if (!trimmed) {
    return (
      <div className="w-full h-48 rounded-lg border border-dashed border-white/[0.15] flex flex-col items-center justify-center gap-1.5 text-ink-muted">
        <ImageOff size={22} />
        <span className="text-xs">Rasm URL ni kiriting</span>
      </div>
    );
  }

  if (errored) {
    return (
      <div className="w-full h-48 rounded-lg border border-dashed border-danger/30 bg-danger/5 flex flex-col items-center justify-center gap-1.5 text-danger">
        <ImageOff size={22} />
        <span className="text-xs">Rasm yuklanmadi — havolani tekshiring</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <img
        src={trimmed}
        alt="Muqova rasmi ko'rinishi"
        className="w-full h-48 object-cover rounded-lg"
        onError={() => setErrored(true)}
      />
      <a
        href={trimmed}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start flex items-center gap-1 text-xs text-primary hover:text-blue-300"
      >
        <ExternalLink size={12} /> Rasmni ko'rish
      </a>
    </div>
  );
}

/**
 * File upload for the cover photo, converging on the same `coverPhoto`
 * string field the URL input writes to — this is the real fix for owners
 * having no way to set a cover photo at all: the field previously only
 * accepted a URL they'd have to already have hosted somewhere themselves.
 */
function CoverPhotoUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadImage(file);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rasm yuklashda xatolik");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="h-11 px-3 flex items-center justify-center gap-2 bg-elevated border border-dashed border-white/[0.15] rounded-xl text-sm text-ink-muted cursor-pointer hover:border-primary/50">
        <Upload size={14} />
        {uploading ? "Yuklanmoqda..." : "Kompyuterdan rasm tanlash"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface EditBusinessModalProps {
  open: boolean;
  /** businessId drives the modal's own GET /businesses/:id fetch. */
  businessId: number | null;
  /**
   * Best-effort data the caller already has (from /me/businesses or
   * /admin/businesses), shown immediately and kept as a fallback for
   * DRAFT/PENDING businesses — GET /businesses/:id only returns APPROVED
   * ones, so it 404s for those and the form falls back to this instead.
   */
  initial: EditableBusiness | null;
  onClose: () => void;
  onSave: (form: EditBusinessFormState, meta: { branchId: number | null }) => void;
  submitting?: boolean;
  error?: string | null;
  /**
   * Status is shown as a read-only badge everywhere. When true (admin
   * context, business currently PENDING), Approve/Reject actions appear
   * inline — NOT as a free-form status dropdown. The backend has no
   * "set status to X" endpoint; approve/reject/suspend/hide are each
   * dedicated actions with their own audit trail and side effects (owner
   * role promotion, notifications), and only approve/reject are reachable
   * from PENDING. A dropdown implying arbitrary transitions would either
   * lie about what's possible or silently no-op on disallowed choices.
   */
  canModerate?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  moderationPending?: boolean;
}

export default function EditBusinessModal({
  open,
  businessId,
  initial,
  onClose,
  onSave,
  submitting = false,
  error = null,
  canModerate = false,
  onApprove,
  onReject,
  moderationPending = false,
}: EditBusinessModalProps) {
  const { lang } = useLanguage();
  const { categories } = useCategories(lang);
  const { regions } = useRegions(lang);
  const districts = regions[0]?.districts ?? [];
  const [form, setForm] = useState<EditBusinessFormState>(() => toEmptyForm(null));
  const [branchId, setBranchId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const modalTransition = useMotionTransition(TRANSITIONS.modalSpring);

  useEffect(() => {
    if (!open) return;
    setForm(toEmptyForm(initial));
    setBranchId(initial?.branchId ?? null);
    setStatus(initial?.status ?? null);
  }, [open, initial]);

  useEffect(() => {
    if (!open || businessId == null) return;
    let cancelled = false;
    setFetching(true);

    getBusinessById(businessId)
      .then((detail) => {
        if (cancelled) return;
        const branch = detail.branches?.[0] ?? null;
        setForm({
          name: detail.name ?? "",
          description: detail.description ?? "",
          categoryId: detail.category?.id != null ? String(detail.category.id) : "",
          phone: branch?.phone ?? "",
          address: branch?.address ?? "",
          districtId: branch?.district?.id != null ? String(branch.district.id) : "",
          coverPhoto: detail.coverPhoto ?? "",
          hasDelivery: detail.hasDelivery ?? false,
          deliveryFee: detail.deliveryFee != null ? String(detail.deliveryFee) : "",
          deliveryTime: detail.deliveryTime ?? "",
          instagram: detail.instagram ?? "",
          telegram: detail.telegram ?? "",
          website: detail.website ?? "",
          hours: hoursToGrid(branch?.hours),
        });
        if (branch?.id != null) setBranchId(branch.id);
        if (detail.status != null) setStatus(detail.status);
      })
      .catch(() => {
        // Most commonly a 404 — this endpoint only serves APPROVED
        // businesses — but any failure here just means the form stays on
        // the `initial` data already set above, rather than blocking.
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, businessId]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function update<K extends keyof EditBusinessFormState>(key: K, value: EditBusinessFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateHourRow(dayOfWeek: number, patch: Partial<HourFormRow>) {
    setForm((prev) => ({
      ...prev,
      hours: prev.hours.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)),
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form, { branchId });
  }

  const statusInfo = status ? STATUS_LABEL[status] : null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black backdrop-blur-sm"
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 0.6, pointerEvents: "auto" }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={backdropTransition}
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 pointer-events-none">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Biznesni tahrirlash"
              className="w-full h-full sm:h-auto sm:max-w-lg sm:max-h-[90vh] overflow-y-auto p-6 sm:rounded-2xl bg-card border-0 sm:border border-white/[0.08] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)] pointer-events-auto"
              initial={shouldAnimate ? { scale: 0.9, opacity: 0, y: 20 } : false}
              animate={{ scale: 1, opacity: 1, y: 0, pointerEvents: "auto" }}
              exit={{ scale: 0.95, opacity: 0, y: 10, pointerEvents: "none" }}
              transition={modalTransition}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Biznesni tahrirlash</h2>
                <button onClick={onClose} aria-label="Yopish" className="text-ink-muted hover:text-ink">
                  <X size={20} />
                </button>
              </div>

              {statusInfo && (
                <div className="flex items-center justify-between mt-4 p-3 bg-white/[0.03] rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink-muted">Status:</span>
                    <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
                  </div>
                  {canModerate && status === "PENDING" && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-green-600 hover:bg-green-500"
                        disabled={moderationPending}
                        onClick={onApprove}
                      >
                        <Check size={14} /> Tasdiqlash
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        disabled={moderationPending}
                        onClick={onReject}
                      >
                        <X size={14} /> Rad etish
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Biznes nomi"
                  className={inputClasses}
                  required
                />
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Tavsif"
                  rows={3}
                  className={`${inputClasses} h-auto py-3 resize-none`}
                />
                <select
                  value={form.categoryId}
                  onChange={(e) => update("categoryId", e.target.value)}
                  className={`${inputClasses} appearance-none`}
                >
                  <option value="">Turkum tanlanmagan</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {localizedName(c, lang)}
                    </option>
                  ))}
                </select>
                <input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="Telefon"
                  type="tel"
                  className={inputClasses}
                />
                <select
                  value={form.districtId}
                  onChange={(e) => update("districtId", e.target.value)}
                  className={`${inputClasses} appearance-none`}
                >
                  <option value="">Tuman tanlanmagan</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {localizedName(d, lang)}
                    </option>
                  ))}
                </select>
                <input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Manzil"
                  className={inputClasses}
                />
                <div className="flex flex-col gap-2">
                  <CoverPhotoUploader onUploaded={(url) => update("coverPhoto", url)} />
                  <input
                    value={form.coverPhoto}
                    onChange={(e) => update("coverPhoto", e.target.value)}
                    placeholder="yoki Muqova rasmi URL manzilini kiriting"
                    className={inputClasses}
                  />
                  <CoverPhotoPreview url={form.coverPhoto} />
                </div>

                <input
                  value={form.instagram}
                  onChange={(e) => update("instagram", e.target.value)}
                  placeholder="Instagram (@username yoki havola)"
                  className={inputClasses}
                />
                <input
                  value={form.telegram}
                  onChange={(e) => update("telegram", e.target.value)}
                  placeholder="Telegram (@username yoki havola)"
                  className={inputClasses}
                />
                <input
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="Vebsayt"
                  className={inputClasses}
                />

                <div className="rounded-xl border border-white/[0.08] p-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="flex items-center gap-2 text-sm font-medium text-ink">
                      <Truck size={16} /> Yetkazib berish xizmati
                    </span>
                    <input
                      type="checkbox"
                      checked={form.hasDelivery}
                      onChange={(e) => update("hasDelivery", e.target.checked)}
                      className="size-5 accent-primary"
                    />
                  </label>
                  {form.hasDelivery && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <input
                        value={form.deliveryFee}
                        onChange={(e) => update("deliveryFee", e.target.value)}
                        placeholder="Narxi (so'm)"
                        type="number"
                        min="0"
                        className={`${inputClasses} h-10`}
                      />
                      <input
                        value={form.deliveryTime}
                        onChange={(e) => update("deliveryTime", e.target.value)}
                        placeholder="Vaqti (masalan, 30-45 daq)"
                        className={`${inputClasses} h-10`}
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/[0.08] p-3">
                  <p className="text-sm font-medium text-ink mb-2">Ish vaqti</p>
                  <div className="flex flex-col gap-2">
                    {form.hours.map((row) => (
                      <div key={row.dayOfWeek} className="flex items-center gap-2">
                        <span className="text-xs text-ink-muted w-20 shrink-0">{DAY_LABELS[row.dayOfWeek]}</span>
                        {row.isClosed ? (
                          <span className="flex-1 text-xs text-ink-muted">Dam olish kuni</span>
                        ) : (
                          <>
                            <input
                              type="time"
                              value={row.openTime}
                              onChange={(e) => updateHourRow(row.dayOfWeek, { openTime: e.target.value })}
                              className={`${inputClasses} h-9 px-2 flex-1`}
                            />
                            <span className="text-ink-muted text-xs">—</span>
                            <input
                              type="time"
                              value={row.closeTime}
                              onChange={(e) => updateHourRow(row.dayOfWeek, { closeTime: e.target.value })}
                              className={`${inputClasses} h-9 px-2 flex-1`}
                            />
                          </>
                        )}
                        <label className="flex items-center gap-1 text-xs text-ink-muted cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={row.isClosed}
                            onChange={(e) => updateHourRow(row.dayOfWeek, { isClosed: e.target.checked })}
                            className="size-4 accent-primary"
                          />
                          Yopiq
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <div className="flex gap-2 mt-2">
                  <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={submitting || fetching}>
                    {submitting ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                  <Button type="button" variant="ghost" size="lg" onClick={onClose} disabled={submitting}>
                    Bekor qilish
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
