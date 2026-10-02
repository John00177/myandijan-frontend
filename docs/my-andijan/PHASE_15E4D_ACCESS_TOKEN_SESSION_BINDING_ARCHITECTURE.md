# Phase 15E.4d — Access-Token Session Binding (`sid`)

**Status (2026-10-02):**
- **15E.4d.1 — IMPLEMENTED** on backend branch `feat/15e4d1-access-token-session-binding`, with a PR to `main`. It is not merged or deployed at the time of writing. See §14.
- **15E.4d.2** (`sid` mandatory) is **NOT implemented**.
- **Sections 1–13** are the approved design, kept as written. §14 records what was built and where it is more specific.

**Code inspected:**
- **Backend `main` = `2dc5dc4`** (15E.4c, live as Railway deployment `43c577b0-50c6-4c92-80ee-a3e7caab7fa9`).
- **Frontend `main` = `add3fbe`** (15E.4a).

**Out of scope:** 15E.4e (contract) is separate.

**Labels:**
- **[VERIFIED]** — read in the code named above.
- **[DESIGN]** — the proposal.
- **[OPEN]** — needs an owner decision (collected in §13).

---

## 1. Current implementation (verified)

### Issuing access tokens — `src/auth/auth.service.ts`
- [VERIFIED] **One signing function, `signAccessToken(user)`:**
  - payload `{ sub: user.id, phone, role, sv: user.sessionVersion }`;
  - secret `JWT_ACCESS_SECRET`; `expiresIn: JWT_ACCESS_EXPIRES_IN ?? '15m'`.
  - The production value of `JWT_ACCESS_EXPIRES_IN` exists as a variable, but its value was not inspected (see OPEN-3).
- [VERIFIED] **Two call sites:**
  - `startSession(user)`, used by `register`, `login` and `verifyOtp` (SMS sign-in). It creates the `AuthSession` with its first refresh token, using `select: { id: true }` — **the new session's id is available but currently discarded** — then signs.
  - `refresh()`, after the rotation transaction commits. `rotateRefreshToken` knows `sessionId` but returns only `{ kind: 'rotated', user, refreshToken }`.
- [VERIFIED] **No token carries a session reference today.**

### Validating access tokens
- [VERIFIED] **Library versions:** `passport-jwt` 4.0.1 (`ExtractJwt.fromAuthHeaderAsBearerToken()`, `ignoreExpiration: false`, `secretOrKey: JWT_ACCESS_SECRET`), `jsonwebtoken` 9.0.2, `@nestjs/passport` 10.0.3.
- [VERIFIED] **Algorithms are not pinned.** `jsonwebtoken` 9 with a string secret accepts only HMAC algorithms and refuses `none`, so there is no algorithm-confusion path today.
- [VERIFIED] **`JwtStrategy.validate(payload)`** (`src/auth/strategies/jwt.strategy.ts`):
  1. one `prisma.user.findUnique({ id: payload.sub })`;
  2. reject `!user || status !== ACTIVE || deletedAt` → `UnauthorizedException('User is not active')`;
  3. reject `(payload.sv ?? 0) !== user.sessionVersion` → `UnauthorizedException('Session has been revoked')`;
  4. `setRequestActorRole(user.role)`;
  5. return `{ id, phone, role }` as `request.user`.
- [VERIFIED] **The only route to it:** the global `AuthzGuard` (`APP_GUARD`) calls `JwtAuthGuard` (`AuthGuard('jwt')`) for every non-`@Public` route. `@Public` routes return **before** any JWT handling, so a stale bearer header on a public route has no effect.
- [VERIFIED] **No other code verifies or decodes access tokens:** no `jwtService.verify`/`decode`, no websocket or other transport. `@CurrentUser()` only reads `request.user`.
- [VERIFIED] **The 401 messages differ today:**
  - bad or expired JWT → passport's `"Unauthorized"`;
  - inactive user → `"User is not active"`;
  - `sv` mismatch → `"Session has been revoked"`.
- [VERIFIED] **Every authenticated request already does exactly one primary-key `users` read.** No session read.

### Sessions and revocation (15E.4b/c)
- [VERIFIED] **`AuthSession`:** `id Int` autoincrement PK, `userId`, `absoluteExpiresAt`, `revokedAt`, `revokedReason`, `lastUsedAt`, device fields; indexes `(user_id)` and `(user_id, revoked_at)`.

| Path | Session effect | Token effect | `sessionVersion` |
|---|---|---|---|
| Logout | That session → `LOGOUT` | All its refresh tokens revoked | unchanged |
| Reuse detection (15E.4c) | That session → `REUSE_DETECTED` | All its refresh tokens revoked | unchanged |
| Password reset | **All** sessions → `PASSWORD_RESET` | All tokens revoked | **+1** |
| Suspension | **All** sessions → `SUSPENDED` | All tokens revoked | **+1** (plus status) |
| Absolute expiry | Lazy: refresh refuses once past it | — | unchanged |
| Soft deletion (`deletedAt`) | Sessions not revoked | — | unchanged |

- [VERIFIED] **The gap this phase closes:** after logout, reuse detection or absolute expiry, `sessionVersion` is unchanged. **The session's already-issued access token keeps authorizing until its JWT `exp`** (≤ 15 min by default).
  - Reset and suspension are already immediate, through `sv` and the user status.

### Frontend (`src/lib/api.ts`, `src/contexts/AuthContext.tsx`, `src/lib/auth/refreshCoordinator.ts`)
- [VERIFIED] **Tokens live in `localStorage`** (`myandijan_token`, `myandijan_refresh_token`), sent as `Authorization: Bearer`. The frontend **never decodes** the JWT.
- [VERIFIED] **A protected request that gets 401:**
  1. calls `refreshAccessToken(token)` once (15E.4a coordinated across tabs);
  2. retries once with the new token;
  3. if the refresh fails or the retry is still 401, `handleUnauthorized` clears the pair and signs the user out.
- [VERIFIED] **Logout is unchanged:** `POST /auth/logout { refreshToken }`.

### Tests touching access-token validation
- [VERIFIED] **`src/auth/session-security.spec.ts`:** the real `JwtStrategy` over an in-memory database (legacy token without `sv`; suspension and reset kill the old access token).
- [VERIFIED] **`src/authz/authz.e2e.spec.ts`:** the real guard and strategy, with a mocked `user.findUnique` and tokens signed with `sv: 0`.
- [VERIFIED] **`test/db/reuse-detection.db-spec.ts` test 19:** another session's access token still validates after reuse.
- [VERIFIED] **No test asserts that a revoked session's access token is refused**, because it is not.

---

## 2. Proposed architecture

```text
JWT (HS256, signature + exp)  →  { sub, sid, sv, role, phone }
        │  sid
        ▼
auth_sessions (PK lookup)  →  exists? userId == sub? revoked_at IS NULL? absolute_expires_at > now?
        │  user (PK lookup)
        ▼
users  →  status = ACTIVE? deleted_at IS NULL? session_version == sv?
```

| Property | Protected by |
|---|---|
| The token was issued by this server and not altered (`sub`, `sid`, `sv`, `role` cannot be changed) | **JWT signature** [VERIFIED] |
| The token is not past its lifetime | **JWT `exp`** [VERIFIED] |
| Every session of the user ended by a password reset or suspension | **`sessionVersion`** [VERIFIED] (kept) and, after 15E.4d, also `sid` → `revoked_at` [DESIGN] |
| The user is active and not deleted | **user row check** [VERIFIED] (kept) |
| **This one session** ended (logout, reuse, absolute expiry), with other devices unaffected | **`sid` + `AuthSession`** [DESIGN] — new |

[DESIGN] **`sessionVersion` stays.** It is user-wide by construction and cannot express per-session revocation. 15E.4d never bumps it.

---

## 3. `sid` claim

| Question | Decision |
|---|---|
| Claim name | [DESIGN] `sid` (the registered OpenID Connect claim name for a session identifier) |
| Type / value | [DESIGN] JSON number = `auth_sessions.id`. [OPEN-1] an opaque UUID instead (§10 explains the trade-off) |
| Issued on | [DESIGN] **every** new access token: login, registration, SMS sign-in (all via `startSession`) and refresh (same session id as the rotated token) |
| `JwtPayload` | [DESIGN] `sid?: number` — optional only during the compatibility window (§8); required after enforcement |
| `sid` absent | [DESIGN] Compatibility window: legacy path (exactly today's checks). After enforcement: **401** |
| `sid` present but not a positive integer | [DESIGN] 401 (malformed). It cannot happen with a valid signature unless the secret leaked |
| `sid` → no such session | [DESIGN] 401; `warn` log (should never happen with a valid signature; §11) |
| `sid` → session of another user (`session.userId ≠ sub`) | [DESIGN] 401; `warn` log as suspicious (only a leaked secret or a bug produces it) |
| `sid` must match the user | [DESIGN] **Yes:** `session.userId === payload.sub` is required |
| `sid` in logs / audit | [DESIGN] Allowed. It is a row id, not a credential, the same as the session ids 15E.4c already logs and audits |
| Raw JWT, refresh token, token hash in logs | **Never** [DESIGN] (unchanged rule) |
| Request user | [DESIGN] `AuthenticatedUser` gains `sessionId?: number`, for future use (e.g. a "sign out this device" feature). No controller depends on it in 15E.4d |
| Token `exp` vs session expiry | [DESIGN] Optional hardening: sign with `exp = min(now + ACCESS_TTL, session.absoluteExpiresAt)`. The per-request check already enforces the absolute expiry, so this is cosmetic. [OPEN-6] |

---

## 4. Session validation algorithm (per protected request)

[DESIGN] Inside `JwtStrategy.validate`, after passport has verified the signature and `exp`:

```text
1. sub := payload.sub; sid := payload.sid; sv := payload.sv ?? 0
2. IF sid is undefined:
     compatibility window → legacy path: today's user checks (status, deletedAt, sv); DONE
     after enforcement     → 401
3. IF sid is not a positive integer → 401
4. row := authSession.findUnique({ where: { id: sid },
            select: { userId, revokedAt, revokedReason, absoluteExpiresAt,
                      user: { select: { id, phone, role, status, deletedAt, sessionVersion } } } })
   -- Prisma 5 runs this as two primary-key SELECTs (session, then user); no raw SQL needed
5. reject 401 if any of:
     row is null                          (unknown session)       → warn log
     row.userId != sub                    (cross-user sid)        → warn log
     row.revokedAt != null                (revoked session)       → warn log only if reason = REUSE_DETECTED
     row.absoluteExpiresAt <= now         (session past absolute expiry)
     row.user.status != ACTIVE OR row.user.deletedAt != null
     row.user.sessionVersion != sv
6. setRequestActorRole(row.user.role); return { id, phone, role, sessionId: sid }
```

- [DESIGN] **The response is identical for every failure:** `401 {"message":"Unauthorized","statusCode":401}`. Internally, the cases are distinguished only by the log lines in §11.
  - [OPEN-4] Also replace today's distinct messages (`"User is not active"`, `"Session has been revoked"`) with the generic one. Recommended.
- [DESIGN] **Database errors fail closed.** An exception in the lookup propagates (500); the request is never authorized. The global filter must not turn it into success.
- [DESIGN] **No transaction and no row lock.** It is a single read at READ COMMITTED (§6). A per-request `FOR SHARE` lock would make every revocation wait behind in-flight requests and add lock traffic, for no gain: the request has already been authorized either way.
- [DESIGN] **No write per request.** `last_used_at` stays a refresh-time value.
- [DESIGN] **Indexes:** the session and user primary keys are enough. No new index is needed.

---

## 5. Threat model and revocation semantics

| # | Scenario | Today (15E.4c) | With 15E.4d |
|---|---|---|---|
| 1 | Normal login | Token without `sid` | Token with `sid` = the new session [DESIGN] |
| 2 | Normal API request | 1 user read | Session read + user read (PK); same result [DESIGN] |
| 3 | Normal refresh | New token without `sid` | New token with the **same** `sid` [DESIGN] |
| 4 | **Logout** | The device's access token works ≤ 15 min | **Rejected on its next request** [DESIGN] |
| 5 | Password reset | All access tokens dead (`sv`) | Dead (`sv` **and** revoked sessions) |
| 6 | Suspension | All dead (status, `sv`) | Dead (status, `sv`, revoked sessions) |
| 7 | **Reuse detected** | The session's access tokens work ≤ 15 min (attacker and victim) | **Rejected immediately**; other devices unaffected [DESIGN] |
| 8 | Stolen refresh token | 15E.4c contains it on reuse; the access tail stays | Containment now includes the access token [DESIGN] |
| 9 | Stolen access token | Usable ≤ 15 min unless reset or suspension | Usable until **that session** is revoked (logout, reuse, reset, suspension) or expires [DESIGN] — still bearer, still ≤ `exp` |
| 10 | Access token of a revoked session | Accepted until `exp` | **401** [DESIGN] |
| 11 | Access token of another active session | Accepted | Accepted — sessions are independent [DESIGN] |
| 12 | Multiple devices | Logout on A leaves A's access token alive | A's token 401; B unaffected (§7) |
| 13 | Multiple tabs | Share one session (one `localStorage`) | Unchanged: all tabs hold the same `sid` and are signed out together [DESIGN] |
| 14 | Session past absolute expiry | Access tokens survive ≤ 15 min past it | **401** immediately [DESIGN] |
| 15 | Deleted user (soft) | 401 (user check) | 401 (user check, kept); sessions need not be revoked |
| 16–20 | Races | — | §6 |

---

## 6. Race-condition analysis

**Consistency guarantee** [DESIGN]: authorization is decided by **one read of the session and user rows when the request is authenticated** (READ COMMITTED: each statement sees all data committed before it began).
- A request whose check ran **before** a revocation committed is authorized, and runs to completion.
- Every request whose check runs **after** the revocation committed is refused.
- **No promise is made** about requests already past their check. They hold no lock and are not interrupted — the same semantics as `sessionVersion` today.

| Race | Behaviour |
|---|---|
| API request vs revocation (logout, reuse, reset, suspension) | Check before commit → allowed (in-flight request completes). Check after commit → 401. There is no partial state: the check reads committed rows only [DESIGN] |
| Refresh vs revocation | The rotation holds the session lock (15E.4b), so revocation waits for it. The new access token carries `sid` = that session. Once the revocation commits, the token fails step 5 on its **first** use. **Closes today's gap**, where a refresh committing just before a revocation minted a 15-minute access token that outlived it [DESIGN] |
| Reuse detection vs API request | Detection commits `REUSE_DETECTED`; any later request with that `sid` → 401 (a `warn` line flags it). A request already past its check completes [DESIGN] |
| Logout vs API request | As the first row; the logging-out device's other in-flight requests may complete, and later ones are 401 [DESIGN] |
| Password reset vs API request | The reset commits the user write (`sv + 1`) and revokes the sessions **in one transaction**, so the change is visible all at once: a later check fails on both `sv` and `revoked_at` [DESIGN] |
| Suspension vs API request | Same, plus the status check [DESIGN] |
| Refresh signs after its commit, revocation lands in between | The token's `sid` names a revoked session → rejected on first use [DESIGN] |

**Pre-existing gap, not introduced and not closed by 15E.4d** [VERIFIED analysis]:
- A *login* with the old password that starts before a password reset can create its session after the reset's sweep (identified in the 15E.4b review).
- 15E.4d does not create that session. The session is valid, so its tokens are valid.
- Closing it needs session creation bound to `sessionVersion`: an `auth_sessions.session_version` column, checked in step 5. That is a schema change. [OPEN-7] fold it into 15E.4d or track it separately.

---

## 7. Multi-device proof

[DESIGN] User U signs in on device A (session `sA`) and device B (session `sB`). The access tokens carry `sid = sA` and `sid = sB`. Logout on A, or reuse detected in A's chain, sets `revoked_at` on `sA` only.
- **Token A** → step 5 finds `sA.revokedAt != null` → **401**. The frontend's refresh then fails too, so A is signed out.
- **Token B** → `sB` is live, `U.sessionVersion` is unchanged (no path except reset and suspension changes it) → **authorized**.
- **Reset and suspension** still revoke every session **and** bump `sessionVersion`, so A and B both die, as designed.
- **15E.4d never uses `sessionVersion` for per-session revocation.**

---

## 8. Migration and rolling deployment

- [VERIFIED] **No schema change is required:** `sid = auth_sessions.id` already exists. Unless OPEN-1 (UUID) or OPEN-7 (session version) is chosen, there's no migration and no backfill.
- [DESIGN] **Every live refresh token already belongs to a session** (15E.4b backfill and attach), so the first refresh after deploy yields a `sid` token for every client.

**Recommended sequence** [DESIGN]:

| Step | What | Old tokens (no `sid`) | Risk |
|---|---|---|---|
| **15E.4d.1** (deploy 1) | Issue `sid` on every new token; enforce §4 for tokens **with** `sid`; tokens **without** `sid` take the legacy path (today's checks) | Accepted until their own `exp` | None: new code accepts everything old code issued, and old code (during Railway's overlap) accepts new tokens, because it ignores unknown claims |
| wait | ≥ the production access-token lifetime + margin after 15E.4d.1 is live (e.g. 15 min TTL → next day) | All expire naturally; every client has refreshed onto a `sid` token | — |
| **15E.4d.2** (deploy 2) | Require `sid`: no `sid` → 401; remove the legacy branch | None valid remain | Tiny: a stray old token causes one transparent refresh |

- [DESIGN] **No feature flag.** The two deploys are the switch, and each is reversible by revert.
- [DESIGN] **No forced logout.** Clients move onto `sid` tokens through their normal refresh.
- [DESIGN] **Why not enforce in a single deploy** [OPEN-2]:
  - During Railway's brief overlap (≈ seconds observed), the old container can still mint a `sid`-less token through refresh. A strict new container would 401 the retry, and the frontend allows one refresh and one retry per request, so that user would be signed out.
  - The two-step plan removes that possibility, at the cost of one small extra PR.
- [DESIGN] **Rollback:**
  - reverting 15E.4d.1 → old code ignores `sid`; nothing breaks;
  - reverting 15E.4d.2 → the legacy branch returns.

---

## 9. Performance

- [VERIFIED] **Today:** 1 primary-key `SELECT` on `users` per authenticated request.
- [DESIGN] **After:** 1 primary-key `SELECT` on `auth_sessions` + 1 on `users`. Prisma 5 runs a relation `select` as two statements over the same pooled connection — +1 round trip within Railway's region. Each is an index-only point lookup on a small table:
  - expected well under 1 ms of database time;
  - one extra network round trip (≈ sub-millisecond to ~1 ms in-region) per authenticated request.
- [DESIGN] **The rows are tiny and hot,** so they stay in shared buffers. There's no table scan and no new index.
- [DESIGN] **A single-statement join** (raw SQL, or Prisma's preview `relationJoins`) would save the extra round trip. It is **not recommended now:** it means raw SQL or a preview feature on the authentication path, for a saving that isn't measurable at current traffic.
- [DESIGN] **No cache, no Redis.**
  - Correctness needs revocation to be visible immediately. Any cache needs invalidation on every revocation path (logout, reuse, reset, suspension, expiry), which means a shared store once there is more than one replica.
  - Railway runs **one replica** and traffic is small; the database lookup is cheap and always correct.
  - Revisit only if measurements show authentication lookups mattering (e.g. p95 latency or connection-pool pressure), and then prefer a short in-process TTL over adding Redis.
- [DESIGN] **Expected impact on Railway Postgres:** one extra primary-key query per authenticated API call. Negligible next to the queries those endpoints already run.

---

## 10. Security review

| Topic | Analysis |
|---|---|
| JWT forgery | [VERIFIED] HMAC with `JWT_ACCESS_SECRET`; `jsonwebtoken` 9 refuses `none` and asymmetric algorithms for a string secret. [DESIGN] Optional hardening: pin `algorithms: ['HS256']` in the strategy. [OPEN-5] |
| `sid` tampering | [DESIGN] Impossible without the secret — the claim is signed |
| Cross-user `sid` substitution | [DESIGN] `session.userId === sub` is required; a mismatch → 401 + `warn` |
| Session-id enumeration and predictability | [DESIGN] Sequential integers are harmless while the secret is safe: no endpoint accepts a `sid`, and it can't be altered in a token. **If the secret leaks**, an attacker can forge any token. An integer `sid` adds no barrier (session ids are guessable), whereas an opaque UUID `sid` would also require knowing a live session's UUID. The real response to a secret leak is rotating `JWT_ACCESS_SECRET`, which invalidates every access token. [OPEN-1] |
| Authorization bypass | [DESIGN] The check is inside the single authentication path every non-public route passes through; there is no alternative verifier. Public routes are unaffected (unchanged) |
| Stale access tokens | [DESIGN] Refused once their session is revoked or expired — the purpose of this phase |
| Stolen access token | [DESIGN] Still a bearer token until `exp` or revocation of its session (the victim's logout now ends it). Theft itself is not prevented (localStorage + XSS; CSP is 15E.6) |
| Stolen refresh token | 15E.4c revokes the session on reuse; [DESIGN] with `sid` the attacker's access token dies at the same moment |
| Session fixation | [DESIGN] Not applicable: `sid` is server-assigned at sign-in, a fresh session per sign-in; a client can't choose or carry one in |
| Replay | [DESIGN] Access tokens remain replayable within validity (bearer); `sid` bounds that by the session's life |
| Database failure | [DESIGN] Fails closed (§4) |
| Logging and PII | [DESIGN] Log lines carry session id, user id and request id only. No JWT, no refresh token, no hash, no phone, no IP/UA in logs (the IP and UA stay in the audit table only) |

---

## 11. Observability

[DESIGN] **No audit rows on the request path.** Writing audit rows per refused request would turn normal expiry into write load and let anyone amplify writes. **No log line** for normal outcomes (valid, expired JWT, revoked by logout).

**Structured `warn` lines (IDs only), for signals that matter:**

| Event | Log? | Why |
|---|---|---|
| `sid` names no session | `warn` | Impossible with a valid signature unless rows were deleted or the secret leaked |
| `sid` belongs to another user | `warn` | Same — suspicious by definition |
| Access token used for a `REUSE_DETECTED` session | `warn` | The attacker (or the victim's tab) is still using the stolen session — the useful post-detection signal. Volume is bounded by the token's remaining ≤ 15 min |
| Revoked by logout / reset / suspension | none (`debug` at most) | Expected: other tabs, a slow client |
| Session past absolute expiry | none | Expected, and the frontend recovers by signing in |

- [OPEN-8] keep exactly this list.
- [DESIGN] **Never in any line:** a raw JWT, a refresh token or a token hash.

---

## 12. Test plan (before implementation)

**Unit** (strategy with an in-memory or mocked Prisma; `src/auth/`):
- tokens from `login`, `register`, `verifyOtp` and `refresh` all contain `sid` = their session id; refresh keeps it;
- `sid` absent → legacy path (window) / 401 (after enforcement); malformed `sid` → 401;
- unknown `sid` → 401 + warn; `sid` of another user → 401 + warn;
- revoked session → 401 (warn only for `REUSE_DETECTED`); session past absolute expiry → 401;
- active session → authorized, `request.user.sessionId` set;
- deleted user → 401; suspended user → 401; `sv` mismatch → 401;
- every failure → the identical generic 401 body; a database error → not authorized.
- **Existing fakes must be extended:** `session-security.spec.ts` and `authz.e2e.spec.ts` construct the real strategy, so their Prisma fakes need `authSession.findUnique`, and their signed tokens need `sid`.

**Real PostgreSQL** (`test/db/`):
- active session → request authorized;
- logout → the same access token now 401; the other session's token still authorized;
- reuse detection (15E.4c path) → the session's access token 401 immediately; other session fine;
- reset and suspension → all access tokens 401 (with `sid` and legacy);
- absolute expiry passed → 401;
- **request vs revocation (forced):**
  - check committed before the revocation → allowed;
  - after → 401 (hold the session row; order observed in `pg_stat_activity`, as in 15E.4b/c);
- refresh vs revocation (forced order): the token minted by the rotation is rejected once the revocation commits;
- reuse detection vs request; password reset vs request; suspension vs request;
- compatibility window: a `sid`-less token issued by "old code" is accepted by 15E.4d.1 and rejected by 15E.4d.2.

**Regression:**
- all existing unit (989) and PostgreSQL (65) tests pass;
- 15E.4b rotation, 15E.4c reuse and logout grace behaviour are unchanged;
- 15E.4a needs no change (the frontend contract is the same: 401 → one refresh → retry or sign out).

**Mutation checks:** removing the revoked-session check fails the logout and reuse tests; removing the `userId === sub` check fails the cross-user test.

---

## 13. Implementation sequence and owner decisions

**Sequence** [DESIGN]:
1. **15E.4d.1:**
   - `sid` issuance: `startSession` returns the created id; `rotateRefreshToken` returns `sessionId`; `signAccessToken(user, sessionId)`.
   - `JwtStrategy` session validation with the legacy branch.
   - Generic 401s and the §11 logs.
   - Unit + PostgreSQL tests. One PR, gated CI, deploy, read-only production verification.
2. **15E.4d.2** (after the wait in §8): require `sid`; delete the legacy branch; tests. One small PR.
3. **Optional, per decisions:** `algorithms: ['HS256']` (OPEN-5) can ride in 15E.4d.1; the UUID `sid` (OPEN-1) or the session version (OPEN-7) would add an expand migration to 15E.4d.1.
4. **Frontend: no change required** [VERIFIED analysis] — tokens are opaque to it, and a 401 already triggers one refresh, then retry or sign out.

**Decisions:**

| # | Decision | Recommended default | Reason | Security impact | Operational impact |
|---|---|---|---|---|---|
| OPEN-1 | `sid` value: integer `auth_sessions.id`, or a new opaque UUID column | **Integer** | No schema change; the claim is signed, so its predictability doesn't matter while the secret is safe | A UUID adds a barrier only after a secret leak (the forger must also know a live session UUID) | A UUID needs an expand migration (`gen_random_uuid()` default + unique index) and a backfill |
| OPEN-2 | Rollout: two-step (accept `sid`-less tokens until they expire, then require) or one-step strict | **Two-step** | Removes the Railway-overlap sign-out edge case | Legacy tokens get today's checks for ≤ one access lifetime | One extra small PR a day later |
| OPEN-3 | Confirm the production `JWT_ACCESS_EXPIRES_IN` (its value was not inspected) | **Owner confirms** | It sets the 15E.4d.2 wait and the stolen-token window | A longer TTL = a longer bearer window | None |
| OPEN-4 | Make all access-token 401s identical (also replacing `"User is not active"` / `"Session has been revoked"`) | **Yes** | No session or account-state oracle to a token holder | Small improvement | The frontend checks status only — no impact |
| OPEN-5 | Pin `algorithms: ['HS256']` in the strategy | **Yes, in 15E.4d.1** | Explicit is safer than library defaults | Defense in depth | None |
| OPEN-6 | Cap the access token `exp` at the session's absolute expiry | **Optional (no)** | The per-request check already enforces it | None beyond the check | Slightly shorter final token |
| OPEN-7 | Bind sessions to `sessionVersion` (new column) to close the pre-existing login-vs-reset race | **Separate small phase** | It's a different gap, and it needs a migration | Closes the race | An expand migration |
| OPEN-8 | Observability list (§11) | **As listed** | Security signals without per-request noise | Detects post-reuse use | Low log volume |
| OPEN-9 | Per-request database check, no cache or Redis | **Yes** | Simplest correct option on one replica | Immediate revocation | +1 PK query per authenticated request |

---

## Summary

1. **Current implementation findings.**
   - Access tokens carry `sub`, `phone`, `role` and `sv`; no `sid`.
   - Validation is one user lookup (status and `sv`).
   - Per-session revocation (logout, reuse, absolute expiry) does not affect issued access tokens, so they live ≤ their `exp`.
   - The frontend treats tokens as opaque.
2. **Proposed architecture.**
   - The `sid` claim = `auth_sessions.id` on every new token.
   - Per-request checks: session exists, belongs to `sub`, isn't revoked, isn't past its absolute expiry; plus the existing user checks and `sv`.
   - A generic 401 for every failure, and fail closed on database errors.
3. **Threat model.** §5: logout, reuse and absolute expiry become immediate for access tokens; other sessions are unaffected.
4. **Race conditions.** §6: decided by the committed state at the request's check; in-flight requests complete. The refresh-then-revoke gap is closed. The login-vs-reset race is pre-existing (OPEN-7).
5. **Migration.** §8: no schema change. Two deploys (issue + enforce-if-present, then require); no flag, no forced logout.
6. **Performance.** §9: +1 primary-key lookup per authenticated request; no cache, no Redis.
7. **Test plan.** §12: unit, real PostgreSQL with forced orderings, regression and mutation checks.
8. **Security review.** §10.
9. **Implementation sequence.** §13: 15E.4d.1, then 15E.4d.2; no frontend work.
10. **Owner decisions.** OPEN-1 … OPEN-9 (§13).

---

## 14. Implementation record — Phase 15E.4d.1

[VERIFIED] Backend branch `feat/15e4d1-access-token-session-binding`, based on `main` `2dc5dc4`.

**Behaviour now:**
- **Every new access token contains `sid` = `AuthSession.id`** (an integer, the existing primary key; no new field, no UUID, no migration).
  - `signAccessToken(user, sessionId)` is the only signing function, and `sessionId` is a **required** argument, so no path can issue a token without it.
  - Callers: `startSession` (registration, password sign-in, SMS sign-in) passes the session it just created; `refresh()` passes the session of the rotated token (returned by `rotateRefreshToken`).
- **`sid` binds the token to its `AuthSession`.**
  - `JwtStrategy.validate` keeps its existing user checks (exists, ACTIVE, not deleted) and the `sessionVersion` check.
  - When `sid` is present, it then reads the session by primary key and requires all of: `sid` is a positive integer; the session exists; `session.userId === sub`; `revoked_at IS NULL`; `absolute_expires_at > now`.
  - **So revoking a session (logout, reuse detection) or passing its absolute expiry ends its `sid`-bound access tokens on their next request.** Other sessions are unaffected.
- **Tokens without `sid`** (issued before 15E.4d.1) are still accepted, with exactly the pre-existing checks, until their own `exp`. Nobody is forced to sign in again.
  - **15E.4d.2 will make `sid` mandatory.** Run it only after the production access-token lifetime has fully elapsed since 15E.4d.1 went live (§8).
- **`sessionVersion` is unchanged** and still the user-wide mechanism: password reset and suspension still bump it and refuse every token, with or without `sid`.

**Lifetime:**
- **Unchanged:** the access-token lifetime is still `JWT_ACCESS_EXPIRES_IN ?? '15m'`. The JWT `exp` is **not** tied to the session's absolute expiry.
- **The production value of `JWT_ACCESS_EXPIRES_IN` has not been independently verified.** The variable exists on Railway, but its value was deliberately not read.

**Responses and fail-closed behaviour:**
- **Every refusal is the same `401 {"message":"Unauthorized","statusCode":401}`.** The former `"User is not active"` and `"Session has been revoked"` messages were replaced (OPEN-4 = yes).
- **A database error during the session lookup is caught and refused with that same 401, and logged without detail.** It is never authenticated.
  - *Difference from §4, which said "propagates (500)":* the task required a generic 401. Both fail closed.

**Queries:**
- **The session read is a separate primary-key `findUnique`, run after the user read**, so a token with `sid` costs one extra point lookup.
  - *Difference from §4's combined `select`:* the same cost, but the existing user checks are left untouched.
- **No cache, no Redis, no schema change.**

**Logs** (`JwtStrategy`; IDs only — session, user, request — never a token or hash):
- **`warn`:** unknown `sid`; `sid` of another user; access with a `REUSE_DETECTED` session.
- **`error`:** session lookup failed.
- **Silent:** normal refusals (expired, logged out).

**Tests:**
- **Unit: 995/995** (+6 in `src/auth/session-security.spec.ts`, +1 assertion in `auth.service.spec.ts`; `src/authz/authz.e2e.spec.ts` unchanged — its tokens have no `sid` and still pass via the compatibility path).
- **Real PostgreSQL: 83/83.** There are 18 new tests in `test/db/access-token-sessions.db-spec.ts`, run over real HTTP through the global `AuthzGuard` and the passport strategy. They cover:
  - `sid` on login, refresh, SMS and registration tokens; the lifetime stays `JWT_ACCESS_EXPIRES_IN`;
  - a live `sid` → 200; no `sid` → 200 (compatibility);
  - unknown, cross-user or malformed `sid` → 401;
  - logout, reuse revocation, revocation after refresh, and absolute expiry → 401, with the other session unaffected;
  - suspended and deleted users → 401;
  - password reset, suspension and a `sessionVersion` mismatch → 401;
  - an expired JWT and a bad signature → 401;
  - identical bodies that disclose nothing.
- **Mutation checks:**
  - binding disabled → 7 of the 18 fail;
  - cross-user check removed → test 7 fails;
  - tokens issued without `sid` → 6 fail;
  - restored → all pass.

**Decisions as implemented:**
- OPEN-1: integer `sid`.
- OPEN-2: two-step rollout (this is step 1).
- OPEN-4: generic 401s.
- OPEN-6: no `exp` cap.
- OPEN-8: logs as listed.
- OPEN-9: a database lookup per request.
- **Not done in 15E.4d.1:** OPEN-3 (confirm the production TTL — still required before 15E.4d.2), OPEN-5 (pin HS256) and OPEN-7 (session/`sessionVersion` binding).

**Frontend: no change.** Tokens stay opaque to it, and a 401 still leads to one refresh, then a retry or sign-out.

---

**15E.4d DESIGN VERDICT: APPROVE WITH DECISIONS.**
- **Decide before implementation:** OPEN-1 (integer vs UUID `sid`), OPEN-2 (two-step rollout) and OPEN-3 (confirm the access TTL).
- The rest have safe recommended defaults.
