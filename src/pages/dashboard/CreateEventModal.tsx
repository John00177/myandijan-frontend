import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import type { MyBusiness } from "../../types";

const inputClasses =
  "h-12 bg-elevated border border-white/[0.10] rounded-xl px-4 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50";

interface EventFormState {
  businessId: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  venueName: string;
  address: string;
}

function emptyForm(businesses: MyBusiness[]): EventFormState {
  return {
    businessId: businesses[0] ? String(businesses[0].id) : "",
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    venueName: "",
    address: "",
  };
}

interface CreateEventModalProps {
  open: boolean;
  businesses: MyBusiness[];
  onClose: () => void;
  onSave: (form: EventFormState) => void;
  saving: boolean;
  error: string | null;
}

/** Same hardened modal pattern as ProductModal — see that file's header comment. */
export default function CreateEventModal({ open, businesses, onClose, onSave, saving, error }: CreateEventModalProps) {
  const [form, setForm] = useState<EventFormState>(() => emptyForm(businesses));
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const modalTransition = useMotionTransition(TRANSITIONS.modalSpring);

  useEffect(() => {
    if (open) setForm(emptyForm(businesses));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    if (!form.businessId || !form.title.trim() || !form.description.trim() || !form.startAt || !form.endAt) return;
    onSave(form);
  }

  function update<K extends keyof EventFormState>(key: K, value: EventFormState[K]) {
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
              aria-label="Yangi tadbir"
              className="w-full h-full sm:h-auto sm:max-w-md sm:max-h-[90vh] overflow-y-auto p-6 sm:rounded-2xl bg-card border-0 sm:border border-white/[0.08] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.8)] pointer-events-auto"
              initial={shouldAnimate ? { scale: 0.9, opacity: 0, y: 20 } : false}
              animate={{ scale: 1, opacity: 1, y: 0, pointerEvents: "auto" }}
              exit={{ scale: 0.95, opacity: 0, y: 10, pointerEvents: "none" }}
              transition={modalTransition}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Yangi tadbir</h2>
                <button onClick={onClose} aria-label="Yopish" className="text-ink-muted hover:text-ink">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-6">
                {businesses.length > 1 && (
                  <select
                    value={form.businessId}
                    onChange={(e) => update("businessId", e.target.value)}
                    className={`${inputClasses} appearance-none`}
                    required
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Tadbir nomi"
                  className={inputClasses}
                  minLength={3}
                  maxLength={250}
                  required
                />
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Tavsif"
                  rows={3}
                  className="bg-elevated border border-white/[0.10] rounded-xl px-4 py-3 text-ink placeholder:text-ink-muted outline-none focus:border-primary/50"
                  minLength={10}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.startAt}
                    onChange={(e) => update("startAt", e.target.value)}
                    type="datetime-local"
                    className={inputClasses}
                    required
                  />
                  <input
                    value={form.endAt}
                    onChange={(e) => update("endAt", e.target.value)}
                    type="datetime-local"
                    className={inputClasses}
                    required
                  />
                </div>
                <input
                  value={form.venueName}
                  onChange={(e) => update("venueName", e.target.value)}
                  placeholder="Joy nomi (ixtiyoriy)"
                  className={inputClasses}
                  maxLength={250}
                />
                <input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Manzil (ixtiyoriy)"
                  className={inputClasses}
                  maxLength={500}
                />

                {error && <p className="text-sm text-danger">{error}</p>}

                <div className="flex gap-2 mt-2">
                  <Button type="submit" variant="primary" size="lg" className="flex-1" disabled={saving}>
                    {saving ? "Saqlanmoqda..." : "Yaratish"}
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
