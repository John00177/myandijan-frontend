import { Package, Plus, ShoppingBag, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { useLanguage } from "../../../contexts/LanguageContext";
import {
  ApiError,
  createMenuItem,
  deleteMenuItem,
  getCategories,
  getMyBusinessMenu,
  getMyBusinesses,
  updateMenuItem,
  uploadImage,
} from "../../../lib/api";
import { localizedName } from "../../../lib/localize";
import type { Category, MenuItem, MyBusiness } from "../../../types";
import KpiCard from "../KpiCard";
import ProductModal, { type ProductFormState } from "../ProductModal";
import ProductRow from "../ProductRow";

const selectClasses =
  "h-10 bg-elevated border border-white/[0.10] rounded-lg px-3 text-sm text-ink outline-none focus:border-primary/50";

export default function InventoryView() {
  const { lang } = useLanguage();
  const [businesses, setBusinesses] = useState<MyBusiness[]>([]);
  const [businessesLoading, setBusinessesLoading] = useState(true);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getMyBusinesses()
      .then((rows) => {
        setBusinesses(rows);
        setBusinessId((current) => current ?? rows[0]?.id ?? null);
      })
      .catch(() => {
        // The catalog fetch below reports its own failure; this only decides
        // which business is preselected.
      })
      .finally(() => setBusinessesLoading(false));
  }, []);

  useEffect(() => {
    getCategories(lang)
      .then(setCategories)
      .catch(() => {
        // Only affects the category <select> — an item can be saved without one.
      });
  }, [lang]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  // `enabled` keeps this from firing a request before a business is picked —
  // the owner may still be loading, or may own nothing at all.
  const fetcher = useCallback(() => getMyBusinessMenu(businessId as number), [businessId]);
  const { data, state, status, reload } = useAdminResource(fetcher, businessId != null);
  const products = data ?? [];

  const activeCount = products.filter((p) => p.isActive !== false).length;
  const serviceCount = products.filter((p) => p.type === "SERVICE").length;

  function categoryNameFor(product: MenuItem): string | null {
    if (product.categoryId == null) return null;
    const match = categories.find((c) => c.id === product.categoryId);
    return match ? localizedName(match, lang) : null;
  }

  function openAddModal() {
    setEditingProduct(null);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEditModal(product: MenuItem) {
    setEditingProduct(product);
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave(form: ProductFormState, photo: File | null) {
    if (businessId == null) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Upload first, then save — the item can't reference a photo URL that
      // doesn't exist yet. Leaving the picker empty keeps the current image.
      const photoUrl = photo ? (await uploadImage(photo)).url : undefined;
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        description: form.description.trim() || undefined,
        type: form.type,
        categoryId: form.categoryId ? Number(form.categoryId) : undefined,
        ...(photoUrl ? { photo: photoUrl } : {}),
      };

      if (editingProduct) {
        await updateMenuItem(editingProduct.id, payload);
        setToast({ tone: "success", text: "Mahsulot yangilandi" });
      } else {
        await createMenuItem(businessId, payload);
        setToast({ tone: "success", text: "Mahsulot qo'shildi" });
      }

      setModalOpen(false);
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Saqlab bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(product: MenuItem) {
    const nextActive = product.isActive === false;
    setBusyId(product.id);
    try {
      await updateMenuItem(product.id, { isActive: nextActive });
      setToast({ tone: "success", text: nextActive ? "Mahsulot e'lon qilindi" : "Mahsulot yashirildi" });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete(id: number) {
    setBusyId(id);
    try {
      await deleteMenuItem(id);
      setConfirmingDeleteId(null);
      setToast({ tone: "success", text: "Mahsulot o'chirildi" });
      reload();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof ApiError ? err.message : "Xatolik yuz berdi" });
    } finally {
      setBusyId(null);
    }
  }

  if (businessesLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px]" />
        ))}
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Avval biznes qo'shing"
        body="Mahsulot va xizmatlar katalogi biznesga biriktiriladi."
      />
    );
  }

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

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          {businesses.length > 1 && (
            <select
              value={businessId ?? ""}
              onChange={(e) => setBusinessId(Number(e.target.value))}
              aria-label="Biznes"
              className={selectClasses}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-sm text-ink-muted">{state === "ok" ? `${products.length} ta mahsulot` : "Katalog"}</p>
        </div>
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus size={16} />
          Yangi mahsulot
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard icon={Package} label="Jami" value={state === "ok" ? products.length : "—"} trendTone="blue" />
        <KpiCard
          icon={ShoppingBag}
          label="E'lon qilingan"
          value={state === "ok" ? activeCount : "—"}
          trendTone="success"
        />
        <KpiCard icon={Wrench} label="Xizmatlar" value={state === "ok" ? serviceCount : "—"} trendTone="blue" />
      </div>

      {state === "loading" && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))}
        </div>
      )}

      {(state === "forbidden" || state === "error") && (
        <EmptyState
          icon={Package}
          title="Katalogni yuklab bo'lmadi"
          body={
            state === "forbidden"
              ? "Bu biznes katalogini boshqarishga ruxsatingiz yo'q."
              : status
                ? `So'rov bajarilmadi (${status}). Qayta urinib ko'ring.`
                : "So'rov bajarilmadi."
          }
          actionLabel="Qayta urinish"
          onAction={reload}
        />
      )}

      {state === "ok" && products.length === 0 && (
        <EmptyState
          icon={Package}
          title="Hozircha mahsulot yo'q"
          body="Qo'shgan mahsulot va xizmatlaringiz biznes sahifangizda ko'rinadi."
        />
      )}

      {state === "ok" && products.length > 0 && (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              categoryName={categoryNameFor(product)}
              confirmingDelete={confirmingDeleteId === product.id}
              busy={busyId === product.id}
              onEdit={() => openEditModal(product)}
              onToggleActive={() => handleToggleActive(product)}
              onRequestDelete={() => setConfirmingDeleteId(product.id)}
              onConfirmDelete={() => handleConfirmDelete(product.id)}
              onCancelDelete={() => setConfirmingDeleteId(null)}
            />
          ))}
        </div>
      )}

      <ProductModal
        open={modalOpen}
        product={editingProduct}
        categories={categories}
        lang={lang}
        saving={saving}
        error={saveError}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
