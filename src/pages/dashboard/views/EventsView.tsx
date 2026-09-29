import { Calendar, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import EmptyState from "../../../components/ui/EmptyState";
import Skeleton from "../../../components/ui/Skeleton";
import { useAdminResource } from "../../../hooks/useAdminResource";
import { ApiError, createMyEvent, getMyBusinesses, getMyEvents } from "../../../lib/api";
import type { EventStatusValue, MyBusiness } from "../../../types";
import CreateEventModal from "../CreateEventModal";

const STATUS_LABEL: Record<EventStatusValue, string> = {
  DRAFT: "Qoralama",
  PENDING: "Kutilmoqda",
  PUBLISHED: "Bo'lajak",
  REJECTED: "Rad etilgan",
  CANCELLED: "Bekor qilindi",
  COMPLETED: "O'tgan",
};

const STATUS_TONE: Record<EventStatusValue, "success" | "amber" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  PENDING: "amber",
  PUBLISHED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
  COMPLETED: "neutral",
};

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

export default function EventsView() {
  const fetcher = useCallback(() => getMyEvents({ limit: 50 }), []);
  const { data, state, status, reload } = useAdminResource(fetcher);
  const events = data?.data ?? [];

  const [businesses, setBusinesses] = useState<MyBusiness[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getMyBusinesses()
      .then(setBusinesses)
      .catch(() => {
        // Not critical to the list view — only blocks opening the create modal.
      });
  }, []);

  async function handleCreateEvent(form: {
    businessId: string;
    title: string;
    description: string;
    startAt: string;
    endAt: string;
    venueName: string;
    address: string;
  }) {
    setSaving(true);
    setSaveError(null);
    try {
      await createMyEvent({
        businessId: Number(form.businessId),
        title: form.title,
        description: form.description,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        venueName: form.venueName || undefined,
        address: form.address || undefined,
      });
      setModalOpen(false);
      reload();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Tadbirni saqlab bo'lmadi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-ink-muted">{state === "ok" ? `${events.length} ta tadbir` : "Tadbirlar"}</p>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)} disabled={businesses.length === 0}>
          <Plus size={16} />
          Yangi tadbir
        </Button>
      </div>

      <CreateEventModal
        open={modalOpen}
        businesses={businesses}
        onClose={() => setModalOpen(false)}
        onSave={handleCreateEvent}
        saving={saving}
        error={saveError}
      />

      {state === "loading" && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      )}

      {(state === "forbidden" || state === "error") && (
        <EmptyState
          icon={Calendar}
          title="Ma'lumotni yuklab bo'lmadi"
          body={status ? `So'rov bajarilmadi (${status}). Qayta urinib ko'ring.` : "So'rov bajarilmadi."}
          actionLabel="Qayta urinish"
          onAction={reload}
        />
      )}

      {state === "ok" && events.length === 0 && (
        <EmptyState icon={Calendar} title="Hozircha tadbirlar yo'q" body="Tadbir qo'shganingizda shu yerda ko'rinadi." />
      )}

      {state === "ok" && events.length > 0 && (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <div key={event.id} className="flex items-center gap-4 p-4 bg-card border border-white/[0.08] rounded-xl">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#1F2C38] to-[#121A22] flex items-center justify-center shrink-0">
                <Calendar size={20} className="text-ink-muted/50" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-ink truncate">{event.title}</div>
                <div className="text-xs text-ink-muted mt-1">{formatEventDate(event.startAt)}</div>
              </div>
              <Badge tone={STATUS_TONE[event.status]}>{STATUS_LABEL[event.status]}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
