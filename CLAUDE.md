# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Express + TypeScript REST API (ESM, Node.js) for a handyman/service-marketplace app operating in Egypt (EGP currency). Customers post proposals, handymen submit offers, customers accept one offer and the job proceeds through stages to completion, review, and payment.

## Commands

```bash
pnpm dev              # tsx watch src/index.ts — dev server with hot reload
pnpm build            # prisma generate && tsc && tsc-alias — full production build to dist/
pnpm start            # node dist/index.js — run built output
pnpm compile          # tsc --noEmit — typecheck only
pnpm lint             # eslint src/
pnpm format           # prettier . --write
pnpm check            # lint + compile — run before considering a change done

pnpm db:generate      # prisma generate
pnpm db:migrate       # prisma migrate dev --skip-generate
pnpm db:seed          # prisma db seed (runs src/database/prisma/seed/index.ts)

pnpm reset            # wipe node_modules/dist/generated, reinstall, regenerate client
```

There is no test suite in this repo. There is no `check-single-file` equivalent — `pnpm compile` type-checks the whole project.

## Architecture

**Request flow:** `src/index.ts` wires global middleware in a fixed order — CORS → JSON body parsing → request logging → **authentication** → `multer.upload.any()` → the router → error boundary. Because `withAuthentication` runs before route registration, every route is authenticated by default; only requests matching the `publicRequests` allowlist in `src/subsystems/auth/with-authentication.ts` (`POST /auth/initiate`, `/auth/verify`, `/auth/refresh`) skip it. In non-production, the header `Authorization: Bearer PA$$` also bypasses auth (see `withAuthentication`) — do not remove this without checking for local/dev tooling dependent on it.

**Layering — routes → services → repositories/database:**
- `src/routes/*.ts` — one file per resource, exports a `(router: Router) => void` that registers Express handlers. Handlers extract identity from `res.locals.entities` (set by `withAuthentication`: `{ user, role, admin?, customer?, handyman? }`), do a manual `if (!xId) throw new Error('Forbidden: ...')` role check, delegate all logic to a `*Service`, and always route errors through `next(error)` — never handle errors inline.
- `src/services/*.ts` — one class per resource (e.g. `CategoryService`), constructed with a Prisma `Client` (`PrismaClient | Prisma.TransactionClient`, see `src/database/lib/types.ts`), holding the actual business logic and Prisma calls. Services are stateless and instantiated per-request (`new XService(client)`), not singletons.
- `src/database/repositories/*.ts` — despite the name, these are **Zod schema definitions**, not data-access classes. Each exports a class with a static `get()` returning a `z.object(...)` describing the API shape of that entity (including nested/related entities via getter-based lazy refs to avoid circular-import issues), plus an inferred TS type. Use `validateSchema()` / `parseSchema()` from `src/lib/utils.ts` against these when validating payloads.
- `src/database/generated/` — Prisma Client output (`generator client { provider = "prisma-client" }`, output `../generated`). Never edit by hand; regenerate via `pnpm db:generate`.
- `src/database/lib/client.ts` — the shared Prisma client singleton (`client`), built with `PrismaPg` adapter over `DATABASE_URL`, cached on `global` outside production to survive dev hot-reloads.

**Subsystems** (`src/subsystems/`) wrap third-party integrations behind small, focused modules:
- `auth/` — `AuthSystem` class (OTP-based phone login via Twilio WhatsApp in production, fixed `123456` OTP outside production) plus the `withAuthentication` middleware.
- `aws/` — S3-compatible object storage (Railway Buckets). `uploadToBucket(file)` uploads a Multer in-memory file and returns a full URL built from the plain-string `S3_ENDPOINT` env var; do not call `s3.config.endpoint()` directly for URL construction — it's an async provider function, not a string (see git history around commit `f18546f`).
- `multer/` — shared `upload` instance using `memoryStorage()`; mounted globally as `upload.any()` in `index.ts`, so files arrive as `req.files` in every route, not just upload endpoints.
- `twilio/` — WhatsApp OTP delivery.

**Path aliases:** `@/*` maps to `src/*` (`tsconfig.json`). The build step runs `tsc-alias` after `tsc` to rewrite these to relative `.js` imports in `dist/`, since Node's ESM loader can't resolve TS path aliases at runtime — always use `@/...` imports in source, never relative paths across top-level directories.

**Errors:** Throw plain `Error` (optionally with a `cause` and/or `.status`/`.code`) from services/routes and always forward via `next(error)`. `withErrorBoundary` (mounted last in `index.ts`) maps errors to HTTP status by inspecting `error.code` (Prisma codes `P2002`→409, `P2025`→404) and by regex-matching `error.message` for words like `unauthorized`, `forbidden`, `not found`, `already exists`/`conflict`, `validation`/`invalid`. Match one of those phrasings (or set `.status` explicitly) rather than inventing new wording, so responses get the right status code.

**Bilingual fields:** Free-text fields meant for end users (e.g. `Category.name`, `Service.name`) are stored as Prisma `Json` in the shape `{ ar: string, en: string }`. Filter them with JSON path queries, e.g. `{ name: { path: ['en'], string_contains: query } }` (see `src/routes/categories.ts`).

**IDs:** All models use `String @id @default(uuid())`. Keep using UUIDs for any new model — this was previously changed to a different scheme by mistake and reverted.

## Database

- Schema: `src/database/prisma/schema.prisma`; config: `prisma.config.ts` (loads `.env` via `dotenv/config`, points at `DATABASE_URL`).
- Migrations live in `src/database/prisma/migrations/`; run `pnpm db:migrate` to create/apply one in dev.
- Seed data: `src/database/prisma/seed/index.ts`, reading `categories.json` and `regions.json` in the same folder.
- Core domain graph: `User` (role: ADMIN/HANDYMAN/CUSTOMER) 1:1-extends to `Admin`/`Customer`/`Handyman`. `Handyman` has an `Application` (KYC/onboarding, status-gated) and belongs to `Region`s/`Service`s. `Category` 1:N `Service`. `Customer` creates `Proposal`s (status machine: `WAITING_OFFERS` → `OFFERS_RECEIVED` → `ACCEPTED` → `IN_PROGRESS` → `AWAITING_COMPLETION` → `COMPLETED`/`CANCELLED`); handymen submit `Offer`s against a proposal; one accepted `Offer` drives `ChatMessage`s, a `Review`, and a `Transaction`.
