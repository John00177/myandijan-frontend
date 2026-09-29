import { Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import AnimatedCard from "../../components/AnimatedCard";
import Badge from "../../components/ui/Badge";
import type { Event } from "../../types";

interface EventCardProps {
  event: Event;
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

export default function EventCard({ event }: EventCardProps) {
  const { lang } = useLanguage();
  const location = event.venueName ?? event.address;

  return (
    <Link to={`/${lang}/events/${event.slug}`}>
      <AnimatedCard className="overflow-hidden">
        <div className="aspect-[16/9] w-full bg-gradient-to-br from-[#1F2C38] to-[#121A22] relative">
          {event.coverUrl && (
            <img src={event.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>

        <div className="p-4">
          <Badge tone="cyan">{event.type ?? "Tadbir"}</Badge>

          <h3 className="font-semibold text-ink line-clamp-2 mt-2">{event.title}</h3>

          <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-2">
            <Calendar size={14} />
            {formatEventDate(event.startAt)}
          </div>

          {location && (
            <div className="flex items-center gap-1.5 text-sm text-ink-muted mt-1">
              <MapPin size={14} />
              {location}
            </div>
          )}
        </div>
      </AnimatedCard>
    </Link>
  );
}
