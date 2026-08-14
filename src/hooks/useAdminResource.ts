import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../lib/api";

/**
 * `forbidden` is kept distinct from `error` on purpose: a 401/403 from /admin/*
 * means "your token is not an admin", which is a completely different message to
 * the user than "the request failed". Collapsing them into one empty state would
 * make a permissions problem look like missing data.
 */
export type AdminFetchState = "loading" | "ok" | "forbidden" | "error";

interface UseAdminResourceResult<T> {
  data: T | null;
  state: AdminFetchState;
  /** Actual HTTP status, so messages can report what really happened. */
  status: number | null;
  /** Re-runs the fetch; backs the retry affordance on error states. */
  reload: () => void;
}

export function useAdminResource<T>(fetcher: () => Promise<T>): UseAdminResourceResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<AdminFetchState>("loading");
  const [status, setStatus] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState("loading");

    fetcher()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus(200);
        setState("ok");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const httpStatus = err instanceof ApiError ? err.status : 0;
        setStatus(httpStatus || null);
        setState(httpStatus === 401 || httpStatus === 403 ? "forbidden" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [fetcher, attempt]);

  return { data, state, status, reload };
}
