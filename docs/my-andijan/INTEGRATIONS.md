# INTEGRATIONS — My Andijan

> Every external service either wired up or referenced. Configuration is described by **variable name and location only — no secret values appear here.** Verified 2026-09-28.

---

## 1. Status summary

| Service | Category | Status |
| --- | --- | --- |
| Railway | API + database hosting | 🟢 **Active, current** |
| Vercel | Frontend hosting | 🟡 **Active but behind HEAD; deploy blocked** |
| Supabase Storage | Object storage | 🟢 **Active** |
| PostgreSQL (Railway) | Database | 🟢 **Active** |
| Leaflet / OSM tiles | Maps | 🟢 **Active** (provider unverified) |
| Google Fonts | Typography | 🟢 **Active** |
| Eskiz.uz | SMS / OTP | 🔴 **Built, NOT configured — silently no-ops** |
| Click / Payme / Uzum / cash | Payments | ⚪ **UI labels only, no integration** |
| Telegram login | Social auth | ⚪ **Button only, no backend** |
| Google login | Social auth | ⚪ **Button only, no backend** |
| Cloudinary | Object storage | ⚪ **Vestigial reference, not used** |
| Weather API | Content | ⚪ **`TODO` placeholder** |
| Email provider | Notifications | ⚫ **None** |
| Third-party analytics | Analytics | ⚫ **None (first-party only)** |
| Error tracking | Observability | ⚫ **None** |
| UzCloud | Domain | ❓ **Referenced in session history, not verifiable from the repos** |

---

## 2. Active integrations

### 2.1 Railway — API and PostgreSQL

**Purpose:** hosts the NestJS API and the production PostgreSQL database.

**Config — `my-andijan-api/railway.json`:**
```json
{
  "build":  { "builder": "NIXPACKS", "buildCommand": "npm run build" },
  "deploy": { "startCommand": "npx prisma migrate deploy && npm run start:prod",
              "restartPolicyType": "ON_FAILURE", "restartPolicyMaxRetries": 3 }
}
```

**Environment variables set on Railway:** `DATABASE_URL` (Railway-provided), `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PORT` (injected). **Not set: all `ESKIZ_*`.**

**Status:** live at `https://myandijan-api-production.up.railway.app`. Verified 2026-09-28 — `/categories`, `/geography/regions`, `/businesses`, `/businesses/featured`, `/events`, `/search`, `/docs` all `200`; `/users/me` correctly `401`.

**Operational notes**
- Migrations run on every boot and are **`&&`-chained**, so the app only starts if they succeed. Corollary: **a running API proves all prior migrations applied cleanly.**
- `postinstall` runs `prisma generate`.
- Deploys via `railway up --detach`. The last deploy achieved **zero downtime** (`/categories` stayed 200 throughout; OTP was live after ~100 s).
- **There is no `/health` endpoint and never has been.** Use `GET /categories` as a liveness probe. Deploy checklists expecting `/health` will 404.
- `"engines": { "node": "22.x" }` — Railway honours this.
- **Privileged shell access is used operationally:** `scripts/seed-role-accounts.js` documents being run as `railway ssh "cd /app && node scripts/seed-role-accounts.js"`.

### 2.2 Vercel — frontend

**Purpose:** hosts the React SPA and serves `myandijan.uz`.

**Config — `myandijan-frontend/vercel.json`:**
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

SPA catch-all so deep links (`/uz/claim`, `/uz/business/some-slug`) resolve instead of 404ing.

> **⚠ Verification hazard.** Because of this rewrite, **every** URL on the domain returns `200` with `Content-Type: text/html` — including asset paths that do not exist. A `200` proves nothing. When checking whether something is deployed, inspect `content-type` and the bundle's contents, not the status code.

**Project identity (verified against the Vercel API):**
- Project: `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH`
- Team: `team_ErWmdvPfiaDk9mHs6Tv1GFuu` (slug **`john-s3`**)
- Domain: `myandijan.uz`
- **Not Git-connected** — deploys must originate from the developer's machine

**Environment variables:** `VITE_API_URL`, `VITE_SITE_URL`.

**Status: 🟡 live but stale.** The deployed entry chunk is `assets/index-DKCNN09S.js`; local HEAD builds `index-NERlrCqp.js`. The deployed lazy-chunk manifest contains no `SignupPage`, `ClaimPage`, `PricingPage`, `PremiumBadge` or `premium` chunk. Restaurant search **is** live (the deployed `SearchPage` chunk contains the cuisine slugs).

**Blocker and fix.** `npx vercel --prod` returns `Not authorized`; `vercel whoami` returns `Logged out.` The root cause is **not** Vercel — PowerShell's execution policy blocks `D:\Node.js\npx.ps1`, so every `npx`/`npm` command the developer typed failed before Vercel was invoked:

```bash
npx.cmd vercel login
```
```bash
npx.cmd vercel --prod
```

Two things established and not to be re-litigated:
- **Do not run `vercel link`.** An earlier claim that `.vercel/project.json` held a stale `orgId` was **wrong and was retracted** — both IDs match the live project.
- **Windows PowerShell 5.1 has no `&&`.** Run the commands separately or chain with `;`.
- The **Vercel MCP server** can read the account but **cannot deploy**, because the project has no Git connection.

### 2.3 Supabase Storage — images

**Purpose:** stores all uploaded images — business covers, menu-item photos, review photos, avatars.

| Item | Value |
| --- | --- |
| Bucket | **`myandijan-images`** |
| SDK | `@supabase/supabase-js` `2.112.3` |
| Client | `src/upload/upload.service.ts`, built **once per process** |
| Credentials | `SUPABASE_URL`, **`SUPABASE_SERVICE_KEY`** (`service_role`) |
| Endpoint | `POST /upload/image`, multipart field `file`, `JwtAuthGuard` |
| Limits | 5 MB; MIME allow-list `image/jpeg`, `image/png`, `image/webp`, `image/gif` |
| Filename | `${Date.now()}-${originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}` |
| Returns | `{ url }` from `getPublicUrl()` — **public and unsigned** |

**Why the `service_role` key**, quoted from the service, because this is a trust-boundary decision someone will otherwise "fix":

> *"service_role, not anon — this runs server-side only and never reaches the client. The anon key made every upload fail with 'new row violates row-level security policy': it's meant for direct browser-to-Supabase calls under RLS, and this backend has no Supabase Auth session for RLS to authorize. service_role bypasses RLS entirely, which is the correct trust boundary for a backend that's already the one deciding (via JwtAuthGuard) who's allowed to upload."*

**`SUPABASE_ANON_KEY` is present in `.env` but read by nothing.**

**Known issues**
- `UploadService`'s **constructor throws** when either variable is missing, so a misconfigured environment prevents the whole API from booting — not just uploads.
- **HEIC mismatch:** `src/lib/api.ts` allows `image/heic`/`image/heif` client-side; the server rejects them. iPhone photos pass the client check and fail with a 400.
- Uploaded objects are **public and permanent**. There is no deletion path, no orphan cleanup, and no signed-URL option — a removed business's images stay publicly reachable.
- No image transformation or thumbnailing. `BranchPhoto.thumbUrl` exists and is never populated.

### 2.4 Leaflet / map tiles

**Purpose:** the map on `/search`.

`leaflet` `1.9.4` + `react-leaflet` `5.0.0`, code-split so the library only loads on the search route. Markers are Leaflet `divIcon`s with **`escapeHtml()` applied to all API-sourced text** (a real XSS fix — `divIcon` takes raw HTML).

**No API key or account is configured**, which implies the default OpenStreetMap tile server. **The exact tile provider was not verified in this pass — UNKNOWN.** Worth confirming: OSM's public tiles have a usage policy that a production directory may exceed, and there is no attribution or provider configuration visible at the integration level.

### 2.5 Google Fonts

`index.html` loads **Inter** (weights 400–800) with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` (`crossorigin`) and `display=swap`. No key. Note this is a third-party request on every page load — self-hosting is the usual privacy/performance improvement.

---

## 3. Built but not configured

### 3.1 Eskiz.uz — SMS / OTP 🔴

**The most consequential gap in the entire project.**

**Purpose:** deliver OTP codes for phone signup and password reset. Eskiz is the standard SMS gateway in Uzbekistan.

| Item | Detail |
| --- | --- |
| Implementation | `src/sms/sms.service.ts` + `sms.module.ts` (declared **`@Global`**) |
| Auth model | **No static API key.** Email + password are exchanged for a bearer token via `POST /auth/login`. |
| Token cache | In memory, **25-day TTL** (Eskiz tokens last 30 days — refreshed early rather than on failure) |
| Concurrency | Single in-flight login, so N concurrent sends trigger **one** login, not N |
| Send | `POST /message/sms/send`, `FormData` with `mobile_phone` (digits only, no `+`), `message`, optional `from` |
| Timeout | 10 s via `AbortSignal.timeout` |
| 401 handling | Drops the cached token so the next send re-logs in rather than repeating a doomed request |
| Variables | `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM` (optional), `ESKIZ_BASE_URL` (default `https://notify.eskiz.uz/api`) |

**The service is well-built. It is simply not turned on.**

> **`ESKIZ_EMAIL` and `ESKIZ_PASSWORD` are unset on Railway, and none of the four variables appear in `.env.example`.**

**Why this fails silently — and why that was deliberate:**

> *"Never throw here: an SMS provider outage (or an unconfigured environment) must not make the whole OTP endpoint fail. The caller has already persisted the code."*

So `send()` calls `logger.warn` and returns. `POST /auth/otp/request` returns `{"success":true,"message":"Kod yuborildi"}` and **no message is sent**. The design choice is right; the operational consequence is that **the whole phone-signup flow — the feature two entire sessions were spent building — cannot be completed by any real user, and nothing in the product surfaces that.**

**To enable:**
1. Set `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM` on Railway.
2. **Register the SMS template in the Eskiz dashboard** — Eskiz requires pre-approved templates. Intended template: `"My Andijan tasdiqlash kodi: {code}. @myandijan.uz #{code}"`. The trailing `@domain #code` line is what enables **Android WebOTP auto-read**, which pairs with the frontend's `autoComplete="one-time-code"`.
3. Verify with a real phone, then re-test the rate limit (3 per phone per 10 min → `429`).
4. Address the separate `TODO(production)` at `auth.service.ts:347` — **password-reset codes are logged rather than sent even when Eskiz is configured.** Enabling Eskiz fixes OTP signup but **not** password reset; that needs a code change.
5. Consider exposing `SmsService.isConfigured` on a status endpoint so this cannot be silently wrong again.

---

## 4. Referenced but not integrated

### 4.1 Payments — Click, Payme, Uzum, Naqd ⚪

Defined in `src/lib/premium.ts` as `PAYMENT_METHODS` and rendered on `PricingPage` and in `UpgradeModal`. **Labels only — there is no SDK, no API call, no webhook endpoint, no billing or subscription table.**

Related database readiness: `Advertisement.priceUzs` and `Advertisement.paymentStatus` (default `"UNPAID"`) exist for the Phase-2 ad product. `Business.isPromoted`/`isFeatured` are the MVP promotion mechanism and are set **only** by `POST /admin/businesses/:id/promote` — admin-granted, never purchased.

The schema is explicit that advertising *"ships with Click payments"*, so **Click appears to be the intended first provider.** Pricing recovered from session history: Premium 99 000 so'm, Featured 249 000 so'm, 20% yearly discount.

### 4.2 Telegram and Google login ⚪

Buttons are rendered in `PhoneScreen` **above** the phone field with a "yoki" divider — Yelp's ordering, adopted deliberately. **No OAuth backend, no client ID, no callback route, no provider columns on `User`.**

> Because they sit above the phone field, they are the first thing a new user sees — and they do nothing. This is a live UX defect, not just a missing feature.

`Business.telegram` is unrelated: it is a contact field for a business's Telegram handle.

### 4.3 Cloudinary ⚪

`BranchPhoto.publicId` carries the comment `// Cloudinary`. **Cloudinary is not a dependency and no code references it.** A vestige of an earlier storage decision, superseded by Supabase. Harmless, but misleading — worth renaming or documenting in the schema.

### 4.4 Weather ⚪

`src/pages/home/HeroSection.tsx:30` — `// TODO: Replace with real weather API`. The home hero shows hardcoded placeholder weather. No provider chosen.

---

## 5. Absent entirely

| Category | Notes |
| --- | --- |
| **Email** | No provider, no SDK, no templates. `User.email`, `User.emailVerified` and `Business.email` all exist; nothing sends mail. Blocks email verification, receipts, and any email notification. |
| **Push notifications** | None. |
| **Third-party analytics** | No GA, Plausible, PostHog, Mixpanel, or Hotjar. Analytics is entirely first-party (`BusinessAnalytics`, `SearchAnalytics`, `ActivityLog`, `PlatformMetric`) — **and the frontend never writes to it.** |
| **Error tracking** | No Sentry, Bugsnag, or Rollbar. Frontend errors reach only the browser console; API errors reach only Railway's stdout. |
| **CDN beyond hosting** | Vercel's edge for static assets; no separate image or asset CDN. |
| **Feature flags** | None. |
| **Search service** | No Algolia/Meilisearch/Elastic — search is PostgreSQL-native (`pg_trgm` + tsvector), by design and consistent with the data-localization constraint. |
| **Cache / queue** | No Redis, BullMQ, or cache layer. OTP storage deliberately uses PostgreSQL instead of Redis. |
| **Cron / scheduler** | None. `POST /admin/analytics/aggregate` and health-score recalculation have no scheduler. |
| **CI/CD** | No GitHub Actions or any pipeline in either repo. |
| **Secrets manager** | Plain `.env` files plus platform dashboards. |
| **Uptime monitoring** | None configured in-repo, and there is no `/health` endpoint to monitor. |

---

## 6. Domain

**`myandijan.uz`** — served by Vercel (confirmed: the Vercel project lists it). A session prompt describes the domain as *"DOMAIN: myandijan.uz (UzCloud)"*, suggesting UzCloud as registrar or DNS host, but **this is not verifiable from either repository.** DNS configuration, registrar, and certificate management were not inspected. **UNKNOWN.**

---

## 7. Integration risks

| # | Severity | Risk |
| --- | --- | --- |
| 1 | **Critical** | **Eskiz unconfigured, failing silently and "successfully".** Signup and password reset are unusable; nothing surfaces the failure. |
| 2 | **High** | **Supabase `service_role` key is a full-database-bypass credential** held in a local `.env` and on Railway. Rotate it if that `.env` has ever been shared, pasted, or backed up. |
| 3 | **High** | **Frontend deploy depends on one developer's local CLI auth**, on a machine whose shell policy blocks the tooling. No Git-connected deploys, no CI — a single point of failure. |
| 4 | Medium | **No error tracking anywhere.** A production frontend exception is invisible unless a user reports it. |
| 5 | Medium | **Uploaded images are public, permanent and unmanaged.** No delete path, no orphan cleanup. |
| 6 | Medium | **Tile provider unverified.** If it is OSM's public tiles, production traffic may breach their usage policy, and attribution requirements may not be met. |
| 7 | Medium | **No uptime monitoring and no health endpoint.** An API outage is discovered by users. |
| 8 | Low | **Non-functional social login buttons are the most prominent element on the signup screen.** |
| 9 | Low | **`.env.example` omits seven variables the code reads**, so onboarding from it produces an API that will not boot. |
| 10 | Low | **Google Fonts is a third-party dependency on every page load.** Self-host to remove it. |
