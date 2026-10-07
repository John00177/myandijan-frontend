# MEMORY_ARCHITECTURE — how My Andijan's memory is organised

> Created 2026-10-07 (decision **D-78**). Describes the structure and the reasons for it. The rules that apply to it are in [`MEMORY_CONTRACT.md`](MEMORY_CONTRACT.md).

---

## 1. Principle

**The conversation is working memory. The repositories are persistent memory.** An agent recovers context by reading a small, current state document and then only what the task needs. The design goal is *fast, correct context recovery*, not maximum documentation.

Consequences:

- `AGENTS.md` and `CLAUDE.md` stay short and point to memory; they do not contain it.
- `CURRENT_STATE.md` (top section) is the normal recovery entry point.
- Domain documents are read on demand; history is read only for a "why".
- Git history stays the authoritative implementation history. Memory summarises and links to it; it does not replace it.
- No vector database, no embeddings, no RAG corpus. Plain Markdown in Git, reviewed through PRs.

---

## 2. Layers

```text
 rank  layer                               lives in                                  role
 ────  ──────────────────────────────────  ────────────────────────────────────────  ─────────────────────────────
  1    Code + Git history                  GitHub: my-andijan-api, myandijan-frontend implementation truth
  2    Canonical project memory            myandijan-frontend/docs/my-andijan/       durable project truth
  3    Operating rules                     AGENTS.md, CLAUDE.md (root of each repo)  how agents work
  4    Human decision / history records    Notion (owner)                            owner intent, pre-recording
  5    SAFE recovery layer                 D:\My-Andijan-SAFE                        backup / disaster recovery
  6    Conversational / vendor AI memory   Claude, ChatGPT                           convenience only
```

Outside the hierarchy, not memory: **security-governance gate records** (`D:\My-Andijan\security-governance\SIG\…`, referenced by `my-andijan-api/db/privileges/RUNBOOK.md`). They hold evidence for SIG gates, live outside Git by design, and are cited by reference, never copied into the repositories.

### 2.1 Layer 2 internal structure

```text
docs/my-andijan/
├── CURRENT_STATE.md          ← recovery entry point (top section = now)
├── MASTER_CONTEXT.md         ← product context
├── ENGINEERING_RULES.md      ← do-not-break rules, conventions, commands (both repos)
├── DECISIONS.md              ← D-NN decisions, append-only
├── ARCHITECTURE.md  DATABASE.md  API.md  FRONTEND.md  SECURITY.md  SEO.md
├── DESIGN_SYSTEM.md  INTEGRATIONS.md  ENVIRONMENT.md  TECH_STACK.md
├── FEATURES.md  AI.md        ← domain reference, read on demand
├── ROADMAP.md  TODO.md       ← plans
├── SESSION_CONTEXT.md        ← chronological history, append-only
├── HANDOFF_INDEX.md          ← 2026-09-28 handoff + audit (historical) and document directory
├── CHATGPT_CONTEXT.md        ← reviewer brief
├── PHASE_15E4*.md            ← frozen phase design records
└── intelligence/             ← memory control (this folder): map, contract, guide, model, Brain plan
```

---

## 3. The two-repository problem

### 3.1 Facts (inspected 2026-10-07)

- `myandijan-frontend` already holds the full handoff package (`docs/my-andijan/`, 22 documents) covering **both** repositories, plus `docs/SSG.md`.
- `my-andijan-api` holds no project-level documentation: `CLAUDE.md`, `DEPLOYMENT.md`, `PRIVACY_POLICY.md` and one runbook (`db/privileges/RUNBOOK.md`). Its `CLAUDE.md` and `DEPLOYMENT.md` already point to the frontend package.
- Every prior session updated the frontend package for backend work too (e.g. API Phase 16F.6 was documented by frontend PR #18).
- Both repositories have the same branch protection ("Protect main": PR + `test-and-build`).

### 3.2 Options considered

| Option | Verdict |
| --- | --- |
| **A. Keep canonical memory in `myandijan-frontend/docs/my-andijan/`** | **Chosen.** Zero migration, no broken links, matches existing practice and both repos' pointers. Cost: a backend-only change needs a follow-up `docs/` PR in the frontend repo. |
| B. Move memory to `my-andijan-api` | Rejected. Same asymmetry in reverse, plus a disruptive move of 22 documents and every link to them. |
| C. Mirror memory in both repos | Rejected. Two copies of state drift; the contract requires one authoritative home. |
| D. Create a third "project" repository | Not done. Explicitly out of scope without the owner's approval. It would also need its own protection, CI and access set-up. Revisit only if a third codebase appears or the frontend-repo coupling becomes a real cost. |
| E. Git submodule shared by both repos | Rejected. Adds tooling friction (Windows, CI checkout, Vercel/Railway builds) for little gain. |

### 3.3 Resulting rule

- **One home:** `myandijan-frontend/docs/my-andijan/`.
- **Repository-local operating instructions** (`AGENTS.md`, `CLAUDE.md`) exist in both repos. `AGENTS.md` is identical in both (edit both together). `CLAUDE.md` differs per repo, but only in its commands and specifics.
- **Repository-local artifacts that belong to the code** stay with the code: `my-andijan-api/db/privileges/RUNBOOK.md` (executed by its tests), `my-andijan-api/DEPLOYMENT.md` (a short pointer), `prisma/schema.prisma` rationale comments, `myandijan-frontend/docs/SSG.md`.
- **Backend changes** record their memory update in a frontend `docs/` PR (`MEMORY_CONTRACT.md` §4.3).

---

## 4. SAFE (`D:\My-Andijan-SAFE`)

A dated local recovery point created 2026-10-05: full-history Git bundles of both repositories (including PR heads), source snapshots, verbatim copies of the documentation as of frontend `a336787` / backend `2ea83b6`, checksums and a recovery-session record. It excludes `.env` and secrets.

- **Role:** disaster recovery and restoring lost history. **Not** a source of current state.
- **Do not modify it** from a normal session. Refreshing it is a separate owner-requested task.
- Its own README calls it "the authoritative local memory". That wording predates this contract. Under D-78 its rank is 5.

---

## 5. Notion

The owner's human-facing record of decisions and history. Agents do not need Notion to work. When a Notion decision affects code or process, it is recorded in `DECISIONS.md`, and that record is what binds agents. Notion content was not inspected when this document was written.

---

## 6. Vendor AI memory

Claude Code session transcripts and auto-memory, and ChatGPT memory and chats, are convenience caches tied to one tool, one machine or one account. They are never cited as evidence. An agent may keep a *pointer* there (e.g. "canonical memory lives in `myandijan-frontend/docs/my-andijan/`"), but never project state.

---

## 7. Future

The planned multi-agent "My Andijan Brain" builds on this layer without replacing it: Markdown in Git stays canonical. See [`BRAIN_ARCHITECTURE.md`](BRAIN_ARCHITECTURE.md). **Not implemented.**
