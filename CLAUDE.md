# CLAUDE.md — myandijan-frontend

Claude Code instructions for this repository. **Read [`AGENTS.md`](AGENTS.md) first** — it holds the universal rules (source of truth, Git, production, secrets, reporting). This file adds only what is Claude- and repo-specific.

**My Andijan** (`myandijan.uz`): trilingual (uz/ru/en) business directory and city guide for the Andijan region. Two repositories: this React 19 + Vite SPA (Vercel) and `my-andijan-api` (NestJS + Prisma + PostgreSQL, Railway).

## Before you start

1. **Verify the repository state** — `git fetch`, `git status -sb`, `git log --oneline -5 origin/main`. GitHub is the implementation truth.
2. **Recover context from memory, selectively** — [`docs/my-andijan/CURRENT_STATE.md`](docs/my-andijan/CURRENT_STATE.md) top section only; then the one domain document the task needs (routing: [`docs/my-andijan/intelligence/PROJECT_MEMORY.md`](docs/my-andijan/intelligence/PROJECT_MEMORY.md)).
3. **Do not reread the whole project history.** Older sections and `SESSION_CONTEXT.md` are for a specific "why", not for orientation. Within a session, don't reread what you already read unless it changed.
4. **Before changing architecture or a locked rule:** [`docs/my-andijan/DECISIONS.md`](docs/my-andijan/DECISIONS.md) and [`docs/my-andijan/ENGINEERING_RULES.md`](docs/my-andijan/ENGINEERING_RULES.md).

## This repository

- **Home path: `D:\My-Andijan-Work` only** — `D:\My-Andijan-Work\myandijan-frontend` and `D:\My-Andijan-Work\my-andijan-api`. Do not work in other clones (Desktop, `D:\My-Andijan`, Temp worktrees); `D:\My-Andijan-SAFE` and the SIG gate record are read-only references.
- **SIG Gate 2 is paused (owner, 2026-10-10, D-80): no `GRANT` to `runtime_app_public`** — not in a migration, a script or manual SQL — until the owner resumes Gate 2 and Phase A has run (`my-andijan-api/db/privileges/RUNBOOK.md` §10).
- **Canonical project memory for BOTH repositories lives here**, in `docs/my-andijan/`. Backend work records its memory update here, in a `docs/` PR.
- Commands: `npm run dev` (port **5180** — never kill whatever holds 5173), `npm run build`, `npm run lint` (Oxlint), `npm test` (Vitest), `npm run sitemap` (needs the API).
- Every network call goes through `src/lib/api.ts`; i18n source of truth is `src/i18n/uz.ts`. The full do-not-break list is in `ENGINEERING_RULES.md` §2–§3.
- Windows: use `npm.cmd` / `npx.cmd`; PowerShell 5.1 has no `&&`.
- Production deploys come from `main` through Vercel's GitHub integration, gated on `test-and-build`. Never run `vercel link`, `vercel login` or a manual deploy.

## Rules that matter most for Claude

- **Preserve branch protection; never bypass CI.** Work on a branch, open a PR, let `test-and-build` decide. Commit/push only when asked.
- **Never claim deployment unless independently verified** — a deployment record for that exact SHA, plus a live probe for behaviour. Merged ≠ deployed. The API currently has a production release blocker (see `CURRENT_STATE.md`).
- **No production mutation, no secrets** — see `AGENTS.md`.
- **Record durable outcomes in canonical memory** after a major session (`docs/my-andijan/intelligence/MEMORY_CONTRACT.md` §4): what changed, phase, decisions, constraints, SHA/PR, deployment evidence, verification, blocked/postponed items, next action. Skip it for trivial work.
- Your conversation and Claude's auto-memory are working memory, not project truth. If it matters next session, commit it to `docs/my-andijan/`.
