import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import { localizedName } from "../../lib/localize";
import type { Category, Lang, MenuItem, ProductTypeValue } from "../../types";

const inputClasses =
  "h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

export interface ProductFormState {
  name: string;
  type: ProductTypeValue;
  /** Category id as a string because it comes from a <select>; "" means none. */
  categoryId: string;
  price: string;
  description: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  type: "PRODUCT",
  categoryId: "",
  price: "",
  description: "",
};

function productToForm(product: MenuItem): ProductFormState {
  return {
    name: product.name,
    type: product.type ?? "PRODUCT",
    categoryId: product.categoryId != null ? String(product.categoryId) : "",
    price: product.price != null ? String(Number(product.price)) : "",
    description: product.description ?? "",
  };
}

interface ProductModalProps {
  open: boolean;
  /** null means "add" mode; a MenuItem means "edit" mode. */
  product: MenuItem | null;
  /** Real categories from GET /categories — no hardcoded category list. */
  categories: Category[];
  lang: Lang;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (form: ProductFormState, photo: File | null) => void;
}

/**
 * Add/edit catalog item modal. Structurally the same hardened pattern as
 * AuthModal: flex-centred (not translate-based, so Framer's inline transform
 * can't fight Tailwind's), pointerEvents included in both animate/exit targets,
 * Escape and scrim click wired as plain handlers so they work regardless of
 * animation state.
 *
 * Fields map 1:1 onto what the catalog API accepts (name, type, categoryId,
 * price, description, photo). It deliberately has no SKU or stock-quantity
 * input: `Product` has no such columns, so those inputs could only ever have
 * been discarded on submit (see DECISIONS.md D-61).
 */
export default function ProductModal({
  open,
  product,
  categories,
  lang,
  saving,
  error,
  onClose,
  onSave,
}: ProductModalProps) {
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const modalTransition = useMotionTransition(TRANSITIONS.modalSpring);

  useEffect(() => {
    if (open) {
      setForm(product ? productToForm(product) : EMPTY_FORM);
      setPhoto(null);
    }
  }, [open, product]);

  // Blob URL, not the file itself — must be revoked when replaced/unmounted or
  // it leaks for the life of the tab.
  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.price.trim()) return;
    onSave(form, photo);
  }

  function update<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const existingImage = product?.imageUrl ?? null;

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
              aria-label={product ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
              className="w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto p-6 sm:rounded-2xl bg-card border-0 sm:border border-white/[0.08] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)] pointer-events-auto"
              initial={shouldAnimate ? { scale: 0.9, opacity: 0, y: 20 } : false}
              animate={{ scale: 1, opacity: 1, y: 0, pointerEvents: "auto" }}
              exit={{ scale: 0.95, opacity: 0, y: 10, pointerEvents: "none" }}
              transition={modalTransition}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">
                  {product ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
                </h2>
                <button onClick={onClose} aria-label="Yopish" className="text-ink-muted hover:text-ink">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
                <input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Nomi"
                  aria-label="Nomi"
                  className={inputClasses}
                  required
                />

                <div className="grid grid-cols-2 gap-2 bg-elevated rounded-xl p-1">
                  {(["PRODUCT", "SERVICE"] as ProductTypeValue[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update("type", value)}
                      className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                        form.type === value ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {value === "PRODUCT" ? "Mahsulot" : "Xizmat"}
                    </button>
                  ))}
                </div>

                <select
                  value={form.categoryId}
                  onChange={(e) => update("categoryId", e.target.value)}
                  aria-label="Turkum"
                  className={`${inputClasses} appearance-none`}
                >
                  <option value="">Turkumsiz</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {localizedName(category, lang)}
                    </option>
                  ))}
                </select>

                <input
                  value={form.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="Narxi (so'm)"
                  aria-label="Narxi (so'm)"
                  type="number"
                  min="0"
                  className={inputClasses}
                  required
                />

                <div className="flex items-center gap-3">
                  {(previewUrl || existingImage) && (
                    <img
                      src={previewUrl ?? existingImage ?? undefined}
                      alt=""
                      className="size-14 rounded-lg object-cover border border-white/[0.10] shrink-0"
                    />
                  )}
                  <label className="h-12 flex-1 border border-dashed border-white/[0.15] rounded-xl flex items-center justify-center gap-2 text-sm text-ink-muted hover:text-ink hover:border-white/[0.25] transition-colors cursor-pointer">
                    <ImagePlus size={16} />
                    {photo ? photo.name : "Rasm tanlash"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Tavsif"
                  aria-label="Tavsif"
                  rows={2}
                  className="bg-elevated border border-white/[0.10] rounded-xl px-4 py-3 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
                />

                {error && <p className="text-sm text-danger">{error}</p>}

                <div className="flex gap-2 mt-2">
                  <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={saving}>
                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                  <Button type="button" variant="ghost" size="lg" disabled={saving} onClick={onClose}>
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
