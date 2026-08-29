# AshHome / Agrocer — Roadmap

Statuses: `[ ]` not started · `[~]` in progress · `[x]` completed · `[!]` blocked

Detail, Definitions of Done and rationale live in `AGROCER_MASTER_PLAN.md`.
Current state of the code lives in `HANDOFF.md`.

> **Roadmap reconciliation — still open.**
> `AGROCER_MASTER_PLAN.md` defines Agrocer **Stages 1–8**; `CLAUDE.md` now defines AshHome
> **Phases 0–17**. They cover overlapping ground with different numbering, and the phases reach
> well beyond Agrocer into kids, school and household modules. This file tracks both: the
> AshHome phases first, then the Agrocer stages that carry the Definitions of Done.
> Where the two disagree, ask before proceeding.

---

## AshHome phases

- [x] Phase 0 — repository baseline, documentation and persistent handoff
- [~] Phase 1 — AshHome shell, responsive navigation and wall-dashboard foundation
      (`/dashboard` exists with all seven cards; navigation shell and kiosk config pending)
- [x] Phase 2 — backend/API foundation
- [x] Phase 3 — PostgreSQL family data model *(the Agrocer half; kids/school not modelled)*
- [x] Phase 4 — Agrocer shopping lists, favourites and history
- [x] Phase 5 — pantry/freezer inventory
- [~] Phase 6 — recipe providers and family recipes *(pantry-to-recipe matching done;
      discovery, import and providers not started)*
- [~] Phase 7 — meals, meal planning and grocery budgeting *(planning, weekly budget, meal
      cost estimation, and feedback capture are done; feedback learning remains)*
- [x] Phase 8 — local Ollama AI service *(slices 8a and 8b done: provider abstraction,
      `/api/ai/chat`, and the "Ask AshHome" card. Still no tools and no writes — that is Phase 9)*
- [x] Phase 9 — controlled AI tool/action system *(9a read tools + 9b the first write tool,
      behind a confirmation gate. The model proposes; a person confirms)*
- [ ] Phase 10 — pantry-aware AI meal planning
- [ ] Phase 11 — reminders, scheduler and notifications
- [ ] Phase 12 — kids, chores, family calendar and school-data foundation
- [ ] Phase 13 — Hero/email/calendar school integration
- [ ] Phase 14 — wall-dashboard enhancements, kiosk/device configuration and shared-family UX
- [ ] Phase 15 — homelab deployment, monitoring and backups
- [ ] Phase 16 — Home Assistant integration
- [ ] Phase 17 — voice assistant and additional external integrations

Phases 2–5 and much of 7 landed inside Agrocer Stage 2, which is why the numbering needs
reconciling: the phase list assumes work that the stage list already completed.

### Phase 1 dashboard cards

- [x] `/dashboard` route with its own full-screen kiosk layout
- [x] Kids / Today — real children, no events yet
- [x] Family schedule — placeholder
- [x] Reminders — placeholder
- [x] Shopping — real, interactive, checkable from the wall
- [x] Tonight's meal — real
- [x] Chores — placeholder
- [x] Ask AshHome — **real, reads real data, and can add to the list with confirmation**
      (slices 8b, 9a, 9b). Answers from the shopping list, pantry and meal plan and labels
      which it consulted; proposes shopping additions behind an Add it / Cancel gate. Cannot
      change anything else or see the calendar, chores or school, and the card says so
- [ ] quick-add shopping directly on the dashboard (currently opens the full list)
- [ ] real-time or polled updates so a phone change appears on the tablet without a reload
- [ ] kiosk/device configuration (Phase 14)

### Kids and school

- [ ] child profiles beyond household members
- [ ] `SchoolProvider` abstraction
- [ ] Hero email ingestion — **not started, and bound by the rules in `CLAUDE.md`**: no
      scraping, no stored credentials, no working around Hero security
- [ ] calendar feed import
- [ ] family calendar model

---

## Agrocer stages

### Phase 0 — Repository baseline, documentation and persistent handoff

- [x] `CLAUDE.md` expanded to full AshHome instructions (vision, interface modes, wall
      dashboard, device architecture, AI architecture, agent safety, git/secrets rules)
- [x] `HANDOFF.md` created
- [x] `TASKS.md` created
- [x] `docs/ARCHITECTURE.md` created
- [ ] reconcile the Stages 1–8 / Phases 0–14 roadmaps (user decision)

## Stage 1 — Product foundation and usable manual PWA — `[x]` COMPLETE (dev-complete, ADR-012)

- [x] port from Vite/React Router to Next.js App Router
- [x] all screens: shopping, shopping mode, pantry, meals, products, household, settings
- [x] domain services with unit tests
- [x] localStorage persistence behind repository contracts
- [x] hand-written service worker and offline page
- [x] Docker image built and smoke-tested
- [x] visual confirmation against the Magic Patterns design

## Stage 2 — Real backend and household data — `[~]` IN PROGRESS

*Roughly AshHome Phases 2–3.*

- [x] Drizzle schema — 7 tables (`src/db/schema.ts`)
- [x] initial migration generated (`drizzle/0000_mysterious_black_cat.sql`)
- [x] row ↔ domain mappers with tests
- [x] server-only Drizzle client (`src/db/client.ts`)
- [x] Drizzle repository implementation behind the Stage 1 contracts
- [x] **Supabase project provisioned** (ADR-013) — `agrocer` / `ojlzjjvrtnslcxqdmpay`,
      ap-southeast-2. Required pausing `Salon Booking App UI Design`: the free tier caps one
      user at 2 active projects across every org they own or administer
- [x] migration applied and the 7 tables confirmed to exist (applied through the Supabase
      management API, not `drizzle-kit`)
- [x] `.env.local` written with the session-pooler `DATABASE_URL`; connection verified
- [x] Drizzle's migration journal reconciled — `npm run db:migrate` is a clean no-op, so
      migration `0001` can be generated normally
- [x] repositories proven against real Postgres — `npm run test:db`, 6 integration tests
      covering shopping round-trip and merge, pantry adjust, plan assign/clear, and the
      refusal of `reset()`. They run in a throwaway household and clean up after themselves
- [x] backend/API architecture — route handlers for all five features, with shared plumbing
      in `src/server/http.ts` (server) and `src/data/api/client.ts` (client)
- [x] seed script — `npm run db:seed`, idempotent, one household from the Stage 1 demo data
- [x] persistent shopping lists — route handlers, HTTP repository, and the UI verified
      end to end against Supabase behind `NEXT_PUBLIC_AGROCER_SERVER_DATA="1"`
- [x] persistent pantry — route handlers, HTTP repository, and the UI verified end to end;
      quantity steps are relative (`PATCH {adjust:n}`) so the server floors at zero
- [x] persistent products — route handlers and HTTP repository, verified end to end. The
      contract still has no create method, so `npm run db:seed` remains the only way products
      reach Postgres — a gap to close deliberately, not with a speculative POST
- [x] persistent meal plans — route handlers and HTTP repository, verified end to end. Plan
      slots are addressable (`/api/meals/plan/[day]/[slot]`), and deleting a planned meal
      frees its slot through the foreign key rather than by hand
- [x] persistent household — settings and members, verified end to end. Initials are derived
      server-side rather than accepted from the client, so they cannot drift from the name
- [x] **RLS enabled on all 9 tables** (ADR-016), migrations `0001`/`0005`. The publishable
      key could read the household, the children's names, the pantry, the products and the
      meals, and could insert rows; it now reads nothing and is refused on write. The app is
      unaffected because it connects as `postgres`, which owns the tables and bypasses RLS —
      so this did *not* have to ship with auth, contrary to what this file used to say.
      Verify any time with `npm run db:rls`
- [x] **authentication (Supabase Auth, ADR-017)** — email + password, session in cookies,
      household resolved from `household_members.user_id`. Every data-bearing/action route
      refuses without one (401), and an account with no member row is refused too (403). The
      raw data-free `/api/ai/chat` transport is the documented exception. Auth is ON unless
      `AGROCER_AUTH="off"`, so it fails closed
- [x] RLS *policies* granting `authenticated` its own household
      (`drizzle/0003_household_rls_policies.sql`) — defence in depth, since the app bypasses
      RLS as `postgres`
- [x] **first account created and linked** — `ashley.schippersas@gmail.com` signs in as `Ash`.
      Confirmed working by Ash on 2026-08-29
- [x] wall dashboard cards gate on `hydrated` — Shopping, Tonight's meal and Kids showed the
      Stage 1 demo fixtures until their fetch resolved, which was mistaken for real data
      during development. They now show "Loading…"
- [x] client-side 401 handling — a lapsed session now redirects to `/sign-in?next=…` from every
      fetch path including the assistant; 403 deliberately does not redirect. Verified live by
      expiring the cookie on an open dashboard
- [x] meal feedback history — `meal_feedback`, repository, `/api/feedback`. Append-and-read
      only. Stage 4 meal detail now records and shows it
- [x] audit-friendly inventory events — `inventory_events`, written by the pantry repository
      itself so it cannot drift. Survives deletion of the item it describes
- [x] migrations — `0000`–`0007`, `db:migrate` and `db:generate` both clean no-ops
- [x] backup/restore plan — `docs/backup.md`, commands verified against the live project.
      **A full dump contains `auth.users` — password hashes. Treat it as a credential store**
- [x] Docker Compose deployment — Stage 2 compose and Dockerfile build args; publishes
      `3000:3000` to the LAN because `cloudflared` runs on another machine (ADR-019)
- [x] CI checks — `.github/workflows/ci.yml`, including an RLS job that fails if the
      publishable key can read anything
- [~] staging deployment pipeline — runbook written (`docs/deploy.md`); the deploy is Ash's

**Ash's remaining Stage 2 steps** (they need the homelab host; see `docs/deploy.md`):

- [x] **HTTPS decided** — the existing Cloudflare Tunnel on `ashnetbase.org` (ADR-019)
- [ ] add the `home.ashnetbase.org` public hostname to the `homelab` tunnel
- [ ] `docker compose up -d --build` on the homelab host
- [ ] install the PWA on a phone — the thing HTTPS was blocking
- [ ] confirm it stays reachable with the workstation off (ADR-007)

Inherited from Stage 1 (ADR-012) — provisioning, not build work:

- [ ] provision the `agrocer-stg01` VM (spec in master plan section 12)
- [ ] deploy the existing `agrocer:stage1` image via `docker compose up -d --build`
- [!] **decide the HTTPS approach** — Tailscale, Caddy with an internal CA, or a real domain.
      Blocks PWA install: a LAN address over plain HTTP is not a secure context, so the service
      worker will not register. `docs/staging.md` compares the options; Tailscale recommended.
- [ ] open Agrocer from a phone on the home network and install it
- [ ] confirm it stays reachable with the Ryzen desktop powered off (ADR-007)

## Stage 3 — AI meal and grocery assistant — `[~]` IN PROGRESS

*AshHome Phases 7–8. Being taken in slices — see the 2026-08-28 progress log entry.*

- [x] backend AI service abstraction (provider-agnostic — `AiProvider`, chosen in one place).
      Cloud fallback has a seam (`AI_PROVIDER`) but no implementation
- [x] local Ollama provider + `/api/ai/chat` (health and one-shot chat), verified end to end
      with `npm run ai:chat`. Ollama stays bound to localhost, so this works only on the
      workstation; from staging it returns 503 `unreachable` until the tunnel question is answered
- [x] slice 8b — "Ask AshHome" dashboard card is a real input. The system prompt lives with
      the feature (`src/features/ask/askAshHome.ts`), not the route, and tells the model to
      refuse rather than invent household data. Verified live: it declines to list or change
      the shopping list
- [~] controlled AI tool/action system — explicit functions only, never raw system access
      - [x] 9a read-only tools (`getShoppingList`, `getPantry`, `getMealPlan`) behind the
            `READ_ONLY_TOOLS` allow-list (ADR-015), with `/api/ai/ask` owning the loop.
            Verified against the real database: sixteen pantry rows returned correctly
            grouped, nothing invented, empty cases reported as empty
      - [x] 9b first write tool (`addShoppingItem`) behind a confirmation gate (ADR-018).
            `WRITE_TOOLS` is a sibling of `READ_ONLY_TOOLS`, not a member; the confirmation
            sentence is built server-side from validated arguments; `/api/ai/confirm` is the
            only path that executes, and it re-validates both tool name and arguments
      - [ ] more read tools where they earn it: household preferences, meal history, budget
- [x] confirmation gate for AI writes (ADR-018) — the pattern every later write tool inherits
- [ ] confirmation gate for the *other* sensitive actions once they exist (email, deletions,
      anything spending money)
- [x] multi-item proposals — one proposal carries every write call from the model turn; the
      dashboard lists each server-generated description behind one Add all / Cancel choice,
      and `/api/ai/confirm` validates the complete list before a batch write
- [ ] streaming responses (deliberately deferred; a whole answer is fine for a wall tablet)

## Stage 4 — Recipes, consumption learning, budget and specials — `[~]` IN PROGRESS

- [x] **pantry-to-recipe matching** (`src/domain/services/recipeMatch.ts`) — started here
      because most of the rest of the stage depends on it. Surfaced as the Tonight's meal
      card's missing-ingredient warning, which had been deferred since Phase 1
- [x] meal cost estimation — structured ingredient amounts augment legacy text; complete
      catalogue-priced totals appear in meal detail and on the wall dashboard (ADR-021)
- [x] meal feedback capture — meal detail records whole-family or named-member ratings and
      shows the three newest append-only entries
- [ ] recipe discovery/search, recipe import
- [ ] low-stock and staple-reorder prediction — `inventory_events` is already accumulating
      the history these need
- [x] weekly budget target — optional household setting persisted locally and in Postgres;
      shopping views show the current list estimate against it
- [ ] product alternatives, specials provider, waste/use-soon, notifications

*AshHome Phase 6.*

## Stage 5 — New World / supermarket trolley preparation — `[ ]` NOT STARTED

No autonomous purchasing, ever, without an explicit future request.

## Stage 6 — Hybrid cloud / cloud engineering evolution — `[ ]` NOT STARTED

*AshHome Phase 12.*

## Stage 7 — AshHome integration and smart-home features — `[ ]` NOT STARTED

*AshHome Phases 1, 11, 13, 14.*

- [ ] AshHome launcher/dashboard tile
- [ ] wall-tablet dashboard at `/dashboard` — one application, not a separate app
- [ ] kiosk/device configuration
- [ ] Home Assistant integration
- [ ] voice assistant

## Stage 8 — Kubernetes / advanced platform engineering — `[ ]` NOT STARTED

---

Do not automatically advance. Work one requested stage/phase at a time, and do not mark
anything complete until it works and has been verified.
