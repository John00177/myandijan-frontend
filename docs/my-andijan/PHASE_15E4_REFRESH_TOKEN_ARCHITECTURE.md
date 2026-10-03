# Phase 15E.4 — Refresh-Token Families, Reuse Detection & Race Protection

**Status (updated 2026-10-03):**

| Step | What | Status |
|---|---|---|
| **15E.4a** | Frontend cross-tab refresh coordination | **LIVE** — frontend PR #4, merged as `add3fbe` (see §18) |
| **15E.4b** | Backend sessions/families, race-safe rotation, 90-day absolute lifetime, session-wide `@Public` logout, session-level reset/suspension revocation, expand migration + backfill, real-PostgreSQL CI tests | **LIVE** — backend PR #4, merged as `12e261d` (see §18) |
| **15E.4c** | Reuse detection: session revocation on reuse | **LIVE** — backend PR #5, merged as `2dc5dc4`; see `PHASE_15E4C_REUSE_DETECTION_ARCHITECTURE.md` |
| **15E.4d** | `sid` claim and per-request session check of access tokens | **LIVE** — 15E.4d.1 merged as `253ede8`, 15E.4d.2 (mandatory `sid`) as `06d6de9`; see `PHASE_15E4D_ACCESS_TOKEN_SESSION_BINDING_ARCHITECTURE.md` |
| **15E.4e** | Contract: `session_id NOT NULL`, drop the legacy path and unused columns | **15E.4e.1 IMPLEMENTED** on backend branch `feat/15e4e1-refresh-token-contract-cleanup` (not merged, not deployed); **15E.4e.2 PENDING** (≥ 24 h soak after 15E.4e.1 is live). See `PHASE_15E4E_CONTRACT_CLEANUP_ARCHITECTURE.md` |

Sections 1–17 are the design as written before implementation. Where 15E.4b deliberately differs from it, §18 says so. The later steps have their own documents (above).

**Code inspected for the design (sections 1–17):**
- Backend `main` = `41ee971`. Its application code is identical to `c048ff9`; the only difference since then is `CLAUDE.md`.
- Frontend `main` = `e7e194f`.

Labels used throughout:
- **[VERIFIED]** — read in the current code.
- **[DECISION]** — proposed design, needs approval.
- **[OPEN]** — needs an owner or architect answer.

---

## 1. Executive summary

Today a refresh token is an opaque random string, stored only as a SHA-256 hash, valid for 30 days by default. It rotates on every use. But:

1. **The rotation is not atomic.** It reads the token, revokes it unconditionally, then creates a new one, with no transaction and no compare-and-set. Two concurrent refreshes with the same token **both succeed** and leave **two valid successors**.
2. **There is no session or family concept.** A stolen token that was rotated earlier simply returns 401, so theft is never detected or contained.
3. **Sessions are effectively endless.** Every rotation grants another 30 days, so a session used at least monthly never expires.
4. **Logout does not work on the server once the access token has expired.** The frontend's server-side revoke silently fails, and the refresh token stays valid until it expires.
5. **The browser has no coordination between tabs.** A refresh failure in one tab clears the storage every tab shares.

Proposed design:

- **One session row per login (device),** in a new `auth_sessions` table. Each refresh token belongs to exactly one session, and that session is the family.
- **Race-safe rotation** in one transaction:
  1. lock the session row with a conditional `UPDATE`;
  2. compare-and-set the presented token (`rotated_at IS NULL`);
  3. insert the successor with `parent_id = predecessor.id`, where `parent_id` is **UNIQUE**. That gives a database-level guarantee that **one token can never have two successors**.
- **Reuse detection.** Presenting a token that was already rotated, outside a short grace window, revokes **that session only** and writes an audit row. Other devices are unaffected.
- **Absolute session lifetime** on top of the per-token idle expiry.
- **Logout revokes the whole session** and works with an expired access token.
- **A frontend cross-tab lock must ship first.** Otherwise reuse detection would log out users who have several tabs open.
- **Migration is expand, then backfill, then contract.** No forced logout is required.

---

## 2. Current implementation findings [VERIFIED]

| Topic | Finding | Where |
|---|---|---|
| Generation | `crypto.randomBytes(48).toString('hex')` — 384-bit opaque token, not a JWT | `auth.service.ts` `issueTokens` |
| Storage | Only `sha256(token)` in `refresh_tokens.token_hash` (`@unique`). The raw token is never stored | `issueTokens`, `hashToken` |
| Model | `RefreshToken { id, userId, tokenHash @unique, expiresAt, revokedAt?, userAgent?, ipAddress?, createdAt }`, indexes `userId`, `expiresAt`, `onDelete: Cascade` from User. `userAgent` / `ipAddress` are **never written** | `prisma/schema.prisma` |
| Expiry | `JWT_REFRESH_EXPIRES_IN` (default `30d`; the production value exists as a variable but was not read). The **new** token gets a fresh full TTL on every rotation → sliding, no absolute limit | `issueTokens`, `addDuration` |
| Rotation | `findUnique(tokenHash)` → checks (`!revokedAt`, not expired, user ACTIVE and not deleted) → `update({ where: { id }, data: { revokedAt: now } })` with **no condition on `revokedAt`** → `issueTokens()` creates a new row. **No transaction** | `auth.service.ts` `refresh()` |
| Concurrency | Two requests with R1 both pass the read, both `update` (it is unconditional, so both succeed), and both insert a successor → **two valid refresh tokens from one predecessor**. Nothing in the schema prevents it | as above |
| Session / family | **None.** There is no session ID or family ID, and tokens have no link to each other. Each login creates an unrelated row | schema |
| Multiple devices | Implicitly supported: every login adds a row and nothing is revoked on login | `login`, `verifyOtp`, `register` |
| Logout | `POST /auth/logout` is `@Authenticated()` (needs a valid access token). It hashes the body's `refreshToken` and runs `updateMany({ tokenHash, revokedAt: null } → revokedAt)`. It revokes **only that token**, does **not** check that the token belongs to the caller, and always returns `{ success: true }` | `auth.controller.ts`, `auth.service.ts` |
| Access tokens | JWT (`sub`, `phone`, `role`, `sv`), 15 minutes. `JwtStrategy.validate` reloads the user **on every request** and rejects unless the user is ACTIVE, not deleted, and `payload.sv === user.sessionVersion`. Access tokens can be revoked **per user** (by bumping `sv`), **not per session** | `jwt.strategy.ts` |
| Password reset | In one transaction: new hash, `sessionVersion++`, `refreshToken.updateMany({ userId, revokedAt: null })`, audit row `UserCredentials` (`sessionsRevoked: n`) | `auth.service.ts` `resetPassword` (15E.2) |
| Suspension | In one transaction: `status = SUSPENDED`, `sessionVersion++`, revoke every unrevoked token of the user, audit row (`sessionsRevoked`). Reinstating does not bring tokens back | `admin.service.ts` `suspendUser` |
| Refresh vs `sv` | `refresh()` does not compare `sv`. It relies on revocation, and issues the new access token with the current `sv` | `refresh()` |
| Rate limit | `/auth/refresh`: 120 per minute per IP (in memory); phone bucket skipped | `auth-throttle.ts` |
| Cleanup | No job deletes expired or revoked rows (no `@nestjs/schedule`, no cron) | repo-wide search |
| Audit model | `AuditLog { actorId?, action: AuditAction, entityType, entityId Int?, before?, after?, note?, actorRole?, requestId?, ipAddress?, userAgent?, createdAt }`. `AuditAction` = CREATE, UPDATE, DELETE, APPROVE, REJECT, SUSPEND, RESTORE, **LOGIN (defined, never used)**, ROLE_CHANGE. Request context (`auditRequestFields()`) supplies IP, user agent and request ID | schema, `request-context.ts` |
| DB access style | Prisma 5.22 interactive `$transaction(async tx => …)` is used elsewhere. There is no `SELECT … FOR UPDATE` and no explicit isolation level anywhere → Postgres default **READ COMMITTED** | repo-wide search |
| Tests | `session-security.spec.ts` covers suspension, reset and reinstatement against an in-memory fake. **No test covers a concurrent refresh.** CI has **no Postgres** (all tests use mocks or fakes) | specs, `ci.yml` |

**Frontend [VERIFIED] (`src/lib/api.ts`, `src/contexts/AuthContext.tsx`):**
- **Storage:** both tokens are in `localStorage` (`myandijan_token`, `myandijan_refresh_token`), shared by every tab.
- **Refresh:** `refreshAccessToken()` is single-flight **per tab only**, through a module-level promise. It reads the refresh token, POSTs `{ refreshToken }`, and stores **both** new tokens from `{ accessToken, refreshToken }`. Any non-OK response returns `null`, with no retry.
- **On 401:** each request helper refreshes **once**. If that fails it calls `handleUnauthorized`, which **clears all three keys** and fires `SESSION_EXPIRED_EVENT`. There is no refresh loop.
- **Between tabs:** no coordination — no `storage` listener, `BroadcastChannel` or `navigator.locks`.
- **Logout:** `logout()` fires `revokeSession(refreshToken)` without awaiting it, then clears storage. `revokeSession` goes through `authedJson`. If the access token has expired, the 401 triggers `refreshAccessToken()`, which now finds no refresh token in storage → no retry → **the server-side revoke never happens**.
- **JWT handling:** the frontend never decodes the access token, so new claims are invisible to it.

**[OPEN]**
- The production value of `JWT_REFRESH_EXPIRES_IN`. Only its name is known.
- The current number of production users and refresh-token rows. SECURITY §1.1 recorded 13 users on 2026-09-28, which may be stale. No database query was made.

---

## 3. Threat model

| # | Scenario | Today [VERIFIED] | Required behaviour [DECISION] |
|---|---|---|---|
| A | Normal refresh R1 | R1 revoked, R2 issued (unrelated row) | R1 marked rotated; R2 issued **in the same session**; R2's expiry is no later than the session's absolute expiry |
| B | Attacker uses R1 **after** the victim rotated R1→R2 | 401, nothing else happens. If the attacker raced **first**, the attacker owns the chain for up to 30 days and the victim's later 401 is indistinguishable from expiry | Detect reuse (R1 has `rotated_at` and is outside the grace window) → **revoke the session** (R2 included) and write an audit row. Both the attacker and the victim lose that session; the victim signs in again |
| C | Two concurrent refreshes with R1 | **Both succeed → two valid successors** | Exactly one wins. The loser gets 401, with **no new token** and no revocation if inside the grace window (§7). The database makes a second successor impossible |
| D | R1 → R2, then R1 again (deterministic) | 401 | Outside grace → reuse → session revoked. Inside grace and R2 unused → 401 and a warning log only (a benign race). Decided under the session row lock (§6), so the outcome is deterministic |
| E | Token from an already revoked session | 401 | 401. Nothing more to revoke; no new audit row, to avoid noise |
| F | Multiple devices | Every login is an independent row | **Each login = its own session (family).** Reuse or logout on device A never touches device B. Only password reset, suspension or admin action revoke **all** of a user's sessions |
| G | Logout | Revokes one token; needs a valid access token; fails silently once the access token has expired | Revoke the **whole session** of the presented refresh token. The endpoint must work **without** a valid access token: possession of the refresh token is the proof. Always 200 |
| H | Password reset | Revoke all of the user's tokens and bump `sv` (one transaction) | Revoke **all of the user's sessions** (reason `PASSWORD_RESET`) and their tokens, and bump `sv`. One transaction |
| I | Suspension | Same as H, done by an admin | Revoke all sessions (reason `SUSPENDED`) and bump `sv`. Refresh also rejects non-ACTIVE users regardless |
| J | Stolen **access** token | Valid until expiry (≤ 15 minutes) unless `sv` is bumped (which affects all devices) | Phase 15E.4d: an `sid` claim plus a per-request session check, so revoking a session kills its access tokens immediately (§8) |

---

## 4. Proposed token-family architecture [DECISION]

- **Session = family.** A session is created at every successful login (`login`, `register`, `verifyOtp`). Every refresh token carries the ID of its session. Rotation creates a successor **in the same session**, and nothing ever moves a token between sessions.
- **The session row is the serialization point.** Every operation that changes a session's tokens (rotate, revoke for reuse, logout, reset, suspension) first takes the session row's lock through a conditional `UPDATE`. That serializes rotation against revocation, so no successor can slip past a revocation.
- **The token row is the compare-and-set point.** `rotated_at IS NULL` is the condition that lets exactly one request rotate a given token.
- **The database is the backstop.** `refresh_tokens.parent_id UNIQUE` means a second successor of the same token cannot be inserted, even if the application logic were wrong.
- **No in-memory locking.** All coordination is in Postgres, so it is correct with any number of replicas.

Why a separate table rather than a `family_id` column on `refresh_tokens`:
- Revoking a family by `updateMany(family_id)` races with a concurrent rotation that inserts a new token after the update's snapshot. Avoiding that needs a lock target, and a session row is the natural one.
- One row per device holds the absolute expiry, the revocation reason and device metadata, and provides an integer `entityId` for `AuditLog`.

---

## 5. Proposed database model [DECISION]

### New table `auth_sessions`

| Field | Why | Security property | Necessary? |
|---|---|---|---|
| `id Int @id @default(autoincrement())` | Family identity; fits `AuditLog.entityId Int`; later the `sid` claim | Groups tokens for containment | **Yes** |
| `userId Int` (FK → users, `onDelete: Cascade`, indexed) | User-wide revocation (reset, suspension) | Scoped revocation | **Yes** |
| `createdAt DateTime @default(now())` | Forensics; the base for the absolute expiry | Audit trail | **Yes** |
| `absoluteExpiresAt DateTime` | Hard maximum session length | Ends endless sliding sessions | **Yes** ([OPEN] duration) |
| `revokedAt DateTime?` | Family revocation in a single row | Containment that is atomic under the lock | **Yes** |
| `revokedReason SessionRevokedReason?` (enum `LOGOUT`, `REUSE_DETECTED`, `PASSWORD_RESET`, `SUSPENDED`, `ADMIN`, `LEGACY_MIGRATION`) | Explains why; drives the audit record and support | Forensics; the response stays uniform | **Yes** (small enum) |
| `lastUsedAt DateTime @default(now())` | Updated by the lock `UPDATE` on each refresh (that update must write something); idle visibility; a future device list | Serialization side-effect, observability | **Yes** (it is the lock write) |
| `userAgent String? @db.VarChar(500)`, `ipAddress String? @db.VarChar(45)` | Taken from the request context at login; device list and incident review | Forensics | Optional. [OPEN] — personal data, recommend keeping (already modelled on `refresh_tokens`, unused) |

Indexes: `@@index([userId])`, `@@index([userId, revokedAt])`.

### Changes to `refresh_tokens`

| Field | Why | Security property | Necessary? |
|---|---|---|---|
| `sessionId Int` (FK → auth_sessions, `onDelete: Cascade`, indexed) | Token → family | Family membership | **Yes** (nullable during migration, then NOT NULL) |
| `rotatedAt DateTime?` | Marks a token as used by rotation, as distinct from revoked | The compare-and-set column; the basis for reuse detection and the grace window | **Yes** |
| `parentId Int? @unique` (self-reference to the predecessor) | The chain link; the successor lookup used by the grace check | **The database forbids two successors** | **Yes** |
| `tokenHash @unique`, `expiresAt`, `revokedAt`, `createdAt`, `userId` | Unchanged. `userId` is kept for compatibility (it could be derived from the session later) | — | Keep |
| `userAgent`, `ipAddress` | Superseded by the session-level fields | — | Leave unused; drop in the contract step ([OPEN]) |

**Rejected:**
- `replacedById` — duplicates `parentId` and costs an extra write.
- A separate JTI — the row `id` already identifies the token.
- `reuseDetectedAt` — covered by `revokedReason = REUSE_DETECTED` plus `revokedAt`.
- A per-token `revokedReason` — the reason lives on the session.

---

## 6. Exact race-safe refresh algorithm [DECISION]

Input: the presented raw token `T`. Let `H = sha256(T)`. Everything below runs in **one interactive Prisma transaction** at READ COMMITTED (the Postgres default), with Prisma's default timeouts.

```text
BEGIN
 1. tok := SELECT id, session_id, user_id, rotated_at, revoked_at, expires_at
           FROM refresh_tokens WHERE token_hash = H            -- no lock
    IF none                     → COMMIT; 401                   (unknown token)

 2. -- Serialize on the family. Blocks while another tx holds this session row.
    n := UPDATE auth_sessions SET last_used_at = now()
         WHERE id = tok.session_id AND revoked_at IS NULL AND absolute_expires_at > now()
    IF n = 0                    → COMMIT; 401                   (session revoked or expired)

 3. -- Compare-and-set on the token (rechecked after the lock: Postgres re-evaluates
    -- the WHERE clause against the latest committed row version).
    m := UPDATE refresh_tokens SET rotated_at = now()
         WHERE id = tok.id AND rotated_at IS NULL AND revoked_at IS NULL AND expires_at > now()

 4. IF m = 1:                                                   -- WINNER
      user := SELECT … FROM users WHERE id = tok.user_id
      IF user not ACTIVE or deleted → ROLLBACK; 401             (rotation undone)
      INSERT refresh_tokens(session_id, user_id, token_hash = sha256(T2), parent_id = tok.id,
                            expires_at = LEAST(now() + idleTtl, session.absolute_expires_at))
                            -- parent_id UNIQUE: a duplicate successor raises P2002
      COMMIT; sign the access JWT; return { user, accessToken, refreshToken: T2 }

 5. IF m = 0:                                                   -- LOSER or REUSE
      cur := SELECT rotated_at, revoked_at, expires_at FROM refresh_tokens WHERE id = tok.id
      IF cur.revoked_at IS NOT NULL OR cur.expires_at <= now()  → COMMIT; 401
      -- cur.rotated_at IS NOT NULL: the token was already rotated
      child := SELECT rotated_at FROM refresh_tokens WHERE parent_id = tok.id
      IF now() - cur.rotated_at <= GRACE AND child.rotated_at IS NULL:
           log warn REFRESH_RACE {userId, sessionId, requestId}; COMMIT; 401   (benign race)
      ELSE:                                                    -- REUSE DETECTED
           UPDATE auth_sessions SET revoked_at = now(), revoked_reason = 'REUSE_DETECTED'
                  WHERE id = tok.session_id AND revoked_at IS NULL
           UPDATE refresh_tokens SET revoked_at = now()
                  WHERE session_id = tok.session_id AND revoked_at IS NULL
           INSERT audit_logs(...)                              -- §9
           COMMIT; 401
```

**Why it is safe under concurrency.**
- **Two requests with R1.** Both reach step 2. The second blocks on the session-row lock until the first commits. When it resumes, step 3 re-evaluates `rotated_at IS NULL`, which is now false, so `m = 0` and it goes to step 5. Exactly one successor exists.
- **The backstop.** Even if step 2 were removed, step 3's compare-and-set alone lets only one transaction set `rotated_at`, because Postgres row-level update conflicts serialize the two updates. And the `parent_id UNIQUE` insert makes a second successor impossible.
- **Rotation against revocation** (reuse, logout, reset, suspension). Every revocation path also locks session rows first. A revocation that runs after a rotation commits sees and revokes the successor. A rotation that runs after a revocation fails step 2.
- **Lock order** is always session row(s) first, then token rows, which avoids deadlocks. User-wide revocation updates the sessions with `ORDER BY id`, or through a raw `UPDATE … WHERE id IN (SELECT … ORDER BY id FOR UPDATE)`, to keep a stable order.
- **Isolation.** READ COMMITTED is enough because every decision is made by a conditional `UPDATE` (atomic, rechecked after the lock), never by a read followed by a separate write. SERIALIZABLE is not needed and would add retry handling.
- **Prisma mapping.** `tx.authSession.updateMany(...)` and `tx.refreshToken.updateMany(...)` return a count, which is exactly the compare-and-set result. `tx.refreshToken.create` raises P2002 on a duplicate successor, which is mapped to 401.

**Legacy tokens** (a `sessionId` of NULL, during migration step 1 only): inside the same transaction, first create a session for the token (`INSERT auth_sessions` …, `UPDATE refresh_tokens SET session_id = new WHERE id = tok.id AND session_id IS NULL`). If that update affects 0 rows, another request attached a session first: re-read and continue with that session.

---

## 7. Reuse-detection algorithm [DECISION]

| Presented token state (under the lock) | Response | Side effect |
|---|---|---|
| Unknown hash | 401 | none |
| Session revoked or past its absolute expiry | 401 | none |
| Token revoked (logout, family revoke, reset, suspension) | 401 | none |
| Token expired (idle) | 401 | none |
| Token rotated **≤ GRACE ago** and its successor **not yet used** | 401 | `REFRESH_RACE` warning log (no audit row, no revoke) |
| Token rotated, and (**> GRACE ago** or successor already used) | 401 | **Revoke the session and all its tokens**, audit `REUSE_DETECTED` |

**Why revoke the session and not just R1, or not all sessions:**
- **Not R1 alone.** R1 is already unusable. The real risk is that the *current* token (R2, R3 …) is held by whichever party won the race, and the server cannot tell which party is the attacker. Revoking the family removes it from both. The victim signs in again; the attacker cannot.
- **Not all of the user's sessions.** Reuse shows that **this device's** chain was copied. Other devices hold unrelated secrets, and revoking them would let an attacker log a user out everywhere just by replaying one token. A global response is reserved for password reset, suspension and admin action.
- **Access tokens.** Until 15E.4d, the family's current access token stays valid for at most 15 minutes. Optionally, reuse detection can also bump `sessionVersion`: it kills every outstanding access token at once, and other devices recover with one transparent refresh. That is a [OPEN] trade-off, pending `sid`.

**The grace window ([OPEN], recommended 10 s with the "successor unused" condition):**
- **What it absorbs:** a legitimate client that sends the same token twice, for example two tabs on a browser without the cross-tab lock, or a retried request. It does this without destroying the session the other tab is using.
- **Cost:** an attacker who replays a stolen token **within 10 s of the victim's own refresh, before the victim uses the successor**, is not *detected*. But the attacker also gains nothing: they get a 401 and no tokens.
- **Residual risk:** if the attacker refreshes **first** and the victim replays within 10 s, the victim gets a 401 and the attacker keeps the session undetected until the attacker's next refresh is compared, or until the absolute expiry. That needs a stolen token **and** a replay inside a 10-second window aligned with the victim's own refresh. Shortening GRACE narrows it; GRACE = 0 removes it but makes every lost response or multi-tab race a session kill.

---

## 8. Revocation behaviour [DECISION]

| Trigger | Sessions affected | Tokens | `sessionVersion` | Audit |
|---|---|---|---|---|
| Logout | the presented token's session (`LOGOUT`) | all of that session's tokens | unchanged | `UPDATE` AuthSession, reason LOGOUT |
| Reuse detected | that session (`REUSE_DETECTED`) | all of that session's tokens | [OPEN] (optional bump) | `UPDATE` AuthSession, reason REUSE_DETECTED |
| Password reset | **all** of the user's sessions (`PASSWORD_RESET`) | all | +1 (existing) | existing `UserCredentials` row; `sessionsRevoked` = number of sessions |
| Suspension | **all** (`SUSPENDED`) | all | +1 (existing) | existing suspension row; `sessionsRevoked` |
| Absolute expiry | lazily: refresh fails at step 2 | — | — | none |

**Logout endpoint [DECISION]:**
- **Authentication:** change `POST /auth/logout` from `@Authenticated()` to `@Public()` and authenticate by **possession of the refresh token**. This fixes the verified failure when the access token has expired.
- **Behaviour:** lock the session, revoke it and its tokens, and always return 200 `{ success: true }`, including for unknown or revoked tokens, so it reveals nothing.
- **Throttling:** add a throttle (IP bucket).
- **Required care:** this changes the committed route-authorization snapshot (`authenticated` → `public`), which needs a deliberate snapshot update and review.

**Access-token revocation per session (Phase 15E.4d) [DECISION]:**
- **Claim:** add an `sid` claim to new access tokens.
- **Check:** `JwtStrategy.validate`, which already loads the user, also loads the session by primary key and rejects if it is revoked or expired.
- **Legacy tokens:** access tokens without `sid` stay valid until they expire (≤ 15 minutes), the same compatibility pattern as `sv` in 15B.
- **Effect:** logout and reuse revocation then end that device's access token immediately, with no impact on other devices.

---

## 9. Security and audit events [DECISION]

Use the existing `AuditLog` with `entityType = 'AuthSession'` and `entityId = session.id`. `actorId` and `actorRole` are the session's user, or the admin for suspension. `ipAddress`, `userAgent` and `requestId` come from `auditRequestFields()`. **Never record** raw tokens, token hashes or access tokens. Session and token row IDs are allowed.

| Event | Record? | Action / form | `after` payload |
|---|---|---|---|
| Session created (login, register, OTP verify) | **Yes** | `AuditAction.LOGIN` (exists, unused) | `{ sessionId, method: 'password' \| 'otp' \| 'register' }` |
| Refresh success / rotation | **No audit row** (volume) | `session.lastUsedAt` only | — |
| Benign concurrent race | Log only | `logger.warn('REFRESH_RACE', { userId, sessionId, requestId })` | — |
| Reuse detected → family revoked | **Yes** | `UPDATE` (or a new `REVOKE` enum value, [OPEN]) | `{ revoked: true, reason: 'REUSE_DETECTED', tokensRevoked: n }` and a `logger.warn` line |
| Logout | **Yes** | `UPDATE` | `{ revoked: true, reason: 'LOGOUT' }` |
| Password reset / suspension | Existing rows | unchanged entities | add `sessionsRevoked` (number of sessions) |

---

## 10. API behaviour [DECISION]

The request and response formats are **unchanged**: `POST /auth/refresh { refreshToken }` returns 200 `{ user, accessToken, refreshToken }`.

| Case | HTTP | Body message |
|---|---|---|
| Expired, unknown, rotated, revoked token; revoked or expired session; suspended, deleted or inactive user; lost race; reuse | **401** | `Invalid or expired refresh token` (identical for all — no theft or reuse oracle) |
| Rate limited | 429 | existing throttler message |
| Malformed body | 400 | existing validation |
| Logout (any token state) | 200 | `{ success: true }` |

Distinguishing these cases with different status codes would tell an attacker whether a replayed token was detected. All cases therefore return 401, and only the server-side audit records the difference.

---

## 11. Frontend compatibility analysis

[VERIFIED] The backend changes need **no API or format change** in the frontend. The frontend never decodes the JWT, so an added `sid` claim is invisible to it.

**But one frontend change is required before reuse revocation is enabled [DECISION].** Without cross-tab coordination:
- Tabs A and B both read R1 and refresh at the same time.
- With GRACE, B gets a 401 → `handleUnauthorized` **clears the shared storage** → **every tab is logged out**, even though A holds a valid R2.
- Without GRACE, B's request also **revokes the session** server-side.

Required frontend change (15E.4a), small and contained to `refreshAccessToken()`:
1. **Cross-tab lock.** Wrap the refresh in `navigator.locks.request('myandijan-refresh', …)` where available. Inside the lock, **re-read** `myandijan_refresh_token`. If it differs from the token that produced the 401, another tab has already rotated: use the stored access token without calling `/auth/refresh`.
2. **Adopt rather than log out.** On any refresh failure, re-read storage before giving up. If the refresh token changed while the request was in flight, adopt the stored pair and retry once, instead of calling `handleUnauthorized`.
3. **Keep:** single-flight within a tab, one refresh attempt per request, and no retry loop. The existing protection against refresh loops stays in place.
4. **No logout change** is needed once the endpoint is `@Public` (§8). The existing call succeeds even with an expired access token.

Browsers without `navigator.locks` fall back to step 2 plus the server's grace window.

---

## 12. Migration strategy [DECISION]

There are production refresh tokens today (count [OPEN]), so the migration runs as expand, then backfill, then contract, matching Railway's rollout. The new container runs `prisma migrate deploy` while the **old container keeps serving** until the new one is healthy.

1. **Expand (with 15E.4b code).**
   - **Schema:** create `auth_sessions`; add `refresh_tokens.session_id` (NULLABLE, FK), `rotated_at`, and `parent_id` (UNIQUE, NULLABLE); add the enum.
   - **Backfill in the same migration SQL:**
     - each **active** token (`revoked_at IS NULL AND expires_at > now()`) gets its own session, with `created_at = token.created_at` and `absolute_expires_at = token.created_at + ABSOLUTE_TTL` (if that is already past, use `token.expires_at` so nobody is logged out by the migration);
     - inactive tokens keep `session_id` NULL.
   - **Rows written by the old code during the switchover** have a NULL `session_id` and are handled by the lazy path (§6).
   - **Result:** no forced logout, and no deleted rows.
2. **Contract (separate deploy, after the old code is gone).**
   - Attach any remaining active NULL tokens.
   - Give inactive legacy tokens a per-user revoked session (`LEGACY_MIGRATION`) or delete them ([OPEN]; delete is simpler, and both return 401).
   - Then set `session_id NOT NULL` and remove the lazy path.

**Alternative:** revoke every refresh token once (a forced re-login). It is simpler and removes all legacy state, at the cost of every user signing in again. It is reasonable if the user count is still small ([OPEN]).

---

## 13. Test strategy [DECISION]

**Unit tests** (mocked or in-memory, in the existing suites):
- **Basics:** the token is 96 hex characters; only its SHA-256 is persisted; the raw token never appears in a DB call, a log or an audit payload.
- **Session creation:** login, register and OTP each create one session plus one token, with the session's `absoluteExpiresAt`.
- **Rotation:** sets `rotatedAt`; the successor has `parentId` and the same `sessionId`; its expiry is no later than the session's absolute expiry.
- **Expiry and revocation:** an idle-expired token gets 401; an absolute-expired session gets 401; a revoked token or session gets 401.
- **Reuse, outside GRACE:** the session and all its tokens are revoked, and one audit row is written with no token or hash in it.
- **Reuse, inside GRACE with the successor unused:** 401 with no revocation, and a warning log only.
- **Uniformity:** every failure has the same status and message.

**Integration tests** (the real `AuthService` plus revocation paths, as in `session-security.spec.ts`):
- normal refresh; the old token is rejected and the new one accepted;
- logout revokes the whole session and works with an **expired access token**;
- password reset and suspension revoke all sessions and their tokens; reinstating revives nothing;
- **multi-session:** devices A and B; revoking A (logout or reuse) leaves B refreshing normally.

**Concurrency tests — the most important.** They must run against **real Postgres**, because fakes cannot prove row-lock semantics.
- **Two simultaneous refreshes with the same R1.** Expected: **exactly one** 200 with R2, **one** 401, and **exactly one** row with `parent_id = R1.id` and `revoked_at IS NULL`. Repeat the test N times (for example 50) to shake out ordering.
- **N = 10 concurrent requests:** still exactly one successor.
- **Rotation racing logout or reset:** the final state has no unrevoked token in a revoked session.
- **Constraint backstop:** a direct second insert with the same `parent_id` fails with P2002.

[OPEN] CI has no database. Recommended: a `services: postgres` container in `ci.yml` for a separate `test:db` job. It needs no secrets, and `permissions: contents: read` is unchanged. This is a workflow change, so it needs approval.

---

## 14. Rollout / deployment strategy [DECISION]

Each step is its own PR and goes through the existing gates (PR → `test-and-build` → merge → Railway "Wait for CI" / Vercel Deployment Check).

1. **15E.4a (frontend).** Cross-tab refresh lock and adopt-on-failure. No backend dependency, safe on its own.
2. **15E.4b (backend, expand).**
   - Schema and backfill migration; sessions at login; the race-safe rotation (§6); absolute lifetime; `@Public` session-wide logout; reset and suspension revoke sessions; audit events.
   - **Reuse handling in shadow mode:** detect and log/audit `REUSE_DETECTED_SHADOW` but **do not revoke**, for an observation period, to measure false positives from real clients.
3. **15E.4c (backend).** Enable revocation on reuse once shadow data shows no false positives that would affect users.
4. **15E.4d (backend).** The `sid` claim and the per-request session check (access tokens revocable per session).
5. **15E.4e (backend, contract).** Set `session_id` NOT NULL; drop the lazy path and the unused token columns; optionally add an expired-row cleanup job.

**Rollback:**
- 4b is additive (new table and nullable columns). Rolling back the code leaves an unused schema; the old code ignores the new columns.
- 4c and 4d are code-only switches.
- 4e is the only step that is not reversible, so it comes last.

---

## 15. Security trade-offs

| Choice | Benefit | Cost |
|---|---|---|
| Revoke the session on reuse (not just the token, not the whole user) | Contains a stolen chain whoever holds it; replay cannot log the user out everywhere | The victim's device is signed out too |
| Grace window (10 s, successor unused) | No session kills from multi-tab or retried refreshes | A narrow undetected-replay window (§7) |
| Uniform 401 | No reuse/theft oracle | Clients cannot tell an expired session from a revoked one (UX copy stays generic) |
| `@Public` logout | Works after the access token expires; possession of the refresh token is a stronger proof | Changes the route snapshot; needs a throttle |
| Absolute lifetime | Bounds the life of a stolen chain | Long-lived users must re-authenticate periodically |
| No audit row per refresh | Avoids audit-table bloat | Refresh history only via `lastUsedAt` |
| Tokens in `localStorage` (unchanged here) | No change to the auth transport | XSS can still steal tokens. Families **contain** theft (the next legitimate refresh trips reuse detection) but don't prevent it; CSP is 15E.6 |

---

## 16. Open questions (need a decision before implementation)

1. **Absolute session lifetime:** recommend 90 days. Also confirm the idle TTL (production `JWT_REFRESH_EXPIRES_IN`; the code default is 30 days).
2. **Grace window:** recommend 10 s with "successor unused"; alternatives are 0–30 s.
3. **Should reuse detection also bump `sessionVersion`** (immediate kill of every access token, transparent re-refresh on other devices) until `sid` lands in 15E.4d?
4. **Migration:** backfill (no forced logout, recommended), or revoke every token once? Inactive legacy rows: delete, or attach to a `LEGACY_MIGRATION` session?
5. **Session metadata:** store `userAgent` / `ipAddress` per session (personal data, with a retention period), yes or no?
6. **Audit action** for revocations: reuse `UPDATE`, or add an `AuditAction.REVOKE` enum value?
7. **CI Postgres service** for the concurrency tests (a workflow change)?
8. **Shadow-mode length** before enabling revocation on reuse (recommend 7 days).
9. **Logout change** (`@Authenticated` → `@Public`, authenticated by the refresh token): approve the route-snapshot change.
10. **Current production user and token counts:** needs a read-only query by an authorized method.

---

## 17. Recommended implementation sequence

1. **15E.4a** frontend cross-tab lock and adopt-on-failure, with tests (multi-tab simulation with a mocked `navigator.locks`).
2. **15E.4b** backend expand:
   - migration plus backfill; session creation at login;
   - the race-safe rotation, including the lazy legacy path;
   - absolute lifetime; session-wide `@Public` logout; reset and suspension at session level; audit;
   - reuse handling in **shadow mode**;
   - the Postgres concurrency test job.
3. **15E.4c** enable family revocation on reuse.
4. **15E.4d** the `sid` claim and per-request session check.
5. **15E.4e** contract: NOT NULL, drop the legacy path and unused columns, optional cleanup job.

Each step is its own PR through the gated pipeline, with production smoke checks after each deploy.

---

## 18. Implementation status

### 15E.4a — Frontend cross-tab refresh coordination
**Status: IMPLEMENTED** (branch `feat/15e4a-cross-tab-refresh-coordination`; frontend only — the backend and `/auth/refresh` are unchanged).

- **Where.** `src/lib/auth/refreshCoordinator.ts` is a framework-free module with storage, channel, clock and refresh call injected. `src/lib/api.ts` consumes it through `refreshAccessToken(failedToken)` and `notifyLogout()`. `AuthContext.logout` calls `notifyLogout()`, and a `storage` listener keeps other tabs' React state in step with sign-in and sign-out.
- **In-tab.** One shared promise: N concurrent 401s in a tab trigger one coordination run.
- **Cross-tab lease.** `localStorage["myandijan_refresh_lock"] = { ownerId, operationId, acquiredAt, expiresAt }`; lease 15 s, longer than the 10 s request timeout.
  - A tab writes its lease, waits 50 ms, re-reads it, and only the verified owner calls `/auth/refresh`. This guards against two tabs that both read "no lock".
  - localStorage has no compare-and-set, so this is practical rather than strict exclusion: a tab frozen between its synchronous read and write for more than 50 ms could also win.
  - The lease is released in `finally`. A stale lease from a closed, crashed or frozen tab is taken over once `expiresAt` passes.
- **Stale-token rule.** Before refreshing, and again after acquiring the lease, the tab re-reads storage. If the access token no longer matches the one that failed, another tab already refreshed, so it uses the stored token and never replays the old refresh token.
- **Wake-ups, no polling.**
  - `BroadcastChannel("myandijan-auth")` messages: `refresh-started`, `refresh-succeeded`, `refresh-failed{reason}`, `logged-out`. They carry only type, ids, a timestamp and a reason, never a token.
  - Fallback: the `storage` event on the lease or token keys. This is required because the default Vite target includes Safari 14, which has no BroadcastChannel.
  - One timer at lease expiry.
- **Outcomes.**
  - Success: store both tokens, broadcast, release.
  - Rejected (4xx except 408/429): clear the exact rejected pair *before* releasing, so waiters stop however they are woken. The caller then runs the normal session-expired path.
  - Transient (network, timeout, 408, 429, 5xx): keep the session; waiters may retry the refresh themselves; the API helpers throw `ApiError` 503 instead of logging out.
- **Retry limit.** Each request refreshes at most once and retries at most once, so a 401 on the retry ends the session with no loop.
- **Logout wins.** `notifyLogout()` bumps a logout epoch in this tab and, through the broadcast or the storage event, in every other tab. A refresh response that arrives after logout is discarded and never re-stored. Waiting tabs stop at once, and no refresh starts once the refresh token is gone.
- **Tests (automated, in jsdom).**
  - 20 coordinator tests and 4 new API-client tests:
    - single tab; 10 callers → 1 refresh; 5 tabs → 1 refresh; both tabs read "no lock" → 1 refresh;
    - a waiting tab adopts the new token without replaying; coordinator transient failure → a waiter recovers; rejected → waiters stop with no re-send;
    - stale and expired lease takeover; logout in another tab or the same tab during a refresh; a waiter released on logout;
    - BroadcastChannel unavailable; no tokens in messages; request timeout and exception release the lease;
    - 10 parallel requests → 1 refresh + 10 retries; 5xx keeps the session; retry limit; no refresh after logout.
  - The tabs share one jsdom thread, so these tests prove the protocol and its interleavings, **not** real multi-process browser timing.
- **Known limitations (until 15E.4b/4c).**
  - Strict exclusion is impossible with localStorage alone.
  - A refresh whose response is lost (the server rotated, the client never saw it) leaves the client with a refresh token the server has retired. A later retry with it is reuse, which only the server's grace window (15E.4b) can soften.
  - Logout while another tab's refresh is in flight can leave the server-side successor token orphaned but valid until it expires: the frontend discards it, but only server-side session revocation (15E.4b, `@Public` session logout) can kill it.
  - Server-side logout still fails when the access token has expired (§2), until 15E.4b.
  - *Update after 15E.4b:*
    - **Logout racing an in-flight refresh: resolved.** Logout is `@Public`, authenticated by the refresh token, and revokes the whole session. If the refresh committed first, the token the client presents is the one just rotated: it is still accepted for logout **only** while inside the 10 s grace window with its successor unused, and the successor is revoked with the session. An older or replayed token cannot sign anyone out.
    - **Logout with an expired access token: resolved.**
    - **The lost-response case for *refresh* is unchanged:** 15E.4b refuses a rotated token with the generic 401, and the grace window does not hand out the successor.

### 15E.4b — Backend sessions, race-safe rotation, absolute lifetime
**Status: IMPLEMENTED** on backend branch `feat/15e4b-refresh-token-sessions`, PR to `main`; not merged at the time of writing. Backend only: the frontend needs no change, and the `/auth/refresh` request and response formats are unchanged.

**Files.**
- `prisma/schema.prisma`; migration `20261002090000_phase15e4b_auth_sessions`.
- `src/auth/refresh-sessions.ts` (new): constants, pure helpers, `revokeAllUserSessions`.
- `src/auth/auth.service.ts`: sign-in, refresh, logout, reset; `src/auth/auth.controller.ts`: logout route; `src/auth/auth-throttle.ts`: logout limit.
- `src/admin/admin.service.ts`: suspension.
- Tests: `test/db/*.db-spec.ts`, `jest.db.config.js`, `npm run test:db`; CI `.github/workflows/ci.yml`.

#### Final schema
- **`auth_sessions`**:
  - `id` (serial PK), `user_id` (FK → users, `ON DELETE CASCADE`), `created_at`;
  - `absolute_expires_at` (NOT NULL), `revoked_at`, `revoked_reason` (enum `SessionRevokedReason`), `last_used_at`;
  - `user_agent` `VARCHAR(500)`, `ip_address` `VARCHAR(45)`;
  - indexes `(user_id)` and `(user_id, revoked_at)`.
- **`SessionRevokedReason`** = `LOGOUT`, `PASSWORD_RESET`, `SUSPENDED`, `REUSE_DETECTED`, `LEGACY_MIGRATION`.
  - The last two are declared now and written from 15E.4c / 15E.4e, so those steps need no enum migration.
  - `ADMIN` was **not** added: no admin session-revocation endpoint exists, and none was built.
- **`refresh_tokens`** gains:
  - `session_id` — nullable, FK → auth_sessions `ON DELETE CASCADE`, indexed;
  - `rotated_at`;
  - `parent_id` — nullable self-FK `ON DELETE SET NULL`, **UNIQUE**.
  - `token_hash UNIQUE` is unchanged; `user_agent` and `ip_address` stay unused until 15E.4e.

#### Refresh algorithm (one interactive transaction, READ COMMITTED)
1. `sha256(token)`, then locate the row. No lock: this read only picks which session to lock.
2. A session-less legacy token is attached to a new session (see Migration).
3. **Session lock:** `UPDATE auth_sessions SET last_used_at = now WHERE id = $s AND revoked_at IS NULL AND absolute_expires_at > now`. Zero rows → 401.
4. **Token compare-and-set**, under the lock: `UPDATE refresh_tokens SET rotated_at = now, revoked_at = now WHERE id = $t AND session_id = $s AND rotated_at IS NULL AND revoked_at IS NULL AND expires_at > now`. Zero rows → 401.
5. User must be ACTIVE and not deleted, otherwise the transaction rolls back → 401.
6. INSERT the successor: same session, `parent_id = $t`, `expires_at = min(now + JWT_REFRESH_EXPIRES_IN, absolute_expires_at)`.
7. Commit, then sign the access JWT.

Any failure inside the transaction throws, so nothing commits. Every failure — unknown, expired, rotated, revoked, lost race, revoked or expired session, inactive user, unique violation — is the same `401 Invalid or expired refresh token`.

**Why the invariant holds ("one predecessor never produces two successors").**
- **Session lock.** Concurrent requests for one session queue on the row lock taken by step 3. Each re-evaluates the WHERE clause against the committed row once it gets the lock.
- **Compare-and-set.** Only the request that moves `rotated_at` from NULL gets a count of 1; every other request for that token gets 0.
- **Database backstop.** `parent_id UNIQUE` makes a second successor impossible even if the code were wrong. P2002 is mapped to the same 401.

**No raw SQL.** Prisma 5.22 emits `updateMany` with scalar filters as a single conditional `UPDATE … WHERE …`. That was verified from Prisma's query log against PostgreSQL 16, and the concurrency tests prove the behaviour. So the lock and the compare-and-set use Prisma's own API. Raw SQL appears only in tests: the lock holder and `pg_stat_activity` observation.

**Lock order** (deadlock-free): user row → legacy session-less tokens → session rows → token rows. Refresh never locks the user row.

#### Deliberate differences from the design (sections 1–17)
1. **Rotation also sets `revoked_at`**, together with `rotated_at`.
   - Reason: the previous release ignores `rotated_at`. Without this, a rotated token would become usable again for the old code during the rolling-deploy overlap, or after a rollback — tested.
   - Consequence for 15E.4c: classify reuse by `rotated_at IS NOT NULL` **before** looking at `revoked_at`. The §6 step 5 order ("`revoked_at IS NOT NULL` → 401, done") must not be copied as-is.
2. **No `REFRESH_RACE` log and no shadow `REUSE_DETECTED` audit in 15E.4b.** A rotated token gets the plain 401 and nothing else happens.
   - `isWithinRefreshGraceWindow(token, successor, now)` and `REFRESH_GRACE_WINDOW_MS = 10_000` are implemented and tested; observation and enforcement are 15E.4c.
   - Grace data that can be queried: `rotated_at` on the token, its successor through the unique `parent_id`, and the successor's `rotated_at`.
3. **Logout ends a session only when given that session's current token, or that token's immediate predecessor in one narrow case.**
   - **The narrow case:** the predecessor was rotated within the grace window (10 s) and its successor is still unused. That is the client signing out while its own refresh was in flight: the server already rotated, and the client never stores the successor.
   - **Anything older ends nothing:** a token rotated longer ago, one whose successor has been used, or one that is revoked or expired. An old or replayed token alone cannot sign someone out.
   - **Refresh is unchanged:** it still refuses any rotated token with the generic 401 and never revokes on it.
   - **Response:** always `200 { success: true }`.
4. **No audit row per sign-in.** The `auth_sessions` row (created time, device, IP) is the sign-in record. Revocations are audited:
   - logout → `UPDATE` on `AuthSession` `{ revoked, reason: 'LOGOUT', tokensRevoked }`;
   - reset and suspension → their existing rows.
   - No `AuditAction.REVOKE` was added: the existing architecture records revocations as `UPDATE` and `SUSPEND`.
5. **Reset and suspension audit payloads**: `sessionsRevoked` now counts **sessions**, and `tokensRevoked` was added. Before 15E.4b, `sessionsRevoked` counted tokens.

#### Absolute lifetime
- `absolute_expires_at = created_at + 90 days`, set at sign-in and **never** extended.
- Every refresh checks it under the lock, and caps the new token's expiry at it.
- With 2 hours of session left, the next token lives 2 hours, not 30 days.

#### Logout (`POST /auth/logout`, now `@Public`)
- **Authentication:** possession of a refresh token entitled to end the session — the current one, or its predecessor inside the grace window with the successor unused (difference 3). No access token is needed, so it works after the access token has expired.
- **Effect, in one transaction:**
  - the session is locked and revoked (`LOGOUT`), so a refresh in flight finishes first;
  - **entitlement is re-checked under that lock, on a fresh clock.** If the successor was used while logout waited, the revocation rolls back and nothing changes;
  - all the session's tokens are revoked, in a fresh snapshot that includes the successor of any refresh it waited for;
  - an audit row is written.
- **Logout racing a refresh of the same session is closed in every order:**
  - logout locks first → the refresh then finds the session revoked;
  - the refresh commits first (even before logout reads the token) → logout presents the token just rotated, inside the grace window with its successor unused, and ends the session.
- **Legacy session-less token:** logout revokes that token alone (it is the whole session). If its UPDATE loses to the token's concurrent first refresh — which attaches a session and rotates the token — logout re-reads the token and ends the session that refresh attached. Logout never creates a session and never un-revokes one.
- **Throttle:** 60 per minute per client address.
- **Authorization records:** route snapshot `authenticated` → `public`. `src/authz/authz-migration.spec.ts` lists it as the single reviewed `INTENDED_PUBLIC` exception; every other route still fails CI if it becomes more permissive.
- **Scope:** other devices' sessions are untouched. The device's current access token stays valid for ≤ 15 minutes, until 15E.4d.

#### Password reset and suspension
- **Revocation:** inside their existing transactions, after the user row is written (`sessionVersion + 1`, plus the status for suspension), `revokeAllUserSessions` revokes:
  - legacy session-less tokens first;
  - then every session (`PASSWORD_RESET` / `SUSPENDED`);
  - then every token.
- **Concurrent refreshes:** a refresh in flight either commits first, and its successor is caught by the final statement, or runs after and finds its session revoked. Tested with both held at the session lock.
- **Reinstatement** (`activateUser`) touches no session or token, so revoked sessions stay revoked.

#### Migration (expand → backfill → contract)
- **Expand + backfill** — `20261002090000_phase15e4b_auth_sessions`, runs in the existing `prisma migrate deploy` at boot:
  - **Additive only:** new enum and table; nullable columns; `parent_id UNIQUE` over all-NULL values.
  - **Backfill:** each **active** legacy token (not revoked, not expired) gets its own session:
    - `created_at` = the token's `created_at`;
    - `absolute_expires_at = GREATEST(created_at + 90 days, token.expires_at)`, so nobody is signed out or shortened by the deploy.
  - Revoked and expired legacy rows keep `session_id NULL`.
- **Switchover and rollback:**
  - The previous release keeps working against the expanded schema. Its INSERTs omit the new columns, and its refresh refuses tokens the new code rotated, because `revoked_at` is set.
  - Tokens it mints have no session. The new code attaches one on first use: create the session, then compare-and-set `session_id IS NULL`. Of concurrent first uses only one attaches; the losers roll back their session.
  - Rolling the code back leaves an unused schema behind and resurrects nothing.
- **Contract — 15E.4e, separate deploy:**
  - attach or retire the remaining NULL-session rows (`LEGACY_MIGRATION`);
  - set `session_id NOT NULL`;
  - drop the legacy path and the unused token columns.

#### PostgreSQL test strategy (`npm run test:db`, CI job `test-and-build`)
- **CI service:** throwaway `postgres:16-alpine`, pinned by digest, trust authentication — no credential in the repository. `permissions: contents: read` and the job name are unchanged.
- **Guard:** the suites refuse any database that is not local or whose name lacks `test`, and never read `DATABASE_URL` or `.env`.
- **Global setup:** deploys every migration on an empty database.
- **Forced races, not timing luck:** a test transaction holds the session row with `FOR UPDATE`. The test waits until N contenders are observed in `pg_stat_activity` blocked on that `auth_sessions` row lock, then releases.
  - **Refresh × refresh:** 2 contenders, and 10 contenders × 5 rounds.
  - **Refresh × logout** and **refresh × reset:** 5 rounds each.
  - **Unsynchronised bursts:** 4 contenders × 25 rounds.
  - **Legacy first-use races:** 5 contenders × 10 rounds, and against password reset × 10 rounds.
- **Forced logout races (R1):**
  - **Logout during the refresh:** an uncommitted placeholder row with the same `parent_id` stops the refresh at its successor INSERT, after it has rotated the token and while it holds the session lock. Logout is then observed waiting before the placeholder is rolled back.
  - **Legacy logout losing its first UPDATE:** the same technique makes the logout's UPDATE wait on the token row held by its first refresh.
  - **Entitlement checked under the lock:** a test transaction holds the session lock and uses the successor while logout waits; logout must roll back.
- **Mutation checks:**
  - with the compare-and-set and parent link removed, the TEST 1 cases fail (2, 10 and 4 successors);
  - with logout's grace rule removed (rotated token → ends nothing), 6 of the R1 tests fail.
  - With the code restored, all pass.
- **Covered:**
  - sign-in paths (one session each); device metadata;
  - chain R1→R4; 90-day expiry (faked clock); TTL capped at session expiry;
  - logout; reset; suspension + reinstatement; two devices;
  - logout with the just-rotated token, with a used successor, outside the window, with a rotation stamped slightly ahead of logout's clock; unsynchronised refresh + logout × 20 rounds; legacy first refresh + logout × 10 rounds;
  - rotated-token presentation and grace classification; `parent_id` unique (P2002); rollback on failure;
  - raw-token absence from logs, Prisma query parameters and every stored column;
  - previous-release compatibility;
  - migration backfill on pre-15E.4b data, in its own throwaway database.
- **Results at the time of writing:** 38 database tests and 977 unit tests pass.

#### Known limitations (15E.4b)
- **Rotated token = plain 401.** No benign-race "replay" of the successor and no reuse revocation yet. A client that lost the refresh response is signed out on its next refresh — the same as before 15E.4b.
- **Access tokens are not tied to a session** until 15E.4d. Logout and revocation end refresh, but an access token lives out its ≤ 15 minutes. Reset and suspension still kill all access tokens at once through `sessionVersion`.
- **Legacy-session absolute expiry** counts from the legacy token's `created_at`, which is the last rotation by the old code, not the real sign-in.
  - Previous-release overlap: a session-less token minted by the old code during the switchover starts a fresh session on first use.
- **The grace-window logout cuts both ways.** Someone holding a stolen copy of the just-rotated token can sign the victim's device out, but only within 10 s of the victim's own refresh and before the victim uses the successor. They gain no tokens or access, and holding the current token would let them do the same anyway.
- **Logout with an older token is a no-op on purpose.** A client that signs out with a token rotated more than 10 s ago, or whose successor was used, leaves its session alive. With 15E.4a coordination the frontend always signs out with the token it currently holds.
- **Dependabot does not track the CI service image digest.** Bump it by hand.

#### Deferred
- **15E.4c:** observe-only reuse detection (`REFRESH_RACE` / shadow `REUSE_DETECTED`), then session revocation on reuse outside the grace window.
  - Use `rotated_at`-first classification (difference 1 above) and `isWithinRefreshGraceWindow`.
  - Open decision: whether reuse also bumps `sessionVersion`.
- **15E.4d:** `sid` claim in new access tokens; `JwtStrategy` rejects revoked or expired sessions; tokens without `sid` stay valid until they expire.
- **15E.4e:** contract, as in Migration above, plus an optional cleanup job for expired rows.
