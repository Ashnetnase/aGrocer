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

**AshHome Phase 12 (Kids/School) is now in progress** (2026-08-31): the foundation (child
school field, `school_notifications`, `/kids` screen, manual notice entry) is built, verified
locally, and not yet deployed. See "Current NEXT TASK (2026-08-31)" further down for the exact
next step — deploy, then the Hero email ingestion pipeline (Phase 13), which needs a decision
from Ash before any code gets written.

What remains splits in two, and NEXT TASK keeps them apart:

- **Ash's** — the deploy itself, the Ollama firewall rule, the Hero Gmail OAuth credential
  decision, and several other infrastructure items. None of them are code.
- **The next agent's** — deploy Kids/School, then design and build Hero email ingestion once
  Ash has answered the credential question. Stage 4 recipe import remains open too;
  prediction/learning should wait for real history.

Stage 4 is the active Agrocer stage. Stage 3 is complete through slice 9b.

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
| Kids / School     | **Real** (2026-08-31) — the household's actual children plus a live unread-notice count, top 3 notices, "Open Kids" to `/kids`. |
| Family schedule   | **Mock** — one example row. Needs Phase 12.                        |
| Reminders         | **Mock** — one example row. Needs Phase 11.                        |
| Shopping          | **Real and interactive** — Postgres, checkable from the wall.      |
| Tonight's meal    | **Real** — plan, pantry warning, and complete catalogue-priced meal cost. |
| Chores            | **Mock** — one example row. Needs Phase 12.                        |
| Ask AshHome       | **Real** — reads list/pantry/plan, searches recipes; proposes list additions and recipe saves, gated. |

Every mock card is labelled in the UI as a placeholder, so nobody on the wall mistakes an
example chore for a real one.

- **RLS:** enabled on **all sixteen tables** (ADR-016), one `authenticated` policy each
  (ADR-017; `0005` for the two Stage 2 history tables, and the `school_notifications` policy
  is hand-appended to `drizzle/0013_salty_misty_knight.sql` the same way). `anon` is granted
  nothing. Verify any time with `npm run db:rls`.
- **Authentication:** enforced (ADR-017), and Ash's account is live and signing in.
- **Kids/School module (2026-08-31):** foundation in place. `household_members.school`
  (free-text, `Child` members only, editable from Household); `school_notifications` table +
  `SchoolRepository` (list/add/markRead/dismiss); `/kids` screen with each child's profile and
  a sorted notice list (`src/domain/services/school.ts`'s `visibleNotifications` — unread +
  action-required first); `NotificationSheet` for hand-entering a notice today. What is
  **not** built: a real `SchoolProvider` interface (today there is one provider value,
  `'manual'`, and one write path — the interface is Phase 13 work), chores, family calendar.
- **Hero integration:** not started. No Hero credentials, tokens or endpoints exist anywhere in
  this repository, and none may be added — see the hard rules in `CLAUDE.md`. Decided
  2026-08-31 (Ash, via `AskUserQuestion`): **automated Gmail API polling**, not a paste-based
  importer — Ash is forwarding Hero notification emails to a dedicated inbox
  (`007agentuse@gmail.com`, intentionally **not** written anywhere else in this repository)
  specifically for this. That inbox address itself is not secret in the way a password is, but
  keep it out of anything source-controlled beyond this one HANDOFF.md note — the real
  credential need is a Google Cloud OAuth app + refresh-token storage, neither of which exists
  yet. Ash also mentioned a second local model ("hermes", `qwen2.5-14b-64k`, presumably via
  Ollama given the phrasing — **not confirmed**) that might suit long/verbose Hero emails
  better than the current `qwen3:8b`; swapping is a one-line `OLLAMA_MODEL` env change **if**
  it serves an Ollama-compatible API, unverified.
- **Notification ingestion:** schema and write path exist (`school.add()`, deduped by
  `externalReference` for exactly this use); the actual Gmail-reading pipeline does not.
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

**2026-08-31 — Real import attempted by Ash, hit a batch-size cap, fixed (Claude Code).** Ash
pasted the real invoice text directly into the running app (the correct path, avoiding the
transcription-accuracy problem from the previous attempt) — the multi-order splitter correctly
read all 5 orders (214 items total, matching the earlier parser-only count exactly), but saving
failed with a generic "Could not save these orders."

**Root cause:** `app/api/orders/route.ts`'s `importSchema` capped a single import batch at 200
lines. `OrderImportSheet` sends every surviving line from every order in the paste as one POST, so
214 lines exceeded it and the whole save was rejected with a 400 the UI couldn't explain. Raised
the cap to 2,000 — real headroom for a genuine bulk backfill, not just past round numbers — and
`OrderImportSheet`'s error message now includes the actual thrown error text instead of a fixed
generic string, so a future failure like this is diagnosable in the sheet itself.

Also fixed, per Ash's request to reduce noise in the review list: `Store Liquor Licence...`
footer lines, a standalone `Total 258.50` line, a bare fee amount printed alone (`1.50`), and an
out-of-stock item's shorter one-price echo line (`Satsuma Mandarins kg 1 0 4.99 kg kg kg /`) are
now recognised and skipped silently rather than listed under "couldn't be read."

**Dev-server note for future sessions:** running `npm run build` while `npm run dev` is live
against the same `.next` directory corrupts the dev server's webpack cache (`Could not find the
module ... in the React Client Manifest`, `__webpack_modules__[moduleId] is not a function`).
Delete `.next` and restart `npm run dev` if this happens — don't run a production build while a
dev server needs to keep working.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (337 tests), `npm run build`. Dev
server confirmed serving 200 on `/sign-in` after a clean restart on port 3002 (3000 was already
taken on this machine).

**Resolved 2026-08-31, later the same day.** The retry still failed identically at first — turned
out Ash's browser was pointed at port 3000, which a *different*, pre-existing `node.exe` process
(not started this session, left untouched) was serving with the old, unfixed code. Once redirected
to the actual running instance on :3002, the import succeeded: **214 real order lines across 5
correctly-dated orders, confirmed in the live household database**
(`select ordered_on, count(*) from order_line_items group by ordered_on` — 53/45/54/41/21 items on
2026-08-26/19/11/05 and 2026-07-29). "Common order" in Settings now shows real frequency data:
Pams NZ Spring Water 3l, Pams Large & Thick 3 Ply Tissues 95pk, Organic Fairtrade Bananas, Pams
Classic Brie Cheese 125g and Pams Pure Butter 500g all lead at 5/5 orders.

**Order-history import is done and verified working end to end.**

**2026-08-31, next step — matching order history to the New World catalogue (Claude Code).**
`OrderHistoryRepository.matchToCatalogue()` links unmatched `order_line_items` rows to the
household's cached `retailer_products`, using the same `rankProduct` engine and the same 0.86
confidence bar the trolley uses for "ready" — a wrong automatic match is worse than leaving one
unmatched. Deliberately framed as enrichment, not a violation of "append-and-read only": the
historical fact (name/quantity/price/date) is never touched, only a foreign-key link is backfilled.
Idempotent and safe to re-run — `POST /api/orders/match`, a "Match to New World catalogue" button
in Settings next to the importer, showing "Matched N of M" and a small checkmark per matched item
in the common-order list.

**Real-world caveat, not a bug:** the household's New World catalogue cache currently only has 67
products (from prior manual testing — mostly milk/bread/cheese), so most of the 214 real imported
lines won't match yet. That's expected and will improve automatically as the cache grows through
ordinary Shopping/trolley use — re-running the match button later will pick up newly cached
products with no extra work.

**2026-08-31, next step — reorder prediction upgraded to read order-history cadence (Claude Code).**
`predictReordersFromHistory` (`src/domain/services/orderHistory.ts`) is a new advisory signal:
for each item bought at least twice, it averages the real gaps between order dates and flags the
item once that many days have passed since the last order — "usually every 7 days, 9 since last
order" is a materially stronger signal than the existing pantry-event heuristic
(`predictReorders`, still there, unchanged). Needs two distinct order dates for an item before it
will say anything; a single purchase has no interval to learn from, so nothing is guessed at.
`/api/pantry/suggestions` now merges both signals — where an item is flagged by both, the
cadence-based one wins since it is backed by real dates rather than an inventory adjustment.
Pantry's "Keep an eye on" card shows the new reason inline; the "Add" button behaviour is
unchanged (still adds 1× "each", a person corrects it — no automation added here).

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (342 tests, up from 337), `npm run
build`, clean dev-server restart. Not yet visually verified in a browser — Pantry's "Keep an eye
on" card needs enough real order history for an item to appear twice with a passed interval,
which Ash's real 5-order import may or may not yet have for any given item.

**2026-08-31, same day — "Matched 0 of 214" was a real bug, fixed (Claude Code).** Ash ran the
match button against the real 214-line import: zero matches, despite the catalogue having 67
cached products including several milks. Root cause, confirmed by comparing the actual rows: the
catalogue has `Pams Standard Milk3l` (no space, New World's own site naming) while the imported
invoice line is `Pams Standard Milk 3l` (space, as the PDF prints it) — the same product, two
literal strings. `rankProduct`'s token-overlap scoring correctly recognises every token matches
once it tokenises (it splits letter-digit boundaries internally), but the formula's ceiling for a
*perfect* token-overlap result is mathematically exactly `0.85` (`0.35 + 1.0 × 0.5`) — the
exact-match and substring bonuses above that branch never fire on a one-space difference. The
`0.86` bar `matchToCatalogue()` was set to (copied from the trolley's "ready" threshold) therefore
rejected every 100%-token-overlap match categorically, not just risky ones — a threshold bug, not
a conservative choice. Lowered to `0.85` for order-history matching specifically, with the
reasoning recorded at the call site: this only backfills a metadata link on already-recorded
history, not something entering a real cart unreviewed, so a point below the trolley's bar is
proportionate. Added an integration test pinning this exact glued-name-vs-spaced-name scenario.

Verified: `npm run test:db` (16 integration tests, up from 15), typecheck, lint, 342 unit tests,
build, clean dev-server restart. **Ash needs to press "Match to New World catalogue" again** —
should now match the ~15 milk/bread/cheese products the 67-item catalogue actually overlaps with
the 214 imported lines, still 0 for everything else until the catalogue grows further.

**2026-08-31, next step — a `getCommonOrder` assistant tool, and `getReorderSuggestions` upgraded
(Claude Code).** New read-only tool: `getCommonOrder` (`src/ai/tools/readOnly.ts`) reads
`summariseCommonOrder` and returns the household's most-bought items with counts and last-ordered
dates — "Ask AshHome" can now ground an answer in real buying habits ("what do we usually buy")
instead of guessing. `getReorderSuggestions` now merges the pantry-event signal with the new
order-history cadence signal, via a shared `mergeReorderSuggestions()` helper
(`reorderPrediction.ts`) used identically by `/api/pantry/suggestions` and this tool, so the two
surfaces can never drift apart. System prompt updated to mention both capabilities and that
`getCommonOrder` is empty until orders have been imported.

**Deliberately not attempted in this pass:** a full "plan 5 dinners from what we usually buy"
conversational flow. The building-block tools exist now, but the assistant loop caps at 3 tool
rounds (`MAX_TOOL_ROUNDS` in `assistant.ts`) — untested whether that is enough for
getCommonOrder → several searchRecipes calls → several planMeal proposals in one exchange. Try it
against the real model before assuming it needs a bigger round budget or a dedicated planning
tool; don't pre-optimise this without a real failure to diagnose.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (345 tests, up from 342 — 3 new in
`readOnly.test.ts` for `getCommonOrder` and the cadence-signal precedence), `npm run build`, clean
dev-server restart. Not yet verified against the real qwen3:8b provider or in a browser.

**2026-08-31, live-tested against the real qwen3:8b provider (Claude Code).** New script
`scripts/ai-ask-check.ts` (`npm run ai:ask -- "question"`) calls `askAssistant()` in-process
against the real household's Drizzle repositories — `/api/ai/ask` needs a signed-in session a
script cannot easily hold, so this bypasses HTTP rather than faking auth. Read-only in practice:
an unconfirmed proposal is printed and never posted to `/api/ai/confirm`.

Two real findings, both honest limitations rather than something patched blindly this session:

1. **`getCommonOrder` works correctly and returns accurate real data** for most phrasings tested
   ("Read our order history and tell me the top items", "What is our common order?" — both
   called the tool and answered correctly from Ash's real 214-line import). But **"What do we
   usually buy?" reliably gets a hollow "I'll check what the household usually buys" with no
   tool call at all**, reproduced twice. Added a system-prompt line forbidding exactly this
   ("never say you will check... without calling the tool in that same turn") — it did **not**
   fix this specific reproduced case, so it is recorded as a known model-reliability gap for that
   phrasing, not solved. Worth revisiting with a real prompt-engineering iteration pass, not a
   single guessed sentence.
2. **Confirmed the round-budget question from the previous entry was the wrong question.** The
   assistant never reaches `MAX_TOOL_ROUNDS` for a combined "order history + recipe" request,
   because `directRecipeSearch()` in `assistant.ts` — a regex fast-path for simple "find/suggest
   a recipe" requests, written before order history existed — intercepts the question **before**
   the model gets a turn, whenever it matches `/find|search|suggest|show/` + `/recipe(s)?/`, and
   feeds the *entire question text*, keyword-stripped, as a literal search query. "Suggest a
   recipe using something we buy often" and "What is our common order, and can you suggest a
   recipe with it" both reproduced this: `searchRecipes` was called with garbage like "Read our
   order history and using something we buy often" as the query, and failed. This is pre-existing
   architecture (the three `direct*` fast-paths in `assistant.ts`), not something this session
   introduced — but it is the real blocker for "suggest a recipe from what we usually buy" and
   any future 5-day-plan flow, not tool-round budget. **Next task, not attempted here:** narrow
   `directRecipeSearch()` (and the other two fast-paths) to skip when the question also
   references order history, pantry or the meal plan, so those compound questions reach the full
   tool-reasoning loop instead of being shortcut.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (345 tests, unchanged — no new
automated coverage added for the system-prompt tweak, since it did not change measurable
behaviour in the reproduced case), clean dev-server restart. The finding above is real product
behaviour, not test coverage — captured here rather than invented a passing test around it.

**2026-08-31, the fast-path fix (Claude Code).** Both reproduced failures from the previous entry
are fixed and re-verified against the real model. New `NEEDS_HOUSEHOLD_GROUNDING` regex
(`assistant.ts`, exported for direct testing) — when a recipe request also references order
history, common order, pantry, "usual"/"often"/"regularly" buying habits, `directRecipeSearch()`
now backs off (`return undefined`) instead of feeding the whole question as a literal search
query, letting the full tool-reasoning loop handle it.

Re-tested live against qwen3:8b, both previously-broken questions now correctly chain tools:
"Suggest a recipe using something we buy often" → `getCommonOrder, searchRecipes` (4.5s), found a
real recipe using bananas, a top common-order item. "What is our common order, and can you
suggest a recipe with it" → `getCommonOrder, searchRecipes ×3` (8.3s), used the full 3-round
budget productively and answered honestly when nothing matched, rather than erroring — the
3-tool-round cap was never the actual constraint, exactly as the previous entry's finding said.
Confirmed no regression: "Suggest a chicken curry recipe" still hits the fast path in 1.3s.

The `getCommonOrder` phrasing gap ("What do we usually buy?" not calling the tool) from the
previous entry remains open — a genuinely separate issue from the fast-path interception this
fixed, not addressed here.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (347 tests, up from 345 — 2 new in
`assistant.test.ts` pinning the guard against the exact reproduced failures), `npm run build`,
clean dev-server restart, and live re-verification against the real qwen3:8b provider (not just
unit tests) for all three cases above.

**2026-08-31, AI-generated emails scoped and built (Claude Code).** Ash confirmed AWS SES is
available and answered the two scoping questions this needed: **content** = weekly meal plan +
shopping list summary; **trigger/recipient** = a manual button in Settings, sent only to the
signed-in person's own email, no scheduling, no recipient field.

**Deliberately not AI-written.** The project's rule throughout — "never invent an item, a
quantity, a meal or a price" — applies at least as much to a real inbox as to a wall-dashboard
answer. `buildWeeklyDigest()` (`src/domain/services/weeklyDigest.ts`) assembles the email from the
same real data the app already shows (meal plan, shopping list, weekly budget), in code, not by
asking a model to describe the week and risking a wrong quantity in someone's actual sent mail.

New `src/email/` mirrors `src/ai/`'s provider-abstraction shape exactly (ADR-014's pattern):
`types.ts` (`EmailProvider`, `EmailError`), `sesProvider.ts` (the only implementation, via new
dependency `@aws-sdk/client-sesv2`), `provider.ts` (`getEmailProvider()`, `EMAIL_PROVIDER` env
var, cached across hot reloads like the AI provider and the DB client). `POST /api/email/weekly`
resolves the signed-in user's own email (`currentUser()`), builds the digest, sends it — no
recipient field exists in the request at all, so nothing can address it elsewhere by accident.
Settings gained an "Email" section with an "Email me this week's plan" button; the button press
itself is the confirmation this project's rules require before external email goes out, matching
how every other explicit action in this app works (no extra "are you sure" dialog needed for a
self-addressed, non-destructive send).

New env vars in `.env.example`: `EMAIL_PROVIDER` (default `ses`), `SES_FROM_EMAIL` (must be a
verified SES sender identity, or every send is rejected), `AWS_ACCESS_KEY_ID` /
`AWS_SECRET_ACCESS_KEY` / `AWS_REGION` (standard AWS SDK variables, read automatically — prefer an
attached IAM role in real deployment). **None of these are set in `.env.local` yet** — that is
Ash's step, never something to fill in with real credentials on their behalf. Until they are set,
pressing the button correctly fails with "Email is not configured yet." (503), rather than
crashing or silently doing nothing.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (352 tests, up from 347 — 5 new for
`buildWeeklyDigest`, covering the dinner list, remaining-vs-checked shopping split, the
nothing-planned/nothing-left-to-buy honest-empty cases, and the budget comparison appearing only
when a target is set), `npm run build` (confirms `@aws-sdk/client-sesv2` never reaches the client
bundle — only the server route imports it), clean dev-server restart. **Not yet sent a real
email** — needs Ash's SES credentials in `.env.local` first, then a live click-through test.

**2026-08-31 — Deployed to production (Claude Code).** Ash asked to test the current build for
real; after a local Docker smoke test (port 3003, confirmed healthy), asked about deploying to
the live homelab host and confirmed explicitly via a direct yes/no. All of this session's work
(commit `7458656`, 64 files) was committed and pushed to `stage-2/database-schema` — it had been
sitting uncommitted locally the entire session — then deployed for real:

1. SSH to `192.168.1.49` (key + host fingerprint already present from prior sessions),
   `git pull` — fast-forwarded cleanly to `7458656`.
2. `docker compose up -d --build` **failed the first time**: the host was at 99% disk (372MB
   free) — `ENOSPC` mid-`npm ci`. Not a code problem. `docker system df` showed 10GB+ safely
   reclaimable in unused images (old sonarr/radarr/qbittorrent/jellyseerr/etc. leftovers, not
   anything currently running) and build cache. `docker builder prune -af` +
   `docker image prune -af` freed 10.9GB (99%→41% used, 11GB free) without touching any running
   container or its data, then the build succeeded.
3. Verified exactly per `docs/deploy.md`: `docker compose ps` healthy, `127.0.0.1:3000/sign-in`
   200, `127.0.0.1:3000/api/shopping` 401 (auth enforced), no error logs. Then from **outside the
   network** (not just the host): `https://home.ashnetbase.org/sign-in` → 200 through the real
   Cloudflare Tunnel and TLS.

**The live production app now has today's entire session**: order history import/matching,
cadence-based reorder prediction, `getCommonOrder` + the fast-path fix, and the weekly email
feature (SES still unconfigured on this host too, so the button correctly reports "not
configured" there as well — Ash's step, not done on their behalf).

**Worth remembering for next time:** the homelab host runs close to its disk ceiling. A
`docker builder prune` before a deploy, or checking `df -h` first, would avoid hitting this again
— the host was carrying old images for services (sonarr/radarr/etc.) that were no longer even
running.

**2026-08-31, same day — found and fixed: the deployed app has been running on localStorage, not
Postgres (Claude Code).** Ash checked Settings on the freshly deployed production site and it
showed the Stage 1 localStorage message ("stored on this device only") instead of the household-
database one, and Order History/Email were missing entirely (both gated on `serverData`).

**Root cause:** `NEXT_PUBLIC_AGROCER_SERVER_DATA` is a `NEXT_PUBLIC_*` value, which Next.js
inlines into the client bundle **at `next build`** — exactly like `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which is why the `Dockerfile` already had a comment
explaining this rule. But unlike those two, `NEXT_PUBLIC_AGROCER_SERVER_DATA` was set under
`docker-compose.yml`'s `environment:` block — **runtime**, not a build arg — which has zero
effect on a value that gets baked in at build time. The compiled client bundle has always read it
as unset, so `usesServerData()` has always returned `false` in the deployed image, regardless of
what the container's live environment said.

**This means the live production app may never have actually used the household database from
the browser**, despite `HANDOFF.md`'s Stage 2 completion notes describing browser-verified
Postgres persistence — that verification was almost certainly against the dev server, not a
specifically re-checked deployed container. Worth treating any *browser-verified* claim about the
deployed image specifically (as opposed to the dev server) with more suspicion until re-confirmed.

**Fixed**: `NEXT_PUBLIC_AGROCER_SERVER_DATA` moved to a Dockerfile `ARG`/`ENV` pair (mirroring the
two Supabase values exactly) and to `docker-compose.yml`'s `build.args:` (hardcoded `'1'`, not
read from `.env` — production should always be on), removed from the ineffective `environment:`
block with a comment warning against putting it back there. Rebuilt and redeployed to
`192.168.1.49` the same way as the earlier deploy this session (build succeeded cleanly this
time — the disk-space cleanup from earlier still holds). **Not independently proven correct by
static analysis** — a bundle grep cannot actually distinguish fixed-from-broken here, since both
ternary text branches (`serverData ? a : b`) remain in the compiled code either way, selected at
runtime rather than eliminated at build time; that check was tried and correctly abandoned as
inconclusive, not treated as proof. Redeployed (commit `79fb2df`); confirmed healthy and 200
through the public URL again. **Real confirmation is Ash checking Settings live** — this note
stays here until that happens; update it with the actual result once known.

**2026-08-31, same day — cleanup + two small feature requests (Claude Code).** After the
server-data fix, checked the real Postgres `shopping_items` table directly: it had exactly 3 old
items (`tastey cheese`, `Bread`, `Milk`) left over from earlier trolley testing, and nothing Ash
had just tried to add — confirming those adds genuinely never reached the database (most likely a
cached service worker/PWA still serving the pre-fix build; told Ash to unregister it). Deleted the
3 leftover items with explicit confirmation.

Two feature requests, both built:

- **Add common-order items straight to the shopping list.** Settings' "Your common order" list
  now has a per-item "Add" button and an "Add all" bulk action, building a draft from
  `CommonOrderEntry` (rounded typical quantity, its unit, a guessed category) and calling the
  existing `addShoppingItem`/`addShoppingItems`.
- **Auto-guessed category when adding an item.** New `guessCategory()`
  (`src/domain/services/categoryGuess.ts`): checks the household's own products list first (an
  exact name match wins outright), then a curated NZ-grocery keyword list, returning `undefined`
  rather than a wrong guess when nothing matches. Wired into `ShoppingItemSheet` as a `useEffect`
  keyed off the name field — never on edit (an existing item's category is never second-guessed),
  and never once the person has touched the category chip themselves (checked via React Hook
  Form's `dirtyFields`), so it only ever fills a blank, never overrides a choice.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (357 tests, up from 352), `npm run
build`. Deployed (commit `d3fbc9c`) the same way as before: SSH, pull, `docker compose up -d
--build`, healthy, `/sign-in` 200, `/api/shopping` 401, and confirmed 200 through the public URL.

**2026-08-31, same day — three more matching-flow fixes (Claude Code).** Ash's own live testing:

- **Choosing a New World product now renames the item to New World's exact title.** Confirmed
  with Ash first (garbled request, worth checking rather than guessing): picking a product for
  e.g. "black pepper" now updates the item's own name field to
  "Pams Whole Black Peppercorns Grinder 45g" via a new `onMatchedName` callback on
  `MatchNewWorldProduct`. Safe for later trolley-prepare even though the household preference is
  still saved under the *original* typed name: an item whose name already exactly matches a
  catalogue product resolves via the direct/exact-match path instead, which if anything scores
  higher confidence than the preference path.
- **A live New World search can now be cancelled** ("Stop" button, shown once a search has been
  running) instead of the person having to wait out the full 60s timeout.
- **"Add from your common order" is now on the Shopping screen itself**, not only tucked away in
  Settings — same data, same add logic (`CommonOrderQuickAdd.tsx`), so building a list from
  buying habits doesn't need a detour.

Verified: typecheck, lint, 357 tests (unchanged — UI wiring, no new pure logic), build. Deployed
(commit `34dd51d`), healthy, confirmed 200 through the public URL.

**Resolved, same day — the real bug, and it was worse than the earlier symptom.** Ash retried and
the results panel showed **"3/3 added"** for chicken, black pepper and milk — but on the actual
New World site, nothing was in the trolley; the extension had loaded each product page and simply
not clicked anything. **The app was reporting false success on a real household purchase
action.**

Root cause in `companion/extension/newworld-trolley.js`'s `addCurrent()`: it read any *visible*
quantity number **before** ever trying to click Add. New World's product page shows a
"how many would you like?" selector defaulting to `1` before anything is actually added — the code
saw that default `1`, believed the item already in the trolley, and returned `'added'` without
ever finding or clicking the real Add button. This is a different, more serious bug than the
earlier per-item timeout fix (that one covered a truly stuck page; this one covers a page that
responded instantly with a default value that looked like success).

**Fixed:** the Add button is now always clicked first when one exists — an Add button existing at
all means "not yet added," full stop — and a pre-existing visible quantity is only trusted once no
Add button can be found, which is the one remaining signal that actually means "already in the
trolley." New regression test in `scripts/extension-smoke.mjs` reproduces the exact scenario (a
quantity selector already showing `1` alongside an unclicked Add button) and asserts the button is
clicked regardless. Extension version bumped to **0.1.6** so Ash can confirm which build is
loaded; the two hardcoded "reload extension 0.1.5" messages in `ShoppingScreen.tsx` updated to
match.

**This fix needs the unpacked extension reloaded in `chrome://extensions` — it is not part of the
web app's Docker deploy at all**, so redeploying the site does nothing for this bug. Verified:
`npm run extension:check` (including the new regression case), typecheck, lint, 357 unit tests,
build. Web app deployed (commit `041738e`, for the updated "reload extension 0.1.6" message
text), healthy, confirmed 200 through the public URL.

**Confirmed working by Ash after reloading extension 0.1.6** — the batch-add now genuinely adds
items to the real New World trolley rather than reporting false success. This closes out the
false-"added" bug for real, not just by code review.

**2026-08-31, same day — two more real fixes from Ash's live testing (Claude Code).**

- **Adding a common-order item gave no visible confirmation.** The "Add" button flipped to
  "Added" (small, easy to miss), and nothing else told the person it had actually landed on their
  shopping list below. `CommonOrderQuickAdd` (Shopping) now takes an `onAdded` callback wired to
  the same top-of-page banner every other action already uses ("Milk added to your shopping
  list."); Settings' matching section gained its own equivalent inline message. The item was
  always actually being added — `addShoppingItem`/`addShoppingItems` already call
  `refreshShopping()` — this was purely a missing-feedback problem, not a data problem.
- **The floating "+" button was visually cut off by the bottom nav on phones with a
  home-indicator safe area.** `BottomNav` pads itself for `env(safe-area-inset-bottom)` (up to
  ~34px on notched iPhones); `FloatingAddButton`'s `bottom-24` did not, so on any such device the
  nav ends up taller than the button's clearance and visually overlaps its lower half. Fixed with
  the same inset in the button's own offset
  (`bottom-[calc(6rem+env(safe-area-inset-bottom))]`) — one shared component, so this also fixes
  Household and Pantry's add buttons, not just Shopping's.

Verified: typecheck, lint, 357 tests (unchanged — UI/feedback wiring, no new pure logic), build.
Deployed (commit `7f4adb2`), healthy, confirmed 200 through the public URL.

**2026-08-31, same day — the real bug behind "added but can't see it," and it was serious
(Claude Code).** Ash pressed "Add all" (10 common-order items), got the new confirmation banner,
but the shopping list did not show them. Checked the live database directly: **all 10 rows were
genuinely there**, correctly formed, valid categories, one batch insert — the add worked
perfectly server-side. This meant the browser was showing stale data despite the real data being
correct, which is the same *symptom* as the earlier "localStorage vs Postgres" bug but a
completely different, more serious cause underneath.

**Root cause, in `public/sw.js`:** the fetch handler special-cases page navigations (network
first) and otherwise falls through to a "static assets: cache first" branch — which every
`/api/*` GET request also fell into, since nothing excluded them. Once `/api/shopping` had been
cached even once, the service worker could keep serving that exact stale JSON response
**indefinitely**, for every future add, edit, remove or check-off, regardless of what actually
changed in the database — with no error, and no way for the running app to know its own data was
wrong. This is not specific to shopping: `/api/pantry`, `/api/orders`, `/api/meals`, all of it
were equally exposed. Given how many "added it, can't see it" reports have come up this session,
this is very likely the real explanation for more than one of them, not just this one.

**Fixed:** every `/api/*` GET now bypasses the cache entirely and always hits the network.
`CACHE` bumped to `agrocer-shell-v2` so `activate` actually purges any old cache still holding a
stale `/api/*` entry from an already-installed PWA, rather than requiring Ash to manually clear
site data (which had been the standing advice, and evidently wasn't reliable — this is why).

Verified: `node --check public/sw.js` (plain browser script, no test harness for it), typecheck,
lint, 357 tests (unchanged — this file isn't part of the TS build), build. Deployed (commit
`738ce45`), confirmed the live `/sw.js` now serves `agrocer-shell-v2` with the fix. **Ash's
browser still needs the new service worker to actually take over** — the old one keeps running
until it is replaced, which normally happens automatically on the next visit but can be forced
with a full reload; not yet confirmed live that the shopping list now reflects real data
immediately after an add.

**2026-08-31, same day — common-order add now checks the real shopping list, not just this
session's memory (Claude Code).** The repository already merges a duplicate name into the
existing unchecked row rather than creating a second one, so a literal duplicate row was never
possible — the gap was purely that the UI only remembered what *this panel* had added since it
opened, not whether an item was already on the list from earlier. Both `CommonOrderQuickAdd`
(Shopping) and Settings' equivalent now check the real `shopping` state: an item already
unchecked on the list shows "On list" and is disabled rather than "Add", clicking it anyway (or
"Add all" when everything qualifies) says so explicitly instead of silently merging, and "Add
all" only sends the items that are not already there, reporting how many were skipped.

Ash also described wanting a "you ordered toilet paper last time, is it due?" style reminder —
that is what `predictReordersFromHistory` / Pantry's "Keep an eye on" card and the
`getReorderSuggestions` AI tool already do (2026-08-31 earlier entries). Ash explicitly deferred
building anything further there ("for now just a message... let's move on to next stage") — noted
so a future session does not duplicate this, but nothing new was built for it this pass.

Verified: typecheck, lint, 357 tests (unchanged — UI wiring against already-tested pure
functions), build. Deployed (commit `7fcef09`), healthy, confirmed 200 through the public URL.

**Shopping is now considered feature-complete for this stage, per Ash: "the shopping works, let's
move on to next stage."** Everything in this and the preceding several entries (order history
import/matching, reorder prediction, common-order quick-add with duplicate awareness, New World
matching fixes, the trolley false-success bug, the service worker cache bug) is deployed and
live.

**Resolved 2026-08-31, same day.** Ash answered: Kids/School module, starting with foundation
(child profiles + a real Kids screen), Hero email ingestion right after — see the 2026-08-31
"Kids/School foundation" entry at the top of this file and the matching entry in
`AGROCER_MASTER_PLAN.md`'s progress log for exactly what shipped. Verified locally (typecheck,
lint, 363 tests, production build, `db:migrate` + `db:rls` against the real database) but **not
yet deployed** — see "Current NEXT TASK (2026-08-31)" near the end of this section.

Next in the staged plan: none remain from the original list. The natural next steps are (1)
confirming the server-data fix actually shows Order History/Email and the household-database
message on the live site, (2) setting up real SES credentials and doing a live send test, (3)
matching more of the household catalogue as Shopping/trolley use grows it.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (337 tests), `npm run test:db` (15
integration tests against the real database, including a live match-and-never-twice check with a
throwaway household — confirmed cleaned up afterward, and the real household's 214 rows confirmed
untouched), `npm run build`. Dev server restarted clean afterward and confirmed serving 200.

**2026-08-31 — Multi-order import, and a silent-looking "Use this product" bug fixed (Claude Code).**

Two follow-ups after Ash tried the order-history importer and the inline matcher:

- **Multi-order paste.** Ash's real invoice paste turned out to be five separate order
  confirmations concatenated together (multi-page PDFs, each page repeating its own "Tax Invoice
  N" header). `parseNewWorldOrderBatch` (`src/domain/services/orderImport.ts`) splits a paste on
  a *changed* invoice number — a repeated number, from the same invoice's later pages, stays one
  order. `OrderImportSheet` now reviews one date-grouped section per detected order instead of a
  single shared date field, and a script (`scripts/import-orders.ts`, `npm run orders:import`)
  exists for bulk-backfilling from a file the same way.
  **A live import of Ash's real orders was attempted and then rolled back.** I don't have a way
  to paste the user's message verbatim into a file — I have to regenerate the text — and across
  ~700 lines the reconstruction drifted: order 1's line-item total summed to $324.04 against an
  invoice subtotal of $253.50 in the original. All 214 imported rows were deleted immediately
  (`order_line_items` confirmed empty again) rather than leave possibly-wrong numbers in real
  financial history. **The correct path is Ash pasting directly into Settings → Order history —
  never through me retyping it.**
- **"Use this product" in `MatchNewWorldProduct` looked like it did nothing.** It actually saved
  correctly, but the only feedback was the shared top-of-page banner in `ShoppingScreen`, which
  sits behind the open item sheet and was invisible. Fixed by collapsing the panel to its
  "Matched: <product>" state (checkmark) immediately on success, inside the still-open sheet.
  Also fixed a related staleness bug found while looking at this: the matcher never reset between
  items, so matching "milk" then closing and reopening the sheet to add "bread" would still show
  "Matched: Value Standard Milk2l". `ShoppingItemSheet` now keys `MatchNewWorldProduct` on a
  counter that increments every time the sheet opens, forcing a clean instance per item.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (336 tests), `npm run build`.
Migrations `0011`–`0012` **are applied to the live Supabase project** (confirmed via
`npm run db:rls` — 14 tables, all RLS-protected, publishable key reads nothing).
`order_line_items` is confirmed empty. Not yet visually re-verified in a browser after either fix.

**2026-08-31 — Order history import and "common order" summary (Claude Code).** First step of a
larger plan Ash asked for (paste past orders → common order → matching → reorder prediction → AI
recipe suggestions → possibly email, each its own task). This step only: `src/domain/services/
orderImport.ts` parses a pasted New World invoice into line items (name, quantity actually
supplied, unit, price), using the substituted product rather than an out-of-stock original, and
**never extracts a customer name, address, phone or order number** — the parser simply doesn't
look for that shape, which is what makes it safe to point at a real invoice. New table
`order_line_items` (migration `0012`, RLS policy hand-added) is append-and-read only, same shape
as `meal_feedback`; `OrderHistoryRepository` follows `FeedbackRepository`'s local-refuses/
Drizzle-and-API-implement pattern exactly. `OrderImportSheet` (Settings → Order history, only
shown with server data on) is paste → review → confirm, matching `RecipeImportSheet`. Settings
shows a "common order" frequency summary (`summariseCommonOrder`) once anything is imported.

**Next task, in order:** (1) match imported lines to `retailer_products` — schema already has
`matchedProductId`/`matchedProductName`, no new migration needed; (2) upgrade reorder prediction
to read order history; (3) an AI read-only tool over order history feeding meal suggestions
(Phase 10); (4) AI-generated emails, deliberately last and unscoped — needs SMTP credentials, a
trigger design and human confirmation before sending, not started at all.

Migration `0012` needs `npm run db:migrate` run against the live Supabase project before any of
this works there. Verified: typecheck, lint, 333 tests, build, `db:generate` (clean no-op rerun).
Not yet visually verified in a browser this session.

**2026-08-31 — Recipe instructions/photo wired through, and typo-tolerant search (Claude Code).**
Ash picked all four options from the earlier survey; this covers the first two ("cheap fix" +
meal search) plus fuzzy search, in one pass:

- **Recipe instructions were fetched then discarded.** `mealSchema` gained an optional
  `instructions` field (migration `0011`, additive nullable `text` column). TheMealDB's
  `strInstructions` and thumbnail already flowed through `/api/recipes/:id` — `RecipeImportSheet`
  now actually reads them instead of hardcoding `image: undefined`. Pasted recipes now also
  capture everything after a "Method"/"Instructions"/"Steps" heading as `instructions` (previously
  only used to find where the ingredients section ended). `MealFormSheet` gained a "How to cook it"
  textarea (new `FormTextareaField` primitive) and `MealDetailSheet` displays it read-only.
  `next.config.ts` now allowlists `www.themealdb.com/images/**` for `next/image`, since a real
  external thumbnail can now reach `meal.image` for the first time — omitting this would have
  thrown a runtime error the first time someone imported a recipe with a photo.
- **Meal search.** `MealPickerSheet`'s existing search (used when planning a slot) now matches
  ingredients as well as the meal name, not just name-substring.
- **Typo-tolerant search everywhere else.** New `src/lib/search.ts` → `fuzzyMatch(text, query)`:
  exact substring first, then per-word edit-distance tolerance (0 for ≤3 letters, 1 for ≤6, 2
  beyond). Wired into Products, Pantry, and the meal picker. **Deliberately not applied to New
  World retailer matching** (`src/shopping/matching.ts`) — that engine decides what is safe to
  add to a real trolley automatically and stays exact/token-overlap on purpose; typo tolerance
  there would be a safety regression, not a UX improvement.
- **New World specials integration was surveyed but not started** — it's Stage-5-sized
  (Cloudflare/companion-extension constraints, same as the catalogue). `SPECIALS_PROVIDER` still
  only supports `"manual"`.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (321 tests, up from 313),
`npm run build`, `npm run db:generate` (clean, migration `0011` reviewed by hand — one additive
nullable column). **Not yet applied to the live Supabase project** — `0011` needs
`npm run db:migrate` run against it. Not yet visually verified in a browser this session.

**2026-08-31 — Inline New World matching in the add/edit item sheet (Claude Code).** Ash asked for
the previously-deferred feature after all: choosing the exact New World product while adding or
editing a shopping item, instead of only through the separate "Prepare New World trolley" step.
Added `MatchNewWorldProduct` (`src/features/shopping/components/MatchNewWorldProduct.tsx`), a
collapsed-by-default expander inside `ShoppingItemSheet` — "Match a New World product now" —
carrying its own search box (extension-live when the desktop Chrome extension is online, the 24/7
catalogue otherwise) and product grid. Choosing a product calls the existing
`POST /api/trolley/preferences` directly, keyed on the typed item name text (works even before the
shopping item itself is saved, since preferences are keyed by normalised name text, not item id).
The expander then shows "Matched: <product>" so it is obvious the choice was saved, and the shared
top banner also confirms it. `ShoppingScreen` threads its existing extension-online state, live
search results/messages and `searchNewWorldItem` through to the sheet using a synthetic
`'__draft__'` key when adding a brand-new item (editing an existing item uses its real id). No new
API route, schema, or migration — this reuses the preferences endpoint and existing extension
bridge exactly as the trolley review lines do. Everything else (Prepare trolley, trolley review,
Add to New World) is unchanged.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (313 tests), `npm run build`, all
clean. **Not yet visually verified in a browser** — no browser connection was available this
session — and not yet live-tested against the desktop extension. Worth a quick check next session:
open Shopping → Add item, type a name, expand "Match a New World product now", search, choose a
product, confirm the banner and the "Matched:" label both appear, and that the trolley later shows
it "Ready" without a manual "Search for a different product" step.

**2026-08-31 — New World product-search feedback and batch-add stall fixed (Claude Code).** Two
more issues from live use:

1. **The standalone "New World products" browse panel gave no visible confirmation.** Choosing a
   product ("Use for cream") saved the preference correctly but only wrote a tiny status line
   *inside the still-open panel*, and did nothing if no trolley had been prepared yet — so it
   looked like nothing happened. `NewWorldCatalogue`'s `onPreferenceSaved` now takes the
   confirmation message and the panel closes itself after saving; `ShoppingScreen` shows that
   confirmation in the same top-of-page banner used everywhere else, whether or not a trolley is
   currently prepared.
2. **The Chrome batch-add extension could silently stall after the first item** ("only adds
   milk"). `background.js` awaited `chrome.tabs.sendMessage(tabId, { type: 'add-current', ... })`
   with no timeout; if the content script never responded (page didn't finish loading, an
   unexpected DOM state, etc.) the whole batch hung forever with no error surfaced, so the second
   and third ready items were never attempted. Added a 25s per-item timeout via `Promise.race`
   that records an `unknown-error` result and advances to the next item instead of hanging.
   `npm run extension:check` and `node --check` on both extension files still pass.

**Not a bug, working as designed:** the "tastey cheese" line keeps showing "Mexicano Tasty Cheese
Corn Chips170g / Needs review" because that is still the household's *saved preference* for that
exact list-item text — `isPlausibleProductForItem` (src/shopping/matching.ts) correctly refuses to
mark a chips/snack product as ready for a plain "cheese" request, but it does not delete the wrong
saved preference, so it reappears every prepare until someone presses "Search for a different
product" on that line and picks a real cheese product, which overwrites the saved preference (the
Drizzle upsert in `savePreferredProduct` keys on the normalised item text, confirmed correct).

**Deliberately deferred, per Ash's answer:** inline "pick the exact New World product while adding
a shopping item" was proposed as a fast-follow but explicitly held back for a future task — do not
start it without being asked.

Verified: `npm run typecheck`, `npm run lint`, `npm run test` (313 tests), `npm run extension:check`,
all clean.

**2026-08-31 — Stale prepared-trolley card fixed (Claude Code).** Ash reported the New World
trolley card on Shopping kept showing items ("tastey cheese", "loaf Bread", "Milk") that were no
longer on the shopping list. Root cause: `prepareTrolley` correctly snapshots only unchecked
shopping items at the moment "Prepare New World trolley" is pressed, but the resulting
`PreparedTrolley` was held in `ShoppingScreen` component state and never re-synced afterward — a
check-off, removal, or edit from another device (or the AI assistant) left the card showing a
stale snapshot indefinitely, until "Clear trolley" was pressed manually. Fixed with a `useEffect`
in `src/features/shopping/ShoppingScreen.tsx` that drops any trolley line whose shopping item is
no longer unchecked on the live list, clearing the whole card when nothing valid remains. No API
or schema change. Verified: `npm run typecheck`, `npm run lint`, `npm run test` (313 tests, all
passing).

Current state (2026-08-30): recipe/planner AI, voice input/output, reorder and use-soon advice,
product alternatives, specials abstraction/screen, notifications, and the Stage 5 trolley companion
foundation are implemented and checked. Migration `0010` is applied: 13 tables have RLS and one
authenticated household policy each.

The 24/7 New World household catalogue now uses the deployed Agrocer container and Supabase rather
than a redundant second service (ADR-022). Every valid candidate returned by extension 0.1.5 is
cached automatically, and phones can browse those products while the workstation is off. The
timestamp is freshness information, not a live-price promise. Commit `2078ba1` was deployed to
`192.168.1.49` on 2026-08-30 after its ED25519 host fingerprint was verified. The container was
healthy and both local and public route checks passed. Follow `docs/homelab-catalogue.md` for the
remaining browser-only live test.

The Meals planner now has a direct **Find a recipe** action in each empty slot. It opens recipe
search first, keeps the editable review step, then saves and assigns the new meal to the selected
day/slot. This avoids making a person save a recipe and then hunt for it in the planner separately.

Shopping now has a phone-friendly **New World products** section. The deployed app can call a
household-operated product collector through `NEW_WORLD_CATALOGUE_URL`, validate/cache encountered
products, show images/current and special prices, and save an exact product against a shopping item.
The contract is documented in `docs/new-world-companion.md`. Until that collector is deployed, the
section truthfully shows only previously seen cached products. No live catalogue feed is claimed.

Phone/tablet replacement search no longer stops at that cache. **Search for a different product**
shows cached choices immediately and, when no live catalogue is configured, persists a product
search job for the household. Shopping on the desktop with extension 0.1.5 shows **Product search
from another device**; the user presses **Process product search**, the visible New World tab is
searched, and validated exact candidates are stored and polled back to the phone. Selecting one
replaces the remembered preference and shows an explicit success message. This relay is automated-
test complete but still needs its first live phone-to-desktop test. The workstation must be on for
this fallback; a deployed homelab catalogue remains the 24/7 option.

### New World deployment options

**Option A — recommended hybrid:** run the catalogue/search/cache service as a separate 24/7
homelab container. Phone and tablet use Agrocer and catalogue data without the workstation. Turn on
the workstation only for the short trolley-add step, because the Manifest V3 extension uses Ash's
normal visible, logged-in Chrome session. Review and payment can then happen on the phone or New
World website. Estimated setup from the current seam: 2–4 hours for the container/API/cache and
deployment, plus 4–8 hours to implement and validate retailer acquisition if New World's public
site permits it. Allow roughly one working day for a useful first version; reliable live acquisition
may take 1–3 days or remain constrained by Cloudflare/site changes. Never bypass a challenge.

**Option B — fully homelab visible browser:** run the catalogue service and a persistent visible
Chrome session on the homelab, exposed to Ash through a user-operated remote desktop such as noVNC.
Ash logs into New World there manually. This can remove the workstation dependency for trolley
addition, but costs roughly another 4–8 hours to package and secure, keeps a retailer session on the
homelab, is less convenient on a phone, and may still receive the same Cloudflare challenges.
Because the already-tested Playwright profile was repeatedly challenged, this is supported as an
experimental alternative, not the default recommendation. No headless/stealth/CAPTCHA bypass.

The token is household-generated, not supplied by New World. Store the same long random value as
`NEW_WORLD_CATALOGUE_TOKEN` in the private `.env` files for Agrocer and the catalogue container;
never commit it. When both containers share a Docker network, use an internal URL such as
`NEW_WORLD_CATALOGUE_URL=http://new-world-catalogue:4320`. `NEW_WORLD_STORE_ID` will be captured
from the selected store during collector validation.

Stage 5 now supports both preferred integration paths: a future official retailer API and a local,
visible New World browser companion. It no longer treats an official API as a prerequisite. Product
preferences persist, deterministic matching runs before any future AI ranking, and prepare/send are
separate explicit actions. Run the companion with `npm run companion:newworld`; configuration and
safety details are in `docs/new-world-companion.md`.

**Next Stage 5 task:** deploy this commit, reload unpacked extension 0.1.5, and live-test the repaired
cross-device path: on phone choose **Search for a different product**, on desktop press **Process
product search**, confirm exact candidates return to the phone, and select the intended product.
Then send only one known product at quantity 1 and compare Agrocer's result with the visible New
World trolley. Repair only central selectors/deterministic behavior exposed by that test. CAPTCHA
or retailer blocking must stop and report `blocked`; checkout and payment remain user-only.

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

The first live trolley test added two products but returned `0 / 3`, and revealed that search-card
containers had paired misleading names/links: saved examples included `View all 'Milk'`, `White
Bread`, and a corn-chip result for tasty cheese. Extension 0.1.1 tightens acquisition to real
`/shop/product/` URLs, takes the product name from the product image/link rather than a surrounding
group heading, verifies the opened page's product heading before clicking, and reads the existing
visible quantity before incrementing. Generic preferences now require replacement and cannot be
saved again. The UI reports each item status/message. **Next manual step:** pull/deploy, reload the
unpacked extension, replace all three bad preferences via **Search for a different product**, then
test one product at quantity 1. Do not resend the old three-item batch because two products are
already in the New World trolley.

The Shopping summary card was also moved into the scrollable content. On mobile only the compact
title remains above the scroll area, so list items and bottom navigation are reachable.

Migration `0009` is applied. `trolley_jobs` makes the extension workflow cross-device: a mobile PWA
queues ready exact products, the desktop polls for them, and the user explicitly presses Process
queued trolley. Results are persisted and polled back to mobile. Product preferences now have an
`enabled` switch and the UI can pause/re-enable or replace a remembered item for specials. The live
database has 12 RLS-protected tables; `npm run test:db` passes 12 tests.

Migration `0010` is also applied. `retailer_product_search_jobs` relays live replacement searches
from phone/tablet to the normal desktop Chrome extension and returns candidates to the originating
PWA. Shopping now reports queued, processing, completed, and attention states visibly. A remembered
product with a conflicting form, including the observed tasty-cheese corn-chip preference, is no
longer marked ready automatically. The live database has 13 RLS-protected tables;
`npm run test:db` passes 13 tests. Live phone-to-desktop relay verification remains manual.

Extension 0.1.2 repaired the first failed product-search flow observed after 0.1.1: it retries while New
World's client-rendered cards appear, extracts real lazy-loaded HTTP images, and returns the choices
to both the general catalogue panel and **Search for a different product**. Empty/failed searches now
end with a useful status rather than remaining in processing. Completed or stale search/trolley
activity has a Clear/Dismiss action; the database record is marked `dismissed`, not deleted, so the
history remains audit-friendly. Reload the unpacked extension before live testing these changes.

Extension 0.1.3 then repairs the live nested-card failure: it accepts either New World hostname,
finds product identity across sibling image/name links in generic `div` cards, waits up to 30
seconds, and reports the number of genuine product links detected when extraction still fails.

Extension 0.1.4 handles New World's live plain-text **Add** button while remaining fail-closed. It
accepts only narrow Add/Add-to-trolley/Add-to-cart labels, then requires the visible quantity to
appear before reporting success. Failed control discovery includes bounded visible labels so the
next retailer markup change can be diagnosed from Agrocer rather than guessed.

Extension 0.1.5 repairs the next live failure: current product identity may be an accessible `h2`
and search names can join the size (`Milk2l`). Heading candidates are ranked by meaningful product
tokens, letter/number boundaries are normalised, and size tokens are ignored only for identity
comparison. A wrong product remains a tested rejection. The prepared-trolley card also supports
removing one line or clearing the whole transient batch without deleting the shopping list.

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

### Current NEXT TASK (2026-08-31)

**Kids/School foundation is built and locally verified but NOT deployed.** Deploy it the usual
way (SSH to `192.168.1.49`, `git pull`, `docker compose up -d --build`, verify `docker compose
ps` healthy and 200 on `/sign-in` locally and via the public URL) — the migration (`0013`) is
already applied to the real database, so this is a code-only deploy, no migration step needed
on the host.

**After that, the actual next piece of work is the Hero email ingestion pipeline** (Phase 13),
per Ash's 2026-08-31 direction: automated Gmail API polling of `007agentuse@gmail.com` (do not
write that address anywhere else in this repository — see the Kids/School status section
above). This needs, in order:

1. **A decision from Ash, not a default**: a Google Cloud project + OAuth client for Gmail API
   read access (scoped to `gmail.readonly` at most — this pipeline only ever reads), and how
   its refresh token gets into this app's environment (a runtime env var, matching the
   `EMAIL_PROVIDER`/AWS-SES pattern in `docker-compose.yml`, is the obvious fit — never
   source-controlled).
2. A `SchoolProvider` interface (today there is only the `schoolNotificationProviderSchema`
   enum and one write path) with a `HeroEmailProvider` implementation: poll the inbox, confirm
   each message is actually from Hero (an approved sender check, not "any email in this
   inbox"), extract title/summary/dates, call `school.add()` with `provider: 'hero-email'` and
   the Gmail message id as `externalReference` (the unique index already guarantees a retried
   poll can't double-insert).
3. Per CLAUDE.md: **the AI must not invent missing dates, requirements or school information.**
   Where extraction confidence is low, the notification should still be created (so nothing is
   silently dropped) but flagged for review rather than presented as fact — this needs a real
   design decision (a field? a status?), not a guess made mid-implementation.
4. Whether the second local model Ash mentioned ("hermes", said to be `qwen2.5-14b-64k`) is
   actually reachable via an Ollama-compatible API is unconfirmed — check with Ash before
   building anything that assumes it, and confirm what "any use" was asking for (a better model
   for summarizing verbose Hero emails is the most likely reading, but that is inference, not
   something Ash stated).

Do not start any of this without confirming step 1 with Ash first — it is a real external
credential and inbox-access decision, not a code choice.

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

2026-08-31, on `stage-2/database-schema`. Migrations through `0013` are applied to the real
database. Kids/School foundation built and verified locally; not yet committed, not yet
deployed. Nothing has been merged to `main`.

Stage 5 has persisted retailer products/preferences, deterministic matching, prepare/send APIs, an
upgraded Shopping review UI, a normal-Chrome extension, cross-device trolley and product-search
jobs, and a separate visible Playwright fallback. The built-in 24/7 household catalogue is deployed
on the homelab and backed by Supabase; visible extension searches populate it without an unattended
retailer crawler. Recipe search from an empty planner slot now saves and assigns the new meal in one
reviewed flow. The extension 0.1.5 candidate/image flow and live New World trolley-add selectors
still need final browser validation. No New World credentials are stored and payment/final checkout
are not implemented.
