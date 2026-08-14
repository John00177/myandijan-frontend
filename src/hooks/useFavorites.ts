import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ApiError, getFavorites, removeFavorite } from "../lib/api";
import type { Business, Lang } from "../types";

interface UseFavoritesResult {
  favorites: Business[];
  loading: boolean;
  error: boolean;
  remove: (businessId: number) => Promise<void>;
}

export function useFavorites(lang: Lang, token: string | null): UseFavoritesResult {
  const { logout, openAuthModal } = useAuth();
  const [favorites, setFavorites] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchFavorites = useCallback(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    getFavorites(lang)
      .then(setFavorites)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          logout();
          openAuthModal();
        } else {
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  }, [lang, token, logout, openAuthModal]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const remove = useCallback(
    async (businessId: number) => {
      await removeFavorite(businessId);
      setFavorites((prev) => prev.filter((b) => b.id !== businessId));
    },
    [],
  );

  return { favorites, loading, error, remove };
}
