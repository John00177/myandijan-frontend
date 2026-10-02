import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRefreshCoordinator,
  REFRESH_LOCK_KEY,
  type ChannelLike,
  type CoordinationMessage,
  type RefreshAttempt,
  type RefreshCoordinator,
} from "../refreshCoordinator";

// Phase 15E.4a. One simulated browser: a localStorage shared by every tab
// (writes fire `storage` events in the OTHER tabs, asynchronously, like a
// real browser), a BroadcastChannel hub (optional, to test the fallback), and
// a fake /auth/refresh server that counts calls. jsdom runs every "tab" in one
// thread, so these tests prove the coordination protocol and its interleavings;
// they do not drive real browser processes.

const TOKEN = "myandijan_token";
const REFRESH = "myandijan_refresh_token";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type Perform = (refreshToken: string, signal: AbortSignal) => Promise<RefreshAttempt>;

const opened: RefreshCoordinator[] = [];

function createBrowser({ broadcast = true }: { broadcast?: boolean } = {}) {
  const data = new Map<string, string>([
    [TOKEN, "access-1"],
    [REFRESH, "refresh-1"],
  ]);
  const storageListeners = new Map<number, (key: string | null) => void>();
  const channels = new Map<number, ChannelLike>();
  const sent: CoordinationMessage[] = [];
  let nextTab = 0;
  const later = (fn: () => void) => setTimeout(fn, 0);

  function storageFor(tab: number, staleFirstLockRead: boolean): Storage {
    let staleReads = staleFirstLockRead ? 1 : 0;
    const notify = (key: string | null) => {
      for (const [id, listener] of storageListeners) if (id !== tab) later(() => listener(key));
    };
    return {
      get length() {
        return data.size;
      },
      key: (index: number) => [...data.keys()][index] ?? null,
      getItem: (key: string) => {
        if (key === REFRESH_LOCK_KEY && staleReads > 0) {
          staleReads--;
          return null; // this tab read "no lock" before the other tab's write became visible
        }
        return data.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        data.set(key, String(value));
        notify(key);
      },
      removeItem: (key: string) => {
        if (data.delete(key)) notify(key);
      },
      clear: () => {
        data.clear();
        notify(null);
      },
    };
  }

  function openTab(
    performRefresh: Perform,
    { staleFirstLockRead = false, leaseMs = 300 }: { staleFirstLockRead?: boolean; leaseMs?: number } = {},
  ) {
    const id = nextTab++;
    const storage = storageFor(id, staleFirstLockRead);
    const coordinator = createRefreshCoordinator({
      storage,
      tokenKey: TOKEN,
      refreshTokenKey: REFRESH,
      performRefresh,
      leaseMs,
      settleMs: 10,
      requestTimeoutMs: 200,
      createChannel: broadcast
        ? () => {
            const channel: ChannelLike = {
              onmessage: null,
              postMessage: (message) => {
                sent.push(message);
                for (const [other, target] of channels) {
                  if (other !== id) later(() => target.onmessage?.({ data: structuredClone(message) }));
                }
              },
              close: () => {
                channels.delete(id);
              },
            };
            channels.set(id, channel);
            return channel;
          }
        : () => null,
      subscribeStorage: (listener) => {
        storageListeners.set(id, listener);
        return () => storageListeners.delete(id);
      },
    });
    opened.push(coordinator);
    return { storage, coordinator };
  }

  return { data, sent, channels, openTab };
}

/** A fake POST /auth/refresh. Rotates refresh-N → refresh-(N+1) on success. */
function createServer(outcome?: (refreshToken: string, call: number) => RefreshAttempt | Promise<RefreshAttempt>) {
  const calls: string[] = [];
  const perform = vi.fn(async (refreshToken: string, _signal: AbortSignal): Promise<RefreshAttempt> => {
    calls.push(refreshToken);
    await sleep(20);
    if (outcome) return outcome(refreshToken, calls.length);
    const n = Number(refreshToken.split("-")[1]) + 1;
    return { kind: "success", accessToken: `access-${n}`, refreshToken: `refresh-${n}` };
  });
  return { calls, perform };
}

afterEach(() => {
  for (const coordinator of opened.splice(0)) coordinator.dispose();
});

describe("refresh coordinator — single tab", () => {
  it("A: one refresh, both new tokens persisted, lease released", async () => {
    const browser = createBrowser();
    const server = createServer();
    const { coordinator } = browser.openTab(server.perform);

    await expect(coordinator.refresh("access-1")).resolves.toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(server.calls).toEqual(["refresh-1"]);
    expect(browser.data.get(TOKEN)).toBe("access-2");
    expect(browser.data.get(REFRESH)).toBe("refresh-2");
    expect(browser.data.has(REFRESH_LOCK_KEY)).toBe(false);
  });

  it("B: 10 concurrent callers in one tab share ONE refresh", async () => {
    const browser = createBrowser();
    const server = createServer();
    const { coordinator } = browser.openTab(server.perform);

    const results = await Promise.all(Array.from({ length: 10 }, () => coordinator.refresh("access-1")));
    expect(server.calls).toEqual(["refresh-1"]);
    expect(new Set(results.map((r) => JSON.stringify(r)))).toEqual(new Set([JSON.stringify({ status: "refreshed", accessToken: "access-2" })]));
  });

  it("no stored refresh token → unauthenticated, no request", async () => {
    const browser = createBrowser();
    browser.data.delete(REFRESH);
    const server = createServer();
    const { coordinator } = browser.openTab(server.perform);
    await expect(coordinator.refresh("access-1")).resolves.toEqual({ status: "unauthenticated" });
    expect(server.calls).toEqual([]);
  });

  it("H: a token already replaced (by another tab) is adopted without calling the server", async () => {
    const browser = createBrowser();
    browser.data.set(TOKEN, "access-2");
    browser.data.set(REFRESH, "refresh-2");
    const server = createServer();
    const { coordinator } = browser.openTab(server.perform);
    await expect(coordinator.refresh("access-1")).resolves.toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(server.calls).toEqual([]);
  });

  it("H: a rejected refresh whose tokens were replaced meanwhile adopts the stored pair instead of logging out", async () => {
    const browser = createBrowser();
    const server = createServer(() => {
      browser.data.set(TOKEN, "access-9");
      browser.data.set(REFRESH, "refresh-9");
      return { kind: "rejected" };
    });
    const { coordinator } = browser.openTab(server.perform);
    await expect(coordinator.refresh("access-1")).resolves.toEqual({ status: "refreshed", accessToken: "access-9" });
  });

  it("a hanging refresh is aborted at the request timeout → transient, lease released", async () => {
    const browser = createBrowser();
    let aborted = false;
    const perform: Perform = (_rt, signal) =>
      new Promise((resolve) => {
        signal.addEventListener("abort", () => {
          aborted = true;
          resolve({ kind: "transient" });
        });
      });
    const { coordinator } = browser.openTab(perform);
    await expect(coordinator.refresh("access-1")).resolves.toEqual({ status: "transient" });
    expect(aborted).toBe(true);
    expect(browser.data.has(REFRESH_LOCK_KEY)).toBe(false);
    expect(browser.data.get(REFRESH)).toBe("refresh-1"); // a transient failure keeps the session
  });

  it("an exception inside the refresh never leaves a lease behind", async () => {
    const browser = createBrowser();
    const { coordinator } = browser.openTab(async () => {
      throw new Error("boom");
    });
    await expect(coordinator.refresh("access-1")).resolves.toEqual({ status: "transient" });
    expect(browser.data.has(REFRESH_LOCK_KEY)).toBe(false);
  });
});

describe("refresh coordinator — across tabs", () => {
  it("C: five tabs refreshing at once → exactly ONE /auth/refresh; every tab gets the new token", async () => {
    const browser = createBrowser();
    const server = createServer();
    const tabs = Array.from({ length: 5 }, () => browser.openTab(server.perform));

    const results = await Promise.all(tabs.map((tab) => tab.coordinator.refresh("access-1")));
    expect(server.calls).toEqual(["refresh-1"]); // the stale token is redeemed once, never replayed
    for (const result of results) expect(result).toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(browser.data.get(REFRESH)).toBe("refresh-2");
  });

  it("C: two tabs that both read 'no lock' before either wrote → still exactly ONE refresh", async () => {
    const browser = createBrowser();
    const server = createServer();
    const a = browser.openTab(server.perform, { staleFirstLockRead: true });
    const b = browser.openTab(server.perform, { staleFirstLockRead: true });

    const [ra, rb] = await Promise.all([a.coordinator.refresh("access-1"), b.coordinator.refresh("access-1")]);
    expect(server.calls).toEqual(["refresh-1"]);
    expect(ra).toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(rb).toEqual({ status: "refreshed", accessToken: "access-2" });
  });

  it("D: a waiting tab re-reads the shared token and never redeems the stale refresh token", async () => {
    const browser = createBrowser();
    const server = createServer();
    const a = browser.openTab(server.perform);
    const b = browser.openTab(server.perform);

    const first = a.coordinator.refresh("access-1");
    await sleep(15); // A holds the lease and is mid-request
    const second = b.coordinator.refresh("access-1");
    await expect(first).resolves.toEqual({ status: "refreshed", accessToken: "access-2" });
    await expect(second).resolves.toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(server.calls).toEqual(["refresh-1"]);
  });

  it("E: the coordinator fails transiently → a waiting tab recovers with its own refresh", async () => {
    const browser = createBrowser();
    const server = createServer((_rt, call) =>
      call === 1 ? { kind: "transient" } : { kind: "success", accessToken: "access-2", refreshToken: "refresh-2" },
    );
    const a = browser.openTab(server.perform);
    const b = browser.openTab(server.perform);

    const first = a.coordinator.refresh("access-1");
    await sleep(15);
    const second = b.coordinator.refresh("access-1");
    await expect(first).resolves.toEqual({ status: "transient" });
    await expect(second).resolves.toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(server.calls).toEqual(["refresh-1", "refresh-1"]);
  });

  it("E: the coordinator's token is REJECTED → waiting tabs end the session without re-sending the dead token", async () => {
    const browser = createBrowser();
    const server = createServer(() => ({ kind: "rejected" }));
    const tabs = Array.from({ length: 3 }, () => browser.openTab(server.perform));

    const results = await Promise.all(tabs.map((tab) => tab.coordinator.refresh("access-1")));
    for (const result of results) expect(result).toEqual({ status: "unauthenticated" });
    expect(server.calls).toEqual(["refresh-1"]);
    expect(browser.data.has(TOKEN)).toBe(false); // the dead pair is cleared for every tab
    expect(browser.data.has(REFRESH)).toBe(false);
  });

  it("F: a stale lease from a vanished tab is taken over once it expires", async () => {
    const browser = createBrowser();
    const t0 = Date.now();
    browser.data.set(
      REFRESH_LOCK_KEY,
      JSON.stringify({ ownerId: "closed-tab", operationId: "op", acquiredAt: t0 - 1000, expiresAt: t0 + 120 }),
    );
    const server = createServer();
    const { coordinator } = browser.openTab(server.perform);

    await expect(coordinator.refresh("access-1")).resolves.toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(100); // waited for the lease, did not jump it
    expect(server.calls).toEqual(["refresh-1"]);
  });

  it("F: an already-expired lease is taken over immediately", async () => {
    const browser = createBrowser();
    browser.data.set(
      REFRESH_LOCK_KEY,
      JSON.stringify({ ownerId: "closed-tab", operationId: "op", acquiredAt: 0, expiresAt: Date.now() - 1 }),
    );
    const server = createServer();
    const { coordinator } = browser.openTab(server.perform);
    const t0 = Date.now();
    await expect(coordinator.refresh("access-1")).resolves.toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(Date.now() - t0).toBeLessThan(150);
  });

  it("G: logout in another tab wins over a refresh in flight — the late response is discarded", async () => {
    const browser = createBrowser();
    let release!: (attempt: RefreshAttempt) => void;
    const calls: string[] = [];
    const perform: Perform = (rt) => {
      calls.push(rt);
      return new Promise((resolve) => (release = resolve));
    };
    const a = browser.openTab(perform);
    const b = browser.openTab(perform);

    const inFlight = a.coordinator.refresh("access-1");
    await sleep(25); // A is waiting on the server
    // Tab B logs out (what AuthContext.logout does: clear storage, then notify).
    b.storage.removeItem(TOKEN);
    b.storage.removeItem(REFRESH);
    b.coordinator.notifyLogout();
    await sleep(5);
    release({ kind: "success", accessToken: "access-2", refreshToken: "refresh-2" });

    await expect(inFlight).resolves.toEqual({ status: "unauthenticated" });
    expect(browser.data.has(TOKEN)).toBe(false); // not resurrected
    expect(browser.data.has(REFRESH)).toBe(false);
    expect(browser.data.has(REFRESH_LOCK_KEY)).toBe(false);
    await expect(a.coordinator.refresh("access-1")).resolves.toEqual({ status: "unauthenticated" });
    expect(calls).toEqual(["refresh-1"]); // no refresh after logout
  });

  it("G: logout in the SAME tab wins too", async () => {
    const browser = createBrowser();
    let release!: (attempt: RefreshAttempt) => void;
    const { storage, coordinator } = browser.openTab(() => new Promise((resolve) => (release = resolve)));

    const inFlight = coordinator.refresh("access-1");
    await sleep(25);
    storage.removeItem(TOKEN);
    storage.removeItem(REFRESH);
    coordinator.notifyLogout();
    release({ kind: "success", accessToken: "access-2", refreshToken: "refresh-2" });
    await expect(inFlight).resolves.toEqual({ status: "unauthenticated" });
    expect(browser.data.has(TOKEN)).toBe(false);
  });

  it("G: a tab WAITING for another tab's refresh stops waiting on logout", async () => {
    const browser = createBrowser();
    const a = browser.openTab(() => new Promise(() => {})); // never answers
    const b = browser.openTab(createServer().perform);

    void a.coordinator.refresh("access-1");
    await sleep(15);
    const waiting = b.coordinator.refresh("access-1");
    await sleep(5);
    b.storage.removeItem(TOKEN);
    b.storage.removeItem(REFRESH);
    b.coordinator.notifyLogout();
    const t0 = Date.now();
    await expect(waiting).resolves.toEqual({ status: "unauthenticated" });
    expect(Date.now() - t0).toBeLessThan(100);
  });

  it("K: without BroadcastChannel (storage events only) five tabs still refresh exactly once, woken promptly", async () => {
    const browser = createBrowser({ broadcast: false });
    const server = createServer();
    const tabs = Array.from({ length: 5 }, () => browser.openTab(server.perform, { leaseMs: 2000 }));

    const t0 = Date.now();
    const results = await Promise.all(tabs.map((tab) => tab.coordinator.refresh("access-1")));
    expect(server.calls).toEqual(["refresh-1"]);
    for (const result of results) expect(result).toEqual({ status: "refreshed", accessToken: "access-2" });
    expect(Date.now() - t0).toBeLessThan(1000); // woken by the storage event, not the 2 s lease timer
    expect(browser.sent).toEqual([]);
  });

  it("J: coordination messages carry no token, password or OTP — only type, ids, timestamp, reason", async () => {
    const browser = createBrowser();
    const server = createServer();
    const tabs = Array.from({ length: 3 }, () => browser.openTab(server.perform));
    await Promise.all(tabs.map((tab) => tab.coordinator.refresh("access-1")));
    tabs[0].coordinator.notifyLogout();

    expect(browser.sent.length).toBeGreaterThan(0);
    const wire = JSON.stringify(browser.sent);
    for (const secret of ["access-1", "access-2", "refresh-1", "refresh-2"]) expect(wire).not.toContain(secret);
    for (const message of browser.sent) {
      for (const key of Object.keys(message)) expect(["type", "ownerId", "operationId", "at", "reason"]).toContain(key);
    }
  });

  it("dispose() closes the tab's channel and listeners", () => {
    const browser = createBrowser();
    const { coordinator } = browser.openTab(createServer().perform);
    void coordinator.refresh("access-1");
    expect(browser.channels.size).toBe(1);
    coordinator.dispose();
    expect(browser.channels.size).toBe(0);
  });
});
