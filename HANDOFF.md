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

- The PostgreSQL schema is now live in Supabase (all 7 tables, 0 rows), but nothing in this
  repository has connected to it — the schema was applied through the Supabase API, not by
  the app or by `drizzle-kit`.
- The Drizzle repository implementation (`src/data/drizzle/drizzleRepositories.ts`). It satisfies
  the same contracts as the local repositories but is not wired into the provider and has never
  executed a query against a live database.
- `src/db/client.ts` throws unless `DATABASE_URL` is set. The Supabase project now exists, but
  `.env.local` has not been created — the database password is only visible in the Supabase
  dashboard, so nothing has connected to the database from this repository yet.

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
- `npm run test` — 112 tests across 8 files, all passing.
- `npm run check` runs all three.

Not verified: `npm run db:migrate` has never been run from this repository. The schema was
applied to Supabase through the management API instead, and confirmed by listing the tables.
No application query has yet run against the database.

## Known Problems

- The Drizzle repositories and mappers are unit-tested but have **never touched a real
  database**. The schema now exists in Supabase, but no query has been run from this
  repository. Treat the repositories as unproven until a real read and write succeed.
- **RLS is disabled on all 7 tables.** Anyone holding the anon key can read or modify every
  row. The tables are empty, so nothing is exposed yet, but this must be closed before any
  real family data is entered. Enabling RLS without policies blocks all access, so it has to
  land together with authentication — see `TASKS.md`.
- **Drizzle's migration journal is out of sync with this database.** The schema was applied
  through the Supabase API rather than `drizzle-kit`, so Supabase records the migration but
  Drizzle's `__drizzle_migrations` table does not exist. Running `npm run db:migrate` against
  this database will try to re-apply `0000` and fail with "type already exists". Reconcile
  before generating migration `0001`.
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

Get the database password from the Supabase dashboard (Project Settings → Database) and write
`.env.local` from `.env.example` with the session-pooler `DATABASE_URL` for project
`ojlzjjvrtnslcxqdmpay`. Only the user can retrieve that password.

Then reconcile Drizzle's migration journal (see Known Problems) so `npm run db:migrate` is
usable for migration `0001` onward.

Then wire `drizzleRepositories` behind Next.js route handlers and verify one vertical slice —
shopping list read + write — end to end against real PostgreSQL. Do not convert every feature
at once, and do not start pantry persistence until the shopping slice works.

RLS plus authentication is the task after that, and must land before any real family data
is entered.

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
