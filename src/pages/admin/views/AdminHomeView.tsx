import { Building2, Calendar, Clock, History, MessageSquare, Plus, Users } from "lucide-react";
import { useCallback } from "react";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getAdminAuditLogs, getAdminStats } from "../../../lib/api";
import KpiCard from "../../dashboard/KpiCard";
import { AdminForbidden } from "../AdminFetchState";
import { ACTION_DOT_CLASSES, describeAuditLog, timeAgo } from "../auditFormat";
import type { AdminView } from "../types";

interface AdminHomeViewProps {
  onSelectView: (view: AdminView) => void;
}

/** "—" whenever the value is genuinely unknown, rather than a filler zero. */
function statValue(value: number | null | undefined, loading: boolean): string | number {
  if (loading) return "…";
  return typeof value === "number" ? value : "—";
}

function sumValues(record: Record<string, number> | undefined): number | undefined {
  if (!record) return undefined;
  return Object.values(record).reduce((sum, n) => sum + n, 0);
}

export default function AdminHomeView({ onSelectView }: AdminHomeViewProps) {
  const fetcher = useCallback(() => getAdminStats(), []);
  const { data, state, status } = useAdminResource(fetcher);

  const auditFetcher = useCallback(() => getAdminAuditLogs({ limit: 5 }), []);
  const { data: auditData, state: auditState } = useAdminResource(auditFetcher);

  const loading = state === "loading";
  const totalBusinesses = sumValues(data?.businessesByStatus);
  const totalUsers = sumValues(data?.usersByRole);

  return (
    <div className="flex flex-col gap-8">
      {/*
        The KPI row still renders under `forbidden` with "—" values so the panel
        layout is intact, and the permission problem is reported once below rather
        than six times across the cards.
      */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Jami bizneslar" value={statValue(totalBusinesses, loading)} />
        <KpiCard
          icon={Clock}
          label="Kutilayotgan bizneslar"
          value={statValue(data?.businessesByStatus.PENDING, loading)}
          trend="Tasdiqlash kutilmoqda"
          trendTone="amber"
        />
        <KpiCard icon={Users} label="Foydalanuvchilar" value={statValue(totalUsers, loading)} />
        <KpiCard icon={MessageSquare} label="Kutilayotgan sharhlar" value={statValue(data?.pendingReviews, loading)} />
        <KpiCard icon={Calendar} label="Kutilayotgan tadbirlar" value={statValue(data?.pendingEvents, loading)} />
        <KpiCard icon={Plus} label="Yangi ro'yxatdan o'tganlar (7 kun)" value={statValue(data?.newSignups7d, loading)} />
      </div>

      {state === "forbidden" && <AdminForbidden status={status} />}

      <div>
        <h2 className="text-lg font-bold text-ink mb-4">So'nggi faoliyat</h2>
        {auditState === "loading" && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[44px]" />
            ))}
          </div>
        )}
        {auditState === "ok" && (auditData?.data.length ?? 0) === 0 && (
          <EmptyState icon={History} title="Hozircha faoliyat yo'q" body="Admin harakatlari shu yerda ko'rinadi." />
        )}
        {auditState === "ok" && auditData && auditData.data.length > 0 && (
          <div className="flex flex-col gap-2">
            {auditData.data.map((log) => (
              <div key={log.id} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg">
                <span className={`size-2 rounded-full shrink-0 ${ACTION_DOT_CLASSES[log.action]}`} />
                <span className="text-sm text-ink-body">
                  {log.actor?.fullName ?? "Tizim"} — {describeAuditLog(log)}
                </span>
                <span className="text-xs text-ink-muted ml-auto shrink-0">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-ink mb-4">Tezkor harakatlar</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="md" onClick={() => onSelectView("businesses")}>
            <Plus size={16} />
            Biznes qo'shish
          </Button>
          <Button variant="secondary" size="md" onClick={() => onSelectView("categories")}>
            Kategoriya qo'shish
          </Button>
          <Button variant="secondary" size="md">
            E'lon yuborish
          </Button>
        </div>
      </div>
    </div>
  );
}
