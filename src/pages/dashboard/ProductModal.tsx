import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import { PRODUCT_CATEGORIES, type Product } from "./mockData";

const inputClasses =
  "h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

interface ProductFormState {
  name: string;
  sku: string;
  category: string;
  price: string;
  quantity: string;
  description: string;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  sku: "",
  category: PRODUCT_CATEGORIES[0],
  price: "",
  quantity: "",
  description: "",
};

function productToForm(product: Product): ProductFormState {
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: String(product.price),
    quantity: String(product.quantity),
    description: product.description,
  };
}

interface ProductModalProps {
  open: boolean;
  /** null means "add" mode; a Product means "edit" mode. */
  product: Product | null;
  onClose: () => void;
  onSave: (form: ProductFormState) => void;
}

/**
 * Add/edit product modal. Structurally the same hardened pattern as AuthModal:
 * flex-centred (not translate-based, so Framer's inline transform can't fight
 * Tailwind's), pointerEvents included in both animate/exit targets, Escape and
 * scrim click wired as plain handlers so they work regardless of animation state.
 */
export default function ProductModal({ open, product, onClose, onSave }: ProductModalProps) {
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const modalTransition = useMotionTransition(TRANSITIONS.modalSpring);

  useEffect(() => {
    if (open) setForm(product ? productToForm(product) : EMPTY_FORM);
  }, [open, product]);

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
    if (!form.name.trim() || !form.sku.trim()) return;
    onSave(form);
  }

  function update<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
                  className={inputClasses}
                  required
                />
                <input
                  value={form.sku}
                  onChange={(e) => update("sku", e.target.value)}
                  placeholder="SKU"
                  className={inputClasses}
                  required
                />
                <select
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  className={`${inputClasses} appearance-none`}
                >
                  {PRODUCT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    placeholder="Narxi (so'm)"
                    type="number"
                    min="0"
                    className={inputClasses}
                  />
                  <input
                    value={form.quantity}
                    onChange={(e) => update("quantity", e.target.value)}
                    placeholder="Soni"
                    type="number"
                    min="0"
                    className={inputClasses}
                  />
                </div>

                {/* No upload endpoint yet — this only proves out the UI. */}
                <button
                  type="button"
                  className="h-12 border border-dashed border-white/[0.15] rounded-xl flex items-center justify-center gap-2 text-sm text-ink-muted hover:text-ink hover:border-white/[0.25] transition-colors"
                >
                  <ImagePlus size={16} />
                  Rasm tanlash
                </button>

                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Tavsif"
                  rows={2}
                  className="bg-elevated border border-white/[0.10] rounded-xl px-4 py-3 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
                />

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
