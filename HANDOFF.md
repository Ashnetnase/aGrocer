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
- All persistence is **localStorage**, behind the Stage 1 repository contracts.
  `AgrocerProvider` defaults to `localRepositories` — see `src/providers/AgrocerProvider.tsx:86`.
- Domain services (`src/domain/services/`) are pure and fully unit-tested.
- A Docker image builds and has been smoke-tested; a staging runbook exists at `docs/staging.md`.

What is written but **not yet running**:

- The PostgreSQL schema (`src/db/schema.ts`, 7 tables) and its migration
  (`drizzle/0000_mysterious_black_cat.sql`). Generated but never applied to a real database.
- The Drizzle repository implementation (`src/data/drizzle/drizzleRepositories.ts`). It satisfies
  the same contracts as the local repositories but is not wired into the provider and has never
  executed a query against a live database.
- `src/db/client.ts` throws unless `DATABASE_URL` is set. No Supabase project is provisioned yet.

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
- Phase 0 documentation baseline: this file, `TASKS.md`, `docs/ARCHITECTURE.md`, and the
  expanded `CLAUDE.md` (AshHome vision, interface modes, wall dashboard, device architecture,
  agent safety, handoff system).

## Work In Progress

- **Backend/API architecture** — the Drizzle repository layer exists; Next.js route handlers
  or server actions to expose it do not.
- **Persistent pantry / products / shopping lists / meal plans** — repositories written, not
  wired into `AgrocerProvider`, never run against a database.

## Files Changed

Recent and important:

- `CLAUDE.md` — expanded from Agrocer-only rules to full AshHome instructions.
- `src/db/schema.ts`, `drizzle/0000_mysterious_black_cat.sql` — Stage 2 schema and migration.
- `src/db/mappers.ts` + test — database row ↔ domain object conversion.
- `src/db/client.ts` — server-only Drizzle/postgres-js client.
- `src/data/drizzle/drizzleRepositories.ts` — Drizzle implementation of the repository contracts.
- `src/data/repositories/types.ts` — the contracts both implementations satisfy. Do not change
  these casually; both the local and Drizzle repositories depend on them.
- `.env.example` — Supabase variables.

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
- Database: Supabase managed PostgreSQL. **Not yet provisioned.**
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
- `npm run test` — 112 tests across 8 files, all passing.
- `npm run check` runs all three.

Not verified: `npm run db:migrate` has never been run — there is no database to run it against.

## Known Problems

- The Drizzle repositories and mappers are unit-tested but have **never touched a real
  database**. Treat them as unproven until a migration runs and queries succeed.
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

Provision the Supabase project (ADR-013), put its connection string in `.env.local`, run
`npm run db:migrate` to apply `drizzle/0000_mysterious_black_cat.sql`, and confirm the seven
tables exist. This requires the user's Supabase account and cannot be done by an agent alone.

Once the database is live, the following task is: wire `drizzleRepositories` behind Next.js
route handlers and verify one vertical slice (shopping list read + write) end to end against
real PostgreSQL. Do not convert every feature at once, and do not start authentication,
RLS or pantry persistence until the shopping slice works.

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
