import {
  ArchiveRestore,
  Ban,
  Check,
  ClipboardList,
  Eye,
  EyeOff,
  Megaphone,
  MegaphoneOff,
  Pencil,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { useCategories } from "../../../hooks/useCategories";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import {
  ApiError,
  approveAdminBusiness,
  getAdminBusinesses,
  hideAdminBusiness,
  promoteAdminBusiness,
  rejectAdminBusiness,
  suspendAdminBusiness,
  unhideAdminBusiness,
  unpromoteAdminBusiness,
  unsuspendAdminBusiness,
  unverifyAdminBusiness,
  updateAdminBusiness,
  updateAdminBusinessBranch,
  updateAdminBusinessHours,
  verifyAdminBusiness,
} from "../../../lib/api";
import { localizedName } from "../../../lib/localize";
import type { AdminBusiness } from "../../../types";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EditBusinessModal, {
  type EditableBusiness,
  type EditBusinessFormState,
} from "../../../components/business/EditBusinessModal";
import Pagination from "../../search/Pagination";
import { adminHoursPayload } from "../adminHoursPayload";
import { renderAdminState } from "../AdminFetchState";
import BusinessReviewDrawer, { type BusinessReviewMode } from "../BusinessReviewDrawer";
import DataTable, { type Column } from "../DataTable";
import { BusinessStatusBadge, formatDate } from "../statusLabels";

function toEditableBusiness(b: AdminBusiness): EditableBusiness {
  const branch = b.branches?.[0];
  return {
    id: b.id,
    name: b.nameUz ?? b.name ?? b.nameRu ?? b.nameEn ?? "",
    description: b.description,
    categoryId: b.category?.id ?? null,
    status: b.status,
    branchId: branch?.id ?? null,
    phone: branch?.phone ?? null,
    address: branch?.address ?? null,
    districtId: branch?.district?.id ?? b.district?.id ?? null,
    coverPhoto: b.coverPhoto ?? null,
    hasDelivery: b.hasDelivery ?? null,
    deliveryFee: b.deliveryFee ?? null,
    deliveryTime: b.deliveryTime ?? null,
  };
}

const PAGE_SIZE = 20;

const inputClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

const iconButtonClasses =
  "size-8 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] flex items-center justify-center transition-colors disabled:opacity-50";

/** Every BusinessStatus value — the filter is applied server-side via ?status=. */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "APPROVED", label: "Tasdiqlangan" },
  { value: "PENDING", label: "Kutilmoqda" },
  { value: "REJECTED", label: "Rad etilgan" },
  { value: "SUSPENDED", label: "To'xtatilgan" },
  { value: "HIDDEN", label: "Yashirilgan" },
  { value: "DRAFT", label: "Qoralama" },
];

/** Business names arrive either as nameUz/Ru/En or a flat `name`, depending on serializer. */
function businessName(b: AdminBusiness): string {
  return b.nameUz ?? b.name ?? b.nameRu ?? b.nameEn ?? `#${b.id}`;
}

function statusOf(b: AdminBusiness): string {
  return (b.status ?? "").toUpperCase();
}

/** YYYY-MM-DD, 30 days out — the prompt's suggested promotion end date. */
function defaultPromotionDate(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * What unhide will restore — mirrors the server rule (D-73): the recorded
 * pre-hide status, or PENDING (re-review) when none was recorded.
 */
function restoreTargetLabel(b: AdminBusiness): string {
  const recorded = (b.statusBeforeHide ?? "").toUpperCase();
  const option = STATUS_OPTIONS.find((o) => o.value === recorded && recorded !== "HIDDEN");
  return option ? option.label : "Kutilmoqda (qayta ko'rib chiqish)";
}

export default function AdminBusinessesView() {
  const { lang } = useLanguage();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Status is filtered server-side so e.g. every SUSPENDED business is
  // reachable, not just the ones that happen to be on the current page.
  const fetcher = useCallback(
    () => getAdminBusinesses({ page, limit: PAGE_SIZE, status: statusFilter || undefined }),
    [page, statusFilter],
  );
  const { data, state, status, reload } = useAdminResource(fetcher);
  const { categories } = useCategories(lang);

  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Phase 16E: the listing open in the review drawer, and whether the drawer
  // shows its decision buttons or the rejection-reason form.
  const [reviewing, setReviewing] = useState<AdminBusiness | null>(null);
  const [reviewMode, setReviewMode] = useState<BusinessReviewMode>("review");
  const [reviewError, setReviewError] = useState<string | null>(null);

  // The row the edit modal was opened from — its "Rad etish" hands that row
  // to the review drawer's reason form.
  const [editingSource, setEditingSource] = useState<AdminBusiness | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<EditableBusiness | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  /** Runs an approve/reject decision. Resolves to the refusal message, or null on success. */
  async function moderate(id: number, decision: () => Promise<unknown>, successText: string): Promise<string | null> {
    setPendingActionId(id);
    try {
      await decision();
      setToast({ tone: "success", text: successText });
      reload();
      return null;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Xatolik yuz berdi";
      setToast({ tone: "error", text: message });
      return message;
    } finally {
      setPendingActionId(null);
    }
  }

  function handleApprove(id: number) {
    return moderate(id, () => approveAdminBusiness(id), "Biznes tasdiqlandi");
  }

  // Phase 16E: rejecting used to be a bare window.prompt — no sight of what
  // was submitted, no length limit, and a blank answer silently did nothing.
  // Every reject path now goes through the review drawer's reason form, which
  // enforces the API's RejectBusinessDto (non-empty, ≤ 1000) before calling it.
  function openReview(business: AdminBusiness, mode: BusinessReviewMode = "review") {
    setReviewing(business);
    setReviewMode(mode);
    setReviewError(null);
  }

  const closeReview = useCallback(() => setReviewing(null), []);

  async function approveFromReview() {
    if (!reviewing) return;
    const error = await handleApprove(reviewing.id);
    if (error) setReviewError(error);
    else setReviewing(null);
  }

  async function rejectFromReview(reason: string) {
    if (!reviewing) return;
    const id = reviewing.id;
    const error = await moderate(id, () => rejectAdminBusiness(id, reason), "Biznes rad etildi");
    if (error) setReviewError(error);
    else setReviewing(null);
  }

  /** Shared runner for the business operations: busy state, toast, reload. */
  async function runOperation(id: number, operation: () => Promise<unknown>, successText: string) {
    setPendingActionId(id);
    try {
      await operation();
      setToast({ tone: "success", text: successText });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
    } finally {
      setPendingActionId(null);
    }
  }

  function handleVerify(b: AdminBusiness) {
    return runOperation(b.id, () => verifyAdminBusiness(b.id), "Biznes verifikatsiya qilindi");
  }

  function handleUnverify(b: AdminBusiness) {
    if (!window.confirm(`"${businessName(b)}" verifikatsiyasini bekor qilasizmi?`)) return;
    return runOperation(b.id, () => unverifyAdminBusiness(b.id), "Verifikatsiya bekor qilindi");
  }

  function handleSuspend(b: AdminBusiness) {
    const reason = window.prompt("To'xtatish sababi:");
    if (!reason || !reason.trim()) return;
    return runOperation(b.id, () => suspendAdminBusiness(b.id, reason.trim()), "Biznes to'xtatildi");
  }

  function handleUnsuspend(b: AdminBusiness) {
    if (!window.confirm(`"${businessName(b)}" qayta faollashtirilsinmi?`)) return;
    return runOperation(b.id, () => unsuspendAdminBusiness(b.id), "Biznes qayta faollashtirildi");
  }

  function handlePromote(b: AdminBusiness) {
    const input = window.prompt("Reklama tugash sanasi (YYYY-MM-DD):", defaultPromotionDate());
    if (!input || !input.trim()) return;
    // End of the chosen local day, so "until 2026-11-01" includes that day.
    const until = new Date(`${input.trim()}T23:59:59`);
    if (Number.isNaN(until.getTime())) {
      setToast({ tone: "error", text: "Sana noto'g'ri. Format: YYYY-MM-DD" });
      return;
    }
    return runOperation(b.id, () => promoteAdminBusiness(b.id, until.toISOString()), "Reklama yoqildi");
  }

  function handleUnpromote(b: AdminBusiness) {
    if (!window.confirm(`"${businessName(b)}" reklamasini to'xtatasizmi?`)) return;
    return runOperation(b.id, () => unpromoteAdminBusiness(b.id), "Reklama to'xtatildi");
  }

  function handleHide(b: AdminBusiness) {
    if (!window.confirm(`"${businessName(b)}" platformadan yashirilsinmi? Joriy holati saqlanadi.`)) return;
    return runOperation(b.id, () => hideAdminBusiness(b.id), "Biznes yashirildi");
  }

  function handleUnhide(b: AdminBusiness) {
    if (!window.confirm(`"${businessName(b)}" tiklansinmi? Holati: ${restoreTargetLabel(b)}.`)) return;
    return runOperation(b.id, () => unhideAdminBusiness(b.id), "Biznes tiklandi");
  }

  function openEditModal(business: AdminBusiness) {
    setEditingSource(business);
    setEditingBusiness(toEditableBusiness(business));
    setEditError(null);
    setEditModalOpen(true);
  }

  async function handleSaveEdit(form: EditBusinessFormState, meta: { branchId: number | null; hoursLoaded: boolean }) {
    if (!editingBusiness) return;
    // Staff editing someone else's business goes through the audited /admin
    // routes, which require a reason (Phase 15B, D-74) — asked once, recorded
    // on every resulting audit entry.
    const input = window.prompt("Tahrirlash sababi:");
    if (!input || !input.trim()) return;
    const reason = input.trim();

    setEditSaving(true);
    setEditError(null);

    try {
      await updateAdminBusiness(editingBusiness.id, {
        reason,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        coverPhoto: form.coverPhoto.trim() || undefined,
        hasDelivery: form.hasDelivery,
        deliveryFee: form.hasDelivery && form.deliveryFee ? Number(form.deliveryFee) : undefined,
        deliveryTime: form.hasDelivery ? form.deliveryTime.trim() || undefined : undefined,
        instagram: form.instagram.trim() || undefined,
        telegram: form.telegram.trim() || undefined,
        website: form.website.trim() || undefined,
      });

      // The hours PUT replaces every stored row, so it is only sent when the
      // real hours were loaded AND the admin changed them — never the
      // placeholder grid of a non-APPROVED business (see adminHoursPayload).
      const hours = adminHoursPayload(form.hours, meta.hoursLoaded);
      if (hours) {
        await updateAdminBusinessHours(editingBusiness.id, { reason, hours });
      }

      // Branch fields (phone/address/district) are a separate resource on
      // the backend — only worth the extra call if there's a branch to
      // target and the form actually touched one of those fields.
      const branchId = meta.branchId ?? editingBusiness.branchId;
      if (branchId && (form.phone.trim() || form.address.trim() || form.districtId)) {
        await updateAdminBusinessBranch(editingBusiness.id, {
          reason,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          districtId: form.districtId ? Number(form.districtId) : undefined,
        });
      }

      setToast({ tone: "success", text: "Biznes yangilandi" });
      setEditModalOpen(false);
      reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Biznesni tahrirlashda xatolik";
      setEditError(message);
      setToast({ tone: "error", text: "Biznesni tahrirlashda xatolik" });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleModerateFromModal(action: "approve" | "reject") {
    if (!editingBusiness) return;
    if (action === "reject") {
      if (!editingSource) return;
      setEditModalOpen(false);
      openReview(editingSource, "reject");
      return;
    }
    const error = await handleApprove(editingBusiness.id);
    if (!error) setEditModalOpen(false);
  }

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((b) => {
      if (search && !businessName(b).toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter && b.category?.slug !== categoryFilter) return false;
      return true;
    });
  }, [data, search, categoryFilter]);

  const columns: Column<AdminBusiness>[] = [
    { key: "id", header: "ID", render: (b) => <span className="text-ink-muted">#{b.id}</span>, hideOnMobile: true },
    {
      key: "name",
      header: "Nomi",
      render: (b) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-ink">{businessName(b)}</span>
          {(b.isVerified || b.isPromoted) && (
            <div className="flex flex-wrap gap-1">
              {b.isVerified && <Badge tone="success">Verifikatsiyalangan</Badge>}
              {b.isPromoted && (
                <Badge tone="amber">
                  Reklama{b.promotedUntil ? ` · ${formatDate(b.promotedUntil)} gacha` : ""}
                </Badge>
              )}
            </div>
          )}
          {statusOf(b) === "SUSPENDED" && b.rejectionReason && (
            <span className="text-xs text-ink-muted">Sabab: {b.rejectionReason}</span>
          )}
          {statusOf(b) === "HIDDEN" && (
            <span className="text-xs text-ink-muted">Tiklanganda: {restoreTargetLabel(b)}</span>
          )}
        </div>
      ),
    },
    { key: "owner", header: "Egasi", render: (b) => b.owner?.fullName ?? b.owner?.phone ?? "—" },
    { key: "category", header: "Turkum", render: (b) => b.category?.nameUz ?? "—" },
    { key: "district", header: "Tuman", render: (b) => b.branches?.[0]?.district?.nameUz ?? b.district?.nameUz ?? "—" },
    { key: "status", header: "Status", render: (b) => <BusinessStatusBadge status={b.status} /> },
    { key: "date", header: "Sana", render: (b) => formatDate(b.createdAt) },
    {
      key: "actions",
      header: "Harakatlar",
      hideOnMobile: true,
      render: (b) => (
        <div className="flex items-center gap-1">
          {statusOf(b) === "PENDING" && (
            <>
              <button
                aria-label="Ko'rib chiqish"
                title="Ko'rib chiqish"
                onClick={() => openReview(b)}
                className={iconButtonClasses}
              >
                <ClipboardList size={16} />
              </button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-500"
                disabled={pendingActionId === b.id}
                onClick={() => handleApprove(b.id)}
              >
                <Check size={14} /> Tasdiqlash
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                disabled={pendingActionId === b.id}
                onClick={() => openReview(b, "reject")}
              >
                <X size={14} /> Rad etish
              </Button>
            </>
          )}

          {/* Verify / suspend / promote need `business.operate` (ADMIN,
              SUPER_ADMIN); a MODERATOR only gets approve/reject above (D-75). */}
          {can("business.operate") && (
            <>
          {/* Verification: grant on live listings; revoke whenever set. */}
          {b.isVerified ? (
            <button
              aria-label="Verifikatsiyani bekor qilish"
              title="Verifikatsiyani bekor qilish"
              disabled={pendingActionId === b.id}
              onClick={() => handleUnverify(b)}
              className={iconButtonClasses}
            >
              <ShieldOff size={16} />
            </button>
          ) : (
            statusOf(b) === "APPROVED" && (
              <button
                aria-label="Verifikatsiya qilish"
                title="Verifikatsiya qilish"
                disabled={pendingActionId === b.id}
                onClick={() => handleVerify(b)}
                className={iconButtonClasses}
              >
                <ShieldCheck size={16} />
              </button>
            )
          )}

          {/* Suspension: only live listings can be suspended (backend 409s otherwise). */}
          {statusOf(b) === "APPROVED" && (
            <button
              aria-label="To'xtatish"
              title="To'xtatish"
              disabled={pendingActionId === b.id}
              onClick={() => handleSuspend(b)}
              className={`${iconButtonClasses} hover:!text-danger`}
            >
              <Ban size={16} />
            </button>
          )}
          {statusOf(b) === "SUSPENDED" && (
            <button
              aria-label="Qayta faollashtirish"
              title="Qayta faollashtirish"
              disabled={pendingActionId === b.id}
              onClick={() => handleUnsuspend(b)}
              className={iconButtonClasses}
            >
              <RotateCcw size={16} />
            </button>
          )}

          {/* Promotion: start on live listings; end whenever set. */}
          {b.isPromoted ? (
            <button
              aria-label="Reklamani to'xtatish"
              title="Reklamani to'xtatish"
              disabled={pendingActionId === b.id}
              onClick={() => handleUnpromote(b)}
              className={iconButtonClasses}
            >
              <MegaphoneOff size={16} />
            </button>
          ) : (
            statusOf(b) === "APPROVED" && (
              <button
                aria-label="Reklamaga qo'yish"
                title="Reklamaga qo'yish"
                disabled={pendingActionId === b.id}
                onClick={() => handlePromote(b)}
                className={iconButtonClasses}
              >
                <Megaphone size={16} />
              </button>
            )
          )}
            </>
          )}

          {/* Hide / restore: `business.hide` (SUPER_ADMIN only, D-73/D-75).
              Restore returns the listing to the status recorded at hide time,
              or PENDING. */}
          {can("business.hide") &&
            (statusOf(b) === "HIDDEN" ? (
              <button
                aria-label="Yashirishni bekor qilish"
                title="Yashirishni bekor qilish"
                disabled={pendingActionId === b.id}
                onClick={() => handleUnhide(b)}
                className={iconButtonClasses}
              >
                <ArchiveRestore size={16} />
              </button>
            ) : (
              <button
                aria-label="Yashirish"
                title="Yashirish"
                disabled={pendingActionId === b.id}
                onClick={() => handleHide(b)}
                className={`${iconButtonClasses} hover:!text-danger`}
              >
                <EyeOff size={16} />
              </button>
            ))}

          {/* Public page — only an APPROVED listing has one (others 404). */}
          {statusOf(b) === "APPROVED" && b.slug && (
            <a
              href={`/${lang}/business/${b.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ko'rish"
              title="Ko'rish"
              className={iconButtonClasses}
            >
              <Eye size={16} />
            </a>
          )}
          {can("business.edit_any") && (
            <button aria-label="Tahrirlash" title="Tahrirlash" onClick={() => openEditModal(b)} className={iconButtonClasses}>
              <Pencil size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const stateEl = renderAdminState(state, status);

  return (
    <div>
      {toast && (
        <div
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
            toast.tone === "success"
              ? "bg-success/10 border-success/20 text-success"
              : "bg-danger/10 border-danger/20 text-danger"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nomi bo'yicha qidirish..."
          className={`${inputClasses} flex-1`}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Status"
          className={inputClasses}
        >
          <option value="">Barcha statuslar</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClasses}>
          <option value="">Barcha turkumlar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {localizedName(c, lang)}
            </option>
          ))}
        </select>
      </div>

      {stateEl ?? (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            keyOf={(b) => b.id}
            loading={state === "loading"}
            emptyTitle="Bizneslar topilmadi"
            emptyBody="Filtrlarni o'zgartirib ko'ring."
            mobileHeader={(b) => (
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-ink min-w-0 break-words">{businessName(b)}</div>
                {/* The actions column is desktop-only; on a phone the drawer
                    is the way to review, approve or reject a pending listing. */}
                {statusOf(b) === "PENDING" && (
                  <Button size="sm" variant="ghost" className="shrink-0" onClick={() => openReview(b)}>
                    <ClipboardList size={14} /> Ko'rib chiqish
                  </Button>
                )}
              </div>
            )}
          />
          {data?.total != null && (
            <Pagination
              page={page}
              totalPages={Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <EditBusinessModal
        open={editModalOpen}
        businessId={editingBusiness?.id ?? null}
        initial={editingBusiness}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEdit}
        submitting={editSaving}
        error={editError}
        preserveUnchangedHours
        canModerate={can("business.review")}
        onApprove={() => handleModerateFromModal("approve")}
        onReject={() => handleModerateFromModal("reject")}
        moderationPending={editingBusiness ? pendingActionId === editingBusiness.id : false}
      />

      <BusinessReviewDrawer
        business={reviewing}
        mode={reviewMode}
        onModeChange={(mode) => {
          setReviewMode(mode);
          setReviewError(null);
        }}
        onClose={closeReview}
        onApprove={approveFromReview}
        onReject={rejectFromReview}
        pending={reviewing ? pendingActionId === reviewing.id : false}
        error={reviewError}
      />
    </div>
  );
}
