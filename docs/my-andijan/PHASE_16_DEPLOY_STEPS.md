# Phase 16 API deploy — owner step list (2026-10-10)

> **Plan only.** Nothing here has been executed. Every step marked **[PROD]** waits for the owner's explicit approval of that step in chat. This is the plain-English order of work for [`PHASE_16_DEPLOY_RUNBOOK.md`](PHASE_16_DEPLOY_RUNBOOK.md); the detail (SQL, abort rules, evidence list) stays in that runbook and in [`RELEASE_16H_PLAN.md`](RELEASE_16H_PLAN.md) §4–§5.

## Facts checked today (read-only, 2026-10-10)

| Fact | Evidence |
| --- | --- |
| Release candidate: API `main` = `ae4364826425c55299ad96f88bdc5cdac9646721` (unchanged since 2026-10-08) | `git log origin/main` |
| Production still runs `2ea83b6`, deployment `2e7eb32a…` (`SUCCESS`, rollback of 2026-10-09). No deployment since | Railway deployments list |
| **Railway does not wait for CI.** Service source `main`, `checkSuites: false`. Nothing staged | Railway service config, staged changes = none |
| Builder setting reads `RAILPACK`, but `railway.json` (`NIXPACKS`, pre-deploy `npx prisma migrate deploy`, healthcheck `/categories` 120 s) overrides it | `railway.json` on `main`; 2026-10-04 build log |
| 16H migration on `main` still has **no** `lock_timeout` | `migration.sql` line 24 `LOCK TABLE … SHARE ROW EXCLUSIVE` |
| Frontend PR #6 open at `610f527`, mergeable (`clean`) | GitHub API |
| API PR #28 (Gate 2 Phase C) and #27 open, unmerged | GitHub API |

## How Gate 2 / runbook E0 is handled

- The pause (D-80) says E0 is satisfied, but it lives on branch `docs/gate2-pause-2026-10-10`, **not merged** in either repo. Until it is on frontend `main`, `CURRENT_STATE.md` on `main` still says Gate 2 is open and E0 still says stop.
- **Step 1** therefore merges the **frontend** pause PR first (docs only; it triggers a Vercel production build of docs, no app change). After that, E0 passes on the record and the `RELEASE_16H_PLAN.md` §3 E0 exception is **no longer needed** — but its pinned-SHA rule is kept anyway, because Railway does not wait for CI.
- The **API** copy of the pause docs (`CLAUDE.md`, `RUNBOOK.md` §10) is merged **after** the release (step 10). Merging anything to API `main` before then could deploy an un-reviewed SHA immediately.
- Rule for the whole window: **no merge to API `main`** from step 2 until step 8 passes.

## Steps

| # | Step (simple English) | Who | Time |
| --- | --- | --- | --- |
| 0 | **Decide two things:** (a) how to bound the 16H lock — I recommend **option C** below; (b) approve this step list | Owner | 10 min |
| 1 | **[PROD — Vercel, docs only]** Merge the frontend Gate 2 pause PR so E0 is satisfied on `main` | Owner | 5 min |
| 2 | **Re-check (read-only):** API `main` still `ae43648`, production still `2e7eb32a…`, nothing staged, PR #28 unmerged, Gate 2 Phase D never ran (`DATABASE_URL` is the table owner), PR #6 still green | Claude | 5 min |
| 3 | **[PROD read] Backup.** Railway Hobby cannot make backups, so take a `pg_dump` with the committed Gate 2 §8 tools: row counts → dump → row counts again → counts must match → restore the dump into a local throwaway PostgreSQL 18.6 and check it → record size and SHA-256. Files go only to the owner-named folder on `R:` | Owner (or Claude with approval) | 30–45 min |
| 4 | **[PROD read] Pre-checks:** run the duplicate-PENDING query (records how many claims the migration will close), and check that no session is `idle in transaction` and nothing holds a lock on `business_claims` | Owner | 5 min |
| 5 | **[PROD write] Deploy.** Deploy **exactly** commit `ae43648` to `myandijan-api` / `production` with Railway's deploy-a-specific-commit action. Not a push, not "Redeploy", not `railway up` | Owner | 2 min to start |
| 6 | **Watch it:** build log shows Nixpacks (abort while still building if not) → pre-deploy log shows 17 migrations and `phase16h_claim_pending_unique` applied → healthcheck passes → `SUCCESS` | Owner + Claude (read-only) | 5–10 min |
| 7 | **Verify (mostly read-only):** V1 17 migrations, V2 none failed, V3 no duplicate PENDING left, V4 closed count matches step 4, V5 the new unique index exists, V6 `updatedAt` on lists, V7 admin business detail 200, V8 admin claims carry review context, V9 approve with empty body answers 400, V10 `/categories` 200 | Owner (DB, admin session) + Claude (public HTTP) | 15 min |
| 8 | **[PROD — Vercel] Merge frontend PR #6 right away** (from step 6 until this is live, approving a claim fails with 400). Confirm a Vercel **Production** `success` for the merge SHA, then open the approve dialog and cancel it | Owner | 10 min |
| 9 | **Record:** deployment id + SHA, V1–V10 results, PR #6 merge SHA and its Vercel deployment, in `CURRENT_STATE.md` via a docs PR | Claude | 10 min |
| 10 | **Afterwards:** merge the API Gate 2 pause docs PR (this deploys API `main` again, docs only — do it as its own approved step); regenerate sitemaps in a frontend PR | Owner | 15 min |

**Total:** about 2 hours, most of it the backup. The production-touching part (steps 5–8) is about 30–45 minutes.

### The 16H lock — pick one in step 0

| Option | What it means | Trade-off |
| --- | --- | --- |
| **C (my recommendation)** | Keep `ae43648`. Step 4 confirms no open writer is holding claims. If the migration still hangs: **do not cancel the deploy** — find and end only the blocking session (owner approves) and it completes | No new code or PR; relies on the pre-check |
| A | New API PR adds `SET LOCAL lock_timeout = '30s'` to the 16H file; deploy that merge SHA instead | Safer by construction, but adds a PR + CI round, and the merge itself may deploy immediately because CI wait is off |
| B | Add `lock_timeout` to `DATABASE_URL` | A production variable change that also affects the running app; not recommended |

## If something fails (rollback)

| What fails | What to do | Time |
| --- | --- | --- |
| Build is not Nixpacks | Abort while it is still building. Nothing changed | 2 min |
| Pre-deploy migration **fails** (e.g. lock timeout) | Nothing new is live; old API keeps serving. Do not retry, do not `migrate resolve` without a separate approval. Record the failed row and report. Do not merge PR #6 | 5 min |
| Pre-deploy **hangs** | Do **not** cancel. Find the blocking session read-only; owner decides whether to end only that session | 5–15 min |
| Healthcheck or any V-check fails | Railway **Rollback** to `2e7eb32a…` (`2ea83b6`). The 16H index and closed duplicates stay; that is safe for the old code. Do not merge PR #6 | 5 min |
| PR #6 merged, then API rolled back | Nothing urgent: the old API ignores the note. Reverting PR #6 is optional | 0–10 min |
| Data must be restored | Last resort: restore the step 3 dump (loses every write since it). Separate owner decision | 30–60 min |
