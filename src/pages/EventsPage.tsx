import { Calendar } from "lucide-react";
import MetaTags from "../components/seo/MetaTags";
import StaggerContainer, { StaggerItem } from "../components/StaggerContainer";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import { useEvents } from "../hooks/useEvents";
import EventCard from "./events/EventCard";

export default function EventsPage() {
  const { events, loading, error } = useEvents();

  return (
    <>
      <MetaTags title="Tadbirlar — My Andijan" description="Andijon viloyatidagi tadbirlar." />

      <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-ink">Tadbirlar</h1>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[280px]" />
            ))}
          </div>
        ) : error || events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Hozircha tadbirlar yo'q"
            body="Tez orada yangi tadbirlar qo'shiladi"
          />
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <StaggerItem key={event.id}>
                <EventCard event={event} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </>
  );
}
