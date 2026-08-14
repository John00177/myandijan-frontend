import { useEffect, useState } from "react";
import { ApiError, getBusiness } from "../lib/api";
import type { Business, Lang } from "../types";

interface UseBusinessResult {
  business: Business | null;
  loading: boolean;
  notFound: boolean;
  error: boolean;
}

export function useBusiness(slug: string, lang: Lang): UseBusinessResult {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
  }, [slug, lang]);

  return { business, loading, notFound, error };
}
