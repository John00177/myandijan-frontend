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

> **⚠ Undocumented in `.env.example`.** All three `SUPABASE_*` variables exist in the real `.env` but are **absent from `.env.example`**. A new developer following `.env.example` gets an API where every image upload returns `500 "Image upload is not configured"`. **Add them to `.env.example` (names only, placeholder values).**
>
> `UploadService` throws `InternalServerErrorException` **in its constructor** when either is missing — so a misconfigured environment fails at module instantiation, i.e. the whole API refuses to boot rather than failing only on upload. Worth knowing when debugging a boot failure.

### 1.5 SMS — Eskiz.uz

| Variable | Required | Default | Read by | Purpose |
| --- | --- | --- | --- | --- |
| `ESKIZ_EMAIL` | **For real SMS** | none | `sms.service.ts` | Eskiz account email. Exchanged with the password for a bearer token — Eskiz issues no static API key. |
| `ESKIZ_PASSWORD` | **For real SMS** | none | `sms.service.ts` | Eskiz account password |
| `ESKIZ_FROM` | No | omitted | `sms.service.ts` | Sender ID; only appended when set |
| `ESKIZ_BASE_URL` | No | **`https://notify.eskiz.uz/api`** | `sms.service.ts` | Override for testing |

> **⚠ These four are NOT in `.env.example` AND are NOT set on Railway.** `SmsService.isConfigured` returns false when email or password is missing, and `send()` then **logs a warning and returns normally instead of throwing** — deliberately, so an SMS outage cannot fail an OTP request whose code has already been persisted.
>
> **The consequence is the project's most important operational fact:** `POST /auth/otp/request` returns `{"success":true,"message":"Kod yuborildi"}` in production while **no SMS is sent**. The same applies to password-reset codes (`auth.service.ts:347` — `TODO(production): send via Eskiz SMS instead of logging. DEV MODE only`). **Signup and password reset are unusable by real users until these are set.**
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
| `SUPABASE_URL` | Req¹ | **Req** | ❌ **missing** | ✅ |
| `SUPABASE_SERVICE_KEY` | Req¹ | **Req** | ❌ **missing** | ✅ |
| `SUPABASE_ANON_KEY` | — | — | ❌ | ❌ unused |
| `ESKIZ_EMAIL` | opt | **should be set** | ❌ **missing** | ✅ |
| `ESKIZ_PASSWORD` | opt | **should be set** | ❌ **missing** | ✅ |
| `ESKIZ_FROM` | opt | opt | ❌ **missing** | ✅ |
| `ESKIZ_BASE_URL` | opt | opt | ❌ **missing** | ✅ |
| `SEED_ADMIN_PHONE` | seed | seed | ✅ | ✅ |
| `SEED_ADMIN_PASSWORD` | seed | seed | ✅ | ✅ |
| `SEED_ADMIN_EMAIL` | seed | seed | ✅ | ✅ |

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
| `.env.example` | api | ❌ committed | Placeholders only. **Incomplete — missing all `SUPABASE_*` and `ESKIZ_*`.** |
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
