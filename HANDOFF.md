# AshHome Development Handoff

## Project

**AshHome** is a private family household assistant (long-term product).
**Agrocer** is its grocery, pantry, meal-planning and grocery-budget module, and is the only
module that exists today. Agrocer remains its own app even once surfaced through AshHome.

Source of truth for scope and stage boundaries: `AGROCER_MASTER_PLAN.md`.
Agent instructions: `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex and others).

## Current Stage

**Stage 2 — Real backend and household data** (IN PROGRESS, started 2026-08-23), plus the
first two slices of **Stage 3 / AshHome Phase 8** (the AI service and the "Ask AshHome" card),
taken 2026-08-28 at Ash's request to bring the AI in "in stages".

Stage 1 closed as a dev-complete milestone (ADR-012). Staging deployment moved into Stage 2.

**Stage 2's blocking item is still Auth + RLS.** The AI slices were chosen so they do not
depend on it and do not make it worse — see the ladder under NEXT TASK.

Branch: `stage-2/database-schema`. Main branch: `main`.

## Current Working State

What actually runs today:

- The full Agrocer Next.js App Router app, ported from the original Vite build, with its
  Magic Patterns visual language intact. Routes under `app/(app)/`: shopping (plus
  `shopping/mode`), pantry, meals, products, household, settings, and an `app/offline` page.
- **The AI service exists and works** (slice 8a, ADR-014). `GET /api/ai/chat` reports
  provider health; `POST /api/ai/chat` takes `{ prompt }` or `{ messages }` and returns one
  whole answer. Behind it: `AiProvider` (`src/ai/types.ts`), chosen in exactly one place
  (`src/ai/provider.ts`), implemented for Ollama (`src/ai/ollamaProvider.ts`).
  **It has no tools, injects no system prompt and persists nothing** — the model cannot read
  or write a single row of household data. That is Phase 9.
- **"Ask AshHome" on the wall dashboard is real** (slice 8b). Type a question, get an answer
  from the local qwen3:8b. Because there are still no tools, the system prompt
  (`src/features/ask/askAshHome.ts`) tells the model to say plainly that it cannot see the
  family's data rather than guess, and the card repeats the limit in a footnote. Verified
  live: asked to list and add to the shopping list, it refuses and points at the app.
- Two AI scripts, easy to confuse: `npm run ai:check` talks straight to Ollama (the original
  connectivity spike); `npm run ai:chat` goes through `/api/ai/chat` and proves the whole
  path, so it needs `npm run dev` running.
- **The wall dashboard exists at `/dashboard`** (Phase 1). It has its own full-screen layout,
  not the phone shell, and reads the same repositories as every other view.
- **Every feature reads and writes Postgres** through its route handlers when
  `NEXT_PUBLIC_AGROCER_SERVER_DATA="1"` — shopping, pantry, meals, products, household. Each
  verified in the browser against Supabase: toggling a shopping item, stepping a pantry
  quantity, planning a dinner, starring a product, and reading the household all persist.
- Without that flag the whole app runs on localStorage and needs no database at all.
  `AgrocerProvider` picks via `repositoriesForEnvironment()`.
- Domain services (`src/domain/services/`) are pure and fully unit-tested.
- A Docker image builds and has been smoke-tested; a staging runbook exists at `docs/staging.md`.

What is written but **not yet running**:

- The localStorage implementation is intact and still runs when the flag is off. It is not
  dead code: it is the no-database path, what the provider's tests use, and the fallback when
  the database is unreachable in development.

## Dashboard, Kids and school status

Required by `CLAUDE.md`, and the first thing to update when any of it changes.

| Dashboard card    | Data                                                              |
| ----------------- | ----------------------------------------------------------------- |
| Kids / Today      | **Partly real** — the household's actual children. No events yet. |
| Family schedule   | **Mock** — one example row. Needs Phase 12.                        |
| Reminders         | **Mock** — one example row. Needs Phase 11.                        |
| Shopping          | **Real and interactive** — Postgres, checkable from the wall.      |
| Tonight's meal    | **Real** — the weekly plan, with image, time and serves.           |
| Chores            | **Mock** — one example row. Needs Phase 12.                        |
| Ask AshHome       | **Real** — asks the local Ollama. No tools, so it cannot see any of the above. |

Every mock card is labelled in the UI as a placeholder, so nobody on the wall mistakes an
example chore for a real one.

- **Kids/School module:** not started. No child profiles, activities or school data exist. The
  Kids card reads `household_members` where `role = 'Child'`.
- **Hero integration:** not started. No Hero credentials, tokens or endpoints exist anywhere in
  this repository, and none may be added — see the hard rules in `CLAUDE.md`.
- **Notification ingestion:** not started. No email ingestion, no `SchoolNotification` type.
- **Calendar integration:** not started. No calendar feed, import or family calendar model.

Cost note: `Tonight's meal` deliberately omits approximate cost and the missing-ingredient
warning. Both need ingredient-level matching against products and pantry, which belongs with
the recipe work. A wrong number on the kitchen wall is worse than no number.

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
  - `/api/products` and `/api/household` (+ `members`), completing all five features.
- Local Ollama connectivity check (`scripts/ollama-check.ts`).
- **AI slice 8a** — `AiProvider` abstraction, `OllamaProvider`, `getAiProvider()`,
  `/api/ai/chat` (health + chat), 12 unit tests, and `npm run ai:chat` for the end-to-end
  check. Verified against real Ollama and against a dead port. ADR-014 records the shape.
- **AI slice 8b** — the "Ask AshHome" card: `src/features/ask/askAshHome.ts` (system prompt,
  failure wording) with 12 tests, and `src/features/dashboard/AskCard.tsx`. Verified in Chrome
  at a 1280×800 kiosk viewport, including the offline path.
- Phase 1 wall dashboard: `/dashboard` with all seven cards reserved, its own kiosk layout,
  and shopping and tonight's meal already on real data.
- Phase 0 documentation baseline: this file, `TASKS.md`, `docs/ARCHITECTURE.md`, and the
  expanded `CLAUDE.md` (AshHome vision, interface modes, wall dashboard, device architecture,
  agent safety, handoff system).

## Work In Progress

None of the five features. What remains in Stage 2 is authentication, RLS, deployment and CI —
not data plumbing.

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
- `app/api/{shopping,pantry,meals,products,household}/**` — the route handlers. Note
  `/api/meals/plan` is matched before `/api/meals/[id]`: Next.js prefers static segments, so
  no meal id can shadow the plan.
- `src/data/api/client.ts` — shared fetch plumbing: `request`, and `patch` whose 404 means
  `undefined` rather than an exception, matching the contracts.
- `src/data/api/{shopping,pantry,meals,products,household}Repository.ts` — the contracts over
  HTTP. `src/data/api/repositories.ts` exports `apiRepositories` (all five) and the flag check.
- `src/components/layout/BottomNav.tsx` — the shopping badge now waits for `hydrated`.
- `scripts/ollama-check.ts` + `npm run ai:check` — the local Ollama connectivity spike.
- `src/ai/types.ts` — `AiProvider` and friends, plus `AiError` with its `kind` and the
  `message` / `publicMessage` split. **The contract to preserve**; a second provider must
  satisfy this rather than change it.
- `src/ai/ollamaProvider.ts` — the only Ollama-shaped code in the repository.
- `src/ai/provider.ts` — `getAiProvider()`, the single place a provider is chosen, cached
  across hot reloads the way `src/db/client.ts` is. Server-only.
- `src/ai/ollamaProvider.test.ts` — 12 tests, `fetch` mocked, pinning every failure
  classification and the discarding of qwen3's reasoning scratchpad.
- `app/api/ai/chat/route.ts` — the AI edge. Bounded at 20 messages of 4,000 characters.
- `scripts/ai-chat.ts` + `npm run ai:chat` — end-to-end check over the route.
- `.env.example` — adds `AI_PROVIDER`; notes the Ollama variables are server-only.
- `src/features/ask/askAshHome.ts` — `ASK_SYSTEM_PROMPT`, `askAshHome()` and
  `describeAskFailure()`. **The prompt is where the model is told it cannot see the household
  data and must not guess.** Revisit it when Phase 9 tools land, not before.
- `src/features/ask/askAshHome.test.ts` — 12 tests: the prompt's guarantees, that no
  conversation history is sent, and that every failure arrives as a readable sentence with no
  status code or address in it.
- `src/features/dashboard/AskCard.tsx` — the card. Moved out of `PlaceholderCards.tsx`, which
  is where it lived while it was one.
- `src/features/dashboard/DashboardCard.tsx` — gained a `note` prop, for a card that is real
  but limited, where "Placeholder" would be a lie and silence would overstate it.
- `app/dashboard/**` — the wall dashboard route and its full-screen layout.
- `src/features/dashboard/**` — `DashboardScreen` (layout and clock), `DashboardCard` (the
  shared frame, including the placeholder label), `ShoppingCard` and `TonightCard` (real data),
  and `PlaceholderCards` (the five reserved areas).
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
- **ADR-014** — AI reaches AshHome only through a server-side provider abstraction. Features
  depend on `AiProvider`, never on Ollama; the implementation is chosen in one place; nothing
  under `src/ai/` may be imported by a client component.
- The system prompt belongs to the **calling feature**, not to `/api/ai/chat`. The route stays
  a transport so each caller owns its own framing.

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
- Ollama: running natively on Windows on this workstation (RTX 5070 12 GB), listening on
  `http://127.0.0.1:11434`. Version 0.33.1. Models installed: `qwen3:8b`, `qwen3:4b`.
  Variables `AI_PROVIDER` (defaults `ollama`), `OLLAMA_BASE_URL` and `OLLAMA_MODEL` are
  documented in `.env.example`; the defaults in the code match, so `.env.local` needs no entry
  for either script or the route to run. All three are **server-only** — never `NEXT_PUBLIC_`.
  **Ollama binds to localhost deliberately and must stay that way.** The check therefore only
  works from this machine. Reaching it from the staging VM is a later, separate decision —
  a tunnel or an authenticated proxy, not `OLLAMA_HOST=0.0.0.0`.
  Open WebUI runs separately in Docker and is untouched by any of this.
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
- `npm run build` — clean. All twelve API routes are dynamic; every screen is still
  statically prerendered, and no server-only module leaked into a client bundle.
- `npm run check` runs typecheck, lint and the unit tests.
- `npm run ai:check` — reached Ollama 0.33.1, confirmed `qwen3:8b`, and got an 849-token
  answer to the New Zealand family-dinner prompt in 9.8s. Both failure paths were exercised
  too: a wrong port prints the connection guidance, an uninstalled model lists what is
  installed and the `ollama pull` command, and both exit 1.

Added 2026-08-28 for the AI service (slice 8a), all passing:

- `npm run check` — 124 tests across 9 files (was 112 across 8). The 12 new ones mock `fetch`
  and pin every `AiError` classification plus the discarding of qwen3's reasoning scratchpad.
- `npm run build` — clean. `/api/ai/chat` is dynamic; every screen is still statically
  prerendered, so nothing under `src/ai/` leaked into a client bundle.
- `npm run ai:chat` — health reported Ollama 0.33.1 with `qwen3:8b` ready; a prompt was
  answered in 3.9s (91 tokens). The `{ messages }` form honoured a system message.
- Validation: empty body, blank prompt and non-JSON each returned 400 with field errors and
  no echo of the body.
- Failure path: with `OLLAMA_BASE_URL` pointed at a dead port, health returned
  `reachable: false` and `POST` returned 503 `{"kind":"unreachable"}` — with the address
  absent from the response and present in the server log, which is the point.

Added 2026-08-28 for the "Ask AshHome" card (slice 8b), all passing:

- `npm run check` — 136 tests across 10 files (was 124/9).
- `npm run build` — clean. `/dashboard` grew 3.05 kB → 5.04 kB.
- Chrome at a real 1280×800 kiosk viewport: an example chip returned a real answer; a typed
  question about the shopping list was correctly refused ("I cannot see your shopping list yet.
  Please open the Agrocer app…") with nothing invented; the answer area scrolls inside its own
  card while the input stays pinned and the page itself still does not scroll; no console
  errors and no hydration warnings.
- Offline path in the UI: with Ollama unreachable the card showed "The assistant is offline. It
  runs on the home PC — check that is on." and a Try again button.
- **Not verified:** the Ask card at a phone-width viewport. The browser tooling would not resize
  below desktop width this session. Low risk — a wrapping example list above a flex row — but
  unchecked.
- Wall dashboard checked in Chrome at a real 1280×800 kiosk viewport: the page itself does not
  scroll, no card clips its content, and checking an item off on the dashboard persisted to
  Supabase — the same row the phone view reads.
- Manual end-to-end checks in Chrome for all five features. Every write verified against
  Supabase, and all test data removed afterwards: shopping 0, pantry 16, meals 8, products 16
  (8 favourites), members 5, plan empty — exactly the seeded state.

Confirmed after the integration run: every table is back to 0 rows. The tests create a
throwaway household and delete it, and the foreign keys cascade.

## Known Problems

- `products` has no repository method that creates rows — the contract exposes only `list`,
  `update` and `toggleFavourite`. `npm run db:seed` is the only thing that puts products into
  Postgres. Deliberately not papered over with a speculative POST; Stage 2 should decide.
- `reset()` throws against the database by design. The Settings screen still offers it, so
  with the server flag on that button will surface an error rather than restoring demo data.
- **First paint shows Stage 1 demo data.** `AgrocerProvider` seeds `initialState` with the
  demo fixtures, so until the load resolves every screen briefly renders someone else's
  groceries. Screens gate on `hydrated`; the nav badge did not, and now does. The underlying
  seeding of `initialState` is untouched and worth revisiting — it was invisible against
  localStorage and is a visible flash over the network.
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
- **A dev server started immediately after `npm run build` serves a stale `.next`** and answers
  HTML 404/500 for routes that exist. Delete `.next` and restart `npm run dev`. Cost an
  investigation on 2026-08-28; `npm run ai:chat` now names this cause when it sees HTML.
- **The Stage 1 service worker (ADR-011) also serves a cached bundle**, so a dashboard change
  can appear not to have worked when it is already on disk and compiled. Unregister the service
  worker and clear the `agrocer-shell-v1` cache in DevTools. Between this and the stale `.next`,
  a dashboard edit was invisible twice over on 2026-08-28 — check both before debugging the code.
- `/api/ai/chat` is unauthenticated, like every other route handler — the same gap Auth + RLS
  closes. It costs GPU time rather than data, since the model has no tools, but it is one more
  reason not to expose the app beyond the LAN before auth lands.
- Two roadmaps currently coexist: the master plan's Stages 1–8 and the AshHome Phases 0–14 in
  `CLAUDE.md`. Not yet reconciled — see `TASKS.md`. Ask before treating either as authoritative
  where they disagree.
- HTTPS approach for staging is undecided, which blocks PWA install on a phone
  (a LAN address over plain HTTP is not a secure context). `docs/staging.md` compares options;
  Tailscale is the standing recommendation.

## NEXT TASK

Ash asked on 2026-08-28 to bring the AI in "in stages". Slices 8a and 8b are done and verified.
The agreed ladder, so a later session does not have to re-derive it:

| Slice | Scope | Status |
| ----- | ----- | ------ |
| 8a | provider abstraction + `/api/ai/chat`, no tools, no writes | **done** |
| 8b | "Ask AshHome" card is a real input, text answers only | **done** |
| 9a | read-only tools: `getShoppingList`, `getPantry`, `getMealPlan` | next |
| 9b | first write tool `addShoppingItem`, behind a confirmation gate | **needs Auth + RLS first** |
| 10 | pantry-aware meal planning | after 9b |

**Ask Ash which of these two to do next — do not assume:**

**(a) Slice 9a — read-only AI tools.** This is what makes the assistant actually useful: it
could answer "what is on the list?" and "what is for dinner?" from real Postgres data instead
of refusing. Shape it as `CLAUDE.md` requires — an explicit allow-list of application
functions, never system access — as a tool-calling loop in `src/ai/`, with the tool
implementations reading through `serverRepositories()` so they are scoped to the household the
same way every route handler is. Read-only, so it is safe before auth. When it lands, revisit
`ASK_SYSTEM_PROMPT` and the card's footnote and example chips: all three currently promise the
assistant *cannot* see the data, and all three become wrong on the same day.

**(b) Authentication with Supabase Auth, then RLS policies on all seven tables** — the
long-standing Stage 2 blocker, unchanged by the AI work. In that order and ideally one pass:
enabling RLS without policies blocks every query, so they belong together. This must land
before any real family data is entered, and the wall dashboard makes it more urgent, not less
— a tablet on the kitchen wall is a permanently logged-in screen in a shared room, so device
identity and session length are part of the design.

Two things (b) should absorb rather than defer:

- `src/server/repositories.ts` reads `AGROCER_HOUSEHOLD_ID` from the environment. That is the
  single place a real session should replace, and it was built to be exactly that.
- The seed script creates a household with no owner. Auth needs to decide how an existing
  household gets claimed by its first real user.

Deferred, and fine to leave deferred: every write still refetches the whole list, and there is
no optimistic UI. Both are more noticeable now that all five features cross the network.

Two costs still deliberately unpaid:

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
- `src/ai/types.ts` — the `AiProvider` contract (ADR-014). A second provider satisfies it; it
  does not get changed to suit one model.
- **`/api/ai/chat` has no tools and injects no system prompt, on purpose.** Tools are Phase 9
  and arrive as an explicit allow-list of application functions. Do not let the model reach
  household data by adding a convenience here.
- **The three places that promise the assistant cannot see the family's data** —
  `ASK_SYSTEM_PROMPT`, the Ask card's `note`, and its example chips. They are consistent on
  purpose. Change all three together when Phase 9 tools make them wrong, and never leave one
  claiming access the model does not have.
- **Ollama stays bound to `127.0.0.1`.** Ash's standing instruction. Reaching it from the
  staging VM is a tunnel or an authenticated proxy, never `OLLAMA_HOST=0.0.0.0`.

## Last Updated

2026-08-28
