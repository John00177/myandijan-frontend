# Phase 15E.4e.0 — Railway Migration Safety Audit (gate for 15E.4e.1)

**Status:** AUDIT ONLY (read-only). No Railway setting, repository code, migration, database, environment variable or deployment was changed.
**Date:** 2026-10-03
**Subject:** whether Railway production can safely run the 15E.4e.1 contract migration `20261003090000_phase15e4e1_refresh_token_session_contract` (backend branch `feat/15e4e1-refresh-token-contract-cleanup`, commit `59873c5`).

Tags: **[VERIFIED]** checked in this audit (Railway API, Railway docs, repository, or a local PostgreSQL 16 reproduction); **[DESIGN]** recommendation, not applied; **[OPEN]** not settled.

## Decision

**B. CONFIGURATION CHANGE REQUIRED.**

Today, migrations run inside the application start command, and there is no healthcheck. A failing migration, or an application that fails to start, would therefore take production down. After a failed migration, even a rollback image cannot start until the failed migration is resolved by hand (§6, verified).

The fix is a small change to `railway.json` (§5), shipped and verified as its own deploy **before** 15E.4e.1 is merged:

- **Pre-Deploy Command:** `npx prisma migrate deploy`;
- **Start Command:** without migrations;
- **Healthcheck:** `/categories`.

---

## 1. Current Railway configuration [VERIFIED — Railway API `describe-service`/`get-service-config`, deployment build logs, Railway docs]

| # | Item | Value |
|---|---|---|
| 1 | Project | `myandijan-api` (`3910b9c5-e86d-4c06-8058-def605847424`) |
| 2 | Environment | `production` (`653c2817-832a-4d76-a236-d91972b55d09`) — the only environment |
| 3 | API service | `myandijan-api` (`4109a788-880f-4d6c-a0a6-766663cd2f24`); the database is the separate `Postgres` service (`dc820605-…`) |
| 4 | Source repository | `John00177/my-andijan-api` |
| 5 | Deployment branch | `main`, with **Wait for CI** (`checkSuites: true`) |
| 6 | Start Command | **`npx prisma migrate deploy && npm run start:prod`**, from `railway.json` (config as code). The dashboard has no start command. |
| 7 | Build Command | `npm run build` (`railway.json`); builder **NIXPACKS** (`railway.json`; the dashboard says RAILPACK, overridden); install `npm ci --include=dev` (`nixpacks.toml`) |
| 8 | Pre-Deploy Command | **none** (neither `railway.json` nor the dashboard) |
| 9 | Healthcheck Path | **none** (neither `railway.json` nor the dashboard) |
| 10 | Replicas | 1 (region `sfo`) |
| 11 | Restart policy | `ON_FAILURE`, max 3 retries (`railway.json`) |
| 12 | Deployment ordering | Railway builds the image, then starts the new container, while the previous deployment keeps serving until the new one is **Active**. Railway docs: *"If the deployment does not have a healthcheck configured, Railway will mark the deployment as Active after starting the container."* The previous deployment is then removed (observed for `0a5e9950`: container started 15:57:00, SUCCESS 15:57:02, previous REMOVED 15:57:08). |
| 13 | Migrations at startup? | **Yes.** The image's `CMD` (build log of deployment `0a5e9950`) is `["npx prisma migrate deploy && npm run start:prod"]`, and every deploy log shows the Prisma migrate output before Nest starts. |

**Config-as-code precedence [VERIFIED, Railway docs].** "Configuration defined in code will always override values from the dashboard." So the start command, builder and restart policy come from `railway.json`, and a dashboard-only change to the start command would be overridden.

**Config as Code is deprecated [VERIFIED, Railway docs].** "Existing `railway.json` / `railway.toml` files continue to work … until **2026-12-01** (hard cutoff)." Railway's replacement is Infrastructure as Code (`.railway/railway.ts`). This is separate from 15E.4e.1 but urgent: after the cutoff the dashboard settings would apply, and they currently have no start command and the RAILPACK builder (see §7, item P6, and the OPEN item in §8).

## 2. Current migration execution path [VERIFIED — repository `main` `06d6de9`]

| Location | `prisma migrate` usage |
|---|---|
| `railway.json` `deploy.startCommand` | `npx prisma migrate deploy && npm run start:prod` — **the only production migration path** |
| `package.json` scripts | `prisma:migrate` = `prisma migrate dev` (local only); `start:prod` = `node dist/main`; `postinstall` = `prisma generate` |
| `.github/workflows/ci.yml` | none. CI runs `npm ci`, `npm test`, `npm run test:db` (its global setup migrates the throwaway CI database) and `npm run build` |
| `Dockerfile`, `Procfile`, `railway.toml`, `.railway/railway.ts` | absent |
| `nixpacks.toml` | install phase only (`npm ci --include=dev`) |
| Healthcheck in repo | none configured |

So every container start, including each restart (`ON_FAILURE`, up to 3) and every rollback image, runs `prisma migrate deploy` first, inside the application container, after Railway has already considered the deployment Active.

## 3. 15E.4e.1 migration risk analysis

The file `prisma/migrations/20261003090000_phase15e4e1_refresh_token_session_contract/migration.sql` (branch commit `59873c5`), in order [VERIFIED]:

| Step | Statement | Effect |
|---|---|---|
| 0 | `SET LOCAL lock_timeout = '30s'` | gives up (atomically) if the lock cannot be taken within 30 s |
| 1 | `LOCK TABLE "refresh_tokens" IN ACCESS EXCLUSIVE MODE` | blocks every read and write of `refresh_tokens` until commit; taken up front, so there is no lock upgrade |
| 2 | `WITH legacy … INSERT INTO auth_sessions … UPDATE refresh_tokens SET session_id …` | attaches each **live** session-less token (`revoked_at IS NULL AND expires_at > now UTC`) to a new session of its own user: `absolute_expires_at = GREATEST(created_at + 90 d, expires_at)` |
| 3 | `DELETE FROM refresh_tokens WHERE session_id IS NULL AND (revoked_at IS NOT NULL OR expires_at <= now UTC)` | deletes **explicitly dead** session-less rows only |
| 4 | `DO $$ … RAISE EXCEPTION …` if any `session_id IS NULL` remains | guard |
| 5 | `ALTER TABLE refresh_tokens ALTER COLUMN session_id SET NOT NULL` | the contract (table scan under the lock already held) |

**Transactional?** **Yes** [VERIFIED on PostgreSQL 16 with this project's Prisma 5.22]. `prisma migrate deploy` applies a migration file as one transaction:

- a failure after `LOCK`/`CREATE`/`INSERT` left nothing behind, and `LOCK TABLE` and `SET LOCAL` work inside the file;
- the 15E.4e.1 test suite applies the real file plus an injected failing statement: the attach, the delete and the `NOT NULL` are all rolled back;
- a failed migration is recorded unfinished in `_prisma_migrations`, and **every later `migrate deploy` refuses with P3009** until `prisma migrate resolve` is run.

**Production data shape** [VERIFIED, read-only evidence 2026-10-03]: 181 refresh tokens; 168 session-less, of which 0 live, 7 revoked and 161 expired. So step 2 inserts nothing, step 3 deletes 168 rows, and the `ACCESS EXCLUSIVE` window is milliseconds on a 181-row table.

**Can it run before the new application starts?** **Yes.** It needs only `DATABASE_URL` and the Prisma CLI, both present in the application image today: the current start command already runs `npx prisma migrate deploy` from that image. It does not depend on the application.

**Failure modes, by likelihood:**

1. **Lock timeout:** a transaction holds `refresh_tokens` for over 30 s. Unlikely, since Prisma interactive transactions time out at 5 s.
2. **Guard or `SET NOT NULL` failure:** practically impossible, because steps 2 and 3 split every NULL row.
3. **Database unreachable.**

Every failure is atomic: the schema and data stay as before, and the migration is recorded failed.

## 4. Rolling-deployment compatibility (`06d6de9` with the contracted schema) [VERIFIED]

Checked by code inspection of `06d6de9`, and by running **`06d6de9`'s own Prisma client** (generated from its exact `schema.prisma`) against a local database migrated through 15E.4e.1:

| Question | Finding |
|---|---|
| Old code reads `refresh_tokens.session_id` | Yes, typed `Int?`. Reading a NOT NULL column is fine; the probe read the value correctly. |
| Old code intentionally creates NULL `session_id` | **No.** `startSession` uses a nested create (session plus token); rotation passes `sessionId`. `attachLegacySession` only *fills* a NULL, and none can exist after the migration. |
| Old refresh rotation after NOT NULL | **Works.** The probe ran the session lock, the compare-and-set, and the successor `create`, whose full-row `RETURNING` includes `user_agent`/`ip_address`; those columns still exist in 15E.4e.1. |
| Old logout / revocation | **Works.** `revokeAllUserSessions` in `06d6de9`: its legacy sweep (`session_id IS NULL`) matched 0 rows, then sessions and tokens were revoked. Logout's legacy branch is unreachable (no NULL rows). The session read used by `JwtStrategy` works. |
| Old code needs fields removed from the 15E.4e.1 Prisma schema | Only `refresh_tokens.user_agent`/`ip_address` and the enum value `LEGACY_MIGRATION`, which **still exist in the database** after 15E.4e.1 (dropped only by 15E.4e.2). |
| Old startup depends on `LEGACY_MIGRATION` | **No.** No `06d6de9` code references it; it exists only in that release's schema enum, and the database type still has it. |
| Old code writes a session-less token anyway | The database refuses it (P2011 / 23502). Fail closed. |
| Rollback image boots against the contracted database | **Yes.** `06d6de9`'s migrations folder (14) against a database with 15 applied: "No pending migrations to apply". |

**Conclusion.** `06d6de9` coexists with the contracted schema, both during the rolling overlap and after a rollback, **as long as the migration succeeded**. After a *failed* migration, see §6 Case C/E.

## 5. Recommended Railway configuration [DESIGN]

**Exact change: `railway.json` on `main`,** shipped as its own small PR and deploy, before 15E.4e.1. Config as code overrides the dashboard, so the change must be made here; a dashboard change alone would not remove the migration from the start command.

```diff
 {
   "$schema": "https://railway.app/railway.schema.json",
   "build": {
     "builder": "NIXPACKS",
     "buildCommand": "npm run build"
   },
   "deploy": {
-    "startCommand": "npx prisma migrate deploy && npm run start:prod",
+    "preDeployCommand": ["npx prisma migrate deploy"],
+    "startCommand": "npm run start:prod",
+    "healthcheckPath": "/categories",
+    "healthcheckTimeout": 120,
     "restartPolicyType": "ON_FAILURE",
     "restartPolicyMaxRetries": 3
   }
 }
```

| Setting | Why [evidence] |
|---|---|
| `preDeployCommand: ["npx prisma migrate deploy"]` | Railway docs: pre-deploy commands *"execute between building and deploying … in a separate container … within your private network and have access to your application's environment variables. If your command fails, it will not be retried and the deployment will not proceed."* The previous deployment keeps serving. [VERIFIED docs] The image already contains the Prisma CLI, which the current start command uses. [VERIFIED] |
| `startCommand: "npm run start:prod"` | Migrations must not run again at start. Otherwise every restart and every rollback image would re-run `migrate deploy` and could crash on P3009 (§6). |
| `healthcheckPath: "/categories"` | Railway switches traffic only after a 2xx; *"If your application fails to serve a 2xx … the deploy will be marked as failed"* and the previous deployment keeps serving. [VERIFIED docs] See the endpoint analysis below. |
| `healthcheckTimeout: 120` | The app boots in about 1–2 s (deploy logs). 120 s is ample and shorter than the 300 s default. |
| Pre-Deploy **Timeout** (dashboard only) | Railway: a pre-deploy command has **no time limit by default**; the timeout (1–3600 s) is a service setting. Recommended: **300 s**. The migration itself gives up after 30 s on a lock, so this only guards against a hung CLI or network. [OPEN: the docs say the field appears once a pre-deploy command is entered; whether it appears when the command comes from `railway.json` is to be seen in the dashboard.] |

**Healthcheck endpoint — existing options [VERIFIED by code inspection and live read-only GETs, 2026-10-03]:**

| Path | Live result | Suitability |
|---|---|---|
| `/` | 404 | no root route |
| `/health` | 404 | does not exist; the app has **no dedicated health endpoint** (`health-score` is a business feature, not liveness) |
| `/docs` (Swagger UI) | 200, ~3 KB, no database access | proves the HTTP server is up. But SECURITY.md lists public API docs as a finding to remove, so a healthcheck should not depend on it. |
| **`/categories`** | **200**, ~3 KB | **suitable now.** `@Public()` GET, read-only, not throttled (throttling is only on the auth routes), **exercises the database**. Nest only listens after `PrismaService.onModuleInit` has connected. An empty table still returns 200 (`[]`). Requests come from `healthcheck.railway.app`; the app has no host allow-list, and CORS does not apply to server-side requests. |

**Recommendation:** use `/categories` now. A minimal dedicated `GET /health` (`@Public`, optional `SELECT 1`) is a cleaner long-term endpoint, but it is a code change, so it is not part of this audit (§8 OPEN).

**Verifying the configuration deploy** (before 15E.4e.1). The deployment logs must show:

- the pre-deploy step running `prisma migrate deploy` with "No pending migrations to apply";
- the container starting with `node dist/main` and **no** Prisma migrate output;
- the healthcheck on `/categories` succeeding before the deployment becomes Active;
- 1/1 replica running; anonymous smoke as in 15E.4d.2.

The deployment details page shows which values came from `railway.json` (file icon).

## 6. Failure and rollback analysis

`(current)` = today's setup (migrations in the start command, no healthcheck). `(recommended)` = §5.

| Case | Current setup | Recommended setup | Schema / compatibility |
|---|---|---|---|
| **A. Migration succeeds** | New container migrates, then starts; marked Active at container start; `06d6de9` served throughout and is removed afterwards. Works, but with no protection if the app then fails (Case D). | Pre-deploy migrates while `06d6de9` serves; then the new container starts; traffic switches only after `/categories` returns 2xx. | `06d6de9` works on the contracted schema during the overlap [VERIFIED §4]. No forced logout; no live token invalidated. |
| **B. Migration fails before the new container starts** (e.g. lock timeout, database unreachable) | Not possible as such: the migration runs **inside** the new container, after it was marked Active. → effectively Case C. | Pre-deploy exits non-zero, so **the deployment does not proceed**; `06d6de9` keeps serving on the unchanged schema. **No downtime.** | Database unchanged (atomic). A failed row is recorded, so later deploys fail at pre-deploy with P3009 until resolved — deploys blocked, production up. |
| **C. Migration fails partway** | PostgreSQL rolls the whole transaction back [VERIFIED]. But the container exits after being marked Active, so **production is down**: the previous deployment is removed; `ON_FAILURE` restarts (×3) each re-run `migrate deploy` → **P3009** → down. A **Railway rollback to `06d6de9` does not help** either: its start command also runs `migrate deploy` and also stops on **P3009** [VERIFIED locally]. Recovery needs `prisma migrate resolve --rolled-back 20261003090000_phase15e4e1_refresh_token_session_contract` against production, then a redeploy. | Same atomic rollback, but in the pre-deploy container: **the deployment does not proceed, `06d6de9` keeps serving.** Its start command no longer runs migrations once the configuration deploy is live, so a restart cannot hit P3009. Fix, then resolve and redeploy at leisure. | Schema and data exactly as before; `06d6de9` unaffected. |
| **D. App fails to start after the migration succeeded** | Migration committed; the container crashes after being marked Active → **downtime** until a rollback or fix. Rollback to `06d6de9` works: "No pending migrations", client compatible [VERIFIED §4]. | Healthcheck never returns 2xx → the deployment is marked failed; **`06d6de9` keeps serving on the contracted schema** (compatible). No downtime. | Contracted schema stays; that is safe for `06d6de9`. The deleted rows were dead anyway. |
| **E. Roll back to `06d6de9`** | After a **successful** migration: works (image boots, client compatible). After a **failed** one: **P3009 crash-loop** until resolved (Case C). | After a successful migration: works, whichever start command the rolled-back deployment uses. With the old one (`migrate deploy && …`) it prints "No pending migrations" and starts [VERIFIED]; with the new one it just starts. [OPEN: whether a Railway rollback restores the old deployment's configuration snapshot as well as its image; deployments carry a `snapshotId`. Either way the outcome is the same here.] After a failed migration: production never left `06d6de9` (Case B/C), so no rollback is needed. | Rollback floor for the schema: any 15E.4b+ release (`12e261d` onwards). Pre-15E.4b code cannot run on NOT NULL. After 15E.4e.2 (future) the floor becomes the 15E.4e.1 code. |

**Why the configuration deploy must come first.** The protection in Cases B to E depends on the **serving** deployment no longer running migrations at start, and on the **incoming** deployment migrating in pre-deploy. If 15E.4e.1 went out first, it would still run under the current start command.

## 7. Exact preconditions for merging 15E.4e.1

| # | Precondition | Class |
|---|---|---|
| P1 | Owner approves the `railway.json` change in §5 (infrastructure change) | REQUIRES OWNER DECISION |
| P2 | A separate PR with **only** that `railway.json` change; CI green; merged; deployed through the CI gate | AFTER P1 |
| P3 | That deploy verified: pre-deploy ran `migrate deploy` ("No pending migrations"); start ran `node dist/main` with no migrate output; healthcheck `/categories` passed; SUCCESS; 1/1 replica; anonymous smoke OK | AFTER P2 |
| P4 | (Recommended) Pre-Deploy Timeout set to 300 s in the dashboard, if the field is offered | AFTER P2, OWNER |
| P5 | 15E.4e.1 PR updated with `main` (it does not touch `railway.json`, so there is no conflict) and its CI green on the merged result | AFTER P3 |
| P6 | Plan for the **2026-12-01 Config-as-Code cutoff**: move these settings (builder, install, build, pre-deploy, start, healthcheck, restart policy) to the dashboard or to Infrastructure as Code before that date. Not a blocker for 15E.4e.1. | FOLLOW-UP, OWNER |
| P7 | Optional, immediately before merging 15E.4e.1: re-run the read-only E3 check (session-less live = 0 expected). The migration is correct regardless. | OPTIONAL |

## 8. Classification of findings

| Finding | Class |
|---|---|
| Production start command runs `prisma migrate deploy`; no pre-deploy command; no healthcheck; 1 replica; `ON_FAILURE` ×3; Wait-for-CI on `main` | **VERIFIED** (Railway API, build logs, `railway.json`) |
| `railway.json` overrides dashboard settings; Config as Code deprecated, cutoff 2026-12-01 | **VERIFIED** (Railway docs) |
| No healthcheck → Active at container start; failed pre-deploy → deployment does not proceed; failed healthcheck → previous deployment keeps serving | **VERIFIED** (Railway docs) |
| `prisma migrate deploy` applies the 15E.4e.1 file as one transaction; failure is atomic; then P3009 for every later deploy | **VERIFIED** (local PostgreSQL 16 reproduction + test suite) |
| After a failed 15E.4e.1 migration, a `06d6de9` image also stops with P3009 | **VERIFIED** (local reproduction) |
| `06d6de9` is compatible with the contracted schema (overlap and rollback) | **VERIFIED** (code inspection + `06d6de9` client probe) |
| `/categories` is a suitable healthcheck now; there is no `/health` | **VERIFIED** (code + live read-only GETs) |
| Recommended `railway.json` change and the deploy order | **DESIGN** |
| Pre-Deploy Timeout availability when the command comes from `railway.json` | **OPEN** |
| Whether a Railway rollback restores the old deployment's configuration as well as its image | **OPEN** (outcome is the same either way, §6 E) |
| A dedicated `GET /health` endpoint | **OPEN** (code change, future) |
| Migration off Config as Code before 2026-12-01 | **OPEN** (owner, follow-up) |

---

*Audit only. No deployment, database change, Railway or environment-variable change was made. 15E.4e.1 is not merged; 15E.4e.2 has not started.*
