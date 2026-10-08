# ENVIRONMENT — My Andijan

> **No secret values appear in this document.** Every variable is listed by name with its purpose, where it is read, and whether it is required. Values live only in the gitignored `.env` files and in the Railway / Vercel dashboards.
>
> Compiled by enumerating every `process.env.*` and `import.meta.env.*` reference in both codebases on 2026-09-28, then reconciling against `.env.example` and the actual `.env` files (keys only).

---

## 1. Backend — `my-andijan-api`

Read directly from `process.env`. **There is no `@nestjs/config`**, no schema validation, and no startup check that required variables exist — a missing variable surfaces as a runtime failure, not a boot failure.

### 1.1 Database

| Variable | Required | Read by | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Yes — dev + prod** | `prisma/schema.prisma` via `env("DATABASE_URL")`; all Prisma CLI commands | PostgreSQL connection string. Also used by `prisma migrate deploy` on every Railway boot. |

Local form (from `.env.example`): a `postgresql://` URL against the `docker-compose.yml` Postgres with `?schema=public`.

### 1.2 Authentication

| Variable | Required | Default | Read by | Purpose |
| --- | --- | --- | --- | --- |
| `JWT_ACCESS_SECRET` | **Yes — dev + prod** | none | `auth.module.ts` (`JwtModule.register`), `auth.service.ts` (`signAsync`), `jwt.strategy.ts` (`secretOrKey`) | Signs and verifies access tokens. **If unset, `JwtModule` registers with `undefined` and token verification behaviour is undefined — this is the single most important variable to get right.** |
| `JWT_ACCESS_EXPIRES_IN` | No | **`15m`** | `auth.module.ts`, `auth.service.ts` | Access-token TTL. **This is why sessions currently die after ~15 minutes** — the frontend never refreshes. See §5. |
| `JWT_REFRESH_EXPIRES_IN` | No | **`30d`** | `auth.service.ts` (`addDuration`) | Refresh-token lifetime. Parsed by a `/^(\d+)([smhd])$/` regex; **an unparsable value silently falls back to 30 days.** |
| `JWT_REFRESH_SECRET` | **No — DEAD** | — | **nothing** | ⚠️ **Declared in `.env.example` and present in `.env`, but never read by any code.** Refresh tokens are **not** JWTs: `issueTokens()` generates `crypto.randomBytes(48).toString('hex')` and stores a SHA-256 hash in `RefreshToken.tokenHash`. This variable is a leftover from an earlier design. **Remove it from `.env.example`, or the next engineer will assume refresh tokens are signed JWTs.** |

### 1.3 Server

| Variable | Required | Default | Read by | Purpose |
| --- | --- | --- | --- | --- |
| `PORT` | No | **`3000`** | `main.ts` | HTTP listen port. Railway injects this automatically. |

### 1.4 Object storage — Supabase

| Variable | Required | Read by | Purpose |
| --- | --- | --- | --- |
| `SUPABASE_URL` | **Yes, for any image upload** | `upload.service.ts` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | **Yes, for any image upload** | `upload.service.ts` | **`service_role` key — the highest-privilege Supabase credential. Bypasses Row Level Security entirely.** Must never leave the server. |
| `SUPABASE_ANON_KEY` | **No — UNUSED by code** | **nothing** | Present in `.env` but not referenced anywhere. It was tried first and abandoned: the `anon` key made every upload fail with *"new row violates row-level security policy"*, because it is meant for browser-to-Supabase calls under RLS and this backend holds no Supabase Auth session. Harmless to keep, but it is not wired up. |

> **`.env.example` (updated 2026-10-08):** `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are added, empty, by backend PR #26 (merged 2026-10-08, `ae43648`). Before that they were absent, and — correcting the earlier wording here — a developer following `.env.example` got an API that **does not boot**, not one whose uploads answer 500: `UploadService` checks both in its constructor and `AuthModule` provides it (footnote ¹ below). `SUPABASE_ANON_KEY` stays out: nothing reads it.
>
> `UploadService` throws `InternalServerErrorException` **in its constructor** when either is missing — so a misconfigured environment fails at module instantiation, i.e. the whole API refuses to boot rather than failing only on upload. Worth knowing when debugging a boot failure.

### 1.5 SMS — Eskiz.uz

| Variable | Required | Default | Read by | Purpose |
| --- | --- | --- | --- | --- |
| `ESKIZ_EMAIL` | **For real SMS** | none | `sms.service.ts` | Eskiz account email. Exchanged with the password for a bearer token — Eskiz issues no static API key. |
| `ESKIZ_PASSWORD` | **For real SMS** | none | `sms.service.ts` | Eskiz account password |
| `ESKIZ_FROM` | No | omitted | `sms.service.ts` | Sender ID; only appended when set |
| `ESKIZ_BASE_URL` | No | **`https://notify.eskiz.uz/api`** | `sms.service.ts` | Override for testing |

> **Not set on Railway** (last recorded 2026-10-04). Added to `.env.example` on 2026-10-08 by backend PR #26 (`ae43648`): `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM` empty, and `ESKIZ_BASE_URL` **commented out** — it is read with `??`, so an empty value would replace the default URL with `""`. *Superseded behaviour:* the request used to log a warning and report success; **since Phase 15E.2 (D-76) it fails closed** — `isConfigured` false → `POST /auth/otp/request` and `/auth/forgot-password` answer **503**, and no code is logged.
>
> **The consequence (current since 15E.2):** OTP sign-in and SMS password reset answer **503** in production, so neither is usable by real users until these are set. *(Historical: before 15E.2 the request returned `{"success":true}` while no SMS was sent, and reset codes were logged.)*
>
> Setting them is necessary but not sufficient: **the SMS template must also be registered in the Eskiz dashboard.** The intended template is `"My Andijan tasdiqlash kodi: {code}. @myandijan.uz #{code}"` — the trailing `@domain #code` line is what enables Android's WebOTP auto-read.

### 1.6 Seeding

| Variable | Required | Read by | Purpose |
| --- | --- | --- | --- |
| `SEED_ADMIN_PHONE` | Dev / first deploy | `prisma/seed.ts` | Phone for the seeded admin account (`+998XXXXXXXXX`) |
| `SEED_ADMIN_PASSWORD` | **Required to seed** | `prisma/seed.ts` | Password for that account. **Hardened 2026-09-28: the `?? '<a literal published in this repo>'` fallback was removed**, so `npm run db:seed` now throws when this is unset rather than silently creating an ADMIN with a password published in the repo. `.env.example` carries a non-usable placeholder. |
| `SEED_ADMIN_EMAIL` | Dev / first deploy | `prisma/seed.ts` | Email for that account |

| `SEED_ROLE_PASSWORD` | **Set in Railway production 2026-09-28** (192-bit random; retrieve from the Railway dashboard, never from here). Used by `scripts/seed-role-accounts.js` only | `scripts/seed-role-accounts.js` | Password applied to the six per-role demo accounts. **Added 2026-09-28**, replacing a hardcoded literal. Deliberately has **no default** — the script exits 1 when it is unset. Supply it per-run (`SEED_ROLE_PASSWORD='...' node scripts/seed-role-accounts.js`); **do not** persist it in `.env`. |

> These are how an `ADMIN` first comes into existence, since `POST /auth/register` restricts `role` to `CUSTOMER`/`BUSINESS_OWNER`. They are only needed when seeding.
>
> **Separately:** `scripts/seed-role-accounts.js` creates one account per role tier. It now requires `SEED_ROLE_PASSWORD` from the environment, with no default, and does not print it. See `SECURITY.md` §1.1 — fully remediated 2026-09-28.

### 1.7 Backend summary

| Variable | Dev | Prod | In `.env.example`? | Actually used? |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | **Req** | **Req** | ✅ | ✅ |
| `JWT_ACCESS_SECRET` | **Req** | **Req** | ✅ | ✅ |
| `JWT_ACCESS_EXPIRES_IN` | opt | opt | ✅ | ✅ |
| `JWT_REFRESH_EXPIRES_IN` | opt | opt | ✅ | ✅ |
| `JWT_REFRESH_SECRET` | — | — | ✅ | ❌ **dead** |
| `PORT` | opt | auto | ✅ | ✅ |
| `SUPABASE_URL` | Req¹ | **Req** | ✅ (backend #26, 2026-10-08) | ✅ |
| `SUPABASE_SERVICE_KEY` | Req¹ | **Req** | ✅ (backend #26, 2026-10-08) | ✅ |
| `SUPABASE_ANON_KEY` | — | — | ❌ | ❌ unused |
| `ESKIZ_EMAIL` | opt | **should be set** | ✅ (backend #26, 2026-10-08) | ✅ |
| `ESKIZ_PASSWORD` | opt | **should be set** | ✅ (backend #26, 2026-10-08) | ✅ |
| `ESKIZ_FROM` | opt | opt | ✅ (backend #26, 2026-10-08) | ✅ |
| `ESKIZ_BASE_URL` | opt | opt | ✅ commented out (backend #26, 2026-10-08) | ✅ |
| `SEED_ADMIN_PHONE` | seed | seed | ✅ | ✅ |
| `SEED_ADMIN_PASSWORD` | seed | seed | ✅ | ✅ |
| `SEED_ADMIN_EMAIL` | seed | seed | ✅ | ✅ |
| `SEED_ROLE_PASSWORD` | script | script | ✅ (backend #26, 2026-10-08) | ✅ `scripts/seed-role-accounts.js` |

¹ Required for the API to boot at all, because `UploadService`'s constructor throws without them.

---

## 2. Frontend — `myandijan-frontend`

Vite only exposes variables prefixed **`VITE_`** to client code.

> **🔴 Security rule, absolute: anything prefixed `VITE_` is compiled into the public JavaScript bundle and is readable by anyone who visits the site. Never put a secret, API key, token, or service credential behind a `VITE_` name.** Today the frontend correctly holds no secrets.

### 2.1 Runtime variables

| Variable | Required | Default | Read by | Purpose |
| --- | --- | --- | --- | --- |
| `VITE_API_URL` | **Recommended** | `https://myandijan-api-production.up.railway.app` | `src/lib/api.ts` | API base URL. **The fallback is the production API**, so a missing variable in local development silently points the dev server at live data. Set it explicitly: `VITE_API_URL=http://localhost:3000` |
| `VITE_SITE_URL` | No | `https://myandijan.uz` | `src/lib/seo.ts` | Canonical origin for canonical links, hreflang alternates, `og:image` and JSON-LD `url` fields. Trailing slash stripped. **Preview deploys should set this** so they do not advertise the production domain as their canonical. |

`import.meta.env.DEV` (Vite built-in) gates `motionDebug()` in `src/lib/motion-config.ts`.

### 2.2 Build-script variables (Node, not `VITE_`)

Used by `scripts/generate-sitemap.ts` (`npm run sitemap`), which runs in Node and reads `process.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SITE_URL` | `https://myandijan.uz` | Origin written into sitemap `<loc>` entries |
| `VITE_API_URL` | production API | API the generator pulls live businesses / categories / geography from |

> Note the inconsistency: the app reads `VITE_SITE_URL`, the sitemap script reads `SITE_URL`. **Both must be set for a non-production build to be fully correct.**

### 2.3 Platform variables (not app code)

| Variable | Source | Notes |
| --- | --- | --- |
| `VERCEL_OIDC_TOKEN` | `.env.local`, written by the Vercel CLI | **Machine-generated, gitignored, not read by app code. Never commit or share it.** |

---

## 3. Local `.env` files

| File | Repo | Gitignored | Holds |
| --- | --- | --- | --- |
| `.env` | api | ✅ (verified via `git check-ignore`) | Local dev + real secrets. **Correction 2026-09-28:** its `DATABASE_URL` points at **`localhost`**, not production — an earlier draft of this document said production, which was wrong. It does hold a real Supabase **service-role** key, both JWT secrets, and seed admin credentials. |
| `.env.example` | api | ❌ committed | Placeholders only. **Complete since backend PR #26 (merged 2026-10-08, `ae43648`):** every variable the code reads is listed, all empty or placeholder; `ESKIZ_BASE_URL` commented out. Still lists the dead `JWT_REFRESH_SECRET` (`TODO.md`). |
| `.env` | frontend | ✅ (`.env`, `.env*`) | `VITE_API_URL` |
| `.env.local` | frontend | ✅ | `VERCEL_OIDC_TOKEN` |

Both `.gitignore` files correctly exclude env files. The frontend's lists `.env`, `.env.local`, `.env.*.local` and a broad `.env*`.

> **The API's local `.env` contains a live Supabase `service_role` key.** Its `DATABASE_URL` targets `localhost`, not production (verified 2026-09-28). It is correctly gitignored, but it remains a high-value file on a developer laptop. Treat it accordingly, and never paste it into a chat, issue, or AI prompt.

---

## 4. Setting up a new environment

### Local development — API

```bash
cp .env.example .env
```

Then, because `.env.example` is incomplete, add by hand:

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```
```
ESKIZ_EMAIL=
ESKIZ_PASSWORD=
ESKIZ_FROM=
```

`SUPABASE_*` are required for the API to boot. `ESKIZ_*` may be left empty — OTP codes are then logged to the console, which is the intended local workflow.

```bash
docker compose up -d
```
```bash
npm install && npx prisma migrate dev && npm run db:seed && npm run start:dev
```

### Local development — frontend

```bash
echo "VITE_API_URL=http://localhost:3000" > .env
```
```bash
npm install && npm run dev
```

> The dev server is configured for port **5180** in `.claude/launch.json`, because 5173 is occupied on this machine by an unrelated `crm-os` project. **Do not kill whatever is on 5173.**

### Production — Railway (API)

Set: `DATABASE_URL` (Railway provides), `JWT_ACCESS_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and — **still outstanding** — `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`. Optionally `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`. `PORT` is injected.

### Production — Vercel (frontend)

Set: `VITE_API_URL` (the Railway URL) and `VITE_SITE_URL` (`https://myandijan.uz`).

### Deployment pipeline (verified 2026-10-01, Phase 13)

| | Frontend → Vercel | Backend → Railway |
| --- | --- | --- |
| Production branch | `main` of `John00177/myandijan-frontend` | `main` of `John00177/my-andijan-api` |
| Trigger | **Automatic on push** via the Vercel GitHub App | **Automatic on push** via the Railway GitHub App, **after CI passes** ("Wait for CI", `checkSuites: true`) — enabled and verified 2026-10-01 |
| Evidence | GitHub Deployments API shows a `vercel[bot]` "Production" deployment for every recent `main` push (`889451b`, `5f4816a`, `a13bcf6`, `84de160`); live bundle hash matches the local build of `main` | Railway API: `autoDeploy.enabled=true, canEnable=true`; source `{repo, branch: main, checkSuites: true}`. Live test with docs-only `ded7b7a`: push 08:44:22 → Railway deployment `6b81b152` created 08:44:26 (no manual action) → CI green 08:45:11 → build started 08:45:16 (held until CI) → live 08:46:10. GitHub now shows `railway-app[bot]` deployment records |
| Build config | `vercel.json` (SPA rewrite only) + project settings | `railway.json` (Nixpacks, `npm run build`; start = `npx prisma migrate deploy && npm run start:prod`) + `nixpacks.toml` (`npm ci --include=dev`, D-67) |
| Service IDs | Vercel project `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH` | project `3910b9c5-e86d-4c06-8058-def605847424`, service `4109a788-880f-4d6c-a0a6-766663cd2f24`, env `production` `653c2817-832a-4d76-a236-d91972b55d09` |

**GitHub Actions is validation only.** Both repos' `.github/workflows/ci.yml` run `npm ci → test → build` on push/PR to `main` and contain no deploy step; neither host waits on them today (D-71).

**History — why Railway did not auto-deploy until 2026-10-01.** Railway could read the repo (it is public), so manual deploys built the requested commit, but auto-deploy needs a project member's GitHub account connected to Railway **and** the Railway GitHub App installed with access to `John00177/my-andijan-api`. Until the owner authorized it, the API reported `enabled=false, canEnable=false, reason=NO_PROJECT_MEMBER_ACCESS`, and reconnecting the source only started one-off deployments of `main` HEAD. **Resolved** by the owner action below; if auto-deploy ever stops, check that state first (Railway MCP `railway-agent` → "serviceAutoDeployTool"). The dashboard's "Could not load branches" message did not affect the trigger — the API reports `branch: main` and the push test deployed.

**Owner action that enabled auto-deploy (done 2026-10-01; repeat if access is ever revoked):**
1. Sign in to Railway with an account that is a member of the project → Account Settings → connect the GitHub account `John00177` (or any GitHub account with access to the repo).
2. On GitHub → Settings → Applications → **Railway** → Configure: grant repository access to `John00177/my-andijan-api`; accept any pending permission request.
3. Railway → service `myandijan-api` → Settings → Source: confirm repo `John00177/my-andijan-api`, branch `main`, turn **Auto Deploy** on. Recommended: enable **Wait for CI** so a red `test-and-build` run never ships.
4. Verify: push a harmless commit to `main`; a Railway deployment for that SHA must appear without any manual action, and GitHub should start showing Railway deployment statuses on commits.

### Release & recovery runbook (backend)

A backend release is: push to `main` → CI `test-and-build` green → Railway builds and deploys automatically → verify (deployment commit = `main` HEAD, smoke checks). A red CI run does not deploy.

- **Trigger a deploy manually (only if auto-deploy is broken):** Railway dashboard → service → Deployments → "Deploy latest commit" (or Settings → Source → reconnect `main`; or the Railway MCP `connect-service-source` with `branch: main`).
- **Identify what is live:** Railway → Deployments (top `SUCCESS` row shows the commit SHA); or MCP `get-deployment-diagnosis` on `latestDeployment.id` from `describe-service`. Cross-check with a route that only exists in the newest commit (e.g. an unauthenticated POST that returns `401` on the new build and `404` on the old one).
- **Roll back to a known-good build:** Railway → Deployments → previous `SUCCESS` deployment → **Rollback/Redeploy** (re-uses that image; no rebuild). MCP: `redeploy` with that `deploymentId`. Rolled-back code stays on `main` in git — revert the commit on `main` too, or the next manual deploy re-ships it.
- **Failed build:** production keeps serving the previous image (Railway only swaps on success). Read build logs (dashboard, or ask the MCP `railway-agent` for the build logs of the deployment ID) before retrying; a retry of a deterministic failure fails the same way (see D-67).
- **Migrations:** the start command runs `prisma migrate deploy` on every boot; a rollback does **not** reverse an applied migration. Keep migrations backward-compatible with the previous release.
- **Frontend:** Vercel dashboard → Deployments → previous Production deployment → **Promote to Production** (instant rollback); identify the live build by the `index-*.js` hash on `https://myandijan.uz`.

---

## 5. Consequences of the defaults — read this before changing anything

1. **`JWT_ACCESS_EXPIRES_IN` defaults to `15m` and the frontend never refreshes.** Users are silently signed out after ~15 minutes, mid-flow. There are two fixes and they are not equivalent: **raising the TTL** is a one-line config change that weakens the security posture (a stolen token stays valid longer); **implementing refresh on the client** is the correct fix and the server side already exists. Prefer the second.
2. **`VITE_API_URL` falls back to production.** A developer who forgets the `.env` is writing to the live database from `localhost`. Consider making the fallback `http://localhost:3000` in development and requiring the variable in production builds.
3. **`ESKIZ_*` being unset fails silently and successfully.** The OTP endpoint reports success. There is no health signal anywhere that says SMS is down. Consider surfacing `SmsService.isConfigured` on a status endpoint.
4. **`JWT_REFRESH_EXPIRES_IN` silently falls back to 30 days** if it does not match `/^(\d+)([smhd])$/`. A typo like `30 d` or `1month` is accepted and ignored.
5. **`.env.example` is missing seven variables that the code reads.** Anyone onboarding from it gets an API that will not boot.

---

## 6. Recommended follow-ups

| # | Action |
| --- | --- |
| 1 | **Add `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`, `ESKIZ_BASE_URL` to `.env.example`** (names + placeholders). |
| 2 | **Remove `JWT_REFRESH_SECRET` from `.env.example` and `.env`** — nothing reads it, and its presence implies a design that does not exist. |
| 3 | **Set the `ESKIZ_*` variables on Railway** and register the SMS template in the Eskiz dashboard. |
| 4 | Remove `SUPABASE_ANON_KEY` from `.env` unless a browser-side Supabase client is planned. |
| 5 | Add `@nestjs/config` with a validation schema so a missing required variable fails at boot with a clear message instead of at first use. |
| 6 | Make `VITE_API_URL`'s fallback development-only. |
| 7 | Align `SITE_URL` (sitemap script) and `VITE_SITE_URL` (app) on one name. |
| 8 | Rotate `JWT_ACCESS_SECRET`, the Supabase service key, and the seed/role-account passwords — see `SECURITY.md`. |
