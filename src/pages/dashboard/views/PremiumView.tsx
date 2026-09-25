import { Eye, MousePointerClick, Navigation, Phone, Rocket, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PhotoGalleryManager from "../../../components/premium/PhotoGalleryManager";
import PremiumBadge, { TierBadge } from "../../../components/premium/PremiumBadge";
import TrafficChart from "../../../components/premium/TrafficChart";
import UpgradeModal from "../../../components/premium/UpgradeModal";
import Skeleton from "../../../components/ui/Skeleton";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getMyBusinesses } from "../../../lib/api";
import { planById, planName, type BillingCycle, type PlanId } from "../../../lib/premium";
import type { TranslationKey } from "../../../i18n";

const SELECTED_PLAN_KEY = "myandijan_plan";
const DAY_KEYS: TranslationKey[] = ["days.mon", "days.tue", "days.wed", "days.thu", "days.fri", "days.sat", "days.sun"];

function readStoredPlan(): PlanId {
  const raw = localStorage.getItem(SELECTED_PLAN_KEY);
  return raw === "premium" || raw === "featured" ? raw : "free";
}

/**
 * Deterministic per-business traffic, seeded the same way lib/premium does —
 * the API exposes no per-day analytics yet (viewCount exists but has no writer
 * server-side), so this stands in until it does.
 */
function trafficFor(businessId: number): number[] {
  return Array.from({ length: 7 }, (_, day) => {
    const x = Math.sin((businessId * 31 + day) * 421.13) * 10000;
    const fraction = x - Math.floor(x);
    const weekendLift = day >= 5 ? 1.35 : 1;
    return Math.max(5, Math.round(120 * weekendLift * (0.6 + fraction * 0.8)));
  });
}

interface StatCardProps {
  icon: typeof Eye;
  label: string;
  value: number;
  accent?: boolean;
}

function StatCard({ icon: Icon, label, value, accent = false }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-gold/30 bg-gold/[0.05]" : "border-white/[0.08] bg-card"}`}>
      <div
        className={`flex size-9 items-center justify-center rounded-lg ${
          accent ? "bg-gold/15 text-gold" : "bg-primary/10 text-primary"
        }`}
      >
        <Icon size={16} />
      </div>
      <div className="mt-2.5 text-2xl font-bold text-ink">{value.toLocaleString("ru-RU")}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}

export default function PremiumView() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const fetcher = useCallback(() => getMyBusinesses(), []);
  const { data, state } = useAdminResource(fetcher);
  const businesses = useMemo(() => data ?? [], [data]);
  const loading = state === "loading";

  const [plan, setPlan] = useState<PlanId>(() => readStoredPlan());
  const [cycle] = useState<BillingCycle>("monthly");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = businesses.find((b) => b.id === selectedId) ?? businesses[0] ?? null;

  const traffic = useMemo(() => (selected ? trafficFor(selected.id) : []), [selected]);
  const totalViews = traffic.reduce((sum, value) => sum + value, 0);

  const currentPlan = planById(plan);
  const targetPlan = planById(plan === "free" ? "premium" : "featured");
  const dayLabels = DAY_KEYS.map((key) => t(key).slice(0, 2));

  function handleConfirm() {
    localStorage.setItem(SELECTED_PLAN_KEY, targetPlan.id);
    setPlan(targetPlan.id);
    setUpgradeOpen(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Current plan + upgrade CTA */}
      <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.08] to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-ink-muted">{t("currentPlan")}</span>
              {plan === "free" ? (
                <span className="rounded-badge border border-white/[0.12] bg-white/[0.05] px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  {t("planFree")}
                </span>
              ) : (
                <>
                  <PremiumBadge variant={plan === "featured" ? "featured" : "premium"} />
                  <TierBadge tier={plan === "featured" ? "gold" : "silver"} />
                </>
              )}
            </div>
            <h2 className="mt-2 text-xl font-bold text-ink">{planName(currentPlan, lang)}</h2>
            <p className="mt-1 max-w-md text-sm text-ink-muted">{t("boostListingDesc")}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => setUpgradeOpen(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-btn bg-gradient-to-r from-gold to-[#FFB300] px-5 text-sm font-semibold text-[#3A2B00] hover:brightness-105"
            >
              <Rocket size={16} />
              {t("boostListing")}
            </button>
            <button
              onClick={() => navigate(`/${lang}/pricing`)}
              className="flex h-11 items-center justify-center gap-2 rounded-btn border border-white/[0.12] px-5 text-sm font-medium text-ink-body hover:border-white/25 hover:text-ink"
            >
              <Sparkles size={15} />
              {t("pricingTitle").split(" ")[0]}
            </button>
          </div>
        </div>
      </div>

      {businesses.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {businesses.map((business) => (
            <button
              key={business.id}
              onClick={() => setSelectedId(business.id)}
              className={`h-9 shrink-0 rounded-badge px-3 text-sm font-medium ${
                selected?.id === business.id ? "bg-primary text-white" : "bg-[#334155] text-ink-body"
              }`}
            >
              {business.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Eye} label={t("statViews")} value={totalViews} accent />
        <StatCard icon={MousePointerClick} label={t("statClicks")} value={Math.round(totalViews * 0.22)} />
        <StatCard icon={Phone} label={t("statCalls")} value={Math.round(totalViews * 0.07)} />
        <StatCard icon={Navigation} label={t("statDirections")} value={Math.round(totalViews * 0.05)} />
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-card p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{t("traffic7d")}</h3>
          {selected && <span className="truncate text-xs text-ink-muted">{selected.name}</span>}
        </div>
        <div className="mt-4">
          <TrafficChart values={traffic} labels={dayLabels} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-card p-5">
        <PhotoGalleryManager
          photos={photos}
          onChange={setPhotos}
          maxPhotos={plan === "featured" ? 30 : plan === "premium" ? 10 : 3}
        />
      </div>

      <UpgradeModal
        open={upgradeOpen}
        plan={targetPlan}
        cycle={cycle}
        onClose={() => setUpgradeOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
