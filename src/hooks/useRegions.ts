import { useEffect, useState } from "react";
import { getRegions } from "../lib/api";
import type { Lang, Region } from "../types";

interface UseRegionsResult {
  regions: Region[];
  loading: boolean;
  error: boolean;
}

export function useRegions(lang: Lang): UseRegionsResult {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getRegions(lang)
      .then((data) => {
        if (!cancelled) setRegions(data);
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

  return { regions, loading, error };
}
