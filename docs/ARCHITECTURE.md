# Agrocer / AshHome Architecture

Describes what the repository **currently** contains, then what is **planned**.
Scope and stage boundaries: `AGROCER_MASTER_PLAN.md`. Live state: `HANDOFF.md`.

Last updated: 2026-08-30 (Stage 5 in progress).

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
ap-southeast-2. Thirteen tables in `src/db/schema.ts`: `households`, `household_members`,
`pantry_items`, `products`, `shopping_items`, `meals`, `plan_entries`, `inventory_events`, and
`meal_feedback`, `retailer_products`, `shopping_product_preferences`, `trolley_jobs`, and
`retailer_product_search_jobs`. Migrations `0000`–`0010` are applied; `0006` adds the nullable
`households.weekly_budget_cents` target and `0007` adds nullable JSONB structured ingredient
details beside the legacy `meals.ingredients` text array. `npm run db:seed` creates one household.

The weekly grocery budget is household settings data, not a separate ledger. Zod accepts a
positive NZD target or no target; repositories map NZD to nullable integer cents. Shopping
compares the current list estimate with it and reports remaining/over. Historical spend does
not exist yet.

Meal costs are pure domain estimates from structured recipe amounts and current product-catalogue
package prices. Existing text ingredients remain readable; editing a legacy meal upgrades it by
writing both representations. The UI only displays a total when every ingredient can be priced.

Meal feedback is append-and-read history, loaded on demand when meal detail opens. A rating can
belong to the whole family or one household member and records the planned meal date. The
localStorage implementation deliberately refuses feedback writes: history that exists on one
device but not another is not household history.

## Retailer catalogue and trolley boundary

The mobile PWA never scrapes or controls New World. An optional household-operated catalogue
service exposes validated New World product records to Agrocer's server. The server caches only
products encountered through browse/search and stores explicit household item preferences. A live
feed failure falls back to labelled cached results. The catalogue token is server-only.

Trolley execution is separate: a visible normal-Chrome extension or Playwright fallback receives
only exact confirmed products after an explicit user action. Household-scoped cross-device jobs
let a phone queue both trolley additions and live product searches for a desktop browser. Search
results are validated, cached, and polled back to the originating PWA. Neither path stores retailer
credentials or performs payment or final checkout.

**RLS is enabled on all thirteen tables**, with one household policy per table and no anonymous
access. `npm run db:rls` verifies both the metadata and a publishable-key probe.

`src/db/client.ts` is server-only. It throws when `DATABASE_URL` is absent, caches the client on
`globalThis` so hot reloads do not exhaust the pool, and sets `prepare: false` because Supabase's
transaction pooler cannot cache prepared statements. It must never be imported from a client
component.

## Security posture

Current, as of 2026-08-29 (ADR-016).

**Authentication** is Supabase Auth, email and password, with the session in cookies via
`@supabase/ssr` (ADR-017). A request becomes a household like this:

```
cookie → middleware.ts        refreshes the token every request (a wall tablet
                              never navigates, so nothing else would)
       → currentUser()        getUser(), which verifies — never getSession()
       → household_members    the row whose user_id is that user
       → household_id         what every repository is scoped to
```

`src/server/repositories.ts` is where that happens, and it is the only place. Handlers ask for
repositories, never for an id. **The middleware is a convenience, not the boundary** — it
redirects signed-out visitors, but it is bypassed by calling the API directly, so the boundary
is `currentHouseholdId()`, which every handler goes through. API routes answer 401, never a
redirect.

Signing up grants nothing: an account with no member row gets 403. Linking is
`npm run db:claim`, a deliberate act. Auth is enforced unless `AGROCER_AUTH="off"`, which
fails closed by design.

**RLS is enabled on all thirteen tables**, with policies granting `authenticated` its own
household and `anon` nothing. It does not affect the application: route handlers reach Postgres
as `postgres`, which owns the tables and has `rolbypassrls`. RLS is the wall around the
**publishable key**, which is public by design and which Supabase otherwise exposes every table
to through PostgREST.

So enforcement lives in two places on purpose:

| Concern | Enforced by |
| ------- | ----------- |
| One family's data stays separate | The application — `src/server/repositories.ts` |
| A data/action request has a household | The application — 401/403 from its route handler |
| The public key reads and writes nothing | The database — RLS, no grant to `anon` |
| A signed-in token hitting PostgREST directly sees only its own household | The database — the `authenticated` policies |

`npm run db:rls` verifies both halves: it reports the connecting role and per-table RLS state,
then *tries* the publishable key against every table and fails if any read succeeds. It only
reads, so it is safe to run against production.

The accepted cost: because the application bypasses RLS, a bug in household scoping is not
caught by the database. Running application queries as the authenticated user instead remains a
future hardening option.

## Rendering and offline

App content renders client-side behind a hydration gate (ADR-009). Shopping Mode is its own
route rather than a flag (ADR-010). A hand-written service worker provides offline support
(ADR-011) — deliberately not a generated one.

## AI service

Current, as of 2026-08-29 (ADR-014, ADR-015, ADR-018). Provider abstraction, two assistant
routes, read-only tools, and confirmed shopping-list additions.

```
src/features/dashboard/      "Ask AshHome" card on the wall dashboard
  AskCard.tsx
        ↓
src/features/ask/            the request, and failure → readable sentence
  askAshHome.ts
        ↓
app/api/ai/ask/route.ts      POST a question → an answer, or a PROPOSAL
        ↓
src/ai/assistant.ts          the system prompt and the tool loop (max 3 rounds)
        ├──────────────────→ src/ai/tools/readOnly.ts   getShoppingList · getPantry
        │                          ↓                    getMealPlan — these RUN
        │                    serverRepositories() → Drizzle → PostgreSQL
        │
        └──────────────────→ src/ai/tools/write.ts      addShoppingItem — this does NOT run.
                                                        The loop stops and returns a proposal.

app/api/ai/confirm/route.ts  the ONLY path that executes a write. No model involved.
        ↓                    Re-validates the tool name and the arguments.
   src/ai/tools/write.ts → serverRepositories() → Drizzle → PostgreSQL
        ↓
src/ai/provider.ts           getAiProvider() — the ONLY place a provider is chosen
        ↓
src/ai/types.ts              AiProvider, AiMessage, AiChatResult, AiToolSpec, AiError
        ↓
src/ai/ollamaProvider.ts     the only Ollama-shaped code in the repository
        ↓
Ollama on 127.0.0.1:11434    qwen3:8b (RTX 5070)
```

Two routes, deliberately distinct. `/api/ai/ask` is the assistant: it owns the prompt, runs the
tool loop, and is the only path by which a model reaches household data. `/api/ai/chat` is the
raw transport: no prompt, no tools, no data.

**The AI proposes writes; a person confirms them** (ADR-018). A write tool is never executed
by the assistant loop — the model calls it, the loop validates the arguments and returns an
`AssistantProposal`, and nothing happens until somebody presses a button. The sentence they
read is generated server-side from the validated arguments, never taken from the model's prose,
so what is agreed to is exactly what will run. `WRITE_TOOLS` is a *sibling* of
`READ_ONLY_TOOLS`, not a member, so the gate applies by construction.

**Tools are an allow-list, not a bridge** (ADR-015). Lookup is by exact name against a fixed
record; nothing maps model output onto a repository method. Every 9a tool takes no arguments,
so nothing the model emits can widen what it reads. Tools get their repositories from
`serverRepositories()`, so they inherit household scoping. They return prose, withholding ids
and per-item prices — a small local model reads a sentence more reliably than an object graph,
and every field handed over is one it can garble.

The same seam as the repositories (ADR-003), applied to inference: features depend on
`AiProvider`, and swapping qwen3 for gemma — or Ollama for a cloud provider — changes
`src/ai/provider.ts` and nothing else. `AI_PROVIDER` selects it; only `ollama` is implemented.

Everything under `src/ai/` is server-side. `OLLAMA_BASE_URL` describes the inside of the home
network and must never reach a browser.

`AiError` carries a `kind` (`unreachable | modelMissing | timeout | upstream | config`), a
detailed `message` for the server log, and a `publicMessage` safe to show a user. The route maps
the kind to 503/504/502, so a caller can distinguish a misconfigured server from a slow one
without learning the address.

Ollama binds to localhost deliberately, so this works only on the workstation running it. From
the staging VM the route returns 503 `unreachable` until a tunnel or authenticated proxy is
decided — see ADR-020: bind to the LAN with a firewall rule scoped to the one host that needs
it, because the GPU is in the workstation and the always-on server has none.

**The system prompt lives with the tools**, in `src/ai/assistant.ts`. It named nothing but the
model's limits while there were no tools, and lived on the client; once it had to describe tools
it moved server-side, because a prompt that describes tools and the tools themselves drift apart
if they live in different places. It is not a secret and not a security boundary — the allow-list
is the security boundary.

The assistant can read the shopping list, pantry and meal plan, and can *propose* adding one
or several shopping items. All write calls from one model turn become one ordered proposal;
the dashboard lists every server-generated action description behind one confirmation. The
assistant loop executes none of them. `/api/ai/confirm` re-validates the complete list and uses
the shopping repository's batch-add path; one invalid action refuses the whole proposal. It
cannot change anything else, and cannot see the family calendar, chores,
reminders or school information, because none of that exists as data yet. The prompt tells it to answer only from what a tool returned and never
to invent an item, a quantity or a date; the card repeats the limits in a footnote and labels
which data an answer came from. On a kitchen wall, an assistant that appears to know what is in
the freezer and is guessing is worse than one that admits it cannot look.

No conversation history is kept, here or anywhere else: each question stands alone.

Deliberately absent, each belonging to a named later phase: shopping edits/removals and other
write tools, conversation persistence (the application owns state, not the model), and streaming.

Two scripts, easy to confuse: `npm run ai:check` talks straight to Ollama and proves the machine
can reach it; `npm run ai:chat` goes through `/api/ai/chat` and proves the whole path, so it needs
`npm run dev` running.

## Tooling

`npm run dev` · `build` · `start` · `lint` · `typecheck` · `test` · `check` (all three).
Database: `db:generate` · `db:migrate` · `db:studio` · `db:seed`.
`npm run test:db` runs the integration suite against the real database. Tests are Vitest:
238 unit tests across 19 files, plus 10 integration tests excluded from the default run.
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

The provider abstraction, the local Ollama service, the "Ask AshHome" card and the read-only
tools are **Current** — see the AI service section above. What remains planned: the cloud
fallback implementation (the `AI_PROVIDER` seam exists, the provider does not), write tools with
a confirmation gate, and streaming.

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
