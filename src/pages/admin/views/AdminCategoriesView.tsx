import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast as sonnerToast } from "sonner";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { ApiError, createAdminCategory, getAdminCategories, updateAdminCategory } from "../../../lib/api";
import { categoryColor, categoryIcon, hexToRgba } from "../../../lib/categoryVisuals";
import { localizedName } from "../../../lib/localize";
import type { Category } from "../../../types";
import { renderAdminState } from "../AdminFetchState";
import CategoryModal, { type CategoryFormState } from "../CategoryModal";

export default function AdminCategoriesView() {
  const { lang } = useLanguage();
  const fetcher = useCallback(() => getAdminCategories(), []);
  const { data, state, status, reload } = useAdminResource(fetcher);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  async function handleSave(form: CategoryFormState) {
    setSaving(true);
    setSaveError(null);

    const payload = {
      nameUz: form.nameUz,
      nameRu: form.nameRu,
      nameEn: form.nameEn,
      slug: form.slug,
      icon: form.icon || undefined,
      colorHex: form.colorHex,
    };

    try {
      if (editing) {
        await updateAdminCategory(editing.id, payload);
        setToast("Turkum yangilandi");
        sonnerToast.success("Turkum yangilandi");
      } else {
        await createAdminCategory(payload);
        setToast("Turkum qo'shildi");
        sonnerToast.success("Turkum qo'shildi");
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Saqlashda xatolik yuz berdi";
      setSaveError(message);
      sonnerToast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const stateEl = renderAdminState(state, status);
  const categories = data?.items ?? [];

  return (
    <div>
      {toast && (
        <div className="mb-4 rounded-lg bg-success/10 border border-success/20 text-success px-4 py-2.5 text-sm">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{state === "ok" ? `${categories.length} ta turkum` : "Turkumlar"}</p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditing(null);
            setSaveError(null);
            setModalOpen(true);
          }}
        >
          <Plus size={16} />
          Yangi turkum
        </Button>
      </div>

      {stateEl ??
        (state === "loading" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category, i) => {
              const Icon = categoryIcon(category.icon);
              const color = categoryColor(category.colorHex, i);
              return (
                <div key={category.id} className="bg-card border border-white/[0.08] rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: hexToRgba(color, 0.15), color }}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-ink truncate">{localizedName(category, lang)}</div>
                      <div className="text-xs text-ink-muted truncate">/{category.slug}</div>
                    </div>
                    <span
                      className="size-3 rounded-full ml-auto shrink-0 border border-white/[0.15]"
                      style={{ backgroundColor: color }}
                    />
                  </div>

                  <div className="text-xs text-ink-muted mt-3">
                    {category.businessCount != null ? `${category.businessCount} ta biznes` : "Biznes soni: —"}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(category);
                        setSaveError(null);
                        setModalOpen(true);
                      }}
                    >
                      Tahrirlash
                    </Button>
                    <Button variant="ghost" size="sm" className="!text-danger hover:!bg-danger/10">
                      O'chirish
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      <CategoryModal
        open={modalOpen}
        category={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        submitting={saving}
        error={saveError}
      />
    </div>
  );
}
