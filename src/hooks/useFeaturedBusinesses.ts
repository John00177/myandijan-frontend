import { useEffect, useState } from "react";
import { getFeaturedBusinesses } from "../lib/api";
import type { Business, Lang } from "../types";

interface UseFeaturedBusinessesResult {
  businesses: Business[];
  loading: boolean;
  error: boolean;
}

export function useFeaturedBusinesses(lang: Lang): UseFeaturedBusinessesResult {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getFeaturedBusinesses(lang)
      .then((data) => {
        if (!cancelled) setBusinesses(data);
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
  }, [lang]);

  return { businesses, loading, error };
}
