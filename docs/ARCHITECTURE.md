# Agrocer / AshHome Architecture

Describes what the repository **currently** contains, then what is **planned**.
Scope and stage boundaries: `AGROCER_MASTER_PLAN.md`. Live state: `HANDOFF.md`.

Last updated: 2026-08-27 (Stage 2 in progress).

---

# Current

## Shape

A single Next.js 15 App Router application (React 19, TypeScript, Tailwind). One deployable,
one codebase. All persistence today is browser localStorage behind repository interfaces.

```
app/                    Next.js routes
  (app)/                shopping · shopping/mode · pantry · meals · products · household · settings
  offline/              offline fallback page
src/
  components/           shared UI (agrocer/, agrocer/form/, layout/)
  features/             per-feature UI: home, shopping, pantry, meals, products, household, settings
  domain/               types, Zod schemas, pure services (dates, shopping, pantry, meals, household)
  data/
    repositories/       the contracts — PantryRepository, ShoppingRepository, MealsRepository,
                        ProductsRepository, HouseholdRepository, bundled as AgrocerRepositories
    local/              localStorage implementation (the one in use)
    drizzle/            PostgreSQL implementation (written, not yet wired)
    seed/               initial demo data
  db/                   Drizzle schema, migration client, row ↔ domain mappers
  providers/            AgrocerProvider — app state, takes repositories as a prop
  lib/                  formatting and utility helpers
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
   ┌────┴────┐
localStorage   Drizzle/PostgreSQL
 (in use)       (written, unwired)
```

The repository boundary (ADR-003) is the key seam: swapping storage must not touch feature code.
`AgrocerProvider` accepts repositories as a prop and defaults to `localRepositories`, so both
implementations can coexist — see `src/providers/AgrocerProvider.tsx:86`.

Domain services are pure functions. They take data and return data, never perform I/O, and carry
the bulk of the test suite.

## Database (schema exists, not yet running)

Drizzle ORM over postgres-js, targeting Supabase managed PostgreSQL (ADR-013).
Seven tables in `src/db/schema.ts`: `households`, `household_members`, `pantry_items`,
`products`, `shopping_items`, `meals`, `plan_entries`. Migration:
`drizzle/0000_mysterious_black_cat.sql` — generated, never applied.

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
Database: `db:generate` · `db:migrate` · `db:studio`. Tests are Vitest, 112 across 8 files.
Docker image builds; staging runbook in `docs/staging.md`.

---

# Planned

Not built. Listed so current choices do not foreclose them.

## Interface modes

AshHome serves three modes from **one application**, never a separate tablet app:

- **Mobile** — quick shopping additions, reminders, tasks, AI assistant.
- **Standard app** — desktop/laptop/tablet; administration, detailed editing, configuration.
- **Wall dashboard** — a dedicated 10–11" Android tablet in kiosk mode at `/dashboard`; large
  touch targets, glanceable, readable from several metres, always open.

The dashboard reuses the same feature modules, API and data with a dedicated layout.

## Backend/API

Route handlers or server actions in front of the Drizzle repositories, then Supabase Auth and
household permissions with RLS as defence in depth. The repository contracts stay the seam.

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
