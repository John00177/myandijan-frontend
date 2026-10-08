# CURRENT_STATE — My Andijan

> **Recovery entry point.** Read the top section only; it is the current state. Everything below it is historical and is kept for context. How memory works: [`intelligence/PROJECT_MEMORY.md`](intelligence/PROJECT_MEMORY.md). Update rules: [`intelligence/MEMORY_CONTRACT.md`](intelligence/MEMORY_CONTRACT.md) §4.

## Current state — 2026-10-08, after the 16E.1 merges (authoritative)

**Repositories** (verified 2026-10-08 from Git and GitHub's PR API)

| | `main` | Merge of |
| --- | --- | --- |
| Backend `my-andijan-api` | **`ae43648`** | backend PR #26 — `.env.example` variable names (docs; after #11, 16E.1, `de9c55f`) |
| Frontend `myandijan-frontend` | **`09900ad`** | frontend PR #25 — SIG Gate 2 preflight memory (after #27, 16D UX, `33a26ee`; #7, 16E.1, `fa2a998`) |

CI `test-and-build` passed on both `main` heads.

**Production** (evidence: GitHub Deployments API, read-only, 2026-10-08; no live probe made)

| | Deployment on record | Consequence |
| --- | --- | --- |
| **API — Railway** | `2ea83b6`, `success` 2026-10-04 (deployment `6b5f057b-ea08-4252-b5fa-79910859f8d8`, confirmed by the Gate 2 preflight below). **No later deployment.** | Nothing merged to the API since is live — backend PRs #10, #11, #14–#21, #23–#26 |
| **Frontend — Vercel** | `09900ad`: Production deployment `success` 2026-10-08 10:18 UTC. Live bundle not probed (MEMORY_CONTRACT §5) | Vercel deploys every `main` merge, so #7 and #27 are in production. Against the deployed API its review-context fields are absent and the queue shows no context — by design (optional fields) |

**🔴 Production release blocker: Railway.** Plan / account access expired (owner, 2026-10-07). Until restored: no deploys, no Railway or production-variable changes, no migrations, no production database access.

**Phase 16 status:** 16A, 16B CLOSED · 16C backend merged, frontend #6 **held** (below) · **16D PARTIAL** — claimant/owner status UX merged (frontend PR #27, `33a26ee`); the rest needs API work; CUSTOMER `business.create` dropped (D-79) · 16E, 16F, 16G, 16H CODE COMPLETE, not deployed · 16I not started — deploy-day runbook written ([`PHASE_16_DEPLOY_RUNBOOK.md`](PHASE_16_DEPLOY_RUNBOOK.md)).

**Owner decisions 2026-10-08:** **D-79** — keep D-75: creating a listing stays BUSINESS_OWNER-only. **Frontend PR #6 merges immediately after the API deploy, not before** (runbook §4).

**Open PRs**

| PR / branch | Head | State |
| --- | --- | --- |
| frontend #6 — 16C.1 verification note | `89e0e61` (on `fa2a998`) | CI green, mergeable. **Hold** until runbook §4 |
| ~~frontend #27 — 16D status UX~~ | `08296a1` | **Merged** 2026-10-08 (`33a26ee`). Claimant sees a rejected claim's reason, and "under review" instead of the CTA after a reload; owner sees HIDDEN labelled and the reason on REJECTED / SUSPENDED listings; 403 copy points to the claim path. Uses only fields the deployed API already returns |
| frontend #26 — runbook + this memory update | — | Docs only |
| ~~backend #26 — `.env.example`~~ | `d2fa9e3` | **Merged** 2026-10-08 (`ae43648`). Docs only: the seven missing names, empty values |
| backend #1, #2 · frontend #1, #2 | — | Dependabot (Actions `checkout` / `setup-node`), not reviewed; keep out of the release window |

**Release facts for the next API deploy:** exactly one new migration, `20261007090000_phase16h_claim_pending_unique` (17 in total) — unchanged by backend #26 (docs). Steps, checks and rollback: the runbook.

**Unchanged:** Phase 15 CLOSED / PASS 2026-10-05 · production SMS unconfigured (`ESKIZ_*`).

### SIG Gate 2 — security governance (separate from Phase 16)

Gate record (outside the repositories): `D:\My-Andijan\security-governance\SIG\gates\gate-02\` (REPORT §19,
EVIDENCE G2-E-025/026, SESSION_LOG Entry 16). Runbook: `my-andijan-api/db/privileges/RUNBOOK.md`.

**Verified facts — fresh read-only production preflight: PASS** (2026-10-08 05:27–05:29 UTC+05:00, reviewed by the owner):
- **Run:** committed `00` (`9e39c5f0…3edd28`) and `30` (`fa806fc4…2da4`) from API `main@db64496`, through the approved
  `railway ssh` guarded transport; fingerprints MATCH, exit 0.
- **Result:** PostgreSQL **18.6**, P1–P19 **all PASS**, no drift. Row counts normalize: **33 tables, 313 rows**.
  - The 2026-10-06 count was 307. The +6 (`audit_logs` 24→26, `refresh_tokens` 22→26) is normal live-production drift,
    **not an R-E4 baseline**.
  - `_prisma_migrations` 16, clean.
- **W0 API deployment:** **`6b5f057b-ea08-4252-b5fa-79910859f8d8`** on **`2ea83b620c715cf1b5ab719ca5762c2c18fd1d13`**,
  `SUCCESS`, no later deployment.
- **Railway access:** read-only API and `railway ssh` worked. Deploying was not attempted, so whether the plan blocker
  above is resolved is **not verified**.
- **Production mutation: NONE.** No production secrets retrieved or output; no Railway configuration or deployment
  change.

**Current status:**
- Gate 2 is **OPEN — STOPPED BEFORE PRODUCTION MUTATION**. Write pause and R-E4: **NOT STARTED**.
- Ready: write-pause procedure merged (backend PR #25, `db64496`); PostgreSQL 18.6 local; encrypted R-E4 container
  present. **`R:` was not mounted on 2026-10-08:** mount it and re-verify it at the actual window start.
- **Do not deploy API `main` while Gate 2 is open.** It carries the undeployed 16H migration; the window resumes only to
  W0.

**Next authorization gate:** John (owner) authorizes every production step. He confirms the window (E5), then
explicitly authorizes opening R-E4 at W0 (record the deployment above, declare the merge/deploy freeze). W1–W9 are each
authorized separately.

**Next action**

1. **Now, without Railway:** review and merge frontend #26 (runbook + this memory) (owner).
2. **Owner:** restore Railway; the SIG Gate 2 next authorization gate (above). **Do not deploy API `main` while Gate 2 is open** (runbook entry check E0).
3. Then follow [`PHASE_16_DEPLOY_RUNBOOK.md`](PHASE_16_DEPLOY_RUNBOOK.md) §1–§5: entry checks and backup → CI-gated API deploy of `main` → V1–V10 → merge #6 at once → sitemaps PR → record the deployment here.
4. Later: the 16D API items (owner resubmit, single create route); 16I (SMS, the `RegisterDto` fix — scope not recorded, cohort).

---

## Current state — 2026-10-08, before the 16E.1 merges (historical — superseded 2026-10-08)

> Superseded the same day by the section above (backend #11 and frontend #7 merged; D-79; runbook; 16D partial). Its "16D NOT STARTED" and its open-PR table are out of date.

**Repositories** (verified 2026-10-08 from Git and GitHub's PR API)

| | `main` | Merge of |
| --- | --- | --- |
| Backend `my-andijan-api` | **`db64496`** | backend PR #25 — SIG Gate 2 R-E4 write-pause controls |
| Frontend `myandijan-frontend` | **`565f0e5`** | frontend PR #23 — 16G/16H memory closeout (docs) |

**Production** (evidence: GitHub Deployments API, read-only, 2026-10-08; no live probe made)

| | Deployment on record | Consequence |
| --- | --- | --- |
| **API — Railway** | `2ea83b6` (backend PR #13 merge), `success` 2026-10-04. **No deployment of any later commit.** | **Nothing merged to the API after `2ea83b6` is production-live** — backend PRs #10, #14–#21, #23–#25 |
| **Frontend — Vercel** | Vercel is connected to GitHub and creates a Production deployment for every `main` merge (`vercel[bot]`). Record for `565f0e5`: `success` (deployment `6915534436`, 2026-10-07 16:42 UTC). Live bundle not probed, so behaviour is not verified (MEMORY_CONTRACT §5) | **Merging a frontend PR ships it to production** while the API stays at `2ea83b6`. Judge every frontend PR against the *deployed* API, not API `main` |

**🔴 Production release blocker: Railway.** Plan / account access expired (owner, 2026-10-07). Deployment/account blocker, not a code blocker. Until the owner restores it: no deploys, no Railway or production-variable changes, no migrations, no production database access.

**Phase 16 status:** 16A, 16B CLOSED · 16C backend merged (PR #10), frontend #6 open, production closure needs the deploy · **16D NOT STARTED** (below) · 16E, 16F CODE COMPLETE except 16E.1 (open pair) · 16G, 16H CODE COMPLETE, not deployed · 16I not started (pilot; needs production).

**16D — correction.** The 2026-10-07 sections said "16C, 16D production closure pending". For 16D that was wrong: no PR implements it. Scope (Phase 16 plan, 2026-10-03): CUSTOMER `business.create`; a single create route; wizard gating, 403 handling and copy; owner status panel with rejection reason, HIDDEN and resubmit; claim-reason UX. Checked on `main` 2026-10-08: `business.create` is BUSINESS_OWNER-only (D-75; API `src/authz/capabilities.ts`); there are two create routes (`POST /businesses`, `POST /me/businesses`); the owner's business list shows no rejection reason and the API has no owner resubmit path; `DashboardHomeView`'s status labels have no HIDDEN entry (a hidden listing gets an empty badge). **Waiting on an owner decision:** granting CUSTOMER `business.create` reverses D-75. 16D does not depend on SMS.

**Merged since the previous state section, not production-live**

| Item | PR | Notes |
| --- | --- | --- |
| SIG Gate 2 R-E4 write-pause controls | backend PR #25 merged 2026-10-07 (`db64496`, head `aab1b52`) | `db/privileges/RUNBOOK.md` + `test/db/runbook-write-pause.db-spec.ts`. No migration, no application code. CI `test-and-build` passed on the merge |
| 16G/16H memory closeout | frontend PR #23 (`565f0e5`) | Docs only |

**Open Phase 16 PRs — rebased onto current `main` 2026-10-08, not merged**

| PR | Rebased head | Conflicts | CI on the rebased head | Merge notes |
| --- | --- | --- | --- | --- |
| frontend #6 — 16C.1 verification note | `6d6b9d8` | `src/lib/__tests__/api.test.ts` — both test suites kept | `test-and-build` passed | Merge order is an owner decision: the *deployed* approve route takes no body, so merged first, approvals keep working but the note is dropped until the API deploys; after the API deploys, approvals answer 400 until #6 ships |
| backend #11 — 16E.1 claim review context | `59122f1` | none | `test-and-build` passed, including both real-PostgreSQL database-test steps | API-only; merging does not deploy |
| frontend #7 — 16E.1 queue context | `2047393` | none | `test-and-build` passed | The new fields are optional: with the deployed API the queue shows no context rather than a false warning |

#6 and #7 edit adjacent rows of `API.md` (`/admin/claims` and `/approve`), so whichever merges second needs a one-line rebase. Other open PRs: backend #1, #2 and frontend #1, #2 (Dependabot, not reviewed).

**Release facts for the next API deploy:** `git diff --name-status 2ea83b6..db64496 -- prisma` = **exactly one new migration, `20261007090000_phase16h_claim_pending_unique`** (17 in total), plus a comment-only `schema.prisma` change — unchanged by PR #25. Migration behaviour: previous section.

**Unchanged:** Phase 15 CLOSED / PASS 2026-10-05 · production SMS unconfigured (`ESKIZ_*`).

### SIG Gate 2 — security governance (separate from Phase 16)

Gate record (outside the repositories): `D:\My-Andijan\security-governance\SIG\gates\gate-02\` (REPORT §19,
EVIDENCE G2-E-025/026, SESSION_LOG Entry 16). Runbook: `my-andijan-api/db/privileges/RUNBOOK.md`.

**Verified facts — fresh read-only production preflight: PASS** (2026-10-08 05:27–05:29 UTC+05:00, reviewed by the owner):
- **Run:** committed `00` (`9e39c5f0…3edd28`) and `30` (`fa806fc4…2da4`) from API `main@db64496`, through the approved
  `railway ssh` guarded transport; fingerprints MATCH, exit 0.
- **Result:** PostgreSQL **18.6**, P1–P19 **all PASS**, no drift. Row counts normalize: **33 tables, 313 rows**.
  - The 2026-10-06 count was 307. The +6 (`audit_logs` 24→26, `refresh_tokens` 22→26) is normal live-production drift,
    **not an R-E4 baseline**.
  - `_prisma_migrations` 16, clean.
- **W0 API deployment:** **`6b5f057b-ea08-4252-b5fa-79910859f8d8`** on **`2ea83b620c715cf1b5ab719ca5762c2c18fd1d13`**,
  `SUCCESS`, no later deployment.
- **Railway access:** read-only API and `railway ssh` worked. Deploying was not attempted, so whether the plan blocker
  above is resolved is **not verified**.
- **Production mutation: NONE.** No production secrets retrieved or output; no Railway configuration or deployment
  change.

**Current status:**
- Gate 2 is **OPEN — STOPPED BEFORE PRODUCTION MUTATION**. Write pause and R-E4: **NOT STARTED**.
- Ready: write-pause procedure merged (backend PR #25, `db64496`); PostgreSQL 18.6 local; encrypted R-E4 container
  present. **`R:` was not mounted on 2026-10-08:** mount it and re-verify it at the actual window start.
- **Do not deploy API `main` while Gate 2 is open.** It carries the undeployed 16H migration; the window resumes only to
  W0.

**Next authorization gate:** John (owner) authorizes every production step. He confirms the window (E5), then
explicitly authorizes opening R-E4 at W0 (record the deployment above, declare the merge/deploy freeze). W1–W9 are each
authorized separately.

**Next action**

1. **Owner:** restore Railway plan / access; SIG Gate 2 next authorization gate (above); decide CUSTOMER `business.create` (unblocks 16D) and the #6 merge order.
2. Then, with the owner's authorization, and **not while SIG Gate 2 is open**: let Railway deploy API `main` through the CI-gated path, and ship #6 as decided.
3. Verify in production: the 16H migration is applied (17 rows in `_prisma_migrations`, no failed row); a duplicate pending claim answers 409; a repeated view is not double-counted; `updatedAt` appears on the business/event lists; the 16E.4 route answers.
4. Then regenerate the sitemaps (`npm run sitemap`) in a frontend PR; merge the 16E.1 pair (#11, then #7); the 16C/16D production closure; then 16I (SMS live, the `RegisterDto` fix — scope not recorded in the repositories, runbook, cohort, docs refresh).

---

## Current state — 2026-10-07, after the 16G/16H merges (historical — superseded 2026-10-08)

> Superseded the next day by the section above. Stale in it: API `main` (now `db64496`, PR #25), "16D production closure pending" (16D was never started) and the frontend production row (Vercel deploys every `main` merge; `565f0e5` has a `success` record). Kept for its 16G/16H evidence and the 16H migration's behaviour.

**Repositories** (verified 2026-10-07 from Git and GitHub's PR API)

| | `main` | Merge of |
| --- | --- | --- |
| Backend `my-andijan-api` | **`523d782`** | backend PR #23 — Phase 16G.1 |
| Frontend `myandijan-frontend` | **`41fb0fa`** | frontend PR #22 — Phase 16G.2 |

**Production** (evidence: GitHub Deployments API, read-only, 2026-10-07; no live probe made)

| | Last deployment on record | Consequence |
| --- | --- | --- |
| **API — Railway** | `2ea83b6` (backend PR #13 merge), `success` 2026-10-04. **No deployment of any later commit.** | **Nothing merged to the API after `2ea83b6` is production-live** — backend PRs #10, #14–#21, #23, #24 |
| **Frontend — Vercel** | **Not verified.** A Vercel Production deployment record exists for `41fb0fa` (`success`, 2026-10-07 15:40 UTC); not treated as proof, and the live bundle was not probed | Do not describe frontend `main` as live. The 16G.2 panel reads `GET /me/analytics/overview`, which the deployed API already serves, but its counts are de-duplicated only once 16G.1 deploys |

**🔴 Production release blocker: Railway.** Plan / account access expired (owner, 2026-10-07). Deployment/account blocker, not a code blocker. Until the owner restores it: no deploys, no Railway or production-variable changes, no migrations, no production database access.

**Phase 16 status:** 16A, 16B CLOSED · 16C, 16D production closure pending (needs the deploy) · 16E, 16F CODE COMPLETE · **16G CODE COMPLETE** · **16H CODE COMPLETE** · 16I not started (pilot; needs production). None of 16G/16H is deployed.

**Merged to `main` since the previous state section, none production-live**

| Item | Backend | Frontend | Notes |
| --- | --- | --- | --- |
| 16H one pending claim per (business, claimant) | PR #24 merged 2026-10-07 (`7a3a7dd`, head `55711e6`) | — | Partial unique index + `FOR SHARE` re-check in `createClaim`; competing claimants still allowed. CI `test-and-build` passed on head and merge, **including "Run database tests" and "Run database tests as runtime_app_public"** (real PostgreSQL 18.6; forced-race suites `test/db/claims-concurrency.db-spec.ts`, `migration-claims-pending-unique.db-spec.ts`) |
| 16G.1 analytics write hygiene | PR #23 merged 2026-10-07 (`523d782`, head `d73993d`) | — | `AnalyticsGate`: per-visitor de-duplication, per-address cap, bounded `visitorCities`/`searchQueries`. CI passed incl. the database suites |
| 16G.2 owner 7-day analytics panel; owner self-views not counted | — | PR #22 merged 2026-10-07 (`41fb0fa`, head `8da7aa3`) | No API change |
| Docs for 16G.1 + 16H | — | PR #21 merged 2026-10-07 (`c03a625`) | — |

Earlier Phase 16 items (16C.1 … 16F.7) are unchanged — see the section below.

**Release facts for the next API deploy:** `git diff 2ea83b6..523d782 -- prisma` = **exactly one new migration, `20261007090000_phase16h_claim_pending_unique`** (17 migrations in total), plus a comment-only `schema.prisma` change. It runs in Railway's pre-deploy `prisma migrate deploy`: locks `business_claims`, closes any duplicate PENDING pairs (keeps the earliest, marks the rest `REJECTED` with a reason, deletes nothing), then creates `business_claims_one_pending_per_claimant`. The deploy ships every API change merged since `2ea83b6` at once.

**Open PRs:** backend #11 (16E.1), #1, #2 (Dependabot) · frontend #6 (16C.1), #7 (16E.1), #1, #2 (Dependabot).

**Unchanged from the previous section:** SIG Gate 2 production execution not recorded in the repositories (owner to confirm) · Phase 15 CLOSED / PASS 2026-10-05 · production SMS unconfigured (`ESKIZ_*`).

**Next action**

1. **Owner:** restore Railway plan / access; confirm SIG Gate 2 production status.
2. Then, with the owner's authorization: let Railway deploy API `main` through the CI-gated path, then **merge frontend #6 (16C.1) immediately** — approving a claim then requires a verification note.
3. Verify in production: the 16H migration is applied (17 rows in `_prisma_migrations`, no failed row); a duplicate pending claim answers 409; a repeated view is not double-counted; `updatedAt` appears on the business/event lists; the 16E.4 route answers.
4. Then regenerate the sitemaps (`npm run sitemap`) in a frontend PR; then the 16C/16D production closure and 16I.
5. Remaining code pair: 16E.1 (backend #11 + frontend #7).

---

## Current state — 2026-10-07, before the 16G/16H merges (historical — superseded 2026-10-07)

> Superseded the same day by the section above (backend PRs #23, #24 and frontend PRs #21, #22 merged). Kept for its Phase 16 table (16C.1 … 16F.7), which is still accurate. Its "no new migrations" release fact is **no longer true** — see above.

**Repositories** (verified 2026-10-07: local clones clean, `main` = `origin/main`)

| | `main` | Merge of |
| --- | --- | --- |
| Backend `my-andijan-api` | **`a74acd8`** | backend PR #21 — Phase 16F.6 |
| Frontend `myandijan-frontend` | **`69cd618`** | frontend PR #19 — Phase 16F.7 |

**Production** (evidence: GitHub Deployments API, read-only, 2026-10-07; no live probe made)

| | Last deployment on record | Consequence |
| --- | --- | --- |
| **API — Railway** | `2ea83b6` (backend PR #13 merge), status `success` 2026-10-04 12:49 UTC. **No deployment of any later commit.** | **Everything merged to the API after `2ea83b6` is NOT production-live**: backend PRs #10, #14–#21 |
| **Frontend — Vercel** | **Not verified.** GitHub lists a Vercel Production deployment record for `69cd618` (`success`, 2026-10-06 06:01 UTC); that is not treated as proof of what is live, and the live bundle was not probed | Do not describe frontend `main` as production-live until verified. Features that need the newer API cannot work fully in production anyway (see below) |

**🔴 Production release blocker: Railway.** The Railway plan / account access has expired (reported by the owner, 2026-10-07). The API cannot be deployed until the owner restores it. This is a **deployment/account blocker, not a code blocker**. While it lasts: no deploys, no Railway changes, no production variable changes, no migrations, no production database access.

**Phase 16 — merged to `main`, not production-live on the API side**

| Item | Backend | Frontend | Notes |
| --- | --- | --- | --- |
| 16C.1 claim integrity | PR #10 merged 2026-10-05 | PR #6 **open** | Backend half only |
| 16E.1 claim review context | PR #11 **open** | PR #7 **open** | — |
| 16E.2 admin event moderation | — | PR #8 merged 2026-10-03 | Uses pre-existing API routes |
| 16E.3 business review drawer · 16E hours-preserve fix | — | PRs #11, #12 merged 2026-10-05 | — |
| 16E.4 `GET /admin/businesses/:id` | PR #17 merged 2026-10-05 | — | Not live |
| 16E.5 admin detail in drawer / edit | — | PR #14 merged 2026-10-05 | Calls 16E.4; until the API deploys it gets 404 and falls back by design (`getAdminBusinessEditDetail`, `src/lib/api.ts`) |
| 16F.1 noindex not-found pages | — | PR #15 | — |
| 16F.2 slug integrity · 16F.3 district+city filter | PRs #19, #20 | — | Not live |
| 16F.4 sitemap fail-closed · 16F.5 events sitemap · 16F.7 real `lastmod` | — | PRs #16, #17, #19 | Generator code only. The committed `public/sitemap-*.xml` were last regenerated 2026-09-29, and `sitemap-events.xml` does not exist yet. Regenerate only after the API (16F.6 `updatedAt`) is live |
| 16F.6 `updatedAt` on lists; counters stop moving it | PR #21 | PR #18 (docs) | Not live |

**Security governance (SIG Gate 2) — repository artifacts only.** Backend PRs #14 (CI on PostgreSQL 18.6), #15 (database privilege boundary: runbook, SQL, CI proof), #16, #18 (runbook amendments) are merged. Executing `db/privileges/` against production requires the owner's explicit authorization. Whether that happened is **not recorded in the repositories** (the gate record lives outside them, per `RUNBOOK.md`).

**Phase 15 — CLOSED / PASS (2026-10-05).** Source: the owner's canonical Notion project record, confirmed in chat 2026-10-07. **Gate A PASS:** unique production ADMIN / SUPER_ADMIN credentials verified. **Gate B PASS:** backend ruleset `24347110` and frontend ruleset `24347040` active, no bypass actors, `current_user_can_bypass = never`. **Gate C PASS:** production commit `2ea83b620c715cf1b5ab719ca5762c2c18fd1d13`, Railway deployment `6b5f057b-ea08-4252-b5fa-79910859f8d8` SUCCESS / healthy, 16 migrations clean, 15E.4e session contract verified, staff SMS reset blocked, `multer` 2.4.0. Phase 16 work merged after this closure.

**Release facts for the next API deploy:** `git diff 2ea83b6..a74acd8 -- prisma` is empty, so **no new migrations** (16 migrations, unchanged). The first deploy after the blocker ships every API change in the Phase 16 table at once.

**Open PRs:** backend #11 (16E.1), #1, #2 (Dependabot) · frontend #6 (16C.1), #7 (16E.1), #1, #2 (Dependabot). Frontend #13 was closed unmerged.

**Standing items (last recorded 2026-10-04, not re-verified):** production SMS unconfigured (`ESKIZ_*`), so OTP sign-in and SMS reset answer 503. Residual risks R1–R14 accepted (SECURITY §16.3).

**Tests:** both repositories run unit tests and build in CI (`test-and-build`) on every PR and on `main`. The backend also runs real-PostgreSQL suites. Counts were not re-measured on 2026-10-07.

**Next action**

1. **Owner:** restore Railway plan / access.
2. **Owner:** confirm SIG Gate 2 production status.
3. Then, with the owner's authorization: let Railway deploy `main` through the normal CI-gated path, then verify in production (the 16E.4 route answers, `updatedAt` appears on the lists, the slug and district+city behaviour).
4. Then: regenerate the sitemaps (`npm run sitemap`) in a frontend PR, and verify the admin drawer against the live 16E.4 route.
5. Remaining Phase 16 pairs: 16C.1 frontend (PR #6), 16E.1 (backend #11 + frontend #7).

---

## Current state — 2026-10-04 (historical — superseded 2026-10-07)

> Superseded by the 2026-10-07 section above. Kept as the record of the Phase 15 closeout. **Phase 15 was subsequently CLOSED / PASS on 2026-10-05** (gates A, B, C — top section); the "not yet closed" / "open gates" / "frozen" statements below are historical. Everything from §0 down is the **2026-09-28 snapshot** with inline updates. Commit and deployment ids elsewhere in these docs are **historical** — they record what was verified at that time, not what runs now.

**Production**

| | Current |
| --- | --- |
| Backend `main` | `2ea83b620c715cf1b5ab719ca5762c2c18fd1d13` — merge of PR #13 (Phase 15 closeout security fixes) |
| Backend production | Railway deployment `6b5f057b-ea08-4252-b5fa-79910859f8d8` — SUCCESS, 1/1 replicas; deployed only after CI `test-and-build` passed; `prisma migrate deploy` runs pre-deploy (16 migrations, none pending) |
| Frontend `main` | `f80ee8d` — merge of PR #9 (head `a534f41155f6dde42e9ce348533d95c74a83a8cb`, SECURITY.md §16; documentation only) on top of `7de35c6` |
| Frontend production | Vercel, promoted only after the `test-and-build` commit status passes (SECURITY §16.1) |

**Phase 15 (security) — NOT YET officially closed**

| Part | Status |
| --- | --- |
| 15B authorization stabilization · 15D capability authorization · 15D.2 staff hold no owner capability · 15E.2 authentication-code security · 15E.3 / 15E.7.1 deployment gating | Done (D-74 … D-77; SECURITY §2, §3, §15) |
| 15E.4 refresh-token hardening — 4a client refresh + cross-tab coordination, 4b AuthSession per sign-in, 4c reuse detection, 4d access-token `sid` binding, 4e.0 Railway pre-deploy migrations, 4e.1 session contract, 4e.2 legacy cleanup | **CLOSED / PASS** — 15E.4e.2 production verification PASS on 2026-10-04 (`session_id` NOT NULL, 0 sessionless tokens, legacy columns and `LEGACY_MIGRATION` removed, E5–E14 = 0) |
| Phase 15 final security audit (2026-10-04) | Two HIGH findings **remediated in production** via PR #13: staff SMS password recovery blocked for SUPPORT / MODERATOR / ADMIN / SUPER_ADMIN; `multer` 2.4.0. Production verification PASS. Residual risks R1–R14 accepted and assigned (SECURITY §16.3) |
| **Remaining Phase 15 gates** | **A.** unique ADMIN / SUPER_ADMIN credentials (owner) · **B.** confirm the `main` ruleset bypass lists are empty in both repositories (owner, UI only) · **C.** final short Phase 15 closure audit — **all three open** |

**Phase 16:** frontend 16E.2 (admin event moderation, frontend PR #8) is already on frontend `main` (`7de35c6`). The security-gated pairs — backend PR #10 + frontend PR #6 (16C.1), then backend PR #11 + frontend PR #7 (16E.1) — **remain frozen** until Phase 15 is closed, and are released in that order.

**Tests:** backend 1010 unit tests (41 suites) plus real-PostgreSQL suites (`npm run test:db`), both run by CI on every pull request and on `main`; frontend Vitest (23 test files). Both repositories gate merges on `test-and-build`.

---

> Snapshot taken **2026-09-28** (historical — see the current-state section above). Verified against: both repositories at their then-current `HEAD`, git history, read-only probes of the live API (`myandijan-api-production.up.railway.app`) and the live site (`myandijan.uz`), and the recovered Claude Code session transcript.

---

## 0. One-paragraph summary

The **backend is essentially complete and deployed** — 118 routes, 17 feature modules, 31 database models, 11 migrations applied, live and responding. The **frontend is also largely complete locally** (168 source files, 132 components, all three languages at full key parity, build passing) **but production is running an older bundle** that lacks the signup, claim, pricing and premium features. The single blocker is a local Windows PowerShell execution-policy problem that prevents the developer from authenticating the Vercel CLI. Beyond that, the two largest real gaps are: **no tests at all**, and **a substantial amount of built backend capability that no frontend code calls** (search, analytics ingestion, command centre, health score, most admin actions).

> **Update 2026-10-04:** "no tests at all" no longer holds (see the current-state section); the frontend now refreshes tokens (15E.4a) and calls the analytics ingestion endpoints (`recordAnalytics` in `src/lib/api.ts`). Route, module and migration counts above are 2026-09-28 values (now 127 routes, 16 migrations).

---

## 1. What works

### 1.1 Backend — verified live

Probed read-only on 2026-09-28; all returned `200`:

| Endpoint | Result |
| --- | --- |
| `GET /categories` | 200, real localized categories (`oziq-ovqat` / `Еда и напитки` / `Food & …`) |
| `GET /geography/regions` | 200, Andijan region with districts |
| `GET /businesses` | 200, `meta: {page:1, limit:20, total:4, totalPages:1}` |
| `GET /businesses/featured` | 200, `[]` (empty) |
| `GET /events` | 200, `total: 0` |
| `GET /search?q=osh` | 200 |
| `GET /docs` | 200 — **Swagger UI is publicly exposed in production** (see `SECURITY.md`) |
| `GET /users/me` | 401 without a token — auth guard working |

Established in the prior session's production verification (recovered, not re-run here):
- `POST /auth/otp/request` → `{"success":true,"message":"Kod yuborildi"}`
- Phone-format validation → `400`
- Wrong OTP → `400 Kod noto'g'ri yoki muddati tugagan`
- `PUT /auth/profile` without token → `401`
- OTP rate limit → `200`, `200`, **`429`** (3 per 10 min per phone enforced)
- Deploy achieved zero downtime (`/categories` stayed 200 throughout)

### 1.2 Backend modules that are complete and coherent

- **Auth** — register, login, refresh (rotating), logout, OTP request/verify, profile update (multipart), forgot-password / verify-reset-code / reset-password. bcrypt cost 12. OTP: 6 digits via `crypto.randomInt`, 5-minute TTL, single-use, max 5 attempts, 3 SMS per phone per 10 minutes.
- **RBAC** — `JwtAuthGuard` + `RolesGuard` with a six-level hierarchy floor check.
- **Businesses / Branches / Hours** — full CRUD, status workflow (`DRAFT → PENDING → APPROVED/REJECTED/SUSPENDED/HIDDEN`), denormalized rating/review/branch/view/favourite counters.
- **Search** — genuinely sophisticated: `pg_trgm` + tsvector, four custom Postgres functions including `search_normalize` for Uzbek transliteration folding, unified business+product ranking via a shared CTE, and a `normalizedQuery` field exposed for debuggability.
- **Reviews / replies / reports** — one review per user per branch, one reply per review, one report per user per review.
- **Favourites, Events + RSVP, Products ("menu"), Geography, Categories (tree)**.
- **Admin** — 31 routes covering approve/reject/verify/suspend/promote/hide, claims, reports, review moderation, events, category CRUD + reorder, district/city edit, user suspend/activate, audit log.
- **Command centre** — 9 founder-level analytics endpoints plus a daily aggregation job endpoint.
- **Analytics** — public ingestion (`view`/`click`/`search`), six owner-facing report endpoints, two admin ones.
- **Health score** — four sub-scores plus a weighted overall, recomputed on write, with idempotent localized recommendations keyed by a stable rule `code`.
- **Upload** — Supabase Storage, 5 MB cap, MIME allow-list, filename sanitisation.
- **Swagger** — auto-generated at `/docs` with bearer auth declared.

### 1.3 Frontend — working locally and in production

- Home page (hero, categories, districts, featured, stats strip, useful services, CTA banner)
- Search: list + Leaflet map, filters, pagination
- **Restaurant/category-aware search — live in production.** Confirmed: the deployed `SearchPage` chunk contains `milliy`, `fast-food`, `yapon`, `oziq-ovqat`.
- Business detail: hero image, info header, description, hours/open-now badge, menu, reviews, similar businesses, branches, action buttons, social links
- Events listing, Favourites, Profile
- Auth modal (login + forgot-password flow), route-level code splitting, `ErrorBoundary` with chunk-load-error detection and reload offer
- **i18n at full parity — 385 keys in each of `uz`, `ru`, `en`.** No missing keys in any language.
- **SEO head layer** — `MetaTags` (title, description, canonical, hreflang ×3 + `x-default`, OG, Twitter) and `JsonLd` (`LocalBusiness`, `WebSite`+`SearchAction`, `BreadcrumbList`), both well-implemented
- Accessibility: `MotionConfig reducedMotion="user"` app-wide, so every Framer Motion animation honours `prefers-reduced-motion` without per-component opt-in
- Session handling: any `401` on a request that carried a token clears storage once and fires `SESSION_EXPIRED_EVENT`, which `AuthContext` listens for

### 1.4 Frontend — working locally, NOT in production

- **Phone-first OTP signup** (`/uz/signup`) — 3 screens, 6-box OTP input with paste/arrow-key/backspace handling and `autoComplete="one-time-code"` for WebOTP
- **Business claim flow** (`/uz/claim`) — 8 single-field screens, 40/60 split with live preview
- **Pricing page** (`/uz/pricing`) — three tiers, monthly/yearly toggle, UZ payment methods
- **Premium UI** — badges, featured listing card, upgrade modal, traffic chart, sparkline, photo gallery manager, Editor's Pick carousel, `PremiumView` in the owner dashboard
- **Owner dashboard** wired to real `/me/*` endpoints for businesses, stats, reviews (with reply), events
- **Admin dashboard** wired to real endpoints for stats, businesses (list/approve/reject/edit/branch), users, events, categories (list/create/update), audit log, analytics

---

## 2. What partially works

| Thing | What works | What does not |
| --- | --- | --- |
| **OTP signup end-to-end** | Code generated, stored hashed, rate-limited, verified; account created; JWT issued | **No SMS is delivered** — `ESKIZ_*` unset on Railway. *Update (15E.2):* the request now fails closed with **503** instead of logging the code and reporting success. |
| **Admin dashboard** | 8 of 10 views read real data | `AdminReviewsView` is mock (no `GET` review-list endpoint exists); `AdminSettingsView` is a local-state-only form that persists nothing |
| **Owner dashboard** | Businesses, stats, reviews, events are real; ✅ **`InventoryView` real since Phase 10 (2026-10-01)** — product/service catalog CRUD + publish/hide via `GET /me/businesses/:id/menu`, `POST/PATCH/DELETE`; see `ARCHITECTURE.md` §27 | `AdsView` is an honest "coming soon" empty state; `SettingsView` hours form is local-state only and does not save |
| **Password reset** | All three backend endpoints exist and are wired in `api.ts` | ~~The reset code is **logged, not sent**~~ — ✅ **fixed 15E.2**: codes are never logged; without SMS the request answers 503. ✅ **Phase 15 closeout (PR #13):** SMS password reset is refused for SUPPORT / MODERATOR / ADMIN / SUPER_ADMIN — staff recovery is owner-controlled, out of band |
| **Sitemaps** | `sitemap-pages.xml` (9), `sitemap-categories.xml` (24), `sitemap-locations.xml` (42 as of Phase 7 — city URLs removed since no `/:lang/city/:slug` route exists; see `DECISIONS.md` D-56) all populated, and category/location URLs now resolve to real Phase 7 landing pages instead of the generic search page | **`sitemap-businesses.xml` contains zero URLs** — the highest-SEO-value file is empty |
| **Business claim** | 8-screen flow complete, submits to `POST /businesses` | Screen 3 is specced as "address (optional)" but `CreateBusinessDto` hard-requires `address` (min 5) and `districtId`, so it had to be made required — a known spec/implementation divergence |
| **Deployment pipeline** | ✅ Both repos deploy automatically from `main` (verified 2026-10-01): Vercel on push; Railway on push **after CI passes** (Wait for CI). Backend live on `ded7b7a` (deployment `6b81b152`, auto-triggered) *(historical — current: see the current-state section)* | ~~Vercel does not wait for CI~~ — ✅ gated since 15E.3 / 15E.7.1 (see the next row); no staging environment |
| **Deployment gating** | ✅ **Phase 15E.3 / 15E.7.1 (2026-10-02)** — CI hardened in both repos (`permissions: contents: read`, actions pinned to SHAs, `persist-credentials: false`, Dependabot for actions). **Backend gated** — Railway waits for CI (verified on `c048ff9`). **`main` ruleset "Protect main" active in both repos** (no deletion, no force push, PR + `test-and-build` up to date). **Frontend:** Vercel Production Deployment Check `Vercel - myandijan-frontend: test-and-build` configured by the owner. See SECURITY §15, D-77 | ✅ Frontend gate observed working (SECURITY §16.1: on `7de35c6` Vercel reported success one second after the `test-and-build` status). ⚠️ Ruleset bypass lists not readable via API — **open Phase 15 gate B** (owner confirms empty in the UI) |
| **Authentication-code security** | ✅ **Phase 15E.2 (2026-10-02)** — codes never logged/returned/thrown; `crypto.randomInt`; one live code per phone + purpose; 5 wrong guesses per phone + purpose per hour across all code rows; atomic single use; no OTP sign-in for SUPPORT/MODERATOR/ADMIN/SUPER_ADMIN (and, since the Phase 15 closeout — PR #13 — no SMS password reset for them either); timing equalized; SMS delivery fails closed (503). Backend `0b63889`, Railway `e8379f7b`. See SECURITY §2, D-76 | ⚠️ **Production SMS not configured** (`ESKIZ_EMAIL`/`ESKIZ_PASSWORD` absent): OTP sign-in and password reset answer 503 until the owner sets them |
| **Staff hold no owner capability** | ✅ **Phase 15D.2 (2026-10-02)** — ADMIN and SUPER_ADMIN lost `business.claim` / `business.create` / `business.manage_own`; they are refused at the route on the 29 owner routes, `POST /businesses`, `POST /me/businesses` and `/me/claims`, and the owner dashboard disappears for them (capability-driven UI). Staff keep administering listings via `/admin` (`business.edit_any` etc.). Pre-check: 0 ADMIN- / 0 SUPER_ADMIN-owned businesses in production. See D-75 point 7, `ARCHITECTURE.md` §32.1 | Business Staff (membership) and PLATFORM_OWNER governance are future phases |
| **Capability authorization** | ✅ **Phase 15D (2026-10-02)** — every route declares `@Public` / `@Authenticated` / `@RequireCapability` under a global deny-by-default guard; 20 capabilities in one explicit role table (no inheritance); ownership and conflict-of-interest policies; rank model deleted; route-inventory test + committed snapshot in CI; frontend renders from server-issued capabilities. See `ARCHITECTURE.md` §32, D-75 | PLATFORM_OWNER governance not implemented. *Update 2026-10-04:* reset-code logging (15E.2), the Vercel CI gate (15E.3 / 15E.7.1) and refresh-token reuse detection (15E.4c) are done; distributed rate limits and the remaining rate-limit coverage are accepted residual risk (SECURITY §16.3 R1, R2) |
| **Authorization stabilization** | ✅ **Phase 15B (2026-10-01)** — business profile, hours, catalog and review replies are owner-only (MODERATOR/SUPPORT lost their rank bypass); staff edit other businesses only via audited `/admin` routes with a reason; account suspension follows an explicit table (no self, no SUPER_ADMIN target, SUPER_ADMIN may emergency-freeze an ADMIN); password reset and suspension revoke all sessions; `/auth/*` rate limited; CORS allowlist; audit rows record role/request id/IP/user agent. See `ARCHITECTURE.md` §31, D-74 | PLATFORM_OWNER governance, role management and step-up re-auth are later phases (the capability map shipped in 15D). ~~Vercel still deploys without waiting for CI; the password-reset code is still logged to stdout~~ — both ✅ resolved (15E.3 / 15E.7.1, 15E.2) |
| **Moderator access & business restoration** | ✅ **Phase 14 (2026-10-01)** — MODERATOR can use the admin panel for business approval and review/report moderation, with owner contact and reporter names withheld; SUPER_ADMIN can hide and restore listings, restoring the exact pre-hide status (new `statusBeforeHide` column) or PENDING. See `ARCHITECTURE.md` §30, D-72/D-73 | Businesses hidden before Phase 14 restore to PENDING (no recorded status); moderators have no stats/home view |
| **Review reporting & moderation** | ✅ **Phase 12 (2026-10-01)** — customers report reviews (`POST /reviews/:id/report`); ADMIN+ works the queue in `AdminReportsView` (hide review / dismiss). See `ARCHITECTURE.md` §29 | MODERATOR still can't use the admin panel (D-68); no auto-hide threshold or rate limit beyond one report per user per review |
| **Admin business operations** | ✅ **Phase 11 (2026-10-01)** — `AdminBusinessesView` can verify/unverify, suspend (APPROVED only, with reason)/restore, promote/end promotion; status filter is server-side over all statuses. New `unverify`/`unsuspend`/`unpromote` routes. See `ARCHITECTURE.md` §28 | No unhide and no hide UI (D-63); no `isFeatured` control (D-66); reports UI deferred — nothing creates reports (D-65); MODERATOR cannot open the admin UI though the API lets them approve/reject businesses |
| **Claiming an existing listing** | ✅ **Phase 9 (2026-10-01)** — `POST /me/claims` → admin `AdminClaimsView` approve/reject → `ownerId` set atomically, `CUSTOMER` → `BUSINESS_OWNER`; status on `ProfilePage`. See `ARCHITECTURE.md` §26 | Claimed ≠ verified (D-58); rejection reason not shown to claimant; pending state not remembered on the business page after reload |
| **Analytics** | Full ingestion + reporting API exists | ~~The frontend never calls the ingestion endpoints~~ — ✅ the frontend now calls `POST /analytics/view`, `/click` and `/search` (`recordAnalytics`, `src/lib/api.ts`). The endpoints remain public; since Phase 16G.1 (API PR #23, merged 2026-10-07, not deployed) they are de-duplicated and capped per client/address (SECURITY §16.3 R1). |
| **Search module** | Sophisticated FTS/trigram/transliteration search at `GET /search` | ✅ **Wired in Phase 8** (2026-10-01) — the frontend now calls it for text queries via `type=business`; pure category/district browsing still uses `GET /businesses`. Product-type results still have no UI. See `ARCHITECTURE.md` §25. |
| **Refresh tokens** | Issued, hashed, stored, rotated, revocable; `POST /auth/refresh` exists | ~~The frontend never stores or uses the refresh token~~ — ✅ **resolved, Phase 15E.4**: the client refreshes with cross-tab coordination (15E.4a); every sign-in is an `auth_sessions` row with race-safe rotation (4b), reuse detection (4c), `sid`-bound access tokens (4d) and a NOT NULL session contract (4e). |
| **Health score** | Complete scoring engine, recommendation catalogue, three endpoints | No frontend calls any of them |
| **Command centre** | 10 founder-analytics endpoints | No frontend calls any of them |

---

## 3. What does not work

1. ~~The frontend cannot be deployed.~~ **RESOLVED 2026-09-28** — production serves current `main`. (Historical cause: PowerShell's execution policy blocked the `npx.ps1` shim, so `vercel login` never ran; the fix is `npx.cmd`.)
2. **SMS delivery.** Unconfigured. OTP and password reset are both non-functional for real users.
3. **Payments.** No provider integrated. Every price, tier and payment-method chip in the UI is presentational.
4. **`AdminSettingsView` and dashboard `SettingsView`** accept input and show a saved state but write nothing anywhere.
5. ~~**Products/inventory in the owner dashboard** shows mock rows labelled "Demo" while a working menu API sits unused.~~ **RESOLVED Phase 10 (2026-10-01)** — `InventoryView` runs on the real catalog API; mock data deleted; "Inventory" = catalog, no SKU/stock (D-61).
6. **Social-link previews.** Because the app is SPA-only, Facebook/Telegram/X/WhatsApp scrapers see only the static `index.html` — every shared link previews with the generic site title and no per-page OG image.
7. **`GET /admin/reviews`** does not exist (only `POST /admin/reviews/:id/hide` and `/restore`), so there is no way to list reviews for moderation.
8. **No `/health` endpoint** on the API. It never existed; deploy checklists that expect one will 404.

---

## 4. What is unfinished

- ~~**Tests — nothing at all.**~~ ✅ **Resolved** — backend Jest (1010 unit tests, 41 suites) plus real-PostgreSQL suites; frontend Vitest (23 test files); both run in CI on every pull request and gate merges (see the current-state section).
- **Advertising module** — `Advertisement` table and `AdStatus`/`AdPlacement` enums exist; no controller, service, or module. Explicitly deferred to Phase 2 with Click payments.
- **Notifications** — `Notification` table and `NotificationType` enum exist; **no notifications module, no endpoints, nothing writes to the table**.
- **`PlatformSetting`** — table exists; no module reads or writes it. This is what `AdminSettingsView` should be persisting to.
- **`EventAttendee`** — RSVP endpoint exists (`POST /events/:slug/attend`) but no frontend UI calls it.
- **Static generation / prerendering** — deferred, with a complete five-step plan in `docs/SSG.md`.
- **Phase-2 `BusinessType` capabilities** — `inventoryEnabled`, `warehouseEnabled`, `bookingEnabled`, `deliveryEnabled`, `orderingEnabled` flags exist; no modules behind them.
- **Social login** — Telegram and Google buttons are specified in the signup design and appear above the phone field; **no OAuth backend exists**.
- **`sitemap-businesses.xml` generation** — the script exists (`scripts/generate-sitemap.ts`) but the committed output is empty.

---

## 5. Known bugs

Ordered by impact. All are verified in code, not speculative.

| # | Severity | Bug | Evidence |
| --- | --- | --- | --- |
| 1 | ~~**High**~~ | ~~**Sessions die after ~15 minutes.**~~ ✅ **Fixed, Phase 15E.4a** — the client refreshes, coordinated across tabs (`src/lib/auth/refreshCoordinator.ts`). | `src/contexts/AuthContext.tsx`, `src/lib/api.ts` |
| 2 | **High** | **OTP/reset codes are never delivered** — still true while `ESKIZ_*` is unset, but ✅ **no longer invisible (15E.2)**: both routes answer 503 and no code is logged. | `src/sms/sms.service.ts`, `auth.service.ts` |
| 3 | ~~**High**~~ | ~~**Analytics tables are never written from the web app**~~ ✅ **Fixed** — the frontend calls `POST /analytics/view`, `/click`, `/search`. | `recordAnalytics` in `src/lib/api.ts` |
| 4 | Medium | **Empty `sitemap-businesses.xml`** submitted via `sitemap.xml` index — crawlers are pointed at an empty file. | `public/sitemap-businesses.xml`: 0 `<url>` entries |
| 5 | Medium | **Stale sitemap `lastmod` dates** — all four sub-sitemaps say `2026-08-13`. | `public/sitemap.xml` |
| 6 | Medium | **Two settings forms silently discard input.** | `AdminSettingsView.tsx`, `pages/dashboard/views/SettingsView.tsx` |
| 7 | ~~Medium~~ | ~~**Inventory shows mock data while a real API exists.**~~ ✅ **Fixed Phase 10** — also fixed: public `GET /businesses/:id/menu` served catalogs of non-APPROVED businesses (now 404, D-62); `MenuSection` showed "no menu" when the request had actually failed (now an error state with retry). | `mockData.ts` deleted; `products.service.ts` |
| 8 | Low | **Hardcoded weather placeholder on the home hero.** | `src/pages/home/HeroSection.tsx:30` — `// TODO: Replace with real weather API` |
| 9 | ~~Low~~ | ✅ **Resolved, Phase 15B / 15D (D-74, D-75)** — no hierarchy remains; owner routes are ownership-only. *Original finding:* **`SUPPORT` role outranks `BUSINESS_OWNER`** in the hierarchy (3 > 2), so any `@Roles(BUSINESS_OWNER)` route — e.g. `POST /events`, `POST /reviews/:id/reply` — is also open to `SUPPORT`. May be intended; it is not stated anywhere. **Phase 10 note:** catalog writes are still safe — `SUPPORT` clears the role floor but `ProductsService.assertCanManage` requires owner or ≥ `MODERATOR` (pinned by `catalog.authorization.spec.ts`). Hierarchy left unchanged (app-wide impact). | `role-hierarchy.ts`, `roles.guard.ts` |

### Stale comments that will actively mislead the next reader

These are documentation bugs, and they matter because the codebase's comments are otherwise unusually trustworthy:

- **`src/lib/api.ts`** says password reset is *"Confirmed absent on the live API (2026-08-13): all three paths 404"*. **All three now exist.**
- **`src/lib/api.ts`** says business creation is *"Confirmed absent… POST /businesses … 404"*. **It exists** (the session later found it had become `401`, i.e. present).
- **`src/lib/api.ts`** says *"genuinely absent → /admin/reviews, /admin/audit-logs, /admin/settings (404)"*. `/admin/audit` exists (the path probed was wrong); review hide/restore exist.
- **`src/contexts/AuthContext.tsx`** says *"the backend has no profile-update endpoint or age/gender columns yet"*. **`PATCH /users/me` exists and `age`/`gender`/`avatarId` were added in migration `20260815150053_add_profile_fields`.**
- ~~**`src/pages/dashboard/mockData.ts`** says *"Products/inventory have no backend at all"*.~~ File deleted in Phase 10.
- **`docs/SSG.md`** says *"the API returns zero businesses"*. It now returns 4.

---

## 6. Technical debt

| Area | Debt |
| --- | --- |
| **Testing** | ~~Total absence.~~ ✅ **Resolved** — see §4 and the current-state section. Remaining gap: no backend linter/static analysis in CI (SECURITY §16.3 R13). |
| **Hardcoded credential** | ✅ **RESOLVED 2026-09-28.** `scripts/seed-role-accounts.js` now reads `process.env.SEED_ROLE_PASSWORD` with no default; the literal was purged from history before the first push; the production credential was rotated to a 192-bit random value and verified on all six accounts. |
| **CORS wide open** | ✅ **Resolved, Phase 15B** — explicit origin allowlist (`src/common/cors.ts`). |
| **No rate limiting** | ✅ **Partly resolved, Phase 15B** — every `/auth/*` credential and code route is throttled per address and per phone. Analytics, search, upload and `POST /businesses` remain unthrottled; storage is in-process (accepted residual risk, SECURITY §16.3 R1, R2). |
| **Swagger public in production** | Still true (`/docs`, `/docs-json`). Accepted as low residual risk because both repositories are public (SECURITY §16.3 R8). |
| **Mock data still shipped** | Three mock modules remain in the bundle: `src/lib/restaurantMock.ts` (deliberate — deterministic display data for fields the API lacks), `src/pages/admin/adminMockData.ts` (deleted Phase 6), `src/pages/dashboard/mockData.ts` (deleted Phase 10). Only `restaurantMock.ts` remains. |
| **Deterministic fake display data** | `restaurantMock.ts` derives cuisine, price bucket, tags and delivery time from `Math.sin(id * k)`. It is stable and honest in intent, but restaurant cards in production show **invented** cuisine/price/delivery information. |
| **Frontend/backend shape mismatch** | `Business`/`Branch` are not localized server-side but the frontend types assume they are, requiring a `normalizeBusiness`/`normalizeBranch` adapter layer. Sustainable, but it is a permanent tax. |
| **Deprecated table** | `SearchQueryLog` superseded by `SearchAnalytics`; retained intentionally, not yet dropped. |
| **`any` at the API boundary** | `normalizeBranch(raw: any)` / `normalizeBusiness(raw: any)` — deliberate, but untyped. |
| **No error tracking** | No Sentry or equivalent in either repo. Frontend errors reach only the user's console. |
| **No structured logging** | API uses Nest's default `Logger` and no log aggregation is configured. *Update (15B):* every request has a server-generated id (`X-Request-Id`), recorded on audit rows and in security log lines. |
| **Two repos, no monorepo tooling** | No shared type package; the API's DTOs and the frontend's `src/types/index.ts` are maintained by hand in parallel. |
| **Single `master` branch, no CI** | ✅ **Resolved** — both repos use `main` with GitHub Actions CI (`test-and-build`) and a "Protect main" ruleset (pull request + passing, up-to-date `test-and-build`; no force push, no deletion). *Original finding:* `master` only, no GitHub Actions, no PR flow. |

---

## 7. Development status as of 2026-09-28 (historical)

> Historical snapshot. For the current branches, commits and deployments see the current-state section at the top.

| | Frontend | API |
| --- | --- | --- |
| Branch | `master` | `master` |
| `HEAD` | `dd08485` — *Add the business claim flow — eight single-field screens with a live preview* (2026-09-27) | `4e3c6bc` — *Add phone OTP auth, plus menu/upload/users modules and role hierarchy* (2026-09-26) |
| Working tree | **clean** | **clean** |
| Commits total | 6 | 4 |
| Build | `npm run build` passes (`tsc -b && vite build`) | `nest build` (last built `dist/` present) |
| Deployed | **Current** — Vercel, project `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH`, team `john-s3` | **Current** — Railway, verified live |

---

## 8. What was implemented most recently (as of 2026-09-28 — historical)

> Since then: Phases 6–14, 15B, 15D, 15D.2, 15E.2–15E.4e.2 and the Phase 15 closeout (PR #13) — see `SESSION_CONTEXT.md` and SECURITY §16. The list below is the 2026-09-28 record.

In order, newest first:

1. **`dd08485` (2026-09-27) — Business claim flow.** Eight single-field screens (`NameStep` … `SummaryStep`), `useClaimFlow` hook, `BusinessPreview` component composing `HeroImage` + `BusinessInfoHeader` from a synthesized `Business` object, 40/60 split layout, home CTA banner repointed from `/search` to `/claim`, plus a `/uz/business/claim → /uz/claim` redirect.
2. **`ea2a5ff` (2026-09-26) — Phone-first OTP signup.** `OtpInput` upgraded in place (kept API-compatible so `ForgotPasswordFlow` still works), `src/lib/phone.ts` helpers, `useSignup` hook, three screens, `AuthModal` register tab repointed to `/signup`, `RegisterForm.tsx` deleted.
3. **`4e3c6bc` (2026-09-26, API) — OTP auth backend.** `requestOtp`/`verifyOtp`/`updateProfile` in `AuthService`, three DTOs, `SmsService` (Eskiz) as a `@Global` module, `PUT /auth/profile` with `FileInterceptor('photo')`, plus the menu/upload/users modules and the role hierarchy.
4. **`1d53f7f` (2026-09-25) — Restaurant search + premium monetization UI + reliability fixes.** `CategorySearchPage`, `RestaurantCard`, cuisine/price/sort controls, the whole `src/components/premium/` set, `PricingPage`, `src/lib/premium.ts`, gold/silver/bronze/navy/brand-green tokens, `ErrorBoundary`, centralised 401 handling, `escapeHtml` before Leaflet `divIcon` HTML.

**The last actual work attempted was the production deploy**, which reached the API successfully and stalled on the frontend.

---

## 9. What should logically happen next

> *(Superseded 2026-10-07 — current next action: top section. Phase 15 closed / PASS 2026-10-05.)* **Next steps as of 2026-10-04:** close Phase 15 — gates **A** (unique ADMIN / SUPER_ADMIN credentials), **B** (confirm ruleset bypass lists are empty) and **C** (final short closure audit) — then release Phase 16 in order: PR #10 + #6 (16C.1), then PR #11 + #7 (16E.1). The ordered list below is the 2026-09-28 plan; items 1, 4, 5, 6, 7 (CORS, throttling on `/auth/*`) and 9 are done, item 3 (Eskiz) is still open, `/docs` remains public by decision (SECURITY §16.3 R8), and items 2, 8 and 10 were not re-verified in this reconciliation.

Ordered. Rationale given because the order is not arbitrary.

1. **Unblock and complete the frontend deploy** — `npx.cmd vercel login` then `npx.cmd vercel --prod`. Everything else is invisible to users until this lands. Do **not** run `vercel link`; the link is correct.
2. **Run the post-deploy verification** that was queued and never executed: signup (phone → "Kod yuborildi"), claim (typeahead → 8 steps → submit), premium UI (Editor's Pick carousel, "Faqat Premium" filter, gold borders), regressions (search, business detail, login, favourites), and mobile at 375px (no horizontal overflow, bottom nav visible, no iOS zoom).
3. **Configure Eskiz on Railway** (`ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`) and register the SMS template in the Eskiz dashboard. Until this is done the signup flow that was just shipped cannot actually be used by anyone.
4. ~~Rotate the seed-script password~~ — **✅ DONE 2026-09-28** — rotated to a 192-bit random secret held in Railway's `SEED_ROLE_PASSWORD`; script parameterized; literal purged from history before the first push.
5. **Fix the refresh-token gap.** Store `refreshToken` at login/OTP-verify and call `POST /auth/refresh` on 401 before giving up. This converts a 15-minute session into a 30-day one and is a small, high-value change.
6. **Wire analytics ingestion.** Call `POST /analytics/view` on business detail and `POST /analytics/click` on call/direction/website/share/favourite. Without it, the entire analytics and health-score investment stays dark.
7. **Lock down the API surface**: restrict CORS to the known origins, gate or disable `/docs` in production, add `@nestjs/throttler` on auth routes.
8. **Populate `sitemap-businesses.xml`** and refresh `lastmod`. Now that the API returns real businesses, the generator has something to emit.
9. **Introduce a test runner and cover the auth + RBAC paths first.** Those are where a silent regression is most expensive.
10. **Decide on prerendering before launch**, per `docs/SSG.md` — the social-scraper gap is a real acquisition cost for a directory that expects link sharing.
