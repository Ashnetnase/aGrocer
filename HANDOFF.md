# AshHome Development Handoff

## Project

**AshHome** is a private family household assistant (long-term product).
**Agrocer** is its grocery, pantry, meal-planning and grocery-budget module, and is the only
module that exists today. Agrocer remains its own app even once surfaced through AshHome.

Source of truth for scope and stage boundaries: `AGROCER_MASTER_PLAN.md`.
Agent instructions: `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex and others).

## Current Stage

**Stage 2 — Real backend and household data** (IN PROGRESS, started 2026-08-23).

Stage 1 closed as a dev-complete milestone (ADR-012). Staging deployment moved into Stage 2.

Branch: `stage-2/database-schema`. Main branch: `main`.

## Current Working State

What actually runs today:

- The full Agrocer Next.js App Router app, ported from the original Vite build, with its
  Magic Patterns visual language intact. Routes under `app/(app)/`: shopping (plus
  `shopping/mode`), pantry, meals, products, household, settings, and an `app/offline` page.
- **Shopping, pantry and meals read and write Postgres** through their route handlers when
  `NEXT_PUBLIC_AGROCER_SERVER_DATA="1"`. All three verified in the browser against Supabase:
  toggling a shopping item, stepping a pantry quantity, and planning a dinner all persist.
  Products and household are still localStorage.
- Without that flag the whole app runs on localStorage and needs no database at all.
  `AgrocerProvider` picks via `repositoriesForEnvironment()`.
- Domain services (`src/domain/services/`) are pure and fully unit-tested.
- A Docker image builds and has been smoke-tested; a staging runbook exists at `docs/staging.md`.

What is written but **not yet running**:

- Products and household still run on localStorage. Their Drizzle repositories are verified
  (`npm run test:db`) but no route handlers expose them yet.

## Completed

- Stage 1: full port to Next.js App Router, all screens, localStorage repositories,
  hand-written service worker, Docker image, staging runbook, visual confirmation.
- Stage 2 so far:
  - Drizzle schema — `households`, `household_members`, `pantry_items`, `products`,
    `shopping_items`, `meals`, `plan_entries` (`src/db/schema.ts`).
  - Initial migration generated (`drizzle/0000_mysterious_black_cat.sql`).
  - Row/domain mappers with tests (`src/db/mappers.ts`, 23 tests).
  - Drizzle repository implementation behind the Stage 1 contracts.
  - Server-only Drizzle client with dev hot-reload connection caching (`src/db/client.ts`).
  - `.env.example` documenting every required variable.
  - Supabase project provisioned and the schema applied — all 7 tables confirmed present.
  - `.env.local` written and the connection verified from this repository.
  - Drizzle's migration journal reconciled; `npm run db:migrate` is a clean no-op.
  - Integration test suite proving the repositories against real Postgres (`npm run test:db`).
  - `npm run db:seed` — idempotent seed of one household from the Stage 1 demo data.
  - `/api/shopping` route handlers (list, add, batch add, edit, toggle, remove, clear checked).
  - `apiShoppingRepository` — the same contract over HTTP — and the shopping vertical slice
    verified end to end in the browser against Supabase.
  - `/api/pantry` route handlers and `apiPantryRepository`, verified the same way.
  - `/api/meals` (catalogue) and `/api/meals/plan/[day]/[slot]` (weekly plan), plus
    `apiMealsRepository`, verified the same way.
- Phase 0 documentation baseline: this file, `TASKS.md`, `docs/ARCHITECTURE.md`, and the
  expanded `CLAUDE.md` (AshHome vision, interface modes, wall dashboard, device architecture,
  agent safety, handoff system).

## Work In Progress

- **Backend/API architecture** — shopping, pantry and meals have route handlers; products and
  household do not. `src/server/http.ts` (server) and `src/data/api/client.ts` (client) hold
  the shared plumbing the remaining features should reuse.
- **Persistent products / household** — repositories verified, no handlers, still localStorage
  in the UI.

## Files Changed

Recent and important:

- `CLAUDE.md` — expanded from Agrocer-only rules to full AshHome instructions.
- `src/db/schema.ts`, `drizzle/0000_mysterious_black_cat.sql` — Stage 2 schema and migration.
- `src/db/mappers.ts` + test — database row ↔ domain object conversion.
- `src/db/client.ts` — server-only Drizzle/postgres-js client.
- `src/data/drizzle/drizzleRepositories.ts` — Drizzle implementation of the repository contracts.
- `src/data/repositories/types.ts` — the contracts both implementations satisfy. Do not change
  these casually; both the local and Drizzle repositories depend on them.
- `.env.example` — Supabase variables, `AGROCER_HOUSEHOLD_ID`, the server-shopping flag.
- `scripts/seed.ts` + `npm run db:seed` — seeds one household, its members, products, pantry
  and meals. Idempotent by household name.
- `src/server/repositories.ts` — the single place `householdId` is resolved. When auth lands,
  this is what changes; handlers ask for repositories, never for an id.
- `src/server/http.ts` — `parseJson` (Zod-validated bodies), `notFound`, `failed`. Errors are
  logged server-side and returned generic, so no connection string reaches a browser.
- `app/api/shopping/**`, `app/api/pantry/**`, `app/api/meals/**` — the route handlers. Note
  `/api/meals/plan` is matched before `/api/meals/[id]`: Next.js prefers static segments, so
  no meal id can shadow the plan.
- `src/data/api/client.ts` — shared fetch plumbing: `request`, and `patch` whose 404 means
  `undefined` rather than an exception, matching the contracts.
- `src/data/api/{shopping,pantry,meals}Repository.ts` — the contracts over HTTP.
- `src/data/api/repositories.ts` — composes local + server repositories and reads the flag.
- `src/providers/AgrocerProvider.tsx` — default repositories now come from the environment.

## Architecture Decisions

Full list with rationale lives in `AGROCER_MASTER_PLAN.md` (ADR section). Must-preserve:

- **ADR-001** — Magic Patterns preview is the Stage 1 visual source of truth.
- **ADR-002** — Next.js App Router is the target frontend framework.
- **ADR-003** — repository abstraction sits between features and persistence. Swapping storage
  must not touch feature code.
- **ADR-004** — localStorage persistence for Stage 1.
- **ADR-005** — the planner follows real dates by default.
- **ADR-006** — shadcn/Radix used selectively, never as a wholesale redesign.
- **ADR-007** — the main desktop is a development/GPU machine, not 24/7 production.
- **ADR-009** — app content renders client-side behind a hydration gate.
- **ADR-010** — Shopping Mode is a route, not a flag.
- **ADR-011** — Stage 1 keeps a hand-written service worker.
- **ADR-012** — Stage 1 closed dev-complete; staging deployment moved to Stage 2.
- **ADR-013** — Supabase managed PostgreSQL is the Stage 2 database. DynamoDB rejected.

Also binding, from `CLAUDE.md`: AshHome serves mobile, standard app and wall dashboard
(`/dashboard`) from **one** application — never a separate tablet app. The application, not the
LLM, owns permanent state. AI acts only through explicitly defined tools.

## Environment / Services

- Node: 20+ (Next.js 15 / React 19).
- Dev server: `npm run dev` — http://localhost:3000.
- Database: Supabase managed PostgreSQL (ADR-013). **Provisioned 2026-08-27.**
  Project `agrocer`, ref `ojlzjjvrtnslcxqdmpay`, region `ap-southeast-2` (Sydney),
  API URL `https://ojlzjjvrtnslcxqdmpay.supabase.co`. Schema applied, 7 tables live, 0 rows.
  Free tier caps one user at 2 active projects across all orgs they own, so
  `Salon Booking App UI Design` was paused (2026-08-27, user's decision) to make room.
  It is restorable from the Supabase dashboard.
- Variables (see `.env.example`, fill into gitignored `.env.local`):
  `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`.
- Planned staging VM: `agrocer-stg01` (spec in master plan section 12). Not yet provisioned.
- Ollama (Phase 7, not started): will run on a separate machine with an RTX 5070 12 GB,
  reached over the LAN through a backend AI service. No variable defined yet.
- Never record credentials in this file.

## Verification

Last run 2026-08-27, all passing:

- `npm run typecheck` — clean.
- `npm run lint` — no ESLint warnings or errors. (Note: `next lint` prints a deprecation
  warning; it is removed in Next.js 16 and will need migrating to the ESLint CLI.)
- `npm run test` — 112 tests across 8 files. Excludes integration tests.
- `npm run test:db` — 6 integration tests against the real Supabase database, all passing.
  Needs `.env.local`; skips itself when `DATABASE_URL` is absent, so CI stays green.
- `npm run db:migrate` — runs clean and applies nothing, which is the expected state.
- `npm run build` — clean. The three `/api/shopping` routes are dynamic; every screen is still
  statically prerendered, and no server-only module leaked into a client bundle.
- `npm run check` runs typecheck, lint and the unit tests.
- Manual end-to-end check in Chrome against `localhost:3001/shopping`: items created through
  the API rendered in the UI, and toggling one in the UI persisted to Supabase. Test rows were
  deleted afterwards; the shopping list is empty.

Confirmed after the integration run: every table is back to 0 rows. The tests create a
throwaway household and delete it, and the foreign keys cascade.

## Known Problems

- `products` has no repository method that creates rows — the contract exposes only `list`,
  `update` and `toggleFavourite`. Stage 1 seeded products locally; nothing seeds them into
  Postgres yet, so the products screen will be empty once the app is switched over.
- `reset()` deliberately throws against the database. Any UI still calling it (the Settings
  screen did in Stage 1) will need handling before the switch.
- **RLS is disabled on all 7 tables.** Anyone holding the anon key can read or modify every
  row. The tables are empty, so nothing is exposed yet, but this must be closed before any
  real family data is entered. Enabling RLS without policies blocks all access, so it has to
  land together with authentication — see `TASKS.md`.
- `.env.example` had been renamed rather than copied when `.env.local` was created, so it was
  briefly missing from the repository. Restored, and updated to the newer Supabase key names
  (`SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`).
- `AGROCER_MASTER_PLAN.md` cites the migration as `drizzle/0000_bouncy_shockwave.sql`; the
  actual file is `drizzle/0000_mysterious_black_cat.sql`. The repository is correct.
- `next lint` is deprecated (removed in Next.js 16).
- Two roadmaps currently coexist: the master plan's Stages 1–8 and the AshHome Phases 0–14 in
  `CLAUDE.md`. Not yet reconciled — see `TASKS.md`. Ask before treating either as authoritative
  where they disagree.
- HTTPS approach for staging is undecided, which blocks PWA install on a phone
  (a LAN address over plain HTTP is not a secure context). `docs/staging.md` compares options;
  Tailscale is the standing recommendation.

## NEXT TASK

Convert the last two features, which are both small:

- **Products** — `list`, `update`, `toggleFavourite` only. Note the catalogue has no create
  method in the contract, so `npm run db:seed` is still the only thing that puts products in
  Postgres. Worth deciding whether Stage 2 should add one.
- **Household** — `get`, `addMember`, `updateMember`, `removeMember`, `updateSettings`.
  Settings and members are one resource in the contract but read like two in the UI.

Then authentication plus RLS, which must land before any real family data is entered.

Two costs still deliberately unpaid, worth deciding before the last three features repeat them:

- **Every write refetches the whole list.** Free against localStorage, a round trip to Sydney
  now. Fine for a family-sized list; revisit if a list grows.
- **No optimistic UI.** A toggle or a stepper waits for the server, so it feels slower than
  Stage 1 did. Most visible on the pantry steppers, where taps come in bursts.

## Do Not Accidentally Change

- `src/data/repositories/types.ts` — the shared contracts. Both repository implementations and
  the provider depend on them.
- The localStorage repositories. They are the working app; do not delete them when the Drizzle
  path starts working. The provider takes repositories as a prop specifically to allow both.
- The Magic Patterns visual language and mobile UX. Do not redesign screens because a library
  ships a different default component.
- The hand-written service worker (ADR-011).
- `legacy/` — the original Vite implementation, kept for reference.

## Last Updated

2026-08-27
