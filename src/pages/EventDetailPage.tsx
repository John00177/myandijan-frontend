import { Calendar, CalendarCheck, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import MetaTags from "../components/seo/MetaTags";
import NotFoundState from "../components/seo/NotFoundState";
import Skeleton from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useEventDetail } from "../hooks/useEventDetail";
import { ApiError, attendEvent } from "../lib/api";

function formatEventDateRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const dateFmt = new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
  const timeFmt = new Intl.DateTimeFormat("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${dateFmt.format(start)}, ${timeFmt.format(start)}–${timeFmt.format(end)}`;
  }
  return `${dateFmt.format(start)} — ${dateFmt.format(end)}`;
}

export default function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang, t } = useLanguage();
  const { token, openAuthModal } = useAuth();
  const { event, loading, notFound, error, reload } = useEventDetail(slug ?? "");
  const [attending, setAttending] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl mt-6" />
      </div>
    );
  }

  if (notFound || error || !event) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20">
        <NotFoundState title={t("eventNotFound")} body={t("eventNotFoundBody")} noIndex={notFound} />
      </div>
    );
  }

  const location = event.venueName ?? event.address;

  async function handleAttend() {
    if (!token) {
      openAuthModal();
      return;
    }
    setRsvpError(null);
    try {
      await attendEvent(event!.slug);
      setAttending(true);
      reload();
    } catch (err) {
      setRsvpError(err instanceof ApiError ? err.message : t("common.genericError"));
    }
  }

  return (
    <>
      <MetaTags title={`${event.title} — My Andijan`} description={event.description.slice(0, 160)} />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="aspect-[16/9] w-full rounded-2xl bg-gradient-to-br from-[#1F2C38] to-[#121A22] relative overflow-hidden">
          {event.coverUrl && (
            <img src={event.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>

        <div className="mt-6">
          <Badge tone="cyan">{event.type ?? "Tadbir"}</Badge>
          <h1 className="text-2xl font-bold text-ink mt-3">{event.title}</h1>

          {event.business && (
            <Link
              to={`/${lang}/business/${event.business.slug}`}
              className="text-sm text-primary hover:underline mt-1 inline-block"
            >
              {event.business.name}
            </Link>
          )}

          <div className="flex flex-col gap-2 mt-4 text-sm text-ink-body">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-ink-muted" />
              {formatEventDateRange(event.startAt, event.endAt)}
            </div>
            {location && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-ink-muted" />
                {location}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users size={16} className="text-ink-muted" />
              {event.attendeeCount}
              {event.maxAttendees ? ` / ${event.maxAttendees}` : ""} ishtirokchi
            </div>
          </div>

          <p className="text-sm text-ink-body whitespace-pre-line mt-6">{event.description}</p>

          {event.allowRsvp && (
            <div className="mt-6">
              <Button
                variant="primary"
                size="lg"
                onClick={handleAttend}
                disabled={attending || (event.maxAttendees != null && event.attendeeCount >= event.maxAttendees)}
              >
                <CalendarCheck size={18} />
                {attending ? "Ro'yxatdan o'tdingiz" : "Ishtirok etaman"}
              </Button>
              {rsvpError && <p className="text-sm text-danger mt-2">{rsvpError}</p>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
