# API release of `ae43648` (Phase 16 + 16H) — dependency-ordered plan

> **Status 2026-10-10: BLOCKED — owner decisions required (§7).** Nothing in this file authorizes a production action. Every step marked **[PROD]** needs the owner's explicit, per-step authorization in chat (`AGENTS.md`, `MEMORY_CONTRACT.md` §6.2). This is the single plan under which the Phase 16 deploy-day runbook ([`PHASE_16_DEPLOY_RUNBOOK.md`](PHASE_16_DEPLOY_RUNBOOK.md)) is executed while SIG Gate 2 is open (Option B).

## 1. Facts this plan relies on (verified 2026-10-10, read-only)

| Fact | Evidence |
| --- | --- |
| Release candidate = API `main` **`ae4364826425c55299ad96f88bdc5cdac9646721`**; `test-and-build` **success** 2026-10-08T10:19:24Z | GitHub check-runs API |
| Production = commit `2ea83b6`, active deployment `2e7eb32a-be06-4021-8c2e-e2abdff2ec2e` (`SUCCESS`, `reason: rollback`, 2026-10-09T11:40:21Z); no deployment since | Railway deployments API |
| Exactly one new migration: `20261007090000_phase16h_claim_pending_unique` (16 → 17) | `git diff 2ea83b6 ae43648 -- prisma` |
| `railway.json` byte-identical at `2ea83b6` and `ae43648`: builder `NIXPACKS`, pre-deploy `npx prisma migrate deploy`, start `npm run start:prod`, healthcheck `/categories` 120 s | `git show` both commits |
| **Actual builder = Nixpacks v1.41.0** (`nodejs_22, npm-9_x, openssl`): `railway.json` overrides the service setting, which reads `RAILPACK` | Build log of `6b5f057b…` (2026-10-04): `[railway] prepare nixpacks-v1.41.0` |
| Service source `main`, **`checkSuites: false`** (Wait for CI off — contradicts D-77 §1), Auto Deploy on; no staged changes; `MIGRATION_DATABASE_URL` absent | Railway service config (names only) |
| Pre-deploy evidence format: `N migrations found` → ``Applying migration `…` `` → `All migrations have been successfully applied.` | Deploy log of `fe107075…` (2026-10-04) |
| Plan Hobby: Railway Backups cannot be created ("Upgrade to Pro to create new backups") | Owner dashboard, 2026-10-09 |
| API PR #28 (Gate 2 Phase C) open, unmerged, CI success at `e37e4d8`; frontend PR #6 open at `610f527` | GitHub pulls API |

## 2. The five blockers and their exit criteria

| # | Blocker | Root cause | Exit criterion (evidence required to close) |
| --- | --- | --- | --- |
| B1 | No fresh, verified backup | Phase 16 runbook E5 assumed Railway Backups; Hobby cannot create them | Same-day `pg_dump` per Gate 2 RUNBOOK §8 tooling: frame intact, `pg_dump_exit=0`, dump SHA-256 recorded, isolated PostgreSQL 18.6 restore `restore-check.sh` exit 0 (or exit 2 with every differing table explained), `cleanup done` |
| B2 | No written E0 exception | Option B (release before Gate 2 closes) contradicts runbook E0 and D-77 §3; D1 was approved only in principle | §3 confirmed by the owner in chat and recorded in `DECISIONS.md` |
| B3 | Release path not fully specified | Push trigger silently stopped (15 merges 2026-10-05..08 produced no deployment); `checkSuites=false`; runbook §2 assumes a CI-gated push path | Owner-confirmed operation (§4 step 4); builder confirmed (done: Nixpacks); Auto-Deploy decision recorded |
| B4 | 16H migration has no lock/statement timeout | It takes `SHARE ROW EXCLUSIVE` on `business_claims` with no `lock_timeout`; the pre-deploy has no timeout | A bounded-time mitigation approved and in place, **or** the owner's written acceptance of the residual risk with the §5 abort rules |
| B5 | Runbook drift / no post-deploy evidence list | Runbook written 2026-10-08 for a CI-gated push deploy | Runbook corrected and the §5 checklist adopted |

### 2.1 Findings that shape the plan (2026-10-10)

- **B1 (backup).** Local toolchain ready: every PostgreSQL binary in `D:/PostgreSQL-18.6/pgsql/bin` reports 18.6; port 55499 free; `remote-dump.sh` blob matches its pin `18f0d33d…f724` (CI-checked in `test/db/r-e4.db-spec.ts`). No sync client or File History source is configured on `R:` (OneDrive root is `C:\Users\JKT443\OneDrive`; Google Drive/Dropbox/iCloud absent; Windows Backup needs admin — UNKNOWN). **Not Gate 2 R-E4:** this is a release backup, so it does not need the W0–W9 outage. Proposed, with the committed tools unchanged: counts → dump → counts again; `counts.sh compare pre.counts post.counts` must exit 0, then `restore-check.sh` against the post counts must exit 0. Limitation: an UPDATE between the two counts is invisible to counts (the dump itself is still one consistent snapshot). Runbook E5 as written (Railway Backups) cannot be met on Hobby → amended (runbook E5).
- **B3 (release path).** Railway docs: config in code overrides the dashboard; pre-deploy runs in a separate container with the app's variables, is not retried, has **no default timeout** (optional "Pre-deploy Timeout" 1–3600 s in service settings); the dashboard Abort covers initializing/building only. Docs list only `RAILPACK`/`DOCKERFILE` builders, yet the 2026-10-04 build honoured `railway.json` `NIXPACKS` **and** `nixpacks.toml` (`npm ci --include=dev`). A build of the same config today is therefore *expected* to be Nixpacks but not guaranteed — the builder is a **stop check during the build** (§5), before the pre-deploy can touch the database. Push-trigger cause: UNKNOWN; documented candidates (GitHub App access/pending permissions, webhook delivery, trigger branch) are owner-side read-only checks; fixing it mid-release could start an unintended deploy of `main`. Config-as-Code stops being read on **2026-12-01** (replacement: `.railway/railway.ts`) — a separate follow-up.
- **B4 (lock).** Tested locally (PostgreSQL 18.6, Prisma 5.22.0, throwaway DB):
  - Prisma inserts the `_prisma_migrations` row (autocommit), then sends the whole file as **one implicit transaction**.
  - The lock blocks claim **writes** (and business/user deletes that cascade into `business_claims`); reads continue.
  - **Unbounded (as merged):** behind an idle-in-transaction writer it waits forever. **Killing the pre-deploy does not stop the server-side backend**: when the blocker ends, the orphan **commits the migration** while the row stays unfinished (split state). A Railway pre-deploy timeout alone therefore makes things worse, not better.
  - **Bounded (`SET LOCAL lock_timeout`):** fails in seconds with `55P03`, **nothing persisted**, row marked failed → the next deploy stops with P3009 until a `migrate resolve` (D2: separate owner approval). Without contention it applies normally (3.6 s locally).
  - `?options=-c lock_timeout=…` on the connection URL is honoured too (no code change, but a `DATABASE_URL` change that also affects the app).
  - A follow-up migration cannot bound 16H. Editing the merged-but-unapplied 16H file is checksum-safe (`migrate deploy`/`status` ignore it where already applied).
  - House precedent: 15E.4e.1 and 15E.4e.2 use `SET LOCAL lock_timeout = '30s'` with a contract test.
- **Gate 2 interaction.** The release must finish cleanly **before** the next R-E4 W0: a release after W0 invalidates R-E4 (16H changes `business_claims` and adds the 17th migration row). Any 16H failure row makes Gate 2 P10 (`not_clean`) stop until the owner decides.

### 2.2 B4 options (choose one; nothing changed yet)

| Option | Change | Approval | Consequence |
| --- | --- | --- | --- |
| **A (recommended)** | API PR: add `SET LOCAL lock_timeout = '30s';` (+ optional `SET LOCAL statement_timeout = '60s';`) before `LOCK TABLE` in the 16H file, with a contract test like `migration-contract.db-spec.ts:229` | Owner: PR merge | New release SHA replaces `ae43648` in §3/§4. **Merging deploys `main` if the push trigger works** (`checkSuites=false`, no CI wait) → the merge must be treated as the release itself, or happen inside the release window with the §4 preconditions met |
| B | `DATABASE_URL` gains `options=-c lock_timeout=30s` | Owner: variable change (triggers a redeploy of the current commit; affects runtime queries; revert later) | No new SHA |
| C | Accept the risk + operational pre-check: immediately before step 4, read-only `pg_stat_activity` (no `idle in transaction`) and `pg_locks` on `business_claims` (empty) | Owner: written risk acceptance + DB read | If it still hangs: **do not cancel**; find and end only the blocking session (owner-approved); the migration then completes cleanly |

The pre-check of option C is recommended with A or B as well.

## 3. E0 exception — DRAFT, not in force until the owner confirms it in chat

> **E0 exception (Option B), proposed 2026-10-10.** The owner permits **one** API production release while SIG Gate 2 is open, under these conditions only:
> 1. **Exactly** commit `ae4364826425c55299ad96f88bdc5cdac9646721` (`test-and-build` success) — or, if the owner chooses B4 option A, exactly the merge SHA of that reviewed PR once its `test-and-build` passed, named here before deployment. Any other SHA voids this exception.
> 2. Released by a pinned-commit deployment of service `myandijan-api` in environment `production` (§4 step 4) — not by a merge or push to `main`, not `railway up`, not "Redeploy".
> 3. Preconditions: B1 closed the same day; B4 closed or its residual risk accepted in writing; E3, E4, E6 re-checked on the day; no merge to API `main` from the start of the window until §5 passes.
> 4. Gate 2 is unaffected: it stays OPEN; R-E4 is re-run in a new window before Phase A; Phases A–E and the close need their own authorizations; PR #28 stays unmerged until Phase B is verified.
> 5. D-77 §3 deviation acknowledged: a manual platform deploy is used for a normal release because the push trigger is not working and `checkSuites` is off; the commit's `test-and-build` passed, which is the substance of D-77.
> 6. Rollback window: from deployment SUCCESS until §5 completes (target ≤ 60 min). Rollback = Railway **Rollback** to deployment `2e7eb32a…` (commit `2ea83b6`; image retained 72 h on Hobby). Rollback does **not** reverse the 16H migration.
>
> Approval in principle (D1, 2026-10-09) is **not** execution authorization. Each **[PROD]** step still needs its own authorization.

## 4. Single dependency-ordered sequence

| Step | Action | Who | Depends on |
| --- | --- | --- | --- |
| 0 | Owner decisions (§7) recorded in `DECISIONS.md` | Owner | — |
| 1 | Day-of re-check (read-only): `main` head, PR #28 unmerged, active deployment still `2e7eb32a…`, E3, E4 (no Phase D), E6 | Claude | 0 |
| 2 | **[PROD read + R:]** B1 backup with the committed Gate 2 §8 tools: counts (`pre`) → `remote-dump.sh` → counts (`post`) → `counts.sh compare pre post` = 0 → `unframe-dump.sh` → `restore-check.sh <dump> post.counts` = 0 → record sizes, SHA-256, `cleanup done`. Outputs only in the owner-named `R_E4_DIR` | Owner-authorized operator | 0, 1 |
| 3 | **[PROD read]** Runbook §1 duplicate pre-check (records the expected V4) | Owner | 1 |
| 4 | **[PROD write]** Deploy `ae43648` pinned: GraphQL `serviceInstanceDeployV2(serviceId: "4109a788-880f-4d6c-a0a6-766663cd2f24", environmentId: "653c2817-832a-4d76-a236-d91972b55d09", commitSha: "ae4364826425c55299ad96f88bdc5cdac9646721")` or the dashboard's deploy-a-specific-commit action. **Never** the Railway MCP `create-deployment` tool (it creates a new service) | Owner | 2, B4, §3 confirmed |
| 5 | Watch build (expect Nixpacks), pre-deploy (17 migrations; 16H applied), healthcheck; abort rules in §5 | Owner + Claude (read-only) | 4 |
| 6 | §5 evidence checklist | Owner (DB) + Claude (HTTP, read-only) | 5 |
| 7 | Merge frontend PR #6 → Vercel Production `success` for the merge SHA (runbook §4) | Owner | 6 passes |
| 8 | Record in canonical memory; Gate 2 continues: new R-E4 window → Phase A … | Claude (docs) / Owner | 7 |

## 5. Post-deploy evidence checklist (B5)

Record every item with its timestamp. A blank item means "not verified".

1. **Deployment:** id; `meta.commitHash` = `ae4364826425c55299ad96f88bdc5cdac9646721`; `status` = `SUCCESS`; it is the active deployment of `myandijan-api`/`production`, and `2e7eb32a…` is `REMOVED`.
2. **Build:** the log shows `Nixpacks v1.41.0` (or record the builder/version actually used) and `npm run build` success; pre-deploy and start commands as in §1 (config from `railway.json`).
3. **Pre-deploy log:** `17 migrations found in prisma/migrations`; ``Applying migration `20261007090000_phase16h_claim_pending_unique` ``; `All migrations have been successfully applied.`; record its duration.
4. **V1** `_prisma_migrations` count = 17. **V2** 0 rows with `finished_at IS NULL OR rolled_back_at IS NOT NULL`.
5. **V3** duplicate PENDING query = 0 rows; **V4** auto-closed count = Σ(pending − 1) from step 3 (0 if none); **V5** index `business_claims_one_pending_per_claimant` = `UNIQUE … (business_id, claimant_id) WHERE status = 'PENDING'`.
6. **Health:** Railway healthcheck succeeded; **V10** `GET /categories` 200.
7. **V6–V9** as in the runbook §3.
8. **Gate 2 snapshot (read-only):** still 33 tables; record counts as the next R-E4 baseline.
9. **Frontend:** PR #6 merge SHA and its Vercel Production `success`.

**Abort rules.**
- **Build:** the log does not show Nixpacks with `npm ci --include=dev` (or Prisma is not the local 5.22.0) → the owner aborts **while it is still building**, before the pre-deploy runs.
- **Pre-deploy fails** (e.g. `55P03` lock timeout) → nothing new is live; do not retry and do not `prisma migrate resolve` (D2); record the `_prisma_migrations` row; report.
- **Pre-deploy hangs** (unbounded migration) → **do not cancel the deployment** (a killed client leaves the server-side migration to commit later into a split state). Read-only: find the blocking session in `pg_stat_activity`/`pg_locks`; the owner decides whether to end only that session.
- **Healthcheck or any V-check fails** → Railway **Rollback** to `2e7eb32a…`; the 16H index and closed duplicates stay (runbook §6).

## 6. Gate 2 RUNBOOK corrections — proposed, not made

`my-andijan-api/db/privileges/RUNBOOK.md` lives on API `main`; merging any change there deploys `main` (`checkSuites=false`), so these wait for a window the owner chooses (after the release, or bundled with B4 option A):
- **E4 (line 77)** "Railway backup VERIFIED" is impossible on Hobby → the R-E4 §8 dump is the recovery point.
- **Step 0 (lines 164–165, 191–192, 310–312)** add: under D1 the API release must be complete and clean **before** W0; a release after W0 invalidates R-E4.
- **P10 (line 173)** at REV `ae43648` the expected count is **17**, `not_clean` = 0; any 16H recovery row is a STOP pending the owner.
- **Step 5 (lines 216–218)** "merge the Phase C PR … the resulting deploy" → deploy exactly the Phase C merge SHA after its CI passes (Wait for CI is off); `main` must hold nothing unreleased beyond Phase C.
- **§8 stop condition 11** Rollback-creates-a-new-ID wording (Option A, 2026-10-09) — still pending.

## 7. Owner decisions still open

Listed once, in `CURRENT_STATE.md` top section → "Owner decisions required".
