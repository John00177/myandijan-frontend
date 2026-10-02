# Phase 15E.4c — Refresh-Token Reuse Detection

**Status: IMPLEMENTED (2026-10-02)** on backend branch `feat/15e4c-refresh-token-reuse-detection`, with a PR to `main`. It is not merged or deployed at the time of writing. See §14 for the implementation record.
- **Owner decisions** (§13):
  - enforce immediately;
  - existing `UPDATE` audit action;
  - revoke only the affected session;
  - no `sessionVersion` bump;
  - harmless races logged with IDs only;
  - no user notification;
  - stale-token logout stays a no-op;
  - an expired rotated token is still reuse;
  - 15E.4d stays deferred.
- **Sections 1–13** are the approved design, kept as written. Where the implementation is more specific, §14 says so.

**Code inspected:**
- **Backend `main` = `12e261d`** (Phase 15E.4b, live as Railway deployment `1df56259-1b64-4cf7-829a-471937f395a4`).
- **Frontend `main` = `add3fbe`** (Phase 15E.4a).

**Out of scope:** 15E.4d (`sid` in access tokens) and 15E.4e (contract) are separate steps.

**Labels:**
- **[VERIFIED]** — read in the code named above.
- **[DESIGN]** — the proposal.
- **[OPEN]** — needs an owner decision.

---

## 1. Verified current implementation (after 15E.4b)

### Refresh — `AuthService.refresh` / `rotateRefreshToken` (`src/auth/auth.service.ts`)
- [VERIFIED] **One interactive Prisma transaction, READ COMMITTED.** The steps:
  1. Look up the token by SHA-256 hash, with no lock.
  2. If it has no session (legacy), attach one with a compare-and-set on `session_id IS NULL`.
  3. **Session lock:** `UPDATE auth_sessions SET last_used_at = now WHERE id = $s AND revoked_at IS NULL AND absolute_expires_at > now`.
  4. **Token compare-and-set:** `UPDATE refresh_tokens SET rotated_at = now, revoked_at = now WHERE id = $t AND session_id = $s AND rotated_at IS NULL AND revoked_at IS NULL AND expires_at > now`.
  5. Check the user is ACTIVE and not deleted.
  6. INSERT the successor with `parent_id = $t`. `parent_id` is UNIQUE.
- [VERIFIED] **Every failure throws `RefreshRejected` and rolls the whole transaction back.** The caller maps it, and a P2002 unique violation, to `401 "Invalid or expired refresh token"`.
  - Unknown token, session revoked or expired, compare-and-set count 0, and inactive user all take this path.
  - **Nothing distinguishes a rotated token from a revoked or expired one, and nothing is logged or audited.**
- [VERIFIED] **Rotation sets `rotated_at` and `revoked_at` together**, so the previous release and a rollback also refuse a rotated token.
  - Logout, password reset and suspension set **only** `revoked_at` on tokens.
  - So `rotated_at IS NOT NULL` ⇔ "consumed by a rotation" — that rule holds for every token issued or rotated by 15E.4b code.
- [VERIFIED] **Old-release tokens:** a token rotated by the *previous* release during the switchover has `revoked_at` set, `rotated_at` NULL and no `parent_id`. It cannot be classified as rotated.

### Grace window — `src/auth/refresh-sessions.ts`
- [VERIFIED] **`isWithinRefreshGraceWindow(token, successor, now)` is true only when all of these hold:**
  - `token.rotated_at` is set;
  - `now − rotated_at` is within `[−MAX_CLOCK_SKEW_MS (5 s), REFRESH_GRACE_WINDOW_MS (10 s)]`;
  - the successor is unused (`successor.rotated_at` NULL).
- [VERIFIED] **Only logout uses it today** (see below). Refresh does not call it.

### Logout — `AuthService.logout` / `endSessionOnLogout`
- [VERIFIED] **Public.** The token may end its session only if it is the session's current token, or its predecessor inside the grace window with the successor unused.
- [VERIFIED] **Entitlement is re-checked under the session lock, on a fresh clock.** If the token is not entitled, the revocation rolls back.
- [VERIFIED] **Revocation:** reason `LOGOUT`; audit row `UPDATE` on `AuthSession` with `{ revoked, reason, tokensRevoked }`.
- [VERIFIED] **Any older token ends nothing.**

### User-wide revocation — `revokeAllUserSessions`
- [VERIFIED] Called by password reset and suspension, after their user-row write (`sessionVersion + 1`). It runs in this order:
  1. legacy session-less tokens;
  2. every unrevoked session (`PASSWORD_RESET` / `SUSPENDED`);
  3. every unrevoked token.

### Schema
- [VERIFIED] **`SessionRevokedReason` already contains `REUSE_DETECTED`.**
- [VERIFIED] **`AuditAction`:** `CREATE, UPDATE, DELETE, APPROVE, REJECT, SUSPEND, RESTORE, LOGIN, ROLE_CHANGE`. There is no `REVOKE`.
- [VERIFIED] **`refresh_tokens.parent_id` is UNIQUE**, and Prisma exposes the successor as the `successor` relation.
- [VERIFIED] **15E.4c needs no migration** with the design below.

### Access tokens — `JwtStrategy`
- [VERIFIED] **Access tokens carry `sv`** (the user's `sessionVersion`) and no `sid`.
- [VERIFIED] **Revoking one session does not end its access tokens.** They live out their ≤ 15 minutes; that is 15E.4d.

### Frontend — `src/lib/auth/refreshCoordinator.ts`, `src/lib/api.ts` (frontend `main`)
- [VERIFIED] **Only one refresh at a time.** Within a tab it's one shared promise, and across tabs a lease in `localStorage` (write, wait 50 ms, re-check). Before refreshing, a tab re-reads storage and adopts tokens another tab stored, never re-sending an older refresh token.
- [VERIFIED] **A `401` from `/auth/refresh` is "rejected".** The tab clears that exact token pair, if storage still holds it, and the user is signed out in every tab.
- [VERIFIED] **Network errors, timeouts (10 s abort), 408, 429 and 5xx are "transient".** The tokens are kept and the next attempt sends the **same** refresh token.
- [VERIFIED] **No other first-party client** of `/auth/refresh` exists in the two repositories.

### Tests and CI
- [VERIFIED] **Two suites:** `npm run test:db` (real PostgreSQL, `test/db/`) and the unit suite.
- [VERIFIED] **CI:** both run in the required `test-and-build` job, with a `postgres:16-alpine` service.
- [VERIFIED] **Lock-forcing helpers** exist in `test/db/support.ts`: `raceAtSessionLock`, `waitForLockWaiters` and `inRolledBackTransaction`.

---

## 2. Threat model

| # | Threat | Today (15E.4b) | With 15E.4c |
|---|---|---|---|
| T1 | An attacker steals a refresh token (XSS — there's no CSP until 15E.6 — malware, a copied browser profile) and replays an **old, already-rotated** one | [VERIFIED] 401, nothing else; harmless but invisible | [DESIGN] 401 **and** the session is revoked and audited (the theft is detected) |
| T2 | An attacker steals the **current** token and refreshes **first**; the victim's next refresh presents the now-rotated token | [VERIFIED] The victim gets 401 and signs in again. **The attacker keeps the session for up to 90 days**, undetected | [DESIGN] The victim's presentation is reuse, outside grace or after the attacker used the successor, so the session is revoked. The attacker loses refresh, and keeps the current access token for ≤ 15 min (until 15E.4d) |
| T3 | The attacker refreshes first and the victim presents the rotated token **within 10 s, before the attacker used the successor** | [VERIFIED] Undetected | [DESIGN] Still undetected — the cost of the grace window. Detected at the victim's next presentation, if that is outside grace |
| T4 | An attacker with an old token uses detection itself to sign the victim out of that device | n/a | [DESIGN] Possible, and accepted. It needs a token stolen from that very session, gains no access, and affects only that session — the standard trade-off of refresh-token reuse detection (RFC 9700, OAuth 2.0 Security BCP, refresh-token protection) |
| T5 | Detection races (two detections, detection versus rotation, logout, reset or suspension) leave a live successor or a double audit | n/a | [DESIGN] Prevented: classification happens under the session lock (§5) |
| T6 | Token material leaks through the detection path (logs, audit, error bodies) | [VERIFIED] No logging in refresh | [DESIGN] IDs only; never raw tokens or hashes (§7) |
| T7 | Timing difference reveals detection to the presenter | n/a | [DESIGN] The reuse path does extra writes and so is measurably slower. Accepted: the presenter learns only that the session is now dead |

---

## 3. Token state machine

The **presented token** is classified **after the session lock is held** (§5). [DESIGN]

| State | Condition | Refresh result (15E.4c) | Side effect |
|---|---|---|---|
| **Unknown** | No row for the hash | 401 | none (rolled back) |
| **Legacy, live** | `session_id` NULL, unrotated, unrevoked, unexpired | Attach a session, then rotate (unchanged) | normal rotation |
| **Legacy, dead** | `session_id` NULL and revoked or expired (incl. rotated by the old release) | 401 | none — cannot be classified |
| **Session dead** | Session revoked, or past `absolute_expires_at` | 401 | none. No second revocation and no audit: the session is already over |
| **Current** | `rotated_at` NULL, `revoked_at` NULL, unexpired | Rotate (unchanged) | normal rotation |
| **Expired (unrotated)** | `rotated_at` NULL, `revoked_at` NULL, `expires_at ≤ now` | 401 | none (idle expiry, not reuse) |
| **Revoked (unrotated)** | `rotated_at` NULL, `revoked_at` set, session live | 401 | none (it can only arise from token-level revocation in a live session — not produced by current code, defensive) |
| **Rotated — benign race** | `rotated_at` set **and** `isWithinRefreshGraceWindow` is true | **401** — the successor is **never** handed out | none (rolled back); one `warn` log line with IDs only |
| **Rotated — reuse** | `rotated_at` set **and** not within grace: older than 10 s, more than 5 s in the future, **or** successor used | 401 | **Revoke this session (`REUSE_DETECTED`) and all its tokens; audit; commit** |

**Notes:**
- [DESIGN] **A rotated token that has also expired is still reuse.** Expiry doesn't make a copy less of a copy, and a legitimate client always holds its latest, unrotated token.
- [DESIGN] **The successor is the unique `parent_id` row.** If it no longer exists (only possible after a future cleanup job, 15E.4e), "unused" is assumed and only the age decides.

---

## 4. Reuse definition

- [DESIGN] **Reuse** = presenting a token with `rotated_at IS NOT NULL` to `/auth/refresh` while its session is live, **unless** the presentation is within the grace window. Within grace means:
  - rotated no more than 10 s ago (and no more than 5 s ahead, for clock skew);
  - **and** its successor has never been used.
- [DESIGN] **A harmless client race** is exactly that grace case: the same client, or another tab of the same browser, sent the token again while the rotation it raced was completing, and nothing has yet advanced the chain.

**The grace window has two different meanings** (explicit decision):
- [VERIFIED] **For logout (15E.4b):** a token inside the window may still **end** its session (sign-out racing the client's own refresh).
- [DESIGN] **For refresh (15E.4c):** a token inside the window only **escapes reuse revocation**. It is still refused with the generic 401.
  - **Refresh never hands out the successor and never issues a second successor.** The one-successor invariant from 15E.4b is untouched.
  - The grace window does not let `/auth/refresh` reuse a rotated token in any way.

**Why a used successor is always reuse, even within 10 s:**
- [DESIGN] **The chain has already advanced past the presented token**, so whoever presents it holds a copy older than the live chain.
- [VERIFIED] **The 15E.4a client** re-reads storage before refreshing and never sends a token older than the stored one.

**Why "outside grace with the successor unused" is also reuse** (re-checked rather than inherited from the 15E.4 design):

The only benign source of this state is a client whose refresh response was lost — a timeout, or the connection dropping after the server committed — that later retries with the same token.
- [VERIFIED] The 15E.4a client classifies that as "transient", keeps the old token, and retries with it later.
- [VERIFIED] **Today (15E.4b) that retry already returns 401**, and the frontend then clears the tokens and signs the user out.
- [DESIGN] **With 15E.4c the user sees exactly the same thing.** The only extra effect is that the server also revokes the session — whose sole live token is the successor that nobody received.

So enforcing this class costs a legitimate user nothing beyond today. Leaving it unenforced keeps T2 open: the attacker-refreshed-first case whenever the attacker hasn't used the successor yet.

---

## 5. Transaction and locking algorithm

The refresh transaction from 15E.4b, with **only step 4 changed**. [DESIGN]

```text
BEGIN  (READ COMMITTED; one interactive Prisma transaction)
1  presented := findUnique(token_hash)                       -- no lock; picks the session only
   none → THROW Rejected                                      -- rollback, 401
2  session_id NULL → attachLegacySession (unchanged; failure → THROW Rejected)
3  SESSION LOCK: n := UPDATE auth_sessions SET last_used_at = now
                    WHERE id = $s AND revoked_at IS NULL AND absolute_expires_at > now
   n = 0 → THROW Rejected                                     -- session dead: no classification, no audit
4  CAS: m := UPDATE refresh_tokens SET rotated_at = now, revoked_at = now
             WHERE id = $t AND session_id = $s AND rotated_at IS NULL
               AND revoked_at IS NULL AND expires_at > now
   m = 1 → steps 5–6 of 15E.4b unchanged (user check, successor INSERT) → COMMIT → 200
   m = 0 → CLASSIFY, still holding the session lock:
      t    := SELECT rotated_at, revoked_at, expires_at, successor.rotated_at
              FROM refresh_tokens WHERE id = $t               -- fresh statement snapshot
      at   := new Date()                                      -- fresh clock, read AFTER t
      t.rotated_at NULL                    → THROW Rejected    -- expired or revoked: not reuse
      isWithinRefreshGraceWindow(t, t.successor, at)
                                           → log BENIGN; THROW Rejected   -- rollback, 401
      otherwise (REUSE):
         s := UPDATE auth_sessions SET revoked_at = now, revoked_reason = 'REUSE_DETECTED'
              WHERE id = $s AND revoked_at IS NULL            -- 1 row: we hold its lock
         k := UPDATE refresh_tokens SET revoked_at = now
              WHERE session_id = $s AND revoked_at IS NULL    -- fresh snapshot: catches every successor
         INSERT audit_logs (...)                              -- §7
         RETURN { kind: 'reuse' }                             -- COMMIT (must NOT throw)
COMMIT → the caller maps 'reuse' to the same 401 as Rejected; logs REUSE (IDs only)
```

**Why this cannot introduce a race:**
- [DESIGN] **Classification happens only after step 3 matched**, i.e. while this transaction holds the session row lock. Every other writer of that session's state takes the same lock first: rotation of the successor, logout, a second detection, reset and suspension. Their decisions are serialized with ours.
- [DESIGN] **Detection versus the legitimate rotation of the successor:**
  - if that rotation committed first, the successor is used → reuse → our token sweep (a fresh snapshot) revokes the brand-new successor too;
  - if we commit first, that refresh's step 3 matches nothing → 401.
  - Either way, no live token survives a detection.
- [DESIGN] **Concurrent detections:** the first commits. The others then fail step 3 (session revoked) → plain 401. **Exactly one revocation and one audit row.**
- [DESIGN] **Detection versus logout:**
  - logout first → session revoked (`LOGOUT`) → detection fails step 3;
  - detection first → logout's session UPDATE matches nothing → it returns.
  - The first reason wins and is never overwritten.
- [DESIGN] **Detection versus reset or suspension:** those lock the user row, then the legacy tokens, then sessions, then tokens.
  - If detection holds the session lock, the reset's session UPDATE waits, then skips the already-revoked session. Its token sweep finds nothing live.
  - If the reset holds the session first, detection fails step 3. The final state is all revoked in both orders.
  - Lock order is unchanged — session before tokens; refresh never locks the user row — so no deadlock is introduced.
- [DESIGN] **Fresh clock:** the grace decision reads `new Date()` **after** re-reading the token. The `rotated_at` of a rotation that just committed was stamped by another request's clock — the defect the logout fix (15E.4b R1) already found.
- [DESIGN] **The benign path rolls back**, including step 3's `last_used_at` write. **The reuse path commits**, so it must return a result rather than throw. This is the one structural change to `rotateRefreshToken`.
- [DESIGN] **No raw SQL:** all statements are Prisma `updateMany` / `findUnique` / `create`, with the same single-statement conditional-UPDATE semantics verified in 15E.4b.

---

## 6. Session revocation policy

| Option | Effect | Decision |
|---|---|---|
| Revoke only the presented token | Already dead (rotated); achieves nothing | Rejected [DESIGN] |
| **Revoke the affected session and all its tokens** | Removes the copied chain from whoever holds it; this device signs in again | **Chosen** [DESIGN] |
| Revoke all of the user's sessions | Ends unrelated devices whose tokens were never exposed; lets anyone holding one old token log the user out everywhere | Rejected [DESIGN] |
| Bump `sessionVersion` | Kills every access token of **every** device at once; others recover with one refresh. A user-wide, attacker-triggerable side effect | Rejected for 15E.4c. [VERIFIED] The approved 15E.4b decisions already say no permanent global `sessionVersion` bump for reuse |
| Per-session access-token kill | The right tool for the ≤ 15 min access-token tail | Belongs to **15E.4d** (`sid`) |

**Effect on the user's other devices:**
- [DESIGN] **None.** Each sign-in is its own `auth_sessions` row with unrelated tokens. Detection revokes rows `WHERE session_id = $s` only.
- [DESIGN] **`sessionVersion` is untouched**, so other devices' access tokens keep working.
- [DESIGN] **Evidence:** one session's chain was copied. Other devices hold different secrets and were not shown to be exposed. Revoking them would hand an attacker holding one old token a "log out everywhere" button (T4 amplified).
- [DESIGN] **What the affected device sees:**
  - its current access token keeps working for ≤ 15 min (until 15E.4d);
  - its next refresh gets 401, so the 15E.4a client clears the pair and the user signs in again.
- [DESIGN] **The attacker** loses refresh at the same moment, and keeps their access token for ≤ 15 min.

---

## 7. Audit model

| Field | Value |
|---|---|
| `action` | [DESIGN] `UPDATE` — the same as the 15E.4b logout revocation, so revocations are audited one way and **no migration** is needed. [OPEN-2] a dedicated `AuditAction` value instead |
| `entityType` / `entityId` | [DESIGN] `'AuthSession'` / the revoked session's id |
| `actorId` / `actorRole` | [DESIGN] The session's user and that user's role, as for logout: the account whose credential was presented. It is **not** a claim that this user acted; the `note` says so |
| `before` | [DESIGN] `{ revoked: false }` |
| `after` | [DESIGN] `{ revoked: true, reason: 'REUSE_DETECTED', tokensRevoked, presentedTokenId, successorUsed, rotatedAgoMs }`. **Row ids and numbers only** |
| `note` | [DESIGN] `'Refresh-token reuse detected — session revoked'` |
| `requestId`, `ipAddress`, `userAgent` | [DESIGN] From `auditRequestFields()`: the **presenting** request, often the attacker's, which is the forensic value |

**Never recorded:**
- [DESIGN] raw refresh tokens, token hashes, access tokens or request bodies, anywhere — audit, logs, error bodies;
- [DESIGN] the IP or user agent in log lines (they live only in the audit row, which has its own retention).

**Logs, not audit:**
- [DESIGN] **Reuse:** `logger.warn('Refresh-token reuse detected', { sessionId, userId, requestId })`.
- [DESIGN] **Benign race:** `logger.warn('Refresh-token grace-window race', { sessionId, requestId })`. No audit row: no state change, and audit volume stays meaningful. [OPEN-3] whether to keep this line. *(As implemented: reuse at `warn`, harmless race at `log`/info; see §14.)*

**Querying:**
- [VERIFIED] The existing `GET /admin/audit` already filters by `entityType` and `actorId`, so detections are reviewable without new endpoints.
- [DESIGN] No new endpoint, role or capability is added.

---

## 8. API behaviour

| Case | Status | Body |
|---|---|---|
| Successful rotation | 200 | unchanged `{ user, accessToken, refreshToken }` [VERIFIED/DESIGN] |
| Unknown, expired, revoked, session dead, inactive user, **benign race**, **reuse** | **401** | `{"message":"Invalid or expired refresh token","error":"Unauthorized","statusCode":401}` — byte-identical for all [DESIGN] |
| Malformed body | 400 | unchanged validation [VERIFIED] |
| Rate limited | 429 | unchanged (refresh: 120/min/IP) [VERIFIED] |

- [DESIGN] **No new status code or header.** No `WWW-Authenticate` detail. The response must not reveal detection.
- [DESIGN] **Logout is unchanged.** It does not run reuse detection, and a stale token there remains a no-op. [OPEN-4] treating stale-token logout as a reuse signal.
- [VERIFIED] **No frontend change is needed:** a 401 already ends the client's session (§1). [DESIGN] 15E.4c ships backend-only.

---

## 9. Concurrency and behaviour test matrix (real PostgreSQL, `test/db/`)

Forced orderings reuse the 15E.4b techniques:
- holding the session row with `FOR UPDATE` and waiting for N blocked backends in `pg_stat_activity`;
- an uncommitted placeholder row with the same `parent_id`, to stop a refresh at its successor INSERT;
- direct row updates for age and clock control, or a faked Date.

| # | Scenario | Expected |
|---|---|---|
| C1 | Legitimate chain R1→R2→R3→R4 | All 200; no session revoked; no reuse audit (regression) |
| C2 | R1 presented 11 s after rotation, successor unused | 401; session `REUSE_DETECTED`; every token revoked; 1 audit row; R2 now 401 |
| C3 | R1 presented within 10 s, successor unused (benign race) | 401; session live; R2 still refreshes; no audit; `last_used_at` unchanged (rolled back) |
| C4 | R1 presented within 10 s, **successor used** | 401; reuse; session revoked; R3 dead |
| C5 | R1 presented with `rotated_at` 6 s in the future (beyond skew) | Reuse |
| C6 | R1 presented with `rotated_at` 2 s in the future (within skew), successor unused | Benign |
| C7 | **Attacker uses stolen R1 while the legitimate client refreshes R2** (both held at the session lock; both orders) | Exactly one outcome per order; finally the session is revoked, no live token, 1 audit row |
| C8 | **Attacker refreshed first** (R1→R2 by attacker), victim later presents R1 outside grace | Victim 401; session revoked; attacker's R2 now 401 |
| C9 | **Two tabs**: concurrent R1 + R1 (held at the lock) | One 200 (R2), one 401 benign; session live; R2 works |
| C10 | Legitimate client double-sends R1 (unsynchronised, 25 rounds) | Exactly one successor; never a revocation |
| C11 | **10 concurrent reuse attempts** of an old R1 (held at the lock) | Exactly 1 revocation, exactly 1 audit row, all 401 |
| C12 | Reuse racing **logout** of the current token (both orders, forced) | Session revoked by the first; the reason is the first one's; no live token; ≤ 1 audit row per mechanism |
| C13 | Reuse racing **password reset** (forced at the session lock, both orders) | All sessions and tokens revoked; `sessionVersion + 1`; no live token |
| C14 | Reuse racing **suspension** (same) | Same; reinstatement revives nothing |
| C15 | Rotated token presented after its session was revoked (logout / reset / earlier reuse) | 401; no new audit row; reason unchanged |
| C16 | Rotated token presented after the session's absolute expiry | 401; no reuse action |
| C17 | Expired, never-rotated token | 401; no reuse action (idle expiry) |
| C18 | Legacy token rotated by the old release (`revoked_at` set, `rotated_at` NULL) | 401; no reuse action |
| C19 | Legacy token attached and rotated by the new code, then replayed outside grace | Reuse (it is a normal rotated token) |
| C20 | Other device: sessions A and B; reuse in A | A revoked; B refreshes normally; `sessionVersion` unchanged; B's access token still valid |
| C21 | Logout with a token inside / outside grace after 15E.4c | 15E.4b behaviour unchanged (R1 tests keep passing) |
| C22 | **No token leakage:** capture stdout/stderr, Prisma query params and all rows of `refresh_tokens`, `auth_sessions`, `audit_logs` during C2/C3/C7/C11 | No raw token appears anywhere; no token hash in audit or log text; assertions compare booleans and counts only |
| C23 | Response uniformity | C2, C3, C15 and an unknown token produce byte-identical 401 bodies |
| C24 | Mutation checks | Removing the classification (always reject) fails C2/C4/C7/C8/C11; removing the grace check fails C3/C9; making the reuse path throw (rollback) fails C2 |

Plus unit tests for the pure classifier (state table §3) and the existing 15E.4b suites unchanged. [DESIGN]

---

## 10. Migration and rollback

- [VERIFIED] **No schema change:** `REUSE_DETECTED`, `rotated_at`, `parent_id UNIQUE`, the `successor` relation and `audit_logs` all exist.
- [DESIGN] **A code-only deploy** through the existing gate: PR → `test-and-build` (unit + PostgreSQL) → merge → Railway "wait for CI".
- [DESIGN] **Rollback** = revert the PR.
  - Sessions already revoked with `REUSE_DETECTED` stay revoked. The 15E.4b code treats them as revoked, so there's no corruption and no resurrection.
  - Nothing to migrate back.
- [DESIGN] **Forward compatibility:**
  - 15E.4d (`sid`) will make detection also kill the session's access tokens immediately, with no change here;
  - 15E.4e (NOT NULL, legacy removal) deletes rows C18/C19 depend on, and those tests go with it.
- [DESIGN] **Data that exists before the 15E.4c deploy is classified the same way.** Every token rotated by 15E.4b code since `12e261d` went live has `rotated_at` set, so a stolen copy of one becomes detectable the moment 15E.4c is live. No backfill is needed.

---

## 11. Observe-only vs enforcement

**The earlier plan** (15E.4 §14) was 7 days of shadow mode before enforcing. It assumed rotation-race false positives were unknown and the frontend was uncoordinated. Re-checked against what is live now:

1. [VERIFIED] **The frontend is coordinated** (15E.4a, live since `add3fbe`). Concurrent presentations of one token by the same browser are milliseconds apart, so the grace window classifies them as benign — and benign is never revoked.
2. [VERIFIED] **The only remaining benign source of a rotated token outside grace is the lost-response retry.** Under 15E.4b that retry **already** gets 401, and the client **already** signs the user out.
   - [DESIGN] Enforcement changes nothing the legitimate user sees. It only also revokes a session whose live token nobody legitimate holds.
3. [DESIGN] **A used successor has no benign explanation** on a coordinated client: the chain advanced past the presented token.
4. [DESIGN] **Observation would prove little.** Rotation went live only today (2026-10-02), traffic is small, and 7 days of near-zero events can't show a low false-positive rate.
   - Meanwhile T2 stays open: an attacker who refreshed first keeps the session for up to 90 days.
5. [DESIGN] **Observe mode doesn't fit the audit model** either. An `UPDATE` audit row with no state change would mislead; observe-only would need log-only reporting, and logs are ephemeral on Railway.
6. [DESIGN] **The worst case of a false positive is small:** one device signs in again. Rollback is a code revert (minutes, through the gate).

**Recommendation: [DESIGN] enforce immediately when 15E.4c ships.** No observe-only period, and no runtime flag — the revert is the kill switch, so no production environment variable needs changing.
- **Conservative alternative, [OPEN-1]:** an observe-only first release, log-only with no audit and no revocation, followed by a second PR that enforces. It costs one extra release cycle and leaves T2 open for its duration.

---

## 12. Implementation plan (for the implementation phase — not now)

1. [DESIGN] **`src/auth/refresh-sessions.ts`:**
   - add a pure `classifyRotatedPresentation(token, successor, now)` returning `'not-rotated' | 'benign-race' | 'reuse'`, built on `isWithinRefreshGraceWindow`;
   - add `revokeSessionForReuse(tx, sessionId, now)`, which revokes the session (`REUSE_DETECTED`, `WHERE revoked_at IS NULL`) and then its tokens, and returns `{ tokensRevoked }`.
2. [DESIGN] **`src/auth/auth.service.ts`, `rotateRefreshToken`:**
   - on compare-and-set count 0, re-read the token with `successor`, classify on a fresh clock;
   - `reuse` → revoke + audit and **return** `{ kind: 'reuse' }` (commit);
   - everything else → throw `RefreshRejected` (rollback).
   - `refresh()` maps `reuse` to the same `UnauthorizedException(INVALID_REFRESH_MESSAGE)` after the commit, and writes the warn log with IDs.
3. [DESIGN] **Unchanged:** logout, reset, suspension, the controller, throttles, DTOs, the schema, migrations, CI, the frontend.
4. [DESIGN] **Tests:** the §9 matrix in `test/db/refresh-sessions.db-spec.ts` (or a new `test/db/reuse-detection.db-spec.ts`), plus unit tests for the classifier; the existing 15E.4b tests must keep passing.
5. [DESIGN] **Docs:** mark 15E.4c IMPLEMENTED in `PHASE_15E4_REFRESH_TOKEN_ARCHITECTURE.md` and add a decision record.
6. [DESIGN] **Ship:** one branch and PR; CI green; owner merges; post-deploy read-only verification (deployment, logs, the generic-401 smoke check).
7. [DESIGN] **Follow-up:** schedule 15E.4d next. Until `sid` exists, a detected attacker keeps a ≤ 15-min access-token tail.

---

## 13. Open decisions

| # | Decision | Recommendation |
|---|---|---|
| OPEN-1 | Enforce immediately, or ship observe-only first? | **Enforce immediately** (§11) |
| OPEN-2 | Audit action: reuse `UPDATE` (no migration, matches logout), or add `AuditAction.REVOKE` / `SECURITY_ALERT` (an additive enum migration) | **`UPDATE`** now; revisit if security reporting needs a distinct action |
| OPEN-3 | Log benign grace-window races (one warn line, IDs only)? | **Yes**, for the first weeks — the cheap way to see whether races happen at all |
| OPEN-4 | Should logout with a stale (reused) token also trigger reuse revocation? | **No** in 15E.4c: keep logout's 15E.4b semantics; detection lives in refresh |
| OPEN-5 | Treat an **expired** rotated token as reuse? | **Yes** (§3) |
| OPEN-6 | Notify the user (email or SMS) on detection? | **Not now:** SMS is not configured in production, and no notification channel exists |
| OPEN-7 | Bump `sessionVersion` on reuse to cut the access-token tail before 15E.4d? | **No** — the approved 15E.4b decision; fix it properly with 15E.4d |

---

## 14. Implementation record (Phase 15E.4c)

[VERIFIED] backend branch `feat/15e4c-refresh-token-reuse-detection`, based on `main` `12e261d`.

**Code**
- **`src/auth/refresh-sessions.ts`:**
  - `classifyRotatedPresentation(token, successor, now)` returns `'not-rotated' | 'benign-race' | 'reuse'`, built on the unchanged `isWithinRefreshGraceWindow` (10 s of age, 5 s of future skew, successor unused);
  - `revokeSessionForReuse(tx, sessionId, now)` revokes the session (`REUSE_DETECTED`, `WHERE revoked_at IS NULL`), then its tokens.
- **`src/auth/auth.service.ts`:**
  - `rotateRefreshToken` returns `{ kind: 'rotated' } | { kind: 'reuse' }`.
  - When the compare-and-set fails, `handleRotatedPresentation` runs while the transaction still holds the live session's lock. It re-reads the token and its `successor`, then classifies on a clock read after that re-read:
    - `not-rotated` → throw (rollback) → 401;
    - `benign-race` → throw (rollback) → 401;
    - `reuse` → revoke + audit, **commit**, then `refresh()` raises the same 401.
  - A rotated token never reaches the successor INSERT.
- **Unchanged:** logout, password reset, suspension, the controller, throttles, DTOs, the schema and migrations, CI, and the frontend.

**Audit** — one row per detection:
- **Fields:** `action: UPDATE`, `entityType: 'AuthSession'`, `entityId` = session, `actorId`/`actorRole` = the session's user.
- **Payload:** `before: { revoked: false }`; `after: { revoked: true, reason: 'REUSE_DETECTED', tokensRevoked, presentedTokenId, successorUsed, rotatedAgoMs }`; `note: 'Refresh-token reuse detected — session revoked'`.
- **Request metadata:** request ID, IP and bounded user agent from the request context.
- **Never present:** a token, a token hash, an authorization header, an OTP, a password or a secret.

**Logs** — IDs only. The levels differ slightly from §7, which said `warn` for both:
- **Reuse:** `warn` — `Refresh-token reuse detected; session revoked (session=… token=… user=… request=…)`.
- **Harmless race:** `log` — `Refresh grace-window race refused (session=… token=… request=…)`. Logged after the rollback, at info level, because it is expected traffic.

**Tests**
- **Unit:** 989/989 (+5 classifier tests in `src/auth/refresh-sessions.spec.ts`).
- **Real PostgreSQL:** 65/65, three consecutive local runs.
  - 26 new tests in `test/db/reuse-detection.db-spec.ts` cover the owner's 21 required behavioural cases.
  - Forced orders where order matters: refresh × refresh, reuse × logout, reuse × password reset and reuse × suspension, each in both orders, with the waiting order observed in `pg_stat_activity`. Plus 10 concurrent reuse attempts.
  - Grace boundaries are pinned with a faked clock: exactly 10 s → race; 10 s + 1 ms → reuse; 5 s ahead → race; 5 s + 1 ms ahead → reuse.
- **One existing test changed deliberately:** a rotated token whose successor was used. Logout with it still ends nothing, but refresh with it is now reuse.
- **Mutation checks:**
  - reuse enforcement removed (reuse treated as a plain 401) → 17 of the 26 new tests fail;
  - grace classification removed (every rotated token is reuse) → 10 of 65 fail;
  - restored → all pass.

**Not implemented:** 15E.4d (`sid` access-token enforcement) and 15E.4e (contract). The ≤ 15-min access-token tail after a revocation remains, as designed.

---

**15E.4c DESIGN VERDICT: APPROVE WITH DECISIONS** (decisions taken — see Status).

The design needs **no schema change, no frontend change and no new endpoint**. It reuses the 15E.4b session lock, so detection is serialized with rotation, logout, reset and suspension. Before implementation, OPEN-1 (enforce immediately vs observe-only) and OPEN-2 (audit action) need an owner decision; the rest have recommended defaults.
