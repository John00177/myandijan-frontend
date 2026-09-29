import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, getMe, revokeSession, SESSION_EXPIRED_EVENT } from "../lib/api";
import type { AuthUser } from "../types";

const TOKEN_KEY = "myandijan_token";
const REFRESH_TOKEN_KEY = "myandijan_refresh_token";
const USER_KEY = "myandijan_user";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (token: string, user: AuthUser, refreshToken: string) => void;
  register: (token: string, user: AuthUser, refreshToken: string) => void;
  logout: () => void;
  /**
   * Merges a partial user patch into state + localStorage without a server
   * round-trip. Exists because the backend has no profile-update endpoint or
   * age/gender columns yet (see updateProfile in lib/api.ts) — this is what
   * lets the profile form feel persistent in the meantime.
   */
  updateUser: (patch: Partial<AuthUser>) => void;
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

  // Bumped by every LOCAL authoritative write (login/register/updateUser).
  // The mount-time getMe() refresh below reads this before it starts and
  // compares again when it resolves — if a save happened in between, the
  // getMe() response is guaranteed stale and must be dropped instead of
  // applied. This is the actual root cause of the profile banner
  // resurfacing: getMe() and a user-triggered save could both be in flight
  // at once (e.g. the user fills the form and hits Save fast, before the
  // page's one-time mount refresh has returned), and whichever one's
  // response arrived LAST won — which was getMe()'s stale, pre-save
  // snapshot roughly as often as not. A ref (not state) is deliberate: bumping
  // it must never itself trigger a render or re-run this effect.
  const writeSeqRef = useRef(0);

  const applySession = useCallback((nextToken: string, nextUser: AuthUser, nextRefreshToken: string) => {
    writeSeqRef.current += 1;
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    (nextToken: string, nextUser: AuthUser, nextRefreshToken: string) =>
      applySession(nextToken, nextUser, nextRefreshToken),
    [applySession],
  );

  const register = useCallback(
    (nextToken: string, nextUser: AuthUser, nextRefreshToken: string) =>
      applySession(nextToken, nextUser, nextRefreshToken),
    [applySession],
  );

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    writeSeqRef.current += 1;
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Refreshes the cached user object from the server once per app load,
  // rather than trusting localStorage forever. Covers the case the
  // localStorage write from a previous save silently failed or was made from
  // a build that didn't yet know about a field — a plain GET here is the
  // one source of truth that can't drift.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const seqAtStart = writeSeqRef.current;

    getMe()
      .then((fresh) => {
        if (cancelled) return;
        // A save landed while this GET was in flight — its response is for
        // the user's state BEFORE that save, so applying it now would
        // silently revert what the user just did. Drop it; the save already
        // wrote the authoritative value.
        if (writeSeqRef.current !== seqAtStart) return;
        // Merge onto whatever is cached, but never DROP the server's answer:
        // returning `prev` untouched when `prev` was null would mean a token
        // with a missing/corrupt cached user could never recover its profile
        // fields no matter how many times it refetched.
        setUser((prev) => ({ ...(prev ?? {}), ...fresh }) as AuthUser);
        const stored = readStoredUser();
        localStorage.setItem(USER_KEY, JSON.stringify({ ...(stored ?? {}), ...fresh }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // A 401 means the token is dead, so the cached user can never be
        // refreshed again — and serving it indefinitely is what would let a
        // STALE cached profile (e.g. written by an older build) keep the
        // completion banner up forever with no way to self-heal. Clear the
        // session instead; the user re-logs in and gets fresh, correct data.
        // Matches how useFavorites already treats a 401.
        if (err instanceof ApiError && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
          return;
        }
        // Any other failure (offline, 5xx) is transient — keep serving the
        // cached user rather than blanking it over a flaky network.
      });

    return () => {
      cancelled = true;
    };
    // Deliberately only on mount / when the token identity changes (login,
    // logout) — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const logout = useCallback(() => {
    // Best-effort: revoke the refresh token server-side so a copy of it
    // (e.g. from a shared/compromised device) can't outlive this logout. Not
    // awaited — local session state is cleared regardless of the outcome, so
    // a network failure here never blocks logging out.
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (storedRefreshToken) {
      revokeSession(storedRefreshToken).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // The API layer already cleared storage when any request came back 401 with
  // a token attached; this is what makes React state agree, so the UI stops
  // showing a logged-in user the moment the session is actually dead.
  useEffect(() => {
    function onSessionExpired() {
      setToken(null);
      setUser(null);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      // Hierarchy-aware, matching the backend's RolesGuard: ADMIN and
      // SUPER_ADMIN can do everything BUSINESS_OWNER/ADMIN could before.
      // MODERATOR/SUPPORT are excluded from both — they get only the
      // specific admin actions the backend explicitly grants them.
      isOwner: user?.role === "BUSINESS_OWNER" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
      isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
      isSuperAdmin: user?.role === "SUPER_ADMIN",
      login,
      register,
      logout,
      updateUser,
      isAuthModalOpen,
      openAuthModal,
      closeAuthModal,
    }),
    [user, token, login, register, logout, updateUser, isAuthModalOpen, openAuthModal, closeAuthModal],
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
