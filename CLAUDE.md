# CLAUDE.md — My Andijan

Guidance for Claude Code (and any AI agent) working on this project.

> **Full handoff documentation lives in [`docs/my-andijan/`](docs/my-andijan/). Start at [`HANDOFF_INDEX.md`](docs/my-andijan/HANDOFF_INDEX.md).** This file is the working contract; those documents are the reference.

---

## 1. Project purpose

**My Andijan (`myandijan.uz`) is a multilingual business directory and city guide for the Andijan region of Uzbekistan.** Consumers search and browse local businesses on a map, read and write reviews, save favourites and follow events. Business owners claim or create a listing and manage it from an owner dashboard. Staff moderate the catalogue through an admin dashboard.

Three languages — **`uz` (source of truth), `ru`, `en`** — with every route language-prefixed.

---

## 2. This project spans TWO repositories

| Repo | Path | Stack |
| --- | --- | --- |
| **Frontend** (you are here) | `C:\Users\JKT443\Desktop\myandijan-frontend` | React 19 + TypeScript 6 + Vite 8 + Tailwind 3 → Vercel |
| **API** | `C:\Users\JKT443\Desktop\my-andijan-api` | NestJS 10 + Prisma 5 + PostgreSQL → Railway |

**Many tasks require both.** Before concluding an endpoint is missing, read the API's controllers — several comments in `src/lib/api.ts` claim endpoints 404 that now exist.

Production: frontend `https://myandijan.uz`, API `https://myandijan-api-production.up.railway.app`.

---

## 3. Architecture in brief

**Frontend.** SPA, client-rendered. `main.tsx` → `App.tsx` → `HelmetProvider` → `MotionConfig reducedMotion="user"` → `ErrorBoundary` → `BrowserRouter` → `AuthProvider` → routes. All 12 route pages are `lazy()`-loaded. `LangShell` owns the language context and the app's single `AuthModal`. Marketing pages nest in `Layout`; dashboards are **siblings** with their own shells. No state library, no data-fetching library, no form library — Context + hooks + a hand-written `fetch` client.

**API.** NestJS monolith, 17 feature modules, **118 routes**, global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`), Swagger at `/docs`. `JwtAuthGuard` + `RolesGuard` with a six-level hierarchy.

**Database.** PostgreSQL via Prisma. **31 models, 19 enums, 11 migrations.** `Int` autoincrement PKs, `snake_case` tables, soft deletes via `deletedAt`.

Full detail: [`ARCHITECTURE.md`](docs/my-andijan/ARCHITECTURE.md), [`DATABASE.md`](docs/my-andijan/DATABASE.md), [`API.md`](docs/my-andijan/API.md).

---

## 4. Development commands

### Frontend
```bash
npm run dev
```
```bash
npm run build
```
```bash
npm run lint
```
```bash
npm run sitemap
```

`build` = `tsc -b && vite build` — **a type error fails the build.** `lint` is **Oxlint**, not ESLint. `og-image` regenerates the OG card via `sharp`.

### API
```bash
docker compose up -d
```
```bash
npm run start:dev
```
```bash
npx prisma migrate dev
```
```bash
npm run db:seed
```
```bash
npm run prisma:studio
```

> The API's `lint` and `format` scripts reference `eslint` and `prettier`, **neither of which is installed** — both fail on a clean checkout. Do not rely on them.

### Windows shell notes — these have cost real hours
- **Use `npx.cmd` / `npm.cmd`, not `npx` / `npm`,** in PowerShell. The execution policy blocks `*.ps1` wrapper scripts. This was the actual cause of a multi-session deploy blocker.
- **Windows PowerShell 5.1 has no `&&`.** Chain with `;` or run separately.
- **Port 5173 is occupied** by an unrelated `crm-os` server on this machine. **Do not kill it.** This project uses **5180** (`.claude/launch.json`).
- **Heredocs break on Uzbek apostrophes** (`'`, `’`, `ʻ`, `ʼ`). Write a script file to the scratchpad and execute it instead.
- Python's default `cp1252` stdout **crashes** on Uzbek/Russian text — use `io.open(..., encoding="utf-8")`.

---

## 5. Testing commands

**There are none. Zero tests exist in either repo** — no test files, no runner, no `test` script, across 118 routes and 132 components.

Until that changes, verify manually:
```bash
npm run build
```
```bash
npm run lint
```
Then exercise the affected flow in the browser. If you add tests, cover `RolesGuard`, the OTP limits, `OwnerService` ownership scoping, and `normalizeBusiness` first — see [`TODO.md`](docs/my-andijan/TODO.md).

---

## 6. Important directories

### Frontend
| Path | Contents |
| --- | --- |
| `src/lib/api.ts` | **Every network call.** Normalisation layer + centralised 401 handling. Read before touching any data flow. |
| `src/contexts/` | `AuthContext` (session truth, stale-response guard), `LanguageContext` |
| `src/i18n/` | `uz.ts` is the **compiler-enforced source of truth** |
| `src/hooks/` | 14 hooks, each owning its own fetch/loading/error state |
| `src/lib/` | `seo.ts`, `premium.ts`, `phone.ts`, `motion-config.ts`, `localize.ts`, `restaurantMock.ts` |
| `src/components/ui/` | Primitives: `Button`, `Card`, `Badge`, `EmptyState`, `Skeleton`, `Header`, `Footer`, `MobileNav` |
| `src/components/seo/` | `MetaTags`, `JsonLd` |
| `src/pages/` | Route pages grouped by area |
| `docs/my-andijan/` | **The handoff package** (19 docs + `CHATGPT_CONTEXT.md` — the ChatGPT reviewer brief) |
| `docs/SSG.md` | The prerendering plan — read before attempting SSR |

### API
| Path | Contents |
| --- | --- |
| `prisma/schema.prisma` | **The most important file in the project.** 1193 lines, densely commented with decision rationale. |
| `src/common/` | `guards/`, `decorators/`, `constants/role-hierarchy.ts` |
| `src/auth/` | JWT + OTP + reset. `BCRYPT_ROUNDS = 12`. |
| `src/health-score/` | Deterministic scoring engine + 14-rule recommendation catalogue |
| `src/search/` | Raw-SQL FTS with Uzbek transliteration folding |
| `scripts/` | ⚠️ `cleanup-db.ts` is destructive; `seed-role-accounts.js` holds a credential |

---

## 7. Coding conventions

Match the surrounding code. Specifically:

- **TypeScript throughout.** No `any` except the two deliberate `raw: any` normalisers at the API boundary.
- **Named function components**, default-exported per file.
- **Tailwind utility classes only.** No CSS modules, no styled-components. `src/index.css` holds only base setup.
- **Design tokens over raw hex** — `bg-card`, `text-ink-muted`, `rounded-card`. See [`DESIGN_SYSTEM.md`](docs/my-andijan/DESIGN_SYSTEM.md).
- **Motion constants from `src/lib/motion-config.ts`** — never hardcode durations or easings.
- **i18n:** add the key to `src/i18n/uz.ts` **first** (that makes `ru`/`en` a compile error until filled), then translate. **`t()` has no interpolation** — use `.replace("{x}", value)`.
- **API layer:** every call goes through `src/lib/api.ts`. Never `fetch` from a component.
- **Backend:** one module per feature (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`). Validate with `class-validator` DTOs. Guard with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
- **Comment the *why*, not the *what*.** This codebase's dense rationale comments are its most valuable asset — several decisions survive only there. Match that standard.

---

## 8. Critical constraints — do NOT change without discussion

1. **The `Business`/`Branch` split.** `Business` is the brand; **all** location data (district, city, address, phone, lat/lng, hours) lives on `Branch`. Moving it breaks search geo-filtering, reviews, hours, the map and every index.
2. **`dayOfWeek` is `0 = Monday … 6 = Sunday`** — *not* `Date.getDay()`. `JsonLd`'s `SCHEMA_DAYS` and the owner dashboard both depend on it. Getting it wrong publishes incorrect opening hours.
3. **Role checks are a hierarchy FLOOR, not exact match.** `@Roles(X)` means "X or above". Switching to exact-match locks `SUPER_ADMIN` out of most routes.
4. **`uz` is the i18n source of truth.** `TranslationKey = keyof typeof uz` is what makes a missing translation a build error.
5. **`t()` has no interpolation.** Adding it means auditing every call site.
6. **Vanilla PostgreSQL only.** The schema states the DB must be relocatable to an Uzbek host. No PostGIS, no `pgvector`, no proprietary extensions. `pg_trgm` is the one exception (standard contrib).
7. **Never use `AnimatePresence mode="wait"` for screen transitions in a flow.** It caused a silent deadlock in signup — state advanced while the UI froze, because it waited on an exit callback that never fired. Use a keyed `motion.div`.
8. **Keep `normalizeBusiness` / `normalizeBranch` in `src/lib/api.ts`.** Removing them reintroduces blank business names, missing phone/address, and `NaN` ratings.
9. **`Card`'s `interactive` preset must contain no transform**, and its transition must stay scoped to `border-color, box-shadow`. Transforms belong to Framer's spring; stacking them reads as jank.
10. **No progress bar in the signup or claim flows.** Deliberate, from Yelp research — it reduces drop-off.
11. **`BusinessRecommendation.code` is the stable rule key** that makes health-score recalculation idempotent and preserves the owner's `isCompleted` flag. Titles are display copy and cannot serve as the key.
12. **Inputs stay at 16px (`text-base`)** — anything smaller makes iOS Safari zoom on focus.
13. **Do not drop `SearchQueryLog`** until the backfill into `SearchAnalytics` is confirmed.
14. **Do not run `vercel link`.** The project link is correct; an earlier session's "stale orgId" diagnosis was wrong and was retracted.

---

## 9. Security rules

Non-negotiable. Full analysis in [`SECURITY.md`](docs/my-andijan/SECURITY.md).

1. **Never put a secret behind a `VITE_` name.** Vite compiles it into the public bundle.
2. **`SUPABASE_SERVICE_KEY` is server-side only.** It bypasses Supabase RLS entirely.
3. **`/auth/register` must never accept `role=ADMIN`.** Keep `RegisterDto`'s `@IsIn([CUSTOMER, BUSINESS_OWNER])`.
4. **Never use `$queryRawUnsafe` / `$executeRawUnsafe`.** Use `Prisma.sql` tagged templates. `Prisma.raw()` takes hardcoded literals only — never user input. (The codebase is currently clean on this; keep it that way.)
5. **Keep `escapeHtml()` before any Leaflet `divIcon` HTML.** `divIcon` takes raw HTML — this is a real XSS control.
6. **Keep the `\u003c` escape in `JsonLd`**, so a stray `</script>` in business text cannot break out.
7. **Keep `whitelist` + `forbidNonWhitelisted`** on the global `ValidationPipe`.
8. **Keep bcrypt at cost 12** everywhere.
9. **Never store an OTP, reset code or refresh token in plaintext.**
10. **`ActivityLog` stores `ipHash`, never a raw IP.** Hold that line for anything new.
11. **Never commit a credential**, even with no git remote. One already is — see `SECURITY.md` §1.1.
12. **Keep `JwtStrategy`'s per-request status check.** It is what makes suspension take effect immediately.
13. **Never read, echo or handle the user's `.env` contents or CLI tokens.** Do not attempt interactive login flows (`vercel login`) — those are the user's action.

---

## 10. Git workflow

- Both repos are on **`master`**, with **no remote, no CI, no PR flow**.
- **Commit only when asked.** The user's phrasing is consistently *"Commit the working tree changes with a sensible message."*
- Write descriptive subject lines in the existing style: *"Add the business claim flow — eight single-field screens with a live preview"*.
- **Run a secret scan before committing.** This is how the hardcoded credential was found. Do not commit a new one.
- **Do not push** (there is nowhere to push) and **do not add a remote** without discussing the credential purge first.
- If a change spans both repos, commit each separately with matching context.

---

## 11. Before modifying the architecture

Work through this:

1. **Read `docs/my-andijan/DECISIONS.md`.** 52 recorded decisions, each marked 🔒 LOCKED, 🔓 REVISITABLE or ⚠️ NEEDS DECISION. If your change touches a 🔒 item, stop and discuss.
2. **Read the relevant schema comments.** `prisma/schema.prisma` explains most non-obvious modelling choices, including ones that reversed an earlier draft.
3. **Check whether the endpoint already exists.** ~80 of 118 routes have no frontend caller. **The backend is usually not the bottleneck** — most product value right now is frontend wiring against working endpoints.
4. **Do not trust comments in `src/lib/api.ts` about missing endpoints.** Several were true when written and are now wrong. Read the controllers.
5. **Check `docs/SSG.md`** before touching `App.tsx`'s router, `LanguageContext`'s or `AuthContext`'s `localStorage` reads, or Leaflet's import — all three are named SSR blockers with a written migration plan.
6. **Check the ten open questions** at the end of `DECISIONS.md`. If your change decides one, say so and record it.

---

## 12. How to avoid breaking existing functionality

- **`npm run build` before declaring anything done.** `tsc -b` catches i18n gaps, type drift and broken imports.
- **Trace consumers before changing a shared module.** `src/lib/api.ts`, `AuthContext`, `LanguageContext`, `MetaTags`, `JsonLd`, `OtpInput` (used by **both** signup and forgot-password), `EditBusinessModal` (owner **and** admin), `StepShell`/`FIELD_CLASSES`, `useAdminResource`.
- **Remember production is behind HEAD.** The deployed bundle lacks signup, claim, pricing and premium. Verifying "in production" will mislead you until the pending deploy lands.
- **`vercel.json` rewrites `/(.*)` → `/index.html`, so every URL on `myandijan.uz` returns 200 with HTML** — including asset paths that do not exist. **Status codes prove nothing.** Check `content-type` and bundle contents.
- **Test all three languages.** A key added only to `uz` fails the build; a key added everywhere but rendered wrong does not.
- **Test at 375px.** Mobile-first, and the mobile verification pass has never been run.
- **Check both repos when changing a contract.** There is no shared type package; DTOs and `src/types/index.ts` are maintained in parallel by hand.
- **Mock data is load-bearing in three places** — `restaurantMock.ts` (production restaurant cards), `adminMockData.ts` (admin reviews), `dashboard/mockData.ts` (inventory). Know which you are replacing.
- **Some endpoints resolve to the primary branch server-side** (`PUT /businesses/:id/hours`, `POST /businesses/:id/reviews`, `PATCH /admin/businesses/:id/branch`). Do not assume a branch id is needed.

---

## 13. How to update documentation

The handoff package in `docs/my-andijan/` is meant to stay accurate.

| When you… | Update |
| --- | --- |
| Change the schema | `DATABASE.md`, and `ARCHITECTURE.md` if the shape changes |
| Add/remove/change a route | `API.md` (including the ✅/⭕ frontend-usage marker) |
| Add a page, component or hook | `FRONTEND.md` |
| Add a dependency | `TECH_STACK.md` |
| Add or rename an env var | `ENVIRONMENT.md` — **names and purpose only, never values** |
| Add or change an integration | `INTEGRATIONS.md` |
| Change feature status | `FEATURES.md` |
| Make an architectural or product decision | `DECISIONS.md` — decision, reason, alternatives, lock status |
| Finish or discover a task | `TODO.md` — update the marker |
| Change SEO behaviour | `SEO.md` |
| Change tokens, primitives or motion | `DESIGN_SYSTEM.md` |
| Find or fix a security issue | `SECURITY.md` |
| Finish a significant work block | `SESSION_CONTEXT.md` — especially non-obvious bugs and their root causes |

**Rules:** never write a secret into any document. Distinguish **IMPLEMENTED / PARTIALLY IMPLEMENTED / PLANNED / BROKEN / UNKNOWN** — and prefer **UNKNOWN** over a guess. **When you correct a stale comment in code, correct it in the docs too.**

---

## 14. Current state — as of 2026-09-28

- **API:** deployed, verified, current. 118 routes live.
- **Frontend:** `HEAD = dd08485`, clean, build passing — **production is behind HEAD** and lacks signup, claim, pricing and premium.
- **The one blocker:** run `npx.cmd vercel login` then `npx.cmd vercel --prod`. Interactive — **the user must do the login.**
- **Then:** configure `ESKIZ_*` on Railway (OTP currently reports success and sends nothing) and **rotate the seed-script password** in `api/scripts/seed-role-accounts.js`.

Read [`HANDOFF_INDEX.md`](docs/my-andijan/HANDOFF_INDEX.md) before starting anything substantial.
