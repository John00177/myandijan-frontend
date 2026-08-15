import { Building2, Eye, MessageSquare, TriangleAlert, Users } from "lucide-react";
import { useCallback } from "react";
import Button from "../../../components/ui/Button";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { getAdminStats } from "../../../lib/api";
import { AdminForbidden } from "../AdminFetchState";
import {
  SPARK_ACTIVE_USERS,
  SPARK_BUSINESSES,
  SPARK_DAILY_VIEWS,
  SPARK_NEW_REVIEWS,
} from "../analyticsMockData";
import CategoryDonutChart from "../charts/CategoryDonutChart";
import DistrictBarChart from "../charts/DistrictBarChart";
import SparklineKpiCard from "../charts/SparklineKpiCard";
import UserGrowthChart from "../charts/UserGrowthChart";
import ViewsAreaChart from "../charts/ViewsAreaChart";

/**
 * KPI *values* come from the real /admin/stats, so the loading and error states
 * below are driven by an actual request rather than a simulated delay. The
 * time-series behind every chart is mock — the API exposes no analytics or
 * historical endpoints at all (see analyticsMockData.ts).
 */
function statValue(value: number | null | undefined): string | number {
  return typeof value === "number" ? value : "—";
}

function sumValues(record: Record<string, number> | undefined): number | undefined {
  if (!record) return undefined;
  return Object.values(record).reduce((sum, n) => sum + n, 0);
}

function ChartSkeletonGrid({ height }: { height: number }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[164px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: height + 76 }} />
        ))}
      </div>
    </>
  );
}

export default function AnalyticsView() {
  const fetcher = useCallback(() => getAdminStats(), []);
  const { data, state, status, reload } = useAdminResource(fetcher);

  // Recharts needs numeric heights/widths as props, so the breakpoint has to be
  // read in JS rather than expressed with Tailwind variants.
  const isMobile = !useMediaQuery("(min-width: 640px)");
  const chartHeight = isMobile ? 240 : 300;

  if (state === "loading") {
    return <ChartSkeletonGrid height={chartHeight} />;
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <TriangleAlert size={32} className="text-danger/70" />
        <h3 className="font-bold text-lg text-ink mt-3">Ma'lumotlar yuklanmadi</h3>
        <p className="text-sm text-ink-muted max-w-[280px] mt-2">
          {status ? `So'rov bajarilmadi (${status}).` : "So'rov bajarilmadi."} Qayta urinib ko'ring.
        </p>
        <Button variant="primary" size="sm" className="mt-4" onClick={reload}>
          Qayta urinish
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SparklineKpiCard
          icon={Building2}
          label="Jami bizneslar"
          value={statValue(sumValues(data?.businessesByStatus))}
          data={SPARK_BUSINESSES}
          kind="line"
        />
        <SparklineKpiCard
          icon={Users}
          label="Jami foydalanuvchilar"
          value={statValue(sumValues(data?.usersByRole))}
          data={SPARK_ACTIVE_USERS}
          kind="bar"
        />
        <SparklineKpiCard
          icon={Eye}
          label="Kunlik ko'rishlar"
          value="—"
          data={SPARK_DAILY_VIEWS}
          kind="area"
        />
        <SparklineKpiCard
          icon={MessageSquare}
          label="Kutilayotgan sharhlar"
          value={statValue(data?.pendingReviews)}
          data={SPARK_NEW_REVIEWS}
          kind="line"
        />
      </div>

      {/*
        Charts still render when stats are forbidden — their series are mock and
        independent of that endpoint — but the permission problem is stated once
        rather than left implicit behind four "—" values.
      */}
      {state === "forbidden" && (
        <div className="mt-4">
          <AdminForbidden status={status} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ViewsAreaChart height={chartHeight} />
        <CategoryDonutChart height={chartHeight} />
        <DistrictBarChart height={chartHeight + 60} compact={isMobile} />
        <UserGrowthChart height={chartHeight} showLegend={!isMobile} />
      </div>
    </div>
  );
}
