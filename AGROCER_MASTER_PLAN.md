# Agrocer — Master Project Plan

> **Purpose:** This file is the single source of truth for the Agrocer project.  
> Claude Code and Codex must read this file before making changes, keep work inside the current stage, and update the progress/status sections after completing meaningful work.

## 1. Project identity

**Product name:** Agrocer  
**Parent/home ecosystem:** AshHome  
**Type:** Mobile-first family grocery, pantry, meal planning, and future AI-assisted household food application  
**Primary household:** 2 adults + 3 children  
**Primary development machine:** Main Ryzen desktop using VS Code  
**Primary staging target:** Proxmox VM on the second Lenovo ThinkCentre node  
**Primary source control:** GitHub  
**Initial deployment model:** Homelab staging first, cloud later

### Magic Patterns design source

The Stage 1 visual design source of truth is:

https://www.magicpatterns.com/c/wcq3xgsyngrycyqffvyrmt/preview?hideToolbar=true&disableComments=true

The existing Magic Patterns UI should be preserved unless there is a clear usability, accessibility, responsiveness, or technical reason to change it.

---

## 2. Product vision

Agrocer should become a genuinely useful family application, not a demo dashboard.

The long-term goal is to help the family:

- decide what to cook
- plan meals for the week
- manage pantry inventory
- know what groceries are needed
- remember common/favourite products
- build and maintain shopping lists
- learn household food preferences
- track what is normally purchased and consumed
- suggest recipes and meals
- consider a household budget
- consider supermarket specials
- prepare a supermarket trolley for review
- eventually use AI agents/tools to help automate planning
- integrate into the wider AshHome family dashboard

Agrocer should remain simple enough that non-technical family members can use it comfortably.

---

## 3. Product principles

1. **Family utility first.** Build features that save time or reduce household friction.
2. **Mobile-first.** The main experience must work extremely well on a phone.
3. **Human approval for spending.** AI may prepare or suggest a trolley, but final checkout/payment remains a user action.
4. **Real data belongs in structured storage.** Do not rely on LLM memory for pantry, order history, products, preferences, budgets, or meal history.
5. **AI is an assistant, not the database.**
6. **Do not over-engineer early stages.**
7. **Preserve the Magic Patterns visual identity.**
8. **Use strong TypeScript types and validation.**
9. **Keep the codebase ready for a later API/PostgreSQL backend without rewriting the UI.**
10. **Homelab first, cloud where it adds real value.**
11. **Stage boundaries matter.** Do not implement future-stage features early without explicit approval.

---

## 4. Current generated UI inspection

Magic Patterns generated:

- Vite 5 SPA
- React 18
- TypeScript 5.5 strict
- Tailwind 3.4
- react-router-dom v6
- Framer Motion
- five main routes/screens:
  - Home
  - Pantry
  - Shopping
  - Meals
  - Products
- one large Agrocer context for state
- five reusable UI primitives
- six feature components
- domain types
- realistic NZ-focused mock data
- meal photos/assets
- a strong custom design system:
  - moss
  - clay
  - honey
  - berry
  - canvas
  - surface
  - ink
  - muted
  - line
  - Plus Jakarta Sans
  - custom radii/shadows

### What should be preserved

Preserve wherever practical:

- existing Tailwind design tokens
- screen JSX and visual hierarchy
- spacing and mobile interaction patterns
- BottomSheet animation feel
- StockChip
- QuantityStepper
- EmptyState
- Field/Search/ChipRow patterns
- PantryRow
- PantryItemSheet
- ShoppingRow
- ShoppingItemSheet
- MealPickerSheet
- MealDetailSheet
- NZ-flavoured demo data/copy
- Shopping Mode visual treatment

### Known gaps in generated UI

Not yet implemented:

- Next.js App Router
- Zod
- React Hook Form
- shadcn/Radix behaviour where useful
- Household screen
- Settings screen
- PWA manifest/service worker/offline shell
- persistence
- tests
- repository abstraction
- real date service
- production deployment
- backend/API/database
- AI
- supermarket integration

---

## 5. Target Stage 1 technical stack

### Frontend

- Next.js (current stable, App Router)
- React
- TypeScript
- Tailwind CSS
- Lucide
- Framer Motion where it preserves the current UX
- shadcn/ui selectively
- Radix primitives where accessibility/behaviour is needed
- React Hook Form
- Zod

### Stage 1 data

Use a repository abstraction with local/in-memory or localStorage-backed implementations.

Components should not import seed data directly.

Recommended approach:

- Zod schemas are the source of truth
- TypeScript types derive from `z.infer`
- repositories expose domain access
- localStorage-backed persistence is preferred for Stage 1
- a real backend will replace the repository implementation later

### Stage 1 deployment

Development:

- main Ryzen desktop
- VS Code
- Claude Code
- Codex
- GitHub

Staging:

- Ubuntu Server VM on Lenovo ThinkCentre Proxmox node
- Docker-based deployment later in Stage 1
- app remains available when the main desktop is off

---

## 6. Proposed target repository structure

```text
agrocer/
├─ app/
│  ├─ layout.tsx
│  ├─ manifest.ts
│  ├─ globals.css
│  ├─ (app)/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ pantry/page.tsx
│  │  ├─ shopping/
│  │  │  ├─ page.tsx
│  │  │  └─ mode/page.tsx
│  │  ├─ meals/page.tsx
│  │  ├─ products/page.tsx
│  │  ├─ household/page.tsx
│  │  └─ settings/page.tsx
│  └─ offline/page.tsx
│
├─ src/
│  ├─ domain/
│  │  ├─ schemas/
│  │  ├─ types.ts
│  │  └─ services/
│  ├─ data/
│  │  ├─ repositories/
│  │  ├─ local/
│  │  └─ seed/
│  ├─ features/
│  │  ├─ pantry/
│  │  ├─ shopping/
│  │  ├─ meals/
│  │  ├─ products/
│  │  └─ household/
│  ├─ components/
│  │  ├─ ui/
│  │  ├─ agrocer/
│  │  └─ layout/
│  ├─ providers/
│  └─ lib/
│
├─ public/
│  ├─ icons/
│  └─ meals/
│
├─ CLAUDE.md
├─ AGENTS.md
└─ AGROCER_MASTER_PLAN.md
```

---

# 7. Stage roadmap

## Stage 1 — Product foundation and usable manual PWA

**STATUS: IN PROGRESS**

### Goal

Create a polished, installable, manual-first Agrocer application that the family could actually use before AI is introduced.

### Included

- [x] Port Magic Patterns Vite app to Next.js App Router
- [x] Preserve visual design system
- [x] Fix mobile safe-area and viewport behaviour
- [x] Home dashboard
- [x] Pantry
- [x] Shopping list
- [x] Dedicated Shopping Mode route
- [x] Meals / weekly planner
- [x] Products / favourites
- [x] Household screen
- [x] Settings screen
- [x] Strong domain schemas with Zod
- [x] React Hook Form + Zod form validation
- [x] Repository abstraction
- [x] localStorage-backed Stage 1 persistence
- [x] Real date/week service
- [x] Accessible bottom sheets/dialogs
- [x] PWA manifest
- [x] PWA icons
- [x] Basic offline shell/service worker
- [x] Rename/organise meal assets
- [x] Lint clean
- [x] Typecheck clean
- [x] Production build clean
- [x] Basic tests for important domain logic
- [x] Meal creation/editing UI
- [ ] Remove the temporary `legacy/` Vite source once the port is signed off
- [ ] GitHub repository established
- [ ] Staging VM prepared
- [ ] Docker deployment to staging VM
- [ ] Open Agrocer from phone on the home network / secured URL
- [ ] Stage 1 acceptance review completed

### Stage 1 explicitly excludes

- AI chat
- autonomous agents
- OpenAI/Anthropic/Bedrock/Azure AI integration
- local Ollama/RTX AI dependency
- New World login/cart automation
- supermarket APIs
- supermarket specials
- predictive consumption
- barcode scanning
- receipt OCR
- voice assistant
- Home Assistant integration
- Kubernetes
- Argo CD
- production AWS/Azure architecture
- automated checkout/payment

### Stage 1 definition of done

The family can:

1. Open Agrocer on phone or desktop.
2. View the dashboard.
3. Manage pantry items.
4. Add/edit/remove/check shopping items.
5. Use Shopping Mode.
6. Maintain frequently purchased products.
7. Create/view meals.
8. Plan meals across a week.
9. Manage household members/preferences.
10. Refresh/reopen without losing Stage 1 data.
11. Install/use the PWA foundation.
12. Access the staging deployment.
13. Use the app without the main Ryzen PC being powered on.

---

## Stage 2 — Real backend and household data

**STATUS: NOT STARTED**

### Goal

Replace Stage 1 local persistence with a real backend and database while keeping the UI stable.

### Planned scope

- [ ] PostgreSQL
- [ ] backend/API architecture
- [ ] authentication
- [ ] household/user permissions
- [ ] persistent pantry
- [ ] persistent products
- [ ] persistent shopping lists
- [ ] persistent meal plans
- [ ] meal feedback history
- [ ] audit-friendly inventory events
- [ ] migrations
- [ ] backup/restore plan
- [ ] Docker Compose deployment
- [ ] CI checks
- [ ] staging deployment pipeline

### Not yet

No supermarket automation or autonomous AI agents unless the stage is explicitly expanded.

---

## Stage 3 — AI meal and grocery assistant

**STATUS: NOT STARTED**

### Goal

Add a controlled AI assistant that uses tools over Agrocer's structured data.

### Planned scope

- [ ] AI provider abstraction
- [ ] cloud AI fallback
- [ ] optional local AI when RTX desktop is on
- [ ] tool calling
- [ ] get pantry
- [ ] get household preferences
- [ ] get meal history
- [ ] get recipes
- [ ] get budget
- [ ] build/update shopping list
- [ ] meal suggestions
- [ ] weekly plan suggestions
- [ ] family feedback learning
- [ ] human confirmation for important actions
- [ ] cost controls
- [ ] prompt/evaluation tests

### Architecture principle

Use one orchestrator with tools first. Do not create many autonomous agents unless there is a proven need.

---

## Stage 4 — Recipes, consumption learning, budget and specials

**STATUS: NOT STARTED**

### Goal

Make Agrocer smarter using household history and external grocery information.

### Planned scope

- [ ] recipe discovery/search
- [ ] recipe import
- [ ] pantry-to-recipe matching
- [ ] consumption history
- [ ] low-stock prediction
- [ ] staple reorder prediction
- [ ] weekly budget target
- [ ] meal cost estimation
- [ ] product alternatives
- [ ] supermarket price/specials provider abstraction
- [ ] waste/use-soon recommendations
- [ ] notifications

---

## Stage 5 — New World / supermarket trolley preparation

**STATUS: NOT STARTED**

### Goal

Prepare a supermarket trolley for human review without autonomous payment.

### Planned scope

- [ ] `ShoppingProvider` abstraction
- [ ] manual provider
- [ ] New World provider
- [ ] product matching
- [ ] substitutions
- [ ] quantity reconciliation
- [ ] browser-assisted cart preparation if permitted/viable
- [ ] background job handling
- [ ] retry/error handling
- [ ] cart review
- [ ] user approval
- [ ] final checkout remains manual

### Safety/product rule

Agrocer must not autonomously spend household money or complete checkout without explicit user action.

---

## Stage 6 — Hybrid cloud / cloud engineering evolution

**STATUS: NOT STARTED**

### Goal

Use Agrocer as a strong real-world cloud engineering portfolio project.

### Possible AWS scope

- [ ] Terraform
- [ ] S3
- [ ] CloudFront
- [ ] API Gateway
- [ ] Lambda
- [ ] SQS
- [ ] EventBridge
- [ ] Secrets Manager
- [ ] CloudWatch
- [ ] Cognito
- [ ] Bedrock where useful
- [ ] backup/export strategy

### Hybrid model

Potential long-term model:

```text
Cloud frontend/API
        │
        ├── cloud AI
        ├── queues/events
        └── authentication
                │
                ▼
         homelab worker
                │
         supermarket tasks
```

Cloud adoption should be driven by reliability, learning value, and real product need — not by using every service available.

---

## Stage 7 — AshHome integration and smart-home features

**STATUS: NOT STARTED**

### Goal

Integrate Agrocer into the larger AshHome family dashboard.

Potential scope:

- [ ] AshHome launcher/dashboard tile
- [ ] family calendar context
- [ ] Home Assistant integration
- [ ] notifications
- [ ] kitchen display
- [ ] optional barcode station
- [ ] optional voice interaction
- [ ] pantry/smart-home sensors where genuinely useful

Agrocer remains its own product/app even when surfaced through AshHome.

---

## Stage 8 — Kubernetes / advanced platform engineering

**STATUS: NOT STARTED**

### Goal

Migrate selected services only after the product is stable and the homelab has enough RAM/resources.

Potential scope:

- [ ] K3s
- [ ] Helm
- [ ] Argo CD
- [ ] GitOps
- [ ] observability
- [ ] distributed deployment
- [ ] resilience testing

Do not introduce Kubernetes merely to make the project look complex.

---

# 8. Agent operating rules

These rules apply to Claude Code, Codex, and any future coding agent.

## Before starting any task

1. Read `AGROCER_MASTER_PLAN.md`.
2. Read `CLAUDE.md` or `AGENTS.md` as applicable.
3. Determine the current active stage.
4. Inspect the existing repository before proposing large changes.
5. Confirm the requested task belongs to the active stage.
6. Preserve the Magic Patterns design unless change is justified.

## During work

- Do not silently expand scope.
- Prefer small, reviewable changes.
- Keep the build working.
- Do not replace a good existing design just because another library has a default component.
- Do not introduce a dependency without a reason.
- Do not hard-code data that belongs in a repository/domain layer.
- Avoid `any`.
- Use schema validation at boundaries.
- Keep mobile usability first.
- Keep future backend replacement in mind.
- Never add autonomous spending/checkout behaviour.

## After meaningful work

Update this file:

- check off completed items with `[x]`
- update `STATUS`
- add a dated entry to the Progress Log
- record important architecture decisions
- record blockers
- record tests/build commands run
- do not mark an entire stage complete until its Definition of Done is satisfied

---

# 9. Progress log

Agents must append new entries at the top of this section.

## 2026-08-22 — Error and not-found boundaries (Claude Code)

**Stage:** Stage 1
**Status:** In progress

The app had no error or 404 handling, so a render failure or a stale link dropped the family
onto Next's default unstyled page — jarring in an installed PWA, which has no browser chrome
to explain it.

Completed:

- `MessageScreen`: the shared card behind every failure screen, so a failure never looks like
  it came from a different application
- `app/(app)/error.tsx`: render errors inside the shell, with retry and a route home
- `app/not-found.tsx`: styled 404
- `app/global-error.tsx`: last-resort boundary for root-layout failures. Deliberately
  dependency-free — no shared components, no icon library, no font variable — since whatever
  broke may be the thing those imports rely on
- `app/offline/page.tsx` refactored onto the shared card

All three failure screens state that data on the device is untouched. The instinct on seeing
an error screen is to assume the shopping list is gone.

Checks run:

- `npm run typecheck`, `npm run lint` — clean
- `npm run build` — clean
- served the production bundle and confirmed `/login` returns HTTP 404 with the styled page,
  and `/offline` renders

Not verified: `error.tsx` and `global-error.tsx` have not been triggered — doing so needs a
deliberately thrown render error. They are standard Next conventions and typecheck, but no
one has seen them on screen.

## 2026-08-22 — Accessibility pass (Claude Code)

**Stage:** Stage 1
**Status:** In progress

Audited the token palette against WCAG 2.1 AA and the screens for structural issues.
Six contrast failures found and fixed, plus three markup issues.

Contrast (ratios computed for the pairs actually used in the UI):

- `muted` `#6B7A72` → `#65736B`. Was 4.08:1 on canvas, failing AA for screen subtitles,
  section labels and input placeholders. Darkened 6% — the smallest change that clears
  4.5:1 — preserving hue and saturation.
- `honey.600` `#9C6F10` → `#92680F`. Was 4.05:1 on `honey-50`, failing for the "Low" stock
  chip and the pantry stat tile. Darkened 6.5% to reach 4.52:1.
- Meal placeholder icon moved from `moss-300` (1.95:1) to `moss-500` (4.41:1).

These are the only deviations from the Magic Patterns palette, and both are within a few
percent of the originals. ADR-001 permits changes that fix a real accessibility issue; the
measurements are recorded here so the decision is auditable.

Markup:

- Home had no `h1` — the page started at `h2`. The "Agrocer" wordmark is now the heading.
- Shopping Mode had the same problem; the "N left to grab" count is now its `h1`.
- `ShoppingRow` rendered the item details inside a *disabled* button in Shopping Mode,
  dropping the item name out of the tab order and presenting it as a dead control. The
  details are now plain content when the row is not editable.

Checks run:

- `npm run typecheck`, `npm run lint` — clean
- `npm run test` — 89 tests passing
- contrast re-audited after the changes: every text pair in use now passes AA

Not covered by this pass: focus-visible styling was not systematically reviewed, and no
screen-reader walkthrough has been done — both want a real device, and the app still cannot
be opened in a browser on this machine.

## 2026-08-22 — Repository layer test coverage (Claude Code)

**Stage:** Stage 1
**Status:** In progress

Context: the localStorage repository layer had no tests, despite backing Definition of Done
item 10 ("refresh/reopen without losing Stage 1 data") and being the exact component a Stage 2
backend replaces. Its contract is now pinned down before that swap happens.

Completed:

- `testStorage.ts`: an in-memory `localStorage` stand-in that can also simulate a full quota
- 23 repository tests covering:
  - seed fallback when nothing is stored, and no writes on a plain read
  - malformed JSON and schema-invalid stored data both falling back to the seed
  - a failed write (quota) not throwing into the UI
  - pantry stock rules applied through `adjustQuantity`, and unknown ids returning
    `undefined` rather than throwing
  - shopping merge-on-add, including case-insensitivity, not merging into an item already
    in the trolley, and merging repeats within a single `addMany` batch
  - meal delete also stripping the meal from the planner
  - household initials derived on add and re-derived on rename
  - settings merging rather than replacing on a partial update
  - `reset` clearing storage so the seed returns

Checks run:

- `npm run test` — 89 tests across 7 files, all passing
- `npm run typecheck`, `npm run lint` — clean
- mutation check: breaking merge-on-add in `localRepositories.ts` failed exactly the three
  tests that should catch it, confirming the new suite is not vacuous. Source restored after.

Blockers unchanged:

- Docker image still never built (Docker Desktop daemon not running)
- meals UI still never seen rendered (Chrome refusing all loopback connections on this machine)
- PWA install still needs an HTTPS origin for staging

## 2026-08-22 — Docker packaging and staging runbook (Claude Code)

**Stage:** Stage 1
**Status:** In progress — container defined and validated; VM provisioning is a manual step

Completed:

- `output: 'standalone'` in `next.config.ts` so the runtime image carries only traced dependencies
- multi-stage `Dockerfile` (deps / builder / runner) on `node:22-alpine`, running as non-root
  with a dependency-free healthcheck
- `.dockerignore` excluding `legacy/`, `.next`, `node_modules`, docs and env files
- `docker-compose.yml` for `agrocer-stg01`: one service, no database (Stage 1 data is local
  to each browser), 512 MB limit, log rotation
- `docs/staging.md`: VM sizing, Docker install, deploy/update commands, verification steps

Checks run:

- `npm run build` — clean, `.next/standalone/server.js` produced
- ran the standalone bundle directly with the Dockerfile's asset layout and confirmed 200 for
  `/`, `/meals`, `/manifest.webmanifest`, `/icons/icon-192.png`, `/sw.js` and a meal photo.
  This validates the image's COPY layout and CMD without the Docker daemon.
- `npm run typecheck`, `npm run lint` — clean

Blockers:

- `docker build` not executed: the Docker CLI is installed on the dev machine but the Docker
  Desktop daemon is not running. The image has never actually been built.
- **PWA install needs HTTPS.** A plain `http://<vm-address>:3000` origin is not a secure
  context, so the service worker will not register and no install prompt appears. Definition
  of Done item 11 ("install/use the PWA foundation") therefore cannot be met over plain HTTP
  on the LAN. `docs/staging.md` sets out the options; Tailscale looks like the least work.
  This needs a decision before the Stage 1 acceptance review.

## 2026-08-22 — Meal creation and editing (Claude Code)

**Stage:** Stage 1
**Status:** In progress — Definition of Done item 7 ("create/view meals") now satisfied

Completed:

- `MealFormSheet`: create/edit/delete a meal using the established BottomSheet + RHF/Zod pattern
- meal catalogue is now persisted and mutable through `MealsRepository` (`create`/`update`/`remove`)
- deleting a meal also strips it from the planner, so no dangling meal ids can remain
- creating happens from the meal picker via a dashed button, matching the existing
  "Plan dinner" affordance; editing via a pencil on each picker row
- two new form primitives: `FormChipMultiSelect` (meal tags) and `FormStringListField` (ingredients)
- `Meal.image` is now optional, with a new `MealImage` component rendering a token-based
  placeholder — Stage 1 has no upload, so family-created meals have no photo
- 5 new tests covering `removeMealFromPlan` and `countPlannedUses`

Checks run:

- `npm run test` — 66 tests, all passing
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run build` — clean, 11 routes prerendered

Blockers:

- browser verification of this feature could not be completed: Chrome began refusing all
  loopback connections mid-session (`ERR_CONNECTION_REFUSED` on ports 3000 and 3005) while
  `curl` returned 200 over both IPv4 and IPv6. An environment issue, not an application one,
  but the new meal sheet has not yet been seen rendered.

## 2026-08-22 — Next.js App Router migration (Claude Code)

**Stage:** Stage 1
**Status:** In progress — application work complete, deployment work outstanding

Completed:

- scaffolded Next.js 15 App Router project (React 19, TypeScript strict, Tailwind 3.4)
- moved the Magic Patterns Vite source to `legacy/` (kept for reference, excluded from tsconfig/ESLint)
- ported `tailwind.config.js` to `tailwind.config.ts` with the design tokens unchanged
- built the Zod domain layer (`src/domain/schemas`) with all types derived via `z.infer`
- built domain services: date/week, pantry stock rules, shopping totals/grouping, meal-to-list, household
- built the repository abstraction (`src/data/repositories/types.ts`) with a localStorage-backed
  implementation validated by Zod on every read
- ported all five screens without visual changes, plus new Household and Settings screens
- promoted Shopping Mode to its own route `/shopping/mode` (bottom nav hidden there)
- replaced six hand-rolled forms with React Hook Form + `zodResolver`
- rebuilt `BottomSheet` on Radix Dialog for focus trap, focus restore and scroll lock
- replaced `location.state` navigation with `?add=1` / `?filter=attention` search params
- added the PWA foundation: manifest route, generated icon set, offline page, service worker
- renamed the eight UUID meal photos to semantic paths under `public/meals/`
- added 61 unit tests across the domain services and the seed data

Checks run:

- `npm run test` — 61 tests, 6 files, all passing
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run build` — clean, 11 routes prerendered
- manual verification in Chrome: Home, Pantry (with sheet + Zod validation), Shopping,
  Shopping Mode, Meals, Household, Settings; localStorage persistence confirmed across a reload

Blockers:

- none for application work

Current next work:

1. establish the GitHub repository
2. prepare the `agrocer-stg01` staging VM
3. Docker deployment to staging
4. verify install/use from a phone on the home network
5. Stage 1 acceptance review, then remove `legacy/`

## 2026-08-21 — Initial project planning

**Stage:** Stage 1  
**Status:** In progress

Completed:

- Magic Patterns Stage 1 design generated
- Magic Patterns output inspected
- Vite/React/Tailwind architecture documented
- visual components identified for preservation
- migration target to Next.js App Router defined
- proposed repository architecture defined
- Stage 1 scope and future roadmap documented

Current next work:

1. scaffold/prepare Next.js App Router target
2. port design tokens and app shell
3. create Zod-backed domain models
4. port Stage 1 screens without redesigning them

---

# 10. Architecture decisions

## ADR-001 — Magic Patterns is the Stage 1 visual source of truth

**Status:** Accepted

The generated UI has a coherent visual language and useful mobile interaction patterns. Coding agents should integrate and improve it rather than independently redesigning the app.

## ADR-002 — Next.js App Router is the target frontend framework

**Status:** Accepted

The Magic Patterns Vite app is a prototype source, not the target production structure.

## ADR-003 — Repository abstraction before backend

**Status:** Accepted

Stage 1 uses local persistence behind repository interfaces. Later backend implementations should replace repositories without rewriting UI components.

## ADR-004 — localStorage persistence preferred for Stage 1

**Status:** Accepted

The Stage 1 demo should survive refresh/reopen and feel like a usable application.

## ADR-005 — Planner follows real dates by default

**Status:** Accepted

A date service may support a pinned demo date for screenshots/testing, but production/default behaviour should track the real current week.

## ADR-006 — shadcn/Radix used selectively

**Status:** Accepted

Use Radix/shadcn for behaviour/accessibility where needed, but preserve Agrocer's bespoke visual system and components.

## ADR-007 — Main desktop is development/GPU, not 24/7 production

**Status:** Accepted

The Ryzen/RTX desktop may be powered off. Staging/production services must not depend on it being online.

## ADR-009 — App content renders client-side behind a hydration gate

**Status:** Accepted

Every screen depends on two things the server cannot know: the family's localStorage data and the
device's current date. Server-rendering them would either cause hydration mismatches or flash seeded
demo data over the family's real list. The static chrome (canvas, bottom nav) still renders on the
server, and `HydrationGate` defers only the data-dependent content. When a real backend arrives in
Stage 2 the data becomes server-knowable and this gate can be reconsidered.

## ADR-010 — Shopping Mode is a route, not a flag

**Status:** Accepted

Shopping Mode was a boolean on the Magic Patterns context. As `/shopping/mode` it can be opened
directly, survives a refresh mid-shop, gets the phone's back button as a natural exit, and can be a
PWA shortcut. The visual treatment is unchanged.

## ADR-011 — Stage 1 keeps a hand-written service worker

**Status:** Accepted

The app's data already lives in localStorage, so the service worker only needs to keep the shell
openable offline. A ~60-line network-first worker does that without adding a build-time precache
dependency. Workbox/next-pwa can replace it later without changing app behaviour.

## ADR-008 — Homelab staging first

**Status:** Accepted

The second Lenovo ThinkCentre Proxmox node is the first staging target. AWS/Azure is introduced later where it creates real value.

---

# 11. Current decisions awaiting implementation

The following decisions are already approved unless explicitly changed:

- ~~Fresh Next.js scaffold/port is preferred over mutating the Vite app in place.~~ Done 2026-08-22.
- Keep the Vite source temporarily during the port until the new implementation is verified.
  Now at `legacy/`; delete after the Stage 1 acceptance review.
- ~~Use localStorage-backed persistence for Stage 1.~~ Done 2026-08-22.
- ~~Use real current dates by default, with optional pinned demo date support.~~ Done 2026-08-22 —
  the pinned date is a household setting on the Settings screen.
- ~~Shopping Mode should become a real route.~~ Done 2026-08-22 (`/shopping/mode`).
- ~~Household and Settings should be added in Stage 1.~~ Done 2026-08-22.
- ~~PWA foundation belongs in Stage 1.~~ Done 2026-08-22.
- Stage 1 staging runs on the second ThinkCentre node.

---

# 12. Suggested staging VM

**Name:** `agrocer-stg01`

Initial sizing:

- Ubuntu Server 24.04 LTS
- 2 vCPU
- 3 GB RAM initially
- 60 GB disk
- network on appropriate Server/Dev VLAN
- Docker installed when deployment work begins

The VM is a staging/deployment target, not the primary coding environment.

---

# 13. What success looks like

Agrocer should eventually demonstrate:

- real family use
- strong UX
- software engineering
- TypeScript/React/Next.js
- domain modelling
- databases
- APIs
- CI/CD
- containers
- homelab operations
- cloud engineering
- infrastructure as code
- observability
- security
- AI/tool calling
- safe human-in-the-loop automation
- hybrid cloud
- optional smart-home integration

The objective is not to collect technologies. The objective is to build a useful family product and use the right technologies to make it reliable, maintainable, and increasingly intelligent.
