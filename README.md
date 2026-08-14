# myandijan-frontend

Frontend for **MyAndijan** — a multilingual business directory for the Andijan region. Users browse and search local businesses on a map, view business detail pages with reviews, follow events, and save favorites. Business owners manage their listings through an owner dashboard, and staff manage the catalog through an admin dashboard.

Built with React 19 + TypeScript on Vite, styled with Tailwind CSS.

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

## Getting started

Requires Node.js 24+ (developed on Node 24.18, npm 11.16).

```bash
npm install
```

```bash
npm run dev
```

Vite serves the app at `http://localhost:5173`. The root path redirects to `/uz`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check the project (`tsc -b`) then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run Oxlint over the source tree |

## Configuration

Environment variables are read by Vite and must be prefixed with `VITE_`.

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | Base URL of the MyAndijan REST API | Falls back to the hosted production API in [`src/lib/api.ts`](src/lib/api.ts) |

Set it in a local `.env` file at the project root:

```bash
VITE_API_URL=http://localhost:8000
```

The auth token is stored in `localStorage` under `myandijan_token` and attached as a `Bearer` header by the API client. Requests time out after 10 seconds.

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
| `/:lang/dashboard` | Owner dashboard |
| `/:lang/dashboard/business/:id/edit` | Edit a listing |
| `/:lang/admin` | Admin dashboard |

`LangShell` provides the language context and the single shared auth modal for everything under `/:lang`. The marketing pages nest inside `Layout` (header, footer, mobile bottom nav); the dashboards are siblings with their own shells so they don't inherit that chrome. Routes are lazy-loaded so the initial bundle skips heavy dependencies like Leaflet until the search page is opened.

## Project layout

```
src/
  components/     Shared UI — ui/ primitives, auth/ forms, seo/ meta + schema
  contexts/       AuthContext, LanguageContext
  hooks/          Data-fetching and utility hooks (businesses, events, favorites, ...)
  i18n/           uz / ru / en dictionaries
  lib/            API client, theming, motion config, formatting helpers
  pages/          Route-level pages, grouped by area (home, search, business,
                  events, dashboard, admin)
  types/          Shared TypeScript types
public/           favicon.svg, icons.svg, robots.txt
```

## Internationalization

Translations live in [`src/i18n`](src/i18n) as flat key/value dictionaries, one module per language (`uz.ts`, `ru.ts`, `en.ts`). `uz` is the source of truth — `TranslationKey` is derived from it, so adding a key there makes TypeScript flag the other languages until they're filled in.

## Accessibility

`MotionConfig reducedMotion="user"` wraps the app, so every Framer Motion animation honors `prefers-reduced-motion` without individual components opting in.
