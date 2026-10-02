/**
 * Cross-tab refresh-token coordination (Phase 15E.4a).
 *
 * Every tab shares one refresh token through localStorage. Without
 * coordination, two tabs that hit a 401 at the same time both redeem the
 * same token, and the loser's failure would clear the shared session for
 * every tab. This module makes exactly one tab per browser the refresh
 * coordinator; the others wait for it and then re-read the shared tokens.
 *
 * Mechanism (no third-party lock, no polling):
 *  - in-tab: one shared promise, so N concurrent callers in a tab → one run;
 *  - cross-tab: a short LEASE in localStorage ({ownerId, operationId,
 *    acquiredAt, expiresAt}). A tab writes its lease, waits `settleMs`, then
 *    re-reads it and proceeds only if the lease is still its own. localStorage
 *    has no compare-and-set, so this is a practical guard, not a strict lock:
 *    two tabs can only both win if one is frozen between its synchronous read
 *    and write for longer than `settleMs`;
 *  - wake-ups: a BroadcastChannel message, or — where BroadcastChannel is
 *    missing (Safari < 15.4) — the `storage` event fired when the lease or the
 *    tokens change; a single timer at lease expiry covers a coordinator that
 *    vanished (closed, crashed, frozen).
 *
 * Messages carry coordination metadata only (type, ids, timestamp, failure
 * reason) — never a token. Tokens stay where they always were: localStorage.
 *
 * This is reliability protection, not a security boundary: the backend
 * remains the only authority on whether a refresh token is valid.
 */

export const REFRESH_LOCK_KEY = "myandijan_refresh_lock";
export const AUTH_CHANNEL_NAME = "myandijan-auth";

/** What one POST /auth/refresh produced. */
export type RefreshAttempt =
  | { kind: "success"; accessToken: string; refreshToken: string }
  /** The server refused the refresh token (4xx): the session is over. */
  | { kind: "rejected" }
  /** Network error, timeout, 429 or 5xx: the session may still be fine. */
  | { kind: "transient" };

/** What a caller of refresh() gets back. */
export type RefreshResult =
  | { status: "refreshed"; accessToken: string }
  | { status: "unauthenticated" }
  | { status: "transient" };

type FailureReason = "rejected" | "transient";

export type CoordinationMessage =
  | { type: "refresh-started"; ownerId: string; operationId: string; at: number }
  | { type: "refresh-succeeded"; ownerId: string; operationId: string; at: number }
  | { type: "refresh-failed"; ownerId: string; operationId: string; at: number; reason: FailureReason }
  | { type: "logged-out"; ownerId: string; at: number };

interface Lease {
  ownerId: string;
  operationId: string;
  acquiredAt: number;
  expiresAt: number;
}

/** The subset of BroadcastChannel this module uses (injectable for tests). */
export interface ChannelLike {
  postMessage(message: CoordinationMessage): void;
  close(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
}

export interface RefreshCoordinatorOptions {
  storage: Storage;
  tokenKey: string;
  refreshTokenKey: string;
  /** Performs the actual POST /auth/refresh. Must honour `signal`. */
  performRefresh: (refreshToken: string, signal: AbortSignal) => Promise<RefreshAttempt>;
  /** Returns a channel, or null where BroadcastChannel is unavailable. */
  createChannel?: () => ChannelLike | null;
  /** Subscribes to cross-tab storage changes; the listener gets the changed key (null = storage cleared). */
  subscribeStorage?: (listener: (key: string | null) => void) => () => void;
  /** Lease lifetime; must exceed requestTimeoutMs. */
  leaseMs?: number;
  /** Delay between writing the lease and verifying it is still ours. */
  settleMs?: number;
  requestTimeoutMs?: number;
  now?: () => number;
  createId?: () => string;
}

export interface RefreshCoordinator {
  /**
   * Obtain a usable access token after `failedAccessToken` was rejected.
   * Never throws. Concurrent calls in one tab share a single run.
   */
  refresh(failedAccessToken: string | null): Promise<RefreshResult>;
  /** The user logged out in this tab: logout wins over any refresh in flight, here and in other tabs. */
  notifyLogout(): void;
  /** Release the channel and listeners (tests; a page never needs it). */
  dispose(): void;
}

const UNAUTHENTICATED: RefreshResult = { status: "unauthenticated" };
const TRANSIENT: RefreshResult = { status: "transient" };

function defaultId(): string {
  // Coordination id only — not a secret. randomUUID where available.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isMessage(data: unknown): data is CoordinationMessage {
  if (!data || typeof data !== "object") return false;
  const { type, ownerId } = data as Record<string, unknown>;
  return (
    typeof ownerId === "string" &&
    (type === "refresh-started" || type === "refresh-succeeded" || type === "refresh-failed" || type === "logged-out")
  );
}

export function createRefreshCoordinator(options: RefreshCoordinatorOptions): RefreshCoordinator {
  const {
    storage,
    tokenKey,
    refreshTokenKey,
    performRefresh,
    leaseMs = 15_000,
    settleMs = 50,
    requestTimeoutMs = 10_000,
    now = Date.now,
    createId = defaultId,
  } = options;

  const ownerId = createId();
  let inFlight: Promise<RefreshResult> | null = null;
  /** Bumped on every logout seen (this tab or another); a run that sees it change gives up. */
  let logoutEpoch = 0;
  let started = false;
  let channel: ChannelLike | null = null;
  let unsubscribeStorage: (() => void) | null = null;
  const waiters = new Set<(message?: CoordinationMessage) => void>();

  function wakeWaiters(message?: CoordinationMessage): void {
    for (const wake of [...waiters]) wake(message);
  }

  function ensureStarted(): void {
    if (started) return;
    started = true;
    try {
      channel = options.createChannel?.() ?? null;
    } catch {
      channel = null;
    }
    if (channel) {
      channel.onmessage = (event) => {
        const message = event.data;
        if (!isMessage(message) || message.ownerId === ownerId) return;
        if (message.type === "refresh-started") return;
        if (message.type === "logged-out") logoutEpoch++;
        wakeWaiters(message);
      };
    }
    unsubscribeStorage =
      options.subscribeStorage?.((key) => {
        if (key !== null && key !== REFRESH_LOCK_KEY && key !== tokenKey && key !== refreshTokenKey) return;
        // Another tab removed the refresh token (logout, or its session died).
        if (key === null || storage.getItem(refreshTokenKey) === null) logoutEpoch++;
        wakeWaiters();
      }) ?? null;
  }

  function readLease(): Lease | null {
    const raw = storage.getItem(REFRESH_LOCK_KEY);
    if (!raw) return null;
    try {
      const lease = JSON.parse(raw) as Partial<Lease>;
      if (
        typeof lease.ownerId === "string" &&
        typeof lease.operationId === "string" &&
        typeof lease.acquiredAt === "number" &&
        typeof lease.expiresAt === "number"
      ) {
        return lease as Lease;
      }
    } catch {
      // Corrupt value: treated as no lease, and overwritten by the next acquirer.
    }
    return null;
  }

  function ownsLease(mine: Lease): boolean {
    const current = readLease();
    return current !== null && current.ownerId === mine.ownerId && current.operationId === mine.operationId;
  }

  function releaseLease(mine: Lease): void {
    if (ownsLease(mine)) storage.removeItem(REFRESH_LOCK_KEY);
  }

  function broadcast(message: CoordinationMessage): void {
    try {
      channel?.postMessage(message);
    } catch {
      // A closed channel must never break a refresh.
    }
  }

  /** Waits until the other tab's lease ends (message, storage change, or expiry). */
  function waitForLease(lease: Lease, deadline: number): Promise<"ended" | "rejected"> {
    return new Promise((resolve) => {
      let done = false;
      const finish = (outcome: "ended" | "rejected") => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        waiters.delete(wake);
        resolve(outcome);
      };
      const wake = (message?: CoordinationMessage) => {
        const rejectedHere =
          message?.type === "refresh-failed" && message.operationId === lease.operationId && message.reason === "rejected";
        finish(rejectedHere ? "rejected" : "ended");
      };
      waiters.add(wake);
      const timer = setTimeout(() => finish("ended"), Math.max(0, Math.min(lease.expiresAt, deadline) - now()) + 25);
    });
  }

  async function coordinate(mine: Lease, epoch: number, failedAccessToken: string | null): Promise<RefreshResult> {
    broadcast({ type: "refresh-started", ownerId, operationId: mine.operationId, at: now() });
    let result: RefreshResult = TRANSIENT;
    let reason: FailureReason = "transient";
    try {
      // Re-read under the lease: a tab that finished just before we took it
      // has already stored fresh tokens — adopt them instead of refreshing.
      const refreshToken = storage.getItem(refreshTokenKey);
      const current = storage.getItem(tokenKey);
      if (logoutEpoch !== epoch || !refreshToken) {
        result = UNAUTHENTICATED;
        reason = "rejected";
      } else if (failedAccessToken && current && current !== failedAccessToken) {
        result = { status: "refreshed", accessToken: current };
      } else {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
        let attempt: RefreshAttempt;
        try {
          attempt = await performRefresh(refreshToken, controller.signal);
        } catch {
          attempt = { kind: "transient" };
        } finally {
          clearTimeout(timer);
        }

        const storedRefresh = storage.getItem(refreshTokenKey);
        if (logoutEpoch !== epoch || storedRefresh !== refreshToken) {
          // Logout won (or the tokens changed under us). Never resurrect a
          // session from a late response; adopt what is stored, if anything.
          const stored = storage.getItem(tokenKey);
          if (logoutEpoch === epoch && storedRefresh && stored) {
            result = { status: "refreshed", accessToken: stored };
          } else {
            result = UNAUTHENTICATED;
            reason = "rejected";
          }
        } else if (attempt.kind === "success") {
          storage.setItem(tokenKey, attempt.accessToken);
          storage.setItem(refreshTokenKey, attempt.refreshToken);
          result = { status: "refreshed", accessToken: attempt.accessToken };
        } else if (attempt.kind === "rejected") {
          // The session is over in every tab. Clear the dead pair BEFORE the
          // lease is released, so a waiting tab — however it is woken (the
          // storage event for the lease can arrive before the broadcast) —
          // finds no refresh token and stops, instead of re-sending it. Only
          // the exact pair that was rejected is cleared, never newer tokens.
          storage.removeItem(tokenKey);
          storage.removeItem(refreshTokenKey);
          result = UNAUTHENTICATED;
          reason = "rejected";
        }
      }
    } catch {
      result = TRANSIENT;
      reason = "transient";
    } finally {
      // Release first, so a waiter woken by the message sees the lease gone.
      releaseLease(mine);
      broadcast(
        result.status === "refreshed"
          ? { type: "refresh-succeeded", ownerId, operationId: mine.operationId, at: now() }
          : { type: "refresh-failed", ownerId, operationId: mine.operationId, at: now(), reason },
      );
    }
    return result;
  }

  async function run(failedAccessToken: string | null): Promise<RefreshResult> {
    const epoch = logoutEpoch;
    const deadline = now() + leaseMs * 2 + requestTimeoutMs;

    while (now() <= deadline) {
      const refreshToken = storage.getItem(refreshTokenKey);
      const current = storage.getItem(tokenKey);
      if (logoutEpoch !== epoch || !refreshToken) return UNAUTHENTICATED;

      // Someone (another tab, or this tab earlier) already replaced the token
      // that failed: use the stored one — never replay the stale refresh token.
      if (failedAccessToken && current && current !== failedAccessToken) {
        return { status: "refreshed", accessToken: current };
      }

      const lease = readLease();
      if (lease && lease.ownerId !== ownerId && lease.expiresAt > now()) {
        const outcome = await waitForLease(lease, deadline);
        if (
          outcome === "rejected" &&
          storage.getItem(refreshTokenKey) === refreshToken &&
          storage.getItem(tokenKey) === current
        ) {
          // The coordinator's server refused this very token; trying it again cannot help.
          return UNAUTHENTICATED;
        }
        continue; // re-read everything
      }

      // No live lease (or a stale one): try to take it, then verify.
      const mine: Lease = { ownerId, operationId: createId(), acquiredAt: now(), expiresAt: now() + leaseMs };
      storage.setItem(REFRESH_LOCK_KEY, JSON.stringify(mine));
      await new Promise((resolve) => setTimeout(resolve, settleMs));
      if (!ownsLease(mine)) continue; // another tab won the race; wait for it next round
      return coordinate(mine, epoch, failedAccessToken);
    }
    return TRANSIENT;
  }

  return {
    refresh(failedAccessToken) {
      ensureStarted();
      if (!inFlight) {
        inFlight = run(failedAccessToken).finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },

    notifyLogout() {
      ensureStarted();
      logoutEpoch++;
      const lease = readLease();
      if (lease && lease.ownerId === ownerId) storage.removeItem(REFRESH_LOCK_KEY);
      broadcast({ type: "logged-out", ownerId, at: now() });
      wakeWaiters();
    },

    dispose() {
      unsubscribeStorage?.();
      unsubscribeStorage = null;
      try {
        channel?.close();
      } catch {
        // ignore
      }
      channel = null;
      started = false;
      wakeWaiters();
    },
  };
}
