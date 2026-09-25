import { Check, Eye, Pencil, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { useCategories } from "../../../hooks/useCategories";
import { useLanguage } from "../../../contexts/LanguageContext";
import {
  ApiError,
  approveAdminBusiness,
  getAdminBusinesses,
  rejectAdminBusiness,
  updateAdminBusinessBranch,
  updateBusiness,
  updateBusinessHours,
} from "../../../lib/api";
import { localizedName } from "../../../lib/localize";
import type { AdminBusiness } from "../../../types";
import Button from "../../../components/ui/Button";
import EditBusinessModal, {
  type EditableBusiness,
  type EditBusinessFormState,
} from "../../../components/business/EditBusinessModal";
import Pagination from "../../search/Pagination";
import { renderAdminState } from "../AdminFetchState";
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

/** Business names arrive either as nameUz/Ru/En or a flat `name`, depending on serializer. */
function businessName(b: AdminBusiness): string {
  return b.nameUz ?? b.name ?? b.nameRu ?? b.nameEn ?? `#${b.id}`;
}

export default function AdminBusinessesView() {
  const { lang } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetcher = useCallback(() => getAdminBusinesses({ page, limit: PAGE_SIZE }), [page]);
  const { data, state, status, reload } = useAdminResource(fetcher);
  const { categories } = useCategories(lang);

  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [editingBusiness, setEditingBusiness] = useState<EditableBusiness | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleApprove(id: number): Promise<boolean> {
    setPendingActionId(id);
    try {
      await approveAdminBusiness(id);
      setToast({ tone: "success", text: "Biznes tasdiqlandi" });
      reload();
      return true;
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
      return false;
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleReject(id: number): Promise<boolean> {
    const reason = window.prompt("Rad etish sababi:");
    if (!reason || !reason.trim()) return false;

    setPendingActionId(id);
    try {
      await rejectAdminBusiness(id, reason.trim());
      setToast({ tone: "success", text: "Biznes rad etildi" });
      reload();
      return true;
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
      return false;
    } finally {
      setPendingActionId(null);
    }
  }

  function openEditModal(business: AdminBusiness) {
    setEditingBusiness(toEditableBusiness(business));
    setEditError(null);
    setEditModalOpen(true);
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

      // Branch fields (phone/address/district) are a separate resource on
      // the backend — only worth the extra call if there's a branch to
      // target and the form actually touched one of those fields.
      const branchId = meta.branchId ?? editingBusiness.branchId;
      if (branchId && (form.phone.trim() || form.address.trim() || form.districtId)) {
        await updateAdminBusinessBranch(editingBusiness.id, {
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
    const succeeded = action === "approve" ? await handleApprove(editingBusiness.id) : await handleReject(editingBusiness.id);
    if (succeeded) setEditModalOpen(false);
  }

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((b) => {
      if (search && !businessName(b).toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && (b.status ?? "").toLowerCase() !== statusFilter) return false;
      if (categoryFilter && b.category?.slug !== categoryFilter) return false;
      return true;
    });
  }, [data, search, statusFilter, categoryFilter]);

  const columns: Column<AdminBusiness>[] = [
    { key: "id", header: "ID", render: (b) => <span className="text-ink-muted">#{b.id}</span>, hideOnMobile: true },
    { key: "name", header: "Nomi", render: (b) => <span className="font-medium text-ink">{businessName(b)}</span> },
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
          {(b.status ?? "").toUpperCase() === "PENDING" && (
            <>
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
                onClick={() => handleReject(b.id)}
              >
                <X size={14} /> Rad etish
              </Button>
            </>
          )}
          <button
            aria-label="Ko'rish"
            className="size-8 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] flex items-center justify-center transition-colors"
          >
            <Eye size={16} />
          </button>
          <button
            aria-label="Tahrirlash"
            onClick={() => openEditModal(b)}
            className="size-8 rounded-lg text-ink-muted hover:text-ink hover:bg-white/[0.05] flex items-center justify-center transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            aria-label="O'chirish"
            className="size-8 rounded-lg text-ink-muted hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
          >
            <Trash2 size={16} />
          </button>
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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClasses}>
          <option value="">Barcha statuslar</option>
          <option value="approved">Tasdiqlangan</option>
          <option value="pending">Kutilmoqda</option>
          <option value="rejected">Rad etilgan</option>
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
            mobileHeader={(b) => <div className="font-semibold text-ink">{businessName(b)}</div>}
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
        canModerate
        onApprove={() => handleModerateFromModal("approve")}
        onReject={() => handleModerateFromModal("reject")}
        moderationPending={editingBusiness ? pendingActionId === editingBusiness.id : false}
      />
    </div>
  );
}
