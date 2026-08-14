import { useEffect, useState } from "react";
import { searchBusinesses } from "../lib/api";
import type { Business, PaginatedResponse, SearchBusinessesParams } from "../types";

interface UseSearchBusinessesResult {
  businesses: Business[];
  meta: PaginatedResponse<Business>["meta"] | null;
  loading: boolean;
  error: boolean;
}

export function useSearchBusinesses(params: SearchBusinessesParams): UseSearchBusinessesResult {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<Business>["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { category, district, city, search, page, limit, lang } = params;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    searchBusinesses({ category, district, city, search, page, limit, lang })
      .then((res) => {
        if (!cancelled) {
          setBusinesses(res.data);
          setMeta(res.meta);
        }
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
  }, [category, district, city, search, page, limit, lang]);

  return { businesses, meta, loading, error };
}
