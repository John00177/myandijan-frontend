# BRAIN_ARCHITECTURE — the planned "My Andijan Brain"

> **Status: PLANNED — NOT IMPLEMENTED.** Nothing in this document exists. No agent framework, MCP server, orchestration service or memory database has been installed, configured or deployed for it. Created 2026-10-07 to record the intended direction so that today's memory layer stays compatible with it.
>
> Starting any part of it requires the owner's explicit approval and a `DECISIONS.md` entry first (§6).

---

## 1. Intent

A small multi-agent system that helps plan, build, review and operate My Andijan. It reuses the canonical memory defined in [`MEMORY_ARCHITECTURE.md`](MEMORY_ARCHITECTURE.md) instead of inventing a parallel source of truth.

```text
                    MY ANDIJAN BRAIN
                           │
              ┌────────────┴────────────┐
              │                         │
        Orchestrator               Memory Layer
              │                         │
        ┌─────┼─────┐          ┌───────┴────────┐
        │     │     │          │                │
      Planner  QA  Specialists  Canonical       Dynamic
                              Markdown          PostgreSQL
                                  │
                                  MCP
                                  │
                              Tool layer
```

---

## 2. Components (conceptual)

| Component | Role | Candidate technology (undecided) |
| --- | --- | --- |
| **Orchestrator** | Takes a task, routes it to agents, enforces the contract (§4), assembles the report | OpenAI Agents SDK / API, or Claude-compatible agents |
| **Planner** | Breaks work into phases and PRs; reads `CURRENT_STATE.md`, `DECISIONS.md`, `ROADMAP.md` | Same |
| **QA** | Reviews diffs, checks verification evidence and the memory-update protocol | Same |
| **Specialists** | Domain agents (backend/NestJS, frontend/React, database, security, SEO) with domain documents as their context | Same |
| **Canonical Markdown** | Today's `docs/my-andijan/` — **remains rank 2 and authoritative** | Git (exists) |
| **Dynamic PostgreSQL** | Short-lived operational memory: task queue, agent run log, open questions, links to evidence | A separate PostgreSQL database — never the production application database |
| **MCP / tool layer** | Controlled access to GitHub, CI, deployment *read* APIs, local commands | MCP servers with per-tool permissions |

---

## 3. Memory split

| | Canonical Markdown (exists) | Dynamic PostgreSQL (planned) |
| --- | --- | --- |
| Holds | State, decisions, constraints, domain reference, history | In-flight tasks, run logs, transient findings, pointers to evidence |
| Authority | Rank 2 | None of its own. Anything durable is promoted to Markdown through a PR |
| Review | Pull requests | Machine-written, disposable |
| Retention | Permanent | Bounded; prunable |

**No vector database.** Retrieval is by the routing map (`PROJECT_MEMORY.md`), Git, and ordinary SQL — not embeddings. Revisit only with a measured need and a decision.

---

## 4. Non-negotiable constraints carried forward

1. Ranks 1–2 (`MEMORY_CONTRACT.md` §1) stay authoritative. The Brain reads them and proposes changes through PRs. It does not write state anywhere else that wins.
2. No production mutation without the owner's per-action authorization. The tool layer exposes production **read-only** by default.
3. No secrets in prompts, memory, logs or the dynamic database. Credentials stay in the hosts' secret stores.
4. Branch protection and CI apply to agent PRs exactly as to human ones.
5. Every agent output that claims deployment meets the evidence standard (`KNOWLEDGE_MODEL.md` §4).
6. Data-locality: the product database must stay vanilla PostgreSQL and relocatable (DECISIONS 🔒). The Brain's database is separate and must not add extensions or coupling to it.

---

## 5. What today's memory layer already provides for it

- A single canonical home with a routing map → agent context selection.
- A written contract and update protocol → the QA agent's checklist.
- A status vocabulary and evidence standard → machine-checkable reports.
- Small `AGENTS.md` operating rules → a shared policy prompt for every agent.

---

## 6. Before implementation (gate)

- [ ] Owner approves scope, budget and providers.
- [ ] `DECISIONS.md` entry: providers, hosting, data handling, retention.
- [ ] Threat model: prompt injection through repository content, tool permissions, secret exposure.
- [ ] Separate infrastructure for the dynamic database (not Railway production).
- [ ] A pilot limited to read-only planning and review before any write tools.
