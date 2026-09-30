import { useEffect, useState } from "react";
import { ApiError, getCategoryBySlug } from "../lib/api";
import type { Category } from "../types";

interface UseCategoryDetailResult {
  category: Category | null;
  loading: boolean;
  notFound: boolean;
  error: boolean;
}

/** Mirrors useBusiness/useEventDetail's shape for the analogous single-category fetch. */
export function useCategoryDetail(slug: string): UseCategoryDetailResult {
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(false);

    getCategoryBySlug(slug)
      .then((data) => {
        if (!cancelled) setCategory(data);
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
  }, [slug]);

  return { category, loading, notFound, error };
}
