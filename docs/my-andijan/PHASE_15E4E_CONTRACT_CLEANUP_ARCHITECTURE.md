# Phase 15E.4e — Refresh-Token / Session Contract & Cleanup Architecture

**Status (updated 2026-10-03):**

| Step | Status |
|---|---|
| **15E.4e.1** — contract enforcement + legacy code removal | **IMPLEMENTED** on backend branch `feat/15e4e1-refresh-token-contract-cleanup` — **not merged, not deployed**. Implementation record: §15. |
| **15E.4e.2** — migration-only drop of `refresh_tokens.user_agent` / `ip_address` and `SessionRevokedReason.LEGACY_MIGRATION` | **PENDING** — not before 15E.4e.1 has been live and verified for ≥ 24 h (D2). |

Sections 1–14 are the design and audit as written on 2026-10-02 (originally "DESIGN ONLY"). Where the implementation deliberately differs, §15 says so. Production evidence (§6) was collected on 2026-10-03 and passed every gate (§15.1).

**Date:** 2026-10-02 (design), 2026-10-03 (15E.4e.1 implementation)
**Author role:** implementation engineer, for the architect and the owner.

Tags used throughout:

- **[VERIFIED]** — checked in this audit against the code, Git history or Railway metadata named next to it.
- **[DESIGN]** — the proposed design; not implemented.
- **[OPEN]** — not settled. Needs production evidence, an owner decision, or proof during implementation.

---

## 1. Executive summary

Phases 15E.4a–15E.4d.2 are live. Every sign-in creates an `AuthSession`. Refresh rotates inside that session, under a session-row lock. Reuse of a rotated token revokes the session. Every access token must name a live session (`sid`).

What is left is the expand-and-backfill scaffolding from 15E.4b:

- `refresh_tokens.session_id` is still **nullable**;
- three code paths still handle **session-less ("legacy") tokens**: lazy attachment on refresh, a logout branch, and a first step in user-wide revocation;
- two **unused columns** remain on `refresh_tokens` (`user_agent`, `ip_address`);
- the enum value **`SessionRevokedReason.LEGACY_MIGRATION`** is defined but written by nothing;
- the access-token **`sv` claim** is still optional (a pre-15B compatibility path).

**Recommendation.** Split 15E.4e into two deploys, with no forced logout and no lost live session:

- **15E.4e.1 — contract.**
  - One migration, in one transaction:
    - attach any still-live session-less token to its own session (the same rule as the 15E.4b backfill);
    - delete the dead session-less rows (owner decision D1);
    - set `refresh_tokens.session_id NOT NULL`.
  - In the same deploy, remove the legacy code paths.
  - This is **rolling-deploy and rollback compatible** with the code live today (`06d6de9`).
- **15E.4e.2 — drop.** A later, migration-only deploy that drops the two unused columns and the `LEGACY_MIGRATION` enum value. It is **not** rollback compatible with pre-15E.4e.1 code, which is why it is separate and comes after a soak period (D2).

**Blocking precondition.** Read-only aggregate counts from the production database (§6). They could **not** be obtained in this audit: no safe read-only database access exists in this session, and searching for database credentials is forbidden. [OPEN]

**No frontend code change is needed.** [VERIFIED]

---

## 2. Verified current state

### 2.1 Heads and history [VERIFIED]

| Item | Value |
|---|---|
| Backend `main` HEAD | `06d6de9ec4548629fc85d0c18968dc730e7cbb86` (merge of PR #7, 15E.4d.2) |
| Backend production deployment | `0a5e9950-366c-4fad-b4d7-80a3a7a9cedd`, commit `06d6de9`, SUCCESS 2026-10-02 15:57:02 UTC, 1/1 replica |
| Frontend `main` HEAD | `f173e9d6b42bb0d42b7499f7f78091442919fc99` (merge of PR #5, 15E.4d.2 docs) |

**Backend auth commits:**

| Phase | Commits | Merge |
|---|---|---|
| 15B | migration `20261001150000_phase15b_session_version_and_audit_context` | — |
| 15E.4b | `53ff200`, `3cfaff9`, `7d16a11` | `12e261d` |
| 15E.4c | `d77c4bf` | `2dc5dc4` |
| 15E.4d.1 | `509d58b` | `253ede8` |
| 15E.4d.2 | `8a321c2` | `06d6de9` |

**Frontend commits:** 15E.4a is `729d3c6` and `7a4c9b9` (merge `add3fbe`). The 15E.4d docs are `b2aa4a3` and `07032b8` (merge `f173e9d`).

**Frontend docs not on `main`:** the 15E.4b doc commits (`16cae8a`, `13ee3c5`) and the 15E.4c doc commit (`e96b7a9`) sit on unmerged branches. On `main`, `PHASE_15E4_REFRESH_TOKEN_ARCHITECTURE.md` still says 15E.4b–e are "not implemented". This drift is fixed by the documentation step (§9.7, D-a).

**Railway rollout of 15E.4b [VERIFIED, deployment list]:**

- the 15E.4b deployment `1df56259` (commit `12e261d`) was created at 2026-10-02 10:24:45 UTC;
- the last pre-15E.4b deployment, `cc036c8d` (commit `41ee971`), was REMOVED at **10:27:40 UTC**;
- every later deployment moved forward (`2dc5dc4` → `253ede8` → `06d6de9`), with no rollback.

So **no pre-15E.4b code has served since 10:27:40 UTC**. That is the newest moment a session-less refresh token could have been written.

### 2.2 Schema [VERIFIED — `prisma/schema.prisma`, migration `20261002090000_phase15e4b_auth_sessions`]

`auth_sessions`:

- **Columns:** `id` SERIAL PK, `user_id` NOT NULL, `created_at`, `absolute_expires_at` NOT NULL, `revoked_at` NULL, `revoked_reason` `SessionRevokedReason` NULL, `last_used_at`, `user_agent` VARCHAR(500) NULL, `ip_address` VARCHAR(45) NULL.
- **Foreign key:** `user_id` → `users.id` ON DELETE CASCADE.
- **Indexes:** `(user_id)` and `(user_id, revoked_at)`.

`refresh_tokens`:

- **Columns:**
  - `id`, `user_id` NOT NULL, `token_hash` UNIQUE, `expires_at`, `revoked_at` NULL, `created_at`;
  - `user_agent` and `ip_address`: NULL, unused, and commented "Dropped in 15E.4e";
  - `session_id` INT **NULL**;
  - `rotated_at` NULL;
  - `parent_id` INT NULL **UNIQUE**.
- **Foreign keys:**
  - `session_id` → `auth_sessions.id` ON DELETE CASCADE;
  - `parent_id` → `refresh_tokens.id` ON DELETE SET NULL;
  - `user_id` → `users.id` ON DELETE CASCADE.
- **Indexes:** `(user_id)`, `(expires_at)`, `(session_id)`, UNIQUE `(parent_id)`.

The **enum `SessionRevokedReason`** has five values: `LOGOUT`, `PASSWORD_RESET`, `SUSPENDED`, `REUSE_DETECTED`, `LEGACY_MIGRATION`.

The 15E.4b migration was **expand plus backfill**. Every *live* token (`revoked_at IS NULL AND expires_at > now`) got its own session, with `absolute_expires_at = GREATEST(created_at + 90 days, expires_at)`. Dead tokens kept `session_id NULL` "to be dealt with in 15E.4e".

Production startup logs on 2026-10-02 at 15:57:00 UTC: "14 migrations found", "No pending migrations to apply". [VERIFIED]

### 2.3 Code paths [VERIFIED — `src/auth/auth.service.ts`, `src/auth/refresh-sessions.ts`, `src/auth/strategies/jwt.strategy.ts`, `src/admin/admin.service.ts`]

| Flow | Behavior today | Where |
|---|---|---|
| **Register** | creates the user, then `startSession` | `auth.service.ts:178` |
| **Password login** | checks the user, then `startSession` | `auth.service.ts:202` |
| **OTP login** (creates the user if new) | consumes the code atomically, then `startSession` | `auth.service.ts:572` |
| **`startSession`** | one nested create: `AuthSession` (90-day absolute expiry) plus its first refresh token (`expires_at = min(now + JWT_REFRESH_EXPIRES_IN, absolute)`, default `30d`). The access token carries `sid = session.id`. | `auth.service.ts:821–845` |
| **Refresh** | one transaction: (1) find the token; **if `session_id` is NULL, `attachLegacySession`**; (2) lock the session row with a conditional `updateMany` (unrevoked, inside absolute expiry); (3) compare-and-set the token (`rotated_at` and `revoked_at` set together); if the CAS fails, `handleRotatedPresentation`, which leads to a benign race or reuse revocation; (4) user must be ACTIVE and not deleted; (5) insert the successor (same session, `parent_id` = predecessor). The access token is signed with the session's `sid`. | `auth.service.ts:221–308` |
| **Reuse detection** | `classifyRotatedPresentation` (10 s grace window, −5 s skew bound, successor unused); reuse revokes **that session only** (`REUSE_DETECTED`) and writes an audit row; the response is a generic 401 | `auth.service.ts:319–361`, `refresh-sessions.ts:88–148` |
| **Logout** | public; possession of the refresh token is proof. `mayEndSession`: the current token, or the just-rotated predecessor inside the grace window. **If `session_id` is NULL, a legacy branch applies.** Otherwise: lock and revoke the session (`LOGOUT`), re-check under the lock, revoke all of its tokens, audit. Always `{success:true}`. | `auth.service.ts:411–482` |
| **Password reset** | one transaction: consume the code, new hash, `sessionVersion + 1`, then `revokeAllUserSessions(PASSWORD_RESET)`, then audit | `auth.service.ts:770–812` |
| **Suspension** | compare-and-set on status and role, `sessionVersion + 1`, then `revokeAllUserSessions(SUSPENDED)`, then audit; reinstatement revives nothing | `admin.service.ts:1370–1405` |
| **`revokeAllUserSessions`** | **step 1: legacy session-less tokens**; step 2: all unrevoked sessions; step 3: all unrevoked tokens of the user | `refresh-sessions.ts:168–187` |
| **Access-token validation** | passport checks signature and `exp`; then the user must be ACTIVE and not deleted; `(sv ?? 0) === sessionVersion`; **`sid` is mandatory**: positive safe integer, session exists, belongs to the user, unrevoked, inside absolute expiry; database errors fail closed; every refusal is the generic 401 | `jwt.strategy.ts:52–123` |

Every path that issues tokens goes through `startSession` (three callers) or the refresh rotation. `signAccessToken` requires `sessionId`. No other code creates refresh tokens or sessions. [VERIFIED by grep of `refreshToken.create`, `authSession.create`, `startSession(` and `signAccessToken(` in `src/`]

Nothing in `src/` writes `LEGACY_MIGRATION`; it appears only in the schema and in the 15E.4b migration's `CREATE TYPE`. [VERIFIED]

No scheduled job (`@Cron`, `ScheduleModule`, `setInterval`) deletes tokens or sessions, so rows accumulate. [VERIFIED]

### 2.4 Frontend [VERIFIED — `src/lib/api.ts`, `src/lib/auth/refreshCoordinator.ts`, `src/contexts/AuthContext.tsx`]

- **Refresh flow:** on a 401 from an authenticated request, `refreshAccessToken` asks the per-tab `RefreshCoordinator`, then retries once. A refused refresh clears the session; a transient failure raises a 503-style error without signing out.
- **Cross-tab coordination (15E.4a):**
  - a lease in localStorage (write, settle, verify);
  - a `BroadcastChannel` where available;
  - the `storage` event as the fallback (Safari < 15.4);
  - a logout epoch, so logout wins over any refresh in flight.
- **Logout:** a best-effort `POST /auth/logout` with the stored refresh token, then local state is cleared and `notifyLogout()` runs.
- **Tokens are opaque:** the frontend never decodes the JWT (no `atob` or jwt-decode). `sid` and `sv` are invisible to it.
- **No legacy fallback found.** There is no "refresh without coordinator" path and no pre-15E.4a code path left.

### 2.5 Tests in place [VERIFIED]

- **Unit tests:** 996 in 40 suites (`npm test`).
  - Auth: `src/auth/session-security.spec.ts`, `src/auth/auth-codes.spec.ts`, `src/auth/auth.service.spec.ts`, `src/auth/refresh-sessions.spec.ts`.
  - Authorization: `src/authz/authz.e2e.spec.ts`, `src/admin/user-status.authorization.spec.ts`.
- **Real PostgreSQL tests:** 84 (`npm run test:db`):

  | File | Tests |
  |---|---:|
  | `test/db/refresh-sessions.db-spec.ts` | 37 |
  | `test/db/reuse-detection.db-spec.ts` | 26 |
  | `test/db/access-token-sessions.db-spec.ts` | 19 |
  | `test/db/migration-backfill.db-spec.ts` | 2 |

- **CI** (`.github/workflows/ci.yml`) runs `npm ci`, `npm test`, `npm run test:db` and `npm run build`. There is **no** Prisma drift check.
- **Frontend:** `src/lib/auth/__tests__/refreshCoordinator.test.ts` and `src/lib/__tests__/api.test.ts`.

---

## 3. Remaining legacy and compatibility paths

| # | Path | Where | Reachable today? | Classification |
|---|---|---|---|---|
| L1 | `refresh_tokens.session_id` nullable | schema, migration `20261002090000` | Yes, at the schema level. **Only pre-15E.4b code could write NULL**, and none has run since 10:27:40 UTC. Current code always sets it. | **MUST be changed** to NOT NULL (4e.1) |
| L2 | `presented.sessionId ?? attachLegacySession(...)`, lazy session attachment on refresh | `auth.service.ts:260`, `:363–392` | Only if a live session-less token exists: one written by pre-15E.4b code in the rollout overlap and never used since. Count [OPEN, §6 E3]. | **CAN be removed** once L1 is enforced (4e.1) |
| L3 | `legacySessionExpiry()` | `refresh-sessions.ts:59–67` | Only through L2 | **CAN be removed** (4e.1); the rule is reused in the migration SQL |
| L4 | Logout branch for `sessionId === null` | `auth.service.ts:430–445` | Only with a session-less token | **CAN be removed** (4e.1) |
| L5 | `revokeAllUserSessions` step 1, the session-less token sweep | `refresh-sessions.ts:155–158`, `:174–177` | Runs on every reset or suspension; it matches rows only while session-less tokens exist | **CAN be removed** (4e.1). Step 3 (all tokens of the user) stays and would catch them anyway. |
| L6 | Lock-order comment "user row → legacy (session-less) tokens → …" | `refresh-sessions.ts:12` | n/a | **MUST be changed** (doc comment) |
| L7 | `revoked_at` set together with `rotated_at` "so code that predates rotatedAt stays dead" | `auth.service.ts:276–284` | Always | **MUST remain**. `revoked_at IS NULL` is the "usable token" predicate used by refresh, logout and every revocation. Only the comment's rationale changes. |
| L8 | `LEGACY_MIGRATION` enum value | schema, migration | **Never written** [VERIFIED] | **CAN be removed** in 4e.2, if D1 = delete; evidence: E1 count = 0 |
| L9 | `refresh_tokens.user_agent` / `ip_address` | schema | Never written; superseded by the session-level columns [VERIFIED] | **CAN be removed**: schema fields in 4e.1, columns in 4e.2 (§5) |
| L10 | Optional `sv` claim, `(payload.sv ?? 0)` | `jwt.strategy.ts:12–14`, `:61` | Effectively unreachable: every token that passes the mandatory `sid` check was issued after 15E.4d.1 by `signAccessToken`, which has always set `sv` since 15B | **CAN be changed** to mandatory (D3). This is a compatibility removal, not a new feature. |
| L11 | Frontend legacy refresh behavior | — | None found | Nothing to remove |

### 3.1 The audit questions, answered

**A. `session_id`**

- **Still nullable?** Yes.
- **Can a token exist without a session?** Yes, as legacy rows: (i) dead pre-15E.4b rows the backfill deliberately skipped; (ii) live rows written by the old code in the rollout overlap and never used since.
- **Can current code create one?** No.
- **Can one be accepted?** Yes. A live one is accepted through L2 (attached, then rotated normally); a dead one is refused.
- **Is lazy attachment still present?** Yes (L2).
- **Is the legacy branch reachable?** Only if E3 `live` > 0. [OPEN]

**B. `parent_id`**

- Every successor written by rotation has `parent_id` = its predecessor. [VERIFIED, `auth.service.ts:298–306`]
- `parent_id` is NULL exactly for the first token of a session: from `startSession`, from the backfill, or a lazily attached legacy token.
- It also becomes NULL if a parent row is ever deleted (ON DELETE SET NULL); no code deletes rows today.
- **Final invariant [DESIGN]:** `parent_id` stays **nullable**, NULL meaning "session root". UNIQUE stays: one successor per token. A non-null parent is in the same session (application-enforced; verified by E5).

**C. `rotated_at`**

- **Required for reuse detection:** yes. `classifyRotatedPresentation` separates a rotated token (a copy: race or reuse) from a revoked or expired one (not reuse). It also drives the logout grace window.
- **Obsolete states:** dead legacy rows rotated by the pre-15E.4b code have `revoked_at` set but `rotated_at` NULL, so they classify as "not rotated" and get a plain 401 (`reuse-detection.db-spec.ts` test 18). After 4e.1 these rows are gone (D1 = delete) or sit in revoked sessions. Nothing else in the code becomes obsolete.

**D. `LEGACY_MIGRATION`**

- **Reachable?** No; never written.
- **Removable?** Yes.
- **Evidence required before removal:** E1 shows 0 sessions with that reason; D1 is "delete", not "attach dead rows to LEGACY_MIGRATION sessions"; 4e.1 is live.

**E. Legacy refresh-token acceptance.** L2 is the only acceptance path for session-less tokens. No feature flag or environment switch exists. [VERIFIED by grep for `legacy`, `sessionId: null`, `session_id IS NULL`, `attachLegacySession`]

**F. Login and session creation.** All three sign-in paths create an AuthSession; refresh always stays in the presented token's session. No path bypasses this. [VERIFIED]

**G. Logout.** Session-based, apart from L4.

**H. Password reset and suspension.** Session-aware: they revoke every session and every token, and bump `sessionVersion`. The only token-only part is L5 step 1, which is obsolete once L1 holds.

**I. Frontend.** The coordinator (lease, BroadcastChannel, storage-event fallback) is the canonical and only path. **Must NOT be removed:**

- the storage-event fallback (old Safari);
- the logout epoch ("logout wins");
- `handleUnauthorized` firing only when a token was sent;
- treating a transient refresh failure as "not signed out";
- the best-effort server logout.

---

## 4. Final contract (post-15E.4e)

### 4.1 Invariants [DESIGN — each tagged with its enforcement]

| ID | Invariant | Enforced by |
|---|---|---|
| C1 | Every refresh token belongs to exactly one AuthSession | **DB:** `session_id NOT NULL` plus FK (new in 4e.1) |
| C2 | Every successful sign-in (register, password login, OTP login) creates exactly one new AuthSession with exactly one root token | App: `startSession`, a single nested create |
| C3 | A token's successor is in the same session and belongs to the same user | App: rotation writes `sessionId` and the session's `userId`; checked by E5 and E8 |
| C4 | A token has at most one successor | **DB:** `parent_id UNIQUE` (exists); app: session lock plus compare-and-set |
| C5 | A rotated token never yields a successor and is never usable again | App: CAS on `rotated_at IS NULL AND revoked_at IS NULL`; `rotated_at` implies `revoked_at` (checked by E7) |
| C6 | Presenting a rotated token outside the grace window revokes that session only (`REUSE_DETECTED`), with an audit row; the response is the generic 401 | App (15E.4c) |
| C7 | A revoked session can't refresh, and its tokens are revoked in the same transaction | App: session lock condition plus `revokeSessionForReuse`, logout and `revokeAllUserSessions` |
| C8 | Every access token carries a valid `sid` naming an unrevoked, unexpired session of the same user | App: `JwtStrategy` (15E.4d.2) |
| C9 | Session absolute lifetime: 90 days from sign-in, never extended; no token outlives its session | App: `refreshTokenExpiry = min(now + TTL, absolute)`, session lock condition, `JwtStrategy`; checked by E10 |
| C10 | Idle lifetime unchanged: each token lives `JWT_REFRESH_EXPIRES_IN` (default `30d`), capped by C9 | App (unchanged) |
| C11 | Logout, reuse revocation and refresh affect one session only; password reset and suspension affect all of one user's sessions; no path touches another user | App; DB tests for multi-device and cross-user cases |
| C12 | `sessionVersion` still kills every access token user-wide on reset or suspension | App: `JwtStrategy` |
| C13 | A token is usable only if `revoked_at IS NULL AND expires_at > now`, its session is usable, and the user is ACTIVE and not deleted | App |
| C14 | Every refusal (refresh, access token) is the same generic 401; logout always answers `{success:true}` | App |

### 4.2 MUST remain

- the session-row lock, the token CAS, `parent_id UNIQUE`, and the P2002 backstop that maps to a 401;
- `rotated_at` and `revoked_at` written together (L7);
- grace window 10 s, skew bound 5 s, `classifyRotatedPresentation`, `mayEndSession`;
- reuse revocation of one session plus its audit row;
- `revokeAllUserSessions` steps 2 and 3, and the lock order user → sessions → tokens;
- the `sessionVersion` bump on reset and suspension;
- mandatory `sid` in `JwtStrategy`, including the runtime shape check, and failing closed on lookup errors;
- `refresh_tokens.user_id` and its index (step 3 of user-wide revocation, and the user FK);
- `token_hash UNIQUE`; SHA-256 at rest; logs carry IDs only;
- all frontend coordination code (§3.1 I).

### 4.3 CAN be removed

- L2, L3, L4 and L5 step 1 (4e.1);
- L8, the `LEGACY_MIGRATION` enum value (4e.2);
- L9, the `refresh_tokens.user_agent` and `ip_address` columns (fields in 4e.1, columns in 4e.2);
- the legacy-only tests (§8.3).

### 4.4 MUST be changed

- `refresh_tokens.session_id` becomes NOT NULL. In Prisma, `sessionId Int` and `session AuthSession` become required.
- The types that follow: `presented.sessionId` becomes `number`; `LOGOUT_TOKEN_SELECT` and its callers drop their null handling.
- The comments in `refresh-sessions.ts` (header, lock order) and in `auth.service.ts` (L7 rationale; the removed `attachLegacySession` docblock).
- Optional (D3): `JwtPayload.sv` becomes required and missing `sv` gets a 401.

### 4.5 MUST be verified before cleanup

- §6: production evidence, in particular E3 (session-less rows), E5–E14 = 0, and E1 `LEGACY_MIGRATION` = 0.
- That a Prisma migration file runs in one transaction, or must be wrapped explicitly (§7.3). [OPEN]
- What Railway does when the start command fails because a migration fails (no healthcheck is configured). [OPEN]

---

## 5. Expand → contract strategy

| Phase | Content | Gate |
|---|---|---|
| **A. Evidence** | §6 read-only queries against production | All integrity checks pass; counts recorded |
| **B. Contract enforcement** (15E.4e.1, one PR, one deploy) | Migration M1: attach live NULL rows, delete dead NULL rows (D1), assert none remain, `SET NOT NULL`. Code C1: remove L2–L5; required relation in Prisma; Prisma schema **already omits** the L8 and L9 fields (the database still has them); optional D3. | A complete; owner decisions D1 and D3 |
| **C. Data cleanup** | Part of M1: dead session-less rows are deleted (D1 recommended) or attached to revoked `LEGACY_MIGRATION` sessions | Inside M1 |
| **D. Code cleanup** | Part of 4e.1: remove legacy tests, add contract tests, update docs | Ships with B |
| **E. Verification** | CI (unit, real PostgreSQL, concurrency, migration tests); after deploy, production verification (§9.9), re-run E3 (expect `total = 0`), `information_schema` check that `session_id` is NOT NULL | Before 4e.2 |
| **F. Drop** (15E.4e.2, a later migration-only PR) | M2: drop `refresh_tokens.user_agent` and `ip_address`; recreate `SessionRevokedReason` without `LEGACY_MIGRATION` | 4e.1 live and verified; soak period (D2); E1 `LEGACY_MIGRATION` = 0 rechecked |

**Dependency order:**

```
A (evidence) → owner decisions → B+C+D (4e.1 PR → CI) → merge → deploy → E (verify)
            → soak → F (4e.2 PR → CI) → merge → deploy → verify
```

**Why the Prisma schema omits the L9 fields already in 4e.1.**

- Prisma selects every scalar column by name on any read or write without an explicit `select`, e.g. `tx.refreshToken.create` in rotation.
- If `user_agent` were dropped while code that still knows the field is serving (the rolling-deploy overlap, or a rollback), that code would fail with "column does not exist".
- So the field must leave the client one deploy **before** the column leaves the database.
- An extra database column is harmless to a client that doesn't know it.
- CI has no drift check, and the test database is built from the migrations, so it keeps the columns until M2. [VERIFIED]
- Locally, `prisma migrate dev` will offer to generate exactly M2. That is expected, and is how M2 should be produced.

**Why 4e.1 doesn't wait for natural expiry.**

- Live session-less tokens can exist only from the rollout overlap (≤ 10:27:40 UTC). They expire by 10:27:40 + `JWT_REFRESH_EXPIRES_IN`, which is 2026-11-01 10:27:40 UTC if the value is the default `30d` (production value not read; [OPEN] and not needed).
- M1 attaches them with the already-tested backfill rule. 4e.1 is therefore safe at any time and nobody is signed out.
- **Alternative:** wait until after the latest live expiry (E3 `latest_live_expiry`). Then M1 only deletes dead rows. That's simpler SQL but delays 4e.1.

---

## 6. Production evidence requirements

**Status: [OPEN].** This audit could not run these. There is no read-only database access in this session, and searching for database credentials is forbidden. The owner, or a mechanism the owner approves, must run them.

**How to run them [DESIGN]:**

- Use a read-only session: `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY; … ROLLBACK;`, preferably as a read-only database role.
- Every query returns **aggregate counts or timestamps only**: no token hashes, user IDs, phone numbers, IPs or user agents.
- Record the results in the 15E.4e PR description.

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;

-- E1  Sessions by state, and by revoke reason (LEGACY_MIGRATION must be 0)
SELECT count(*)                                                                   AS total,
       count(*) FILTER (WHERE revoked_at IS NULL AND absolute_expires_at >  now()) AS active,
       count(*) FILTER (WHERE revoked_at IS NOT NULL)                              AS revoked,
       count(*) FILTER (WHERE revoked_at IS NULL AND absolute_expires_at <= now()) AS expired_unrevoked
FROM auth_sessions;
SELECT revoked_reason, count(*) FROM auth_sessions GROUP BY 1 ORDER BY 1;

-- E2  Tokens by state (+ any data in the columns L9 drops)
SELECT count(*)                                                          AS total,
       count(*) FILTER (WHERE revoked_at IS NULL AND expires_at >  now()) AS live,
       count(*) FILTER (WHERE rotated_at IS NOT NULL)                     AS rotated,
       count(*) FILTER (WHERE revoked_at IS NOT NULL AND rotated_at IS NULL) AS revoked_not_rotated,
       count(*) FILTER (WHERE revoked_at IS NULL AND expires_at <= now()) AS expired_unrevoked,
       count(*) FILTER (WHERE user_agent IS NOT NULL OR ip_address IS NOT NULL) AS legacy_device_cols
FROM refresh_tokens;

-- E3  Session-less tokens (the 15E.4e.1 subject)
SELECT count(*)                                                          AS total,
       count(*) FILTER (WHERE revoked_at IS NULL AND expires_at >  now()) AS live,
       count(*) FILTER (WHERE revoked_at IS NOT NULL)                     AS dead_revoked,
       count(*) FILTER (WHERE revoked_at IS NULL AND expires_at <= now()) AS dead_expired,
       max(created_at)                                                    AS newest_created,
       max(expires_at) FILTER (WHERE revoked_at IS NULL)                  AS latest_live_expiry
FROM refresh_tokens WHERE session_id IS NULL;

-- E4  Successors whose parent is session-less                        (expect 0)
SELECT count(*) FROM refresh_tokens c JOIN refresh_tokens p ON p.id = c.parent_id WHERE p.session_id IS NULL;
-- E5  Parent and successor in different sessions                     (expect 0)
SELECT count(*) FROM refresh_tokens c JOIN refresh_tokens p ON p.id = c.parent_id
WHERE c.session_id IS DISTINCT FROM p.session_id;
-- E6  A parent with a successor but never rotated                     (expect 0)
SELECT count(*) FROM refresh_tokens c JOIN refresh_tokens p ON p.id = c.parent_id WHERE p.rotated_at IS NULL;
-- E7  Rotated but not revoked                                          (expect 0)
SELECT count(*) FROM refresh_tokens WHERE rotated_at IS NOT NULL AND revoked_at IS NULL;
-- E8  Token user differs from its session's user                      (expect 0)
SELECT count(*) FROM refresh_tokens t JOIN auth_sessions s ON s.id = t.session_id WHERE t.user_id <> s.user_id;
-- E9  Live token inside a revoked or expired session                  (expect 0)
SELECT count(*) FROM refresh_tokens t JOIN auth_sessions s ON s.id = t.session_id
WHERE t.revoked_at IS NULL AND t.expires_at > now()
  AND (s.revoked_at IS NOT NULL OR s.absolute_expires_at <= now());
-- E10 Token expiring after its session's absolute expiry              (expect 0)
SELECT count(*) FROM refresh_tokens t JOIN auth_sessions s ON s.id = t.session_id
WHERE t.expires_at > s.absolute_expires_at;
-- E11 Sessions with more than one unrevoked token                     (expect 0)
SELECT count(*) FROM (SELECT session_id FROM refresh_tokens
                      WHERE revoked_at IS NULL AND session_id IS NOT NULL
                      GROUP BY session_id HAVING count(*) > 1) x;
-- E12 Sessions with no token at all                                   (expect 0)
SELECT count(*) FROM auth_sessions s WHERE NOT EXISTS (SELECT 1 FROM refresh_tokens t WHERE t.session_id = s.id);
-- E13 Sessions with more than one root token                          (expect 0)
SELECT count(*) FROM (SELECT session_id FROM refresh_tokens
                      WHERE parent_id IS NULL AND session_id IS NOT NULL
                      GROUP BY session_id HAVING count(*) > 1) x;
-- E14 revoked_at / revoked_reason disagree                            (expect 0)
SELECT count(*) FROM auth_sessions WHERE (revoked_at IS NULL) <> (revoked_reason IS NULL);
-- E15 Migration history
SELECT count(*) AS total,
       count(*) FILTER (WHERE finished_at IS NULL)        AS unfinished,
       count(*) FILTER (WHERE rolled_back_at IS NOT NULL) AS rolled_back
FROM _prisma_migrations;

ROLLBACK;
```

**Gates [DESIGN]:**

- **E3 `newest_created` ≤ 2026-10-02 10:27:40 UTC**, allowing a few seconds of clock difference. Anything later means some current path writes session-less tokens: **STOP**, which contradicts §2.3.
- **E3 `live`**: any value is acceptable, because M1 attaches them. Record it so post-deploy verification can match it.
- **E4–E11, E13, E14 = 0.** Any non-zero result means **STOP**: an invariant is already broken. Investigate before contracting.
- **E12 = 0** expected. A non-zero result is investigated but doesn't block: orphan sessions are harmless.
- **E1 `LEGACY_MIGRATION` = 0**, required before 4e.2.
- **E15:** 14 total, 0 unfinished, 0 rolled back.

**Not required:** the production value of `JWT_REFRESH_EXPIRES_IN`. M1 is correct whatever it is.

---

## 7. Database migration design

### 7.1 Final schema [DESIGN]

| Element | Final state | Change |
|---|---|---|
| `refresh_tokens.session_id` | INT **NOT NULL**, FK → `auth_sessions.id` ON DELETE CASCADE | 4e.1 |
| `refresh_tokens.parent_id` | INT NULL (root = NULL), UNIQUE, FK self ON DELETE SET NULL | unchanged |
| `refresh_tokens.rotated_at` | NULL | unchanged |
| `refresh_tokens.user_agent`, `ip_address` | **dropped** | 4e.2 |
| `refresh_tokens` indexes | `(user_id)`, `(expires_at)`, `(session_id)`, UNIQUE `(token_hash)`, UNIQUE `(parent_id)` | unchanged |
| `auth_sessions` | unchanged | — |
| `auth_sessions` index `(user_id)` | redundant with `(user_id, revoked_at)`; **CAN be removed**, but there's no measured benefit, so it is not proposed | [OPEN], not in scope |
| `SessionRevokedReason` | `LOGOUT`, `PASSWORD_RESET`, `SUSPENDED`, `REUSE_DETECTED` | 4e.2 (D1 = delete) |

**Optional constraints, not proposed for 15E.4e (follow-up, [OPEN]):**

- `CHECK (rotated_at IS NULL OR revoked_at IS NOT NULL)`;
- composite foreign keys enforcing C3 in the database: `(session_id, user_id)` → `auth_sessions(id, user_id)`, and `(parent_id, session_id)` → `refresh_tokens(id, session_id)`. These would need new UNIQUE indexes.

They harden invariants the application already enforces; E5, E7 and E8 verify them today.

**Migrations are never squashed.** Production records all 14 in `_prisma_migrations`. The 15E.4b migration stays as history, and `migration-backfill.db-spec.ts` keeps testing it (§8.2).

### 7.2 M1 — `<timestamp>_phase15e4e_contract_session_id` (15E.4e.1) [DESIGN, sketch]

```sql
-- Serialize with every application writer of refresh_tokens for the length of
-- the migration (reads continue). Requires a transaction — see §7.3.
LOCK TABLE "refresh_tokens" IN SHARE ROW EXCLUSIVE MODE;

-- 1. Attach every still-LIVE session-less token to its own session — the exact
--    rule of 20261002090000 (nobody is signed out, no absolute expiry shortened).
WITH legacy AS (
    SELECT t."id" AS "token_id",
           nextval(pg_get_serial_sequence('"auth_sessions"', 'id')) AS "session_id",
           t."user_id", t."created_at",
           GREATEST(t."created_at" + INTERVAL '90 days', t."expires_at") AS "absolute_expires_at"
    FROM "refresh_tokens" t
    WHERE t."session_id" IS NULL AND t."revoked_at" IS NULL AND t."expires_at" > CURRENT_TIMESTAMP
), created AS (
    INSERT INTO "auth_sessions" ("id", "user_id", "created_at", "absolute_expires_at", "last_used_at")
    SELECT "session_id", "user_id", "created_at", "absolute_expires_at", "created_at" FROM legacy
    RETURNING "id"
)
UPDATE "refresh_tokens" r SET "session_id" = legacy."session_id"
FROM legacy WHERE r."id" = legacy."token_id" AND r."session_id" IS NULL;

-- 2. Every row still session-less is dead (revoked or expired). D1 = delete:
DELETE FROM "refresh_tokens" WHERE "session_id" IS NULL;
--    (D1 alternative: one revoked LEGACY_MIGRATION session per user, rows attached to it.)

-- 3. Explicit guard with a clear message (SET NOT NULL below would fail anyway).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "refresh_tokens" WHERE "session_id" IS NULL) THEN
    RAISE EXCEPTION 'phase15e4e: session-less refresh tokens remain';
  END IF;
END $$;

-- 4. Contract.
ALTER TABLE "refresh_tokens" ALTER COLUMN "session_id" SET NOT NULL;
```

**Notes:**

- **Step 2 deletes only dead rows.** No successor can point at them: only attached tokens are ever rotated by session-aware code. E4 confirms this. In any case `parent_id` is ON DELETE SET NULL.
- **The foreign key needs no change.** The Prisma-generated SQL for a required relation is the same ON DELETE CASCADE FK. Implementation must make sure Prisma doesn't emit a needless drop and recreate. [OPEN, verify the generated SQL]
- **Lock impact.** `SET NOT NULL` takes ACCESS EXCLUSIVE and scans `refresh_tokens`. The table is small (E2 gives the size), so refreshes and sign-ins in flight wait for at most the migration's duration. No request fails because of the lock.

### 7.3 Transactionality [OPEN]

M1 must be atomic: lock, attach, delete, guard and `SET NOT NULL` all in one transaction. Implementation must **prove on real PostgreSQL** whether `prisma migrate deploy` applies a migration file inside a transaction.

- **If it does:** `LOCK TABLE` works as written.
- **If it doesn't:** wrap the file explicitly (`BEGIN; … COMMIT;`) and prove that a failure partway leaves no change.

The required migration test (§8.2) covers this.

### 7.4 M2 — `<timestamp>_phase15e4e_drop_legacy_columns` (15E.4e.2) [DESIGN, sketch]

```sql
ALTER TABLE "refresh_tokens" DROP COLUMN "user_agent", DROP COLUMN "ip_address";
-- Enum value removal (PostgreSQL cannot DROP VALUE): Prisma's recreate pattern,
-- guarded so it fails rather than casts an existing LEGACY_MIGRATION row.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "auth_sessions" WHERE "revoked_reason" = 'LEGACY_MIGRATION') THEN
    RAISE EXCEPTION 'phase15e4e: LEGACY_MIGRATION sessions exist';
  END IF;
END $$;
ALTER TYPE "SessionRevokedReason" RENAME TO "SessionRevokedReason_old";
CREATE TYPE "SessionRevokedReason" AS ENUM ('LOGOUT', 'PASSWORD_RESET', 'SUSPENDED', 'REUSE_DETECTED');
ALTER TABLE "auth_sessions" ALTER COLUMN "revoked_reason" TYPE "SessionRevokedReason"
  USING ("revoked_reason"::text::"SessionRevokedReason");
DROP TYPE "SessionRevokedReason_old";
```

M2 ships **with no code change**: C1's schema already matches the database after M2. The type recreation briefly takes ACCESS EXCLUSIVE on `auth_sessions`, a small table.

---

## 8. Testing strategy

### 8.1 Must stay green, unchanged in intent [VERIFIED as existing]

All the 15E.4b, 15E.4c and 15E.4d tests that don't involve session-less tokens:

- every sign-in path creates exactly one session (`auth.service.spec.ts`, `auth-codes.spec.ts`, DB);
- rotation; 100-way concurrent refresh; the `parent_id UNIQUE` backstop; failed rotation commits nothing;
- harmless same-token race inside the grace window; reuse leads to one-session revocation plus an audit row; skew bounds;
- logout (current token, grace-window predecessor, refused older token, races with refresh);
- password reset and suspension kill all sessions plus `sv`; reinstatement revives nothing;
- `sid` binding and mandatory `sid` (19 DB tests in `access-token-sessions.db-spec.ts`, including the no-`sid` regression);
- multi-device isolation; cross-user isolation; absolute-expiry enforcement on refresh and on access tokens;
- uniform 401s; no token or hash in logs or audit rows.

### 8.2 New or changed tests [DESIGN]

| Test | Kind |
|---|---|
| **Migration M1 on existing data** (new `test/db/migration-contract.db-spec.ts`, same pattern as `migration-backfill.db-spec.ts`). Database at all migrations before M1, seeded with: a live session-less token, a revoked one, an expired one, a session-attached chain, and a revoked session. Apply M1. Assert: the live one is attached with absolute expiry `GREATEST(created + 90d, expires)` and still refreshes; dead ones deleted (or, under D1-alt, attached to a revoked `LEGACY_MIGRATION` session); the chain is untouched; `session_id` is NOT NULL (`information_schema`). | PostgreSQL |
| **M1 atomicity:** with a forced failure after step 1, nothing persists (§7.3) | PostgreSQL |
| **M1 against a running previous release:** the 06d6de9 code paths (rotation, logout, reset) work during and after M1 (no NULL writes; the lock only delays) | PostgreSQL |
| **No session-less token can exist:** a raw INSERT without `session_id` is refused by the database | PostgreSQL |
| **Rollback compatibility of 4e.1:** the previous release's rotation (Prisma client from the 06d6de9 schema, or its exact SQL) works on the post-M1 schema | PostgreSQL |
| **M2:** applies on data with 0 `LEGACY_MIGRATION` rows and fails with a guard message when one exists; C1 works against the post-M2 schema | PostgreSQL (4e.2) |
| `revokeAllUserSessions` performs exactly two updates on tokens and sessions (no legacy sweep); its audit payload is unchanged (`sessionsRevoked`, `tokensRevoked`) | Unit plus DB |
| *(D3)* a correctly signed token with a live `sid` but **no `sv`** gets the generic 401; replaces "a token without an `sv` claim counts as version 0" (`session-security.spec.ts:273`) | Unit plus DB |
| `migration-backfill.db-spec.ts`: copy only the migrations **ordered before** `20261002090000`, not "all but this one". Otherwise M1 would run before the column it contracts exists. | Fix |

### 8.3 Obsolete tests: remove in 4e.1 [VERIFIED as present]

**Seven tests are deleted:**

- `test/db/refresh-sessions.db-spec.ts`:
  - "a session-less token written by the previous release is attached to a new session on first use" (≈ line 507);
  - "concurrent first uses of one legacy token: one session, one successor, no orphan session" (≈ 526);
  - "a password reset racing the first use of a legacy token leaves no live token behind" (≈ 541);
  - the whole `describe('legacy (session-less) token')` block (≈ 731), 3 tests;
  - the `insertLegacyToken` and `insertLegacy` helpers.
- `test/db/reuse-detection.db-spec.ts` test 18, "legacy tokens: one rotated by the previous release is a plain 401…" (≈ 468).

**Five specs need adjustments:**

- `refresh-sessions.db-spec.ts` "a token rotated by the new code is refused by the previous release too": **keep**, retitled as the C5 invariant (rotation sets `revoked_at`). Its `previousReleaseRefresh` helper inserts without `session_id`; that branch is unreachable for a rotated token, but must be typed or removed so the file compiles against the required relation.
- `src/auth/session-security.spec.ts`: the in-memory token mock defaults `sessionId: null`; make it required.
- `src/admin/user-status.authorization.spec.ts`: the `refreshToken.updateMany` mock assumes two calls (legacy sweep, then all tokens); it becomes one call, and the expected `tokensRevoked` changes accordingly.
- `src/auth/auth-codes.spec.ts`: the token mock type `sessionId: number | null` becomes `number`.
- `src/auth/refresh-sessions.spec.ts` "no successor row (only after a future cleanup)": **keep**. It is still valid input, because `parent_id` is ON DELETE SET NULL.

**Expected counts after 4e.1:** DB = 84 − 7 + the new migration, contract and compatibility tests. Unit = 996 ± the D3 replacement and mock-only edits. The exact numbers are recorded at implementation.

### 8.4 Mutation checks required for 4e.1 [DESIGN]

1. Remove `SET NOT NULL` from M1: the "no session-less token" and migration tests fail.
2. Remove the attach step (step 1): the live-legacy-token-survives test fails.
3. Delete live rows in step 2 (drop the `session_id IS NULL` predicate, or reorder): the migration test fails.
4. (D3) Restore `sv ?? 0`: the no-`sv` test fails.

---

## 9. Implementation plan

**Legend:**

- **SAFE NOW**: can be done without further input.
- **NEEDS EVIDENCE**: requires the production evidence in §6.
- **NEEDS OWNER**: requires an owner decision.
- **AFTER `<step>`**: must happen after the named step.

### 9.1 Preconditions

| # | Step | Class |
|---|---|---|
| P1 | 15E.4d.2 live and verified (`06d6de9`, deployment `0a5e9950`) | done [VERIFIED] |
| P2 | Owner decisions D1–D4 (§12) | NEEDS OWNER |
| P3 | §6 evidence collected; all gates pass | NEEDS EVIDENCE, AFTER D4 |

### 9.2 Read-only production evidence

| # | Step | Class |
|---|---|---|
| E | Run §6 in a read-only transaction; record counts only | NEEDS EVIDENCE (owner-run) |

### 9.3 Migration order

| # | Step | Class |
|---|---|---|
| M1 | Contract migration (§7.2) in PR 4e.1 | NEEDS EVIDENCE, NEEDS OWNER (D1); AFTER E |
| M2 | Drop migration (§7.4) in PR 4e.2 | NEEDS OWNER (D2); AFTER 4e.1 verified and the soak period |

### 9.4 Backend code cleanup (PR 4e.1, with M1)

| # | Step | Class |
|---|---|---|
| B1 | `schema.prisma`: `sessionId Int`, `session AuthSession` (required); remove the `userAgent` and `ipAddress` fields from `RefreshToken`; remove `LEGACY_MIGRATION` from the enum (DB value stays until M2; requires D1 = delete); update the comments | AFTER E (and D1) |
| B2 | `auth.service.ts`: remove `attachLegacySession`, the `?? attachLegacySession` fallback and the logout `sessionId === null` branch; rewrite the L7 comment | SAFE once B1 is decided |
| B3 | `refresh-sessions.ts`: remove `legacySessionExpiry` and the `revokeAllUserSessions` step 1; update the header and lock-order comments | SAFE once B1 is decided |
| B4 | *(D3)* `jwt.strategy.ts`: `sv: number` required; a missing or non-integer `sv` gets the generic 401 | NEEDS OWNER (D3) |
| B5 | No change to rotation, reuse detection, logout entitlement, reset, suspension or `JwtStrategy` session checks | — |

### 9.5 Frontend cleanup

| # | Step | Class |
|---|---|---|
| F1 | None. No code change: tokens are opaque, and the coordinator stays canonical. | SAFE NOW (nothing to do) |

### 9.6 Test changes

| # | Step | Class |
|---|---|---|
| T1 | §8.2 additions, §8.3 removals and adjustments, §8.4 mutation checks | AFTER B1–B4 |

### 9.7 Documentation changes

| # | Step | Class |
|---|---|---|
| D-a | Merge (or re-land) the 15E.4b and 15E.4c doc commits (`16cae8a`, `13ee3c5`, `e96b7a9`) so frontend `main` matches what is live | NEEDS OWNER (merge); can precede 4e.1 |
| D-b | `PHASE_15E4_REFRESH_TOKEN_ARCHITECTURE.md`: status header; §12 contract step marked done, with the D1 outcome | AFTER 4e.1 |
| D-c | `SECURITY.md`: retire stale items — "#6 No refresh flow on the client" (fixed by 15E.4a); "#14 Populate `RefreshToken.userAgent/ipAddress`" (superseded by session columns, then dropped); the pre-15B `sv` note (if D3) | AFTER 4e.1 |
| D-d | `DECISIONS.md`: record the 15E.4e contract decisions (D1–D3) | AFTER 4e.1 |
| D-e | This document: §12 implementation record | AFTER each deploy |

### 9.8 Deployment sequence

1. **PR 4e.1** (branch `feat/15e4e1-session-contract`). CI must pass: unit tests, real PostgreSQL, migration, concurrency, build. **AFTER** E, D1, D3.
2. **Owner merges.** Railway waits for CI (`checkSuites: true`), builds, and runs `prisma migrate deploy` (M1) at container start while `06d6de9` keeps serving. C1 then takes traffic.
3. **Production verification of 4e.1** (§9.9).
4. **Soak period** (D2; recommended ≥ 24 h, with no rollback needed).
5. **PR 4e.2** (M2 only) → CI → owner merges → deploy → verification.

### 9.9 Production verification (per deploy)

- **Deployment:**
  - SUCCESS on the exact merge SHA, after the CI gate;
  - 1/1 replica, no crash loop;
  - logs show the new migration applied and "All migrations have been successfully applied" (or "No pending" on restart).
- **Database (read-only):**
  - re-run E3: `total` = 0;
  - E5–E14 still 0;
  - `information_schema.columns` shows `refresh_tokens.session_id is_nullable = 'NO'`;
  - after 4e.2, the columns are absent and the enum has 4 values.
- **HTTP smoke (anonymous, as in 15E.4d.2):**
  - public 200;
  - protected without a token 401;
  - malformed and wrong-signature JWT 401;
  - random refresh 401;
  - random logout 200 `{success:true}`.
- **Runtime:** 0 × 5xx; no `JwtStrategy` or refresh error spikes.
- **Signed-in check (optional, owner's own account):** sign in, refresh, log out; the old access token gets a 401. A real-user check was not possible in 15E.4d.2.

### 9.10 Rollback considerations

See §10. In short:

- after 4e.1, rollback to `06d6de9` is safe;
- after 4e.2, the rollback floor is the 4e.1 code;
- the rows deleted by M1 can't be restored, but they're unusable either way.

### 9.11 Definition of Done

See §13.

---

## 10. Deployment and rollback safety

| Question | Answer |
|---|---|
| **Rolling deploy of 4e.1:** old `06d6de9` serving while M1 runs | **Safe.** `06d6de9` never writes a NULL `session_id`. Its `attachLegacySession` only runs on NULL rows, and none remain after M1. Its `revokeAllUserSessions` step 1 filters `session_id IS NULL`, which is valid SQL on a NOT NULL column and matches 0 rows. It still knows `user_agent` and `ip_address`, and they still exist. The `LOCK TABLE` and `SET NOT NULL` only delay its writes for the migration's duration. [DESIGN; proven by the §8.2 test] |
| **Rollback after 4e.1** to `06d6de9` (or `2dc5dc4` or `12e261d`) | **Possible.** Their Prisma client reads a NOT NULL column as `Int?` without issue. |
| **Rollback after 4e.1** to pre-15E.4b code (`41ee971` or earlier) | **Impossible.** Its token INSERT omits `session_id`. In practice this floor already exists, because pre-15E.4b code would ignore sessions entirely. |
| **Reverting M1 itself** | The `NOT NULL` can be reverted manually (`DROP NOT NULL`, owner-approved database change). The **deleted dead rows can't be restored**; they had no function (unusable, refused either way). |
| **Rolling deploy of 4e.2:** C1 serving while M2 runs | **Safe.** C1's client doesn't know the dropped columns or the enum value. |
| **Rollback after 4e.2** | **Floor = 4e.1 code.** Rolling back to `06d6de9` would break login and refresh ("column `user_agent` does not exist"). Reverting M2 means a forward-fix migration (re-add nullable columns, re-add the enum value), not a rollback. **This is why 4e.2 is separate and comes after a soak period.** |
| **Database backward compatibility** | M1 is backward compatible with all 15E.4b+ code; M2 only with 4e.1+ code |
| **Forced logout** | **Not necessary.** Live session-less tokens are attached, not revoked. Existing sessions and tokens are untouched. |
| **Can any existing session or token be invalidated?** | Only dead session-less rows (already unusable) are deleted. No live token, session or access token is invalidated. Under D3, a validly signed access token without `sv` would get a 401, but none can exist (§3, L10). |
| **Railway rollback mechanics** | A Railway "rollback" redeploys an old image; migrations are not reversed. An old image's start command runs `prisma migrate deploy` against a database that has newer migrations. Whether that succeeds must be confirmed before relying on it. [OPEN] |
| **Migration failure at boot** | The start command is `npx prisma migrate deploy && npm run start:prod`, and the service has no healthcheck. If M1 fails (guard, lock timeout), the new container exits. What Railway does then (keeps the old deployment serving, or not) is [OPEN]; confirm during 4e.1 preparation, e.g. from Railway documentation. M1 is atomic (§7.3), so a failure leaves the database unchanged. |

---

## 11. Out-of-scope items

| Item | Relation to 15E.4e | Status |
|---|---|---|
| JWT algorithm pinning to HS256 (OPEN-5): `JwtStrategy` passes no `algorithms` option [VERIFIED, `jwt.strategy.ts:41–45`] | Unrelated to the contract | **Follow-up** |
| Login racing a password reset (OPEN-7): a login that read the user before the reset can create a session after `revokeAllUserSessions`; its access token dies on `sv`, but its refresh token can mint a fresh access token | Unrelated; the contract neither fixes nor worsens it | **Follow-up** |
| Retention purge of expired or revoked tokens and sessions: none exists [VERIFIED] | Related but **not** contract. A purge must keep rotated tokens while they can still be replayed, or reuse detection weakens. | **Follow-up** [OPEN design] |
| Optional database constraints (§7.1: CHECK, composite FKs) | Hardening of invariants the code already enforces | **Follow-up** [OPEN] |
| Redundant `auth_sessions(user_id)` index | DB hygiene | **Follow-up** [OPEN] |
| Broader rate-limit hardening | Unrelated | Follow-up |
| CSP and security headers | Unrelated | Follow-up |
| Token storage strategy (localStorage) | Unrelated (frontend contract unchanged) | Follow-up |
| Unused `JWT_REFRESH_SECRET` variable (environment change; DECISIONS D-36) | Unrelated | Follow-up (owner, environment) |
| Session or device management UI | Unrelated | Follow-up |
| `npm audit` findings; Dockerfile `SecretsUsedInArgOrEnv` warning | Unrelated | Follow-up |

None of these is a **prerequisite** for 15E.4e.

---

## 12. Owner decisions

| # | Decision | Recommended | Why | Consequence |
|---|---|---|---|---|
| **D1** | What happens to **dead** session-less refresh-token rows (revoked or expired) in M1 | **Delete them** | They can never authenticate. Deleting needs no synthetic sessions, frees `LEGACY_MIGRATION` for removal, and gives the same 401 as keeping them. | Irreversible deletion of unusable rows (count from E3). The alternative keeps them under per-user revoked `LEGACY_MIGRATION` sessions, and the enum value stays. |
| **D2** | Do **15E.4e.2** (drop `refresh_tokens.user_agent`/`ip_address` and `LEGACY_MIGRATION`), and after what soak period | **Yes, as a separate deploy ≥ 24 h after 4e.1 is verified** | It removes dead schema that misleads readers (SECURITY.md #14). It is separate because it raises the rollback floor to 4e.1. | After 4e.2, rolling back to pre-4e.1 code breaks login and refresh. Declining leaves two unused nullable columns and one unused enum value. |
| **D3** | Make the access-token **`sv` claim mandatory** in 4e.1 | **Yes** | It is the last pre-15B compatibility path. No valid token lacks `sv` (every `sid` token was issued with `sv`). | One more generic-401 case, with no expected user impact. Declining keeps `sv ?? 0` as harmless dead code. |
| **D4** | **Who runs the §6 read-only production queries**, and how | **The owner, in the Railway Postgres query view, inside `BEGIN … READ ONLY … ROLLBACK`, sharing counts only** | This session has no safe read-only database access and must not look for credentials | 4e.1 can't start until the results are in |

---

## 13. Definition of Done

**15E.4e.1**

- §6 evidence recorded in the PR; all gates pass.
- M1 applied in production; `refresh_tokens.session_id` is NOT NULL; E3 `total` = 0; E5–E14 = 0.
- L2–L5 removed (and L10 if D3); no code path handles a session-less token.
- New migration, contract and compatibility tests are green in CI on real PostgreSQL; obsolete tests removed; §8.4 mutation checks fail as expected and pass when restored.
- Unit tests, DB tests, type-check and build green; `git diff --check` clean.
- Production verification (§9.9) passes: deployment on the exact merge SHA, after the CI gate, healthy, smoke as expected.
- No forced logout; no live session or token invalidated.
- Docs D-b to D-e updated.

**15E.4e.2 (if D2)**

- M2 applied; columns and enum value gone; verification passes; rollback floor recorded.

**Not done by 15E.4e:** everything in §11.

---

## 14. Classification summary

| Topic | Status |
|---|---|
| Heads, history, deployment timeline, schema, code paths, frontend path, test inventory (§2) | **VERIFIED** |
| Legacy-path inventory L1–L11 (§3) | **VERIFIED** (reachability of L2/L4 depends on E3: **OPEN**) |
| Final contract C1–C14 (§4) | **DESIGN** |
| Expand → contract plan, 4e.1/4e.2 split (§5) | **DESIGN** |
| Production counts (§6) | **OPEN**: not obtainable in this session |
| M1 and M2 SQL (§7) | **DESIGN** (sketch; generated SQL to be verified) |
| Migration transactionality under `prisma migrate deploy` (§7.3) | **OPEN** |
| Railway behavior on migration failure and on rollback to an older image (§10) | **OPEN** |
| Production `JWT_REFRESH_EXPIRES_IN` value | **OPEN**, not required |
| Test plan (§8) | **DESIGN** |
| Owner decisions D1–D4 (§12) | **OPEN** until decided |
| Optional DB constraints, retention purge, redundant index (§11) | **OPEN**, out of scope |

---

## 15. Implementation record — 15E.4e.1 (2026-10-03)

### 15.1 Production evidence (§6), collected 2026-10-03 [VERIFIED]

Collected read-only through Railway's authenticated database UI (one aggregate `SELECT`; counts only). Every gate passed.

| Check | Result |
|---|---|
| E1 sessions | 12 total, 12 active, 0 revoked, 0 expired-unrevoked; reasons: none (NULL = 12) — **no `LEGACY_MIGRATION`** |
| E2 tokens | 181 total, 11 live, 1 rotated, 7 revoked-not-rotated, 162 expired-unrevoked; `user_agent`/`ip_address` populated: **0** |
| E3 session-less | 168 total — **0 live**, 7 revoked, 161 expired; newest created 2026-10-02 02:52:53 (before the 10:27:40 UTC cutover); latest unrevoked expiry 2026-09-28 (past) |
| E4–E14 | all **0** |
| E15 migrations | 14 applied, 0 unfinished, 0 rolled back |
| Schema | `session_id` / `user_agent` / `ip_address` / `rotated_at` / `parent_id` nullable; enum has 5 values incl. `LEGACY_MIGRATION` |

So in production the attach step is a no-op and the delete step removes 168 dead rows. The migration does not rely on these counts.

### 15.2 Commits and branch

| Item | Value |
|---|---|
| Backend branch | `feat/15e4e1-refresh-token-contract-cleanup` (from `main` `06d6de9`) — **not merged, not deployed** |
| Implementation commit | `59873c5684111b0ab8d1685e44bdb9c04c0aab8d` |
| Migration | `20261003090000_phase15e4e1_refresh_token_session_contract` |
| Frontend docs branch | `docs/15e4e1-refresh-token-contract-cleanup` (this document, plus the 15E.4b/15E.4c doc reconciliation) |

### 15.3 Final schema contract after 15E.4e.1

| Element | State |
|---|---|
| `refresh_tokens.session_id` | INT **NOT NULL**, FK → `auth_sessions.id` ON DELETE CASCADE (FK unchanged) |
| `refresh_tokens.parent_id` | INT NULL (root token), UNIQUE, FK self ON DELETE SET NULL — unchanged |
| `refresh_tokens.rotated_at`, `revoked_at` | unchanged; rotation still writes both |
| `refresh_tokens.user_agent`, `ip_address` | **still in the database**, removed from the Prisma schema (see below); dropped by 15E.4e.2 |
| `SessionRevokedReason.LEGACY_MIGRATION` | **still in the database type**, removed from the Prisma schema; removed by 15E.4e.2 |
| Indexes, other FKs, `auth_sessions` | unchanged |

**Why the two columns and the enum value leave the Prisma schema now** (design §5, D2). Prisma names every column it reads or returns. If 15E.4e.2 dropped them while a release that still knew them was serving (the rolling-deploy overlap, or a rollback), that release's refresh would fail. Leaving the client one release earlier makes 15E.4e.2 a migration-only change that is safe while 15E.4e.1 serves. The database objects are untouched by 15E.4e.1. `prisma migrate dev` will now offer to generate exactly the 15E.4e.2 drop; that is expected, and the schema comments say so.

### 15.4 The migration as implemented

One transaction, in order:

1. `SET LOCAL lock_timeout = '30s'`, then `LOCK TABLE refresh_tokens IN ACCESS EXCLUSIVE MODE`.
2. Attach every still-live session-less token (`revoked_at IS NULL AND expires_at > now`) to a new session of its own user, using the 15E.4b backfill rule: `created_at` = token's, `absolute_expires_at = GREATEST(created_at + 90 days, expires_at)`, `last_used_at = created_at`.
3. Delete session-less rows that are **explicitly dead** (`revoked_at IS NOT NULL OR expires_at <= now`).
4. Guard: abort if any `session_id IS NULL` remains.
5. `ALTER TABLE refresh_tokens ALTER COLUMN session_id SET NOT NULL`.

**Deviations from the §7.2 sketch, and why:**

- **`ACCESS EXCLUSIVE` from the start, not `SHARE ROW EXCLUSIVE`.** `SET NOT NULL` needs `ACCESS EXCLUSIVE`. Upgrading to it later could deadlock against an application transaction that had already read `refresh_tokens` and then queued for a write behind the weaker lock. Taking the strongest lock first removes the upgrade.
- **`lock_timeout` 30 s.** If an application transaction still holds the table, the migration gives up atomically instead of queueing every sign-in and refresh behind it indefinitely. Prisma's interactive transactions time out after 5 s, so 30 s is generous.
- **UTC comparisons** (`CURRENT_TIMESTAMP AT TIME ZONE 'UTC'`). The columns are `timestamp without time zone` holding UTC (Prisma). A server `TimeZone` other than UTC would otherwise shift the live/dead split; the local test server runs Asia/Tashkent, which the tests exercise.
- **Explicit "dead" predicate on the delete.** A live row can never be deleted by step 3; if one survived step 2, step 4 aborts the migration instead.

### 15.5 Legacy paths removed

| Removed | Where |
|---|---|
| Lazy session attachment on refresh (`attachLegacySession`, `?? attachLegacySession`) | `src/auth/auth.service.ts` |
| Logout branch for `sessionId === null` | `src/auth/auth.service.ts` |
| `revokeAllUserSessions` session-less sweep (step 1) | `src/auth/refresh-sessions.ts` |
| `legacySessionExpiry` | `src/auth/refresh-sessions.ts` |
| Optional `sv` claim, `(payload.sv ?? 0)` (D3) | `src/auth/strategies/jwt.strategy.ts` — `sv` is now required; strict equality with the stored integer refuses a missing, null, string or fractional `sv` with the generic 401 |
| Lock-order and rotation comments that described the legacy paths | `refresh-sessions.ts`, `auth.service.ts` |
| Session-less-only tests (7) | `test/db/refresh-sessions.db-spec.ts`, `test/db/reuse-detection.db-spec.ts` (test 18 replaced by a session-backed equivalent) |

Unchanged on purpose: session locking, compare-and-set rotation, `parent_id UNIQUE` and its P2002 backstop, `rotated_at`/`revoked_at` written together, reuse detection and the 10 s grace window (−5 s skew), mandatory `sid`, `sessionVersion` bumps on reset/suspension, audit rows, generic 401s. No frontend change.

### 15.6 OPEN items from the design, now verified

| Design OPEN | Result |
|---|---|
| §7.3 Is a migration file applied in one transaction? | **Yes.** Probed against PostgreSQL 16: a failure after `LOCK`, `CREATE` and `INSERT` left nothing behind; `LOCK TABLE` and `SET LOCAL` work inside it. The contract test re-proves it with the real file plus an injected failing statement: attach, delete and `NOT NULL` are all rolled back. A failed migration is recorded unfinished, and **every later `migrate deploy` refuses with P3009** until it is resolved. |
| §10 Railway behaviour on a failed migration at boot | **Railway docs:** without a healthcheck, a deployment is marked Active as soon as its container *starts*. Migrations run inside the start command (`railway.json`: `npx prisma migrate deploy && npm run start:prod`, restart on failure ×3). A failing migration therefore crashes a deployment that may already have replaced the previous one → **downtime** until fixed, and the restarts hit P3009. Pre-existing for every migration; see §15.9. |
| §10 Can an older image start against a database with newer migrations? | **Yes.** A `06d6de9` migrations folder (14 migrations) against a database with the contract applied (15): "No pending migrations to apply". |
| Rolling deploy / rollback with the previous client | **Compatible.** The real `06d6de9` Prisma client, generated from its schema, ran against the contracted schema: `startSession`'s nested create, rotation (including the full-row `RETURNING` with `user_agent`), `revokeAllUserSessions` (its legacy sweep matched 0 rows), and the `JwtStrategy` session read all work; its attempt to insert a session-less token is refused by the database (P2011). |

### 15.7 Tests and results (local PostgreSQL 16; CI runs on the PR)

| Suite | Result |
|---|---|
| Unit (`npm test`) | **996 / 996** (40 suites) |
| Auth + authz + admin unit suites | **827 / 827** (24 suites) |
| Real PostgreSQL (`npm run test:db`) | **85 / 85** (6 suites) |
| Type-check, production build, Prisma validate + generate, `git diff --check` | all pass; ESLint is not installed in the repository (N/A) |

New or changed PostgreSQL tests:

- `migration-contract.db-spec.ts` (new):
  - the real migration via `prisma migrate deploy` on a database at `06d6de9`'s schema seeded with every kind of session-less row. Live ones, including one expiring in 2 minutes, are attached by the 15E.4b rule and still refresh, with an access-token `sid` naming the new session. Dead ones, including one expired 2 minutes ago and one rotated by the pre-15E.4b release, are deleted. Existing sessions and chains are untouched. `NOT NULL` is enforced;
  - atomic rollback on failure;
  - give-up on lock timeout.
- `session-contract.db-spec.ts` (new): every contract invariant asserted in the database after password login, registration, SMS-code sign-in, rotation, a concurrent burst, a harmless grace-window race, reuse, logout, reset and suspension across users and devices; plus a check that the invariant queries do detect a planted cross-user token.
- `refresh-sessions.db-spec.ts` TEST 13: the database refuses a session-less insert; rotation stamps `revoked_at`; `06d6de9`'s session-less statements run harmlessly on the contracted schema.
- `access-token-sessions.db-spec.ts` 11c: mandatory `sv` over real HTTP through the real guard and strategy.
- `migration-backfill.db-spec.ts`: pinned to the migrations up to 15E.4b and read with raw SQL, so it keeps testing the historical backfill.

**Mutation checks — all 7 killed, code restored byte-for-byte:**

| Mutation | Caught by |
|---|---|
| M1 migration without `SET NOT NULL` | contract migration test |
| M2 migration without the attach step | contract migration test (guard aborts; live token must survive) |
| M3 migration silently discards live tokens | contract migration test |
| M4 migration compares in server-local time | contract migration test (UTC edge fixtures) |
| M5 migration without `lock_timeout` | lock-timeout test |
| M6 `JwtStrategy` with `sv ?? 0` restored | unit `session-security` + PostgreSQL 11c |
| M7 `revokeAllUserSessions` without the token sweep | session-contract invariants test |

### 15.8 Deployment and rollback

- **Order.** One PR, one deploy: the migration runs at container start (before the new code serves), while `06d6de9` keeps serving. `06d6de9` never writes a NULL `session_id`, and it works unchanged on the contracted schema (§15.6). The new code never runs against the nullable schema. No separate expand step is needed: 15E.4b was the expand.
- **Rollback after 15E.4e.1.** Code rollback to `06d6de9` (or `253ede8`, `2dc5dc4`, `12e261d`) works: the image boots and its client works (§15.6). Pre-15E.4b code (`41ee971` and earlier) cannot run: its token INSERT omits `session_id`. The deleted dead rows cannot be restored, but they were unusable. `NOT NULL` can be reverted manually (owner-approved database change) if ever required.
- **Forced logout:** none. No live token, session or access token is invalidated.

### 15.9 Remaining risks

1. **A failed migration means downtime under the current Railway setup.** The cause is pre-existing: no healthcheck, migrations in the start command; recovery needs `prisma migrate resolve --rolled-back` before a redeploy.
   - **Likelihood here is low:** the guard cannot trigger in practice (steps 2 and 3 split every NULL row), the table is small (181 rows), and the only realistic failure is the 30 s lock timeout.
   - **Recommended before merge (owner decision; infrastructure change, not made here):** configure Railway's **pre-deploy command** for `npx prisma migrate deploy` (Railway docs: a failed pre-deploy keeps the previous version running), and/or add a healthcheck path.
2. **Prisma schema drift is deliberate** until 15E.4e.2 (§15.3). Anyone running `prisma migrate dev` must not commit the generated drop outside 15E.4e.2.
3. **D3 adds one refusal case** (missing `sv`). No valid token lacks `sv`, so no user impact is expected.
4. **CI has not run yet on this branch** (it runs when the PR is opened). The new migration tests depend on `prisma migrate deploy` in CI's PostgreSQL service, as `migration-backfill` already did.

### 15.10 Production deployment evidence

*Placeholder — to be filled after the owner merges and Railway deploys:* merge commit, CI run, deployment ID and timeline, migration log lines ("Applying migration `20261003090000_phase15e4e1_refresh_token_session_contract`"), post-deploy read-only checks (E3 `total = 0`, E4–E14 = 0, `session_id is_nullable = 'NO'`), smoke results.

### 15.11 15E.4e.2

**PENDING.** Not before 15E.4e.1 has been live and verified for ≥ 24 h. Scope: drop `refresh_tokens.user_agent` and `ip_address`, and remove `LEGACY_MIGRATION` from the enum (§7.4), after rechecking E1 (`LEGACY_MIGRATION` = 0). It needs no code change, and its rollback floor is the 15E.4e.1 code.

---

*15E.4e.1 is implemented on a feature branch; nothing has been merged or deployed. 15E.4e.2 has NOT started.*
