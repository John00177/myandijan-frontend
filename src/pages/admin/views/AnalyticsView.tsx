import { Building2, Lock, TrendingUp, TriangleAlert, Users } from "lucide-react";
import { useCallback } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAuth } from "../../../contexts/AuthContext";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { axisProps, ChartTooltip, CHART_COLORS, gridProps } from "../../../lib/chart-theme";
import { getDashboardAnalytics } from "../../../lib/api";

/** Fixed display order regardless of what the API returns, so a bucket with
 * zero users still shows as an empty bar rather than silently disappearing. */
const AGE_BUCKET_ORDER = ["16-25", "26-35", "36-60", "60+", "Noma'lum"];

const TOP_CITIES = 10;
const TOP_CATEGORIES = 5;

// Real BusinessStatus values are DRAFT/PENDING/APPROVED/REJECTED/SUSPENDED/
// HIDDEN — there is no "ACTIVE" status on this platform. APPROVED is the
// live-and-visible state, so it's what "Faol" (active) reads from.
const STATUS_BADGES: { label: string; statusKey: string; tone: "success" | "amber" | "danger" }[] = [
  { label: "Faol", statusKey: "APPROVED", tone: "success" },
  { label: "Kutilmoqda", statusKey: "PENDING", tone: "amber" },
  { label: "Rad etilgan", statusKey: "REJECTED", tone: "danger" },
];

function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-[140px]" />
        <Skeleton className="h-[140px]" />
        <Skeleton className="h-[340px] lg:col-span-2" />
        <Skeleton className="h-[340px] lg:col-span-4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-[140px]" />
        <Skeleton className="h-[140px]" />
        <Skeleton className="h-[140px] lg:col-span-2" />
        <Skeleton className="h-[280px] lg:col-span-4" />
      </div>
    </div>
  );
}

export default function AnalyticsView() {
  const { user, isSuperAdmin } = useAuth();
  const fetcher = useCallback(() => getDashboardAnalytics(), []);
  const { data, state, status, reload } = useAdminResource(fetcher, isSuperAdmin);

  const isMobile = !useMediaQuery("(min-width: 640px)");
  const chartHeight = isMobile ? 240 : 300;

  if (!isSuperAdmin) {
    return (
      <div className="py-16">
        <EmptyState icon={Lock} title="Bu sahifa faqat Super Admin uchun" body={`Sizning rolingiz: ${user?.role ?? "—"}`} />
      </div>
    );
  }

  if (state === "loading") {
    return <SkeletonGrid />;
  }

  if (state === "forbidden" || state === "error") {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <TriangleAlert size={32} className="text-danger/70" />
        <h3 className="font-bold text-lg text-ink mt-3">Ma'lumotlarni yuklashda xatolik</h3>
        <p className="text-sm text-ink-muted max-w-[280px] mt-2">
          {status ? `So'rov bajarilmadi (${status}).` : "So'rov bajarilmadi."}
        </p>
        <Button variant="primary" size="sm" className="mt-4" onClick={reload}>
          Qayta urinish
        </Button>
      </div>
    );
  }

  const users = data?.users;
  const businesses = data?.businesses;
  const totalUsers = users?.totalUsers ?? 0;

  if (totalUsers === 0) {
    return (
      <div className="py-16">
        <EmptyState icon={Users} title="Hozircha foydalanuvchilar yo'q" body="Ro'yxatdan o'tgan foydalanuvchilar shu yerda ko'rinadi." />
      </div>
    );
  }

  const erkak = users?.genderSplit.find((g) => g.gender === "MALE")?.count ?? 0;
  const ayol = users?.genderSplit.find((g) => g.gender === "FEMALE")?.count ?? 0;

  const ageChartData = AGE_BUCKET_ORDER.map((range) => ({
    range,
    count: users?.ageGroups.find((g) => g.range === range)?.count ?? 0,
  }));
  const hasAgeData = ageChartData.some((d) => d.count > 0);

  const topCities = (users?.cityBreakdown ?? []).slice(0, TOP_CITIES);
  const maxCityCount = Math.max(1, ...topCities.map((c) => c.count));

  const totalBusinesses = businesses?.totalBusinesses ?? 0;
  const topCategories = (businesses?.byCategory ?? []).slice(0, TOP_CATEGORIES);
  const maxCategoryCount = Math.max(1, ...topCategories.map((c) => c.count));
  const businessesNewThisMonth = businesses?.newThisMonth ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 — Total users */}
        <div className="bg-card border border-white/[0.08] rounded-xl p-5">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users size={18} />
          </div>
          <div className="text-3xl font-bold text-ink mt-3">{totalUsers}</div>
          <div className="text-sm text-ink-muted">Jami foydalanuvchilar</div>
        </div>

        {/* Card 2 — Gender split */}
        <div className="bg-card border border-white/[0.08] rounded-xl p-5">
          <div className="text-sm text-ink-muted mb-3">Jins bo'yicha</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ink">{erkak || "—"}</div>
              <div className="text-xs text-ink-muted mt-1">Erkak</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-ink">{ayol || "—"}</div>
              <div className="text-xs text-ink-muted mt-1">Ayol</div>
            </div>
          </div>
        </div>

        {/* Card 3 — Age chart */}
        <div className="bg-card border border-white/[0.08] rounded-xl p-5 lg:col-span-2">
          <div className="text-sm text-ink-muted mb-3">Yosh bo'yicha</div>
          {hasAgeData ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart data={ageChartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} {...gridProps} />
                <XAxis dataKey="range" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<ChartTooltip suffix=" ta" />} />
                <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-10">
              <EmptyState icon={Users} title="Hozircha ma'lumot yo'q" body="" />
            </div>
          )}
        </div>

        {/* Card 4 — City breakdown */}
        <div className="bg-card border border-white/[0.08] rounded-xl p-5 lg:col-span-4">
          <div className="text-sm text-ink-muted mb-3">Shahar bo'yicha</div>
          {topCities.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {topCities.map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-sm text-ink truncate">{c.city}</div>
                  <div className="flex-1 h-6 bg-white/[0.03] rounded-md overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-md"
                      style={{ width: `${(c.count / maxCityCount) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 shrink-0 text-sm font-semibold text-ink text-right">{c.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10">
              <EmptyState icon={Users} title="Hozircha ma'lumot yo'q" body="" />
            </div>
          )}
        </div>
      </div>

      {/* ---- Business analytics ---------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 5 — Total businesses */}
        <div className="bg-card border border-white/[0.08] rounded-xl p-5">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div className="text-3xl font-bold text-ink mt-3">{totalBusinesses}</div>
          <div className="text-sm text-ink-muted">Jami bizneslar</div>
        </div>

        {/* Card 6 — By status */}
        <div className="bg-card border border-white/[0.08] rounded-xl p-5">
          <div className="text-sm text-ink-muted mb-3">Status bo'yicha</div>
          <div className="flex flex-col gap-2">
            {STATUS_BADGES.map(({ label, statusKey, tone }) => {
              const count = businesses?.byStatus.find((s) => s.status === statusKey)?.count ?? 0;
              return (
                <div key={statusKey} className="flex items-center justify-between">
                  <Badge tone={tone}>{label}</Badge>
                  <span className="text-sm font-semibold text-ink">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 8 — New businesses this month */}
        <div className="bg-card border border-white/[0.08] rounded-xl p-5 lg:col-span-2">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <div className="text-3xl font-bold text-ink mt-3">{businessesNewThisMonth}</div>
          <div className="text-sm text-ink-muted">Shu oyda yangi biznes</div>
        </div>

        {/* Card 7 — Top categories */}
        <div className="bg-card border border-white/[0.08] rounded-xl p-5 lg:col-span-4">
          <div className="text-sm text-ink-muted mb-3">Turkum bo'yicha</div>
          {topCategories.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {topCategories.map((c) => (
                <div key={c.category} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-sm text-ink truncate">{c.category}</div>
                  <div className="flex-1 h-6 bg-white/[0.03] rounded-md overflow-hidden">
                    <div
                      className="h-full bg-accent/60 rounded-md"
                      style={{ width: `${(c.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 shrink-0 text-sm font-semibold text-ink text-right">{c.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10">
              <EmptyState icon={Building2} title="Hozircha ma'lumot yo'q" body="" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
