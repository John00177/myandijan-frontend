import { useEffect, useState } from "react";
import { recordSearch, searchBusinesses, searchBusinessesFts } from "../lib/api";
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

    // A real text query gets ranked full-text search; pure category/district
    // browsing (no query term) has nothing to rank, so it keeps using the
    // regular paginated business list.
    const hasQuery = !!search && search.trim().length > 0;
    const fetchResults = hasQuery ? searchBusinessesFts : searchBusinesses;

    fetchResults({ category, district, city, search, page, limit, lang })
      .then((res) => {
        if (!cancelled) {
          setBusinesses(res.data);
          setMeta(res.meta);
          // Only a real text query is a "search" worth logging — browsing by
          // category/district alone isn't what SearchAnalytics is for.
          if (search) {
            recordSearch({ query: search, districtId: district, cityId: city, resultCount: res.meta.total });
          }
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
