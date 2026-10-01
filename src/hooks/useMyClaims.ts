import { useEffect, useState } from "react";
import { getMyClaims } from "../lib/api";
import type { MyClaim } from "../types";

interface UseMyClaimsResult {
  claims: MyClaim[];
  loading: boolean;
  error: boolean;
}

/** Only fetches when `token` is present — avoids an unauthenticated 401 round-trip. */
export function useMyClaims(token: string | null): UseMyClaimsResult {
  const [claims, setClaims] = useState<MyClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    getMyClaims({ limit: 20 })
      .then((res) => {
        if (!cancelled) setClaims(res.data);
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
  }, [token]);

  return { claims, loading, error };
}
