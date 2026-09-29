import { useCallback, useEffect, useState } from "react";
import { ApiError, getEventBySlug } from "../lib/api";
import type { EventDetail } from "../types";

interface UseEventDetailResult {
  event: EventDetail | null;
  loading: boolean;
  notFound: boolean;
  error: boolean;
  reload: () => void;
}

/** Mirrors useBusiness's shape for the analogous single-event fetch. */
export function useEventDetail(slug: string): UseEventDetailResult {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(false);

    getEventBySlug(slug)
      .then((data) => {
        if (!cancelled) setEvent(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, reloadTick]);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  return { event, loading, notFound, error, reload };
}
