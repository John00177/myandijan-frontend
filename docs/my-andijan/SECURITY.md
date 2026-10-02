# SECURITY — My Andijan

> A read-only security review conducted 2026-09-28. **Nothing was modified.** Findings are ordered by severity within each section, and each names the file so it can be verified rather than trusted.
>
> **Overall assessment:** the application-level security fundamentals are **better than typical for a project at this stage** — bcrypt at cost 12, hashed refresh tokens, hashed OTP codes, parameterized SQL everywhere, per-request user-status revalidation, a deliberate XSS fix in the map layer, and privacy-by-design in the activity log. The problems are concentrated in **infrastructure posture** (open CORS, no rate limiting, public API docs) and in **one hardcoded production credential committed to git**.

---

## 1. Critical findings

### 1.1 🟢 RESOLVED — hardcoded production password: code fixed, history purged, credential rotated

> **RESOLVED 2026-09-28.** Full remediation completed:
> - ✅ The script reads `process.env.SEED_ROLE_PASSWORD` (no default; exits 1 when unset).
> - ✅ The password echo to stdout was removed.
> - ✅ The literal was **purged from git history before the first push** (`4e3c6bc` rebuilt as `002fca9`), so it never reached GitHub, and it is redacted from every document here.
> - ✅ **The production credential was ROTATED.** A 192-bit random value was generated, stored as the Railway production variable `SEED_ROLE_PASSWORD` (retrievable by the owner from the Railway dashboard), and applied as a bcrypt-cost-12 hash to all six role accounts. Verified: 6 of 6 hashes match the new secret. Because only one password can match a given bcrypt hash, the previously exposed credential is no longer valid.
> - ✅ Only `password_hash` was written. `role`, `fullName` and `status` were left untouched — re-verified after rotation: 6 accounts, roles unchanged, all ACTIVE, 1 SUPER_ADMIN, 13 users total.
> - ✅ Production health re-verified after rotation: all public endpoints 200, `/users/me` 401, data intact.
>
> Confirmed during this work: the exposed value **was** live — `SEED_ROLE_PASSWORD` was absent in production, so the six accounts had been created with the hardcoded literal, and SUPER_ADMIN had logged in that same day. Rotation was therefore necessary, not precautionary.

> <details><summary>Original finding, retained as the record of why</summary>
>
> **Earlier status**, while establishing the GitHub baseline:
> - ✅ The script now reads `process.env.SEED_ROLE_PASSWORD` with **no default** and exits 1 when unset.
> - ✅ The `console.log` of the password was removed.
> - ✅ The literal was **purged from git history before the first push** — the one commit containing it (`4e3c6bc`) was rebuilt as `002fca9` with a credential-free tree, so **the password never reached GitHub.** The other three commits are unchanged.
> - ✅ The literal was redacted from every document in this package.
> - (At the time of that earlier note the credential was still un-rotated. It has since been rotated — see the RESOLVED banner above.)
>
> </details>

**File:** `my-andijan-api/scripts/seed-role-accounts.js:14` (as originally committed)

```js
const PLAIN_PASSWORD = '<REDACTED>';
```

- Applied to **six accounts** spanning every privilege tier, including **`SUPER_ADMIN` (`+998994796431`)**, plus `ADMIN`, `MODERATOR`, `SUPPORT`, `BUSINESS_OWNER`, `CUSTOMER`.
- The script **prints the password to stdout** on completion (`console.log('ALL ACCOUNTS PASSWORD:', PLAIN_PASSWORD)`), so it also lands in Railway's log stream.
- The file header documents running it **against production**: `railway ssh "cd /app && node scripts/seed-role-accounts.js"`.
- The script uses `upsert`, so re-running it **resets these passwords back to this value** even if they were changed.

**Why this is critical rather than merely untidy:** a single publicly-known string grants `SUPER_ADMIN` on the live platform. `SUPER_ADMIN` can hide and delete businesses and satisfies every `@Roles` check in the API.

**Mitigating context:** the repository has **no git remote** — it exists only on this machine. That is the sole reason this is not already a breach, and it is not a control. The moment a remote is added, this is in history permanently.

**Required actions, in order:**
1. **Rotate the password on all six accounts now**, via `scripts/promote-super-admin.ts` or a direct Prisma update — not by editing this script.
2. Parameterize the script to `process.env.SEED_ROLE_PASSWORD` with **no default**, and make it exit if unset.
3. Remove the `console.log` of the password.
4. **Before adding any git remote**, purge this value from history (`git filter-repo` or a fresh initial commit) — and rotate again afterwards regardless, since history rewriting is not a substitute for rotation.
5. Consider whether demo accounts for every role should exist in production at all.

> This was found during a pre-commit secret scan in the 2026-09-27 session, flagged to the user for rotation, and committed as instructed because there was no remote. **It has not been rotated.**

### 1.2 🟢 RESOLVED — published default admin password in `prisma/seed.ts`

`prisma/seed.ts:279` read `process.env.SEED_ADMIN_PASSWORD ?? '<a literal published in this repo>'`. Because the fallback was a working password committed to the repository, **any `npm run db:seed` run without that variable set silently created an `ADMIN` account with a publicly-known password** — fail-open. Found and fixed 2026-09-28: the fallback is removed and the function now throws when the variable is unset. `.env.example`'s value was replaced with a non-usable placeholder. `phone` and `email` still default, which is safe; a credential does not.

### 1.3 🔴 Supabase `service_role` key in a local `.env`

**Files:** `my-andijan-api/.env` (gitignored — verified with `git check-ignore`), Railway env.

`SUPABASE_SERVICE_KEY` is the **`service_role`** credential. It **bypasses Row Level Security entirely** — full read/write across the Supabase project, not just the `myandijan-images` bucket.

The *use* of this key is correct and deliberately reasoned (see `INTEGRATIONS.md` §2.3): the backend has no Supabase Auth session, so the `anon` key cannot pass RLS, and `JwtAuthGuard` is the real trust boundary. **The risk is custody, not choice.**

**Actions:** confirm the `.env` has never been pasted into a chat, an issue, a screenshot, or an AI prompt; rotate if in any doubt; never commit it; and never expose it under a `VITE_` name — that would publish it in the browser bundle.

---

## 2. Authentication

### Strengths — verified

| Control | Implementation |
| --- | --- |
| Password hashing | **bcrypt, cost 12** (`BCRYPT_ROUNDS = 12`), applied consistently — registration, reset, OTP placeholder, and the role-seed script all use the same cost |
| Refresh tokens are **not** JWTs | `crypto.randomBytes(48).toString('hex')`, stored as a **SHA-256 hash** in `RefreshToken.tokenHash` (`@unique`). A database leak does not yield usable tokens. |
| Revocation is possible | `RefreshToken.revokedAt` + `expiresAt` |
| OTP codes are hashed | `bcrypt.hash(code, 12)` into `OtpCode.codeHash` — never stored in plaintext |
| OTP generation | **`crypto.randomInt`** — a CSPRNG, not `Math.random()` |
| OTP hardening | 6 digits, **5-minute TTL**, single-use, **3 SMS per phone per 10 minutes** (verified in production: 200 / 200 / **429**) |
| Reset-code hardening | 15-minute TTL; **`crypto.randomInt`** since Phase 15E.2 (was `Math.random`) |
| **Codes never leave the SMS (15E.2)** | No OTP or reset code is logged, returned, or put in an exception. The reset-code `console.log` is gone; `SmsService` never logs a message body or phone number (unconfigured, provider error, network error) and reports delivery as a boolean. |
| **Fail-closed delivery (15E.2)** | With no SMS provider configured, `/auth/otp/request` and `/auth/forgot-password` return **503** — a configuration-level check made before any lookup, so it is the same for every phone. An undelivered code is retired. |
| **One live code per phone + purpose (15E.2)** | Issuing a code retires every unused code for that phone and purpose in the same transaction (login OTP and reset). |
| **Wrong-guess budget (15E.2)** | 5 failures per phone + purpose per hour, counted across **every** code row of the window (live, superseded, used, expired) and reserved atomically before each comparison — a fresh code buys no extra guesses; a correct guess hands its reservation back. |
| **Atomic single use (15E.2)** | Consuming a code is a compare-and-set on `usedAt`; of concurrent requests with one code exactly one succeeds. The reset consumes inside its transaction, so a loser's password change rolls back. |
| **No OTP sign-in for staff (15E.2, D-76)** | OTP sign-in is an allowlist — CUSTOMER and BUSINESS_OWNER. SUPPORT, MODERATOR, ADMIN and SUPER_ADMIN are refused (403, generic message naming no role) even with a valid code; the code is spent. |
| **Timing equalization (15E.2)** | `/auth/forgot-password` does the same bcrypt work for unknown phones and sends the SMS in the background; checking a code when none is live still costs one bcrypt comparison. |
| Password reset ends every session | `sessionVersion` bumped, every refresh token revoked, audit row — in one transaction with consuming the code (15B, kept in 15E.2) |
| OTP users cannot be password-logged-in | Given `bcrypt(crypto.randomBytes(48).hex)` — an unusable password |
| **Per-request revalidation** | `JwtStrategy.validate()` queries the database on **every** authenticated request and rejects unless `status === ACTIVE` and `deletedAt` is null. **A suspended user is locked out immediately, without waiting for token expiry.** This costs one query per request and is the right trade. |
| `ignoreExpiration: false` | Explicit, not defaulted |
| Input format enforcement | `/^\+998\d{9}$/` in six DTOs; `/^\d{6}$/` for OTP; password `MinLength(8)` |
| SMS configuration status | **Production SMS is NOT configured** — `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` are absent from the Railway production variables (checked by name, 2026-10-02). Until the owner sets them, `POST /auth/otp/request` and `POST /auth/forgot-password` answer **503** ("SMS xizmati hozircha ishlamayapti…"); password sign-in, registration and refresh are unaffected. Before 15E.2 these flows also never delivered a code to a real user — the code was only written to the logs. |
| Login-failure disambiguation | A 401 from `/auth/login` is **not** treated as an expired session client-side (`handleUnauthorized` only fires when a token was sent) |

### Weaknesses

| # | Severity | Finding |
| --- | --- | --- |
| 1 | 🟢 **RESOLVED — Phase 15B** | ~~No rate limiting on `/auth/login`, `/auth/register`, or `/auth/forgot-password`.~~ Every credential and SMS-code route on `AuthController` now has two `@nestjs/throttler` buckets (`src/auth/auth-throttle.ts`): **per client address per minute** (generous — Uzbek mobile CGNAT) and **per target phone per 15 minutes** (login 10, SMS request 5, code verification 10, reset 5, register 5). Exceeding either → `429`. In-process memory storage: correct for the single Railway replica, resets on redeploy; a second replica would need a shared store (Redis). The DB-counted OTP-send cap stays as the durable second line. Pinned over real HTTP by `auth-throttle.spec.ts`. |
| 2 | **High** | **`JWT_ACCESS_SECRET` has no default and no startup validation.** If unset, `JwtModule.register({ secret: undefined })` proceeds. There is no `@nestjs/config` schema and no boot check. **Verify it is set on Railway.** |
| 3 | Medium | **No account lockout** after repeated failed logins. |
| 4 | Medium | **`userAgent` / `ipAddress` columns on `RefreshToken` are never populated** by `issueTokens()`. The device-attribution capability exists and is unused, so "sign out other devices" and anomaly detection are not possible. |
| 5 | Medium | **Tokens live in `localStorage`**, readable by any successful XSS. `httpOnly` cookies would be stronger, though they bring CSRF concerns; this is a conscious trade for a bearer-token API and is worth revisiting rather than assuming. |
| 6 | Medium | **No refresh flow on the client**, so `JWT_ACCESS_EXPIRES_IN=15m` silently ends sessions. The tempting fix — raising the TTL — **weakens security**; implementing refresh is the correct fix and the server side already exists. |
| 7 | Low | **Password minimum is 8 characters** with no complexity or breach check. |
| 8 | Low | **No email verification flow** despite `emailVerified` existing, so `User.email` is unverified user input. |
| 9 | Low | **OTP timing:** attempt counting is per stored code; whether comparison is constant-time depends on bcrypt's `compare` (it is), so no practical timing oracle — noted for completeness. |

---

## 3. Authorization

### Strengths

- **Capability authorization, deny by default (Phase 15D, D-75).** One global `AuthzGuard` (`APP_GUARD`) decides every request from the rule the route declares — `@Public`, `@Authenticated` or `@RequireCapability(...)`. An undeclared route is refused. Capabilities come from one explicit role → capability table (`src/authz/capabilities.ts`); **no role inherits from another and nothing compares role levels** — the old `ROLE_HIERARCHY`, `RolesGuard` and `@Roles` are deleted, and `no-rank-model.spec.ts` keeps them out. Record-level policies (`src/authz/policies.ts`) enforce ownership and conflict of interest. `route-authorization.spec.ts` fails CI on any route without a rule or any rule change not reflected in the committed snapshot (`src/authz/route-authorization.snapshot.json`). **Ownership authority and platform authority are separate (Phase 15D.2, D-75 point 7):** ADMIN and SUPER_ADMIN no longer hold the owner capabilities (`business.claim` / `business.create` / `business.manage_own`) — only BUSINESS_OWNER does (CUSTOMER keeps claiming). Staff administer other owners' listings through `/admin` with explicit platform capabilities such as `business.edit_any`, which never depend on ownership. Not a new role; Business Staff stays future business-scoped membership; PLATFORM_OWNER stays the separate future governance plane.
- *(Superseded history: until Phase 15D, `JwtAuthGuard` + `RolesGuard` with rank-floor `@Roles(...)` semantics — see D-17.)*
- **Destructive actions are gated highest:** `DELETE /businesses/:id` and `PATCH /admin/businesses/:id/hide` (and since Phase 14 its reversal `…/unhide`) require `SUPER_ADMIN`.
- **Moderator least privilege (Phase 14, D-72).** `MODERATOR` reaches only the moderation surface: `GET /admin/businesses`, business approve/reject, review list/hide/restore, report list/resolve. Everything else under `/admin` stays `ADMIN`+ (stats, claims, users, audit, events, categories, geography, business edit/verify/suspend/promote) or `SUPER_ADMIN` (hide/unhide). **PII is shaped server-side by caller role:** a `MODERATOR` gets business owners as `{ id, fullName }` (no phone/email) and report reporters as `{ id }` (no name); `ADMIN`+ get the full records. Shared moderation actions are compare-and-set, so concurrent moderators get a `409` instead of a double transition. Pinned by `business-ops.authorization.spec.ts` (every route × every role) and `admin.service.moderation.spec.ts` (redaction). The frontend panel gate (`canModerate`) and per-view/per-action visibility mirror these floors but are not the control.
- **Authorization stabilization (Phase 15B, D-74).**
  - **Business content is owner-only.** The "owner OR rank ≥ MODERATOR" bypass is gone from `BusinessesService`, `ProductsService` and `ReviewsService.reply`; `PATCH /businesses/:id`, `PUT /businesses/:id/hours`, the four catalog routes, `POST /events` and both reply routes carry **no `@Roles` floor** — `JwtAuthGuard` authenticates and the service checks `ownerId === user.id`. So **MODERATOR and SUPPORT cannot edit any business, catalog or reply as a business**, and no rank admits anyone. Any account (any role) manages exactly the businesses it owns.
  - **Staff cross-business edits exist only on the audited `/admin` routes** (`PATCH /admin/businesses/:id`, `…/branch`, new `PUT …/hours`; ADMIN floor), each requiring a **`reason`** stored as the audit note with before/after of exactly the fields sent. ADMIN has **no** cross-business catalog path (15C open decision #9).
  - **Account status changes follow an explicit table** (`src/admin/user-status.policy.ts`, never rank arithmetic): nobody acts on themselves; nobody can suspend or reinstate a `SUPER_ADMIN` (the founder holds it — this is what keeps the future PLATFORM_OWNER out of operational reach); ADMIN → CUSTOMER/BUSINESS_OWNER only; SUPER_ADMIN → also MODERATOR/SUPPORT, plus an **emergency freeze** of an ADMIN that **no role can lift** (reserved for PLATFORM_OWNER governance). Reason required; compare-and-set on status **and** role; suspension revokes every session in the same transaction.
  - **No API changes any staff role.** `role-write-inventory.spec.ts` scans the source and fails if a new code path writes `users.role` (today: four writes, all CUSTOMER/BUSINESS_OWNER) or if any request body accepts a `role`.
  - **PII shaping** uses an explicit `{ADMIN, SUPER_ADMIN}` set instead of `rank >= ADMIN`.
- **Session revocation (Phase 15B).** `users.session_version` is stamped into access tokens as `sv`; `JwtStrategy` rejects a mismatch on the next request. Password reset and suspension bump it **and** revoke every refresh token, so neither the old access token nor the old refresh token works afterwards — and reinstating a suspended account does not revive its old sessions. Tokens minted before 15B (no `sv`) count as version 0, so the deploy logged nobody out. Pinned end-to-end by `session-security.spec.ts`.
- **Privilege escalation via registration is blocked.** The schema demands it (*"the public /auth/register endpoint MUST reject role=ADMIN"*) and `RegisterDto` enforces it with `@IsIn([CUSTOMER, BUSINESS_OWNER])`. **Verified — the requirement and the implementation match.**
- **Ownership scoping** is done in `OwnerService` by `ownerId` rather than trusting a client-supplied id.
- **Audit trail** for privileged actions: `AuditLog` with `before`/`after` JSON and actor. **Before Phase 15B the IP and user-agent columns existed but were never written.** Since 15B every admin-service audit row (and business delete, and password reset) also records the actor's **role** as loaded for that request, a **server-generated request id** (returned as `X-Request-Id`), the **client address** and the **user agent**, from an AsyncLocalStorage request context (`src/common/request-context`). The address is Railway's edge-set `X-Real-IP` **only when running on Railway**; `X-Forwarded-For` is never read; anywhere else it is the TCP peer. Reasons go in `note`.

### Weaknesses

| # | Severity | Finding |
| --- | --- | --- |
| 1 | 🟢 **RESOLVED — Phase 15B (D-74)** | ~~`SUPPORT` (3) outranks `BUSINESS_OWNER` (2), so every `@Roles(BUSINESS_OWNER)` route is also open to support staff.~~ Phase 15A established that the service-level ownership checks had in fact already blocked SUPPORT from *other* businesses; the real hole was **MODERATOR** (rank 4) clearing the "owner OR rank ≥ MODERATOR" bypass on every business, catalog and reply. Both are closed: those routes have no role floor and are owner-only. SUPPORT now has no privilege from its role at all (a support desk is a later, capability-phase feature). |
| 1a | 🟢 **RESOLVED — Phase 15D (D-75)** | ~~Remaining rank-based authorization~~ — every route now declares a capability/public/authenticated rule under a deny-by-default global guard; the frontend renders from server-issued capabilities. Original finding, for the record: `RolesGuard` floor semantics for every other `@Roles` route — `/admin/*` (class floor ADMIN, per-route MODERATOR/SUPER_ADMIN overrides), `/admin/command-center/*`, `/admin/health-scores/*`, `/admin/analytics/*` (SUPER_ADMIN), `DELETE /businesses/:id` (SUPER_ADMIN), and the CUSTOMER floors on `POST /businesses` and `POST /businesses/:id/reviews` (which admit every account). None of these is a known vulnerability; they are floors where the 15C target wants explicit capabilities. The frontend's `isAdmin`/`isSuperAdmin`/`canModerate` booleans likewise mirror floors. |
| 2 | Medium | **`POST /businesses` requires only `@Roles(CUSTOMER)`** — i.e. any authenticated user. Correct for the claim flow, but it means **any account can create unlimited business records**, and there is no rate limit. Combined with `status` defaulting to `DRAFT`/`PENDING` this is a moderation-queue flooding vector rather than a direct breach. |
| 3 | Medium | **`RolesGuard` returns `false` (→ 403) when `request.user` is absent** rather than distinguishing unauthenticated. Minor information-hygiene point; not exploitable. |
| 4 | Low | **Ownership checks live in services, not in a guard**, so a new owner-scoped route can silently omit the check. A `@Roles`-style ownership guard would make this structural. |
| 5 | Low | **Client-side role gating mirrors the hierarchy** in `AuthContext`. It agrees with the server today; a drift would show UI a user cannot use (a UX bug, not a security hole — the server enforces). |

---

## 4. Input validation

### Strengths

- **Global `ValidationPipe` with all three protections:** `whitelist: true` (strips unknown properties), **`forbidNonWhitelisted: true`** (rejects them with a 400 rather than ignoring them — this is the stronger setting and it is on), and `transform: true`.
- **45 DTOs** with `class-validator` decorators throughout.
- Tight formats: phone regex, OTP regex, `MinLength`/`MaxLength`, `Min`/`Max`, `IsEmail`, `IsUrl`, `IsInt`, `IsIn`, `ValidateNested` for nested hours input.
- `limit` capped at **100** on list and search queries, so page-size abuse is bounded.
- `q` on `/search` is `@IsNotEmpty()` and `@MaxLength(200)`.

### Weaknesses

| # | Severity | Finding |
| --- | --- | --- |
| 1 | Medium | **`Review.rating` has no database constraint** and should be confirmed to have `@Min(1) @Max(5)` in its DTO — the column is a bare `Int`. A bad write corrupts `ratingAvg` aggregates. |
| 2 | Medium | **`Event` has no `endAt > startAt` validation** and no `isFree`/`price` consistency rule at either layer. |
| 3 | Low | **`BranchHour.openTime`/`closeTime` are `VarChar(5)` strings** with no format validation visible at the DB level — `"9:00"` vs `"09:00"` compares lexically and would break "open now". |
| 4 | Low | **`PlatformMetric.metricType` and `ActivityLog.actionType` are free strings** whose valid values exist only in comments. A typo silently creates a new metric series. |
| 5 | Low | **No output encoding concern on the API side** — it serves JSON, so this is correctly the client's responsibility. |

---

## 5. API security

| # | Severity | Finding |
| --- | --- | --- |
| 1 | **High** | **`app.enableCors()` with no configuration** (`main.ts`). This reflects any origin. Any website can make authenticated cross-origin requests **if it can obtain a token** — mitigated in practice because tokens are in `localStorage` (not cookies) and are therefore not sent automatically, so this is not a classic CSRF hole. It still means the API is callable from anywhere, which aids scraping and abuse. **Restrict to `https://myandijan.uz` plus localhost dev origins.** |
| 2 | **High** | **No rate limiting anywhere except the hand-rolled OTP cap.** 118 routes, including unauthenticated ones, are unthrottled. Add `@nestjs/throttler` globally, with tighter buckets on `/auth/*`, `/analytics/*` and `/search`. |
| 3 | **High** | **`GET /docs` returns 200 in production** — verified. The full Swagger surface, every DTO, and every role requirement are published to anyone. It is reconnaissance-grade information. **Gate behind auth, an env flag, or disable in production.** |
| 4 | **High** | **`POST /analytics/view`, `/click`, `/search` are unauthenticated and unthrottled.** They are write endpoints. Anyone can inflate any business's `pageViews`/`callClicks`, poison `SearchAnalytics`, and grow `ActivityLog` without bound — corrupting the data that owner analytics, the command centre, and `visibilityScore` in the health score all read. **This is both a data-integrity and a storage-cost issue.** Add throttling and consider a lightweight origin or signature check. |
| 5 | Medium | **No `helmet`** — no HSTS, `X-Content-Type-Options`, `X-Frame-Options`, or Referrer-Policy from the API. (Vercel supplies some for the frontend.) |
| 6 | Medium | **No global exception filter**, so an unhandled error surfaces Nest's default 500. Stack traces are not returned in production by default, but error *messages* from lower layers can leak — e.g. `BadRequestException(error.message)` in `UploadService` forwards Supabase's message verbatim to the client. |
| 7 | Medium | **No request size limit** configured beyond the 5 MB `FileInterceptor` cap. Express's default JSON limit (100 kb) applies, which is fine — but it is a default, not a decision. |
| 8 | Low | **No API versioning** (`/v1`), so any breaking change breaks all clients at once. |
| 9 | Low | **No `/health` endpoint**, so uptime monitoring has nothing cheap to hit. |
| 10 | Low | **No CSP** on either side. |

---

## 6. Database security

### Strengths — this section is genuinely clean

- **No SQL injection.** Every raw query uses Prisma's tagged-template `$queryRaw` with `Prisma.sql` interpolation, which parameterizes. **There is no `$queryRawUnsafe` or `$executeRawUnsafe` anywhere in the codebase.** The one `Prisma.raw()` call — `geoClause(businessIdColumn)` in `search.service.ts:144` — receives **only** the hardcoded internal literals `'b.id'` or `'p.business_id'`, never user input. Verified by reading all ~20 raw-query sites in `analytics.service.ts`, `command-center.service.ts` and `search.service.ts`.
- **Parameterized everywhere else** by Prisma's query builder.
- **Referential integrity is deliberate, not accidental.** `Cascade` where a child cannot outlive its parent (branches, hours, photos, reviews, favourites); `SetNull` where history must survive (`AuditLog.actorId`, `Business.ownerId`, `Business.verifiedById`, `BranchPhoto.uploadedById`, `User.districtId`); `Restrict` where deletion should be blocked (`Category`, `BusinessType`, `District`).
- **Soft deletes** on the eight user-facing models, each indexed.
- **Anti-abuse constraints at the database level:** one review per user per branch, one report per user per review, one favourite per user per business, one reply per review.
- **Privacy by design:** `ActivityLog.metadata` stores an **`ipHash`, never a raw IP** — stated as a `PRIVACY:` note in the schema. `BusinessAnalytics.visitorCities` stores city IDs described as anonymized.

### Weaknesses

| # | Severity | Finding |
| --- | --- | --- |
| 1 | Medium | **`BusinessClaim`'s "one PENDING claim per business" invariant is not enforced by the database** — the schema says so explicitly and defers it to the service layer. A concurrent double-submit could create two pending claims. Fixable with a partial unique index via raw SQL in a migration. |
| 2 | Medium | **Soft deletes are enforced only in application code.** Any query that forgets `deletedAt: null` returns deleted rows. With 118 routes and no tests, this is a realistic leak path. |
| 3 | Medium | **`AuditLog.before`/`after` store arbitrary JSON snapshots of changed entities** — which can include `passwordHash` or contact details if a user or business row is snapshotted wholesale. **Confirm sensitive fields are stripped before writing.** |
| 4 | Low | **Database credentials are a single connection string with presumably full privileges.** No read-only role for analytics queries. |
| 5 | Low | **No backup configuration in-repo.** Railway may provide backups — **UNKNOWN and unverified.** For a directory whose content is manually curated, confirm this explicitly. |
| 6 | Low | **`scripts/cleanup-db.ts` is destructive** and sits beside routine scripts with no guard rail. Read it before ever running it. |

---

## 7. File-upload security

### Strengths

- `JwtAuthGuard` required.
- **5 MB limit** enforced by `FileInterceptor` (server-side, not just client-side).
- **MIME allow-list**, not a deny-list: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- **Filename sanitisation** — `originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')`, with the reason stated: the value lands in a storage object key and *"the client fully controls its value."* This blocks path traversal and key injection.
- **`Date.now()` prefix** prevents trivial overwrites of an existing object.
- Files go to **Supabase Storage, not the application filesystem**, so there is no directory to traverse and no risk of writing into a served path.
- Client-side pre-validation (`assertUploadable`) gives fast feedback without being the control.

### Weaknesses

| # | Severity | Finding |
| --- | --- | --- |
| 1 | Medium | **MIME type is taken from the client-supplied `file.mimetype`**, not from magic-byte inspection. A polyglot or renamed file declaring `image/png` passes. Impact is limited because objects are served from Supabase's domain with a stored content type rather than executed — but the check is weaker than it looks. |
| 2 | Medium | **No per-user upload rate limit or quota.** Any authenticated account can upload 5 MB repeatedly, unbounded — a storage-cost and abuse vector. |
| 3 | Medium | **Uploaded objects are public, permanent and unmanaged.** No deletion path, no orphan cleanup. Images attached to a rejected or deleted business remain publicly reachable forever. |
| 4 | Medium | **No image re-encoding or EXIF stripping.** User-uploaded photos retain metadata, **including GPS coordinates** — a genuine privacy exposure for review and avatar photos. |
| 5 | Low | **`SVG` is not in the allow-list** — correct, since SVG can carry script. Worth keeping that way deliberately. |
| 6 | Low | **`image/gif` is allowed**, which permits animated content in avatars and review photos. A product decision, not a vulnerability. |
| 7 | Low | **Supabase error messages are forwarded verbatim** to the client via `BadRequestException(error.message)` — minor internal-detail leakage. |
| 8 | Low | **HEIC mismatch** — client allows it, server rejects it. A usability bug, not a security one, but it means the two validation layers disagree. |

---

## 8. Rate limiting — consolidated

**The only rate limit in the entire system is hand-rolled OTP throttling** (`OTP_MAX_PER_WINDOW = 3` per `OTP_RATE_WINDOW_MINUTES = 10`, plus `MAX_OTP_ATTEMPTS = 5` and `MAX_RESET_ATTEMPTS = 5`). It works — a `429` was verified in production.

**Unprotected and worth ranking:**

| Endpoint(s) | Risk |
| --- | --- |
| `POST /auth/login` | Credential brute force **and** CPU exhaustion via bcrypt cost 12 |
| `POST /auth/register` | Mass account creation |
| `POST /analytics/view\|click\|search` | **Unauthenticated writes** — data poisoning, unbounded table growth |
| `POST /businesses` | Moderation-queue flooding |
| `POST /upload/image` | Storage-cost abuse |
| `GET /search` | Expensive FTS + trigram queries, unthrottled |
| Everything else (112 routes) | Scraping, enumeration |

**Recommendation:** install `@nestjs/throttler`, apply a conservative global default, then tighten `/auth/*`, `/analytics/*`, `/search` and `/upload/*`. This is the single highest-value infrastructure fix available.

> **Phase 15B update:** `@nestjs/throttler` is installed and applied to **every `/auth/*` credential and SMS-code route** (per-address and per-phone buckets — see §2 #1); `/auth/login` and `/auth/register` are no longer unprotected. **Still unthrottled:** `/analytics/*` writes, `POST /businesses`, `POST /upload/image`, `GET /search` and the rest — deliberately left for a follow-up so the auth limits could ship without risking public browsing. The client address used as the bucket key is the same edge-set value the audit log records, so forged `X-Forwarded-For`/`X-Real-IP` headers cannot open a fresh bucket.

---

## 9. CORS

🟢 **RESOLVED — Phase 15B.** Was `app.enableCors()` (any origin). Now `app.enableCors(buildCorsOptions())` (`src/common/cors.ts`):

- **Always allowed:** `https://myandijan.uz`, `https://www.myandijan.uz` — hard-coded so a stale or missing variable can never take the live site down.
- **Added from env:** the existing Railway variable `FRONTEND_URL`, plus an optional comma-separated `CORS_ORIGINS` (not set; nothing in production had to change). Each entry is normalised to a bare origin; non-http(s) values are dropped.
- **Outside production only:** `http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`.
- `credentials: false` (Bearer tokens, not cookies); methods `GET/POST/PUT/PATCH/DELETE/OPTIONS`; headers `Authorization, Content-Type, Accept, Accept-Language`; exposes `X-Request-Id`, `Retry-After`.
- A disallowed origin simply gets no `Access-Control-Allow-Origin` (the browser blocks it); requests **without** an `Origin` (curl, server-to-server, native apps) are unaffected — CORS is not authentication.
- **Vercel preview deployments cannot call the production API** unless their URL is added to `CORS_ORIGINS`. Accepted: previews are SSO-protected and should not hit production data anyway.

---

## 10. Secrets handling

### Good
- Both `.gitignore` files exclude env files; **verified** via `git check-ignore .env` in the API repo. The frontend's is broader (`.env`, `.env.local`, `.env.*.local`, `.env*`).
- `.env.example` contains only placeholders.
- **No secret is exposed to the browser.** The only `VITE_` variables are `VITE_API_URL` and `VITE_SITE_URL` — both public by nature.
- `VERCEL_OIDC_TOKEN` lives in gitignored `.env.local`.
- Secrets are read server-side only; the Supabase client is constructed in the service, never shipped.
- `package.json`'s `allowScripts` allow-list is a supply-chain-hardening convention, even though the tool consuming it is not a declared dependency.

### Bad
| # | Severity | Finding |
| --- | --- | --- |
| 1 | **Critical** | `PLAIN_PASSWORD = '<REDACTED>'` **is committed** (§1.1). |
| 2 | Medium | **`.env.example` omits seven variables the code reads** (`SUPABASE_*`, `ESKIZ_*`), so onboarding from it produces an API that will not boot — and, worse, invites someone to guess. |
| 3 | Medium | **`JWT_REFRESH_SECRET` is declared but never read.** Its presence implies refresh tokens are signed JWTs. They are not — they are opaque random bytes, SHA-256 hashed. A misleading artifact that could lead someone to "fix" working code. |
| 4 | Low | **No secrets manager** — plain `.env` plus platform dashboards. Acceptable at this scale; note it as scale-limited. |
| 5 | Low | **No documented rotation procedure** for `JWT_ACCESS_SECRET` (rotating it invalidates every access token — which is fine, given refresh tokens are opaque and independent). |

---

## 11. User-data protection

| Aspect | State |
| --- | --- |
| Passwords | ✅ bcrypt 12, never returned |
| OTP / reset codes | ✅ bcrypt-hashed, TTL'd, single-use, attempt-capped |
| Refresh tokens | ✅ SHA-256 hashed at rest |
| IP addresses | ✅ **`ActivityLog` stores `ipHash`, never a raw IP** — the standard to hold. `AuditLog` and `RefreshToken` have raw `ipAddress` columns (appropriate for security records; `RefreshToken`'s is unpopulated). |
| Visitor geography | ✅ `BusinessAnalytics.visitorCities` holds city IDs, documented as anonymized |
| Marketing consent | ✅ `marketingConsent` + `marketingConsentAt` records **when** consent was given — GDPR-shaped thinking |
| Soft delete / right to erasure | ⚠️ `UserStatus.DELETED` and `deletedAt` exist; **no self-service deletion endpoint and no hard-delete/anonymisation path** |
| Data export | ❌ None |
| Privacy policy | ⚠️ `PRIVACY_POLICY.md` exists in the API repo (842 bytes) but is **not surfaced anywhere in the app** |
| Terms of service | ❌ No document, though signup shows legal-consent text above the CTA |
| EXIF in uploads | ❌ Not stripped — **GPS coordinates may be published** with review and avatar photos |
| Data localization | ⚠️ The schema's vanilla-PostgreSQL constraint exists to keep the DB relocatable to an Uzbek host — **but the database is currently on Railway and images are on Supabase, both non-Uzbek.** The *portability* is preserved; the *residency* is not. **If residency is a legal requirement rather than an aspiration, the current hosting does not satisfy it.** This needs an explicit answer from the owner. |

---

## 12. Common vulnerability classes

| Class | Assessment |
| --- | --- |
| **SQL injection** | ✅ **Not present.** All raw SQL parameterized via `Prisma.sql`; no `*Unsafe` variants; the single `Prisma.raw()` takes hardcoded literals only. |
| **XSS** | ✅ Largely protected. React escapes by default. **The one genuine risk was found and fixed:** Leaflet `divIcon` takes raw HTML, and `SearchMap.tsx` applies `escapeHtml()` to API-sourced text before interpolation. `JsonLd` escapes `<` → `<` so a stray `</script>` in business text cannot break out. No `dangerouslySetInnerHTML` found. |
| **CSRF** | ✅ Low risk — bearer tokens in `localStorage` are not sent automatically, so open CORS does not translate into CSRF. |
| **IDOR** | ⚠️ Mitigated by `ownerId` scoping in `OwnerService` and role guards, but enforced per-service rather than structurally. `GET /businesses/:id` accepts an id **or** a slug and returns only `APPROVED` businesses — good. Worth a focused audit of every `:id` route. |
| **Privilege escalation** | ✅ Registration cannot grant `ADMIN` (`@IsIn`). Hierarchy semantics are the main thing to keep correct. |
| **Mass assignment** | ✅ Prevented by `whitelist` + `forbidNonWhitelisted`. |
| **Path traversal** | ✅ Filenames sanitised; no filesystem writes. |
| **SSRF** | ✅ No user-supplied URL is fetched server-side. `Business.website` is stored and rendered, never requested. |
| **Insecure deserialization** | ✅ JSON only. |
| **Open redirect** | ✅ Redirects are internal route constants. |
| **Brute force** | 🟡 **Mitigated (Phase 15B, 15E.2)** — per-phone and per-address throttling on login, SMS-code and reset-code routes; since 15E.2 SMS codes also have a database-backed budget of 5 wrong guesses per phone + purpose per hour across all code rows. No password-login lockout yet. |
| **DoS** | 🔴 **Present** — no rate limiting; unauthenticated analytics writes; unthrottled FTS; bcrypt-12 CPU amplification on login. |
| **Information disclosure** | 🔴 **Present** — public Swagger at `/docs`; Supabase error messages forwarded. |
| **Dependency vulnerabilities** | ❓ **UNKNOWN.** No `npm audit` run, no Dependabot, no lockfile-verifying CI. `sonner` is installed in the frontend's `node_modules` but absent from `package.json` — an undeclared dependency, which is itself a supply-chain hygiene issue. |
| **Security misconfiguration** | 🟠 Public docs, no helmet. (CORS allowlist and auth throttling fixed in Phase 15B.) |
| **Broken access control** | ✅ Guards are consistently applied. The MODERATOR business-edit bypass and SUPPORT's rank inheritance were closed in Phase 15B (D-74); account-status changes follow an explicit table. Remaining rank floors are listed in §3 #1a. |

---

## 13. Prioritised remediation plan

| # | Severity | Action | Effort |
| --- | --- | --- | --- |
| 1 | ✅ **DONE 2026-09-28** | Rotated all six role accounts to a 192-bit random secret held in Railway's `SEED_ROLE_PASSWORD`; script parameterized to `process.env` with no default; `console.log` removed; literal purged from history before the first push | — |
| 2 | 🟡 **PARTLY DONE — Phase 15B** | ~~Install `@nestjs/throttler`~~ — installed; `/auth/*` throttled. **Still to do:** `/analytics/*`, `/search`, `/upload/*`, `POST /businesses` | Low |
| 3 | ✅ **DONE — Phase 15B** | ~~Restrict CORS to known origins~~ | — |
| 3a | ✅ **DONE — Phase 15E.2** | ~~`forgotPassword` printed the reset code to stdout and used `Math.random()`~~ — and `SmsService` logged every unsent login OTP. Codes are now never logged; reset codes use `crypto.randomInt`; delivery fails closed (503) without an SMS provider; one live code per phone + purpose; a per-phone failure budget across all code rows; atomic single use; no OTP sign-in for staff; timing equalized. **Owner action still required:** set `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` on Railway — until then OTP sign-in and password reset answer 503. | — |
| 3b | 🟢 **Configured (15E.3, 15E.7.1) — production proof pending** | ~~Vercel production did not wait for CI~~ (`bbe2768` was live at 03:13:43 UTC, its `test-and-build` finished at 03:14:10). The owner configured the Vercel Production Deployment Check `Vercel - myandijan-frontend: test-and-build` (2026-10-02), which the CI job reports (§15). The Vercel API does not expose the setting; the first production deployment after it — the merge of the 15E.7.1 documentation PR — is the proof. | — |
| 4 | 🔴 High | **Gate or disable `/docs` in production** | Trivial |
| 5 | 🔴 High | **Authenticate or throttle the three `/analytics/*` write endpoints** | Low |
| 6 | 🟠 Medium | **Verify `JWT_ACCESS_SECRET` is set on Railway**; add `@nestjs/config` with a validation schema so a missing required variable fails at boot | Low |
| 7 | 🟠 Medium | **Add `helmet`** | Trivial |
| 8 | 🟠 Medium | **Implement client-side refresh** so the 15-minute TTL is not "fixed" by raising it | Medium |
| 9 | 🟠 Medium | **Strip EXIF / re-encode uploaded images** (`sharp` is already a frontend dependency; add it server-side) | Medium |
| 10 | 🟠 Medium | **Add a global exception filter** that normalises errors and stops forwarding third-party messages | Low |
| 11 | 🟠 Medium | **Audit `AuditLog.before`/`after` for sensitive fields** (especially `passwordHash`) | Low |
| 12 | 🟠 Medium | **Add the partial unique index** for one pending claim per business | Low |
| 13 | ✅ **DONE — Phase 15B (D-74)** | ~~Decide and document the `SUPPORT` vs `BUSINESS_OWNER` ranking~~ — SUPPORT inherits nothing; owner routes are ownership-only | — |
| 14 | 🟡 Low | **Populate `RefreshToken.userAgent`/`ipAddress`** to enable session management. (`AuditLog` IP/user agent are populated since Phase 15B; refresh tokens still are not.) | Low |
| 15 | 🟡 Low | **Add an upload quota per user** | Low |
| 16 | 🟡 Low | **Add an image-deletion / orphan-cleanup path** | Medium |
| 17 | 🟡 Low | **Run `npm audit`, enable Dependabot, remove the undeclared `sonner`** | Low |
| 18 | 🟡 Low | **Add account lockout** after N failed logins | Low |
| 19 | 🟡 Low | **Surface the privacy policy in the app; write a ToS** | Low |
| 20 | 🟡 Low | **Add a self-service account-deletion / anonymisation path** | Medium |
| 21 | ❓ Open | **Answer the data-residency question:** is an Uzbek host a legal requirement? If so, Railway + Supabase do not satisfy it today. | Discussion |
| 22 | ❓ Open | **Confirm database backups exist** and are restorable | Low |

---

## 14. Standing security rules for this codebase

Keep these true.

1. **Never put a secret behind a `VITE_` name.** It is compiled into the public bundle.
2. **`SUPABASE_SERVICE_KEY` stays server-side.** It bypasses RLS entirely.
3. **`/auth/register` must never accept `role=ADMIN`.** Keep the `@IsIn` guard.
4. **Never use `$queryRawUnsafe` / `$executeRawUnsafe`.** Use `Prisma.sql` tagged templates. `Prisma.raw()` takes hardcoded literals only — never user input.
5. **Keep `escapeHtml()` before any Leaflet `divIcon` HTML.**
6. **Keep the `<` escape in `JsonLd`.**
7. **Keep `whitelist` + `forbidNonWhitelisted` on the global `ValidationPipe`.**
8. **Keep bcrypt at cost 12** across every hash site.
9. **Never store an OTP, reset code, or refresh token in plaintext.**
10. **`ActivityLog` stores `ipHash`, never a raw IP.** Hold that line for anything new.
11. **Never commit a credential, even without a remote.**
12. **Keep `JwtStrategy`'s per-request status check.** It is what makes suspension immediate.


## 15. Deployment security — Phase 15E.3 (2026-10-02)

**The required check.** Both repositories run one workflow, `CI`, with one job whose check run is named **`test-and-build`** (app: GitHub Actions) — `npm ci`, `npm test`, `npm run build` (the frontend build includes `tsc -b`). Verified on the live commit check runs. Keep the job name: every gate below refers to it.

**Workflow hardening (both repos, done).**
- `permissions: contents: read` at workflow level — the job only reads the repository; no write scope of any kind (it deploys nothing; the platforms deploy on its result).
- `actions/checkout` and `actions/setup-node` pinned to full commit SHAs (v4.4.0 — the commits the `v4` tags pointed to on 2026-10-02), so a moved or compromised tag cannot change what runs in the gate. `.github/dependabot.yml` proposes monthly SHA updates as pull requests, which must pass `test-and-build` themselves.
- `persist-credentials: false` on checkout — the job token is not left in `.git/config` while `npm ci` runs dependency install scripts.
- No other workflows exist; no workflow deploys anything; no repository secrets are used by CI.

**Verified state of each gate (2026-10-02).**

| Gate | State | Evidence |
| --- | --- | --- |
| Railway "Wait for CI" (backend) | ✅ **Active** — `source.checkSuites: true`, 1 replica | `c048ff9`: deployment `112f91a8` created 03:32:22 in **WAITING** → `test-and-build` green 03:33:06 → BUILDING 03:33:13 → SUCCESS 03:34:14. Same pattern for every 15D–15E deploy. |
| Vercel Production Deployment Check (frontend) | 🟢 **Configured by the owner (2026-10-02)** — requires `Vercel - myandijan-frontend: test-and-build` | The CI job posts that commit status on every push to `main` (`3e8219f`: pending 04:06:12 → success 04:06:45) and on same-repository pull requests (`4359f6f`, `e504a0e`). The setting is not readable through the Vercel API, and before it existed production went live ahead of CI (`bbe2768`: live 03:13:43, CI done 03:14:10). **Proof pending:** the first production deployment after configuration — the merge of the 15E.7.1 documentation PR — must stay unpromoted until the status is green. |
| `main` branch ruleset (both repos) | ✅ **Active** — ruleset "Protect main" (backend `24347110`, frontend `24347040`), target `~DEFAULT_BRANCH` | Public API (`/rules/branches/main`), 2026-10-02: **deletion** blocked, **non_fast_forward** (force push) blocked, **pull_request** required (0 approvals), **required_status_checks** `test-and-build` from GitHub Actions (integration 15368) with **strict** (branch up to date) on. The **bypass list is not readable without admin access** — confirm in Settings → Rules → Rulesets that it is empty. Changes now reach `main` only through a pull request. |

**Release flow.**

```text
Backend   push → GitHub CI (test-and-build) → Railway waits for the check suite → build → migrate deploy → production   ✅ gated
Both     change → pull request → test-and-build must pass (branch up to date) → merge to main      (ruleset "Protect main")
Frontend  merge → Vercel builds → waits for "Vercel - myandijan-frontend: test-and-build" → promotes (assigns myandijan.uz) only on success   ✅ configured (proof pending)
```

**Platform configuration (done by the owner, 2026-10-02 — not configurable from the repositories).**
1. **Vercel Production Deployment Check** on project `myandijan-frontend` requiring the commit status `Vercel - myandijan-frontend: test-and-build`. The CI job writes that status itself — `pending` when it starts, then `success` only if every step succeeded (failure, cancellation and timeout report `failure`) — because Vercel's importer reads commit statuses, not the `test-and-build` check run. Vercel documents the same capability on the CLI as `vercel project checks … --blocks deployment-alias`.
2. **GitHub ruleset "Protect main"** in both repositories, as verified in the table above.

**Still to confirm (owner, UI only).** That each ruleset's bypass list is empty; and, after the 15E.7.1 PR merges, that its Vercel production deployment waited for the status before taking `myandijan.uz`.

**Paths that bypass the gates (owner-only; emergency use).** Railway dashboard *Redeploy*/*Deploy* and `railway up`; Vercel dashboard *Promote*/*Redeploy*, `vercel --prod`, `vercel promote` and the promote API; any ruleset bypass actor (the bypass list is not readable without admin access). None is used by normal releases. **Policy:** use them only to roll back or to recover from a platform incident; prefer an instant rollback to a previously gated deployment (Railway rollback, Vercel rollback/promote of an earlier production deployment) over deploying an unchecked build; record any such use in CURRENT_STATE. Preview deployments (pull requests) never reach the production domain; Vercel's Git fork protection is on by default.

**Lint.** Not part of CI. The frontend has `oxlint` (exit 0, 17 pre-existing warnings); the backend has no linter configured.
