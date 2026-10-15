# KNOWLEDGE_MODEL — kinds of project knowledge and how each is kept

> Created 2026-10-07. It consolidates conventions the documents already use; it adds no new vocabulary except the lifecycle labels in §3. Contract: [`MEMORY_CONTRACT.md`](MEMORY_CONTRACT.md).

---

## 1. Knowledge types

| Type | Question it answers | Canonical home | Changes how | Authority |
| --- | --- | --- | --- | --- |
| **State** | What is true *now*? (refs, phase, deploy state, blockers, next action) | `CURRENT_STATE.md` top section | Replaced each major session; the old block is kept below as historical | Must cite evidence (§4) |
| **Decision** | What did we choose, why, and what did we reject? | `DECISIONS.md` (`D-NN`) | Append-only; reversal = new `D-NN` | Binding once recorded |
| **Constraint** | What must not break? | `ENGINEERING_RULES.md`; 🔒 items in `DECISIONS.md`; rules in `SECURITY.md` | Edited only with a decision | Binding |
| **Domain fact** | How does X work? (routes, schema, env names, SEO, UI) | The domain document (`PROJECT_MEMORY.md` §3) | Edited in place when code changes | Below the code (code wins) |
| **Plan** | What is next / later? | `ROADMAP.md`, `TODO.md` | Edited in place | Advisory |
| **History** | What happened, in order, and what did we learn? | `SESSION_CONTEXT.md`, Git history, PRs | Append-only | Git is authoritative; the log summarises |
| **Design record** | How was a phase designed at the time? | `PHASE_*.md` | Frozen after the phase | Historical |
| **Runbook** | How is a sensitive operation performed? | Next to the code it governs (e.g. `my-andijan-api/db/privileges/RUNBOOK.md`) | Through reviewed PRs | Procedure only — never an authorization |
| **Evidence** | What proves a claim? | CI runs, deployment records, PRs; SIG gate records outside Git | Not copied into memory — referenced | Primary |

---

## 2. Status vocabularies (already in use — keep them)

| Where | Vocabulary |
| --- | --- |
| Features and capabilities (`FEATURES.md`, state tables) | **IMPLEMENTED · PARTIALLY IMPLEMENTED · PLANNED · BROKEN · UNKNOWN** — prefer UNKNOWN to a guess |
| Decisions (`DECISIONS.md`) | 🔒 LOCKED · 🔓 REVISITABLE · ⚠️ NEEDS DECISION · ✅ RESOLVED → `D-NN` |
| Tasks (`TODO.md`) | `[ ]` TODO · `[~]` IN PROGRESS · `[x]` DONE · `[?]` UNKNOWN |
| Provenance (`ROADMAP.md`, `TODO.md`) | [EXPLICIT] · [REQUIRED] · [OBSERVED] / [CODE] · [SESSION] · [REVIEW] |
| Delivery state of a change | **OPEN PR → MERGED (on `main`) → DEPLOYED (deployment record for the SHA) → VERIFIED (live behaviour probed)** — always say which stage was reached |
| Security residual risks | `R1`…`R14` in `SECURITY.md` §16.3 |
| Phases | `Phase N` with sub-phases `NX.n` (e.g. 15E.4e.2, 16F.6) |

---

## 3. Lifecycle of a statement

```text
 current  ──(newer evidence)──▶  superseded YYYY-MM-DD  ──▶  historical
```

- **current**: in a state section, dated, with evidence.
- **superseded**: kept in place with a dated label and a pointer to what replaced it. Strike-through (`~~…~~`) with a ✅/note is the existing convention for single lines.
- **historical**: an entire snapshot or section kept for context (for example `CURRENT_STATE.md` §0–§9, the 2026-09-28 snapshot; `HANDOFF_INDEX.md`).

Never silently edit a historical statement to make it current. Add the current statement where current state lives, and label the old one.

---

## 4. Evidence standard

| Claim | Minimum evidence |
| --- | --- |
| "On `main`" | Merge SHA on `origin/main` |
| "CI passed" | The `test-and-build` result for that SHA |
| "Deployed" | A host deployment record for that SHA with a success status |
| "Live / verified" | The above **plus** a probe of the live behaviour, dated |
| "Decided" | A `D-NN` entry, or the owner's statement recorded with its date |
| "Unknown" | Say so, and say what would resolve it |

Conversational memory and session summaries are not evidence (`MEMORY_CONTRACT.md` §1, rank 6).

---

## 5. Identifiers

- Commits: short SHA (7) in prose, full SHA where a later probe must match exactly.
- PRs: `backend PR #N` / `frontend PR #N`. Both repositories number from #1, so always name the repository.
- Decisions: `D-NN` (next free number in `DECISIONS.md`).
- Dates: ISO `YYYY-MM-DD`; times in UTC.
