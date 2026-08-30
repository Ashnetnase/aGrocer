# AshHome Development Handoff

## Project

**AshHome** is a private family household assistant (long-term product).
**Agrocer** is its grocery, pantry, meal-planning and grocery-budget module, and is the only
module that exists today. Agrocer remains its own app even once surfaced through AshHome.

Source of truth for scope and stage boundaries: `AGROCER_MASTER_PLAN.md`.
Agent instructions: `CLAUDE.md` (Claude Code), `AGENTS.md` (Codex and others).

## Current Stage

**Stage 2 — Real backend and household data: COMPLETE 2026-08-29.** Deployed to
`192.168.1.49` behind the Cloudflare Tunnel, verified from outside the network, and installed
as a PWA on a phone — the last item in its Definition of Done.
**Stage 3 / AshHome Phases 8–9** complete through slice 9b — all four AI slices landed
2026-08-28/29 at Ash's request to bring the AI in "in stages". **Stage 4 is in progress**:
pantry matching, weekly budget, meal-cost estimation, and feedback capture are complete.

Stage 1 closed as a dev-complete milestone (ADR-012).

What remains splits in two, and NEXT TASK keeps them apart:

- **Ash's** — the deploy itself, the Ollama firewall rule, and four other infrastructure items.
  None of them are code.
- **The next agent's** — Stage 4 recipe import; prediction/learning should wait for real history.

Stage 4 is the active stage. Stage 3 is complete through slice 9b.

Branch: `stage-2/database-schema`. Main branch: `main`.

## Current Working State

What actually runs today:

- **Authentication is enforced** (ADR-017). Email and password via Supabase Auth, session in
  cookies. Every data-bearing route and assistant action route refuses without one (401), and
  an account not linked to a household member is refused too (403). The raw, data-free
  `/api/ai/chat` transport is the documented exception. `/sign-in` is the screen; sign-out is
  on Settings.
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
- **Recipe import is real** (Stage 4). `Meals → Plan dinner → Add a recipe` offers **Paste**
  (any text) and **Search** (TheMealDB via `/api/recipes`). Both produce the same reviewable
  draft and hand it to the normal meal form — one path into the meal store. Nothing is saved
  from the import sheet. Pasted text rather than a fetched URL, deliberately: fetching would
  have the server request arbitrary addresses from a network that also hosts Vaultwarden,
  Proxmox and Ollama.
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
- **Meal cost estimation is real** (ADR-021). Meal editing captures ingredient name, decimal
  amount, and unit while preserving legacy text. Meal detail and the wall show a catalogue-
  priced estimate only when every ingredient is covered. Migration `0007` is applied.
- **Meal feedback capture is real.** Meal detail records a whole-family or named-member rating
  against the planned date and shows the three newest append-only entries. It loads on demand.
- Domain services (`src/domain/services/`) are pure and fully unit-tested.
- A Docker image builds and has been smoke-tested; a staging runbook exists at `docs/staging.md`.

**AI recipe tools and session memory (2026-08-29):** live qwen3:8b verification confirmed recipe
search can chain into a gated save. Dashboard confirmation now refreshes Meals and shopping.
The Ask card sends at most eight user/assistant messages as short session-only context; it is
validated server-side and never persisted.

Alternative persistence path:

Voice talk-back is implemented on the dashboard as an explicit local speechSynthesis control;
the dashboard now also supports one-shot browser speech recognition: tap the microphone, speak,
and the transcript is submitted and read back locally. No audio is uploaded by Agrocer. A future
larger-scale option can replace this with local transcription and voice-to-voice inference.

Pantry reorder suggestions are now surfaced from recent inventory events. They are advisory only;
the API and Pantry screen never add shopping items automatically.

- The localStorage implementation is intact and runs when the server-data flag is off. It is
  not dead code: it is the no-database path and what the provider's tests use. It is selected
  at startup, not an automatic runtime fallback after a database failure.

## Dashboard, Kids and school status

Required by `CLAUDE.md`, and the first thing to update when any of it changes.

| Dashboard card    | Data                                                              |
| ----------------- | ----------------------------------------------------------------- |
| Kids / Today      | **Partly real** — the household's actual children. No events yet. |
| Family schedule   | **Mock** — one example row. Needs Phase 12.                        |
| Reminders         | **Mock** — one example row. Needs Phase 11.                        |
| Shopping          | **Real and interactive** — Postgres, checkable from the wall.      |
| Tonight's meal    | **Real** — plan, pantry warning, and complete catalogue-priced meal cost. |
| Chores            | **Mock** — one example row. Needs Phase 12.                        |
| Ask AshHome       | **Real** — reads list/pantry/plan, searches recipes; proposes list additions and recipe saves, gated. |

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

Cost note: `Tonight's meal` shows the missing-ingredient warning and, for recipes that have been
saved with structured amounts, an estimated cost. A partial estimate is deliberately hidden;
unknown products or incompatible units must not quietly understate dinner's cost.

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
  - Supabase project provisioned and migrations `0000`–`0007` applied — all 9 tables confirmed
    present.
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
- **RLS on all 9 tables** (migrations `0001_exotic_the_liberteens.sql` and `0005`, ADR-016),
  generated from `.enableRLS()` in `src/db/schema.ts`. Plus `npm run db:rls`, which verifies
  the state *and* probes the publishable key against every table.
- **Supabase Auth** (ADR-017): `src/auth/` (config, server and browser clients),
  `middleware.ts`, `/sign-in`, sign-out on Settings, `household_members.user_id` (migration
  `0002`), `authenticated` RLS policies (migration `0003`), and `npm run db:claim`.
- **Pantry-to-recipe matching** (Stage 4) — `src/domain/services/recipeMatch.ts`, surfaced on
  the Tonight's meal card. Presence only, not quantities.
- **Weekly grocery budget target** (Stage 4) — optional household setting across localStorage,
  HTTP, and Drizzle; persisted as nullable integer cents and surfaced in shopping views.
- **Meal cost estimation** (Stage 4) — additive structured ingredient JSON beside legacy text,
  catalogue-based proportional estimates, and complete-coverage-only display (ADR-021).
- **Meal feedback UI** (Stage 4) — the existing append-only API/repository is now used from
  meal detail for whole-family or named-member ratings and recent history.
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
- **Recipe import** (Stage 4) — `src/domain/services/recipeImport.ts` (pasted text),
  `src/recipes/` (the `RecipeProvider` seam + TheMealDB), `/api/recipes`, and the
  `RecipeImportSheet` review step.
- **AI recipe tools** — `searchRecipes` (read) and `addRecipeToMeals` (write, gated).
  Live-verified with qwen3:8b; recipe saves and planner proposals are confirmation-gated.
- **AI slice 9b** — the first write tool: `src/ai/tools/write.ts` (`WRITE_TOOLS`, a sibling of
  the read record), the proposal path in `src/ai/assistant.ts`, `app/api/ai/confirm`, and the
  Add it / Add all / Cancel gate on the card. ADR-018 records the shape.
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

Stage 2 code is complete and deployed; the latest branch still needs a homelab Docker rebuild.
Stage 4 code-completable features are landed: recipes, planner proposals, reorder/use-soon
advice, product alternatives, manual specials, notifications, and voice interaction. Remaining
work is a real retailer feed, longer-history calibration, and live deployment verification.

The current Stage 4 AI slice includes `getMeals` plus gated `planMeal`; both are covered by
unit tests. The next refinement is broader live verification after the Docker host is rebuilt.

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
- `src/server/repositories.ts` — the single place the authenticated user's `householdId` is
  resolved; handlers ask for repositories, never for an id.
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
- `src/domain/schemas/meal.ts`, `src/domain/services/meals.ts` — optional structured ingredient
  amounts and pure complete-coverage meal-cost estimation. Legacy strings remain supported.
- `src/features/meals/components/{MealFormSheet,MealDetailSheet}.tsx` and
  `src/features/dashboard/TonightCard.tsx` — structured entry, catalogue suggestions, and cost
  display. `drizzle/0007_glorious_pete_wisdom.sql` is the additive persistence change.
- `src/features/meals/components/MealDetailSheet.tsx`, `src/providers/AgrocerProvider.tsx`, and
  `src/domain/services/feedback.ts` — on-demand append-only rating UI and family-facing labels.
  Local feedback writes still refuse by design; shared history requires server data.
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
- **ADR-019** — HTTPS via the existing Cloudflare Tunnel on `ashnetbase.org`; because
  `cloudflared` runs on another machine, the container publishes `3000:3000` to the LAN.
  Cloudflare Access is deliberately not in front of the family app.
- **ADR-018** — the AI proposes changes; a person confirms them. Write tools are never
  executed by the assistant loop; every confirmation sentence/action list is built server-side
  from validated arguments; `WRITE_TOOLS` is a sibling of `READ_ONLY_TOOLS`.
- **ADR-015** — the AI reaches household data only through a fixed, read-only tool allow-list.
  Exact-name lookup, zero-argument tools, repositories from `serverRepositories()`, and read
  tools separated from write tools by construction rather than convention.
- **ADR-021** — structured meal ingredients augment rather than replace recipe text; costs are
  computed from current catalogue prices and shown only with complete coverage.
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
| `ashnetserv1` | `192.168.1.14` | Proxmox, **no GPU**. Ollama **0.7.1** — **Ash's own test instance, not Agrocer's and not a candidate.** Published at `api.chat.ashnetbase.org`. Do not point the app at it |
| **Agrocer host** (hostname `portainer`) | `192.168.1.49` | `vaultwarden` 8080, `uptime-kuma` 3001, `portainer` 8000/9443, `ngix-npm-1` 80/81/443, **and `cloudflared`**. **Port 3000 is free** |
| chat box | `192.168.1.37` | Runs `chat` (8080) |
| `cloudflared` | **on `192.168.1.49`** | A container on `cloudflare-tunnel_default`, started `["tunnel","run"]` — token in an env var, so routing lives in the Zero Trust dashboard. Tunnel `homelab`, ID `7a9f3afc-7fed-4e64-84a5-034cc130374d`, healthy |

Two facts in this table were wrong until 2026-08-29 and are worth flagging, because both
reached the repository by being written up rather than checked. `cloudflared` was recorded as
running on its own machine — it does not; the LAN-IP routes are because *some* services are
elsewhere. And port 3000 was recorded as held by Portainer — it is not; Portainer is on
8000/9443 and the host is merely named `portainer`. Both were confirmed by probing the host.

Because `cloudflared` shares the host, the clean arrangement is now available: join Agrocer to
`cloudflare-tunnel_default`, publish no port, route to `http://agrocer:3000`. Deferred until
after the first working deploy — see `docs/deploy.md`, "Tightening".

- **Deployment: the Cloudflare Tunnel `homelab` on `ashnetbase.org`** (ADR-019).
  `home.ashnetbase.org` → `HTTP` → **`http://192.168.1.49:3000`** — a LAN IP, **not**
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
  API URL `https://ojlzjjvrtnslcxqdmpay.supabase.co`. Migrations through `0007` are applied,
  9 tables are live, and the Ashford household seed is present.
  Free tier caps one user at 2 active projects across all orgs they own, so
  `Salon Booking App UI Design` was paused (2026-08-27, user's decision) to make room.
  It is restorable from the Supabase dashboard.
- Variables (see `.env.example`, fill into gitignored `.env.local`): `DATABASE_URL`,
  `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the documented
  Agrocer/AI flags.
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

Added 2026-08-29 for meal-cost estimation:

- Migration `0007_glorious_pete_wisdom` applied to live Supabase; it adds only nullable
  `meals.ingredient_details` JSONB and leaves every legacy ingredient string intact.
- `npm run check` — 234 tests across 18 files. New tests cover legacy parsing, proportional
  package pricing, incomplete coverage suppression, and both persistence implementations.
- `npm run test:db` — 10 integration tests, including structured ingredient JSON through
  Drizzle. `npm run db:rls` — all 9 tables protected; publishable key reads zero rows.
- `npm run build` — clean; `db:generate` and `db:migrate` reruns are clean no-ops.
- Visual browser verification remained unavailable because no browser was connected.

Added 2026-08-29 for meal feedback UI:

- `npm run check` — 238 tests across 19 files. New tests cover all rating labels, feedback draft
  boundaries, and the local repository's deliberate refusal to create device-only history.
- `npm run test:db` — 10 integration tests, including newest-first feedback history and cascade
  cleanup. `npm run db:rls` — all 9 tables protected; publishable key reads zero rows.
- `npm run build` — clean. No schema change or migration was needed.
- Visual browser verification remained unavailable because no browser was connected.

## Known Problems

- `products` has no repository method that creates rows — the contract exposes only `list`,
  `update` and `toggleFavourite`. `npm run db:seed` is the only thing that puts products into
  Postgres. Deliberately not papered over with a speculative POST; Stage 2 should decide.
- `reset()` throws against the database by design. The Settings screen still offers it, so
  with the server flag on that button will surface an error rather than restoring demo data.
- ~~RLS is disabled on all 7 tables.~~ **Closed 2026-08-29** (ADR-016). RLS is enabled
  everywhere, deny-all, and the publishable key now reads nothing and cannot insert. Verify
  with `npm run db:rls`. Note the old claim in this file — that RLS had to ship with auth —
  was wrong: the app connects as `postgres`, which owns the tables and bypasses RLS.
- **Household scoping is enforced by the application, not the database.** Because the app
  connects as `postgres` and bypasses RLS, a bug in `src/server/repositories.ts` would not be
  caught by Postgres. This is an accepted current risk; revisit if the server stops using the
  owner connection and queries as the authenticated user instead.
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
- `next lint` is deprecated (removed in Next.js 16).
- **A dev server started immediately after `npm run build` serves a stale `.next`** and answers
  HTML 404/500 for routes that exist. Delete `.next` and restart `npm run dev`. Cost an
  investigation on 2026-08-28; `npm run ai:chat` now names this cause when it sees HTML.
- **The Stage 1 service worker (ADR-011) also serves a cached bundle**, so a dashboard change
  can appear not to have worked when it is already on disk and compiled. Unregister the service
  worker and clear the `agrocer-shell-v1` cache in DevTools. Between this and the stale `.next`,
  a dashboard edit was invisible twice over on 2026-08-28 — check both before debugging the code.
- `/api/ai/chat` is intentionally still unauthenticated. It has no tools or household data, but
  it can consume GPU time; protect or remove the raw transport before external exposure.
- Two roadmaps currently coexist: the master plan's Stages 1–8 and the AshHome Phases 0–17 in
  `CLAUDE.md`. Not yet reconciled — see `TASKS.md`. Ask before treating either as authoritative
  where they disagree.

## NEXT TASK

Current state (2026-08-30): recipe/planner AI, voice input/output, reorder and use-soon advice,
product alternatives, specials abstraction/screen, notifications, and the Stage 5 trolley companion
foundation are implemented and checked. Migration `0008` is applied: 11 tables have RLS and one
authenticated household policy each.

Stage 5 now supports both preferred integration paths: a future official retailer API and a local,
visible New World browser companion. It no longer treats an official API as a prerequisite. Product
preferences persist, deterministic matching runs before any future AI ranking, and prepare/send are
separate explicit actions. Run the companion with `npm run companion:newworld`; configuration and
safety details are in `docs/new-world-companion.md`.

**Next Stage 5 task:** live-test the visible companion against Ash's logged-in New World session.
Repair only the central selectors in `companion/src/retailers/newworld/newworld.selectors.ts` and
the deterministic client behavior discovered by that test. Search and trolley addition are coded
but not claimed working against the live site. CAPTCHA/blocking must return `blocked`; checkout and
payment remain user-only.

First live attempt reached New World's Cloudflare **Just a moment** security check. Search now
returns `blocked` promptly instead of hanging or pretending the catalogue is empty. The visible
companion Chrome window uses `.runtime/newworld-profile`; Ash must complete that check and log in
there once, then rerun the milk search. Do not bypass or add stealth behavior.

Ash completed the check but Cloudflare immediately challenged the Playwright profile again. That
path is now an optional fallback, not the recommended integration. The Manifest V3 extension in
`companion/extension` operates in Ash's normal logged-in Chrome profile without hiding automation.
Agrocer detects it through a validated page bridge and sends a batch only after the explicit Add
button. **Next manual step:** load that directory unpacked in `chrome://extensions`, refresh
Agrocer, confirm “Chrome trolley extension ready”, then live-test one known exact product. The
selectors intentionally return failure unless quantity is visibly verified.

The extension can now acquire real candidates too: each unresolved line has **Search New World**,
which navigates the normal New World tab, extracts visible product cards, and returns candidates to
Agrocer. Choosing one uses the existing persisted preference endpoint. This is protocol-tested but
awaits the first live selector result; reload the unpacked extension after pulling this commit.

Migration `0009` is applied. `trolley_jobs` makes the extension workflow cross-device: a mobile PWA
queues ready exact products, the desktop polls for them, and the user explicitly presses Process
queued trolley. Results are persisted and polled back to mobile. Product preferences now have an
`enabled` switch and the UI can pause/re-enable or replace a remembered item for specials. The live
database has 12 RLS-protected tables; `npm run test:db` passes 12 tests.

The old AI verification instructions below are historical and retained for audit context.

The AI recipe tools are now live-verified locally. Deploy this branch and repeat the check
through the tunnel; then the next code slice is voice talk-back (`speechSynthesis`).

### Do this first — the AI recipe tools are unverified

`searchRecipes` (read) and `addRecipeToMeals` (write, gated) are **written, typechecked and
unit-tested, but their live behaviour with qwen3:8b has never been run.** I was interrupted
before the end-to-end check. Everything else in the repository has been exercised against the
real model or the real database; these two have not. Treat them as unproven.

Run, with `AGROCER_AUTH=off npm run dev`:

```bash
curl -s -X POST localhost:3000/api/ai/ask -H 'content-type: application/json'   -d '{"question":"Find a chicken curry recipe we could add"}'
```

What to look for, in order of importance:

1. **Does it chain?** It should call `searchRecipes`, then propose `addRecipeToMeals` with an
   id the search actually returned. A model that proposes an id it invented is the failure
   this design is built against — the id will not resolve and `describe` will say so, but the
   prompt should stop it happening at all.
2. **Is the description the real title?** `describe` fetches from the provider rather than
   trusting the model, so the confirmation must show TheMealDB's title even if the model
   called the dish something else.
3. **Does it still refuse the things it should?** "Plan burgers for Friday" must not become a
   recipe save. Adding a second write tool makes substitution more tempting, and the prompt
   line forbidding it was written for one tool.
4. Nothing should be written until the confirmation is pressed. Check `/api/meals` before and
   after proposing.

If the model struggles to chain two tools, the honest options are: raise `MAX_TOOL_ROUNDS`
from 3, sharpen the tool descriptions, or accept search-only and let the family save from the
import sheet. Do not paper over it by having `addRecipeToMeals` accept a title.

### Then

- **Voice: talk-back only.** `speechSynthesis` is local to the browser, costs nothing and
  leaks nothing — read the assistant's answer aloud on the wall dashboard. Ash has agreed to
  this half.
- **Voice: the microphone is deliberately NOT started.** Chrome's `SpeechRecognition` streams
  kitchen audio to Google, which sits badly with a household that runs its AI on its own GPU.
  Ash has not decided, and it should not be decided by accident. A local alternative
  (`whisper.cpp` beside Ollama) is a project, not a button. `CLAUDE.md` puts voice at Phase 17.
- **Web search for the AI: recommended against.** A scoped recipe API is structured JSON from
  one known host, validated by Zod. General web access means untrusted prose reaching a model
  that proposes actions on household data — prompt injection, with the confirmation gate
  demoted from belt-and-braces to the only thing standing there.
- **Low-stock / staple-reorder prediction.** `inventory_events` has been accumulating since
  2026-08-29 and nothing reads it. Give it real history first.

### Blocked on Ash — infrastructure, not code

1. ~~Deploy~~ **done and verified**, and the PWA is installed on a phone. Stage 2 is COMPLETE.
2. **Rotate the database password** — exposed in a chat transcript on 2026-08-29 via an editor
   selection of `.env.local`. Supabase → Project Settings → Database → Reset, then update
   `.env.local` here and `.env` on `192.168.1.49` (doubling any `$`), then `docker compose up -d`.
3. **The account password is weak** (`test123!`) on the account holding the children's names.
4. **Ollama's auto-created firewall rules are still enabled.** `Get-NetFirewallRule
   -DisplayName "ollama.exe" | Disable-NetFirewallRule`. Until then the scoped rule from
   ADR-020 does nothing and the GPU is reachable by the whole LAN. Re-check after every Ollama
   upgrade — a new version recreates them.
5. **`api.chat.ashnetbase.org` is an unauthenticated Ollama on the public internet.** Decision
   taken: Cloudflare Access, one email policy. Worth re-checking whether anything actually
   depends on that hostname — it is Ash's own Proxmox *test* instance, so deleting the route
   may be simpler than guarding it.
6. **CI secrets** — `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` as GitHub
   Actions secrets, so the integration tests and the RLS check actually run.
7. **Tightening (ADR-019).** `cloudflared` shares the host, so Agrocer can join
   `cloudflare-tunnel_default`, publish no port, and be reached at `http://agrocer:3000` —
   removing the plaintext LAN hop. `docs/deploy.md`, "Tightening".

### Smaller known gaps

- **The Ask card at phone width is unverified** across five sessions; the browser tooling here
  will not resize below desktop width. Someone with a phone should just look at it.
- **Every write refetches the whole list, and there is no optimistic UI.**
- **No automated backups.** `docs/backup.md` has verified commands. A full dump contains
  `auth.users` — password hashes — so it is a credential store.
- **`meal_feedback` has a UI now**, but nothing reads the history for learning yet.

### Two traps that have each cost an hour

- **A dev server started right after `npm run build` serves a stale `.next`.** It also serves
  stale *modules* after edits — a fix can test as broken. Delete `.next`, restart.
- **The Stage 1 service worker caches the bundle**, so a dashboard change can look like it did
  not apply. Unregister it and clear `agrocer-shell-v1`.

Both bit again this session. Check them before debugging code.

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
- **`searchRecipes` is the only read tool with arguments, and it reads no household data.**
  Everything that touches the family's own data stays argument-free, so nothing the model
  emits can widen what it reads (ADR-015). A test enforces that split.
- **`addRecipeToMeals` takes an id and nothing else.** Every saved field is fetched from the
  provider at execution time, and `describe` fetches too, so what a person confirms is the
  real recipe rather than the model's account of it. Do not add a `title` argument to save a
  round trip — that is the whole safety property.
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

2026-08-30, on `stage-2/database-schema`. Migrations through `0009` are applied. Nothing has
been merged to `main`, which is ~30 commits behind.

Stage 5 has persisted retailer products/preferences, deterministic matching, prepare/send APIs, an
upgraded Shopping review UI, and a separate visible Playwright companion. The health endpoint is
locally smoke-tested, but live New World search/cart selectors have not yet been validated. No New
World credentials are stored and payment/final checkout are not implemented.
