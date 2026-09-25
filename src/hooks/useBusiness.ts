import { useCallback, useEffect, useState } from "react";
import { ApiError, getBusiness } from "../lib/api";
import type { Business, Lang } from "../types";

interface UseBusinessResult {
  business: Business | null;
  loading: boolean;
  notFound: boolean;
  error: boolean;
  /** Re-fetches without the loading skeleton — for after posting a review/reply/menu change. */
  reload: () => void;
}

export function useBusiness(slug: string, lang: Lang): UseBusinessResult {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Only the initial load shows the full-page skeleton — a reload after a
    // review/reply already has content on screen, so silently swapping it in
    // reads better than flashing back to a skeleton.
    if (reloadTick === 0) setLoading(true);
    setNotFound(false);
    setError(false);

    getBusiness(slug, lang)
      .then((data) => {
        if (!cancelled) setBusiness(data);
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
  }, [slug, lang, reloadTick]);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  return { business, loading, notFound, error, reload };
}
