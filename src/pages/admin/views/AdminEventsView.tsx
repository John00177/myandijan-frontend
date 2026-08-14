import { Calendar, Check, Plus, X } from "lucide-react";
import { useCallback } from "react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { getAdminEvents } from "../../../lib/api";
import type { AdminEvent } from "../../../types";
import { renderAdminState } from "../AdminFetchState";
import { formatDate } from "../statusLabels";

function eventTitle(e: AdminEvent): string {
  return e.nameUz ?? e.title ?? e.nameRu ?? e.nameEn ?? `#${e.id}`;
}

export default function AdminEventsView() {
  const fetcher = useCallback(() => getAdminEvents(), []);
  const { data, state, status } = useAdminResource(fetcher);

  const stateEl = renderAdminState(state, status);
  const events = data?.items ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{state === "ok" ? `${events.length} ta tadbir` : "Tadbirlar"}</p>
        <Button variant="primary" size="sm">
          <Plus size={16} />
          Yangi tadbir
        </Button>
      </div>

      {stateEl ??
        (state === "loading" ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Tadbirlar yo'q"
            body="Tizimda hozircha tadbirlar mavjud emas."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card border border-white/[0.08] rounded-xl"
              >
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#1F2C38] to-[#121A22] flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-ink-muted/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink truncate">{eventTitle(event)}</div>
                  <div className="text-xs text-ink-muted mt-1">
                    {formatDate(event.startsAt)}
                    {event.location ? ` · ${event.location}` : ""}
                  </div>
                </div>
                {event.status && <Badge tone="neutral">{event.status}</Badge>}
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Button variant="ghost" size="sm" className="!text-success hover:!bg-success/10">
                    <Check size={14} />
                    Tasdiqlash
                  </Button>
                  <Button variant="ghost" size="sm" className="!text-danger hover:!bg-danger/10">
                    <X size={14} />
                    Rad etish
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
