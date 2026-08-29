# AshHome Development Handoff

## Project

**AshHome** is a private family household assistant (long-term product).
**Agrocer** is its grocery, pantry, meal-planning and grocery-budget module, and is the only
module that exists today. Agrocer remains its own app even once surfaced through AshHome.

Source of truth for scope and stage boundaries: `AGROCER_MASTER_PLAN.md`.
Agent instructions: `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex and others).

## Current Stage

**Stage 2 — Real backend and household data**: build work **complete** as of 2026-08-29.
**Stage 3 / AshHome Phases 8–9** complete through slice 9b — all four AI slices landed
2026-08-28/29 at Ash's request to bring the AI in "in stages". **Stage 4 has begun**, with
pantry-to-recipe matching.

Stage 1 closed as a dev-complete milestone (ADR-012).

What remains splits in two, and NEXT TASK keeps them apart:

- **Ash's** — the deploy itself, the Ollama firewall rule, and four other infrastructure items.
  None of them are code.
- **The next agent's** — Stage 4, deciding the structured-ingredient UX required for meal
  cost estimation.

Stage 2 cannot be marked COMPLETE until the deploy and PWA install are done, per `CLAUDE.md`.

Branch: `stage-2/database-schema`. Main branch: `main`.

## Current Working State

What actually runs today:

- **Authentication is enforced** (ADR-017). Email and password via Supabase Auth, session in
  cookies. Every route handler refuses without one (401), and an account not linked to a
  household member is refused too (403). `/sign-in` is the screen; sign-out is on Settings.
  **Ash's account is live and signed in successfully** (2026-08-29):
  `ashley.schippersas@gmail.com` is linked to the `Ash` member of The Ashfords. The other four
  members have no login, which is correct — the children have profiles, not accounts.
- The full Agrocer Next.js App Router app, ported from the original Vite build, with its
  Magic Patterns visual language intact. Routes under `app/(app)/`: shopping (plus
  `shopping/mode`), pantry, meals, products, household, settings, and an `app/offline` page.
- **The AI service exists and works** (slice 8a, ADR-014). `GET /api/ai/chat` reports
  provider health; `POST /api/ai/chat` takes `{ prompt }` or `{ messages }` and returns one
  whole answer. Behind it: `AiProvider` (`src/ai/types.ts`), chosen in exactly one place
  (`src/ai/provider.ts`), implemented for Ollama (`src/ai/ollamaProvider.ts`).
  **It has no tools, injects no system prompt and persists nothing** — the model cannot read
  or write a single row of household data. That is Phase 9.
- **"Ask AshHome" on the wall dashboard is real, and reads real household data** (slices 8b
  and 9a). `POST /api/ai/ask` runs the local qwen3:8b with three read-only tools —
  `getShoppingList`, `getPantry`, `getMealPlan` — behind an explicit allow-list (ADR-015). The
  card labels which data an answer came from ("Checked your pantry").
  Since slice 9b it can also **propose shopping-list additions**. Multi-item requests now carry
  every action into one confirmation list; Add all / Cancel appears before anything is written
  (ADR-018). It cannot change anything
  else, and cannot see the calendar, chores, reminders or school information. The system prompt (`src/ai/assistant.ts`) tells it to answer only from
  what a tool returned and never to invent; the card repeats the limits in a footnote.
  Verified against the real provider: "Add milk and eggs" proposes both, quantity one, and
  performs no write until confirmation.
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
- **Weekly grocery budget target is real.** Settings accepts an optional positive NZD target;
  Shopping shows estimate/remaining/over, Shopping Mode shows estimate against target, and the
  wall Shopping card shows estimate / target. Migration `0006` is applied to Supabase.
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
| Tonight's meal    | **Real** — the plan, plus a missing-ingredient warning from the pantry. |
| Chores            | **Mock** — one example row. Needs Phase 12.                        |
| Ask AshHome       | **Real** — reads list/pantry/plan; proposes list additions, gated. |

Every mock card is labelled in the UI as a placeholder, so nobody on the wall mistakes an
example chore for a real one.

- **RLS:** enabled on **all nine tables** since 2026-08-29 (ADR-016), one `authenticated`
  policy each (ADR-017, and `0005` for the two history tables). `anon` is granted nothing.
  Verify any time with `npm run db:rls`.
- **Authentication:** enforced (ADR-017), and Ash's account is live and signing in.
- **Kids/School module:** not started. No child profiles, activities or school data exist. The
  Kids card reads `household_members` where `role = 'Child'`.
- **Hero integration:** not started. No Hero credentials, tokens or endpoints exist anywhere in
  this repository, and none may be added — see the hard rules in `CLAUDE.md`.
- **Notification ingestion:** not started. No email ingestion, no `SchoolNotification` type.
- **Calendar integration:** not started. No calendar feed, import or family calendar model.

Cost note: `Tonight's meal` now shows the missing-ingredient warning (Stage 4's
pantry-to-recipe matching). **Approximate cost is still deliberately absent** — the warning
needs only to know whether an ingredient is present, while a cost needs quantities and prices
per ingredient, which free-text ingredients cannot give. A wrong number on the kitchen wall is
worse than no number.

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
- **RLS on all 7 tables** (migration `0001_exotic_the_liberteens.sql`, ADR-016), generated
  from `.enableRLS()` in `src/db/schema.ts`. Plus `npm run db:rls`, which verifies the state
  *and* probes the publishable key against every table.
- **Supabase Auth** (ADR-017): `src/auth/` (config, server and browser clients),
  `middleware.ts`, `/sign-in`, sign-out on Settings, `household_members.user_id` (migration
  `0002`), `authenticated` RLS policies (migration `0003`), and `npm run db:claim`.
- **Pantry-to-recipe matching** (Stage 4) — `src/domain/services/recipeMatch.ts`, surfaced on
  the Tonight's meal card. Presence only, not quantities.
- **Weekly grocery budget target** (Stage 4) — optional household setting across localStorage,
  HTTP, and Drizzle; persisted as nullable integer cents and surfaced in shopping views.
- **History tables** — `inventory_events` (written automatically by the pantry repository)
  and `meal_feedback` (append-and-read only), migrations `0004`/`0005`, plus `/api/feedback`.
- **CI** — `.github/workflows/ci.yml`: typecheck, lint, test, build, integration tests, and an
  RLS job that fails if the publishable key can read anything.
- **Deployment** — Stage 2 `docker-compose.yml`, Dockerfile build args, `docs/deploy.md`
  (Cloudflare Tunnel, ADR-019) and `docs/backup.md`.
- Local Ollama connectivity check (`scripts/ollama-check.ts`).
- **AI slice 8a** — `AiProvider` abstraction, `OllamaProvider`, `getAiProvider()`,
  `/api/ai/chat` (health + chat), 12 unit tests, and `npm run ai:chat` for the end-to-end
  check. Verified against real Ollama and against a dead port. ADR-014 records the shape.
- **AI slice 8b** — the "Ask AshHome" card: `src/features/ask/askAshHome.ts` and
  `src/features/dashboard/AskCard.tsx`. Verified in Chrome at a 1280×800 kiosk viewport,
  including the offline path.
- **AI slice 9b** — the first write tool: `src/ai/tools/write.ts` (`WRITE_TOOLS`, a sibling of
  the read record), the proposal path in `src/ai/assistant.ts`, `app/api/ai/confirm`, and the
  Add it / Cancel gate on the card. ADR-018 records the shape.
- **Wall dashboard cards gate on `hydrated`** — Shopping, Tonight's meal and Kids were showing
  the Stage 1 demo fixtures until their fetch resolved.
- **AI slice 9a** — read-only tools: `src/ai/tools/registry.ts` (the allow-list boundary),
  `src/ai/tools/readOnly.ts` (the three tools), `src/ai/assistant.ts` (the loop) and
  `app/api/ai/ask`. Verified against the real Supabase data, not fixtures. ADR-015 records
  the shape and what was rejected.
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
- `src/db/schema.ts` — every table now carries `.enableRLS()`. The header explains why
  deny-all is the finished state rather than an unfinished one.
- `drizzle/0001_exotic_the_liberteens.sql` — seven `ENABLE ROW LEVEL SECURITY` statements and
  nothing else.
- `scripts/rls-check.ts` + `npm run db:rls` — the verification. Checking `pg_class` alone is
  the weaker test, so it also tries the key the way an attacker would.
- `src/server/repositories.ts` — **rewritten for auth.** Still the single place a request
  becomes a household; now it resolves it from the session. `serverRepositories()` is async,
  which is why all fifteen route handlers now await it.
- `src/server/http.ts` — `failed()` maps `AuthError` to 401 (not signed in) or 403 (signed in,
  no household), so no handler has to remember to.
- `src/auth/config.ts` — `authEnabled()` is **true unless `AGROCER_AUTH="off"`**. The direction
  is the point: a security control that defaults to off is how the RLS gap happened.
- `src/auth/server.ts` — `getUser()`, never `getSession()`; the latter trusts the cookie.
- `middleware.ts` — refreshes the session and redirects. **Not the security boundary.** Its
  matcher deliberately excludes `sw.js` and `manifest.webmanifest`, or the PWA breaks.
- `src/features/auth/` — `SignInScreen`, `SignOutButton`, and `describeSignInError`, whose
  tests pin that a wrong password and an unknown email read identically.
- `scripts/claim.ts` + `npm run db:claim` — links an account to a member. Never creates one.
- `src/domain/services/recipeMatch.ts` — pantry-to-recipe matching. **Stricter than
  `matchProduct`'s prefix test on purpose:** a pantry name matches only when a quantity or
  nothing follows it, so "Rice vinegar" does not match "Rice". A wrong price is a rounding
  error; a wrong "you have this" sends somebody to the stove without an onion.
- `src/data/api/authFailure.ts` — `handleUnauthorized()`, the one place a 401 becomes a
  redirect, plus `NotInHouseholdError` for the 403 that must not redirect. `setAuthRedirect()`
  is the test seam.
- `src/data/api/client.ts` — a single `fail()` turns any bad response into an exception, so
  `request` and `patch` cannot drift apart on this.
- `src/features/ask/askAshHome.ts` — `askAshHome()`, `describeAskFailure()` and
  `describeToolsUsed()`. The system prompt used to live here; 9a moved it server-side to
  `src/ai/assistant.ts`, because a prompt that names tools has to live where the tools do.
- `src/features/ask/askAshHome.test.ts` — that no conversation history is sent, and that every
  failure arrives as a readable sentence with no status code or address in it.
- `src/ai/tools/registry.ts` — **the security boundary.** Exact-name lookup against a fixed
  record; there is no dynamic dispatch onto the repositories. A refused tool is returned to
  the model as a tool result, not thrown, so it explains the limit itself.
- `src/ai/tools/write.ts` — `WRITE_TOOLS` and `addShoppingItem`. **A sibling of
  `READ_ONLY_TOOLS`, never a member** (ADR-015, ADR-018), so the confirmation gate applies to
  everything here by construction. Write tools carry a Zod schema; read tools take no arguments.
- `app/api/ai/confirm/route.ts` — the only path that executes a write, and no model is
  involved in it. Re-validates the tool name against `WRITE_TOOLS` and the arguments against
  that tool's schema.
- `src/features/dashboard/{ShoppingCard,TonightCard,PlaceholderCards}.tsx` — now gate on
  `hydrated`. Without it the wall shows the Stage 1 demo fixtures as though they were real.
- `src/providers/AgrocerProvider.tsx` — exposes `refreshShopping`, because `/api/ai/confirm`
  writes outside the repositories and nothing else would know the list had changed.
- `src/ai/tools/readOnly.ts` — the three tools and the `READ_ONLY_TOOLS` allow-list. Adding
  anything here grants the model access to it. They return prose, not JSON, and withhold ids
  and per-item prices.
- `src/ai/assistant.ts` — `ASSISTANT_SYSTEM_PROMPT` and the loop. Caps at 3 tool rounds and
  withholds the tools on the last one, which is what forces an answer.
- `app/api/ai/ask/route.ts` — the assistant route, and the only path by which a model reaches
  household data. `/api/ai/chat` stays a transport with no prompt, no tools and no data.
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
- **ADR-017** — Supabase Auth; the household comes from `household_members.user_id`; signing
  up grants nothing; auth fails closed; the middleware is a convenience and
  `currentHouseholdId()` is the boundary.
- **ADR-019** — HTTPS via the existing Cloudflare Tunnel on `ashnetbase.org`; the container
  binds to `127.0.0.1`, never the LAN; Cloudflare Access deliberately not in front of it.
- **ADR-018** — the AI proposes changes; a person confirms them. Write tools are never
  executed by the assistant loop; the confirmation sentence is built server-side from
  validated arguments; `WRITE_TOOLS` is a sibling of `READ_ONLY_TOOLS`.
- **ADR-015** — the AI reaches household data only through a fixed, read-only tool allow-list.
  Exact-name lookup, zero-argument tools, repositories from `serverRepositories()`, and read
  tools separated from write tools by construction rather than convention.
- `/api/ai/chat` stays a transport with no prompt, no tools and no data. The assistant lives at
  `/api/ai/ask`, so there is exactly one path to household data with a model attached.

Also binding, from `CLAUDE.md`: AshHome serves mobile, standard app and wall dashboard
(`/dashboard`) from **one** application — never a separate tablet app. The application, not the
LLM, owns permanent state. AI acts only through explicitly defined tools.

## Environment / Services

### The home network, as actually measured on 2026-08-29

| Host | Address | Role |
| ---- | ------- | ---- |
| Workstation (this machine) | `192.168.1.222` | RTX 5070, Ollama **0.33.1** (`qwen3:8b`, `qwen3:4b`), bound to `127.0.0.1`. Development. Not 24/7 (ADR-007) |
| `ashnetserv1` | `192.168.1.14` | Proxmox, **no GPU**. Ollama **0.7.1** (`phi3:mini`, `llama3:8b`). Published at `api.chat.ashnetbase.org` |
| homelab services box | `192.168.1.49` | Runs `vault` (8080) and `status` (3001). The likely Agrocer host |
| chat box | `192.168.1.37` | Runs `chat` (8080) |
| `cloudflared` | its own machine | Tunnel `homelab`, ID `7a9f3afc-7fed-4e64-84a5-034cc130374d`, healthy |

- **Deployment: the Cloudflare Tunnel `homelab` on `ashnetbase.org`** (ADR-019).
  `home.ashnetbase.org` → `HTTP` → **`http://<agrocer-host-ip>:3000`** — a LAN IP, **not**
  `localhost`. `cloudflared` runs on a different machine and routes to every service by
  address, which is how the first deploy attempt 502'd. The container publishes `3000:3000`
  to the LAN accordingly. `docs/deploy.md` is the runbook.
- The DNS record and the tunnel route exist and were verified from outside: TLS valid, 502
  returned, which is correct while nothing is listening.
- `agrocer-stg01` as a separate VM is no longer the plan; `docs/staging.md` is kept for its
  VM and Docker steps and is annotated as superseded on HTTPS.

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
  Ollama is currently bound to `127.0.0.1`, so the assistant works **only on this machine**.
  **ADR-020 settles how the deployed app reaches it:** bind the workstation's Ollama to the
  LAN and firewall TCP 11434 to the Agrocer host alone. Earlier notes in this file said
  "never `OLLAMA_HOST=0.0.0.0`" without qualification — that was right about the danger and
  wrong about the mechanism. Ollama has no authentication at all, so *reachability* is the
  entire control, and a source-scoped rule addresses it with fewer moving parts than a tunnel
  for traffic that never leaves the house. A bare `0.0.0.0` with no rule is still wrong.
  Pulling `qwen3:8b` onto `ashnetserv1` instead is **not** viable: no GPU, and 8B on CPU
  answers in tens of seconds.
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
  unchecked. Still unchecked after 9a.

Added 2026-08-29 for the read-only tools (slice 9a), all passing:

- `npm run check` — 165 tests across 12 files (was 136/10).
- `npm run build` — clean. `/api/ai/ask` is dynamic; `/dashboard` is 4.83 kB.
- **Against the real Supabase data, not fixtures.** "What is in our pantry?" called `getPantry`
  and returned all sixteen rows correctly grouped — eight `good`, six `low`/`soon`, two `out` —
  matching the table exactly, with nothing invented. "What can I cook tonight?" called
  `getPantry` and `getMealPlan` and suggested only things actually in stock.
- Honest empty cases: an empty shopping list is reported as empty, and an empty week as nothing
  planned. Neither is filled in.
- Refusals: asked to add bread and milk it declined and pointed at the app; asked about the
  kids' plans tomorrow it said it cannot see the calendar. Both without calling a tool.
- Latency 0.2–1.3s per question on the RTX 5070.
- Chrome at 1280×800: the card answered from the pantry and showed "Checked your pantry" beside
  the question. No console errors, no hydration warnings.

Added 2026-08-29 for RLS (ADR-016), all passing:

- `npm run db:rls` — before: the publishable key read `households`, `household_members`,
  `pantry_items`, `products` and `meals`. After: every table returns zero rows, and a direct
  `POST` to `/rest/v1/households` is refused with
  `42501 new row violates row-level security policy`.
- `npm run test:db` — all 6 integration tests still pass, covering reads *and* writes.
- Through the running app: pantry read, a shopping item added, read back, deleted (204), and
  the AI assistant still called `getShoppingList` and saw the real row. Test row removed; the
  shopping table is back to empty.
- `npm run check` — 165 tests, unchanged. `npm run db:migrate` applied `0001` cleanly.

Added 2026-08-29 for authentication (ADR-017), all passing:

- **Unauthenticated requests are refused.** `/api/shopping`, `/api/pantry`, `/api/meals`,
  `/api/products`, `/api/household` all 401; a `POST` write 401; `POST /api/ai/ask` 401, so the
  assistant and its tools are behind auth too.
- `/` and `/dashboard` redirect to `/sign-in?next=…`. `/sign-in`, `/sw.js` and
  `/manifest.webmanifest` stay 200 signed out — the last two matter for the PWA (ADR-011).
- The sign-in screen renders in the Magic Patterns language; a wrong password shows "That email
  and password do not match.", clears the password and keeps the email.
- `AGROCER_AUTH=off`: API back to 200, pages stop redirecting, and a warning is logged per
  request.
- `npm run db:claim` lists the five members; it refuses an unknown email and an unknown member
  name with usable messages.
- `npm run check` — 169 tests across 13 files. `npm run test:db` — 6 integration tests still
  pass. `npm run build` clean. `npm run db:rls` — RLS on, 1 policy per table, `anon` reads
  nothing.
- **Sign-in confirmed by Ash on 2026-08-29** — the app loads with real household data behind
  the session.

Added 2026-08-29 for client-side 401 handling:

- 174 unit tests across 14 files (up from 169). The new ones pin that 401 redirects with the
  current path carried, 403 does not, ordinary failures are untouched, the sign-in screen does
  not redirect to itself, and server rendering does nothing.
- **Verified live, in the browser, with a real session.** Expiring the auth cookie on an open
  `/dashboard` made `/api/shopping` return 401; the next interaction redirected to
  `/sign-in?next=%2Fdashboard`. That is the wall-tablet scenario end to end.

Added 2026-08-29 for the write gate (slice 9b, ADR-018):

- 194 tests across 15 files (up from 174/14). They pin that a write tool never executes in the
  loop, that the two tool records never overlap, that the confirmation sentence comes from
  validated arguments even when the model's prose contradicts it, and that malformed arguments
  produce no proposal at all.
- **Against the real database:** asking to add bread returned a proposal and left the list
  empty; confirming wrote the row. Six probes at `/api/ai/confirm` — a read tool, an invented
  tool, a repository method as a tool name, an empty name, an unknown category, an absurd
  quantity — all 400, list unchanged.
- Behaviour: it declines to plan meals, restock the pantry or remove items, without
  substituting a shopping addition (which it *did* do before the prompt was tightened).
- The full flow driven in Chrome at 1280×800: proposal shown above the input, Add it pressed,
  row written, Shopping card updated alongside.

Added 2026-08-29 for the end of Stage 2's build work:

- **Inventory events, against the live database.** Create → adjust +3 → delete produced
  exactly `created (after 2)`, `adjusted (delta 3, after 5)`, `removed (after 0)` — all three
  still naming the item with it deleted and the foreign key nulled.
- **Meal feedback** round-tripped through `/api/feedback`; a bad rating and a malformed date
  each returned 400.
- `npm run test:db` — **9 integration tests**, up from 6.
- `npm run check` — 194 tests. `npm run build` clean, and **also clean with `.env.local` moved
  aside and only CI's placeholder `NEXT_PUBLIC_*` values**, which is what proves the build does
  not depend on a live project.
- `npm run db:rls` — 9 tables, RLS on, 1 policy each, publishable key reads nothing.
- `npm run db:migrate` and `npm run db:generate` are both clean no-ops.
- **`pg_dump` verified** against the live project via Docker — 200 KB, all 7 public tables plus
  `auth`, and RLS state and policies included. Test artefacts deleted.

Added 2026-08-29 for pantry-to-recipe matching (Stage 4):

- 212 tests across 16 files, up from 194/15. Sixteen are new, and most are about *false*
  positives — "Rice vinegar" must not match "Rice" — rather than about matching more things.
- **Verified against the real pantry.** Spaghetti Bolognese planned for tonight produced
  "Need Tomatoes, Onion": correct, since Tomatoes are marked `out` and there is no onion. The
  test plan entry was cleared afterwards, so nothing is planned that Ash did not choose.
- Wall dashboard checked in Chrome at a real 1280×800 kiosk viewport: the page itself does not
  scroll, no card clips its content, and checking an item off on the dashboard persisted to
  Supabase — the same row the phone view reads.
- Manual end-to-end checks in Chrome for all five features. Every write verified against
  Supabase, and all test data removed afterwards: shopping 0, pantry 16, meals 8, products 16
  (8 favourites), members 5, plan empty — exactly the seeded state.

Confirmed after the integration run: every table is back to 0 rows. The tests create a
throwaway household and delete it, and the foreign keys cascade.

Added 2026-08-29 for multi-item AI proposals:

- `npm run check` — 221 tests across 17 files. New coverage pins multi-call aggregation,
  refusal of partial/malformed lists, browser payload shape, route allow-list enforcement,
  and the repository batch-add path.
- Real qwen3:8b check: "Add milk and eggs" returned two proposal actions, both quantity one,
  with no database write. The model tool spec no longer exposes a category for it to guess.
- `npm run test:db` — 9 integration tests; `npm run db:rls` — all 9 tables protected and the
  publishable key reads zero rows; `npm run build` — clean.
- Visual browser verification was unavailable because no in-app or extension browser was
  connected. No alternative browser automation surface was substituted.

Added 2026-08-29 for the weekly grocery budget target:

- Migration `0006_useful_ser_duncan` applied to live Supabase; clean `db:generate` and
  `db:migrate` reruns.
- `npm run check` — 228 tests across 18 files. `npm run test:db` — 10 integration tests,
  including setting and clearing a decimal NZD target through Drizzle.
- `npm run db:rls` — all 9 tables protected and the publishable key reads zero rows.
  `npm run build` — clean.
- Visual browser verification remained unavailable because no browser was connected.

## Known Problems

- `products` has no repository method that creates rows — the contract exposes only `list`,
  `update` and `toggleFavourite`. `npm run db:seed` is the only thing that puts products into
  Postgres. Deliberately not papered over with a speculative POST; Stage 2 should decide.
- `reset()` throws against the database by design. The Settings screen still offers it, so
  with the server flag on that button will surface an error rather than restoring demo data.
- **First paint shows Stage 1 demo data.** *(Wall dashboard half fixed 2026-08-29 — Shopping,
  Tonight's meal and Kids now gate on `hydrated`. The underlying seeding of `initialState` is
  still there, so any new screen that forgets to gate will have the same bug.)* `AgrocerProvider` seeds `initialState` with the
  demo fixtures, so until the load resolves every screen briefly renders someone else's
  groceries. Screens gate on `hydrated`; the nav badge did not, and now does. The underlying
  seeding of `initialState` is untouched and worth revisiting — it was invisible against
  localStorage and is a visible flash over the network.
- ~~RLS is disabled on all 7 tables.~~ **Closed 2026-08-29** (ADR-016). RLS is enabled
  everywhere, deny-all, and the publishable key now reads nothing and cannot insert. Verify
  with `npm run db:rls`. Note the old claim in this file — that RLS had to ship with auth —
  was wrong: the app connects as `postgres`, which owns the tables and bypasses RLS.
- **Household scoping is enforced by the application, not the database.** Because the app
  bypasses RLS, a bug in `src/server/repositories.ts` would not be caught by Postgres. Accepted
  for now; the alternative (running queries as the authenticated user) is worth weighing when
  auth lands.
- ~~No route handler is authenticated.~~ **Closed 2026-08-29** (ADR-017). Verified: every
  route, including `/api/ai/ask`, answers 401 with no session.
- ~~A session that expires with a screen open shows a generic failure.~~ **Closed 2026-08-29.**
  A 401 now redirects to `/sign-in?next=…` from every client fetch path, including the
  assistant. A 403 deliberately does *not* redirect: the account signs in fine and still has no
  household, so bouncing to sign-in would loop.
- **`AGROCER_AUTH="off"` disables all of it.** It warns on every request, and exists for local
  work and the integration tests. Never set it where the app is reachable.
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

Read `AGENTS.md`, then this file, then `AGROCER_MASTER_PLAN.md`. Everything below is current
after the multi-item proposal work begun from commit `f060ee7` on
`stage-2/database-schema` (20+ commits ahead of `main`; nothing has been merged).

### State in one paragraph

Stage 2's build work is complete: Postgres behind route handlers, Supabase Auth enforced on
every route, RLS on all nine tables, history tables, CI, and a deployment runbook. The AI
ladder is complete through slice 9b — the assistant reads the shopping list, pantry and meal
plan through a read-only tool allow-list, and can *propose* one or several shopping items behind
one list-shaped confirmation gate. Stage 4 now has pantry-to-recipe matching and the weekly
budget target. **228 unit tests across 18 files, 10 integration tests, build clean,
`npm run db:rls` green.**

### Blocked on Ash — not code, do not attempt

1. **Deploy.** The tunnel route `home.ashnetbase.org` exists but points at `localhost:3000`;
   it must be `http://<agrocer-host-ip>:3000` (likely `192.168.1.49`). Then `git clone`,
   `.env`, `docker compose up -d --build` on that host. `docs/deploy.md`.
2. **Ollama for production** (ADR-020): `OLLAMA_HOST=0.0.0.0:11434` on the workstation, a
   firewall rule on TCP 11434 scoped to the Agrocer host, a DHCP reservation for
   `192.168.1.222`, and `OLLAMA_BASE_URL` in the homelab `.env`.
3. **`api.chat.ashnetbase.org` publishes an unauthenticated Ollama to the internet.** Anyone
   who guesses the hostname gets free inference. Cloudflare Access, one email policy.
4. **The account password is weak** (`test123!`, set 2026-08-29 during setup) on the account
   holding the children's names. Change it in the Supabase dashboard.
5. **CI secrets** — `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` as GitHub
   Actions secrets. The workflow skips cleanly without them; with them the integration tests
   and the RLS check actually run.
6. **Cloudflare Claude Code plugin** — Ash asked for it; `claude plugin marketplace add
   cloudflare/skills` and `claude plugin install cloudflare@cloudflare` were **blocked by the
   permission classifier**, so Ash must run them.

### Code work, in the order I would take it

**(a) Multi-item AI proposals — DONE 2026-08-29.** "Add milk and eggs" now produces one
proposal containing both server-described actions, Add all confirms them through one batch
write, and any invalid action refuses the whole list. Verified against the real qwen3:8b
provider without writing to the database.

**(b) Weekly budget target — DONE 2026-08-29.** Optional household setting persisted locally
and in Postgres; shopping views compare the current list estimate with it. This is a target,
not historical spend tracking.

**NEXT TASK: (c) Meal cost estimation decision.** It has a prerequisite worth deciding before starting:
it needs ingredients as structured quantities, which changes how a recipe is entered.
`recipeMatch.ts` deliberately checks presence only for this reason. Ask Ash before committing
to a UX change.

**(d) Low-stock / staple-reorder prediction.** `inventory_events` has been accumulating the
history since 2026-08-29 and nothing reads it yet. Give it a few weeks of real data first —
predictions from three rows will be worse than none.

### Smaller known gaps

- **The Ask card at phone width is unverified** across four sessions. The browser tooling here
  would not resize below desktop width. Someone with a phone should just look at it.
- **Every write refetches the whole list, and there is no optimistic UI.** Free against
  localStorage, a round trip to Sydney now. Most visible on the pantry steppers.
- **No automated backups.** `docs/backup.md` has verified commands; a weekly cron on the
  homelab is the obvious step once it is running. Note a full dump contains `auth.users`.
- **`meal_feedback` has no UI.** The table, repository and `/api/feedback` exist; rating a
  meal is Stage 4's job.

### Two traps that have each cost an hour

- **A dev server started right after `npm run build` serves a stale `.next`** and answers HTML
  for routes that exist. Delete `.next`, restart.
- **The Stage 1 service worker caches the bundle**, so a dashboard change can look like it did
  not apply when it is already compiled. Unregister it and clear `agrocer-shell-v1`.

Both bit twice in one session. Check them before debugging the code.

## Do Not Accidentally Change

- `src/data/repositories/types.ts` — the shared contracts. Both repository implementations and
  the provider depend on them.
- The localStorage repositories. They are the working app; do not delete them when the Drizzle
  path starts working. The provider takes repositories as a prop specifically to allow both.
- The Magic Patterns visual language and mobile UX. Do not redesign screens because a library
  ships a different default component.
- The hand-written service worker (ADR-011).
- `legacy/` — the original Vite implementation, kept for reference.
- **`authEnabled()` returns true unless `AGROCER_AUTH === "off"`.** Do not flip that to an
  opt-in flag. Failing closed is the whole point (ADR-017).
- **`middleware.ts` must stay in the project root**, and its matcher must keep excluding
  `sw.js` and `manifest.webmanifest`, or the service worker cannot register (ADR-011).
- **`getUser()`, not `getSession()`**, anywhere a server decides who is asking.
- **`inventory_events` is append-only, and `pantry_item_id` is `ON DELETE SET NULL`.** Do not
  "tidy" that to `CASCADE`: deleting a pantry item is precisely when its history matters, and
  the denormalised `item_name` is there for the same reason.
- **`docker-compose.yml` publishes `3000:3000` to the LAN, and must.** It briefly bound to
  loopback, which was safer and simply did not work: `cloudflared` is on another machine and
  routes by IP. The cost — the session cookie in clear on that LAN hop — is stated in ADR-019
  along with the clean fix (co-locate with `cloudflared`, route by container name).
- **The compose file deliberately does not mention `AGROCER_AUTH`**, so authentication cannot
  be switched off by editing a value that reads as harmless.
- **RLS stays enabled on all nine tables.** Deny-all is the intended state until auth brings a
  user to grant to (ADR-016). Do not disable it to "fix" a query — the app bypasses RLS
  already, so an RLS error means something is connecting as the wrong role, which is the bug.
- `src/ai/types.ts` — the `AiProvider` contract (ADR-014). A second provider satisfies it; it
  does not get changed to suit one model.
- **`/api/ai/chat` has no tools and injects no system prompt, on purpose.** The assistant lives
  at `/api/ai/ask`. Keeping them apart is what makes "one path to household data with a model
  attached" a checkable statement. Do not add tools or a prompt to the transport route.
- **`READ_ONLY_TOOLS` contains only read tools; `WRITE_TOOLS` is a separate record.** The
  separation is by construction, not convention (ADR-015, ADR-018) — the confirmation gate
  applies to the write record as a whole, so a tool added to the wrong one silently loses it.
- **No write tool may execute inside the assistant loop.** The loop returns a proposal;
  `/api/ai/confirm` is the only executor. If a tool should ever bypass the gate, that is an
  ADR, not a flag.
- **The confirmation sentence comes from `AiWriteTool.describe`, not from the model.** The
  model has already been observed describing its own proposal wrongly.
- **The registry's exact-name lookup.** Do not replace it with anything that maps model output
  onto a repository method, however convenient. See ADR-015 for what was rejected and why.
- **The three places that describe what the assistant can and cannot do** —
  `ASSISTANT_SYSTEM_PROMPT`, the Ask card's `note`, and its example chips. They are consistent
  on purpose, and they were all rewritten together when 9a changed what was true. Change all
  three together, and never leave one claiming access the model does not have.
- **Ollama's exposure is a firewall question, not a binding question** (ADR-020). It may be
  bound to the LAN *with* a source-scoped rule on TCP 11434; it may never be left on
  `0.0.0.0` without one, because Ollama has no authentication of its own. Earlier revisions of
  this file said "stays bound to 127.0.0.1, never 0.0.0.0" — superseded, and the reason is
  that the GPU is in the workstation while the always-on server has none.
- **`initialState` in `AgrocerProvider` holds nothing.** It used to hold the Stage 1 demo
  fixtures, and the wall dashboard showed a fake shopping list until the fetch resolved. Do
  not put seed data back in it to make a screen "look right" before it has loaded.

## Last Updated

2026-08-29 — multi-item AI proposals and the weekly grocery budget target completed by Codex
on `stage-2/database-schema`. Migration `0006` is applied; this handoff records the committed
branch checkpoint pushed to `origin/stage-2/database-schema`. Nothing was merged to `main`.
