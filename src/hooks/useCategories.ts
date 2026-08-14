import { useEffect, useState } from "react";
import { getCategories } from "../lib/api";
import type { Category, Lang } from "../types";

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: boolean;
}

export function useCategories(lang: Lang): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    getCategories(lang)
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
