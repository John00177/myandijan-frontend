import { useEffect, useState } from "react";
import { getCategoriesHomepage } from "../lib/api";
import type { Category, Lang } from "../types";

interface UseCategoriesHomepageResult {
  categories: Category[];
  loading: boolean;
  error: boolean;
}

/** Mirrors useCategories, but against the server-filtered /categories/homepage endpoint. */
export function useCategoriesHomepage(lang: Lang): UseCategoriesHomepageResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getCategoriesHomepage(lang)
      .then((data) => {
        if (!cancelled) setCategories(data);
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

  return { categories, loading, error };
}
