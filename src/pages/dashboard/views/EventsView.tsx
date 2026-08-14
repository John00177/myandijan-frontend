import { Calendar, Plus } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import { MOCK_EVENTS } from "../mockData";

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

export default function EventsView() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{MOCK_EVENTS.length} ta tadbir</p>
        <Button variant="primary" size="sm">
          <Plus size={16} />
          Yangi tadbir
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_EVENTS.map((event) => (
          <div key={event.id} className="flex items-center gap-4 p-4 bg-card border border-white/[0.08] rounded-xl">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#1F2C38] to-[#121A22] flex items-center justify-center shrink-0">
              <Calendar size={20} className="text-ink-muted/50" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink truncate">{event.title}</div>
              <div className="text-xs text-ink-muted mt-1">{formatEventDate(event.date)}</div>
            </div>
            <Badge tone={event.status === "upcoming" ? "success" : "neutral"}>
              {event.status === "upcoming" ? "Bo'lajak" : "O'tgan"}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
