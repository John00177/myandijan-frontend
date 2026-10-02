# CHATGPT_CONTEXT — operating brief for ChatGPT as My Andijan's architect / reviewer

> **Why this file exists.** The project is moving from a multi-session Claude Code workflow to one where **ChatGPT acts as project architect and reviewer.** `HANDOFF_INDEX.md` orients an engineer who can read and run the repository. This file is written for a reviewer who **cannot execute anything** — it says what you can rely on, what you must ask for, and where this project will mislead you.
>
> **Provenance note:** no prior specification existed for this document. It was written 2026-09-28 from the stated intent above plus the verified findings in the rest of `docs/my-andijan/`. Treat its *facts* as sourced from those documents and its *working agreement* (§6–§11) as a proposal to accept, amend or discard.

---

## 1. Read these three first, in this order

| Order | Document | Why |
| --- | --- | --- |
| 1 | [`HANDOFF_INDEX.md`](HANDOFF_INDEX.md) | Status, blockers, priorities, and a full audit. ~15 min. |
| 2 | [`DECISIONS.md`](DECISIONS.md) | 52 decisions marked 🔒 LOCKED / 🔓 REVISITABLE / ⚠️ NEEDS DECISION, plus 10 questions never answered. **This is the file that stops you proposing something already rejected for a good reason.** |
| 3 | [`CURRENT_STATE.md`](CURRENT_STATE.md) | What works, what half-works, what is broken, and the technical debt. |

Then, on demand: [`API.md`](API.md) before any endpoint discussion, [`DATABASE.md`](DATABASE.md) before any schema discussion, [`SECURITY.md`](SECURITY.md) before anything ships.

---

## 2. The project in five sentences

**My Andijan (`myandijan.uz`) is a trilingual (uz/ru/en) business directory and city guide for the Andijan region of Uzbekistan** — consumers search businesses on a map, review them and follow events; owners claim and manage listings; staff moderate a catalogue. It spans **two repositories**: a React 19 + Vite SPA on Vercel, and a NestJS 10 + Prisma 5 + PostgreSQL API on Railway. The backend is **essentially complete** (118 routes, 31 models, 11 migrations) and deployed; the frontend is complete locally but **production is running an older build**. There are **zero automated tests** and **zero AI features**. Monetization UI exists (Premium / Featured tiers, Uzbek payment methods) but **no payment provider is integrated**.

---

## 3. The single most useful fact for an architect

**Roughly 80 of 118 API endpoints have no frontend caller.**

Concentrated in five areas:

| Area | Routes built | Frontend usage |
| --- | --- | --- |
| Full-text search (`GET /search`) — `pg_trgm` + tsvector + Uzbek transliteration folding | 1 | **none** |
| Analytics ingestion (`POST /analytics/view\|click\|search`) | 3 | **none** |
| Command centre (founder analytics) | 10 | **none** |
| Business health score + recommendations | 3 | **none** |
| Admin actions (claims, reports, review moderation, verify/suspend/promote, user suspend, taxonomy edits) | 20 of 31 | **none** |

**So the correct default architectural instinct here is inverted from most projects: do not propose new backend capability.** Ask first whether the capability already exists and simply has no UI. Most near-term product value is frontend wiring against working endpoints. `API.md` marks every route ✅ (used) or ⭕ (unused) for exactly this purpose.

---

## 4. Constraints you must treat as fixed

Proposing anything that violates these will waste a cycle. All are verified in code; rationale in `DECISIONS.md`.

1. **Vanilla PostgreSQL only.** The schema header states the database must be *"relocatable to an Uzbek host"* — a data-localization requirement. **No PostGIS** (so no radius/distance search) and **no `pgvector`** (so no embeddings-based search) without first reopening that constraint with the owner. `pg_trgm` is the one accepted extension.
2. **`Business` is the brand; `Branch` holds every piece of location data** — district, city, address, phone, coordinates, opening hours. Reviews attach to `Branch`; favourites to `Business`.
3. **`dayOfWeek` is `0 = Monday … 6 = Sunday`** — not JavaScript's `Date.getDay()`. Opening hours and `schema.org` output both depend on it.
4. **Authorization is a hierarchy floor**, not an exact-match list: `@Roles(X)` means "X or above" across `CUSTOMER 1 → BUSINESS_OWNER 2 → SUPPORT 3 → MODERATOR 4 → ADMIN 5 → SUPER_ADMIN 6`.
5. **i18n is custom, not `react-i18next`.** `uz` is the compiler-enforced source of truth (`TranslationKey = keyof typeof uz`), and **`t()` has no interpolation** — callers use `.replace("{x}", value)`.
6. **Phone-first auth**, `+998XXXXXXXXX`, enforced by regex in six DTOs. There is no email/password signup in the new flow.
7. **No progress bar in the signup or claim flows.** This came from direct research into Yelp's own flows and is deliberate — it reduces drop-off. Suggesting one reverses a researched decision.
8. **`AnimatePresence mode="wait"` is banned for screen transitions.** It caused a silent deadlock where state advanced while the UI froze.
9. **Integer autoincrement primary keys** throughout; `JwtPayload.sub` is a number.
10. **Two repos, no shared type package.** Any contract change touches both, by hand.

---

## 5. Where this project will actively mislead you

Read this section before trusting anything you see.

| Trap | Reality |
| --- | --- |
| ~~The live site does not reflect the code~~ | **No longer true (2026-09-28).** Production serves current `main` on both platforms, verified by byte-identical bundles and a live smoke test. Judge the product from the site *and* the code. |
| **Every URL on the domain returns HTTP 200.** | `vercel.json` rewrites `/(.*)` → `/index.html`, so even non-existent asset paths return 200 with HTML. **Status codes prove nothing here** — content type and bundle contents do. |
| **Code comments about missing endpoints are stale.** | `src/lib/api.ts` asserts that password reset, `POST /businesses`, `/admin/audit-logs` and `/admin/reviews` are 404. Each was true when probed and is now wrong. `AuthContext` claims there is no profile-update endpoint or age/gender columns; both exist. `docs/SSG.md` says the API returns zero businesses; it returns four. **Read controllers, not comments.** |
| **Analytics dashboards look functional.** | The frontend never calls the ingestion endpoints, so every analytics surface reads from empty tables. |
| **OTP signup looks like it works.** | `SmsService` is deliberately non-throwing, and `ESKIZ_*` is unset on Railway — so `POST /auth/otp/request` returns `{"success":true,"message":"Kod yuborildi"}` and **sends nothing.** |
| **Restaurant cuisine, price and delivery times look like data.** | They are derived from `Math.sin(id * k)` in `src/lib/restaurantMock.ts` — deterministic and invented, shipped to production. |
| **Two settings forms look like they save.** | `AdminSettingsView` and the dashboard `SettingsView` accept input, show success, and persist nothing. |
| **`GET /search` looks like the search backend.** | The frontend searches via `GET /businesses?search=`. |
| **There is no `/health` endpoint** and there never was. | Use `GET /categories` as a liveness probe. |
| **There is no global `/api` prefix.** | Routes are `/auth/login`, not `/api/auth/login`. Several earlier specs got this wrong. |
| **Soft deletes are not enforced by the database.** | Application-level only. A query that omits `deletedAt: null` returns deleted rows. |
| **"One pending claim per business" is not enforced.** | The schema says it needs a partial index and is service-layer only today. |

---

## 6. What you can and cannot verify

**You cannot** run commands, read the local filesystem, inspect the production database, see Railway or Vercel dashboards, or read the `.env` files. **Never ask for `.env` contents** — they hold a Supabase `service_role` key and the production database URL. Ask for **variable names**; `ENVIRONMENT.md` lists all of them with purpose and no values.

**You can rely on** the documents in `docs/my-andijan/`, the source in both GitHub repositories, `prisma/schema.prisma` (the single densest source of design intent in the project), and git history.

**When you need something you cannot see**, ask for it precisely rather than assuming. Useful requests:

```bash
git log --oneline -10 && git status --short
```
```bash
npm run build 2>&1 | tail -20
```
```bash
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://myandijan-api-production.up.railway.app/categories
```

---

## 7. How to give this project useful review

The codebase's strongest asset is that **it explains itself.** `prisma/schema.prisma` and several services record *why* a decision was made, including decisions that reversed an earlier draft (*"An earlier draft had this backwards; fixed here"*) and invariants the database cannot enforce (*"enforce in the service layer"*). For all work before 2026-08-24 those comments are the **only** surviving record — the session transcript for that period is gone.

Three things follow:

1. **Check the comment before calling something a mistake.** Many apparent oddities are documented trade-offs — FK-free log tables, denormalized counters, `service_role` for uploads, a non-throwing SMS service.
2. **Hold new code to the same standard.** Comment the *why*. And when you find a stale comment, say so — several already are.
3. **Prefer "this is already decided, see D-NN" over re-deriving.** `DECISIONS.md` numbers them for citation.

### Review priorities, in order
1. **Security** — see §9. The open items are infrastructure posture, not application logic.
2. **The absence of tests.** 118 routes and 132 components, zero tests, no runner. This is the largest structural risk and it compounds with every change.
3. **Wiring existing backend capability into the frontend** (§3).
4. **SEO structure** — the sitemaps advertise 96 URLs that resolve to a generic query-string search page. Real `/category/:slug` and `/district/:slug` landing pages are the biggest organic-growth lever.
5. **Rendering strategy** — the app is SPA-only, so social scrapers see only a bare title. In a Telegram-heavy market that is an acquisition cost. `docs/SSG.md` holds a complete five-step plan; follow it rather than re-deriving one.

---

## 8. Ten questions nobody has answered

Listed at the end of `DECISIONS.md`. **These are the highest-value things an architect can resolve, because each one is currently being decided by accident.**

1. Is Uzbek data **residency** a legal requirement, or only portability? The schema constrains the DB for relocatability, but it runs on Railway with images on Supabase.
2. Which brand palette wins — the shipped blue/cyan (`primary #3B82F6`) or the specified navy/green (`#1A3A5C` / `#2E7D32`)? Both exist as tokens.
3. Should `SUPPORT` outrank `BUSINESS_OWNER`? It does (3 > 2), so support staff can write business content.
4. What is the testing strategy?
5. Monorepo, or a shared type package, or continue maintaining types twice by hand?
6. Branching model and CI — today both repos are a single branch with no pipeline.
7. Who or what calls `POST /admin/analytics/aggregate`? Nothing schedules it.
8. Was analytics ingestion deferred, or forgotten? Nothing in the recovered history explains it.
9. What happens to `Notification` and `PlatformSetting` — two fully-designed, entirely unused tables?
10. Is shipping invented restaurant data (`restaurantMock`) acceptable in production?

---

## 9. Security — the short version

Full analysis in [`SECURITY.md`](SECURITY.md).

**Genuinely clean:** no SQL injection (every raw query uses `Prisma.sql` tagged templates; no `*Unsafe` variants; the single `Prisma.raw()` takes hardcoded literals). XSS defended where it mattered — `escapeHtml()` before Leaflet `divIcon`, `<` escaping in JSON-LD. Privilege escalation via registration blocked by `@IsIn([CUSTOMER, BUSINESS_OWNER])`. bcrypt cost 12 everywhere. OTP codes, reset codes and refresh tokens all hashed at rest. `ActivityLog` stores an `ipHash`, never a raw IP.

**Open, and ranked:**
1. ✅ **RESOLVED 2026-09-28 — hardcoded admin credential.** `scripts/seed-role-accounts.js` had a plaintext password applied to six accounts. It is now read from `process.env.SEED_ROLE_PASSWORD` (no default), the literal was purged from history before the first push, and **the production credential was rotated** to a 192-bit random secret and verified. It had been confirmed live, so this was necessary.
2. `app.enableCors()` with no origin allow-list.
3. Swagger at `/docs` publicly reachable in production, publishing all 118 routes.
4. No rate limiting except a hand-rolled OTP cap — so login is brute-forceable, and bcrypt cost 12 makes each attempt a server CPU cost.
5. `POST /analytics/*` are **unauthenticated writes** — data poisoning and unbounded table growth.
6. No EXIF stripping on uploads, so **GPS coordinates may be published** with review and avatar photos.

**Rules that must hold:** never put a secret behind a `VITE_` name (Vite compiles it into the public bundle); `SUPABASE_SERVICE_KEY` is server-side only and bypasses RLS entirely; never suggest `$queryRawUnsafe`.

---

## 10. Immediate state, so you are not proposing into a stalled pipeline

| | |
| --- | --- |
| **API** | Deployed, verified, current |
| **Frontend code** | Clean tree, build passing |
| **Frontend production** | Current — serves the `main` build (verified 2026-09-28) |
| **Blocker** | None for deployment — both platforms run current `main` as of 2026-09-28. |
| **Then** | Configure `ESKIZ_*` on Railway and register the SMS template. (The seed-script credential rotation is done — completed 2026-09-28.) |

**Production and `main` now agree**, so the live site is a valid reference as of 2026-09-28.

---

## 11. Working agreement — proposed

- **Cite decisions by number** (`D-07`, `D-41`) so the record stays navigable.
- **Say which documents you have read** when giving a verdict, so gaps are visible.
- **Distinguish IMPLEMENTED / PARTIALLY IMPLEMENTED / PLANNED / BROKEN / UNKNOWN**, and prefer **UNKNOWN** over a confident guess. That vocabulary is used consistently across the existing documents.
- **Ask for a command's output rather than assuming its result.**
- **When you change the architecture, update the document that owns it** — the table in `CLAUDE.md` §13 maps each kind of change to the file that must be updated.
- **Never request or reproduce a secret value.** Names only.


## Phase 15 — authorization & governance (2026-10-01 → 10-02)

- **15A** audited the role model; **15C** designed the two-plane target (PLATFORM_OWNER governance vs operational roles) — approved.
- **15B** (D-74): owner-only business content, explicit suspension target table, session revocation on reset/suspension, `/auth/*` rate limits, CORS allowlist, audit request context.
- **15D** (D-75): **capability authorization, deny by default.** Global `AuthzGuard`; every route declares `@Public` / `@Authenticated` / `@RequireCapability`; 20 capabilities in one explicit role table (`src/authz/capabilities.ts`, no inheritance); ownership + conflict-of-interest policies; rank model (`ROLE_HIERARCHY`, `RolesGuard`, `@Roles`) deleted; route-inventory test + committed snapshot fail CI on any undeclared or changed rule; frontend renders from server-issued `capabilities`.
- **15D.2** (D-75 point 7): **platform staff hold no business-owner capability.** ADMIN/SUPER_ADMIN lost `business.claim` / `business.create` / `business.manage_own` (BUSINESS_OWNER = ownership authority; staff = platform capability authority via `/admin`, e.g. `business.edit_any`); pre-checked 0 ADMIN/SUPER_ADMIN-owned businesses in production. Business Staff (membership) and PLATFORM_OWNER governance remain future work.
- **Not implemented (deferred, separate phases):** PLATFORM_OWNER governance (no role, no table, no endpoints, no UI — `@RequireGovernance` refuses everyone); the Security Hardening backlog (reset code logged to stdout + `Math.random`, Vercel CI gate, distributed rate limiting, refresh-token reuse detection, remaining rate-limit coverage).
- **Where to look:** `ARCHITECTURE.md` §31–§32, `DECISIONS.md` D-74/D-75, `SECURITY.md` §3.

**For review:** any new endpoint must carry an authorization decorator — CI rejects it otherwise (`route-authorization.spec.ts`), and changing who may call a route means editing `src/authz/capabilities.ts` and the committed snapshot together. Proposals that reintroduce a role "level" will fail `no-rank-model.spec.ts` by design.
