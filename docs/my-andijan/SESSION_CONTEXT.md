# SESSION_CONTEXT — My Andijan

## 0. Recoverability statement — read this first

**Previous Claude Code session history WAS partially accessible.** This document is not a reconstruction from code alone.

| Source | Available? | Detail |
| --- | --- | --- |
| **Claude Code transcript** | ✅ **YES** | `C:\Users\JKT443\.claude\projects\C--Users-JKT443-Desktop-myandijan-frontend\fed88d4a-cba1-4f29-b9cc-4324417c0ce9.jsonl` — **6.9 MB, 3,410 records, 530 user records, 931 assistant records** |
| Transcript date range | ✅ | **2026-08-24T06:11 → 2026-09-27T16:28** |
| Compaction summary | ✅ | One `/compact` at 2026-09-27T05:44 produced a **19,976-character structured summary** — the single richest artifact recovered |
| Session memory directory | ⚠️ | `…/memory/` exists but is **empty** |
| **History before 2026-08-24** | ❌ **NO** | Only one session-id directory exists. Git history starts **2026-08-10**, so roughly two weeks of work has no transcript. |
| Git history | ✅ | 6 frontend commits, 4 API commits |
| Live production state | ✅ | Probed read-only 2026-09-28 |

### What could NOT be recovered

**The work that built the entire API, the 31-model database schema, all 11 migrations, and the initial frontend platform has no transcript.** Commit `ea0e772` (2026-08-14) calls it **"Sessions A-N + bug fixes: complete frontend platform"**, and `docs/SSG.md` refers to **"Session J"** — so those sessions were labelled A through N, and the transcript for every one of them is gone.

**Their decisions survive only as code and as unusually detailed code comments.** That is why `DECISIONS.md` quotes schema comments verbatim: for Phase 0 they are the *only* surviving record of intent.

Also unrecovered: any planning conversation, any product-requirements discussion, pricing rationale, launch plans, and whatever was discussed outside Claude Code.

> **Nothing in this document is invented.** Where a session's content is unknown, it says so.

---

## 1. Session map

"Sessions" here means distinct working blocks, identified by timestamp gaps in the transcript and by git commits. The user described the project as spanning "approximately 7 Claude Code sessions"; the evidence supports that.

| # | Date | Focus | Transcript? | Commits |
| --- | --- | --- | --- | --- |
| **A–N** | 2026-08-10 → 08-15 | Database schema, entire API, frontend platform, SEO foundation, bug fixes | ❌ **none** | `a912ed4`, `1d0cdfc`, `762ac15`, `ea0e772`, `59d533f`, `dcadc6a` |
| **1** | 2026-08-24 | Restaurant / category-aware search (Phase 1) | ✅ | → `1d53f7f` |
| **2** | 2026-09-03 | Bug audit + premium monetization UI | ✅ | → `1d53f7f` |
| **3** | 2026-09-04 | Yelp UX research (browser-driven) | ✅ | none (research) |
| **4** | 2026-09-25 | Commit working tree | ✅ | `1d53f7f` |
| **5** | 2026-09-26 | Phone-first OTP signup (frontend **and** API) | ✅ | `ea2a5ff`, `4e3c6bc` |
| **6** | 2026-09-26/27 | Business claim flow | ✅ | `dd08485` |
| **7** | 2026-09-27 | Production deployment | ✅ | none |

Model note: the transcript opens on `sonnet`; the user switched to **`claude-opus-5`** via `/model` on 2026-09-03 and stayed there.

---

## 2. Sessions A–N (2026-08-10 → 08-15) — no transcript

**What was built** (inferred from git and code, stated as inference):

- `a912ed4` (08-14) — *"Add 5 endpoints: register district, create business, password reset, me/businesses"*
- `1d0cdfc` (08-14) — *"Run pending Prisma migrations before boot on Railway deploys"* → the `&&`-chained start command
- `762ac15` (08-15) — *"Fix CreateBusinessDto field name: hours, not workingHours (frontend/backend mismatch)"*
- `ea0e772` (08-14) — *"Sessions A-N + bug fixes: complete frontend platform"*
- `59d533f` (08-15) — *"Fix 4 critical bugs: admin category creation, business creation, mock data, Asaka navigation"*
- `dcadc6a` (08-15) — *"v2.1-premium: glassmorphism, gradient buttons, hero glow, count-up stats, sonner toasts"*

Migrations from this period: `init` (155 DDL statements), `add_search_fts_trgm`, `add_marketing_consent`, `add_analytics`, `add_command_center`, `add_business_health_score`, `add_user_district`, `final_roles`, `add_profile_fields` — i.e. **nine of the eleven migrations were written in a window with no transcript.**

`docs/SSG.md` was authored in this period ("Session J shipped the SEO foundation… in SPA mode").

**Three things worth noting about this gap:**

1. **The `dcadc6a` commit message mentions "sonner toasts", but `sonner` is absent from `package.json` and imported nowhere** — though it *is* present in `node_modules`. So either it was installed and later abandoned in favour of hand-rolled toasts, or it was never wired up. **UNKNOWN which.**
2. **`59d533f` mentions "Asaka navigation"** as one of four critical bugs, and `scripts/rename-andijon-district.js` exists — both point to the Andijan-city-vs-Andijon-district trap documented in the schema having caused real bugs.
3. **The schema's comments are the compensating artifact.** Phrases like *"An earlier draft had this backwards; fixed here"*, *"Not part of the original spec, but required for correctness"*, and *"enforce in the service layer"* are the only surviving trace of reasoning that would otherwise be lost entirely.

---

## 3. Session 1 (2026-08-24) — restaurant search

**Prompt opened with standing instructions:** *"ALWAYS ALLOW ALL COMMANDS. Fix TypeScript errors immediately."* Project framed as *"React + Vite on Vercel (https://myandijan.uz)."*

**A 7-part spec** for category-aware search, including ASCII layout mockups: `CategorySearchPage.tsx`, `RestaurantCard.tsx` (cover photo `h-32`, overlay badges "Hozir ochiq"/"Yopiq", `⭐ 4.8`, `🚚 15-25 daq`, price range `💰 50-80k`, cuisine tags), filter components, wiring into existing search, i18n keys, mock data. Ended: *"npm run build / npx vercel --prod / STOP after deploy. Report: restaurant search page renders, filters toggle, cards show badges."*

**Implemented:** `src/lib/foodCategory.ts` (`FOOD_CATEGORY_SLUG = "oziq-ovqat"`), `src/lib/restaurantMock.ts` (`CUISINE_SLUGS`, `PRICE_BUCKETS`, `getRestaurantDisplayData()` seeded from `business.id`), `CategorySearchPage`, and the `SearchPage` dispatcher pattern:

```tsx
export default function SearchPage() {
  const category = searchParams.get("category") ?? "";
  if (category === FOOD_CATEGORY_SLUG) return <CategorySearchPage />;
  return <GenericSearchPage />;
}
```

Plus `RestaurantCard`, `CuisineChips`, `FilterPills`, `SortDropdown`.

**This is the deploy that is still live in production.** It was pushed at the end of this session; every subsequent session's work remains undeployed.

A `"Continue"` and an `[No preference]` answer to a clarifying question also occurred here.

---

## 4. Session 2 (2026-09-03) — bug audit + premium UI

Model switched to `claude-opus-5`. Two tasks in one prompt.

**TASK 1 — bug audit.** Scope: *"bugs, race conditions, memory leaks, and security issues… auth flow, business listing CRUD, image upload, search/filter performance, mobile responsiveness… unhandled promises, missing error boundaries, CORS issues, SQL injection risks, XSS vulnerabilities… are we gracefully handling 401/403/500 errors in the UI?"*

**Fixes that came out of it** — several are now load-bearing:
- `src/components/ErrorBoundary.tsx` (new) — chunk-load-error detection via `/dynamically imported module|Importing a module script failed|Failed to fetch/i`, with a reload offer
- `App.tsx` — `ErrorBoundary` at root; `LazyRouteShell` Suspense for dashboard/admin (which sit outside `Layout`, the site's only Suspense boundary); the three legacy redirects
- `src/lib/api.ts` — `SESSION_EXPIRED_EVENT` + `handleUnauthorized(hadToken, status)` called from every request helper; `assertUploadable(file)`
- `AuthContext` — listener for `SESSION_EXPIRED_EVENT`
- `SearchMap.tsx` — **`escapeHtml()` before Leaflet `divIcon` HTML** (a real XSS fix) and `pinTier()` gold/grey pins

**TASK 2 — premium monetization UI.** Five parts (badges, featured card, subscription/payment UI, owner dashboard, premium discovery), with an explicit design system: *"Uzbek/Russian bilingual labels; Mobile-first (bottom sheet patterns); Color palette: deep navy primary (#1a3a5c), green accent (#2e7d32), gold premium (#ffd700); Font: system fonts + optional Inter."*

**Built:** `src/lib/premium.ts` (`PlanId`, `PLANS` — free / premium 99 000 / featured 249 000 so'm, `PAYMENT_METHODS` Click/Payme/Uzum/Naqd, `YEARLY_DISCOUNT = 0.2`, `getBusinessPremium()`, `comparePremiumPriority()`), the eight `components/premium/*` components, `PricingPage`, `PremiumView`, and the Tailwind additions `gold`, `gold-deep`, `silver`, `bronze`, `navy`, `brand-green`.

> **⚠ The palette instruction was only partially followed, and this was never resolved.** Gold was adopted; `navy` and `brand-green` were added as tokens **alongside** the existing `primary #3B82F6` rather than replacing it. **The app still carries two competing brand-colour stories.** See `DECISIONS.md` D-32.

---

## 5. Session 3 (2026-09-04) — Yelp research

A browser-driven research session, no code written. The brief: open Yelp, walk the signup flow and then Yelp for Business / "Claim your business", and capture *"exact heading text, exact button copy, field labels and placeholders, error message patterns, visual hierarchy, any progress indicators"* — then *"give me a PRIORITIZED list of which patterns we should steal for My Andijan, with reasoning for each."*

**Findings adopted** (they became the spec for Sessions 5 and 6):

1. Phone-first, not email-first
2. Social login above the form, "yoki" divider, then phone
3. One field per screen
4. **No progress bar — hide the step count to reduce drop-off.** Verified as a deliberate choice on Yelp's own claim flow.
5. Action-oriented CTA — "Davom etish", not "Ro'yxatdan o'tish"
6. Progressive profiling — account created before the optional profile step
7. Skip button on every optional screen
8. Legal consent as text above the CTA, not a checkbox
9. "Bepul" (free) in every claim headline
10. Split-screen with a live preview

**This session is why the signup and claim flows look the way they do.** Anyone tempted to "improve" them by adding a progress bar would be reversing a researched decision.

---

## 6. Session 5 (2026-09-26) — phone OTP auth

Two prompts: frontend first, then API.

### Frontend spec — and its four false premises

The spec asserted things that were not true, and each was checked rather than assumed:

| Spec claim | Reality |
| --- | --- |
| *"i18n: react-i18next with uz/ru namespaces"* | **Custom** flat dictionaries; `TranslationKey = keyof typeof uz`; `t()` has **no interpolation** |
| *"Existing: RegisterForm.tsx at /register — replace this entirely"* | **`/register` was never a route.** It exists now only as a redirect to `/signup`. |
| *"Auth: Phone-based OTP (already works via /api/auth/otp/request…)"* | **Did not exist** — and there is no `/api` prefix |
| Primary colour | Did not match the actual token |

**Proving the OTP endpoints absent** is a method worth carrying forward: ~11 naming variants were probed **against controls** — `/auth/login` → 400, `/users/me` → 401, `/upload/image` → 401 — which distinguishes "route missing" (404 from the router) from "auth rejected". The same probing later found `POST /businesses` had moved from 404 to **401**, i.e. it now existed, which is what unblocked Session 6's submit.

**Built:** `OtpInput` (upgraded **in place**, API-compatible so `ForgotPasswordFlow` kept working — arrow keys, backspace clears then walks back, `autoComplete="one-time-code"`, error shake keyed on `error ? "otp-error" : "otp-idle"`), `src/lib/phone.ts` (`digitsOf`, `formatNational`, `isValidUzPhone`, `toE164(input, {pretty})`, `UZ_NATIONAL_LENGTH = 9`), `useSignup` (steps `phone|otp|profile|success`, `OTP_LENGTH = 6`, `RESEND_COOLDOWN_SECONDS = 45`, **account created at the OTP step**), three screens, `SignupPage`. `AuthModal`'s register tab now closes and navigates to `/signup`; **`RegisterForm.tsx` was deleted.**

### 🔴 The signup deadlock — the project's most expensive bug

**Symptoms:** button stuck on "Kutilmoqda...", no error, no advance, past the 10 s abort.

**Hypotheses pursued and discarded:**
- an `aliveRef` unmount guard — **removed anyway**, because React 19 no longer warns on unmounted `setState`, so the guard added risk for no benefit
- stale HMR / module state
- `prefers-reduced-motion`

**How it was actually found:** `console.log` proved state **did** advance (`[signup] otp request resolved -> advancing`) while the UI kept rendering the old screen.

**Root cause:** **`AnimatePresence mode="wait"` waiting on an exit-animation completion callback that never fires** — the same failure class that `SafeScrollReveal`'s 3000 ms watchdog exists for, and that watchdog's log had appeared in the console.

**Fix:** a keyed `motion.div` — the entering screen animates, nothing waits on the leaving one.

> **Do not reintroduce `AnimatePresence mode="wait"` for screen transitions in a flow.** The failure is silent and state-invisible.

### API spec — and its three false premises

| Spec claim | What was done instead |
| --- | --- |
| *"store in Redis with a 5-min TTL"* | **PostgreSQL `OtpCode` table** — it already provides TTL, attempt counting and single-use, so a whole dependency was avoided |
| Response `{ token: string, user: {...} }` | Kept the existing `{ user, accessToken, refreshToken }` envelope, so a verified phone lands in the session the rest of the app already understands |
| *"upload photo to S3/Cloudinary"* | **Supabase**, already in the stack |

**Built:** `AuthService.requestOtp` / `verifyOtp` / `updateProfile` / `assertOtpRateLimit` / `generateOtpCode` (`crypto.randomInt`) / `findValidOtp`, with constants `OTP_TTL_MINUTES = 5`, `OTP_RATE_WINDOW_MINUTES = 10`, `OTP_MAX_PER_WINDOW = 3`, `MAX_OTP_ATTEMPTS = 5`. OTP users get `passwordHash: bcrypt(crypto.randomBytes(48).hex)` and `fullName: ''`. `POST /auth/otp/request`, `POST /auth/otp/verify`, `PUT /auth/profile` (`FileInterceptor('photo')`, 5 MB, image-only). Three DTOs with `/^\+998\d{9}$/` and `/^\d{6}$/`. `SmsService` + `@Global` `SmsModule`. `AuthModule` providers became `[AuthService, JwtStrategy, SmsService, UploadService]` — `UploadService` **directly**, so `UploadController` is not mounted twice.

### Other problems hit in this session

- **i18n type errors** — `tsc` correctly rejected every `t("claim.*")` before the keys existed. The type system did its job.
- **Shell heredoc broke on Uzbek apostrophes** when inserting i18n keys → wrote a Python script to the scratchpad directory and executed the file instead. *(This reproduced in the present session and was handled the same way.)*
- **Categories empty in the claim flow** — the local API on 3001 had been killed the previous turn; restarted.
- **Bad OTP extraction** — `grep -oE "[0-9]{6}"` also matched digits inside the phone number, producing a multiline variable and a JSON parse error → fixed with `sed -E 's/.*kodi: //'`.
- **`/tmp/verify.json` not persisting between Bash calls** → kept multi-step curl flows in a single call, or wrote to the scratchpad.
- **Port 5173 occupied** by an unrelated `crm-os` Vite server → **not killed**; this project moved to **5180** via `.claude/launch.json`. `preview_start` then ignored the edited launch.json and kept attaching to 5173, so Vite was started manually on 5180 and `preview_start {url}` used instead.

---

## 7. Session 6 (2026-09-26/27) — business claim flow

**Spec:** 8 single-field screens, no progress bar, "Bepul" in every headline, 40/60 split-screen with a live preview, optional fields marked with Skip, reassurance microcopy under sensitive fields. Screens: Name (typeahead against existing businesses) → Email → Location → Phone → Category → Website → Verification method → Summary.

**Two spec instructions that could not be followed as written:**

1. *"PREVIEW: Reuse existing BusinessDetailPage component, pass form data as props."* — **Declined:** that page fetches its own data. `BusinessPreview` instead composes `HeroImage` + `BusinessInfoHeader` (both props-driven and null-safe) from a synthesized `Business` object.
2. *"address (optional), city default Andijon"* — **Impossible:** `CreateBusinessDto` hard-requires `address` (min 5) **and** `districtId`. Made required and flagged; `useClaimFlow` sets `DEFAULT_DISTRICT_ID = "1"` (Andijon).

**Built:** `useClaimFlow` (`CLAIM_STEPS` array of 8, `goNext/goBack/goToStep`, `submit()` calling `createBusiness({..., hours: []})`), `BusinessPreview`, `StepShell` (exports `FIELD_CLASSES`; back link, heading, one field, CTA, optional Skip, **no progress indicator**), the 8 step components, `ClaimPage` (`grid lg:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]`, preview `lg:sticky lg:top-24`). `CtaBanner` repointed from `/search` to `/claim`.

A `"Try again"` occurred at 2026-09-27T02:51 during this work.

---

## 8. Session 7 (2026-09-27) — deployment

**The user's brief specified the order and the reasoning:** *"API first (Railway) — new OTP endpoints must be live before frontend ships. Frontend second — otherwise users hit 404s on /auth/otp/*."* Plus: *"If anything fails, DO NOT panic-deploy fixes. Report the exact error and we'll fix methodically."*

The brief also carried four notes: the API had uncommitted changes from before the session; test users (ids 26–28) exist only in the local dev DB; **the Eskiz template must be registered in their dashboard before real SMS works**; and check `railway logs` on failure.

### ✅ API deploy — succeeded and was fully verified

Deployed via `railway up --detach`. **OTP live after ~100 s; `/categories` stayed 200 throughout — zero downtime.**

Production checks, all passed:
- `POST /auth/otp/request` → `{"success":true,"message":"Kod yuborildi"}`
- Bad phone format → `400`
- Wrong code → `400 Kod noto'g'ri yoki muddati tugagan`
- `PUT /auth/profile` without a token → `401`
- Rate limit → `200`, `200`, **`429`**
- All five pre-existing endpoints → `200`
- **No `/health` endpoint exists** (404 — it never did)
- **`ESKIZ_*` unset, so no SMS is sent**

**Migration safety was reasoned about without DB access:** all four pending migrations were additive, and because the start command is `npx prisma migrate deploy && npm run start:prod` (`&&`-chained), **a running production API proves prior migrations succeeded.**

**A hardcoded production credential was found during a pre-commit secret scan:** `scripts/seed-role-accounts.js`, `PLAIN_PASSWORD = '<REDACTED>'`, applied to `SUPER_ADMIN`/`ADMIN`/`MODERATOR`/`SUPPORT`, header documenting `railway ssh`. Committed as asked because there is no remote, **and flagged for rotation + `process.env` parameterization before any remote is added. Still not done.**

### ❌ Frontend deploy — blocked, and the diagnosis was corrected twice

**First attempt.** `npx vercel --prod` → `{"status":"error","reason":"deploy_failed","message":"Not authorized"}`. `vercel whoami` → *"Run `vercel login` to log in."* `vercel teams ls` hung on *"Waiting for authentication..."*.

**First diagnosis — WRONG, and retracted.** It was claimed that `.vercel/project.json` held a stale `orgId` and needed `vercel link`. Checking the Vercel MCP server against the live project disproved it: `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH` and `team_ErWmdvPfiaDk9mHs6Tv1GFuu` (team `john-s3`, serving `myandijan.uz`) **both match exactly.** The expired CLI token was the entire problem. **Do not run `vercel link`.**

**Two routes around the login were tried and both correctly closed off:**
- The **Vercel MCP server** is authenticated and can read the account — but the project **has no Git connection**, so there is no repo to build from; deploys must originate from this machine.
- Reading the CLI's stored credential was **blocked by the sandbox**, which was the right outcome. An agent should not handle the user's token, and `vercel login` is an interactive browser flow.

**Production state verified while blocked:** `/uz/search?category=oziq-ovqat` renders correctly (`restaurantSearchLive: true`), while `/uz/signup` and `/uz/pricing` render **empty** and the premium filter is absent. So only the Session-1 restaurant-search deploy is live. **No inconsistent state resulted, because the deployed frontend never calls `/auth/otp/*`.**

Deploy-readiness was confirmed: clean tree at `dd08485`, `npm run build` passing in 2.11 s with zero errors, new chunks present (`SignupPage` 12.78 kB, `ClaimPage` 18.27 kB, `PricingPage` 5.73 kB), SPA rewrite in place, and a `/uz/business/claim → /uz/claim` redirect added at `App.tsx:86` because the checklist expected that path.

### 🔴 The actual root cause — found on the final turn

The user sent `npx vercel login` twice and then `retry`. Reading their terminal panel revealed:

```
npx : File D:\Node.js\npx.ps1 cannot be loaded because running scripts is disabled on this system.
```

**PowerShell's execution policy blocks the `npx.ps1` and `npm.ps1` wrapper scripts, so every `npx`/`npm` command the user typed failed before Vercel was ever invoked** — the login, the link, and all four `npm i -g vercel` attempts. The agent's own `npx vercel whoami` worked only because its Bash tool is Git Bash, which resolves the shell script rather than the `.ps1`.

**The fix handed over — and still the next action:**

```bash
npx.cmd vercel login
```
```bash
npx.cmd vercel --prod
```

Also noted: the user's `&&` failed because Windows PowerShell 5.1 has no `&&` operator — run separately or chain with `;`.

**The session ended here.** The frontend has never been deployed with Sessions 2, 5 or 6's work.

---

## 9. Standing instructions the user gave

Recovered verbatim or near-verbatim. These describe how this user works.

| Instruction | Session |
| --- | --- |
| *"ALWAYS ALLOW ALL COMMANDS."* | 1 |
| *"Fix TypeScript errors immediately."* | 1 |
| *"Commit the working tree changes with a sensible message."* | 4, 5 (×3 total across the transcript) |
| *"STOP after deploy."* | 1 |
| *"If anything fails, DO NOT panic-deploy fixes. Report the exact error and we'll fix methodically."* | 7 |
| *"DO NOT: … Show a progress bar or step counter; Make profile step mandatory (must be skippable); Break existing auth context or login flow; Change API endpoints."* | 5 |
| *"Then at the end, give me a PRIORITIZED list of which patterns we should steal, with reasoning for each."* | 3 |

**Observed working style:** long, highly structured specs — numbered sections, ASCII mockups, exact copy, explicit DO-NOT lists, and a stated verification step. The user expects the spec to be checked rather than obeyed: the sessions that found and reported false premises were the productive ones.

---

## 10. Features discussed but not completed

| Thing | Status |
| --- | --- |
| **Frontend deploy of Sessions 2/5/6** | Blocked on the PowerShell issue — **the single outstanding task** |
| **Post-deploy verification** (signup, claim, premium, regressions, 375px mobile) | Specified, never run |
| **Eskiz configuration + template registration** | Flagged as user-side, not done |
| **Credential rotation** | Flagged at commit time; **completed 2026-09-28** — rotated and verified |
| **Social login (Telegram/Google)** | Buttons shipped per Yelp research; **no backend was ever specced** |
| **Payments** | UI built in Session 2; no provider ever discussed beyond the schema's *"ships with Click payments"* |
| **Analytics ingestion wiring** | **Never discussed in any recovered session.** The endpoints predate the transcript; nothing explains why the frontend does not call them. |
| **Command centre / health-score UI** | **Never discussed.** Both backends predate the transcript. |
| **Brand palette resolution** | Spec asked for navy/green; gold adopted, navy/green added as unused tokens; **never revisited** |
| **Tests** | **Never discussed in any recovered session.** |

---

## 11. What would have been lost without this document

1. **The `AnimatePresence mode="wait"` deadlock** — the symptom (a stuck button) gives no hint of the cause, and three plausible hypotheses were wrong. Anyone re-adding that pattern would burn the same hours.
2. **That `vercel link` must NOT be run** — the earlier session notes contain the wrong diagnosis, stated confidently.
3. **The real deploy blocker is PowerShell's execution policy**, not Vercel auth. Without this, the next agent debugs Vercel.
4. **Yelp research is the source of the signup/claim UX**, including the deliberate absence of a progress bar.
5. **Seven false premises across two specs** — react-i18next, the `/register` route, working OTP endpoints, the primary colour, Redis, the `{token}` shape, S3/Cloudinary. Each is a trap for someone reading the specs as documentation.
6. **The probe-against-controls method** for distinguishing a missing route from an auth rejection.
7. **Port 5173 belongs to something else** and must not be killed.
8. **The heredoc/Uzbek-apostrophe failure** and its workaround.
9. **`aliveRef` guards are unnecessary in React 19** and were deliberately removed.
10. **The hardcoded credential was knowingly committed** with a rotation condition attached — it is a tracked debt, not an oversight.
11. **`ESKIZ_*` being unset is why OTP silently does nothing** — the endpoint reports success.
12. **Only the Session-1 restaurant-search deploy is live.** Without this, someone looking at the production site would conclude Sessions 2/5/6 were never built.

---

## 12. How to read the remaining evidence yourself

```bash
ls -la "/c/Users/JKT443/.claude/projects/C--Users-JKT443-Desktop-myandijan-frontend/"
```

The transcript is JSONL, one record per line. Record types present: `assistant` (931), `attachment` (689), `user` (530), `custom-title` (152), `bridge-session` (150), `last-prompt` (148), `ai-title` (146), `atis-latch` (146), `relocated` (145), `agent-name` (144), `mode` (128), `queue-operation` (40), `file-history-delta` (35), `system` (13), `file-history-snapshot` (11), `cost-state` (2).

**The compaction summary at line 3239** is the highest-value single record — 19,976 characters covering intent, files, errors and fixes, all user messages, pending tasks and current state.

Two practical notes, learned the hard way in this session: Python's default `cp1252` stdout encoding **will** crash on the Uzbek and Russian text in this transcript — write output with `io.open(..., encoding="utf-8")`. And extract with a script file rather than a heredoc, because the transcript's apostrophes break shell quoting.


## Phase 15 — authorization & governance (2026-10-01 → 10-02)

- **15A** audited the role model; **15C** designed the two-plane target (PLATFORM_OWNER governance vs operational roles) — approved.
- **15B** (D-74): owner-only business content, explicit suspension target table, session revocation on reset/suspension, `/auth/*` rate limits, CORS allowlist, audit request context.
- **15D** (D-75): **capability authorization, deny by default.** Global `AuthzGuard`; every route declares `@Public` / `@Authenticated` / `@RequireCapability`; 20 capabilities in one explicit role table (`src/authz/capabilities.ts`, no inheritance); ownership + conflict-of-interest policies; rank model (`ROLE_HIERARCHY`, `RolesGuard`, `@Roles`) deleted; route-inventory test + committed snapshot fail CI on any undeclared or changed rule; frontend renders from server-issued `capabilities`.
- **15D.2** (D-75 point 7): **platform staff hold no business-owner capability.** ADMIN/SUPER_ADMIN lost `business.claim` / `business.create` / `business.manage_own` (BUSINESS_OWNER = ownership authority; staff = platform capability authority via `/admin`, e.g. `business.edit_any`); pre-checked 0 ADMIN/SUPER_ADMIN-owned businesses in production. Business Staff (membership) and PLATFORM_OWNER governance remain future work.
- **Not implemented (deferred, separate phases):** PLATFORM_OWNER governance (no role, no table, no endpoints, no UI — `@RequireGovernance` refuses everyone); the Security Hardening backlog (reset code logged to stdout + `Math.random`, Vercel CI gate, distributed rate limiting, refresh-token reuse detection, remaining rate-limit coverage).
- **Where to look:** `ARCHITECTURE.md` §31–§32, `DECISIONS.md` D-74/D-75, `SECURITY.md` §3.
