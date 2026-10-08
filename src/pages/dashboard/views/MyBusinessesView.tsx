import { Building2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import EditBusinessModal, {
  type EditableBusiness,
  type EditBusinessFormState,
} from "../../../components/business/EditBusinessModal";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAdminResource } from "../../../hooks/useAdminResource";
import {
  ApiError,
  getMyBusinessById,
  getMyBusinesses,
  resubmitMyBusiness,
  updateBusiness,
  updateBusinessHours,
  updateMyBranch,
} from "../../../lib/api";
import type { BusinessStatusValue, MyBusiness } from "../../../types";

const STATUS_LABEL: Record<BusinessStatusValue, string> = {
  DRAFT: "Qoralama",
  PENDING: "Kutilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
  SUSPENDED: "To'xtatilgan",
  HIDDEN: "Yashirilgan",
};

const STATUS_TONE: Record<BusinessStatusValue, "success" | "amber" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  PENDING: "amber",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
  HIDDEN: "neutral",
};

// Phase 16D: the owner sees why a listing was rejected or suspended. Only for
// those two statuses — hiding writes no reason, so on a HIDDEN listing the
// column can still hold an older, unrelated one.
function statusReason(business: MyBusiness): string | null {
  if (business.status !== "REJECTED" && business.status !== "SUSPENDED") return null;
  return business.rejectionReason?.trim() || null;
}

function toEditableBusiness(b: MyBusiness): EditableBusiness {
  const branch = b.branches[0];
  return {
    id: b.id,
    name: b.name,
    categoryId: b.category?.id ?? null,
    status: b.status,
    branchId: branch?.id ?? null,
    phone: branch?.phone ?? null,
    address: branch?.address ?? null,
    districtId: branch?.district?.id ?? null,
    coverPhoto: b.coverPhoto ?? null,
    hasDelivery: b.hasDelivery ?? null,
    deliveryFee: b.deliveryFee ?? null,
    deliveryTime: b.deliveryTime ?? null,
  };
}

interface MyBusinessesViewProps {
  /** Set when this tab was reached via DashboardHomeView's "Tahrirlash" shortcut, to open the modal immediately. */
  autoOpenBusinessId?: number;
}

export default function MyBusinessesView({ autoOpenBusinessId }: MyBusinessesViewProps) {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const fetcher = useCallback(() => getMyBusinesses(), []);
  const { data: businesses, state, status, reload } = useAdminResource(fetcher);
  const [resubmittingId, setResubmittingId] = useState<number | null>(null);

  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [editingBusiness, setEditingBusiness] = useState<EditableBusiness | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [autoOpenedId, setAutoOpenedId] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!autoOpenBusinessId || autoOpenBusinessId === autoOpenedId || !businesses) return;
    const match = businesses.find((b) => b.id === autoOpenBusinessId);
    if (match) {
      setAutoOpenedId(autoOpenBusinessId);
      void openEditModal(match);
    }
  }, [autoOpenBusinessId, businesses, autoOpenedId]);

  async function openEditModal(business: MyBusiness) {
    // The list response is a lean summary (no description, no branch
    // phone/address/district) — fetch the full detail so the form doesn't
    // open silently missing fields the business actually has.
    setEditingBusiness(toEditableBusiness(business));
    setEditError(null);
    setEditModalOpen(true);
    setEditLoading(true);
    try {
      const full = await getMyBusinessById(business.id);
      setEditingBusiness({ ...toEditableBusiness(full), description: full.description ?? null });
    } catch {
      // Keep the summary-derived data already shown rather than blocking
      // the form on a failed detail fetch.
    } finally {
      setEditLoading(false);
    }
  }

  async function handleSaveEdit(form: EditBusinessFormState, meta: { branchId: number | null }) {
    if (!editingBusiness) return;
    setEditSaving(true);
    setEditError(null);

    try {
      await updateBusiness(editingBusiness.id, {
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

      await updateBusinessHours(
        editingBusiness.id,
        form.hours.map((row) => ({
          dayOfWeek: row.dayOfWeek,
          openTime: row.isClosed ? undefined : row.openTime,
          closeTime: row.isClosed ? undefined : row.closeTime,
          isClosed: row.isClosed,
        })),
      );

      const branchId = meta.branchId ?? editingBusiness.branchId;
      if (branchId && (form.phone.trim() || form.address.trim() || form.districtId)) {
        await updateMyBranch(branchId, {
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

  // Phase 16I: REJECTED -> PENDING once the owner has fixed the listing. The
  // list is reloaded either way: on success it shows "Kutilmoqda", and on a
  // 409 (already moved — another tab, or staff) it shows the real status.
  async function handleResubmit(business: MyBusiness) {
    setResubmittingId(business.id);
    try {
      await resubmitMyBusiness(business.id);
      setToast({ tone: "success", text: t("myBusinesses.resubmitSuccess") });
    } catch (err) {
      const conflict = err instanceof ApiError && err.status === 409;
      setToast({ tone: "error", text: t(conflict ? "myBusinesses.resubmitConflict" : "myBusinesses.resubmitError") });
    } finally {
      setResubmittingId(null);
      reload();
    }
  }

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

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{state === "ok" ? `${businesses?.length ?? 0} ta biznes` : "Bizneslar"}</p>
        <Button variant="primary" size="sm" onClick={() => navigate(`/${lang}/dashboard/business/new`)}>
          <Plus size={16} />
          Yangi biznes qo'shish
        </Button>
      </div>

      {state === "loading" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      )}

      {(state === "forbidden" || state === "error") && (
        <EmptyState
          icon={Building2}
          title="Ma'lumotni yuklab bo'lmadi"
          body={status ? `So'rov bajarilmadi (${status}). Qayta urinib ko'ring.` : "So'rov bajarilmadi. Qayta urinib ko'ring."}
          actionLabel="Qayta urinish"
          onAction={reload}
        />
      )}

      {state === "ok" && businesses?.length === 0 && (
        <EmptyState
          icon={Building2}
          title="Hozircha biznesingiz yo'q"
          body="Birinchi biznesingizni qo'shib, uni platformada ko'rsating."
          actionLabel="Birinchi bo'lib qo'shing"
          onAction={() => navigate(`/${lang}/dashboard/business/new`)}
        />
      )}

      {state === "ok" && businesses && businesses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((business) => {
            const branch = business.branches[0];
            const reason = statusReason(business);
            return (
              <div key={business.id} className="bg-card border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="aspect-[16/10] w-full bg-gradient-to-br from-[#1F2C38] to-[#121A22]" />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink truncate">{business.name}</span>
                    <Badge tone={STATUS_TONE[business.status]}>{STATUS_LABEL[business.status]}</Badge>
                  </div>
                  <div className="text-xs text-ink-muted mt-1">
                    {business.category?.nameUz ?? "—"}
                    {branch?.district ? ` · ${branch.district.nameUz}` : ""}
                  </div>
                  {reason && (
                    <p className="text-xs text-danger mt-2 break-words">
                      <span className="font-medium">Sabab:</span> {reason}
                    </p>
                  )}
                  {business.status === "REJECTED" && (
                    <p className="text-xs text-ink-muted mt-2">{t("myBusinesses.resubmitHint")}</p>
                  )}
                  <Button variant="ghost" size="sm" className="w-full mt-3" onClick={() => openEditModal(business)}>
                    Tahrirlash
                  </Button>
                  {business.status === "REJECTED" && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full mt-2"
                      disabled={resubmittingId === business.id}
                      onClick={() => handleResubmit(business)}
                    >
                      {t("myBusinesses.resubmit")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditBusinessModal
        open={editModalOpen}
        businessId={editingBusiness?.id ?? null}
        initial={editingBusiness}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEdit}
        submitting={editSaving || editLoading}
        error={editError}
      />
    </div>
  );
}
