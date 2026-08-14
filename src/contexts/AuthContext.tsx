import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AuthUser } from "../types";

const TOKEN_KEY = "myandijan_token";
const USER_KEY = "myandijan_user";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  login: (token: string, user: AuthUser) => void;
  register: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const applySession = useCallback((nextToken: string, nextUser: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    (nextToken: string, nextUser: AuthUser) => applySession(nextToken, nextUser),
    [applySession],
  );

  const register = useCallback(
    (nextToken: string, nextUser: AuthUser) => applySession(nextToken, nextUser),
    [applySession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isOwner: user?.role === "BUSINESS_OWNER" || user?.role === "ADMIN",
      isAdmin: user?.role === "ADMIN",
      login,
      register,
      logout,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
    }),
    [user, token, login, register, logout, isAuthModalOpen, openAuthModal, closeAuthModal],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
