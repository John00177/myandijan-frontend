# PROJECT_MEMORY — map of My Andijan's canonical memory

> **What this is.** The index of the project's durable memory: where each kind of knowledge lives and which file to open for a given task. It holds **no project facts of its own**. Facts live in the documents it points to.
>
> Created 2026-10-07. Rules for reading and writing memory: [`MEMORY_CONTRACT.md`](MEMORY_CONTRACT.md).

---

## 1. Start here

| Situation | Read | Then, only if needed |
| --- | --- | --- |
| **Any new session (normal recovery)** | [`../CURRENT_STATE.md`](../CURRENT_STATE.md), **top section only** | The domain document for your task (§3) |
| You are an agent new to this project | [`AGENT_GUIDE.md`](AGENT_GUIDE.md) | [`../MASTER_CONTEXT.md`](../MASTER_CONTEXT.md) §1–§7 |
| You will change architecture or a locked rule | [`../DECISIONS.md`](../DECISIONS.md) | [`../ENGINEERING_RULES.md`](../ENGINEERING_RULES.md) |
| You need *why* something happened | `git log` / the PR | [`../SESSION_CONTEXT.md`](../SESSION_CONTEXT.md) |
| You are ChatGPT acting as reviewer | [`../CHATGPT_CONTEXT.md`](../CHATGPT_CONTEXT.md) §6–§11 (working agreement) | `CURRENT_STATE.md` top section for facts |

**Do not read everything.** `CURRENT_STATE.md`'s top section plus one domain document is the normal budget.

---

## 2. Where the memory lives

There is **one canonical home**: `docs/my-andijan/` in the **`myandijan-frontend`** repository (GitHub `John00177/myandijan-frontend`, branch `main`). It covers both repositories. Why it lives here, and the alternatives considered: [`MEMORY_ARCHITECTURE.md`](MEMORY_ARCHITECTURE.md) §3.

| Repository | Holds |
| --- | --- |
| `myandijan-frontend` | `AGENTS.md`, `CLAUDE.md` (repo-local rules) · **`docs/my-andijan/` (canonical project memory, both repos)** · `docs/SSG.md` |
| `my-andijan-api` | `AGENTS.md`, `CLAUDE.md` (repo-local rules) · `DEPLOYMENT.md` · `db/privileges/RUNBOOK.md` (SIG Gate 2 production runbook) · `prisma/schema.prisma` (schema rationale comments) |

Local clones on the primary machine: `D:\My-Andijan-Work\myandijan-frontend`, `D:\My-Andijan-Work\my-andijan-api`. Older documents name `C:\Users\JKT443\Desktop\…` paths; those are historical.

---

## 3. Task → document routing

| Task touches… | Read | Update after a durable change |
| --- | --- | --- |
| Current phase, deploy state, blockers, next action | `CURRENT_STATE.md` (top) | `CURRENT_STATE.md` (top) |
| Product scope, users, monetization, constraints | `MASTER_CONTEXT.md` | `MASTER_CONTEXT.md` |
| Do-not-break rules, conventions, commands | `ENGINEERING_RULES.md` | `ENGINEERING_RULES.md` |
| Architecture, modules, auth, deployment pipeline | `ARCHITECTURE.md` | `ARCHITECTURE.md` |
| Schema, migrations | `DATABASE.md` + `my-andijan-api/prisma/schema.prisma` | `DATABASE.md` |
| An endpoint | `API.md` | `API.md` (incl. the frontend-usage marker) |
| Pages, components, hooks | `FRONTEND.md` | `FRONTEND.md` |
| Security, residual risks, CI gating | `SECURITY.md` | `SECURITY.md` |
| SEO, sitemaps, metadata | `SEO.md` | `SEO.md` |
| Design tokens, primitives, motion | `DESIGN_SYSTEM.md` | `DESIGN_SYSTEM.md` |
| External services | `INTEGRATIONS.md` | `INTEGRATIONS.md` |
| Environment variables (names only) | `ENVIRONMENT.md` | `ENVIRONMENT.md` |
| Dependencies and versions | `TECH_STACK.md` | `TECH_STACK.md` |
| Whether a feature exists | `FEATURES.md` | `FEATURES.md` |
| AI features (none exist) | `AI.md` | `AI.md` |
| Planning | `ROADMAP.md`, `TODO.md` | `ROADMAP.md`, `TODO.md` |
| An architectural or product decision | `DECISIONS.md` | `DECISIONS.md` (new `D-NN`) |
| Prerendering / SSR | `../SSG.md` | `../SSG.md` |
| Production database privileges (SIG Gate 2) | `my-andijan-api/db/privileges/RUNBOOK.md` | that runbook (API repo) |
| The Phase 16 API deploy (first deploy after Railway returns) | `PHASE_16_DEPLOY_RUNBOOK.md` | that runbook; record the outcome in `CURRENT_STATE.md` |
| Refresh-token / session design history | `PHASE_15E4_REFRESH_TOKEN_ARCHITECTURE.md`, `PHASE_15E4D_ACCESS_TOKEN_SESSION_BINDING_ARCHITECTURE.md` | Historical design records — do not edit; supersede via `DECISIONS.md` |
| Development history | `SESSION_CONTEXT.md` | `SESSION_CONTEXT.md` (append, never rewrite) |

---

## 4. Document classes

Each document belongs to one class. The class decides how it is read and maintained ([`KNOWLEDGE_MODEL.md`](KNOWLEDGE_MODEL.md)).

| Class | Documents |
| --- | --- |
| **State** (what is true now) | `CURRENT_STATE.md` top section |
| **Context** (stable framing) | `MASTER_CONTEXT.md` |
| **Rules** (must hold) | `ENGINEERING_RULES.md`, `DECISIONS.md` (🔒 items), `SECURITY.md` rules, root `AGENTS.md` / `CLAUDE.md` |
| **Domain reference** | `ARCHITECTURE`, `DATABASE`, `API`, `FRONTEND`, `SECURITY`, `SEO`, `DESIGN_SYSTEM`, `INTEGRATIONS`, `ENVIRONMENT`, `TECH_STACK`, `FEATURES`, `AI`, `../SSG.md` |
| **Plan** | `ROADMAP.md`, `TODO.md` |
| **History** (append-only / frozen) | `SESSION_CONTEXT.md`, `HANDOFF_INDEX.md` (2026-09-28 handoff and audit), `PHASE_15E4*.md`, every section marked *historical* or *superseded* |
| **Brief** (audience-specific) | `CHATGPT_CONTEXT.md` |
| **Memory control** | `intelligence/*` (this folder) |

---

## 5. This folder

| File | Purpose |
| --- | --- |
| `PROJECT_MEMORY.md` | This map |
| [`MEMORY_CONTRACT.md`](MEMORY_CONTRACT.md) | Source-of-truth hierarchy, read/update rules, the memory-update protocol |
| [`AGENT_GUIDE.md`](AGENT_GUIDE.md) | How an agent recovers context, verifies state and reports |
| [`MEMORY_ARCHITECTURE.md`](MEMORY_ARCHITECTURE.md) | The memory layers, the two-repository decision, SAFE and Notion |
| [`KNOWLEDGE_MODEL.md`](KNOWLEDGE_MODEL.md) | Knowledge types, status vocabulary, lifecycle, evidence standard |
| [`BRAIN_ARCHITECTURE.md`](BRAIN_ARCHITECTURE.md) | The **planned, not implemented** future AI Brain |
