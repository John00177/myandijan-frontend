# ENGINEERING_RULES — My Andijan (both repositories)

> **Canonical home of the engineering do-not-break rules, conventions and commands** for `myandijan-frontend` and `my-andijan-api`. Created 2026-10-07 by consolidating the still-valid parts of both repositories' former `CLAUDE.md` files (frontend `69cd618:CLAUDE.md`, API `a74acd8:CLAUDE.md` — read them with `git show <sha>:CLAUDE.md`). Each rule was re-checked against the code on 2026-10-07; rules made obsolete by Phase 15 were dropped and are listed in §7.
>
> Changing a rule here needs a `DECISIONS.md` entry. Rationale for most rules: `DECISIONS.md` and `my-andijan-api/prisma/schema.prisma` comments.

---

## 1. Data model and API invariants (do not change without a decision)

1. **`Business` is the brand; `Branch` holds ALL location data** — district, city, address, landmark, phone, lat/lng, hours. Never add location columns to `Business`.
2. **Reviews are branch-scoped; favourites are business-scoped** (unique constraints back both).
3. **`BranchHour.dayOfWeek` is `0 = Monday … 6 = Sunday`** — not `Date.getDay()`. `JsonLd`'s `SCHEMA_DAYS` and the owner dashboard depend on it.
4. **`Int @default(autoincrement())` primary keys.** `JwtPayload.sub` is a number.
5. **Vanilla PostgreSQL only** — the database must stay relocatable to an Uzbek host. No PostGIS, no `pgvector`, no proprietary extensions; `pg_trgm` is the sole exception.
6. **Authorization is capability-based, deny by default (Phase 15D, D-75).** Every route declares `@Public` / `@Authenticated` / `@RequireCapability`; the role → capability table is `src/authz/capabilities.ts`; the route-inventory snapshot test fails CI on any undeclared or changed rule. Never reintroduce a role rank (`no-rank-model.spec.ts`). Ownership checks live in the service/policies, never on a client-supplied id.
7. **`/auth/register` accepts only `CUSTOMER` / `BUSINESS_OWNER`** (`RegisterDto` `@IsIn`).
8. **`BusinessRecommendation.code` is the stable rule key** for idempotent health-score recomputation. Health scores recompute on write, not on a cron.
9. **Command-centre log tables (`PlatformMetric`, `SearchAnalytics`, `ActivityLog`) have no foreign keys** by design.
10. **Do not drop `SearchQueryLog`** until the backfill into `SearchAnalytics` is confirmed.
11. **`UploadService` is provided directly in `AuthModule`** — importing `UploadModule` there would mount `UploadController` twice.
12. **`SmsService` never throws**; it reports whether the provider accepted the message, and callers fail closed (503) when SMS is unavailable (D-76).
13. **`PATCH /admin/categories/reorder` stays declared before `PATCH /admin/categories/:id`** in `AdminController`.
14. **Every new migration that creates a table the API uses must `GRANT` it to `runtime_app_public`; nothing `sig_*` ever may be** (`my-andijan-api/db/privileges/RUNBOOK.md` §10).
15. **Migrations must stay backward-compatible** — Railway runs `prisma migrate deploy` pre-deploy, and a rollback does not reverse it.

## 2. Frontend invariants

1. **`uz` is the i18n source of truth** (`TranslationKey = keyof typeof uz`); add keys to `src/i18n/uz.ts` first. **`t()` has no interpolation** — use `.replace("{x}", value)`.
2. **Every network call goes through `src/lib/api.ts`.** Keep `normalizeBusiness` / `normalizeBranch` there.
3. **A call to a not-yet-deployed API route must degrade, not fail** — treat its 404 as "not available yet" (pattern: `getAdminBusinessEditDetail`).
4. **Never use `AnimatePresence mode="wait"` for screen transitions in a flow** — it deadlocked signup. Use a keyed `motion.div`.
5. **`Card`'s `interactive` preset has no transform**; its transition stays scoped to `border-color, box-shadow`.
6. **No progress bar in the signup or claim flows** (deliberate).
7. **Inputs stay at 16px (`text-base`)** — smaller makes iOS Safari zoom.
8. **Tailwind utilities and design tokens only** (`DESIGN_SYSTEM.md`); motion constants from `src/lib/motion-config.ts`.
9. **`restaurantMock.ts` ships to production** (deterministic display data for fields the API lacks) — know it before replacing it.
10. **`vercel.json` rewrites every path to `index.html`** — a 200 proves nothing; check `content-type` and content.
11. **Do not run `vercel link`** — the project link is correct.

## 3. Security rules

1. Never put a secret behind a `VITE_` name — Vite publishes it in the bundle.
2. `SUPABASE_SERVICE_KEY` is server-side only (it bypasses RLS).
3. Never use `$queryRawUnsafe` / `$executeRawUnsafe`; use `Prisma.sql`. `Prisma.raw()` takes hardcoded literals only.
4. Keep `escapeHtml()` before any Leaflet `divIcon` HTML, and the `<` escape in `JsonLd`.
5. Keep `whitelist` + `forbidNonWhitelisted` on the global `ValidationPipe`.
6. Keep bcrypt at cost 12 at every hash site.
7. Never store an OTP, reset code or refresh token in plaintext.
8. `ActivityLog` stores `ipHash`, never a raw IP.
9. Keep `JwtStrategy`'s per-request user status, `sv` and `sid` checks — they make suspension and logout immediate.
10. Never read, echo or commit `.env` contents, CLI tokens or credentials; never reintroduce a literal or default password in `scripts/`. Interactive logins (`vercel login`, `railway login`) are the owner's action.
11. Run a secret scan before committing.

Full analysis and residual risks: `SECURITY.md`.

## 4. Conventions

- **TypeScript throughout.** No `any` except the deliberate `raw: any` normalisers at the API boundary.
- **Backend:** one module per feature (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`), `class-validator` DTOs, Prisma query builder by default (raw SQL only via `Prisma.sql`), `snake_case` in Postgres / `camelCase` in code, phone format `/^\+998\d{9}$/`.
- **Frontend:** named function components, default-exported; no state/data/form library — Context + hooks + `src/lib/api.ts`.
- **Comment the *why*.** Correct a comment when it goes stale, and correct the docs with it.
- **Contract changes touch both repositories** (no shared type package). Ship the API first.
- **Commit messages:** conventional style with the phase id, e.g. `feat(sitemap): … (Phase 16F.7)`.

## 5. Commands

| | Frontend (`myandijan-frontend`) | API (`my-andijan-api`) |
| --- | --- | --- |
| Dev | `npm run dev` (port **5180**, `.claude/launch.json`) | `docker compose up -d`, then `npm run start:dev` |
| Build | `npm run build` (`tsc -b && vite build`; a type error fails it) | `npm run build` |
| Test | `npm test` (Vitest) | `npm test` (unit); `npm run test:db` / `test:db:runtime` — **disposable local database only**, name must contain `test` |
| Lint | `npm run lint` (Oxlint) | `lint` / `format` reference uninstalled ESLint/Prettier — **broken, do not rely on them** |
| Other | `npm run sitemap` (needs the API; fail-closed since 16F.4), `npm run og-image` | `npx prisma migrate dev` (local only), `npm run db:seed` |

CI (`test-and-build`) runs the tests and build on every PR and on `main` in both repositories, and gates merges.

## 6. Windows notes (primary machine)

- Use **`npx.cmd` / `npm.cmd`** in PowerShell — the execution policy blocks the `*.ps1` shims.
- **Windows PowerShell 5.1 has no `&&`** — use `;` or separate commands.
- **Port 5173 belongs to an unrelated project — do not kill it.** This project uses 5180.
- Heredocs break on Uzbek apostrophes (`'`, `’`, `ʻ`, `ʼ`) — write a script file instead.
- Python's default `cp1252` stdout crashes on Uzbek/Russian text — use UTF-8 explicitly.

## 7. Dropped from the former `CLAUDE.md` files (obsolete, kept here for traceability)

| Former rule | Why dropped |
| --- | --- |
| "Role checks are a hierarchy floor" / `ROLE_HIERARCHY`, `RolesGuard`, `@Roles` | Rank model deleted in Phase 15D (D-75); replaced by §1.6 |
| "There are no tests" / "verify manually" | Both repositories have test suites and CI (Phase 13+) |
| "`master`, no remote, no CI, no PR flow" | `main` + GitHub + "Protect main" ruleset + CI |
| "Deploy with `railway up` / Vercel CLI; no auto-deploy" | Both hosts deploy from `main` after CI (D-71, D-77) |
| "`seed-role-accounts.js` holds a credential" | Remediated 2026-09-28 (SECURITY §1.1) |
| "Mock data is load-bearing in three places" | Only `restaurantMock.ts` remains (§2.9) |
| Open security gaps list (CORS, throttling, OTP logging…) | Superseded by SECURITY §16 (residual risks R1–R14) |
| Counts (118 routes, 31 models, 11 migrations…) | Stale; see `API.md` / `DATABASE.md` |
