# DECISIONS — My Andijan

> A record of decisions that can be **recovered with evidence**, from: schema and code comments (the richest source), git history, and the Claude Code session transcript (2026-08-24 → 2026-09-27).
>
> **Coverage warning.** Decisions made before 2026-08-24 — which includes the entire database schema, the whole API, and the initial frontend platform ("Sessions A-N") — survive **only as code and comments.** No transcript exists for them. Where a rationale is quoted below, it is quoted from a code comment written at the time; where no rationale was recorded, this document says so rather than inventing one.
>
> **Lock status** is this reviewer's assessment of how safely a decision can be revisited, not a decree:
> - 🔒 **LOCKED** — reversing it means substantial rework or breaks something non-obvious
> - 🔓 **REVISITABLE** — a genuine open question, or a choice made under constraints that have since changed
> - ⚠️ **NEEDS DECISION** — never actually settled; two paths coexist in the codebase

---

## Phase 0 — Foundations (before 2026-08-24, no transcript)

### D-01 · Split `Business` (brand) from `Branch` (location) 🔒 LOCKED
**Decision.** `Business` holds brand identity only. **All** location data — district, city, address, landmark, phone, coordinates, hours — lives on `Branch`.
**Rationale (schema comments).** `Business` is the *"canonical brand entity — NO location data lives here"*; `Branch` is *"the geographically-located unit — ALL location queries route here."* A chain with several addresses is one listing, not five.
**Implementation.** `Business` 1→n `Branch`; `Branch` carries `districtId` (required), `cityId` (optional), `isPrimary`; seven indexes on `Business`, five on `Branch` including `[lat, lng]`.
**Alternatives.** Flattening location onto `Business` — simpler, but cannot represent chains.
**Why locked.** Search geo-filtering, reviews, hours, the map, and every index depend on it. Several endpoints ("the business's phone", "the business's hours") already resolve to the **primary branch** server-side.

### D-02 · Reviews are branch-scoped; favourites are business-scoped 🔒 LOCKED
**Rationale (schema).** Reviews: *"branch-scoped — service quality is location-specific."* Favourites: *"business-scoped — users favorite the brand, not an address."*
**Implementation.** `Review.branchId`; `Favorite.businessId`. `Business.ratingAvg` denormalizes across all branches, `Branch.ratingAvg` per branch.
**Why locked.** Changing either direction invalidates existing rows and both aggregate paths.

### D-03 · One review per user per branch as the primary anti-spam control 🔒 LOCKED
**Implementation.** `@@unique([branchId, userId])`, described in the schema as *"the primary anti-spam control."* Paired with `@@unique([reviewId, reporterId])` which *"prevents report-spam brigading."*
**Why locked.** It is a database constraint with rows behind it, and it is the only anti-spam control on reviews.

### D-04 · Vanilla PostgreSQL only — no proprietary extensions 🔒 LOCKED
**Rationale (schema header, verbatim).** *"PostgreSQL. Vanilla only — no proprietary extensions (data-localization portability requirement: DB must be relocatable to an Uzbek host)."*
**Implementation.** `pg_trgm` (standard contrib) is the only extension. **No PostGIS**, so no geospatial radius search or distance sorting.
**Consequences accepted.** Geo search must be done with plain columns or in application code; `pgvector` — and therefore embeddings-based search — is off the table.
**Why locked.** Stated as a legal/portability requirement, not a preference.
**Open tension, flagged honestly.** The constraint preserves *portability*, but the database currently runs on **Railway** and images on **Supabase** — neither Uzbek. If residency (not just portability) is the actual requirement, today's hosting does not satisfy it. **This needs an answer from the owner.**

### D-05 · `Int @default(autoincrement())` primary keys everywhere 🔒 LOCKED
**Rationale (schema).** *"ID strategy: Int @default(autoincrement()) — matches existing auth module, JWT payload, guards, and seed script."*
**Alternatives.** UUID/cuid — better for distribution and non-enumerable ids. Note `uuid@10` **is** a dependency but is not used for primary keys.
**Cost accepted.** IDs are enumerable, which matters for any public `:id` route.
**Why locked.** 31 models, 11 migrations, and `JwtPayload.sub: number` all assume it.

### D-06 · Localize the taxonomy, not the businesses 🔒 LOCKED (with a known cost)
**Decision.** `Category`, `Region`, `District`, `City`, `BusinessType`, `BusinessRecommendation` carry `nameUz`/`nameRu`/`nameEn`. `Business` and `Branch` carry a **single `name`**.
**Rationale.** Taxonomy is authored by the platform in three languages; business names are the business's own and are not translated.
**Cost, discovered later.** The frontend's types assumed localized businesses, producing blank names, missing contact details and `NaN` ratings — fixed by adding `normalizeBusiness()`/`normalizeBranch()` at the API boundary rather than patching every render site. See D-22.

### D-07 · `BusinessType` as capability rows, not hardcoded type branches 🔒 LOCKED
**Rationale (schema).** *"Capability rows, not hardcoded type branches — this is what lets the inventory/booking/ordering modules attach in Phase 2 with no core migration."*
**Implementation.** MVP flags `catalogEnabled`, `eventsEnabled`, `advertisingEnabled`; Phase-2 flags `inventoryEnabled`, `warehouseEnabled`, `bookingEnabled`, `deliveryEnabled`, `orderingEnabled` already present.
**Assessment.** Cheap foresight, correctly done — the flags cost nothing now and remove a migration later.

### D-08 · Extract `BusinessClaim`; remove `claimedAt`/`claimedById` 🔒 LOCKED
**Rationale (schema).** *"A business may be claimed, rejected, and re-claimed — that history is an entity, not two columns."* And: *"claim history now lives in business_claims. Ownership is expressed solely by ownerId, which is set when a claim is approved."*
**Known gap, documented at the time.** *"'only one PENDING claim per business' cannot be expressed as a Prisma unique constraint (needs a partial index) — enforce in the service layer."* Still unenforced at the database level.

### D-09 · Defer advertising to Phase 2, but keep the table 🔒 LOCKED
**Rationale (schema).** *"DEFERRED TO PHASE 2 (ships with Click payments). Table retained so the module attaches without a core migration. MVP promotion is handled by Business.isPromoted / isFeatured."*
**Signal worth noting.** "Ships with Click payments" is the only evidence anywhere of an intended **first payment provider**.

### D-10 · Command-centre log tables have no foreign keys 🔒 LOCKED
**Rationale (schema, verbatim).** *"These three tables are deliberately NOT foreign-keyed… they are high-volume, write-heavy append-only logs. Skipping FK constraints avoids a constraint check on every insert and means they never block deleting a business or user. Orphaned references are acceptable (and expected) in anonymized historical logs."*
**Applies to.** `PlatformMetric`, `SearchAnalytics`, `ActivityLog`.
**Note the asymmetry.** `BusinessAnalytics.businessId` **does** have an FK, and omits `onDelete`, so it defaults to `Restrict` — meaning a business with analytics rows cannot be deleted. Possibly unintended. 🔓

### D-11 · `ActivityLog` stores an `ipHash`, never a raw IP 🔒 LOCKED
**Rationale (schema).** Marked `PRIVACY:` — *"metadata stores an ipHash, never a raw IP address."*
**Why locked.** It is a privacy commitment and the standard any new logging should meet.

### D-12 · `AuditLog` separate from `ActivityLog` 🔒 LOCKED
**Rationale (schema).** *"AuditLog records privileged ADMIN actions for accountability, ActivityLog records ordinary (often anonymous) end-user behaviour for product analytics."* And on building it early: *"every sensitive admin action — cheap now, unbackfillable later."*

### D-13 · Health score recomputed on write, never on a cron 🔒 LOCKED
**Rationale (schema).** *"recomputed on write (see HealthScoreService — deliberately NOT a cron job). Both the owner dashboard and the founder health-overview read this single indexed row instead of re-deriving a dozen aggregates per business on every request."*
**Supporting choice.** The blend weights live in the **service**, not the schema, *"so they can be tuned without a migration"* — `profile 0.30`, `engagement 0.30`, `visibility 0.20`, `response 0.20`.
**Weighting rationale (worth preserving).** *"Profile and engagement carry more weight because they are the two the owner can move on their own; visibility is deliberately lighter since 50 of its 100 points (promoted + featured) are bought rather than earned, and a paid placement should not paper over a bad profile."*

### D-14 · Add `BusinessRecommendation.code` — a stable rule key 🔒 LOCKED
**Not in the original spec; added for correctness.** Rationale (schema): *"without a stable key, recalculation cannot distinguish 'the same recommendation as last time' from 'a new one', so it would either duplicate rows on every write or reset isCompleted. Titles are display copy and will be edited, so they cannot serve as the key."*
**Implementation.** `@@unique([healthScoreId, code])` makes recalculation an idempotent upsert; 14 catalogued codes.
**Honesty note kept in the schema.** The `impact*` strings *"are directional estimates chosen by the product, NOT measured lift — there is no experiment framework yet."*

### D-15 · Deprecate `SearchQueryLog` non-destructively 🔓 REVISITABLE (action pending)
**Rationale (schema).** Superseded by `SearchAnalytics`, *"a strict superset (adds clickCount)… Kept only so the migration is non-destructive — safe to drop once you've confirmed the backfill."*
**Action.** Confirm the backfill, then drop.

### D-16 · Model region-level cities with a nullable `districtId` + `isRegionLevel` 🔒 LOCKED
**Rationale (schema).** *"Cities sit INSIDE districts, EXCEPT region-level cities (Andijan city), which report directly to the region."* And the trap it exists to prevent: *"Andijan CITY is not Andijon DISTRICT (whose seat is Kuyganyor). Users searching 'Andijan' almost always mean the city."*
**Evidence it mattered.** `scripts/rename-andijon-district.js` is a one-off fix for exactly this confusion, and `prisma/seed.ts` re-explains it: 14 tumans + Andijon shahri = 15 units.

### D-17 · Role hierarchy as a floor check, not exact match ⛔ SUPERSEDED by D-75 (Phase 15D) — the rank model, `RolesGuard` and `@Roles` are deleted
**Rationale (guard comment).** *"@Roles(...) declares the FLOOR a caller must clear… so SUPER_ADMIN satisfies every @Roles(...) check without needing to be listed explicitly on each route."*
**Implementation.** `Math.min(...required)` then `userLevel >= requiredLevel`; `getAllAndOverride` lets a method override its class in **both** directions (down to `MODERATOR` for approve/reject, up to `SUPER_ADMIN` for hide).
**⚠️ Open sub-question.** `SUPPORT` (3) outranks `BUSINESS_OWNER` (2), so every `@Roles(BUSINESS_OWNER)` route is also open to support staff. **Never stated as intended or unintended.** See `SECURITY.md` §3.

### D-18 · `/auth/register` must reject `role=ADMIN` 🔒 LOCKED
**Rationale (schema, marked `SECURITY:`).** *"the public /auth/register endpoint MUST reject role=ADMIN. Admins are created via seed or promoted by an existing admin only."*
**Verified enforced.** `RegisterDto` uses `@IsIn([CUSTOMER, BUSINESS_OWNER])`.

### D-19 · Build the `OtpCode` table before OTP was needed 🔒 LOCKED
**Rationale (schema).** *"Built now, unused until Phase 2 (Eskiz SMS). Keeps OTP addable without rewriting auth."*
**Vindicated.** On 2026-09-26 OTP was added and the table was already right — no migration to the auth core was needed.

### D-20 · Custom i18n, not `react-i18next` 🔒 LOCKED
**Implementation.** Flat dictionaries in `src/i18n/{uz,ru,en}.ts`; `TranslationKey = keyof typeof uz`, so **`uz` is the compiler-enforced source of truth** — adding a key there fails the build until `ru` and `en` follow. Currently **385 keys × 3, exact parity.**
**Deliberate limitation.** **`t()` has no interpolation.** Callers use `.replace("{x}", value)`.
**Evidence it works.** During the claim flow, `tsc` *"correctly rejected every `t(\"claim.*\")` before the keys existed"* — the type system caught every missing translation before runtime.
**Note.** Two session specs asserted the project used `react-i18next`. Both were wrong and were corrected against the code.

---

## Phase 1 — Restaurant search & monetization UI (2026-08-24 → 2026-09-25)

### D-21 · Dispatch `/search` on `?category` rather than adding a route 🔒 LOCKED
**Decision.** `SearchPage`'s default export became a dispatcher; the original body was renamed `GenericSearchPage`.
**Rationale.** Keeps one URL (`/:lang/search?category=…`) while allowing a completely different UI for food. Existing links keep working.
**Cost.** `/uz/search?category=oziq-ovqat` is a query-string URL, not a path — weaker as an SEO landing page. See `SEO.md` §11. 🔓

### D-22 · Normalise API responses at the boundary 🔒 LOCKED
**Decision.** `normalizeBusiness()` / `normalizeBranch()` in `src/lib/api.ts`.
**Rationale (code comment).** The backend is not localized, keeps contact data on `Branch`, and sends `ratingAvg` as a string; the frontend types assumed otherwise — so adapt *"once, at the boundary — rather than every render site guessing at fallbacks."*
**Fixed three concrete bugs:** blank business names, missing phone/address on the detail page, `NaN` ratings.
**Why locked.** Removing it reintroduces all three.

### D-23 · Client-side filter/sort/paginate for restaurant search 🔓 REVISITABLE
**Decision.** `CategorySearchPage` fetches `limit=100` and paginates client-side at 12 per page.
**Rationale.** So the displayed result count and the current page always agree.
**Revisit when.** Food businesses exceed ~100 — at which point results silently truncate.

### D-24 · Deterministic mock display data for restaurants 🔓 REVISITABLE
**Decision.** `restaurantMock.ts` derives cuisine, price bucket, tags and delivery time from the fractional part of `Math.sin(id * k)`.
**Rationale.** The API has no such fields; deterministic seeding means a business always shows the same values rather than flickering.
**Cost, stated plainly.** Restaurant cards **in production** display invented cuisine, price and delivery information. Honest in code, invisible to users.
**Revisit.** Requires real backend fields on `Business` or `Product`.

### D-25 · Centralise 401 handling with an event 🔒 LOCKED
**Rationale (code comment).** Previously only `AuthContext`'s mount-time `getMe()` and `useFavorites` noticed a 401, so a mid-session expiry *"left the rest of the app… failing with generic errors while the UI still showed the user as logged in, with no way back other than manually logging out."*
**Implementation.** `handleUnauthorized(hadToken, status)` clears storage and fires `SESSION_EXPIRED_EVENT`; `AuthContext` listens.
**Subtlety preserved.** It *"only fires when a token was actually sent: a 401 from /auth/login is a wrong password, not an expired session."*

### D-26 · `escapeHtml()` before Leaflet `divIcon` HTML 🔒 LOCKED
**Rationale.** `divIcon` takes raw HTML, so API-sourced business names were an XSS vector. A real fix, not defensive decoration.

### D-27 · `ErrorBoundary` with chunk-error detection 🔒 LOCKED
**Decision.** Root-level class component matching `/dynamically imported module|Importing a module script failed|Failed to fetch/i` and offering a reload.
**Rationale.** After a deploy, a client holding the old bundle fails to fetch renamed chunks. A reload is the correct remedy and the user cannot know that.

### D-28 · Card hover is colour/shadow only — transforms belong to Framer 🔒 LOCKED
**Rationale (code comment).** *"If this preset also applied hover:-translate-y / active:scale, the two would stack (a ~-6px lift) and a 200ms CSS transition would race the spring, which reads as sluggish."* The transition is scoped to `border-color, box-shadow` *"so a CSS transition can never end up animating a transform that Framer drives."*
**Why locked.** Changing to `transition-all` reintroduces subtle jank.

### D-29 · `prefersReducedMotion` exported as a function, not a constant 🔒 LOCKED
**Rationale (code comment).** *"a constant captured at import time cannot notice the user changing the preference mid-session."*
**Paired with.** `MotionConfig reducedMotion="user"` at the app root, so every animation honours the preference without per-component opt-in.

### D-30 · Two kinds of spring preset 🔒 LOCKED
**Rationale (code comment).** `spring` is physics-based and interruptible for gestures; `modalSpring`/`indicatorSpring` are duration-based *"so a slow CPU or a throttled frame loop cannot leave them stranded mid-flight."*

### D-31 · Move dev server to port 5180 🔒 LOCKED (environmental)
**Rationale.** Port 5173 is occupied by an unrelated `crm-os` Vite server on this machine. It was **deliberately not killed**. Configured in `.claude/launch.json`.

### D-32 · Monetization palette added alongside, not replacing, the base theme ⚠️ NEEDS DECISION
**Decision.** Added `gold`, `gold-deep`, `silver`, `bronze`, `navy`, `brand-green` to Tailwind.
**Rationale (config comment).** *"The app's existing dark/blue theme stays the base; these are the accents that mark paid placements so 'premium' reads instantly without re-theming every existing surface."*
**Unresolved.** The user's spec asked for *"deep navy primary (#1a3a5c), green accent (#2e7d32)"*. Gold was adopted; navy and green were added as tokens but `primary` remains `#3B82F6`. **The app now carries two competing brand-colour stories and nobody has chosen.** See `DESIGN_SYSTEM.md` §2.4.

### D-33 · Pricing: 99 000 / 249 000 so'm, 20% yearly discount 🔓 REVISITABLE
**Source.** `src/lib/premium.ts` (recovered values). Payment methods surfaced: Click, Payme, Uzum, Naqd.
**No rationale was recorded** for the price points. Treat them as placeholders until validated.

---

## Phase 2 — Yelp research (2026-09-04)

### D-34 · Adopt Yelp's acquisition-funnel patterns 🔒 LOCKED
**Method.** A dedicated session drove a browser through Yelp's signup and business-claim flows, capturing exact copy, field order, CTA text and step progression, then produced a prioritised "what to steal" list.
**Patterns adopted:**
1. **Phone-first, not email-first**
2. Social login **above** the form, "yoki" divider, then phone
3. **One field per screen**
4. **No progress bar** — hiding the step count reduces drop-off
5. Action-oriented CTA ("Davom etish", not "Ro'yxatdan o'tish")
6. **Progressive profiling** — account created before the optional profile step
7. Skip button on every optional screen
8. Legal consent as **text above the CTA**, not a checkbox
9. **"Bepul" (free) in every claim headline**
10. Split-screen with a **live preview** of the resulting page

**Verified finding.** Yelp's business-claim flow *deliberately* has no progress indicator — mirrored in both new flows.
**Why locked.** These are researched conversion decisions, not aesthetic preferences. **Adding a progress bar would reverse a deliberate choice.**

---

## Phase 3 — Phone OTP auth (2026-09-26)

### D-35 · PostgreSQL for OTP storage, not Redis 🔒 LOCKED
**Spec asked for Redis with a 5-minute TTL.** Declined: the `OtpCode` table already provides TTL (`expiresAt`), attempt counting (`attempts`), and single-use (`usedAt`) — so a whole infrastructure dependency was avoided for no loss of function.
**Constants.** `OTP_TTL_MINUTES = 5`, `OTP_RATE_WINDOW_MINUTES = 10`, `OTP_MAX_PER_WINDOW = 3`, `MAX_OTP_ATTEMPTS = 5`.

### D-36 · Refresh tokens are opaque random bytes, not JWTs 🔒 LOCKED
**Implementation.** `crypto.randomBytes(48).toString('hex')`, stored as a SHA-256 hash in `RefreshToken.tokenHash`.
**Benefit.** A database leak yields no usable tokens; revocation is a row update.
**Artifact to clean up.** `JWT_REFRESH_SECRET` exists in `.env`/`.env.example` and **is read by nothing** — it implies a design that does not exist. See `ENVIRONMENT.md`.

### D-37 · OTP-created users get an unusable password 🔒 LOCKED
**Implementation.** `bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12)` and `fullName: ''`.
**Rationale.** The account exists and can hold a session, but cannot be password-logged-in until a password is set — so OTP signup does not create a weak-password account.

### D-38 · `SmsService` degrades to logging and never throws 🔒 LOCKED (with an operational duty)
**Rationale (code comment).** *"an SMS provider outage (or an unconfigured environment) must not make the whole OTP endpoint fail. The caller has already persisted the code."*
**Correct engineering, dangerous operationally.** `POST /auth/otp/request` returns success while sending nothing. `isConfigured` is exposed *"so callers can tell the two modes apart"* — **and no caller uses it.** The duty this creates: surface configuration state somewhere, or this will be silently wrong again.
**Also decided.** Token cached 25 days (Eskiz tokens last 30 — *"refresh well before that rather than on failure"*); single in-flight login *"so N concurrent sends trigger one login, not N"*; a 401 drops the cached token.

### D-39 · Provide `UploadService` directly in `AuthModule` 🔒 LOCKED
**Rationale (code comment).** *"UploadService is provided directly rather than by importing UploadModule: that module also registers UploadController, and importing it here would mount /upload a second time."*

### D-40 · Supabase Storage with the `service_role` key, server-side only 🔒 LOCKED
**Rationale (code comment, abbreviated).** The `anon` key *"made every upload fail with 'new row violates row-level security policy': it's meant for direct browser-to-Supabase calls under RLS, and this backend has no Supabase Auth session for RLS to authorize. service_role bypasses RLS entirely, which is the correct trust boundary for a backend that's already the one deciding (via JwtAuthGuard) who's allowed to upload."*
**Spec deviation.** The spec asked for S3 or Cloudinary. Supabase was already in the stack. The vestigial `BranchPhoto.publicId // Cloudinary` comment is a leftover from that.

### D-41 · Ban `AnimatePresence mode="wait"` for screen transitions 🔒 LOCKED — **the most expensive lesson in the project**
**The bug.** The signup flow deadlocked: the button stuck on "Kutilmoqda...", no error, no advance, past the 10 s abort.
**Hypotheses pursued and discarded:** an `aliveRef` unmount guard (removed anyway — React 19 no longer warns on unmounted `setState`, so the guard added risk for no benefit), stale HMR/module state, `prefers-reduced-motion`.
**How it was actually found.** `console.log` proved state **did** advance (`[signup] otp request resolved -> advancing`) while the UI kept rendering the old screen.
**Root cause.** `AnimatePresence mode="wait"` waiting on an exit-animation completion callback **that never fires** — the same failure class that `SafeScrollReveal`'s 3000 ms watchdog exists for, and that watchdog's log had appeared in the console.
**Fix.** A keyed `motion.div` — the entering screen animates; nothing waits on the leaving one.
**Why locked.** Reintroducing the pattern reintroduces a silent, state-invisible deadlock.

### D-42 · Upgrade `OtpInput` in place, preserving its API 🔒 LOCKED
**Rationale.** `ForgotPasswordFlow` already used it. Keeping the props compatible meant one component serves both flows and neither regressed.

### D-43 · Verify every spec claim against reality 🔒 LOCKED (a working practice, not a code decision)
**Recorded pattern.** **Four false premises in the signup spec** (react-i18next, a `/register` route, already-working OTP endpoints, the primary colour) and **three in the API spec** (Redis, a `{token}` response shape, S3/Cloudinary) were each identified, adapted around, and reported rather than implemented as written.
**Method used.** `/auth/otp/*` was proved absent by probing ~11 naming variants **against controls** (`/auth/login` → 400, `/users/me` → 401, `/upload/image` → 401), which distinguishes "route missing" from "auth rejected". The same probing later discovered `POST /businesses` had changed from 404 to **401**, i.e. it now existed — which is what unblocked the claim flow's submit.
**Why this belongs in a decisions log.** It is the single most valuable habit to carry forward into this codebase, because several specs were written from assumption rather than observation — and because `src/lib/api.ts` still carries stale 404 comments from probes that were correct *at the time*.

---

## Phase 4 — Business claim flow (2026-09-26/27)

### D-44 · Compose the preview instead of reusing `BusinessDetailPage` 🔒 LOCKED
**Spec asked for.** *"Reuse existing BusinessDetailPage component, pass form data as props."*
**Declined, because** that page fetches its own data. `BusinessPreview` instead composes `HeroImage` + `BusinessInfoHeader` (both props-driven and null-safe) from a synthesized `Business` object.

### D-45 · Address and district are required, not optional 🔒 LOCKED (forced)
**Spec said** "address (optional), city default Andijon".
**Reality.** `CreateBusinessDto` hard-requires `address` (min 5) **and** `districtId`. Made required and flagged.
**Mitigation.** `useClaimFlow` sets `DEFAULT_DISTRICT_ID = "1"` (Andijon).

### D-46 · Keep `/dashboard/business/:id/edit` mapped as a redirect 🔒 LOCKED
**Rationale (code comment).** Editing moved into `EditBusinessModal`, so *"nothing in the app links to this route anymore, but it stays mapped (rather than 404ing) in case of old bookmarks/links."* Same reasoning for `/register` → `/signup` and `/business/claim` → `/claim`.

### D-47 · Defer static generation, with a written plan 🔒 LOCKED (revisit before launch)
**Source.** `docs/SSG.md`, from "Session J".
**Three verified blockers:** `App.tsx` hardcodes `BrowserRouter` with no seam for `StaticRouter`; `LanguageProvider` and `AuthContext` read `localStorage` **during render**, which crashes in Node; Leaflet touches `window` at module scope.
**Judgement at the time.** Blocker 2 is a behaviour change to auth and language resolution — too risky inside an SEO session — *"for a benefit that is currently small: the API returns zero businesses, so there is no long tail of content pages for crawlers to miss."*
**That premise has now changed.** The API returns businesses, so the cost/benefit has shifted. **Revisit.**
**Also decided.** Prefer `vite-plugin-prerender` or a post-build `renderToString` script over Vike — *"Smallest blast radius."*

---

## Phase 5 — Deployment (2026-09-27)

### D-48 · Deploy the API before the frontend 🔒 LOCKED (sequencing rule)
**Rationale (user's own instruction).** *"API first (Railway) — new OTP endpoints must be live before frontend ships… otherwise users hit 404s on /auth/otp/*."*
**Outcome.** API deployed and fully verified with zero downtime; the frontend deploy is still blocked. **No inconsistent state resulted, because the deployed frontend never calls `/auth/otp/*`.**

### D-49 · Run migrations on boot, `&&`-chained 🔒 LOCKED
**Implementation.** `railway.json`: `npx prisma migrate deploy && npm run start:prod`.
**Valuable corollary, used in reasoning.** Because the chain is `&&`, **a running production API proves every prior migration applied cleanly** — which is how migration state was assessed without database access.

### D-50 · The agent does not run `vercel login` 🔒 LOCKED
**Rationale.** It is an interactive browser auth flow; the agent's Bash tool runs with stdin closed (which is exactly why `vercel teams ls` hung on *"Waiting for authentication..."*). An attempt to read the CLI's stored credential was **blocked by the sandbox, and that was the right outcome** — the agent should not handle the user's token.
**Consequence.** The deploy is correctly a human action.

### D-51 · Retract the "stale orgId" diagnosis 🔒 LOCKED (a correction to preserve)
**Earlier claim.** `.vercel/project.json` held a stale `orgId` and needed `vercel link`.
**Verified against the Vercel API and retracted.** `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH` and `team_ErWmdvPfiaDk9mHs6Tv1GFuu` (team `john-s3`) are both **correct** and serve `myandijan.uz`. The expired CLI token was the entire problem.
**Why this is recorded.** Anyone re-reading the earlier session notes will find the wrong diagnosis. **Do not run `vercel link`.**

### D-52 · Commit the hardcoded credential, flag it for rotation 🔒 CLOSED — **remediated 2026-09-28**
**What happened.** A pre-commit secret scan found `PLAIN_PASSWORD = '<REDACTED>'` in `scripts/seed-role-accounts.js`, applied to `SUPER_ADMIN`/`ADMIN`/`MODERATOR`/`SUPPORT`. It was committed as instructed **because the repository has no remote**, and flagged for rotation and `process.env` parameterization *before any remote is added*.
**Status: not done.** See `SECURITY.md` §1.1. This is the highest-severity open item in the project.

---

## Phase 6 — MVP gap audit (2026-09-29)

### D-53 · Keep sitemap generation manual/deploy-time, not a CI step 🔓 REVISITABLE
**Decision.** `npm run sitemap` was re-run to populate `sitemap-businesses.xml` (0 → 12 URLs), but it was **not** added to `package.json`'s `build` script or the CI workflow.
**Rationale.** The generator fetches live data from the production API (`VITE_API_URL`/`SITE_URL` env-driven). Wiring it into `npm run build` would make every build — including the Phase 3 CI workflow's `npm run build` step on every push/PR — depend on a network call to production. That's a behavior change to CI (an external dependency, and a flaky-network failure mode) that wasn't asked for and wasn't evaluated for safety.
**Consequence.** The file will go stale again as new businesses are added. Revisit by adding a scheduled job (cron, GitHub Actions on a schedule, or a manual step in the deploy checklist) — deliberately not decided here.

### D-54 · What "Inventory" means for `InventoryView` ✅ RESOLVED in Phase 10 → D-61
**Tension found.** The owner dashboard's mock `Product` type has `sku` and `quantity` (stock-keeping). The real backend catalog (`GET/POST /businesses/:id/menu`) has neither — it's `name`/`description`/`price`/`imageUrl`/`isAvailable` only, matching a restaurant-menu use case, not a warehouse.
**Resolution (2026-10-01).** "Inventory" is the existing product & service **catalog**, not stock tracking. SKU/quantity are dropped from the UI; no schema change. See D-61.

---

## Phase 7 — SEO landing pages & discovery architecture (2026-10-01)

### D-55 · Category/district landing page URLs: `/:lang/category/:slug` and `/:lang/district/:slug` 🔒 LOCKED
**Decision.** Adopted the exact structure proposed, with no deviation. `Category.slug` and `District.slug` are both already `@unique` in the schema, so no collision or ambiguity risk existed.
**Rationale.** `MetaTags`' canonical/hreflang generation (`src/lib/seo.ts`'s `pathForLang`) already derives everything from `useLocation().pathname`, so any real path-based route gets correct canonical/hreflang for free — a query-string alternative would have needed new logic; a real path needed none.
**One carve-out, not a deviation from the URL structure itself.** The `oziq-ovqat` (food) category's homepage tile still links to `/search?category=oziq-ovqat` rather than `/category/oziq-ovqat`, to preserve the specialized restaurant search UI (D-21, locked). `/category/oziq-ovqat` still exists, still renders, and is still the sitemapped canonical URL for that category — only that one internal link target was special-cased.
**Why locked.** The sitemap (`scripts/generate-sitemap.ts`) and internal links (`CategoriesSection`, `DistrictsSection`) both now depend on this exact path shape.

### D-56 · Removed `city/:slug` entries from the sitemap rather than building a city page 🔓 REVISITABLE
**What was found.** `scripts/generate-sitemap.ts` already emitted `city/:slug` URLs (written in an earlier session, apparently in anticipation of a page that was never built). No `/:lang/city/:slug` route exists anywhere in the app.
**Decision.** Removed city entries from the sitemap generator rather than building a third landing-page type this phase (out of the requested scope: only category + district). Submitting a sitemap URL with no matching route would point crawlers at the SPA's empty-`Layout` fallback (the same gap `TODO.md` already flags: "No 404 route").
**Revisit when.** A city landing page is explicitly requested — the sitemap data (`GET /geography/regions`'s nested `cities`) is already available; only the route/page/hook would need building, following the exact same pattern as `DistrictLandingPage`.

---

## Phase 8 — Advanced search integration (2026-10-01)

### D-57 · Canonical search contract: FTS for text queries, `/businesses` for pure browsing 🔒 LOCKED
**Decision.** `useSearchBusinesses` now dispatches on whether a text query is present: a non-empty `search` calls the new `searchBusinessesFts()` → `GET /search?type=business`; no `search` term keeps calling the existing `searchBusinesses()` → `GET /businesses`. `SearchPage.tsx` itself needed no changes — the branch lives entirely inside the hook.
**Rationale.** `GET /search`'s `q` is required-non-empty by design (there is nothing to rank without a query term), while `GET /businesses` already correctly paginates/filters pure category/district browsing server-side. Loosening `q` to optional so one endpoint could serve both cases would have meant inventing browse-mode ranking behavior inside the FTS system — explicitly out of scope ("do not invent a new scoring algorithm").
**Companion change.** Added `SearchQueryDto.type?: 'business' | 'product'` to `GET /search`, restricting which CTE(s) feed the `hits` union in `SearchService.buildHitsCte`. This is the smallest safe backend adjustment that lets the frontend get an accurate, renderable business-only total/pagination instead of `GET /search`'s default mixed business+product count, which the app has no UI to display (no product-result card exists). Omitting `type` is unchanged, fully backward-compatible default behavior.
**Why locked.** `useSearchBusinesses.ts`, `search.controller.ts`'s consumer contract, and the new test suites on both sides all depend on this exact split.
**Not done, deliberately.** Product-type search results are not rendered anywhere in the public UI. Building a product/menu-item result card was judged to be new UI surface, not "integrating the existing search capability" — deferred.

---

## Phase 9 — Business claims & verification (2026-10-01)

### D-58 · A claimed/owned business is not a verified business 🔒 LOCKED
**Decision.** Approving a claim sets `Business.ownerId` (and promotes a `CUSTOMER` claimant to `BUSINESS_OWNER`) and nothing else. It never sets `isVerified`/`verifiedAt`/`verifiedById`. Verification stays the separate, admin-initiated `POST /admin/businesses/:id/verify`, and the public "verified" badge reads `isVerified` only.
**Rationale.** The schema already models them as independent fields, and they answer different questions: "who manages this listing" vs "has the platform vetted this business". Conflating them would make every approved claimant instantly display a trust badge the platform never actually checked.
**Why locked.** `AdminService.approveClaim`, the badge rendering, and `ARCHITECTURE.md` §26 all depend on the two staying separate.
**Deferred.** An owner-initiated verification workflow (documents, SMS/call) does not exist; verification is admin-only.

### D-59 · New `businessClaim.*` i18n namespace, separate from `claim.*` 🔒 LOCKED
**Decision.** All strings for claiming an existing listing use `businessClaim.*`. The existing `claim.*` namespace is left untouched.
**Rationale.** `claim.*` (56 keys) already belongs to the Phase 1 `/uz/claim` flow, which — despite the name — submits a **new** business via `POST /businesses`. Reusing it would have mixed two unrelated features under one prefix; reusing specific keys was actively wrong (e.g. `claim.errorDuplicate` = "This business already exists" does not describe a claim conflict, so `businessClaim.errorConflict` was added instead).
**Why locked.** `ClaimBusinessSection`, `ProfilePage`, and the frontend tests reference these exact keys; `TranslationKey` parity across uz/ru/en is compiler-enforced.

### D-60 · Claim approval/rejection are compare-and-set, not read-then-write 🔒 LOCKED
**Decision.** In `AdminService`, ownership assignment is `business.updateMany({ where: { id, ownerId: null } })` and every claim status change is `businessClaim.updateMany({ where: { id, status: PENDING } })`; `count === 0` throws `409` inside the interactive transaction, rolling everything back.
**Rationale.** Closes the audit's critical race where two concurrent approvals could both pass a read-then-check and yield two successive owners, and the related approve-vs-reject race on one claim. Uses only Prisma + Postgres row-level locking semantics — no schema change, no advisory locks.
**Why locked.** Reverting to `update` after a read reintroduces the race silently; `admin.service.claims.spec.ts` asserts the conditional `WHERE` clauses.

---

## Phase 10 — Product & service catalog integration (2026-10-01)

### D-61 · "Inventory" is the product/service catalog; no SKU or stock quantity 🔒 LOCKED
**Decision.** Resolves D-54. `InventoryView` manages the existing `Product` catalog — name, type (`PRODUCT`/`SERVICE`), category, price, description, photo, published (`isActive`). The mock SKU and quantity fields, the low-stock KPI and `mockData.ts` were removed. No migration.
**Rationale.** Phase 10's scope settled the question: *"manage price/name/description/category/image fields only where supported by the current schema/API"* and *"Do NOT invent new product fields."* `Product` has no stock columns; keeping SKU/quantity inputs would have meant a form whose values are silently discarded on save.
**Why locked.** `ProductModal`/`ProductRow`/`InventoryView`, their tests, and the DTOs all depend on this exact field set.
**Revisit when.** Real stock tracking is requested. It belongs behind the existing Phase-2 `BusinessType.inventoryEnabled`/`warehouseEnabled` flags (capability rows, D-07), as new schema, not as columns bolted onto `Product`.

### D-62 · Public catalog is APPROVED-only; owners read through a separate `/me` endpoint 🔒 LOCKED
**Decision.** `GET /businesses/:id/menu` (public) now 404s unless the business is `APPROVED`, and still lists only `isActive` items. A new `GET /me/businesses/:id/menu` (owner-or-MODERATOR+, any business status, includes deactivated items) backs the owner dashboard. `PATCH /menu/:id` now accepts `isActive`, `type`, `categoryId`; `POST` accepts `type`, `categoryId` (validated against non-deleted categories).
**Rationale.** (1) The public route served catalogs of DRAFT/PENDING/SUSPENDED/HIDDEN businesses, the one part of an unpublished listing the rest of the public API withheld (`GET /businesses/:id` already 404s for them). (2) Once owners can deactivate items, a public-only list would hide them from their own owner forever — a management read is needed. It is not a duplicate endpoint: different audience, filters and authorization. It lives under `/me` alongside `/me/businesses`, `/me/claims`, etc.
**Why locked.** `InventoryView` calls the `/me` route; `products.service.spec.ts` and `catalog.authorization.spec.ts` assert both visibility rules.
**Left as-is (noted).** `GET /businesses/:id` additionally gates its embedded `products` on `BusinessType.catalogEnabled`; the menu endpoint does not. Aligning them would visibly hide existing catalogs and was outside Phase 10's scope.

---

## Phase 11 — Admin claims & business operations (2026-10-01)

### D-63 · Suspension applies only to APPROVED listings, and unsuspend restores APPROVED 🔒 LOCKED
**Decision.** `POST /admin/businesses/:id/suspend` now 409s unless the business is `APPROVED` (previously any non-suspended status). New `POST /admin/businesses/:id/unsuspend` moves `SUSPENDED → APPROVED` and clears `rejectionReason`. Both are compare-and-set (`updateMany` with the expected status in `WHERE`, as D-60).
**Rationale.** An unsuspend that restores `APPROVED` is only safe if everything suspended was `APPROVED` first. Without the precondition an `ADMIN` could suspend a `PENDING` listing and unsuspend it — approving it without review — or suspend a `HIDDEN` one and unsuspend it, undoing a `SUPER_ADMIN`-only hide. The schema stores no "previous status", so the invariant has to be enforced at the entry point.
**Not done.** `unhide`: `PATCH …/hide` accepts any status and the prior one isn't stored, so "restore to what?" is a product decision. Deferred; hide has no UI.
**Why locked.** `admin.service.business-ops.spec.ts` asserts both preconditions for every status; the admin UI only offers suspend on `APPROVED` rows and restore on `SUSPENDED` rows.

### D-64 · Unverify clears `isVerified` only; reversals inherit the ADMIN floor 🔒 LOCKED
**Decision.** New `POST …/unverify` sets `isVerified = false` and leaves `verifiedAt`/`verifiedById`; new `POST …/unpromote` clears `isPromoted`/`promotedUntil` (allowed even after expiry, to clean up a stale flag). All three reversal routes have no `@Roles` override, so they sit at the class-level `ADMIN` floor — the same as the action they undo.
**Rationale.** `approveBusiness` also writes `verifiedAt`/`verifiedById` as the approval record; clearing them on unverify would erase who approved the listing. The public badge reads `isVerified` alone (D-58), and the audit log keeps the full history.

### D-65 · Review-report admin UI deferred; DISMISS now records DISMISSED 🔓 REVISITABLE
**Finding.** `GET /admin/reports` and `POST /admin/reports/:id/resolve` exist, but **no endpoint creates a `ReviewReport`** (and no business-report model exists at all), so the queue is permanently empty. Separately, resolving with `action: DISMISS` stored `RESOLVED` although the enum has `DISMISSED`.
**Decision.** Fixed the status bug (backend only). Did **not** build an admin reports view — it would always be empty — nor a user-facing "report this review" flow, which would be a new reporting system (out of Phase 11's scope).
**Revisit when.** User-side review reporting is scoped; the admin list/resolve endpoints are ready for it.

### D-67 · Railway builds install devDependencies explicitly (`nixpacks.toml`) 🔒 LOCKED
**Incident.** The first two Railway deployments of `337fd6e` failed at `BUILD_IMAGE`: `sh: 1: nest: not found`. The service sets `NODE_ENV=production`, under which `npm ci` omits devDependencies (incl. `@nestjs/cli`); the last good build had silently relied on the builder setting npm `production=false` (its log shows `npm warn config production`, 689 packages), which stopped being applied (218 packages). Reproduced locally in a scratch clone.
**Decision.** Added `nixpacks.toml` pinning the install phase to `npm ci --include=dev` (commit `ce7ec66`), reproducing the previous successful image exactly. Chosen over adding a Railway variable (`NPM_CONFIG_PRODUCTION=false`) because it changes no production configuration, is versioned and reviewable.
**Why locked.** Removing it reintroduces a build that depends on an implicit builder default.

### D-66 · `isFeatured` stays without an admin control 🔓 REVISITABLE
**Finding.** "Editor's Pick" (`GET /businesses/featured`) reads `isFeatured`/`featuredUntil`, but no admin route sets them; `POST …/promote` sets `isPromoted` only (the API doc previously said "promoted/featured").
**Decision.** Not added — it would be a new endpoint for a placement capability, which Phase 11 explicitly excluded.

---

## Phase 12 — Moderation inputs & moderator access (2026-10-01)

### D-70 · Customers report reviews via `POST /reviews/:id/report`; only visible reviews are reportable 🔒 LOCKED
**Decision.** Supersedes the "deferred" half of D-65. Any signed-in user (JwtAuthGuard, no role floor — the same model as writing a review) can report a review with one of the existing `ReportReason` values and an optional note. The target must be publicly visible (PUBLISHED, not deleted, on a live branch of an APPROVED business), otherwise `404`. The schema's `@@unique([reviewId, reporterId])` gives one report per user per review (`409` on repeat). `Review.reportCount` is incremented in the same transaction. The response never includes the reporter. ADMIN+ moderates the result in the new `AdminReportsView` with the two existing actions.
**Not added (would be new rules).** No auto-hide threshold, no rate limiting beyond the unique constraint, and no ban on reporting one's own review — none exist in the current model.

### D-68 · MODERATOR admin-panel access deferred — it needs a privilege decision ✅ RESOLVED in Phase 14 → D-72
**Finding.** On the server, MODERATOR may only `POST /admin/businesses/:id/approve` and `/reject`. Every admin **read** — `GET /admin/businesses`, `/admin/stats`, `/admin/reviews`, `/admin/reports`, `/admin/claims` — is ADMIN-floor, and no other endpoint exposes PENDING businesses. A moderator therefore cannot discover what to approve, and every admin view would 403.
**Decision.** Frontend gate left at ADMIN+ (now pinned by `AdminDashboard.access.test.tsx`) because exposing a panel whose every view fails is not "exposing what the backend permits", and widening reads was explicitly out of scope.
**Decision needed.** Should MODERATOR get read access to `GET /admin/businesses` (it returns owner phone/email) and/or the review & report moderation routes (list + hide/restore/resolve)? Once decided, it is a per-route `@Roles` override plus showing the matching sidebar items to `MODERATOR`.

### D-69 · Business unhide deferred — the restore target is a product rule ✅ RESOLVED in Phase 14 → D-73
**Finding.** `PATCH /admin/businesses/:id/hide` (SUPER_ADMIN) accepts **any** status (APPROVED, PENDING, REJECTED, SUSPENDED, DRAFT). `Business` has no previous-status column; the prior status survives only as JSON in the hide's `AuditLog.before` — a forensic record, not state, and absent for any status change made outside `hideBusiness`.
**Decision.** Not implemented; the previous status is never guessed.
**Decision needed.** When a SUPER_ADMIN unhides, should the listing (a) return to the status recorded in its hide audit entry, (b) always return to `PENDING` for re-review, or (c) return to `APPROVED` only if it was APPROVED when hidden (and otherwise to `PENDING`)? (b) and (c) are implementable without schema changes; (a) needs either reliance on the audit log or a new `statusBeforeHide` column.

---

## Phase 13 — Deployment & CI/CD reliability (2026-10-01)

### D-71 · `main` is the production branch; hosts deploy via their own GitHub integrations; Actions only validates 🔒 LOCKED
**Decision.** Both repos ship from `main`. Deployment is owned by each host's native GitHub integration (Vercel GitHub App for the frontend; Railway GitHub App for the backend, once authorized). `.github/workflows/ci.yml` stays validation-only (`npm ci`, test, build) — no deploy step, no deploy tokens in GitHub secrets.
**Rationale.** Keeps deploy credentials out of GitHub and avoids a second, competing deploy path. Coupling to CI is done host-side: Railway's "Wait for CI" (recommended once auto-deploy is enabled) makes a red `test-and-build` block the deploy; Vercel builds on push independently of Actions; whether Vercel "Deployment Checks" are configured could not be verified (Vercel API access returned 403), so assume a commit that fails CI can still ship to the frontend — noted as a follow-up.
**Not done.** No GitHub Actions → Railway deploy workflow was added as a workaround: it would need a Railway token in GitHub secrets and would bypass the real fix (authorizing the Railway GitHub App).

---

## Phase 14 — Moderator access & business restoration (2026-10-01)

### D-72 · MODERATOR gets exactly the moderation surface, with owner/reporter PII redacted 🔒 LOCKED
**Decision.** Resolves D-68 using the Phase 14 defaults (least privilege, no unnecessary PII, no SUPER_ADMIN or unrelated admin powers). Server floors on `AdminController`:

| MODERATOR+ (new or unchanged) | Stays ADMIN+ | Stays SUPER_ADMIN |
| --- | --- | --- |
| `GET /admin/businesses` (**new**) · `POST …/approve`, `…/reject` (unchanged) · `GET /admin/reviews`, `POST /admin/reviews/:id/hide`, `…/restore` (**new**) · `GET /admin/reports`, `POST /admin/reports/:id/resolve` (**new**) | stats, business edit/branch/verify/unverify/suspend/unsuspend/promote/unpromote, claims, events, categories, geography, users, audit | `PATCH …/hide`, `PATCH …/unhide` |

**PII shaping (server-side, by caller role):** `GET /admin/businesses` returns `owner { id, fullName }` to MODERATOR and `owner { id, fullName, phone, email }` to ADMIN+. `GET /admin/reports` returns `reporter { id }` to MODERATOR and `reporter { id, fullName }` to ADMIN+. Review authors (`{ id, fullName, avatarUrl }`) are already public and unchanged. The business's own contact fields (listing data) are returned to both.
**Concurrency.** Because moderation is now shared, approve/reject business, hide/restore review and resolve report are compare-and-set (`updateMany` with the expected state; lost race → 409, nothing audited), as D-60.
**Frontend.** `canModerate` (MODERATOR+) opens the panel; a MODERATOR sees only Bizneslar (approve/reject on PENDING rows, public link), Sharhlar and Shikoyatlar, lands on Bizneslar, and never renders ADMIN-only views. `SUPPORT` (rank 3) stays below the floor.
**Why locked.** `business-ops.authorization.spec.ts` pins every floor in both directions (incl. MODERATOR denied stats/users/audit/events/categories/claims-adjacent business ops; SUPPORT and BUSINESS_OWNER denied everywhere); `admin.service.moderation.spec.ts` pins the redaction.

### D-73 · Unhide restores the status recorded at hide time, else PENDING 🔒 LOCKED
**Decision.** Resolves D-69 using the Phase 14 default rule. New nullable column `Business.statusBeforeHide` (migration `20261001120000_add_business_status_before_hide`, additive, no backfill). `PATCH …/hide` (SUPER_ADMIN) now writes the current status into it in the same compare-and-set update; new `PATCH …/unhide` (SUPER_ADMIN) only applies to HIDDEN (409 otherwise), restores `statusBeforeHide` if present, otherwise **PENDING** (re-review), clears the column, and audits `RESTORE` with `restoredFrom: statusBeforeHide | fallback:PENDING`.
**Why a column, not the audit log.** The audit JSON does carry the prior status for hides made via `hideBusiness`, but it is a forensic record, not state, and businesses hidden any other way have none. Restoration never reads the audit log, never assumes APPROVED.
**Safety basis.** No code path moves a business out of HIDDEN except unhide (approve/reject need PENDING, suspend needs APPROVED, unsuspend needs SUSPENDED), so the recorded status cannot go stale while hidden. Businesses hidden before this migration have `NULL` → restore to PENDING.
**Why locked.** `admin.service.moderation.spec.ts` covers hide from every status, restore to every recorded status, the NULL and corrupt-`HIDDEN` fallbacks, non-hidden 409s and lost races.

---

## Phase 15 — Authorization & governance (2026-10-01)

Phase 15A audited the role model; Phase 15C designed and the owner approved the target architecture: **two planes** — a governance plane (PLATFORM_OWNER, a separate principal, *not* a role and *not* rank 7) and an operational plane (SUPER_ADMIN … CUSTOMER), with explicit capabilities replacing rank floors. Phase 15B implements only the stabilization slice below.

### D-74 · Business content is owner-only; account status follows an explicit table; no API changes a staff role 🔒 LOCKED
**Decision (Phase 15B).**
1. **Ownership, not rank, governs business content.** `PATCH /businesses/:id`, `PUT /businesses/:id/hours`, `POST /businesses/:id/menu`, `GET /me/businesses/:id/menu`, `PATCH`/`DELETE /menu/:id`, `POST /events`, `POST`/`PATCH /reviews/:id/reply`: `JwtAuthGuard` only, **no `@Roles`**, and the service requires `ownerId === user.id`. The "owner OR rank ≥ MODERATOR" bypasses in `BusinessesService`, `ProductsService` and `ReviewsService.reply` are deleted. Resolves open question ⚠️ 2: **SUPPORT inherits nothing from BUSINESS_OWNER** — and neither does any other role; any account manages exactly the businesses it owns.
2. **Staff cross-business edits go through `/admin` only, with a reason.** `PATCH /admin/businesses/:id` (now also carries cover photo, delivery and social/website fields the admin modal saves), `PATCH …/branch` and new `PUT /admin/businesses/:id/hours` — ADMIN floor, required `reason` (stored as the audit `note`), before/after of exactly the fields sent. MODERATOR has no business-edit route. **ADMIN has no cross-business catalog route** (deferred, 15C open decision #9). No staff route replies as a business.
3. **Account status (`POST /admin/users/:id/suspend|activate`) follows `user-status.policy.ts`**, not rank: nobody acts on themselves; nobody suspends or reinstates a SUPER_ADMIN; ADMIN → CUSTOMER/BUSINESS_OWNER; SUPER_ADMIN → also MODERATOR/SUPPORT, and may **emergency-freeze** an ADMIN, which **no role can lift** (reserved for PLATFORM_OWNER governance). Required `reason`; compare-and-set on status **and** role; the target's sessions are revoked in the same transaction (refresh tokens + `session_version`). Replaces the old rule that blocked only `target.role === ADMIN` and so let an ADMIN suspend the SUPER_ADMIN.
4. **No API grants or changes a staff role** until the governance plane exists. The only `users.role` writes are CUSTOMER (OTP sign-up / registration default) and the CUSTOMER→BUSINESS_OWNER auto-promotion on business/claim approval. SUPER_ADMIN therefore cannot appoint, promote, demote or remove an ADMIN or SUPER_ADMIN.
5. **Supporting controls:** password reset and suspension revoke all sessions (`users.session_version`, carried as `sv`); audit rows record actor role, request id, edge-reported IP and user agent; `/auth/*` is rate limited per address and per phone; CORS is an allowlist.
**Deliberately not done here (later phases):** PLATFORM_OWNER model/`platform_governance`, ownership transfer, appoint/remove SUPER_ADMIN or ADMIN, lifting an emergency freeze, governance audit and hash chain, step-up re-authentication, the capability map and default-deny guard, the SUPPORT lookup desk, external immutable audit storage.
**Why locked.** `ownership.authorization.spec.ts` (all six roles × own/other business for profile, hours and reply; route metadata), `catalog.authorization.spec.ts` + `products.service.spec.ts` (catalog), `user-status.authorization.spec.ts` (full actor × target matrix for suspend and reinstate, self, freeze, lost race), `role-write-inventory.spec.ts` (source scan of every role write; no body accepts `role`), `session-security.spec.ts` (suspension and reset kill old access and refresh tokens end-to-end).

### D-75 · Capability authorization, deny by default; ownership and conflict of interest as record policies; no rank anywhere 🔒 LOCKED
**Decision (Phase 15D).** Replaces D-17's numeric floor model in full.
1. **Four separate dimensions.** *Role* = operational job (`users.role`). *Capability* = an action a role may take, granted by one explicit table (`src/authz/capabilities.ts` — no inheritance; every role's set is written out). *Ownership* = whether this record is yours (`src/authz/policies.ts`). *Governance* = the PLATFORM_OWNER plane — **not implemented, not a role, not a capability**.
2. **Deny by default.** A single global `AuthzGuard` (`APP_GUARD`). Every route declares exactly one of `@Public()`, `@Authenticated()` (own-account data only: profile, favorites, uploads, RSVPs) or `@RequireCapability(...)` (all listed required). An undeclared route is refused (403); `@RequireGovernance()` exists only as a placeholder that refuses everyone. Controllers attach no auth guards of their own.
3. **The matrix** (20 capabilities):

| Capability | CUSTOMER | BUSINESS_OWNER | SUPPORT | MODERATOR | ADMIN | SUPER_ADMIN |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `review.write` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `review.report` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `business.claim` | ✅ | ✅ | — | — | — | — |
| `business.create` | — | ✅ | — | — | — | — |
| `business.manage_own` (+ ownership) | — | ✅ | — | — | — | — |
| `business.review` (not own) | — | — | — | ✅ | ✅ | ✅ |
| `review.moderate` (not own) | — | — | — | ✅ | ✅ | ✅ |
| `report.resolve` (not own) | — | — | — | ✅ | ✅ | ✅ |
| `business.operate` (not own) | — | — | — | — | ✅ | ✅ |
| `business.edit_any` (not own, reason) | — | — | — | — | ✅ | ✅ |
| `claim.review` (not own) | — | — | — | — | ✅ | ✅ |
| `event.review` (not own) | — | — | — | — | ✅ | ✅ |
| `taxonomy.manage` | — | — | — | — | ✅ | ✅ |
| `user.pii.read` | — | — | — | — | ✅ | ✅ |
| `user.status.manage` (+ target table) | — | — | — | — | ✅ | ✅ |
| `audit.read` | — | — | — | — | ✅ | ✅ |
| `analytics.platform` | — | — | — | — | ✅ | ✅ |
| `business.hide` (not own) | — | — | — | — | — | ✅ |
| `business.delete` (not own) | — | — | — | — | — | ✅ |
| `analytics.users` | — | — | — | — | — | ✅ |
| **governance (PLATFORM_OWNER)** | — | — | — | — | — | — *(not implemented; not a capability)* |

4. **Ownership**: owner routes need `business.manage_own` **and** `ownerId === caller`. **Conflict of interest**: holders of a staff capability are still refused on their own records — their listing (approve/reject, verify, suspend, promote, hide, delete, /admin edit/branch/hours), their claim, a review they wrote or one about their business, a report they filed or that concerns their review/business, an event of their business. **Target rules** for account status stay the explicit table of D-74 (`src/authz/user-status.policy.ts`).
5. **Intended behaviour changes vs the rank model** (pinned by `authz-migration.spec.ts`, nothing became more permissive): SUPPORT and MODERATOR — and, since Phase 15D.2, ADMIN and SUPER_ADMIN — are refused at the route on all 31 owner routes and on filing claims; CUSTOMER is refused on creating/operating listings (it keeps claiming — a claimant becomes BUSINESS_OWNER on approval; the UI never offered CUSTOMER the owner area). Staff are refused on their own records as above.
6. **Frontend** renders from the server-issued `capabilities` list (GET /users/me and every auth response) via `useAuth().can()` / `useCan()`; no code compares role names to decide access; fails closed when the list is absent. UX only.
7. **Ownership authority and platform authority are separate (Phase 15D.2, 2026-10-02).** *Business Owner permissions are ownership-oriented*: `business.claim` / `business.create` / `business.manage_own` belong to BUSINESS_OWNER (CUSTOMER keeps `business.claim`), and every owner route still checks `ownerId === caller`. *My Andijan staff permissions are platform-capability-oriented*: MODERATOR, ADMIN and SUPER_ADMIN hold **no** owner capability — ADMIN and SUPER_ADMIN lost the owner bundle they held in 15D, so they are refused at the route on all 29 `business.manage_own` routes, `POST /businesses`, `POST /me/businesses` and `/me/claims`. Staff administer other owners' listings through the `/admin` routes with explicit capabilities (`business.edit_any`, `business.operate`, `business.review`, `business.hide`, `business.delete`), which never depend on ownership; conflict of interest (point 4) is unchanged. A person who works for My Andijan and also runs a business does so from a separate BUSINESS_OWNER account. This is **not a new role**. Pre-check: a read-only production query found 0 ADMIN- and 0 SUPER_ADMIN-owned businesses. **Business Staff** (people working for one business) remains future *business-scoped membership* — not a global role; **PLATFORM_OWNER** remains the separate future governance plane.
**Why locked.** `route-authorization.spec.ts` (every route has a rule; committed route→rule snapshot; every route × role vs an independent holder table; APP_GUARD registered), `role-capabilities.spec.ts` (each role's set pinned), `no-rank-model.spec.ts` (the hierarchy, `RolesGuard`, `@Roles` and level comparisons cannot return), `authz-migration.spec.ts` (old vs new for every route × role), `authz.guard.spec.ts`, `policies.spec.ts`, `admin.service.conflict.spec.ts`, `authz.e2e.spec.ts` (real AppModule over HTTP).
**Not decided here (still deferred):** PLATFORM_OWNER governance and everything in it; SUPPORT desk capabilities; ADMIN cross-business catalog editing (15C open #9).


### D-76 · Authentication codes live only in the SMS; no SMS sign-in for staff; delivery fails closed 🔒 LOCKED
**Decision (Phase 15E.2, 2026-10-02).**
1. **A code is never logged, returned, or put in an exception** — anywhere. `SmsService` never logs a message body or phone number. There is no "dev mode" that logs codes: tests and local development stub `SmsService`.
2. **Fail closed.** Without an SMS provider, `/auth/otp/request` and `/auth/forgot-password` return 503 (configuration-level, identical for every phone). An undelivered code is retired. **Production SMS is NOT configured** — `ESKIZ_EMAIL` / `ESKIZ_PASSWORD` are absent from the Railway production variables (checked by name, 2026-10-02). Until the owner sets them, `POST /auth/otp/request` and `POST /auth/forgot-password` answer **503** ("SMS xizmati hozircha ishlamayapti…"); password sign-in, registration and refresh are unaffected. Before 15E.2 these flows also never delivered a code to a real user — the code was only written to the logs.
3. **Codes:** `crypto.randomInt`, six digits, bcrypt-hashed at rest; one live code per phone + purpose; 5 wrong guesses per phone + purpose per hour across every code row, reserved atomically; single use by compare-and-set on `usedAt`.
4. **OTP sign-in is an allowlist — CUSTOMER and BUSINESS_OWNER.** Staff roles (SUPPORT, MODERATOR, ADMIN, SUPER_ADMIN) and any future role sign in with their password; an SMS code alone is not a sufficient factor for a privileged account. The refusal names no role.
5. **No timing oracle** on forgot-password (equal bcrypt work; SMS sent in the background) or on code checks (equal comparison when no code is live).
**Why locked.** `auth-codes.spec.ts` (generation, logging, lifecycle, budget, concurrency, staff, timing, SMS) and `session-security.spec.ts` (reset ends every session).
**Not decided here:** staff password reset by SMS code is still allowed (needed for self-recovery; revisit with 2FA); a second factor for staff; refresh-token reuse detection (15E.4).


### D-77 · Production deploys only commits whose `test-and-build` check passed 🔒 LOCKED
**Decision (Phase 15E.3, 2026-10-02).**
1. **One required check per repository: `test-and-build`** (workflow `CI`). It is the production gate: Railway's "Wait for CI" (`checkSuites: true`) for the backend, the Vercel Production Deployment Check `Vercel - myandijan-frontend: test-and-build` (a commit status the CI job reports) for the frontend, and the `main` ruleset for merges. Renaming the job breaks the gates.
2. **CI is read-only and immutable:** `permissions: contents: read`, actions pinned to full commit SHAs (updated through Dependabot pull requests), `persist-credentials: false`. No workflow deploys; the platforms deploy on the check result.
3. **Normal releases never bypass the gate.** Manual platform deploys/promotions and ruleset bypass are owner-only emergency tools; prefer rolling back to a previously gated deployment.
4. **`main` ruleset "Protect main" (both repos):** no deletion, no force push, pull request + `test-and-build` (up to date). Changes reach `main` only through a pull request.
**Status (2026-10-02).** Backend gate active and verified. Rulesets active (verified via the public API; the bypass list is not readable without admin access). Frontend Production Deployment Check configured by the owner; **production proof pending** the first deployment after configuration (the 15E.7.1 documentation PR merge).

---

## Decisions that were never actually made

Listed because their absence is itself the finding, and because each will otherwise be silently decided by whoever touches that area next.

| # | Open question | Why it matters |
| --- | --- | --- |
| ⚠️ 1 | **Which brand palette wins** — shipped blue/cyan, or the specced navy/green? | Both exist as tokens; the app is visually inconsistent with its own spec (D-32) |
| ✅ 2 | ~~**Should `SUPPORT` outrank `BUSINESS_OWNER`?**~~ | **Resolved Phase 15B:** business content is ownership-only, so no role — SUPPORT included — inherits owner powers by rank (D-74). The numeric ranking itself remains for the other `@Roles` floors until the capability phase |
| ⚠️ 3 | **Is Uzbek data *residency* a requirement, or only portability?** | Today's hosting (Railway + Supabase) satisfies portability but not residency (D-04) |
| ⚠️ 4 | **Testing strategy** | Zero tests, no runner, no `test` script, across 118 routes and 132 components |
| ⚠️ 5 | **Monorepo or shared types?** | Two repos hand-maintain parallel type definitions with different TypeScript majors |
| ⚠️ 6 | **Branching / CI** | Single `master` branch, no CI, large multi-concern commits |
| ⚠️ 7 | **Who calls `POST /admin/analytics/aggregate`?** | Nothing schedules it, so `PlatformMetric` is only populated by hand |
| ⚠️ 8 | **Why is analytics ingestion unwired?** | 3 endpoints exist, nothing calls them, and no comment or note explains whether this was deferred or forgotten |
| ⚠️ 9 | **What happens to `Notification` and `PlatformSetting`?** | Both tables exist and are entirely unused; `AdminSettingsView` is the missing consumer of the latter |
| ⚠️ 10 | **Is `restaurantMock` acceptable in production?** | Users currently see invented cuisine/price/delivery data (D-24) |
| ✅ 11 | ~~**What does "Inventory" mean for `InventoryView`?**~~ | **Resolved Phase 10:** it is the product/service catalog; no SKU/stock (D-54 → D-61) |
| ✅ 13 | ~~**Should MODERATOR get admin read access?**~~ | **Resolved Phase 14:** least-privilege moderation surface, owner/reporter PII redacted (D-72) |
| ✅ 14 | ~~**What does unhide restore a HIDDEN business to?**~~ | **Resolved Phase 14:** the status recorded at hide time, else PENDING (D-73) |
| ⚠️ 12 | **Should the claim flow create real `BusinessClaim` records?** | No endpoint anywhere creates one today, so `GET /me/claims`/`GET /admin/claims` can never show data (Phase 4/5 audits) |
