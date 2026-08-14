import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import type { Category } from "../../types";

const inputClasses =
  "h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

export const PRESET_COLORS = [
  "#3B82F6",
  "#06B6D4",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#F97316",
];

export interface CategoryFormState {
  nameUz: string;
  nameRu: string;
  nameEn: string;
  slug: string;
  icon: string;
  colorHex: string;
}

const EMPTY_FORM: CategoryFormState = {
  nameUz: "",
  nameRu: "",
  nameEn: "",
  slug: "",
  icon: "",
  colorHex: PRESET_COLORS[0],
};

interface CategoryModalProps {
  open: boolean;
  /** null = create mode. */
  category: Category | null;
  onClose: () => void;
  onSave: (form: CategoryFormState) => void;
}

export default function CategoryModal({ open, category, onClose, onSave }: CategoryModalProps) {
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const modalTransition = useMotionTransition(TRANSITIONS.modalSpring);

  useEffect(() => {
    if (!open) return;
    setForm(
      category
        ? {
            nameUz: category.nameUz ?? "",
            nameRu: category.nameRu ?? "",
            nameEn: category.nameEn ?? "",
            slug: category.slug ?? "",
            icon: category.icon ?? "",
            colorHex: category.colorHex ?? PRESET_COLORS[0],
          }
        : EMPTY_FORM,
    );
  }, [open, category]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function update<K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nameUz.trim() || !form.slug.trim()) return;
    onSave(form);
  }

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
              aria-label={category ? "Turkumni tahrirlash" : "Yangi turkum"}
              className="w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto p-6 sm:rounded-2xl bg-card border-0 sm:border border-white/[0.08] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)] pointer-events-auto"
              initial={shouldAnimate ? { scale: 0.9, opacity: 0, y: 20 } : false}
              animate={{ scale: 1, opacity: 1, y: 0, pointerEvents: "auto" }}
              exit={{ scale: 0.95, opacity: 0, y: 10, pointerEvents: "none" }}
              transition={modalTransition}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">
                  {category ? "Turkumni tahrirlash" : "Yangi turkum"}
                </h2>
                <button onClick={onClose} aria-label="Yopish" className="text-ink-muted hover:text-ink">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
                <input
                  value={form.nameUz}
                  onChange={(e) => update("nameUz", e.target.value)}
                  placeholder="Nomi (UZ)"
                  className={inputClasses}
                  required
                />
                <input
                  value={form.nameRu}
                  onChange={(e) => update("nameRu", e.target.value)}
                  placeholder="Nomi (RU)"
                  className={inputClasses}
                />
                <input
                  value={form.nameEn}
                  onChange={(e) => update("nameEn", e.target.value)}
                  placeholder="Nomi (EN)"
                  className={inputClasses}
                />
                <input
                  value={form.slug}
                  onChange={(e) => update("slug", e.target.value)}
                  placeholder="slug"
                  className={inputClasses}
                  required
                />
                <input
                  value={form.icon}
                  onChange={(e) => update("icon", e.target.value)}
                  placeholder="Ikonka (masalan: utensils)"
                  className={inputClasses}
                />

                <div>
                  <div className="text-sm text-ink-muted mb-2">Rang</div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => update("colorHex", color)}
                        aria-label={`Rang ${color}`}
                        className="size-9 rounded-lg flex items-center justify-center border border-white/[0.15]"
                        style={{ backgroundColor: color }}
                      >
                        {form.colorHex === color && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button type="submit" variant="primary" size="lg" className="flex-1">
                    Saqlash
                  </Button>
                  <Button type="button" variant="ghost" size="lg" onClick={onClose}>
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
