# DESIGN_SYSTEM — My Andijan

> Documents **only what exists in code or is explicitly specified**. There is no Figma file, no brand guideline document, and no design-token export in either repository. The design system *is* `tailwind.config.ts`, `src/index.css`, `src/lib/motion-config.ts` and the `components/ui/` primitives.

---

## 1. Foundations

**Dark-only.** `src/index.css`:

```css
html { color-scheme: dark; }
body {
  margin: 0;
  background-color: #0b1120;
  font-family: "Inter", system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#root { min-height: 100vh; }
```

**There is no light theme and no theme switcher.** `color-scheme: dark` tells the browser to render form controls and scrollbars dark. The `body` background is set explicitly rather than relying on a utility class, so there is no flash before CSS loads.

---

## 2. Colour

All tokens from `tailwind.config.ts` → `theme.extend.colors`. These are the complete set — there are no others.

### 2.1 Surfaces (a four-step elevation ladder)

| Token | Hex | Use |
| --- | --- | --- |
| `base` | `#0B1120` | page background |
| `surface` | `#111827` | section background |
| `card` | `#1E293B` | card background |
| `elevated` | `#243447` | inputs, raised elements |
| `border` | `rgba(255,255,255,0.08)` | default hairline |

In practice components often write the border opacity inline as `border-white/[0.08]` or `/[0.10]` rather than using the `border` token — so **both spellings exist in the codebase** and the token is not consistently the single source.

### 2.2 Text

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#F8FAFC` | primary text |
| `ink-body` | `#CBD5E1` | body copy |
| `ink-muted` | `#94A3B8` | secondary, labels, placeholders |

### 2.3 Accents & semantics

| Token | Hex | Use |
| --- | --- | --- |
| `primary` | `#3B82F6` | primary actions, links, focus |
| `accent` | `#06B6D4` | secondary accent |
| `secondary` | `#8B5CF6` | tertiary accent |
| `success` | `#10B981` | open now, approved |
| `warning` | `#F59E0B` | pending |
| `danger` | `#EF4444` | errors, rejected, closed |

### 2.4 Monetization palette

Added with the premium UI. The config comments the intent:

> *"Monetization palette. The app's existing dark/blue theme stays the base; these are the accents that mark paid placements so 'premium' reads instantly without re-theming every existing surface."*

| Token | Hex | Use |
| --- | --- | --- |
| `gold` | `#FFD700` | Premium/Featured tier |
| `gold-deep` | `#B8860B` | gold gradients, borders |
| `silver` | `#C0C7D0` | mid tier |
| `bronze` | `#CD7F32` | entry tier |
| `navy` | `#1A3A5C` | brand navy (from the spec's *"deep navy primary"*) |
| `brand-green` | `#2E7D32` | brand green accent |

> **Unresolved tension worth knowing.** The user's design spec asked for *"deep navy primary (#1a3a5c), green accent (#2e7d32), gold premium (#ffd700)."* Gold was adopted as specified, but `navy` and `brand-green` were added **alongside** the existing `primary #3B82F6` rather than replacing it. So the app has two competing brand-colour stories: the shipped blue/cyan theme, and the specced navy/green one that exists as unused-or-lightly-used tokens. **Nobody has decided which wins.** Flagged in `DECISIONS.md` as revisitable.

---

## 3. Typography

| | |
| --- | --- |
| Family | `Inter` → `system-ui` → `sans-serif` |
| Loading | Google Fonts in `index.html` with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` (`crossorigin`), weights **400, 500, 600, 700, 800**, `display=swap` |
| Scale | **Tailwind defaults** — no custom `fontSize` scale is defined |
| Smoothing | `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale` |

Observed conventions:
- Buttons: `font-semibold`
- Badges: `text-[10px] font-bold uppercase tracking-wider`
- **Inputs: `text-base` (16px)** — deliberately, to stop iOS Safari zooming on focus. **Do not reduce input font size below 16px.**

---

## 4. Spacing & layout

- **Tailwind's default spacing scale**, unmodified.
- One layout override: `maxWidth["7xl"] = "80rem"` (1280px) — the page container width.
- No custom container plugin, no grid system beyond Tailwind utilities.

---

## 5. Radii & shadow

| Token | Value | Use |
| --- | --- | --- |
| `rounded-card` | `16px` | cards, modals, panels |
| `rounded-btn` | `12px` | buttons, inputs |
| `rounded-badge` | `999px` | pills, badges |

```
shadow-card: 0 4px 6px -1px rgba(0,0,0,0.5),
             inset 0 1px 0 0 rgba(255,255,255,0.05)
```

One token combining an outer drop shadow with an **inset top highlight** — the inset line is what gives cards a lifted edge against the dark background. It is the whole "glassmorphism" effect referenced in commit `dcadc6a` (*"v2.1-premium: glassmorphism, gradient buttons, hero glow, count-up stats"*).

---

## 6. Buttons — `components/ui/Button.tsx`

**3 variants × 4 sizes.**

| Variant | Classes |
| --- | --- |
| `primary` (default) | `bg-primary hover:bg-blue-400 text-white` |
| `secondary` | `bg-card border border-white/[0.10] text-ink hover:border-primary/30` |
| `ghost` | `text-ink-muted hover:text-ink hover:bg-card` |

| Size | Classes |
| --- | --- |
| `sm` | `h-8 px-3 text-xs` |
| `md` (default) | `h-10 px-4 text-sm` |
| `lg` | `h-12 px-6 text-base` |
| `block` | `w-full h-10 px-4 text-sm` |

Base: `inline-flex items-center justify-center gap-2 font-semibold rounded-btn transition-all duration-150 select-none active:scale-[0.97]`

Notes: `gap-2` means an icon child needs no extra spacing. `active:scale-[0.97]` gives every button a press affordance. **There is no `disabled:` styling and no loading state** — callers handle both ad hoc, which is why loading buttons across the app look inconsistent (e.g. the signup CTA showing "Kutilmoqda...").

---

## 7. Cards — `components/ui/Card.tsx`

```
rounded-card bg-card border border-white/[0.08] shadow-card overflow-hidden
transition-[border-color,box-shadow] duration-200
```

With `interactive`:
```
cursor-pointer hover:border-primary/40
hover:shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(59,130,246,0.15)]
```

**Two deliberate constraints, both documented in the file, both load-bearing:**

1. **`interactive` contains no transform.** *"transforms are owned by AnimatedCard's spring. If this preset also applied hover:-translate-y / active:scale, the two would stack (a ~-6px lift) and a 200ms CSS transition would race the spring, which reads as sluggish."*
2. **The transition is scoped to `border-color, box-shadow`, not `all`** — *"so a CSS transition can never end up animating a transform that Framer drives."*

**Do not change either of these to `transition-all` or add a hover transform.** It reintroduces a subtle, hard-to-diagnose jank.

Card variants elsewhere: `FeaturedListingCard` (gold gradient border + ribbon), `RestaurantCard` (`h-32` cover, overlay badges), `BusinessListCard`, `PlanCard`, `KpiCard`, `ChartCard`.

---

## 8. Badges — `components/ui/Badge.tsx`

**7 tones**, all following one formula: `bg-<colour>/[0.12]`, a lighter text shade, `border-<colour>/20`.

| Tone | Classes |
| --- | --- |
| `blue` | `bg-primary/[0.12] text-blue-300 border-primary/20` |
| `cyan` | `bg-accent/[0.12] text-cyan-300 border-accent/20` |
| `purple` | `bg-secondary/[0.12] text-purple-300 border-secondary/20` |
| `neutral` (default) | `bg-white/[0.05] text-ink-muted border-white/[0.10]` |
| `success` | `bg-success/[0.12] text-success border-success/20` |
| `danger` | `bg-danger/[0.12] text-danger border-danger/20` |
| `amber` | `bg-warning/[0.12] text-warning border-warning/20` |

Base: `inline-flex items-center gap-1 rounded-badge px-2 py-[3px] text-[10px] font-bold uppercase tracking-wider border`

**`PremiumBadge` is separate** and does not use these tones — it carries the gold/silver/bronze tier treatment plus an animated "Top Rated" flame variant. `OpenNowBadge` uses `success`/`danger`.

---

## 9. Forms

**There is no `Input`, `Select`, `Textarea` or `Label` primitive.** Input styling is duplicated as string constants in several places. The recurring shape:

```
h-12 bg-elevated border border-white/[0.10] rounded-xl px-4
text-ink placeholder:text-ink-muted outline-none focus:border-primary/50
```

Found as `inputClasses` in `AdminSettingsView` and `dashboard/views/SettingsView`, and exported as **`FIELD_CLASSES` from `pages/claim/StepShell.tsx`** so all 8 claim steps match.

**This is the clearest gap in the design system.** Extracting a real `Input` primitive would remove the duplication and give focus/error/disabled states one home.

Other form pieces:
- `FormField` (`pages/dashboard/addBusiness/`) — label + field + error wrapper, used by the add-business flow
- `OtpInput` — 6 segmented boxes, the most thoroughly built input in the app (paste, arrow keys, backspace-then-walk-back, `autoComplete="one-time-code"`, error shake)
- `StepIndicator` — used by add-business; **deliberately absent from signup and claim**
- `AvatarPicker`, `SortDropdown`, `FilterSelect`, `FilterPills`, `CuisineChips`

---

## 10. Navigation

| Component | Pattern |
| --- | --- |
| `Header` | Logo, search entry, language switcher, auth entry |
| `MobileNav` | Fixed bottom bar on small screens |
| `Footer` | Secondary links |
| `Sidebar` / `AdminSidebar` | Persistent left nav (desktop dashboards) |
| `MobileDrawer` / `AdminMobileDrawer` | Slide-over equivalents |
| `TopBar` / `AdminTopBar` | Dashboard headers |

Active-state motion uses `TRANSITIONS.indicatorSpring`.

---

## 11. Icons

**`lucide-react`** exclusively. Two notable choices:

- **`Category.icon` in the database stores a lucide icon name** (VarChar 60) — so the backend chooses which icon a category shows, and `src/lib/categoryVisuals.ts` maps categories to icon + colour treatments on the frontend.
- Icons are **tree-shaken into their own lazy chunks** — the build output contains per-icon chunks (`star-*.js`, `map-pin-*.js`, `phone-*.js`, `heart-*.js`, …), which is why the lazy-chunk manifest is long.

Static assets: `public/favicon.svg`, `public/icons.svg`.

---

## 12. Responsive breakpoints

Tailwind defaults. Actual usage across `src/`:

| Prefix | Min width | Uses |
| --- | --- | --- |
| `sm:` | 640px | **88** |
| `md:` | 768px | **38** |
| `lg:` | 1024px | **48** |
| `xl:` | 1280px | **0** |
| `2xl:` | 1536px | **0** |

**Mobile-first, and nothing adapts above 1024px.** Content is capped by `max-w-7xl` (1280px) and centred, so wide screens get whitespace rather than a wider layout — acceptable, but a deliberate limit rather than a considered design.

`useMediaQuery` exists but is used in exactly **one** place (`AnalyticsView`); everything else is pure CSS.

---

## 13. Animation

`src/lib/motion-config.ts` is the single source of motion timing — *"Every motion component imports from here rather than hardcoding numbers, so timing is tuned in one place."*

**Easing:** `EASE_OUT_EXPO = [0.32, 0.72, 0, 1]`

**Presets:**

| Name | Value |
| --- | --- |
| `fast` | 0.15s, ease-out-expo |
| `smooth` | 0.3s |
| `spring` | spring, stiffness 300, damping 25 |
| `modalSpring` | spring, duration 0.4, bounce 0.3 |
| `indicatorSpring` | spring, duration 0.35, bounce 0.2 |
| `pageEnter` / `pageExit` | 0.2s / 0.1s |
| `reveal` | 0.5s |
| `staggerItem` | 0.3s |
| `hero` | 0.6s |
| `INSTANT` | `{ duration: 0 }` — used whenever motion is suppressed |

**Why two kinds of spring**, from the file: *"`spring` is physics-based (interruptible, ideal for hover gestures). `modalSpring` and `indicatorSpring` are duration-based springs: they keep the spring feel but are guaranteed to settle within a bounded time, so a slow CPU or a throttled frame loop cannot leave them stranded mid-flight."*

### Reduced motion — a first-class concern

1. **`MotionConfig reducedMotion="user"`** wraps the entire app in `App.tsx`, so **every** Framer Motion animation honours `prefers-reduced-motion` without individual components opting in.
2. **`useShouldAnimate()`** — reactive hook, so components re-render when the preference flips mid-session.
3. **`prefersReducedMotion()`** — non-reactive read for use outside React. Exported as a *function*, not a constant, on purpose: *"a constant captured at import time cannot notice the user changing the preference mid-session."*
4. **`useMotionTransition()`** returns `INSTANT` under reduced motion.
5. **`staggerContainerVariants()`** zeroes the stagger under reduced motion.
6. **`motionDebug()`** logs only when `import.meta.env.DEV` — stripped from production.

**Motion components:** `AnimatedCard` (hover spring), `PageTransition`, `StaggerContainer` + `STAGGER_ITEM_VARIANTS` (`{opacity: 0, y: 20}` → `{opacity: 1, y: 0}`), `SafeScrollReveal` (**with a 3000 ms watchdog**), `Sparkline`, `TrafficChart`, count-up stats in `StatsStrip`.

---

## 14. Design patterns

| Pattern | Where |
| --- | --- |
| Skeleton loading | `Skeleton`, used throughout |
| Empty states | `EmptyState` (icon + title + body) |
| Modals | `UpgradeModal`, `EditBusinessModal`, `ProductModal`, `CategoryModal`, `AuthModal` — all `modalSpring` |
| Bottom sheets / drawers | `MobileDrawer`, `AdminMobileDrawer` |
| One-field-per-screen wizard | signup (3), claim (8) — **no progress indicator** |
| Multi-step with indicator | add-business (3) — **with** `StepIndicator` |
| Split-screen live preview | claim: `grid lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]`, preview `lg:sticky lg:top-24` |
| Filter pills / chips | `FilterPills`, `CuisineChips` |
| Data tables | `DataTable` (admin) |
| KPI cards | `KpiCard`, `ChartCard` |
| Fetch-state wrapper | `AdminFetchState` + `useAdminResource` |
| Error boundary + chunk recovery | `ErrorBoundary` |

---

## 15. Important UX decisions

Recovered from code comments, commits and session history. These were chosen, not defaulted into.

1. **No progress bar in the signup and claim flows.** Taken from Yelp research — hiding the step count reduces drop-off. **Do not add one.** (Add-business keeps its indicator because it is a logged-in owner task, not an acquisition funnel.)
2. **Phone-first, never email-first.** Correct for the Uzbek market.
3. **Account is created at the OTP step**, so the profile step is genuinely skippable — progressive profiling rather than a long upfront form.
4. **Skip button on every optional screen.**
5. **Legal consent as text above the CTA, not a checkbox.** Fewer taps, same disclosure.
6. **Social login placed *above* the phone field**, with a "yoki" divider — Yelp's ordering. Currently non-functional, and therefore currently the first thing a new user sees and cannot use.
7. **"Bepul" (free) in every claim headline.** The single strongest conversion lever for getting owners to claim.
8. **Action-oriented CTA copy** — "Davom etish" (continue), not "Ro'yxatdan o'tish" (register).
9. **16px inputs** to prevent iOS zoom.
10. **Reduced motion honoured globally**, not per component.
11. **Card hover is colour/shadow only**; transforms belong to Framer.
12. **`AnimatePresence mode="wait"` is banned for screen transitions.** It caused a silent deadlock in the signup flow — the state advanced while the UI kept showing the old screen, because it waited on an exit-animation callback that never fired. Replaced with a keyed `motion.div`: the entering screen animates and nothing waits on the leaving one. **This is the most expensive bug the project has hit. Do not reintroduce the pattern.**
13. **Editing happens in a modal, in place** — which is why `/dashboard/business/:id/edit` is now a redirect.
14. **Business preview in the claim flow composes `HeroImage` + `BusinessInfoHeader`** rather than reusing `BusinessDetailPage`, because that page fetches its own data.

---

## 16. What the design system is missing

| Gap | Impact |
| --- | --- |
| **No `Input`/`Select`/`Textarea`/`Label` primitives** | Input classes are copy-pasted in at least three places |
| **No `disabled` or loading state on `Button`** | Every caller improvises; loading buttons look inconsistent |
| **No focus-visible ring convention** | Inputs use `focus:border-primary/50`; buttons define nothing → keyboard-only users get inconsistent affordances |
| **No documented type scale** | Sizes are chosen per component from Tailwind defaults |
| **No light theme** | Locked to dark by `color-scheme` and an explicit `body` background |
| **Two competing brand palettes** | Shipped blue/cyan vs. specced navy/green — undecided |
| **No `Toast`/`Alert` primitive** | Toasts are **hand-rolled per view** — `AdminBusinessesView` and others each keep `useState<{tone, text}>` plus a 3000 ms `setTimeout`, duplicated ~43 times across `src/`. Commit `dcadc6a` mentions "sonner toasts", and **`sonner` is present in `node_modules` but is NOT declared in `package.json` and is NOT imported anywhere** — an orphaned install that a clean `npm ci` would drop. Extracting a real toast primitive is a clear win. |
| **No accessibility audit** | Reduced motion is handled well; contrast, focus order, ARIA and screen-reader behaviour are unverified |
| **`border` token inconsistently used** | Components frequently inline `border-white/[0.08]` instead |
| **Nothing above `lg`** | No design intent for wide screens |
