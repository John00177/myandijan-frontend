import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getAdminCategories } from "../../../lib/api";
import { categoryColor, categoryIcon, hexToRgba } from "../../../lib/categoryVisuals";
import { localizedName } from "../../../lib/localize";
import type { Category } from "../../../types";
import { renderAdminState } from "../AdminFetchState";
import CategoryModal, { type CategoryFormState } from "../CategoryModal";

export default function AdminCategoriesView() {
  const { lang } = useLanguage();
  const fetcher = useCallback(() => getAdminCategories(), []);
  const { data, state, status } = useAdminResource(fetcher);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  // No POST/PUT /admin/categories was verified as reachable, so saving only
  // closes the modal. Wire to the real mutation once it is available.
  function handleSave(_form: CategoryFormState) {
    setModalOpen(false);
  }

  const stateEl = renderAdminState(state, status);
  const categories = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{state === "ok" ? `${categories.length} ta turkum` : "Turkumlar"}</p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditing(null);
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
      />
    </div>
  );
}
