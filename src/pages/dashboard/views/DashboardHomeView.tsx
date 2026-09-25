import { Building2, Eye, Heart, MessageSquare, Star, TrendingUp } from "lucide-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getMyBusinesses, getMyStats } from "../../../lib/api";
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

export default function DashboardHomeView({ onSelectView, onEditBusiness }: DashboardHomeViewProps) {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const statsFetcher = useCallback(() => getMyStats(), []);
  const { data: stats, state: statsState } = useAdminResource(statsFetcher);

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
                  {/* Real Business columns (ratingAvg/viewCount/favoriteCount) —
                      viewCount has no writer anywhere in the app yet, so it
                      reads 0 today; not mocked, just not populated yet. */}
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
