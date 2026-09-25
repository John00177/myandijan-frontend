import { Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import MetaTags from "../components/seo/MetaTags";
import PlanCard from "../components/premium/PlanCard";
import UpgradeModal from "../components/premium/UpgradeModal";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { PAYMENT_METHODS, PLANS, planName, type BillingCycle, type PlanDefinition, type PlanId } from "../lib/premium";

/**
 * Plan selection.
 *
 * There is no billing backend yet — no plan field on the user, no payment
 * endpoints — so confirming a plan records the choice locally and shows the
 * success state. Everything the real integration needs (plan, cycle, chosen
 * payment method) is already gathered here; `handleConfirm` is the single
 * place a POST goes when the API ships.
 */
const SELECTED_PLAN_KEY = "myandijan_plan";

function readStoredPlan(): PlanId {
  const raw = localStorage.getItem(SELECTED_PLAN_KEY);
  return raw === "premium" || raw === "featured" ? raw : "free";
}

export default function PricingPage() {
  const { t } = useLanguage();
  const { lang } = useLanguage();
  const { token, openAuthModal } = useAuth();

  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [currentPlan, setCurrentPlan] = useState<PlanId>(() => readStoredPlan());
  const [pendingPlan, setPendingPlan] = useState<PlanDefinition | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const planRank: Record<PlanId, number> = { free: 0, premium: 1, featured: 2 };
  const isDowngrade = pendingPlan ? planRank[pendingPlan.id] < planRank[currentPlan] : false;

  function handleSelect(plan: PlanDefinition) {
    // Choosing a plan is account-scoped, so an anonymous visitor gets the auth
    // modal here rather than at the payment step, where abandoning costs more.
    if (!token) {
      openAuthModal();
      return;
    }
    setConfirmation(null);
    setPendingPlan(plan);
  }

  function handleConfirm() {
    if (!pendingPlan) return;
    setSubmitting(true);
    localStorage.setItem(SELECTED_PLAN_KEY, pendingPlan.id);
    setCurrentPlan(pendingPlan.id);
    setConfirmation(
      `${planName(pendingPlan, lang)} — ${cycle === "yearly" ? t("yearly") : t("monthly")}. ${t("planActivatedNote")}`,
    );
    setSubmitting(false);
    setPendingPlan(null);
  }

  return (
    <>
      <MetaTags
        title="Tariflar — My Andijan"
        description="My Andijan biznes tariflari: Bepul, Premium va Featured. Click, Payme, Uzum orqali to'lov."
      />

      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">{t("pricingTitle")}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted sm:text-base">{t("pricingSubtitle")}</p>
        </div>

        <div className="mt-7 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-badge border border-white/[0.10] bg-card p-1">
            {(["monthly", "yearly"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setCycle(option)}
                aria-pressed={cycle === option}
                className={`flex h-9 items-center gap-2 rounded-badge px-4 text-sm font-medium transition-colors ${
                  cycle === option ? "bg-primary text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                {option === "monthly" ? t("monthly") : t("yearly")}
                {option === "yearly" && (
                  <span
                    className={`rounded-badge px-1.5 py-0.5 text-[10px] font-bold ${
                      cycle === "yearly" ? "bg-white/20 text-white" : "bg-brand-green/20 text-brand-green"
                    }`}
                  >
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {confirmation && (
          <div
            role="status"
            className="mx-auto mt-6 flex max-w-xl items-start gap-2.5 rounded-xl border border-brand-green/30 bg-brand-green/[0.1] p-3.5"
          >
            <Check size={16} className="mt-0.5 shrink-0 text-brand-green" />
            <p className="text-sm text-ink-body">{confirmation}</p>
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              cycle={cycle}
              isCurrent={plan.id === currentPlan}
              onSelect={() => handleSelect(plan)}
            />
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-white/[0.08] bg-card p-6">
          <h2 className="text-sm font-semibold text-ink">{t("paymentMethod")}</h2>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {PAYMENT_METHODS.map((method) => (
              <span
                key={method.id}
                className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.10] bg-white/[0.03] px-4 text-sm font-medium text-ink-body"
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: method.colorHex }} />
                {method.label}
              </span>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-muted">
            <ShieldCheck size={13} />
            {t("securePaymentNote")}
          </p>
        </div>
      </div>

      <UpgradeModal
        open={pendingPlan !== null}
        plan={pendingPlan}
        cycle={cycle}
        isDowngrade={isDowngrade}
        submitting={submitting}
        onClose={() => setPendingPlan(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
