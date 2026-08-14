# Static generation / prerendering — deferred to Phase 2

**Status: not implemented.** Session J shipped the SEO foundation (sitemaps, JSON-LD, meta tags, robots, OG image) in SPA mode. Static generation was evaluated and deliberately deferred. This document records why, and exactly what Phase 2 needs to do.

## Why it was deferred

Adding Vike (formerly `vite-plugin-ssr`) is not a config-only change for this codebase. Three things in the current app are incompatible with rendering on the server, and all three need source changes that reach well past SEO:

1. **`App.tsx` hardcodes `BrowserRouter`.** Server rendering needs `StaticRouter` (fed the incoming URL) while the client needs `BrowserRouter` after hydration. As written there is no seam to swap them — `App` owns the router, so both entry points would get the browser one, and `renderToString` throws on the server.

2. **`LanguageProvider` reads `localStorage` during render** (`src/contexts/LanguageContext.tsx:28`). `AuthContext` does the same for the token. `localStorage` does not exist in Node, so the first render crashes before any markup is produced. These reads have to move into `useEffect` or be guarded by a `typeof window` check, which changes the first-paint language-resolution behavior and needs its own testing.

3. **Leaflet touches `window` at module scope.** `SearchPage` imports `react-leaflet`/`leaflet`; prerendering `/uz/search` would need the map island excluded from SSR (dynamic import with `ssr: false`, or a client-only boundary component).

Item 2 in particular is a behavior change to auth and language resolution. Doing it inside an SEO session risks breaking the working dev server and build — which the session brief explicitly ruled out — for a benefit that is currently small: the API returns zero businesses, so there is no long tail of content pages for crawlers to miss.

## What SPA mode already delivers

`react-helmet-async` injects `<title>`, description, canonical, hreflang alternates, OG/Twitter cards and JSON-LD into `<head>` after hydration. Googlebot renders JavaScript and picks these up. The costs of staying SPA-only are:

- Slower indexing — pages go through Google's render queue rather than being indexed on first fetch.
- Social scrapers (Facebook, Telegram, X, WhatsApp) **do not run JavaScript**. They see only the static `index.html`, so every shared link currently previews with the generic title from `index.html:13` and no per-page OG image.

That second point is the real cost, and it is the strongest argument for doing Phase 2 before launch rather than after.

## Phase 2 plan

Target routes for prerendering: `/uz/`, `/ru/`, `/en/`, `/uz/search`, `/ru/search`, `/en/search`, `/uz/events`, `/ru/events`, `/en/events`. Business detail pages stay on the SPA fallback until the API has real slugs.

### Step 1 — Make the router injectable

Split the shell out of `App.tsx` so the router is supplied by the entry point:

```tsx
// AppShell.tsx — everything inside the router, no router itself
export default function AppShell() {
  return (
    <HelmetProvider>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <Routes>{/* unchanged */}</Routes>
        </AuthProvider>
      </MotionConfig>
    </HelmetProvider>
  );
}
```

`main.tsx` wraps it in `BrowserRouter`; the server entry wraps it in `StaticRouter location={url}`.

Note `HelmetProvider` must move inside whichever entry renders, and the server needs its `context` object to read the collected tags back out — that is how the head markup gets into the emitted HTML.

### Step 2 — Make context providers SSR-safe

Guard every `localStorage` read:

```ts
const stored = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
```

Applies to `LanguageContext.tsx:28` and the token read in `AuthContext`. Confirm the hydrated result matches the server render, or React will log a hydration mismatch.

### Step 3 — Isolate the map

Load `SearchMap` via `lazy()` behind a mounted check so it never renders on the server:

```tsx
const SearchMap = lazy(() => import("./SearchMap"));
// render only when `mounted` is true
```

### Step 4 — Choose the generator

Two options, in order of preference:

- **`vite-plugin-prerender` / a post-build script.** After `vite build`, run the routes through `renderToString` and write `dist/uz/index.html` etc. Smallest blast radius: the dev server and the existing build stay exactly as they are, and the SPA keeps working if prerendering is turned off. Recommended.
- **Vike.** More capable (per-page data fetching, streaming), but it takes over routing and the build pipeline, and would mean rewriting `App.tsx`'s route table into Vike's file-based convention. Only worth it if server-side data fetching per route becomes a requirement.

### Step 5 — Hosting

Prerendered files need the host to serve `dist/uz/index.html` for `/uz/` while still falling back to `index.html` for unknown paths (business detail pages). On Netlify/Vercel this is a rewrite rule; on nginx it is `try_files $uri $uri/index.html /index.html`.

### Verifying it worked

```bash
curl -s https://myandijan.uz/uz/ | grep -o '<title>[^<]*</title>'
```

If the title comes back from `curl` — no JavaScript involved — prerendering is live. The same check against a business detail URL should return the generic fallback title, which is expected.
