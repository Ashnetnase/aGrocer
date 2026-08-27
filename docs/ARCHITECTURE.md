# Agrocer / AshHome Architecture

Describes what the repository **currently** contains, then what is **planned**.
Scope and stage boundaries: `AGROCER_MASTER_PLAN.md`. Live state: `HANDOFF.md`.

Last updated: 2026-08-27 (Stage 2 in progress).

---

# Current

## Shape

A single Next.js 15 App Router application (React 19, TypeScript, Tailwind). One deployable,
one codebase. Every feature persists to Supabase Postgres through route handlers. The Stage 1
localStorage implementation is retained and still runs when the server flag is off. Both sit
behind the same repository interfaces.

```
app/                    Next.js routes
  (app)/                shopping · shopping/mode · pantry · meals · products · household · settings
  dashboard/            the wall dashboard — its own full-screen layout, not the phone shell
  offline/              offline fallback page
src/
  components/           shared UI (agrocer/, agrocer/form/, layout/)
  features/             per-feature UI: home, shopping, pantry, meals, products, household,
                        settings, dashboard
  domain/               types, Zod schemas, pure services (dates, shopping, pantry, meals, household)
  data/
    repositories/       the contracts — PantryRepository, ShoppingRepository, MealsRepository,
                        ProductsRepository, HouseholdRepository, bundled as AgrocerRepositories
    local/              localStorage implementation (the no-database path)
    drizzle/            PostgreSQL implementation, behind the route handlers
    api/                the same contracts over HTTP (all five features), shared fetch
                        plumbing, and the flag deciding which implementation the app uses
    seed/               initial demo data
  db/                   Drizzle schema, migration client, row ↔ domain mappers
  server/               server-only: householdId resolution, shared route-handler plumbing
  providers/            AgrocerProvider — app state, takes repositories as a prop
  lib/                  formatting and utility helpers
scripts/                seed.ts — deliberate, idempotent database seeding
drizzle/                generated SQL migrations
legacy/                 the original Vite/React Router implementation, kept for reference
docs/                   this file, staging.md
```

## Layering

```
app/ + src/features/     display and routing
        ↓
src/providers/           application state (AgrocerProvider)
        ↓
src/domain/services/     pure business logic — no I/O, fully unit-tested
        ↓
src/data/repositories/   contracts (interfaces only)
        ↓
   ┌────┴───────────────────────┐
localStorage              HTTP → route handlers → Drizzle/PostgreSQL
(when the flag is off)    (all five features; Drizzle is also used
                           directly by scripts and integration tests)
```

Route handlers validate every body with the same Zod schemas the forms use, and return generic
error messages while logging the detail server-side. `householdId` comes from
`AGROCER_HOUSEHOLD_ID` — a deliberate stand-in for authentication, resolved in exactly one
place (`src/server/repositories.ts`) so that auth changes one file.

Server-backed features are opt-in via `NEXT_PUBLIC_AGROCER_SERVER_DATA`. Unset, the app
runs entirely on localStorage and needs no database — which keeps Stage 1 runnable and stops a
broken connection from taking the app down.

The repository boundary (ADR-003) is the key seam: swapping storage must not touch feature code.
`AgrocerProvider` accepts repositories as a prop and otherwise takes them from
`repositoriesForEnvironment()`, so all three implementations can coexist and each feature moves
independently.

Domain services are pure functions. They take data and return data, never perform I/O, and carry
the bulk of the test suite.

## Database

Drizzle ORM over postgres-js on Supabase managed PostgreSQL (ADR-013), project `agrocer` in
ap-southeast-2. Seven tables in `src/db/schema.ts`: `households`, `household_members`,
`pantry_items`, `products`, `shopping_items`, `meals`, `plan_entries`. Migration
`drizzle/0000_mysterious_black_cat.sql` is applied, and `npm run db:seed` creates one household.

**RLS is not yet enabled** — see `TASKS.md`. It ships with authentication, because enabling it
without policies blocks all access.

`src/db/client.ts` is server-only. It throws when `DATABASE_URL` is absent, caches the client on
`globalThis` so hot reloads do not exhaust the pool, and sets `prepare: false` because Supabase's
transaction pooler cannot cache prepared statements. It must never be imported from a client
component.

## Rendering and offline

App content renders client-side behind a hydration gate (ADR-009). Shopping Mode is its own
route rather than a flag (ADR-010). A hand-written service worker provides offline support
(ADR-011) — deliberately not a generated one.

## Tooling

`npm run dev` · `build` · `start` · `lint` · `typecheck` · `test` · `check` (all three).
Database: `db:generate` · `db:migrate` · `db:studio` · `db:seed`.
`npm run test:db` runs the integration suite against the real database. Tests are Vitest:
112 unit tests across 8 files, plus 6 integration tests excluded from the default run.
Docker image builds; staging runbook in `docs/staging.md`.

---

# Planned

Not built. Listed so current choices do not foreclose them.

## Interface modes

Mobile and the standard app exist. The **wall dashboard** now exists too, at `/dashboard`
(Phase 1): its own full-screen layout, seven cards, of which shopping and tonight's meal carry
real data and five are labelled placeholders. It reads the same repositories as every other
view — one source of truth, never a tablet-specific copy.

Still planned:

- **Mobile** — quick shopping additions, reminders, tasks, AI assistant.
- **Standard app** — desktop/laptop/tablet; administration, detailed editing, configuration.
- **Wall dashboard** — a dedicated 10–11" Android tablet in kiosk mode at `/dashboard`; large
  touch targets, glanceable, readable from several metres, always open.

Kiosk/device configuration, real-time updates so a phone change appears on the tablet without a
reload, and dashboard quick-add all remain unbuilt.

## Backend/API

Supabase Auth and household permissions with RLS as defence in depth. `src/server/repositories.ts`
resolves the household id from the environment today and is the single place a real session
replaces. The repository contracts stay the seam.

Products has no create method in its contract — `npm run db:seed` is currently the only way
products reach Postgres, which Stage 2 should revisit.

Two known costs of the current implementation, to revisit rather than replicate blindly: every
write refetches the whole list, and there is no optimistic UI.

## Device configuration

Devices may eventually carry a name, dashboard type, permissions, preferred modules, kiosk
status and display preferences (kitchen tablet / personal phone / admin PC). Not to be built
early, but not to be architecturally excluded either.

## AI

A backend AI service abstraction so no application logic binds to one model. First target is
local Ollama on a separate LAN machine (RTX 5070 12 GB); models may change (Qwen, Gemma, others)
with an optional cloud fallback.

The governing principle:

> LLM = reasoning and language · Database = permanent memory ·
> Application services = actions · Scheduler = reminders

The LLM never gets unrestricted system access. It acts only through explicitly defined tools
(`getShoppingList()`, `addShoppingItem()`, `getPantry()`, `createMealPlan()`, …). Sensitive
actions — external email, deletions, anything spending money, permission changes, destructive
database operations — require confirmation. No purchasing automation, ever, without an explicit
future request.

## Household modules

Reminders and scheduler, chores, family calendar, household maintenance, notifications.

## Home Assistant

Planned, later. AshHome keeps owning groceries, meals, family data, reminders, chores and the
household AI; Home Assistant provides lights, switches, sensors, climate and cameras, with
selected controls surfaced through the AshHome dashboard.

## Deployment

Homelab staging first (ADR-008) on `agrocer-stg01`, with monitoring and backups, then any
cloud evolution. The main desktop is a development/GPU machine and is not 24/7 production
(ADR-007), so staging must stay reachable with it powered off.
