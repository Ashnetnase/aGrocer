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
- [ ] Phase 6 — recipe providers and family recipes
- [~] Phase 7 — meals, meal planning and grocery budgeting *(planning done, budgeting not)*
- [~] Phase 8 — local Ollama AI service *(connectivity proven by `npm run ai:check`; no
      service, provider abstraction or tool calling exists)*
- [ ] Phase 9 — controlled AI tool/action system
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
- [x] Ask AshHome — placeholder
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
- [ ] authentication (Supabase Auth) — **the next task**, and it must land with RLS
- [!] **RLS is disabled on all 7 tables** — anyone with the anon key can read or write every
      row. Tables are empty so nothing is exposed yet, but this must close before any real
      family data is entered. Enabling RLS without policies blocks all access, so it ships
      with authentication, not before
- [ ] meal feedback history
- [ ] audit-friendly inventory events
- [ ] backup/restore plan
- [ ] Docker Compose deployment
- [ ] CI checks
- [ ] staging deployment pipeline

Inherited from Stage 1 (ADR-012) — provisioning, not build work:

- [ ] provision the `agrocer-stg01` VM (spec in master plan section 12)
- [ ] deploy the existing `agrocer:stage1` image via `docker compose up -d --build`
- [!] **decide the HTTPS approach** — Tailscale, Caddy with an internal CA, or a real domain.
      Blocks PWA install: a LAN address over plain HTTP is not a secure context, so the service
      worker will not register. `docs/staging.md` compares the options; Tailscale recommended.
- [ ] open Agrocer from a phone on the home network and install it
- [ ] confirm it stays reachable with the Ryzen desktop powered off (ADR-007)

## Stage 3 — AI meal and grocery assistant — `[ ]` NOT STARTED

*AshHome Phases 7–8.*

- [ ] backend AI service abstraction (provider-agnostic — Ollama first, cloud fallback optional)
- [ ] local Ollama service over the LAN (RTX 5070 machine)
- [ ] controlled AI tool/action system — explicit functions only, never raw system access
- [ ] confirmation gate for sensitive actions (email, deletions, anything spending money)

## Stage 4 — Recipes, consumption learning, budget and specials — `[ ]` NOT STARTED

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
