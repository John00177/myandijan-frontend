import { useEffect, useState } from "react";
import { getEvents } from "../lib/api";
import type { Event } from "../types";

interface UseEventsResult {
  events: Event[];
  loading: boolean;
  error: boolean;
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getEvents()
      .then((res) => {
        if (!cancelled) setEvents(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { events, loading, error };
}
