# myandijan-frontend

Frontend for **MyAndijan** — a multilingual business directory and city guide for the Andijan region of Uzbekistan. Users browse and search local businesses on a map, view business detail pages with reviews, follow events, and save favorites. Business owners claim and manage their listings through an owner dashboard, and staff manage the catalog through an admin dashboard.

Built with React 19 + TypeScript on Vite, styled with Tailwind CSS.

> **📖 Full project documentation — architecture, database, API, decisions, roadmap — is in [`docs/my-andijan/`](docs/my-andijan/).**
> **New to this project (human or AI)? Start at [`docs/my-andijan/HANDOFF_INDEX.md`](docs/my-andijan/HANDOFF_INDEX.md).**

---

## Two repositories

This is one half of the project.

| Repo | Path | Role | Hosting |
| --- | --- | --- | --- |
| **`myandijan-frontend`** (this one) | `~/Desktop/myandijan-frontend` | React 19 SPA | Vercel — [myandijan.uz](https://myandijan.uz) |
| **`my-andijan-api`** | `~/Desktop/my-andijan-api` | NestJS 10 + Prisma 5 + PostgreSQL | Railway — [`…up.railway.app`](https://myandijan-api-production.up.railway.app) |

There is no monorepo tooling and no shared type package, so a contract change needs both repos.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React 19, TypeScript ~6.0 |
| Build tool | Vite 8 (`@vitejs/plugin-react`) |
| Styling | Tailwind CSS 3 + PostCSS/Autoprefixer |
| Routing | React Router 7 (`BrowserRouter`) |
| Animation | Framer Motion 13 |
| Maps | Leaflet 1.9 + React Leaflet 5 |
| Charts | Recharts 3 |
| Icons | lucide-react |
| SEO / head | react-helmet-async |
| Linting | Oxlint |
| State / data fetching | **None** — React Context + hooks + a hand-written `fetch` client |
| Testing | **None** — see [Testing](#testing) |

Exact declared *and installed* versions: [`docs/my-andijan/TECH_STACK.md`](docs/my-andijan/TECH_STACK.md).

## Architecture overview

**Client-rendered SPA.** `main.tsx` → `App.tsx`, which nests `HelmetProvider` → `MotionConfig reducedMotion="user"` → `ErrorBoundary` → `BrowserRouter` → `AuthProvider` → routes.

`LangShell` provides the language context and the single shared auth modal for everything under `/:lang`. The marketing pages nest inside `Layout` (header, footer, mobile bottom nav); the dashboards are siblings with their own shells so they don't inherit that chrome — which is why `LazyRouteShell` exists to give them their own Suspense boundary. Routes are lazy-loaded so the initial bundle skips heavy dependencies like Leaflet until the search page is opened.

The backend is a NestJS monolith: 17 feature modules, **118 routes**, 31 Prisma models, JWT auth with a six-role hierarchy. Full picture across both repos: [`docs/my-andijan/ARCHITECTURE.md`](docs/my-andijan/ARCHITECTURE.md).

## Repository structure

```
.
├── CLAUDE.md               Working contract for AI agents — read before making changes
├── README.md               This file
├── index.html              SPA entry; loads Inter from Google Fonts
├── vercel.json             SPA catch-all rewrite
├── tailwind.config.ts      Design tokens (colours, radii, shadow, font)
├── vite.config.ts
├── tsconfig{,.app,.node}.json   Project references — hence `tsc -b`
├── .oxlintrc.json
├── .claude/launch.json     Dev server config (port 5180)
├── docs/
│   ├── my-andijan/         ← THE HANDOFF PACKAGE (19 documents)
│   └── SSG.md              Prerendering plan — read before attempting SSR
├── public/                 favicon.svg, icons.svg, robots.txt, og-default.*, 5 sitemaps
├── scripts/
│   ├── generate-sitemap.ts   `npm run sitemap` — pulls live API data
│   └── generate-og-image.ts  `npm run og-image` — via sharp
└── src/
    components/     Shared UI — ui/ primitives, auth/ forms, business/, premium/,
                    search/, claim/, profile/, seo/ meta + schema
    contexts/       AuthContext, LanguageContext
    hooks/          Data-fetching and utility hooks (businesses, events, favorites, ...)
    i18n/           uz / ru / en dictionaries
    lib/            API client, SEO, premium, phone, motion config, formatting helpers
    pages/          Route-level pages, grouped by area (home, search, business,
                    events, signup, claim, dashboard, admin)
    types/          Shared TypeScript types
```

## Getting started

Requires Node.js 24+ (developed on Node 24.18, npm 11.16). Note the API pins `node 22.x`.

```bash
npm install
```

```bash
echo "VITE_API_URL=http://localhost:3000" > .env
```

```bash
npm run dev
```

Vite serves the app at `http://localhost:5173`; this project is configured for **5180** in `.claude/launch.json` because 5173 is occupied by an unrelated project on the primary dev machine. The root path redirects to `/uz`.

Running the API locally is optional — the frontend falls back to the production API.

```bash
cd ~/Desktop/my-andijan-api && docker compose up -d
```

```bash
npm install && npx prisma migrate dev && npm run db:seed && npm run start:dev
```

That repo's `.env.example` is **incomplete** — it omits `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and all `ESKIZ_*`. The two Supabase variables are required for the API to boot. See [`docs/my-andijan/ENVIRONMENT.md`](docs/my-andijan/ENVIRONMENT.md).

### Windows / PowerShell notes

- Use **`npx.cmd` / `npm.cmd`**, not `npx` / `npm` — the execution policy blocks `*.ps1` wrapper scripts. This was the cause of a multi-session deploy blocker.
- **PowerShell 5.1 has no `&&`.** Chain with `;` or run commands separately.
- **Port 5173 is used by an unrelated project on the primary dev machine — do not kill it.**

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check the project (`tsc -b`) then build to `dist/` — **a type error fails the build** |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint over the source tree |
| `npm run sitemap` | Regenerate `public/sitemap*.xml` from live API data |
| `npm run og-image` | Regenerate the default Open Graph card |

## Configuration

Environment variables are read by Vite and must be prefixed with `VITE_`.

> **🔴 Anything prefixed `VITE_` is compiled into the public bundle and is readable by anyone visiting the site. Never put a secret behind a `VITE_` name.**

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | Base URL of the MyAndijan REST API | Falls back to the hosted production API in [`src/lib/api.ts`](src/lib/api.ts) — so a missing `.env` silently points local development at live data |
| `VITE_SITE_URL` | Canonical origin for canonical links, hreflang alternates, `og:image` and JSON-LD URLs ([`src/lib/seo.ts`](src/lib/seo.ts)) | `https://myandijan.uz`. **Preview deploys should set this** so they don't advertise production as their canonical |

Set them in a local `.env` file at the project root:

```bash
VITE_API_URL=http://localhost:3000
```

Build scripts run in Node and read `process.env` instead: `generate-sitemap.ts` uses **`SITE_URL`** (note: *not* `VITE_SITE_URL`) and `VITE_API_URL`.

The auth token is stored in `localStorage` under `myandijan_token` (and the cached user under `myandijan_user`) and attached as a `Bearer` header by the API client. JSON requests time out after 10 seconds; uploads after 30.

Full inventory including all backend variables: [`docs/my-andijan/ENVIRONMENT.md`](docs/my-andijan/ENVIRONMENT.md).

## Routing

Every user-facing route is namespaced by language: `/:lang/...`, where `lang` is `uz`, `ru`, or `en`. `/` redirects to `/uz`.

| Route | Page |
| --- | --- |
| `/:lang` | Home |
| `/:lang/search` | Search + map results |
| `/:lang/business/:slug` | Business detail |
| `/:lang/events` | Events listing |
| `/:lang/favorites` | Saved businesses |
| `/:lang/profile` | User profile |
| `/:lang/pricing` | Premium plans |
| `/:lang/signup` | Phone-first OTP signup |
| `/:lang/claim` | Business claim flow |
| `/:lang/dashboard` | Owner dashboard |
| `/:lang/dashboard/business/new` | Add a listing |
| `/:lang/admin` | Admin dashboard |

Legacy paths resolve rather than 404: `/register` → `/signup`, `/business/claim` → `/claim`, `/dashboard/business/:id/edit` → `/dashboard` (editing now happens in place via `EditBusinessModal`).

`/:lang/search` is a **dispatcher**: with `?category=oziq-ovqat` it renders a restaurant-specific UI (cuisine chips, price buckets, delivery, open-now); otherwise the generic search page.

**There is no 404 route** — an unmatched path under `/:lang` renders an empty `Layout`.

## Internationalization

Translations live in [`src/i18n`](src/i18n) as flat key/value dictionaries, one module per language (`uz.ts`, `ru.ts`, `en.ts`). `uz` is the source of truth — `TranslationKey` is derived from it, so adding a key there makes TypeScript flag the other languages until they're filled in. Currently **385 keys in each language, at exact parity**.

**`t()` has no interpolation** — callers use `.replace("{x}", value)`. This is deliberate.

## Accessibility

`MotionConfig reducedMotion="user"` wraps the app, so every Framer Motion animation honors `prefers-reduced-motion` without individual components opting in. [`src/lib/motion-config.ts`](src/lib/motion-config.ts) additionally exposes `useShouldAnimate()`, `useMotionTransition()` and a non-reactive `prefersReducedMotion()` for use outside React.

Inputs are 16px (`text-base`) to prevent iOS Safari zooming on focus.

**No broader accessibility audit has been performed** — contrast, focus order, ARIA and screen-reader behaviour are unverified.

## Testing

**There are no tests in either repository.** No test files, no runner, no `test` script — across 118 API routes and 132 components.

Until that changes, verify manually:

```bash
npm run build
```

```bash
npm run lint
```

Then exercise the affected flow in the browser, in all three languages, and at 375px width.

If you add tests, the highest-value targets are listed in [`docs/my-andijan/TODO.md`](docs/my-andijan/TODO.md) — the role hierarchy, the OTP limits, ownership scoping, and the `normalizeBusiness` API boundary.

## Deployment

### Frontend — Vercel

```bash
npx.cmd vercel --prod
```

`vercel.json` sets a SPA catch-all rewrite so deep links resolve. Project `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH`, team `john-s3`, serving `myandijan.uz`. **The project is not Git-connected**, so deploys must originate from a developer machine.

> **⚠️ Two things to know before verifying a deployment.**
>
> 1. **The rewrite means every URL on the domain returns HTTP 200 with HTML** — including asset paths that do not exist. **Status codes prove nothing.** Check `content-type` and the bundle's contents.
> 2. **Do not run `vercel link`.** The existing project link is correct; an earlier session's "stale orgId" diagnosis was wrong and has been retracted.

### API — Railway

`railway.json` builds with NIXPACKS and starts with `npx prisma migrate deploy && npm run start:prod`, so **migrations run on every boot and the app only starts if they succeed**. Deploy with `railway up --detach`.

**Deploy the API before the frontend** when a change spans both, so the frontend never ships calls to routes that are not live yet.

**There is no `/health` endpoint** — use `GET /categories` as a liveness probe.

### Current deployment status

Both are deployed and **current** as of 2026-09-28 — the API from `main` via `railway up`, and the frontend serving a bundle byte-identical to a local build of `main`. Neither platform auto-deploys from GitHub, so re-verify after any new commit. See [`CURRENT_STATE.md`](docs/my-andijan/CURRENT_STATE.md).

## Documentation

| Document | Covers |
| --- | --- |
| [`HANDOFF_INDEX.md`](docs/my-andijan/HANDOFF_INDEX.md) | **Start here** — entry point, current status, priorities |
| [`MASTER_CONTEXT.md`](docs/my-andijan/MASTER_CONTEXT.md) | Product vision, users, scope, decisions, constraints |
| [`CURRENT_STATE.md`](docs/my-andijan/CURRENT_STATE.md) | What works, what doesn't, known bugs, technical debt |
| [`ARCHITECTURE.md`](docs/my-andijan/ARCHITECTURE.md) | Actual architecture across both repos |
| [`TECH_STACK.md`](docs/my-andijan/TECH_STACK.md) | Exact declared and installed versions |
| [`DATABASE.md`](docs/my-andijan/DATABASE.md) | All 31 models, field by field |
| [`API.md`](docs/my-andijan/API.md) | All 118 endpoints, with frontend-usage markers |
| [`FRONTEND.md`](docs/my-andijan/FRONTEND.md) | Pages, components, state, UX issues |
| [`FEATURES.md`](docs/my-andijan/FEATURES.md) | Feature matrix with explicit statuses |
| [`SEO.md`](docs/my-andijan/SEO.md) | SEO implementation and prioritised gaps |
| [`AI.md`](docs/my-andijan/AI.md) | AI features (there are none) and why |
| [`DESIGN_SYSTEM.md`](docs/my-andijan/DESIGN_SYSTEM.md) | Tokens, primitives, motion, UX decisions |
| [`INTEGRATIONS.md`](docs/my-andijan/INTEGRATIONS.md) | Every external service and its status |
| [`ENVIRONMENT.md`](docs/my-andijan/ENVIRONMENT.md) | Every environment variable (names only) |
| [`SECURITY.md`](docs/my-andijan/SECURITY.md) | Security review and remediation plan |
| [`ROADMAP.md`](docs/my-andijan/ROADMAP.md) | NOW / NEXT / LATER, tagged by provenance |
| [`DECISIONS.md`](docs/my-andijan/DECISIONS.md) | 52 recorded decisions with lock status |
| [`TODO.md`](docs/my-andijan/TODO.md) | Consolidated task list |
| [`SESSION_CONTEXT.md`](docs/my-andijan/SESSION_CONTEXT.md) | Recovered development history |
| [`CHATGPT_CONTEXT.md`](docs/my-andijan/CHATGPT_CONTEXT.md) | Operating brief for ChatGPT as architect/reviewer |
| [`SSG.md`](docs/SSG.md) | Prerendering plan (deferred, with a written path) |
| [`CLAUDE.md`](CLAUDE.md) | Working contract for AI agents |

## References

- Production site — https://myandijan.uz
- Production API — https://myandijan-api-production.up.railway.app
- API docs (Swagger) — https://myandijan-api-production.up.railway.app/docs *(currently public — see [`SECURITY.md`](docs/my-andijan/SECURITY.md))*
