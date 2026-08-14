import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { AuthUser } from "../types";

interface UseRequireAuthResult {
  user: AuthUser | null;
  token: string | null;
}

export function useRequireAuth(): UseRequireAuthResult {
  const { user, token, openAuthModal } = useAuth();

  useEffect(() => {
    if (!token) openAuthModal();
  }, [token, openAuthModal]);

  return { user, token };
}
