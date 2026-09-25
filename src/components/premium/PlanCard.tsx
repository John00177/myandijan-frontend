import { Check, Crown, Sparkles, Store } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  formatSum,
  monthlyPriceFor,
  planFeatures,
  planName,
  planTagline,
  totalPriceFor,
  type BillingCycle,
  type PlanDefinition,
} from "../../lib/premium";

interface PlanCardProps {
  plan: PlanDefinition;
  cycle: BillingCycle;
  isCurrent: boolean;
  onSelect: () => void;
}

const PLAN_ICONS = { free: Store, premium: Crown, featured: Sparkles } as const;

export default function PlanCard({ plan, cycle, isCurrent, onSelect }: PlanCardProps) {
  const { lang, t } = useLanguage();
  const Icon = PLAN_ICONS[plan.id];

  const monthly = monthlyPriceFor(plan, cycle);
  const isFree = plan.monthlyPrice === 0;
  const highlighted = plan.highlighted;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        highlighted
          ? "border-gold/50 bg-gradient-to-b from-gold/[0.07] to-transparent shadow-[0_10px_40px_-20px_rgba(255,215,0,0.5)]"
          : "border-white/[0.08] bg-card"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-badge bg-gradient-to-r from-gold to-[#FFB300] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3A2B00]">
          {t("mostPopular")}
        </span>
      )}

      <div
        className={`flex size-11 items-center justify-center rounded-xl ${
          plan.id === "free" ? "bg-white/[0.06] text-ink-muted" : "bg-gold/15 text-gold"
        }`}
      >
        <Icon size={20} />
      </div>

      <h3 className="mt-4 text-xl font-bold text-ink">{planName(plan, lang)}</h3>
      <p className="mt-1 text-sm text-ink-muted">{planTagline(plan, lang)}</p>

      <div className="mt-5">
        {isFree ? (
          <div className="text-3xl font-bold text-ink">{t("planFree")}</div>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-ink">{monthly.toLocaleString("ru-RU")}</span>
              <span className="text-sm text-ink-muted">so'm / {t("perMonth")}</span>
            </div>
            {cycle === "yearly" && (
              // Yearly is billed once up front, so the annual total has to be
              // visible next to the "per month" figure it is derived from —
              // showing only the divided-down number would understate the charge.
              <div className="mt-1 text-xs text-ink-muted">
                {t("billedYearly")}: <span className="text-ink-body">{formatSum(totalPriceFor(plan, cycle))}</span>
              </div>
            )}
          </>
        )}
      </div>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {planFeatures(plan, lang).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-ink-body">
            <Check size={15} className={`mt-0.5 shrink-0 ${highlighted ? "text-gold" : "text-brand-green"}`} />
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`mt-6 h-11 rounded-btn text-sm font-semibold transition-colors ${
          isCurrent
            ? "cursor-default border border-white/[0.10] bg-white/[0.04] text-ink-muted"
            : highlighted
              ? "bg-gradient-to-r from-gold to-[#FFB300] text-[#3A2B00] hover:brightness-105"
              : "bg-primary text-white hover:bg-blue-600"
        }`}
      >
        {isCurrent ? t("currentPlan") : isFree ? t("planFree") : t("choosePlan")}
      </button>
    </div>
  );
}
