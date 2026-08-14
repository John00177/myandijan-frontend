import { Building2, Calendar, Clock, MessageSquare, Plus, Users } from "lucide-react";
import { useCallback } from "react";
import Button from "../../../components/ui/Button";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getAdminStats } from "../../../lib/api";
import KpiCard from "../../dashboard/KpiCard";
import { ACTIVITY_DOT_CLASSES, ADMIN_ACTIVITY } from "../adminMockData";
import { AdminForbidden } from "../AdminFetchState";
import type { AdminView } from "../types";

interface AdminHomeViewProps {
  onSelectView: (view: AdminView) => void;
}

/** "—" whenever the value is genuinely unknown, rather than a filler zero. */
function statValue(value: number | null | undefined, loading: boolean): string | number {
  if (loading) return "…";
  return typeof value === "number" ? value : "—";
}

export default function AdminHomeView({ onSelectView }: AdminHomeViewProps) {
  const fetcher = useCallback(() => getAdminStats(), []);
  const { data, state, status } = useAdminResource(fetcher);

  const loading = state === "loading";

  return (
    <div className="flex flex-col gap-8">
      {/*
        The KPI row still renders under `forbidden` with "—" values so the panel
        layout is intact, and the permission problem is reported once below rather
        than six times across the cards.
      */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Jami bizneslar" value={statValue(data?.businesses, loading)} />
        <KpiCard
          icon={Clock}
          label="Kutilayotganlar"
          value={statValue(data?.pendingBusinesses, loading)}
          trend="Tasdiqlash kutilmoqda"
          trendTone="amber"
        />
        <KpiCard icon={Users} label="Foydalanuvchilar" value={statValue(data?.users, loading)} />
        <KpiCard icon={MessageSquare} label="Sharhlar" value={statValue(data?.reviews, loading)} />
        <KpiCard icon={Calendar} label="Tadbirlar" value={statValue(data?.events, loading)} />
        <KpiCard icon={Plus} label="Bugun qo'shilgan" value={statValue(data?.createdToday, loading)} />
      </div>

      {state === "forbidden" && <AdminForbidden status={status} />}

      <div>
        <h2 className="text-lg font-bold text-ink mb-4">So'nggi faoliyat</h2>
        <div className="flex flex-col gap-2">
          {ADMIN_ACTIVITY.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-lg">
              <span className={`size-2 rounded-full shrink-0 ${ACTIVITY_DOT_CLASSES[activity.kind]}`} />
              <span className="text-sm text-ink-body">{activity.text}</span>
              <span className="text-xs text-ink-muted ml-auto shrink-0">{activity.timeAgo}</span>
            </div>
          ))}
        </div>
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
