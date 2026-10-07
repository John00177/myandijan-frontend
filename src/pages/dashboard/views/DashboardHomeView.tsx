import { Building2, Eye, Heart, MessageSquare, Navigation, Phone, Star, TrendingUp, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getMyAnalyticsOverview, getMyBusinesses, getMyStats } from "../../../lib/api";
import KpiCard from "../KpiCard";
import type { DashboardView } from "../types";

interface DashboardHomeViewProps {
  onSelectView: (view: DashboardView) => void;
  onEditBusiness: (id: number) => void;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Qoralama",
  PENDING: "Kutilmoqda",
  APPROVED: "Tasdiqlangan",
  REJECTED: "Rad etilgan",
  SUSPENDED: "To'xtatilgan",
};

const STATUS_TONE: Record<string, "success" | "amber" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  PENDING: "amber",
  APPROVED: "success",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

// Phase 16G.2: the owner overview panel — GET /me/analytics/overview, the
// last 7 days against the 7 before, summed over the owner's businesses.
// Rating is left out on purpose: the "Reyting" card above already shows it.
const OVERVIEW_METRICS: { key: "pageViews" | "callClicks" | "directionClicks" | "favorites"; label: string; icon: LucideIcon }[] = [
  { key: "pageViews", label: "Ko'rishlar", icon: Eye },
  { key: "callClicks", label: "Qo'ng'iroqlar", icon: Phone },
  { key: "directionClicks", label: "Yo'nalish so'rovlari", icon: Navigation },
  { key: "favorites", label: "Sevimlilarga qo'shildi", icon: Heart },
];

/** The server formats change as "+12%" / "0%" / "-30%"; colour follows the sign. */
function trendTone(change: string): "success" | "danger" | "blue" {
  if (change.startsWith("-")) return "danger";
  if (change.startsWith("+")) return "success";
  return "blue";
}

export default function DashboardHomeView({ onSelectView, onEditBusiness }: DashboardHomeViewProps) {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const statsFetcher = useCallback(() => getMyStats(), []);
  const { data: stats, state: statsState } = useAdminResource(statsFetcher);

  const overviewFetcher = useCallback(() => getMyAnalyticsOverview(), []);
  const { data: overview, state: overviewState } = useAdminResource(overviewFetcher);

  const businessesFetcher = useCallback(() => getMyBusinesses(), []);
  const { data: businesses, state: businessesState } = useAdminResource(businessesFetcher);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Building2}
          label="Bizneslar"
          value={statsState === "ok" ? String(stats?.businessCount ?? 0) : "—"}
        />
        <KpiCard
          icon={MessageSquare}
          label="Sharhlar"
          value={statsState === "ok" ? String(stats?.totalReviews ?? 0) : "—"}
        />
        <KpiCard
          icon={Star}
          label="Reyting"
          value={statsState === "ok" && stats && stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
        />
        <KpiCard
          icon={TrendingUp}
          label="Salomatlik bali"
          value={statsState === "ok" ? (stats?.healthScore.average != null ? String(stats.healthScore.average) : "—") : "—"}
        />
      </div>

      <section aria-labelledby="owner-overview-heading">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 id="owner-overview-heading" className="text-lg font-bold text-ink">
            So'nggi 7 kun
          </h2>
          <span className="text-xs text-ink-muted">Oldingi 7 kunga nisbatan</span>
        </div>
        {overviewState === "error" || overviewState === "forbidden" ? (
          <p className="text-sm text-ink-muted">Statistikani yuklab bo'lmadi.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OVERVIEW_METRICS.map(({ key, label, icon }) => {
              const metric = overviewState === "ok" ? overview?.[key] : undefined;
              return (
                <KpiCard
                  key={key}
                  icon={icon}
                  label={label}
                  value={metric ? String(metric.current) : "—"}
                  trend={metric?.change}
                  trendTone={metric ? trendTone(metric.change) : undefined}
                />
              );
            })}
          </div>
        )}
      </section>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink">Mening bizneslarim</h2>
          <button
            onClick={() => onSelectView("businesses")}
            className="text-sm text-primary hover:text-blue-300 transition-colors"
          >
            Barchasi →
          </button>
        </div>

        {businessesState === "loading" && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[76px]" />
            ))}
          </div>
        )}

        {businessesState === "ok" && businesses?.length === 0 && (
          <EmptyState
            icon={Building2}
            title="Hozircha biznesingiz yo'q"
            body="Birinchi biznesingizni qo'shing."
            actionLabel="Biznes qo'shish"
            onAction={() => navigate(`/${lang}/dashboard/business/new`)}
          />
        )}

        {businessesState === "ok" && businesses && businesses.length > 0 && (
          <div className="flex flex-col gap-3">
            {businesses.slice(0, 3).map((business) => (
              <div key={business.id} className="flex items-center gap-4 p-4 bg-card border border-white/[0.08] rounded-xl">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#1F2C38] to-[#121A22] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate">{business.name}</div>
                  <Badge tone={STATUS_TONE[business.status]} className="mt-1">
                    {STATUS_LABEL[business.status]}
                  </Badge>
                  {/* Real Business columns (ratingAvg/viewCount/favoriteCount).
                      viewCount is the all-time total kept by POST
                      /analytics/view; the panel above is the 7-day window. */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {business.viewCount ?? 0} ko'rish
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart size={12} /> {business.favoriteCount ?? 0} sevimlilar
                    </span>
                    {Number(business.ratingAvg ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Star size={12} className="fill-warning text-warning" />
                        {Number(business.ratingAvg).toFixed(1)} reyting
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditBusiness(business.id)}
                >
                  Tahrirlash
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
