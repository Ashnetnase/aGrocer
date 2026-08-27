# AshHome / Agrocer — Roadmap

Statuses: `[ ]` not started · `[~]` in progress · `[x]` completed · `[!]` blocked

Detail, Definitions of Done and rationale live in `AGROCER_MASTER_PLAN.md`.
Current state of the code lives in `HANDOFF.md`.

> **Roadmap reconciliation — open decision.**
> `AGROCER_MASTER_PLAN.md` defines Agrocer **Stages 1–8**; `CLAUDE.md` defines AshHome
> **Phases 0–14**. They cover overlapping ground with different numbering. This file tracks the
> master plan's stages, since `CLAUDE.md` names it the source of truth, and maps the phases
> alongside. Where the two disagree, ask before proceeding.

---

## Phase 0 — Repository baseline, documentation and persistent handoff

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
- [ ] **Supabase project provisioned** (ADR-013) — blocks everything below
- [ ] migration applied and the 7 tables confirmed to exist
- [~] backend/API architecture — repositories done, route handlers still to come
- [~] persistent shopping lists — written, not wired, never run against a database
- [~] persistent pantry — written, not wired, never run against a database
- [~] persistent products — written, not wired, never run against a database
- [~] persistent meal plans — written, not wired, never run against a database
- [ ] authentication (Supabase Auth)
- [ ] household/user permissions (RLS as defence in depth)
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
