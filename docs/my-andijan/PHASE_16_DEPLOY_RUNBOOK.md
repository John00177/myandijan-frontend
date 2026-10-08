# Phase 16 deploy-day verification runbook

> **For the first API deploy after Railway access is restored.** Written 2026-10-08 against API `main` `de9c55f` (since then only backend #26, `.env.example` docs: `ae43648`) and frontend `main` `fa2a998`. If either `main` has moved, re-check §1 before starting. Every step that touches production is the **owner's action** (or Claude's only with the owner's explicit, per-step authorization in chat — `AGENTS.md`). Name variables, never values: nothing here needs a secret written down.

## 0. What ships

The API has not deployed since `2ea83b6` (backend PR #13, 2026-10-04). Deploying `main` ships **every** API change merged since, at once:

| Phase | What changes in production | Backend PR |
| --- | --- | --- |
| 16C.1 | Claim approval requires `{ verificationNote }`; re-checks business and claimant | #10 |
| 16E.1 | `GET /admin/claims` rows gain review context (`business.status`, `deletedAt`, `_count.claims`, `claimant.status`) | #11 |
| 16E.4 | `GET /admin/businesses/:id` | #17 |
| 16F.2 / 16F.3 | Slug integrity; district AND city filter | #19, #20 |
| 16F.6 | `updatedAt` on the business/event lists; counters stop moving it | #21 |
| 16G.1 | Anonymous analytics de-duplicated and capped | #23 |
| 16H | One PENDING claim per (business, claimant) — **the one new migration** | #24 |
| SIG Gate 2 | CI database suites, privilege runbook, R-E4 write-pause tooling — **no production effect by themselves** | #14–#16, #18, #25 |

**Exactly one new migration:** `20261007090000_phase16h_claim_pending_unique` (17 in total). It locks `business_claims` briefly, closes any duplicate PENDING pairs (keeps the earliest; the rest become `REJECTED` with reason *"Duplicate of an earlier pending claim by the same user (closed automatically)"*; nothing is deleted), then builds the partial unique index `business_claims_one_pending_per_claimant`. Railway runs it as the pre-deploy command (`npx prisma migrate deploy`, `railway.json`). **A rollback does not reverse it** (`ENGINEERING_RULES.md` rule 15).

Frontend: `main` already deploys to Vercel production on every merge. The only frontend change tied to this deploy is **frontend PR #6** (16C.1 verification note), held until §4 (owner decision, 2026-10-08).

## 1. Entry checks (before deploying)

| # | Check | How | Pass |
| --- | --- | --- | --- |
| E0 | **SIG Gate 2 is not open** | `CURRENT_STATE.md` — SIG Gate 2 block (frontend PR #25) | Gate 2 closed. Its rule: **do not deploy API `main` while Gate 2 is open** — the gate's window resumes only to the recorded W0 deployment. If it is open: stop |
| E1 | Railway plan / access restored | Owner | Dashboard usable |
| E2 | API `main` is the commit you intend to ship, and its CI passed | GitHub: `main` head and its `test-and-build` check | `de9c55f` (or a later commit you have reviewed) with `test-and-build` = success |
| E3 | Exactly one new migration since `2ea83b6` | `git diff --name-status 2ea83b6 <main> -- prisma` | One `A` under `prisma/migrations/` (the 16H one) + `M prisma/schema.prisma` (comment only). Anything else: stop and review |
| E4 | SIG Gate 2 Phase D has **not** run in production | Gate 2 record (`CURRENT_STATE.md`): the 2026-10-08 read-only preflight found Gate 2 stopped before any production mutation; re-confirm on the day (owner) | `DATABASE_URL` still connects as the table owner. The schema has no `directUrl`, so migrations run on `DATABASE_URL`, and the 16H migration's `LOCK TABLE` / `CREATE INDEX` need the owner role. If Phase D has run, stop: follow `my-andijan-api/db/privileges/RUNBOOK.md` Phase C first |
| E5 | A restorable backup exists from today | Railway → Postgres → Backups (owner) | Backup timestamp after the last write you care about |
| E6 | Frontend PR #6 is still green and conflict-free | GitHub PR #6 | Mergeable, `test-and-build` = success on its head (`89e0e61` at writing). If `main` moved, rebase it first (through the PR, never a direct push to `main`) |

**Read-only pre-check (optional, owner, Railway Postgres console):** the duplicate PENDING pairs the migration will close.

```sql
SELECT business_id, claimant_id, count(*) AS pending
FROM business_claims
WHERE status = 'PENDING'
GROUP BY business_id, claimant_id
HAVING count(*) > 1;
```

Record the rows. Each pair keeps one claim; the other `pending − 1` get closed (§3, V3–V4).

## 2. Deploy the API

1. Let Railway deploy API `main` through the normal CI-gated path (D-77: production deploys only commits whose `test-and-build` passed). Do not `railway up` from a working tree.
2. Watch the deployment's **pre-deploy** log: `prisma migrate deploy` must report applying `20261007090000_phase16h_claim_pending_unique` and finish without error.
3. Watch the healthcheck (`/categories`, 120 s). The deployment must reach **SUCCESS**.

**Stop conditions:** the pre-deploy step fails; the healthcheck fails; the deployment does not reach SUCCESS. Then do **not** merge frontend PR #6, and go to §6.

## 3. Verify the API (read-only unless marked)

Database checks run in the Railway Postgres console (owner). HTTP checks use the production API origin. Admin checks need a staff session — the owner's own sign-in in the browser is enough (DevTools → Network), so no token is copied anywhere.

| # | Check | Expected |
| --- | --- | --- |
| V1 | `SELECT count(*) FROM _prisma_migrations;` | **17** |
| V2 | `SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL;` | **0 rows** |
| V3 | Re-run the §1 duplicate query | **0 rows** |
| V4 | `SELECT count(*) FROM business_claims WHERE rejection_reason = 'Duplicate of an earlier pending claim by the same user (closed automatically)';` | The sum of `pending − 1` over the pre-check rows (0 if it found none) |
| V5 | `SELECT indexdef FROM pg_indexes WHERE indexname = 'business_claims_one_pending_per_claimant';` | One row: a `UNIQUE` index on `(business_id, claimant_id)` with `WHERE status = 'PENDING'` |
| V6 | `GET /businesses?limit=1` and `GET /events?limit=1` | Each item carries `updatedAt` (16F.6) |
| V7 | Admin: open a PENDING business in the admin review drawer (or `GET /admin/businesses/<id>`) | **200** with branches, not 404 (16E.4; until now the frontend fell back by design) |
| V8 | Admin: `GET /admin/claims?status=PENDING` | Rows carry `business.status`, `business._count.claims` and `claimant.status` (16E.1); the admin claims queue shows warnings / the competing-claims flag where they apply |
| V9 | Admin: `POST /admin/claims/<any id>/approve` with an **empty body** `{}` | **400** naming `verificationNote` (16C.1). Validation rejects it before the handler runs, so nothing is written. Do **not** send a real note here |
| V10 | `GET /categories` | 200 (the healthcheck route) |

**Optional live checks — they write; use a test account and a test listing, and clean up:**

- **16H:** file a claim on an unowned test listing from a test account, then file it again → the second answers **409**. Afterwards reject the test claim in the admin queue.
- **16G.1:** `POST /analytics/view` twice for one listing from one browser within 30 minutes → that listing's `viewCount` rises by **1**, not 2.

## 4. Ship frontend PR #6 — immediately after §3 passes

From the moment the API is live, **approving a claim answers 400 until PR #6 is in production** (the current UI sends no note). Keep this window short.

1. Merge frontend PR #6 (owner). Vercel promotes production for the merge commit after its `test-and-build` passes.
2. Confirm a Vercel **Production** deployment for the **merge SHA** with status `success` (GitHub → Deployments). A 200 from `myandijan.uz` proves nothing — every path is rewritten to `index.html` (`ENGINEERING_RULES.md` rule 10).
3. In the admin claims queue, click **Tasdiqlash** on a pending claim → a prompt asks for the verification note. Cancel it (approving is a real ownership change; approve only a claim you mean to).

## 5. After verification

1. Regenerate the sitemaps (`npm run sitemap` in the frontend; it reads the now-live `updatedAt`) and commit them in a frontend PR (16F.4 / 16F.5 / 16F.7).
2. Record the result in canonical memory (`intelligence/MEMORY_CONTRACT.md` §4–§5): the Railway deployment id **and** SHA, V1–V10, the PR #6 merge SHA and its Vercel deployment. Only then call anything "deployed".
3. Then: 16C / 16E production closure; 16I preparation (SMS via `ESKIZ_*` on Railway is a separate, owner-authorized variable change).

## 6. Rollback

| Situation | Action |
| --- | --- |
| Pre-deploy migration failed | Nothing new is live: Railway keeps serving the previous deployment. Read the pre-deploy log and check `_prisma_migrations` for a failed row — it must be resolved (`prisma migrate resolve`) before any retry. Do not merge PR #6 |
| API live, but a §3 check fails | Redeploy the previous Railway deployment (`2ea83b6`) from the dashboard. **The 16H index and the closed duplicates stay** — the migration is not reversed. That is safe: the old code still files claims and its pre-check still answers 409 for a duplicate; only a truly concurrent duplicate would now get a 500 (unhandled unique violation) instead of slipping through. Do not merge PR #6 |
| PR #6 merged, then the API rolled back | The old API's approve route reads no body, so it ignores `verificationNote` and approvals keep working. Reverting PR #6 is optional |
| Data restore needed | The E5 backup (owner). Last resort — it discards every write since the backup |

## 7. Not covered here

SMS / Eskiz configuration (16I), SIG Gate 2 phases (`my-andijan-api/db/privileges/RUNBOOK.md`), the pilot cohort, and any production variable change — each a separate owner decision.
