import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownCircle, Check, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { TRANSITIONS, useMotionTransition, useShouldAnimate } from "../../lib/motion-config";
import {
  formatSum,
  monthlyPriceFor,
  PAYMENT_METHODS,
  planName,
  totalPriceFor,
  type BillingCycle,
  type PlanDefinition,
} from "../../lib/premium";

interface UpgradeModalProps {
  open: boolean;
  plan: PlanDefinition | null;
  cycle: BillingCycle;
  /** Set when the change is a downgrade, so the copy warns instead of selling. */
  isDowngrade?: boolean;
  onClose: () => void;
  onConfirm: (paymentMethodId: string) => void;
  submitting?: boolean;
}

/**
 * Confirmation step for a plan change.
 *
 * Bottom sheet on mobile, centred dialog from `sm` up — the layout the rest of
 * the app's modals use, and the one thumb-reachable pattern on the phones most
 * of this audience browses on.
 */
export default function UpgradeModal({
  open,
  plan,
  cycle,
  isDowngrade = false,
  onClose,
  onConfirm,
  submitting = false,
}: UpgradeModalProps) {
  const { lang, t } = useLanguage();
  const shouldAnimate = useShouldAnimate();
  const backdropTransition = useMotionTransition(TRANSITIONS.fast);
  const sheetTransition = useMotionTransition(TRANSITIONS.modalSpring);
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Reset to the default method each time the sheet opens, so a previous
  // session's choice never silently carries into a new purchase.
  useEffect(() => {
    if (open) setMethod(PAYMENT_METHODS[0].id);
  }, [open]);

  return (
    <AnimatePresence>
      {open && plan && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={shouldAnimate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={onClose}
          />

          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("confirmUpgrade")}
              className="pointer-events-auto w-full max-h-[90vh] overflow-y-auto rounded-t-2xl border border-white/[0.10] bg-card p-5 sm:max-w-md sm:rounded-2xl"
              initial={shouldAnimate ? { opacity: 0, y: 40 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={sheetTransition}
            >
              {/* Drag affordance — mobile only, where the sheet reads as draggable. */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    {isDowngrade ? t("confirmDowngrade") : t("confirmUpgrade")}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {planName(plan, lang)} · {cycle === "yearly" ? t("yearly") : t("monthly")}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label={t("close")}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-white/[0.06] hover:text-ink"
                >
                  <X size={16} />
                </button>
              </div>

              {isDowngrade ? (
                <div className="mt-4 flex gap-2.5 rounded-xl border border-warning/25 bg-warning/[0.08] p-3">
                  <ArrowDownCircle size={16} className="mt-0.5 shrink-0 text-warning" />
                  <p className="text-xs text-ink-body">{t("downgradeWarning")}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink-muted">
                      {cycle === "yearly" ? t("billedYearly") : t("billedMonthly")}
                    </span>
                    <span className="text-xl font-bold text-ink">{formatSum(totalPriceFor(plan, cycle))}</span>
                  </div>
                  {cycle === "yearly" && (
                    <div className="mt-1 text-right text-xs text-brand-green">
                      {formatSum(monthlyPriceFor(plan, cycle))} / {t("perMonth")} · −20%
                    </div>
                  )}
                </div>
              )}

              {!isDowngrade && (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-ink">{t("paymentMethod")}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((option) => {
                      const active = option.id === method;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setMethod(option.id)}
                          aria-pressed={active}
                          className={`flex h-12 items-center justify-between rounded-xl border px-3 text-sm font-medium transition-colors ${
                            active
                              ? "border-primary bg-primary/[0.12] text-ink"
                              : "border-white/[0.10] bg-white/[0.03] text-ink-body hover:border-white/25"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: option.colorHex }} />
                            {option.label}
                          </span>
                          {active && <Check size={15} className="text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <button
                onClick={() => onConfirm(method)}
                disabled={submitting}
                className={`mt-5 h-12 w-full rounded-btn text-sm font-semibold disabled:opacity-60 ${
                  isDowngrade
                    ? "bg-white/[0.08] text-ink hover:bg-white/[0.12]"
                    : "bg-gradient-to-r from-gold to-[#FFB300] text-[#3A2B00] hover:brightness-105"
                }`}
              >
                {submitting ? t("common.loading") : isDowngrade ? t("confirmDowngrade") : t("payAndActivate")}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-muted">
                <ShieldCheck size={12} />
                {t("securePaymentNote")}
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
