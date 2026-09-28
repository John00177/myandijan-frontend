# AI — My Andijan

---

## 1. Headline finding

**My Andijan contains no AI features. None are implemented, and none are planned in any artifact in either repository.**

This was established by exhaustive search, not assumption:

| Check | Result |
| --- | --- |
| `openai`, `anthropic`, `gpt`, `gemini`, `llm`, `embedding`, `chatbot` across both `src` trees | **0 matches** |
| AI/ML SDK in either `package.json` | **None** |
| Vector store, embedding column, or similarity index in the schema | **None** |
| AI-related environment variable (`.env`, `.env.example`) | **None** |
| AI feature discussed in the recovered session transcript (2026-08-24 → 2026-09-27) | **None** |
| AI-related TODO or code comment | **One**, and it refers to a rule engine (see §3) |

The only matches for AI terminology anywhere in the recovered 6.9 MB session transcript come from **Claude Code's own system prompt and installed-plugin descriptions** (Lovable, Vercel AI SDK, Bright Data RAG skills, and similar tool blurbs). **Not one of them is a project discussion.** No AI product feature was ever proposed, specced, designed or built.

> **Do not infer intent from this document's existence.** It was requested as part of a standard handoff template. The honest answer is a blank, and filling that blank with plausible-sounding AI roadmap items would be fabrication.

---

## 2. What AI actually did in this project

AI's role here was **as the development tool, not as a product capability.**

| Aspect | Detail |
| --- | --- |
| Tool | **Claude Code** (Anthropic), run from the Windows desktop app and CLI |
| Sessions | ~7 across 2026-08-10 → 2026-09-27 (commit `ea0e772` refers to *"Sessions A-N"*; `docs/SSG.md` names *"Session J"*) |
| Models used | `sonnet` at the start of the recovered transcript; switched to **`claude-opus-5`** on 2026-09-03 via `/model` |
| What it produced | Effectively the entire codebase: 118 API routes, 31 database models, 11 migrations, 168 frontend source files, 385×3 i18n keys, and the unusually dense explanatory comments throughout |
| Cost | Not tracked in-repo. **UNKNOWN.** |

**This matters for the handoff more than any product-AI question would.** The code's most valuable non-obvious asset is its commenting: the Prisma schema and several services explain *why* a decision was made, including decisions that reversed an earlier draft ("An earlier draft had this backwards; fixed here"), and record unenforced invariants ("enforce in the service layer"). Those comments are the primary surviving record of ~7 sessions of reasoning — see `DECISIONS.md` and `SESSION_CONTEXT.md`. **Treat them as documentation, and keep writing them at that standard.**

A caveat that also matters: **some of those comments are now stale** (they assert endpoints 404 that now exist). AI-written comments captured a true observation at a moment in time and were not revisited. `CURRENT_STATE.md` §5 lists every one found.

---

## 3. The one thing that looks like AI and is not

### Business Health Score & recommendation engine — `src/health-score/`

This is the feature most likely to be mistaken for AI, including by someone skimming the schema. It is **a deterministic rule engine**. There is no model, no inference, no training data, no randomness.

**How it works**

`scoring.ts` is explicitly *"Pure functions: facts in, numbers out. No Prisma, no dates, no I/O — so the whole algorithm can be reasoned about (and unit tested) without a database."*

Four sub-scores, each 0–100 and independently meaningful:

| Sub-score | Weight in `overallScore` |
| --- | --- |
| `profileScore` | **0.30** |
| `engagementScore` | **0.30** |
| `visibilityScore` | **0.20** |
| `responseScore` | **0.20** |

The weighting rationale is recorded in the code and is a genuine product judgement worth preserving:

> *"Profile and engagement carry more weight because they are the two the owner can move on their own; visibility is deliberately lighter since 50 of its 100 points (promoted + featured) are bought rather than earned, and a paid placement should not paper over a bad profile."*

`engagementScore` is itself a weighted blend: `reviews 0.30`, `rating 0.25`, `replyRate 0.25`, `favorites 0.20`. `profileScore` is an additive checklist of eight weighted checks summing to exactly 100.

Two scoring conventions, both documented:
- **Descending `>=` ladders** rather than the spec's ranges — because the spec's ranges ("31-50=80, 50+=100") both overlap at the boundary and leave float gaps (*"what is 3.95, or 4.45?"*). A ladder assigns every value exactly once.
- **"All branches have X" checks require at least one branch** — otherwise a business with zero branches would score full marks vacuously, *"which is exactly backwards."*

**Recommendations.** When a sub-score falls below `RECOMMENDATION_THRESHOLD = 60`, that category "opens" and `recommendation-catalog.ts` supplies pre-authored rows. There are **14 catalogued rules**, each with a stable `code`:

`PROFILE_COVER_PHOTO`, `PROFILE_BRANCH_PHOTOS`, `PROFILE_DESCRIPTION`, `PROFILE_TELEGRAM`, `PROFILE_HOURS`, `PROFILE_LANDMARK`, `ENGAGEMENT_REPLY_TO_REVIEWS`, `ENGAGEMENT_GET_FIRST_REVIEWS`, `ENGAGEMENT_UPDATE_PRICES`, `VISIBILITY_BUY_PROMOTION`, `VISIBILITY_ADD_EVENTS`, `VISIBILITY_GET_VERIFIED`, and two more.

Every row carries **pre-translated** `title`, `description`, `actionText` and `impact` in all three languages, plus a `priority` and an optional `actionUrl` deep link. **Nothing is generated at runtime.**

**Why `code` exists** (it was not in the original spec) — the schema explains it, and it is the crux of the design:

> *"without a stable key, recalculation cannot distinguish 'the same recommendation as last time' from 'a new one', so it would either duplicate rows on every write or reset isCompleted. Titles are display copy and will be edited, so they cannot serve as the key."*

Combined with `@@unique([healthScoreId, code])`, recalculation is an **idempotent upsert**: a gap that closes deletes its row, a gap that persists leaves the existing row untouched — which is what preserves the owner's `isCompleted` flag across recalculations.

**Honesty note recorded in the schema**, and worth keeping honest:

> *"Expected payoff, shown as a nudge ('+40% ko'rishlar')… These are directional estimates chosen by the product, NOT measured lift — there is no experiment framework yet."*

**Implementation status:** the engine, catalogue and three endpoints (`GET /me/health-score`, `POST /me/health-score/recommendations/:id/complete`, `POST /admin/health-scores/recalculate`) are complete and working. **No frontend surface calls any of them.** The entire feature is dark.

**Cost:** zero marginal cost. It is SQL plus arithmetic, recomputed on write — deliberately not a cron job — and read back as one indexed row.

---

## 4. Other deterministic logic sometimes mistaken for AI

| Thing | What it really is |
| --- | --- |
| **Uzbek search normalisation** (`public.search_normalize`) | A PL/pgSQL transliteration-folding function plus `pg_trgm` trigram similarity and tsvector full-text ranking. Sophisticated linguistics, **no ML.** |
| **`SimilarBusinesses`** | Same-category lookup. No embeddings, no collaborative filtering. |
| **`restaurantMock.ts`** | Cuisine, price bucket, tags and delivery time derived from `Math.sin(id * k)`. Deterministic pseudo-random display data for fields the API lacks — **not a model, and not real data either.** |
| **`comparePremiumPriority()`** | A tier-ordering comparator for paid placement. |
| **"Editor's Pick"** | Driven by the `isFeatured` flag, set by an admin. No curation algorithm. |

---

## 5. Where AI would plausibly fit — clearly marked as unrequested

**Nothing in this section was requested, discussed, or planned by the project owner.** It is included because the handoff template asks for "future possibilities already discussed in the project" and the honest answer is *none* — so this is offered instead as the reviewing architect's own observation, and should be treated as a suggestion to accept or discard, not as inherited intent.

Ranked by fit to what already exists:

1. **Semantic / multilingual search.** The strongest fit, because the hard part is already solved: there is a working search service, a transliteration normaliser, and three-language content. Embeddings would handle the cross-lingual case that trigram matching cannot ("beauty salon" → "go'zallik saloni"). **Blocked by a real constraint:** the vanilla-PostgreSQL requirement rules out `pgvector`, so this would need either an external vector service (which conflicts with data-localization) or a relaxation of that constraint. **Discuss the constraint before designing anything.**
2. **Review moderation triage.** `ReviewStatus` defaults to `PUBLISHED`, so moderation is reactive and manual, and there is no review-list endpoint. Classifying incoming reviews for spam/offensive/fake would fit `ReportReason`'s existing categories exactly.
3. **Listing-content assistance for owners.** The claim flow captures minimal data and `Business.description` is optional; generating a first-draft description and the three-language `metaTitle`/`metaDescription` (columns that exist and nothing writes) would improve both listing quality and SEO.
4. **Translation assistance.** 385 keys × 3 languages are maintained by hand, and `uz` is compiler-enforced as the source of truth — so a translation step for new keys has a natural, type-safe insertion point.
5. **Category auto-suggestion** during the claim flow, from business name and description.

### If any of this is ever built, these constraints apply

- **Data localization.** The schema's opening constraint — the database must be relocatable to an Uzbek host — is a **legal/portability requirement, not a preference.** Sending user or business data to a third-party AI provider may conflict with it. **Resolve this question first.**
- **Privacy precedent already set.** `ActivityLog.metadata` stores an `ipHash`, never a raw IP. Any AI feature must meet that standard.
- **No secret may reach the client.** The existing pattern (`SUPABASE_SERVICE_KEY`, server-side only, `JwtAuthGuard` as the trust boundary) is the model to follow. An AI API key belongs in the NestJS backend, never in a `VITE_`-prefixed variable — **anything prefixed `VITE_` is compiled into the public bundle.**
- **Cost control.** There is no rate limiting anywhere except the hand-rolled OTP cap, and `POST /analytics/*` is unauthenticated. An unthrottled AI endpoint would be a direct financial liability. Add `@nestjs/throttler` **before** adding a paid API call.
- **No tests.** Adding non-deterministic behaviour to a codebase with zero automated tests compounds existing risk. Fix the test gap first.
- **Provider selection.** If Claude is chosen, use the current model family (Opus 5 / Sonnet 5 / Haiku 4.5) rather than older IDs.

---

## 6. Bottom line for the next architect

- **There is no AI in this product.** Do not document, demo, or promise any.
- **The health-score "recommendation engine" is rules, not ML.** Describe it accurately — calling it AI would be misleading to stakeholders, and would also undersell how well it is built.
- **AI's real contribution was writing the code**, and its most durable output is the comments. Preserve them, correct the stale ones, and match their standard.
- **If AI features are wanted, they are greenfield.** Start with the data-localization question, not with a model choice.
