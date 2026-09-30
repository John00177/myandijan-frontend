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

### D-17 · Role hierarchy as a floor check, not exact match 🔒 LOCKED (one sub-question open)
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

### D-54 · What "Inventory" means for `InventoryView` ⚠️ NEEDS DECISION
**Tension found.** The owner dashboard's mock `Product` type has `sku` and `quantity` (stock-keeping). The real backend catalog (`GET/POST /businesses/:id/menu`) has neither — it's `name`/`description`/`price`/`imageUrl`/`isAvailable` only, matching a restaurant-menu use case, not a warehouse.
**Not decided.** Whether "Inventory" should become the existing menu/catalog concept (drop SKU/quantity from the UI) or gain real stock-tracking fields (a schema change). Implementing either without an answer would either silently narrow the feature or add columns nobody asked for.

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

## Decisions that were never actually made

Listed because their absence is itself the finding, and because each will otherwise be silently decided by whoever touches that area next.

| # | Open question | Why it matters |
| --- | --- | --- |
| ⚠️ 1 | **Which brand palette wins** — shipped blue/cyan, or the specced navy/green? | Both exist as tokens; the app is visually inconsistent with its own spec (D-32) |
| ⚠️ 2 | **Should `SUPPORT` outrank `BUSINESS_OWNER`?** | It currently does, granting support staff business-write access (D-17) |
| ⚠️ 3 | **Is Uzbek data *residency* a requirement, or only portability?** | Today's hosting (Railway + Supabase) satisfies portability but not residency (D-04) |
| ⚠️ 4 | **Testing strategy** | Zero tests, no runner, no `test` script, across 118 routes and 132 components |
| ⚠️ 5 | **Monorepo or shared types?** | Two repos hand-maintain parallel type definitions with different TypeScript majors |
| ⚠️ 6 | **Branching / CI** | Single `master` branch, no CI, large multi-concern commits |
| ⚠️ 7 | **Who calls `POST /admin/analytics/aggregate`?** | Nothing schedules it, so `PlatformMetric` is only populated by hand |
| ⚠️ 8 | **Why is analytics ingestion unwired?** | 3 endpoints exist, nothing calls them, and no comment or note explains whether this was deferred or forgotten |
| ⚠️ 9 | **What happens to `Notification` and `PlatformSetting`?** | Both tables exist and are entirely unused; `AdminSettingsView` is the missing consumer of the latter |
| ⚠️ 10 | **Is `restaurantMock` acceptable in production?** | Users currently see invented cuisine/price/delivery data (D-24) |
| ⚠️ 11 | **What does "Inventory" mean for `InventoryView`?** | Mock UI assumes stock/SKU tracking; the real backend catalog has neither (D-54) |
| ⚠️ 12 | **Should the claim flow create real `BusinessClaim` records?** | No endpoint anywhere creates one today, so `GET /me/claims`/`GET /admin/claims` can never show data (Phase 4/5 audits) |
