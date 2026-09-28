# TECH_STACK — My Andijan

> Two columns per package: **Declared** is the range in `package.json`; **Installed** is the version actually resolved in `node_modules` on this machine (2026-09-28). Nothing here is guessed — a blank or "NOT PRESENT" means it genuinely is not in the project.

---

## 1. At a glance

| Layer | Choice |
| --- | --- |
| Frontend framework | React 19 (SPA, client-rendered) |
| Frontend build | Vite 8 |
| Backend framework | NestJS 10 (Express platform) |
| Languages | TypeScript (frontend 6.0, backend 5.9) |
| Database | PostgreSQL (16 locally; Railway-managed in production) |
| ORM | Prisma 5.22 |
| Auth | JWT access + refresh, `passport-jwt`, bcrypt, phone OTP |
| UI framework | None — Tailwind utility classes + hand-built components |
| Styling | Tailwind CSS 3.4 + PostCSS + Autoprefixer |
| State management | None — React Context + hooks only |
| API client | Hand-written `fetch` wrapper (`src/lib/api.ts`) |
| Validation | `class-validator` (backend); hand-rolled (frontend) |
| Testing | **None** |
| Frontend hosting | Vercel |
| Backend hosting | Railway |
| Object storage | Supabase Storage |
| SMS | Eskiz.uz (built, unconfigured) |
| AI providers | **None** |

Runtime on this machine: **Node v24.18.0, npm 11.16.0**.

---

## 2. Frontend — `myandijan-frontend`

`package.json`: `"name": "myandijan-frontend"`, `"version": "0.0.0"`, `"private": true`, `"type": "module"`.

### 2.1 Runtime dependencies

| Package | Declared | Installed | Role |
| --- | --- | --- | --- |
| `react` | `^19.2.8` | **19.2.8** | UI runtime |
| `react-dom` | `^19.2.8` | **19.2.8** | DOM renderer |
| `react-router-dom` | `^7.18.2` | **7.18.2** | Routing (`BrowserRouter`, lang-prefixed routes) |
| `framer-motion` | `^13.1.0` | **13.1.0** | Animation; `MotionConfig reducedMotion="user"` app-wide |
| `leaflet` | `^1.9.4` | **1.9.4** | Map engine |
| `react-leaflet` | `^5.0.0` | **5.0.0** | React bindings for Leaflet |
| `@types/leaflet` | `^1.9.22` | — | Leaflet types (**declared as a runtime dep, not a devDep** — likely unintentional) |
| `recharts` | `^3.10.1` | **3.10.1** | Charts (owner/admin analytics, traffic chart) |
| `lucide-react` | `^1.31.0` | **1.31.0** | Icon set; `Category.icon` stores lucide icon names |
| `react-helmet-async` | `^3.0.0` | **3.0.0** | `<head>` management for SEO + JSON-LD |

### 2.2 Dev dependencies

| Package | Declared | Installed | Role |
| --- | --- | --- | --- |
| `typescript` | `~6.0.2` | **6.0.3** | Type system |
| `vite` | `^8.2.0` | **8.2.1** | Dev server + bundler |
| `@vitejs/plugin-react` | `^6.0.4` | — | React plugin (HMR, JSX) |
| `tailwindcss` | `^3.4.19` | **3.4.19** | Utility CSS |
| `postcss` | `^8.5.26` | **8.5.26** | CSS pipeline |
| `autoprefixer` | `^10.5.4` | **10.5.4** | Vendor prefixing |
| `oxlint` | `^1.75.0` | **1.78.0** | Linter (Rust-based; **not ESLint**) |
| `sharp` | `^0.35.3` | **0.35.3** | Image processing for `scripts/generate-og-image.ts` |
| `tsx` | `^4.23.12` | **4.23.12** | Runs the TS scripts in `scripts/` |
| `@types/node` | `^24.13.3` | — | Node types |
| `@types/react` | `^19.2.17` | — | React types |
| `@types/react-dom` | `^19.2.3` | — | React DOM types |

### 2.3 Scripts

| Script | Command |
| --- | --- |
| `dev` | `vite` |
| `build` | `tsc -b && vite build` — **type-checks before bundling; a type error fails the build** |
| `lint` | `oxlint` |
| `preview` | `vite preview` |
| `sitemap` | `tsx scripts/generate-sitemap.ts` |
| `og-image` | `tsx scripts/generate-og-image.ts` |

**No `test` script.**

### 2.4 Config files

`vite.config.ts`, `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json` (project references, hence `tsc -b`), `tailwind.config.ts`, `postcss.config.js`, `.oxlintrc.json`, `vercel.json`, `.claude/launch.json` (dev server on port **5180**).

### 2.5 Deliberately absent from the frontend

No Redux / Zustand / Jotai / MobX. No React Query / SWR / Apollo. No Axios. No React Hook Form / Formik / Zod / Yup. No component library (MUI / Chakra / shadcn / Radix / Headless UI). No `react-i18next` or `i18next` — i18n is custom. No Jest / Vitest / Testing Library / Playwright / Cypress. No Storybook. No ESLint or Prettier (Oxlint only). No Sentry.

---

## 3. Backend — `my-andijan-api`

`package.json`: `"name": "my-andijan-api"`, `"version": "0.1.0"`, `"license": "UNLICENSED"`, `"private": true`, `"engines": { "node": "22.x" }`.

> Note the Node mismatch: the API pins `22.x` while this machine runs **v24.18.0**. Railway honours `engines`; local development does not.

### 3.1 Runtime dependencies

| Package | Declared | Installed | Role |
| --- | --- | --- | --- |
| `@nestjs/common` | `^10.4.15` | **10.4.22** | Core decorators, pipes, guards |
| `@nestjs/core` | `^10.4.15` | **10.4.22** | DI container, module system |
| `@nestjs/platform-express` | `^10.4.15` | — | HTTP adapter (Express) |
| `@nestjs/jwt` | `^10.2.0` | **10.2.0** | JWT signing/verification |
| `@nestjs/passport` | `^10.0.3` | **10.0.3** | Passport integration |
| `@nestjs/swagger` | `^7.4.2` | **7.4.2** | OpenAPI doc generation at `/docs` |
| `@prisma/client` | `^5.22.0` | **5.22.0** | Generated DB client |
| `@supabase/supabase-js` | `^2.112.3` | **2.112.3** | Supabase Storage uploads |
| `bcrypt` | `^5.1.1` | **5.1.1** | Password hashing, cost 12 |
| `class-validator` | `^0.14.1` | **0.14.4** | DTO validation |
| `class-transformer` | `^0.5.1` | **0.5.1** | DTO transformation |
| `passport` | `^0.7.0` | **0.7.0** | Auth middleware |
| `passport-jwt` | `^4.0.1` | **4.0.1** | Bearer-token strategy |
| `reflect-metadata` | `^0.2.2` | — | Decorator metadata |
| `rxjs` | `^7.8.1` | **7.8.2** | Nest's reactive primitives |
| `uuid` | `^10.0.0` | **10.0.0** | ID generation (**not** used for primary keys — those are `Int` autoincrement) |

### 3.2 Dev dependencies

| Package | Declared | Installed | Role |
| --- | --- | --- | --- |
| `prisma` | `^5.22.0` | **5.22.0** | Migrations, Studio, generate |
| `typescript` | `^5.7.2` | **5.9.3** | Type system |
| `@nestjs/cli` | `^10.4.9` | — | `nest build` / `nest start` |
| `ts-node` | `^10.9.2` | — | Runs `prisma/seed.ts` |
| `@types/bcrypt` | `^5.0.2` | — | Types |
| `@types/express` | `^4.17.21` | — | Types |
| `@types/multer` | `^2.2.0` | — | File-upload types |
| `@types/node` | `^22.10.2` | — | Types (matches the `22.x` engine) |
| `@types/passport-jwt` | `^4.0.1` | — | Types |
| `@types/uuid` | `^10.0.0` | — | Types |

> `multer` itself is not a direct dependency — it comes via `@nestjs/platform-express`, which is why only its types are declared.

### 3.3 Scripts

| Script | Command |
| --- | --- |
| `postinstall` | `prisma generate` |
| `build` | `nest build` |
| `start` / `start:dev` / `start:debug` | `nest start` / `--watch` / `--debug --watch` |
| `start:prod` | `node dist/main` |
| `format` | `prettier --write "src/**/*.ts"` — **`prettier` is not in `devDependencies`; this script will fail on a clean install** |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts" --fix` — **`eslint` is not in `devDependencies`; same problem** |
| `prisma:generate` / `prisma:migrate` / `prisma:studio` | Prisma CLI passthroughs |
| `db:seed` | `ts-node prisma/seed.ts` (also registered under the `prisma.seed` key) |

**No `test` script.**

### 3.4 `allowScripts` allow-list

`package.json` carries an `allowScripts` block permitting post-install scripts for `@nestjs/core@10.4.22`, `@prisma/client@5.22.0`, `@prisma/engines@5.22.0`, `bcrypt@5.1.1`, `prisma@5.22.0`. This is a supply-chain-hardening convention (`@lavamoat/allow-scripts` style), though the tool that consumes it is **not** a declared dependency.

### 3.5 Config files

`nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `railway.json`, `docker-compose.yml`, `prisma/schema.prisma`, `.env.example`, `PRIVACY_POLICY.md`.

### 3.6 Deliberately absent from the backend

No `@nestjs/config` (env read straight from `process.env`). No `@nestjs/throttler` (only a hand-rolled OTP rate limit). No `@nestjs/schedule` (no cron). No cache module, no Redis, no BullMQ. No `helmet`, no `compression`, no `cookie-parser` (tokens are bearer-only). No Jest / Supertest / `@nestjs/testing`. No Sentry. No `winston`/`pino`. No `nodemailer` or email provider. No payment SDK. No AI/LLM SDK.

---

## 4. Database

| Item | Value |
| --- | --- |
| Engine | PostgreSQL |
| Local | `postgres:16` via `docker-compose.yml` — user `andijan`, db `my_andijan`, port 5432, `pg_isready` healthcheck, named volume `my_andijan_pgdata` |
| Production | Railway-managed PostgreSQL (version **UNKNOWN** — not inspectable from the repo) |
| ORM | Prisma 5.22.0, `prisma-client-js` generator |
| Provider lock | `prisma/migrations/migration_lock.toml` → `provider = "postgresql"` |
| Extensions | **`pg_trgm` only** (standard contrib). No PostGIS, no `unaccent`, no proprietary extensions — the schema states the DB must be relocatable to an Uzbek host. |
| Custom SQL | 4 PL/pgSQL functions: `search_normalize`, `business_search_doc`, `product_search_doc`, `search_tsquery` |
| Scale | 31 models, 19 enums, 11 migrations |

---

## 5. Hosting, cloud and external services

| Service | Use | Config location | Status |
| --- | --- | --- | --- |
| **Vercel** | Frontend | `vercel.json`, `.vercel/` | Active; **deployed build is behind HEAD**. Project `prj_qdOeePSAfGZVPyKNDBPYOAjj3iOH`, team `john-s3`. Not Git-connected. |
| **Railway** | API + PostgreSQL | `railway.json` | Active and current |
| **Supabase** | Storage, bucket `myandijan-images` | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Active |
| **Eskiz.uz** | SMS / OTP | `ESKIZ_EMAIL`, `ESKIZ_PASSWORD`, `ESKIZ_FROM`, `ESKIZ_BASE_URL` | **Built, not configured** — degrades to logging |
| **UzCloud** | Domain `myandijan.uz` | — | Mentioned in a session prompt; **not verifiable from the repos** |
| Click / Payme / Uzum | Payments | `src/lib/premium.ts` (labels only) | **Not integrated** |
| Telegram / Google | Social login | Signup UI buttons | **Not integrated** |

---

## 6. External APIs consumed

| API | By | Status |
| --- | --- | --- |
| Supabase Storage REST | API `UploadService` | Working |
| Eskiz `POST /auth/login`, `POST /message/sms/send` | API `SmsService` | Implemented, unconfigured |
| OpenStreetMap-style tiles | Frontend Leaflet | Working (exact provider **UNKNOWN**) |
| Weather | — | **Placeholder.** `src/pages/home/HeroSection.tsx:30` — `// TODO: Replace with real weather API` |

---

## 7. AI providers / models

**None.** No AI SDK, no model API, no inference, no embeddings, no vector store in either repository. A full-text search across both `src` trees for `openai`, `anthropic`, `gpt`, `gemini`, `llm` and `embedding` returns zero matches.

AI was the **development method** (Claude Code, ~7 sessions, models `sonnet` then `claude-opus-5`), not a product capability. See `AI.md`.

---

## 8. Version-consistency observations

Worth a decision, not urgent:

1. **TypeScript majors differ**: frontend `6.0.3`, backend `5.9.3`. With no shared type package this is harmless today, but it blocks trivially extracting one.
2. **Node targets differ**: API pins `22.x`; the dev machine and the frontend's `@types/node` are on 24.
3. **`@types/leaflet` is a runtime dependency** in the frontend — it belongs in `devDependencies`.
4. **`format` and `lint` scripts in the API reference `prettier` and `eslint`, neither of which is installed.** Both fail on a clean checkout.
5. **`oxlint` drifted** from the declared `^1.75.0` to installed `1.78.0` — expected with a caret range, noted only because there is no lockfile-enforced install step in any CI (there is no CI).
