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

**STATUS: COMPLETE (2026-08-22)** — dev-complete milestone. Definition of done items 12 and 13
were explicitly waived by Ash and the staging work moved into Stage 2 (ADR-012).

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
- [x] Remove the temporary `legacy/` Vite source once the port is signed off
- [x] GitHub repository established
- [x] Stage 1 acceptance review completed — app opened and confirmed working by Ash, 2026-08-22

Moved to Stage 2 (ADR-012), as deployment rather than product work:

- ~~Staging VM prepared~~
- ~~Docker deployment to staging VM~~
- ~~Open Agrocer from phone on the home network / secured URL~~

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
12. ~~Access the staging deployment.~~ **Waived 2026-08-22**, moved to Stage 2.
13. ~~Use the app without the main Ryzen PC being powered on.~~ **Waived 2026-08-22**, moved to Stage 2.

Items 1–11 are satisfied. Items 12 and 13 describe deployment rather than product, and Stage 2
already owns Docker Compose deployment and the staging pipeline — see ADR-012.

Note on item 11: `http://localhost` is a secure context, so the PWA installs from a production
build or the container on the development machine. A LAN address over plain HTTP is *not* a
secure context, which is why installing from a phone waits on the HTTPS decision in Stage 2.

---

## Stage 2 — Real backend and household data

**STATUS: IN PROGRESS (started 2026-08-23)**

### Goal

Replace Stage 1 local persistence with a real backend and database while keeping the UI stable.

### Planned scope

- [x] Supabase project provisioned (managed PostgreSQL — ADR-013) — `agrocer` /
      `ojlzjjvrtnslcxqdmpay`, ap-southeast-2; schema applied, 7 tables confirmed
- [x] Drizzle schema and migrations — 7 tables, `drizzle/0000_mysterious_black_cat.sql`,
      plus `0001_exotic_the_liberteens.sql` (RLS)
- [x] backend/API architecture — route handlers for all five features
- [ ] authentication (Supabase Auth) — **the next task**
- [x] RLS enabled on all 7 tables, deny-all (ADR-016). Closes the publishable-key exposure;
      verified with `npm run db:rls`. Policies wait for auth, which is when they mean something
- [ ] household/user permissions — the policies themselves, once there is a user to grant to
- [x] persistent pantry — route handlers + HTTP repository, verified end to end
- [x] persistent products — route handlers + HTTP repository, verified end to end
- [x] persistent shopping lists — route handlers + HTTP repository, verified end to end
- [x] persistent meal plans — route handlers + HTTP repository, verified end to end
- [ ] meal feedback history
- [ ] audit-friendly inventory events
- [ ] migrations
- [ ] backup/restore plan
- [ ] Docker Compose deployment
- [ ] CI checks
- [ ] staging deployment pipeline

Inherited from Stage 1 (ADR-012) — the container and runbook already exist, so this is
provisioning rather than build work:

- [ ] provision the `agrocer-stg01` VM (spec in section 12)
- [ ] deploy the existing `agrocer:stage1` image via `docker compose up -d --build`
- [ ] **decide the HTTPS approach** — Tailscale, Caddy with an internal CA, or a real domain.
      A LAN address over plain HTTP is not a secure context, so without this the service
      worker will not register and the PWA cannot be installed on a phone. `docs/staging.md`
      compares the options; Tailscale is the standing recommendation.
- [ ] open Agrocer from a phone on the home network and install it
- [ ] confirm it stays reachable with the Ryzen desktop powered off (ADR-007)

### Not yet

No supermarket automation or autonomous AI agents unless the stage is explicitly expanded.

---

## Stage 3 — AI meal and grocery assistant

**STATUS: IN PROGRESS** — slices 8a, 8b and 9a landed 2026-08-28/29 (the provider abstraction,
the AI service route, the wall dashboard's "Ask AshHome" card, and the read-only tool system).
Deliberately sliced: see the progress log entries for the ladder. The next rung, 9b's first
write tool, is gated on Auth + RLS.

### Goal

Add a controlled AI assistant that uses tools over Agrocer's structured data.

### Planned scope

- [x] AI provider abstraction — `src/ai/types.ts`, `src/ai/provider.ts`
- [ ] cloud AI fallback — the seam exists (`AI_PROVIDER`), no implementation
- [x] optional local AI when RTX desktop is on — `src/ai/ollamaProvider.ts`, `/api/ai/chat`
- [x] a family-facing entry point — "Ask AshHome" on the wall dashboard (slice 8b)
- [x] tool calling — an orchestrator with an explicit allow-list (slice 9a)
- [x] get pantry — `getPantry`
- [x] get the shopping list — `getShoppingList`
- [x] get the meal plan — `getMealPlan`
- [ ] get household preferences
- [ ] get meal history
- [ ] get recipes
- [ ] get budget
- [ ] build/update shopping list — **slice 9b, and it needs Auth + RLS first**
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
- [ ] ~~Cognito~~ — redundant while Supabase Auth owns identity (ADR-013); revisit only if Agrocer leaves Supabase
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

## 2026-08-29 — Read-only AI tools: the assistant can see the household data (Claude Code)

**Stage:** Stage 3 / AshHome Phase 9, slice 9a
**Status:** Complete and verified; slice 9b (the first write tool) not started, and gated

Third rung of the ladder. The assistant that had to refuse every question about the family's
own data can now answer three of them from Postgres.

**Shape, and why.** `CLAUDE.md` requires that the LLM never get unrestricted access and act
only through explicitly defined application functions. So:

- `src/ai/tools/registry.ts` is the boundary. Lookup is by exact name against a fixed record —
  no dynamic dispatch, nothing that maps a model-supplied string onto a repository method. A
  name that is not in the record is refused.
- `src/ai/tools/readOnly.ts` holds the three tools and the `READ_ONLY_TOOLS` allow-list.
- `src/ai/assistant.ts` is the loop: one orchestrator with tools, which is the architecture
  principle this stage already committed to, not a swarm of agents.
- `app/api/ai/ask` is the only route that reaches household data with a model attached.
  `/api/ai/chat` stays what it was: a transport with no prompt, no tools and no data.

**Three decisions that carry most of the safety.**

1. **Every tool takes no arguments.** Nothing the model emits can widen what a tool reads, so
   there is nothing to validate beyond the name. When a tool eventually needs arguments it
   validates them with Zod in the registry before the implementation sees them.
2. **Tools return prose, not JSON.** Fewer tokens, and a small local model reads it more
   reliably — it does not have to infer that `checked: true` means already in the trolley.
   Ids, per-item prices and notes are withheld: the model is answering a question, not
   reconstructing the database, and every field handed over is a field it can garble.
3. **A refusal goes back to the model as an ordinary tool result, not an exception.** The
   model then explains the limit to the family in its own words instead of the whole question
   failing with an error card. It is still logged.

The loop caps at three tool rounds and withholds the tools on the final round, which is what
forces an answer — a model still offered tools it cannot use will keep asking for them.
Temperature is 0.2: these are household facts, not creative writing.

**Verified against the real database**, not fixtures. Asked "what is in our pantry?", the
assistant called `getPantry` and returned all sixteen rows correctly grouped — the eight
`good` items, the six `low`/`soon` items and the two `out` items matched the table exactly,
with nothing invented. "What can I cook tonight?" called `getPantry` and `getMealPlan` and
suggested only things actually in stock. The empty cases are honest too: an empty shopping
list is reported as empty rather than filled in. Asked to add bread and milk, it declined and
pointed at the app. Asked about the kids' plans tomorrow, it said it cannot see the calendar.
Answers took 0.2–1.3s.

**The card changed with it.** The example chips are now the master-plan questions that 9a
makes true, and the footnote says what is true today: it can read the list, pantry and meal
plan; it cannot change anything, and cannot see the calendar, chores or school. An answer that
came from a tool is labelled — "Checked your pantry" — so a family can tell their own data
from the model's general knowledge at a glance. That label was first placed under the answer
and moved to sit beside the question: under a 60-word answer on a short card it fell below the
fold, and a provenance line you have to scroll to find is not one.

**Where the honesty rules moved.** Slice 8b kept the system prompt on the client. It now names
tools that only exist server-side, so it moved to `src/ai/assistant.ts` — a prompt that
describes tools has to live where the tools do, or the two drift apart.

**Verified.** `npm run check` — 165 tests across 12 files (was 136/10). The new ones cover the
allow-list refusing an unknown tool, a failing tool not leaking its connection string, each
tool's output including its empty case, a planned meal that no longer exists being dropped
rather than named, and the loop's round cap. `npm run build` clean.

## 2026-08-28 — "Ask AshHome" becomes a real input on the wall dashboard (Claude Code)

**Stage:** Stage 3 / AshHome Phase 8, slice 8b
**Status:** Complete and verified; slice 9a (read-only tools) not started

Second slice of the ladder recorded in the 8a entry below. The dashboard card that described
an AI area now is one: a question goes to `/api/ai/chat`, and the answer comes back from the
local qwen3:8b on the RTX 5070.

**The honesty problem this slice had to solve.** The model still has no tools, so it cannot see
the shopping list, the pantry, the meal plan or the calendar, and it cannot change anything. A
kitchen-wall assistant that *appears* to know what is in the freezer, and is guessing, is worse
than no assistant at all — and `CLAUDE.md` already forbids the AI inventing school dates for
exactly this reason. So the limit is stated three times over, in three places that each catch a
different reader:

1. **The system prompt** (`ASK_SYSTEM_PROMPT`) tells the model it has no access to the family's
   data, that it must say so plainly rather than guess, and that it cannot add or change
   anything. Verified live: "What is on our shopping list right now, and add bread to it?" was
   answered "I cannot see your shopping list yet. Please open the Agrocer app to view or
   update your list." — no invented items, no pretended write.
2. **A footnote on the card**, so a family member reads the same limit without asking.
3. **The example chips** are only questions this slice can honestly answer (cooking and
   household). The master plan's "Add milk to shopping" and "What are the kids doing tomorrow?"
   examples were deliberately removed until Phase 9 makes them true — inviting a question the
   assistant must refuse is a poor introduction to it.

**Other decisions worth keeping.**

- **The system prompt lives with the feature, not the route.** `/api/ai/chat` injects nothing
  on purpose, so each caller owns its own framing. The prompt is not a secret and not a
  security boundary — it ships in the client bundle and the route accepts arbitrary messages
  anyway. The security boundary is that there are no tools.
- **No conversation history.** Each question stands alone. A shared tablet in a family room
  should not accumulate a transcript nobody chose to keep, and the application owns anything
  worth remembering — not the model.
- **Failures are sentences, not status codes.** `describeAskFailure` maps the route's `kind` to
  something a person can act on: `unreachable` becomes "The assistant is offline. It runs on
  the home PC — check that is on", with a Try again button. A non-retryable failure gets no
  button. No status code, hostname or stack trace can reach the wall.
- `DashboardCard` gained a `note` prop. "Placeholder" would now be a lie on this card, and
  saying nothing would overstate it; a real-but-limited card needed its own footnote.
- The card was moved out of `PlaceholderCards.tsx` into its own `AskCard.tsx`, which is the
  file that stopped being a placeholder.

**Verified.** `npm run check` — 136 tests across 10 files (was 124/9); the 12 new ones cover the
prompt's guarantees, that no history is sent, and that every failure arrives as a readable
sentence with nothing leaked. `npm run build` clean; `/dashboard` grew 3.05 kB → 5.04 kB. In
Chrome at a real 1280×800 kiosk viewport: an example chip returned a mince-and-rice answer, a
typed question about the shopping list was refused correctly, the answer area scrolls inside
its own card while the input stays pinned and the page itself still does not scroll, and no
console errors or hydration warnings appeared. With `OLLAMA_BASE_URL` pointed at a dead port,
the card showed the offline sentence and its Try again button.

**One trap, twice.** A dev server started after `npm run build` serves a stale `.next`, *and*
the Stage 1 service worker (ADR-011) serves a cached bundle — so the dashboard rendered the old
card twice over while the new one was already on disk. Delete `.next`, and unregister the
service worker in DevTools, before believing a dashboard change did not work.

**Not re-verified:** the Ask card at a phone-width viewport. The browser tooling would not
resize below the desktop width this session. The layout is a wrapping example list above a
flex row, so the risk is low, but it is unchecked.

## 2026-08-28 — AI provider abstraction and the `/api/ai/chat` service (Claude Code)

**Stage:** Stage 3 / AshHome Phase 8, slice 8a only
**Status:** Complete and verified; slice 8b not started

Ash asked to bring the AI in "in stages". This is the first slice, chosen to be the largest
step that changes nothing a family member can see and touches no household data.

**The ladder that was agreed**, smallest first, so a later session knows where this sits:

| Slice | Scope | Gate |
| ----- | ----- | ---- |
| 8a | provider abstraction + `/api/ai/chat`, no tools, no writes | none — landed |
| 8b | "Ask AshHome" dashboard card becomes a real input, text answers only | none |
| 9a | read-only tools: `getShoppingList`, `getPantry`, `getMealPlan` | none |
| 9b | first write tool `addShoppingItem`, behind a confirmation gate | **wants Auth + RLS first** |
| 10 | pantry-aware meal planning | after 9b |

**What landed.**

- `src/ai/types.ts` — `AiProvider`, `AiMessage`, `AiChatRequest`, `AiChatResult`, `AiHealth`,
  and `AiError` with a `kind` of `unreachable | modelMissing | timeout | upstream | config`.
  Every error carries both a detailed `message` for the server log and a `publicMessage` safe
  to show a user, the same split the data routes already make.
- `src/ai/ollamaProvider.ts` — the only Ollama-shaped code in the repository. Keeps
  `stream: false` and `think: false` from the spike, for the same reasons, and discards the
  `thinking` scratchpad rather than letting it reach a caller.
- `src/ai/provider.ts` — `getAiProvider()`, the single place a provider is chosen. Reads
  `AI_PROVIDER` (defaults `ollama`) and caches across hot reloads exactly as `src/db/client.ts`
  does. A cloud fallback is added here and nowhere else.
- `app/api/ai/chat/route.ts` — `GET` for health, `POST` for one answer. Accepts either
  `{ prompt }` or `{ messages }`, bounded at 20 messages of 4,000 characters so one request
  cannot pin the GPU. `AiErrorKind` maps to 503/504/502 so a caller can tell a misconfigured
  server from a slow one without being told the address.
- `scripts/ai-chat.ts` + `npm run ai:chat` — the end-to-end check, over the route rather than
  straight to Ollama, which is what distinguishes it from `npm run ai:check`.

**What it deliberately does not do**, and must not grow by accident:

- **No tools.** The model cannot read or write one row of household data. That is Phase 9, and
  it arrives as an explicit allow-list of application functions, per `CLAUDE.md`.
- **No system prompt injection.** The route is a transport; the assistant's framing belongs to
  the feature that calls it. This keeps 8b free to own the personality.
- **No persistence.** The application owns permanent state, not the model.
- **No streaming.** A whole answer is fine for a wall tablet, and a streaming reader is more
  to misread. Revisit when a long answer actually feels slow.

**Ollama still binds to localhost**, unchanged. So `/api/ai/chat` only works when the app runs
on this workstation; from the staging VM it will return 503 `unreachable` until the tunnel
question is answered. That is the correct failure, not a bug.

**Verified.** `npm run check` — 124 tests, up from 112; the 12 new ones mock `fetch` and pin
the classification of every failure path plus the discarding of the scratchpad. `npm run build`
clean, `/api/ai/chat` dynamic, every screen still statically prerendered, so no server-only
module leaked into a client bundle. Against real Ollama: health reported 0.33.1 with
`qwen3:8b` ready, a prompt answered in 3.9s, the `{ messages }` form honoured a system message,
and the three validation failures (empty body, blank prompt, non-JSON) each returned 400.
Pointing `OLLAMA_BASE_URL` at a dead port returned 503 `unreachable` with the address absent
from the response body and present in the server log.

One incidental fix: a dev server started immediately after `npm run build` serves a stale
`.next` and answers HTML. The script now says so instead of failing on a JSON syntax error.

## 2026-08-27 — Local Ollama connectivity proven (Claude Code)

**Stage:** a spike ahead of the AI phases, explicitly scoped by Ash to connectivity only
**Status:** Complete; no follow-on work started

Added `scripts/ollama-check.ts` and `npm run ai:check`. It reads `OLLAMA_BASE_URL` and
`OLLAMA_MODEL` (documented in `.env.example`, defaults `http://127.0.0.1:11434` and
`qwen3:8b`), checks `/api/version`, confirms the model is installed via `/api/tags`, sends one
prompt to `/api/chat`, and prints the answer.

Result: Ollama 0.33.1 reachable, `qwen3:8b` present alongside `qwen3:4b`, and an 849-token
answer to "three budget-friendly dinner ideas for a family of five using common New Zealand
supermarket ingredients" returned in 9.8 seconds on the RTX 5070.

Choices worth recording:

- `stream: false` — this proves reachability, and a streaming reader is more moving parts to
  misread. Streaming belongs with the real service.
- `think: false` — qwen3 is a reasoning model and its scratchpad tripled the wait for nothing
  here. Ollama returns it in a separate `thinking` field, which the schema tolerates.
- Errors name their likely cause. `fetch` reports every network failure as an identical opaque
  "fetch failed", so the script spells out the possibilities rather than leaving the reader to
  guess. Both failure paths were exercised: a wrong port, and an uninstalled model.
- It follows the `seed.ts` pattern of reading `.env.local` directly rather than adding dotenv,
  and validates responses with Zod like the rest of the codebase.

**Ollama stays bound to localhost.** That was Ash's explicit instruction and it is the right
default. It does mean the check only works from this workstation, and that reaching Ollama from
the staging VM is a separate decision later — a tunnel or an authenticated proxy, never
`OLLAMA_HOST=0.0.0.0`.

Nothing in the application imports this script. No provider abstraction, tool calling, cloud
provider, vector store or agent framework was added, per the scope restriction.

## 2026-08-27 — Kids/school roadmap recorded and the Phase 1 wall dashboard built (Claude Code)

**Stage:** Stage 2 for the data; the dashboard is AshHome Phase 1
**Status:** In progress

Ash supplied a large scope addition: a first-class Kids/School module, Hero school integration,
a school-notification abstraction, a family calendar, detailed wall-dashboard requirements, and
a replacement roadmap of Phases 0–17. All of it is now recorded in `CLAUDE.md`, including the
hard rules for Hero — no scraping authenticated pages, no stored credentials, no working around
its security controls — and the least-data principle for children's information.

Built the Phase 1 dashboard at `/dashboard`:

- Its own full-screen layout rather than the `(app)` shell, which is a phone-width column with a
  bottom nav — exactly wrong on a wall-mounted tablet.
- Seven cards in the required information hierarchy. Shopping and Tonight's meal use real data;
  Kids shows the household's actual children; Family schedule, Reminders, Chores and Ask
  AshHome are labelled placeholders. Every placeholder says so in the UI, because an unlabelled
  example chore on a kitchen wall is indistinguishable from a real one.
- Shopping items are checkable directly from the wall, through the same repository the phone
  uses. Verified: a tap on the dashboard changed the row in Supabase.
- Quick-add opens the full shopping screen rather than putting a half-working keyboard on the
  wall. The card's own add control belongs here eventually.

Layout work worth recording, since it is the part that took the iterations: at 1280×800 — a real
kiosk viewport — the page must not scroll, and cards must not clip. Equal-height rows clipped
the shopping list; letting rows size to content gave mock chores more of the wall than the real
list. The answer was proportional rows, with the shopping row roughly twice the height of the
placeholder rows, cards that scroll inside their own frame, and trimming explanatory prose from
the placeholder cards. Confirmed: no page scroll, no clipped card.

Deliberately not built: approximate cost and the missing-ingredient warning on Tonight's meal.
Both need ingredient-level matching against products and pantry, which belongs with the recipe
work. A wrong number on the kitchen wall is worse than no number.

Verification: typecheck, lint, 112 unit tests, clean production build with `/dashboard`
prerendered at 3.05 kB. Demo data used for the screenshots was removed afterwards; the database
is back to its seeded state.

## 2026-08-27 — Products and household converted; all five features now on Postgres (Claude Code)

**Stage:** Stage 2
**Status:** In progress

The data migration is complete. Every feature reads and writes Supabase through route handlers.

- `app/api/products` — read-only as a collection, because the contract has no create method.
  A speculative POST would have hidden a real gap: `npm run db:seed` is still the only way
  products reach Postgres, and Stage 2 should close that deliberately.
- `app/api/products/[id]` — favouriting is a toggle rather than `{ favourite: boolean }`, for
  the same reason the shopping check is: the repository owns the flip, so two taps cannot race.
- `app/api/household` — settings, with members as a sub-collection. The contract treats them as
  one aggregate, but they change for different reasons and on different screens.
- Member initials are derived server-side from the name rather than accepted from the client,
  so they cannot drift.
- `src/data/api/repositories.ts` now exports `apiRepositories` — deliberately not
  `serverRepositories`, which already names the Drizzle-backed set in `src/server/`.

**A regression the conversion exposed**, found during browser verification and fixed: the
shopping badge in the bottom nav was counting Stage 1 demo items. `AgrocerProvider` seeds
`initialState` with the demo fixtures, and the screens gate on `hydrated` while the badge did
not. Against localStorage that window was imperceptible; over the network it is long enough to
show a badge for groceries the family does not have. The badge now waits for `hydrated`. The
underlying seeding of `initialState` is untouched and recorded in `HANDOFF.md` — every screen
still shows demo data for that first frame, which is worth revisiting.

Verification: typecheck, lint, 112 unit tests, 6 integration tests, clean production build with
all twelve API routes dynamic and every screen still prerendered. Both APIs were exercised
directly — favourite toggled and restored, a 404 on an unknown product, settings patched and
restored, a member created with derived initials, replaced, and deleted, plus 400s on an empty
patch and an invalid colour. Then in Chrome: products rendered from Postgres with the "in
pantry" cross-reference working across two server-backed features, starring a product
persisted, and the household screen rendered its five members.

The database was left exactly as seeded: shopping 0, pantry 16, meals 8, products 16 with 8
favourites, 5 members, empty plan.

## 2026-08-27 — Meals and the weekly plan converted to Postgres (Claude Code)

**Stage:** Stage 2
**Status:** In progress

Third of five features. Meals was the awkward one: a single repository covers both the meal
catalogue and the weekly plan, which are different resources.

- `app/api/meals` — the catalogue. `PUT` rather than `PATCH` on `[id]`, because the contract
  replaces a whole draft: the meal form edits every field at once, so a partial update would
  be a shape the UI never sends.
- `app/api/meals/plan` and `app/api/meals/plan/[day]/[slot]` — the plan, with each slot
  addressable. A slot is a real place: Wednesday dinner exists whether or not anything is
  planned for it. Both verbs return the whole plan, which is what the contract promises and
  what the planner re-renders. `/api/meals/plan` cannot be shadowed by a meal id, because
  Next.js matches static segments before dynamic ones.
- `day` and `slot` arrive in the URL and are validated as strictly as any body, so an unknown
  day is a 400 rather than a query that quietly matches nothing.
- `clear` returns the updated plan rather than a 204: the caller needs it, and a second round
  trip to fetch what the server just computed would be waste.

Verification: typecheck, lint, 112 unit tests, 6 integration tests, clean production build with
all four meals routes dynamic. The API was exercised directly — create, replace, a 400 on an
invalid meal, a 404 on an unknown id, assign, clear, and 400s on an unknown day and an unknown
slot. The cascade was confirmed the same way: a meal assigned to Thursday dinner and then
deleted left the plan empty, with no orphaned slot. Then in Chrome: the planner rendered the
week with today marked, the picker listed the eight seeded meals, and choosing one for
Wednesday persisted to Supabase.

Test residue was cleaned up afterwards; the household is back to its seeded state. One row was
found on the shopping list that had not been created deliberately — the Home and Products
screens both have one-tap "add to shopping" actions, so a stray click during an earlier browser
check is the likely cause. It was deleted. Worth remembering that browser verification against
the real database can write through those shortcuts.

## 2026-08-27 — Pantry converted to Postgres (Claude Code)

**Stage:** Stage 2
**Status:** In progress

The pantry now follows the shopping list onto the database. Second of five features.

- `app/api/pantry` and `app/api/pantry/[id]` — list/create, edit/adjust/remove. No batch add:
  the pantry has no equivalent of adding a meal's ingredients at once, so a route taking an
  array would have been speculative.
- Quantity steps are **relative** — `PATCH { adjust: n }`, not an absolute quantity — so the
  server floors at zero in one statement and two people looking at the same shelf cannot
  clobber each other with read-modify-write. A zero adjustment is a 400.
- `src/data/api/client.ts` — extracted the fetch plumbing the shopping repository had inline,
  now shared by both. `patch()` returns `undefined` on a 404 because that is what the contracts
  mean by "no such id"; only real failures throw.
- Renamed the flag `NEXT_PUBLIC_AGROCER_SERVER_SHOPPING` to `NEXT_PUBLIC_AGROCER_SERVER_DATA`,
  since it now governs two features and will govern five. One flag rather than one per feature:
  per-feature flags would multiply the combinations needing testing without buying anything,
  as they share a single database.

Verification: typecheck, lint, 112 unit tests, 6 integration tests, clean production build with
both API route groups dynamic. The pantry API was exercised directly — create, adjust down,
the floor at zero, an edit, a 400 on a zero adjustment, a 404 on an unknown id, delete — and
then in Chrome: all 16 seeded items rendered with their stock chips, and stepping Bananas up
persisted to Supabase. The seeded quantity was restored and the test row deleted afterwards.

## 2026-08-27 — Shopping list vertical slice over Postgres (Claude Code)

**Stage:** Stage 2
**Status:** In progress

The shopping list now reads and writes Supabase through route handlers. One feature, end to
end, rather than a half-converted app.

Added:

- `scripts/seed.ts` and `npm run db:seed` — seeds one household, its members, products, pantry
  and meals from the Stage 1 demo data. Idempotent by household name. It exists as a script
  because `reset()` is refused against a shared database, and because the products contract has
  no create method. The weekly plan is not seeded: `planSeed` references Stage 1 meal ids that
  do not survive the insert, and an empty planner is more honest than a broken one.
- `src/server/repositories.ts` — resolves `householdId` from `AGROCER_HOUSEHOLD_ID`. A
  deliberate stand-in for authentication, and the single place that changes when auth lands.
- `src/server/http.ts` — `parseJson` validates bodies with the same Zod schemas the forms use,
  because a route handler is a public edge. Failures log server-side and return a generic
  message, so a connection string or household id never reaches a browser.
- `app/api/shopping/**` — list/add/batch-add, edit/toggle/remove, and clear-checked. Toggle is
  a `PATCH { toggle: true }` rather than its own route: same resource, and the repository owns
  what "toggled" means.
- `src/data/api/shoppingRepository.ts` — the same contract over HTTP. The server is
  authoritative on every write, which is what keeps the quantity merge honest.
- `src/data/api/repositories.ts` — composes server-backed shopping with localStorage for
  everything else. Possible only because both sides satisfy ADR-003, and it makes each
  feature's switch-over independently reversible.

Changed:

- `AgrocerProvider` takes its default repositories from the environment. No other provider
  change was needed — it was already async with refresh-after-write, so ADR-003 paid off
  exactly as intended.

Verification: typecheck, lint, 112 unit tests, 6 integration tests, and a clean production
build with all three API routes dynamic and every screen still prerendered. The API was
exercised directly (including the merge, a 400 on an invalid body, a 404 on an unknown id) and
then in Chrome: items created through the API rendered on the shopping screen, and toggling one
in the UI persisted to Supabase. Test rows were deleted afterwards.

Two deliberate omissions, recorded before the pattern is repeated five more times: every write
refetches the whole list, which was free against localStorage and is now a round trip to
Sydney; and there is no optimistic UI, so a toggle feels slower than Stage 1 did.

New dependency: `tsx` (dev-only), to run TypeScript scripts that use the `@/` path alias.
`node --experimental-strip-types` cannot resolve that alias, and hand-rolling a resolver hook
is more fragile than the standard runner. Seeding, backup/restore and later data migrations all
need it.

## 2026-08-27 — Database connected and repositories proven (Claude Code)

**Stage:** Stage 2
**Status:** In progress

The Stage 2 repository layer now runs against the real Supabase database.

- `.env.local` written by Ash with the session-pooler connection string; connection verified
  from this repository (PostgreSQL 17.6, all seven tables visible).
- Reconciled Drizzle's migration journal. The schema had been applied through the management
  API, so `drizzle.__drizzle_migrations` did not exist and `db:migrate` would have re-applied
  `0000`. Seeded it with the same sha256-of-file-contents hash and `when` value drizzle-orm
  computes, and confirmed `npm run db:migrate` now applies nothing.
- `drizzle.config.ts` reads `.env.local` directly. drizzle-kit runs outside Next.js, which is
  what loads that file, and one value did not justify a dotenv dependency.
- Added `src/data/drizzle/drizzleRepositories.integration.test.ts` and `npm run test:db`:
  six tests against real Postgres covering the shopping round trip, the duplicate-name merge,
  the pantry quantity floor, plan assign/clear including the dangling-id case, and the
  deliberate refusal of `reset()`. They run inside a throwaway household and delete it, so the
  family's data is never touched; every table was confirmed back at 0 rows afterwards.
- Integration tests are excluded from `npm test` and skip themselves without `DATABASE_URL`,
  so CI stays green without credentials.
- Restored `.env.example`, which had been renamed rather than copied when `.env.local` was
  created, and updated it to the newer `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`
  naming Ash's project uses.

The repositories are no longer unproven code. What remains for persistence is wiring: route
handlers, where `householdId` comes from before auth, and how the provider holds server state
that used to be synchronous localStorage.

## 2026-08-27 — Supabase provisioned and Stage 2 schema applied (Claude Code)

**Stage:** Stage 2
**Status:** In progress

Created the Supabase project (ADR-013) and applied the Stage 2 schema.

- Project `agrocer`, ref `ojlzjjvrtnslcxqdmpay`, region `ap-southeast-2` (Sydney),
  organisation `Ashnetnase's Org git`. $0/month.
- The first creation attempt was refused: the Supabase free tier caps a single user at two
  active projects **across every organisation they own or administer** — not per organisation,
  which is why a second (Vercel-managed) org did not help. `Salon Booking App UI Design` was
  paused on the user's instruction to make room; its data is retained and restorable.
- `drizzle/0000_mysterious_black_cat.sql` applied through the Supabase management API. All
  seven tables confirmed present and empty.

Two consequences recorded rather than fixed:

- **RLS is disabled on all seven tables.** With the anon key, every row is readable and
  writable. The tables are empty, so nothing is exposed today, but enabling RLS without
  policies blocks all access — so it must ship together with authentication, before any real
  family data is entered.
- **Drizzle's migration journal does not know about this database.** The schema was applied
  out-of-band, so `__drizzle_migrations` does not exist and `npm run db:migrate` would try to
  re-apply `0000`. This needs reconciling before migration `0001` is generated.

Still blocked on the user: the database password is only visible in the Supabase dashboard,
so `.env.local` does not exist and nothing in the repository has connected to the database.

## 2026-08-27 — Phase 0 documentation baseline and AshHome instructions (Claude Code)

**Stage:** Stage 2 (documentation only — no application code changed)
**Status:** In progress

Established the persistent handoff system the instructions require but the repository lacked.

Added:

- `HANDOFF.md` — recovery checkpoint in the mandated format; records that the Drizzle
  repositories are written but have never run against a database
- `TASKS.md` — roadmap with `[ ] [~] [x] [!]` statuses, tracking the master plan's stages
  and mapping the AshHome phases alongside
- `docs/ARCHITECTURE.md` — current architecture (layering, repository seam, schema state)
  kept explicitly separate from planned architecture

Changed:

- `CLAUDE.md` — expanded from Agrocer-only rules to the full AshHome instruction set:
  long-term vision, three interface modes (mobile / standard app / wall dashboard at
  `/dashboard`, one application), wall dashboard vision, device architecture, AI architecture
  and provider abstraction, agent safety and confirmation-required actions, secrets and git
  rules, the persistent handoff system, and AshHome Phases 0–14
- this file — corrected the migration filename to `0000_mysterious_black_cat.sql`; two
  references still cited `0000_bouncy_shockwave.sql`, which does not exist in the repository

Open decision recorded, not resolved: the master plan's Stages 1–8 and the new AshHome
Phases 0–14 cover overlapping ground with different numbering. `TASKS.md` tracks the stages,
since `CLAUDE.md` names this file the source of truth, and notes the phase mapping. The user
will decide whether to nest, replace, or keep them parallel.

Verification: `npm run typecheck`, `npm run lint`, `npm run test` (112 tests, 8 files) all pass.

## 2026-08-23 — Drizzle repository implementation and local verification (Claude Code)

**Stage:** Stage 2
**Status:** In progress

Added the Supabase-backed repository implementation behind the Stage 1 contracts.

Added:

- `src/db/client.ts` — server-only Drizzle client, cached on `globalThis` so hot reload
  cannot leak connections; `prepare: false` for the Supabase pooler
- `src/db/mappers.ts` — pure row/domain mapping, isolating the three places storage and
  the domain disagree: integer cents vs number, NULL vs `undefined`, plan rows vs record
- `src/data/drizzle/drizzleRepositories.ts` — `createDrizzleRepositories(db, householdId)`
  satisfying `AgrocerRepositories` in full
- `src/db/mappers.test.ts` — 23 tests

Behaviour worth recording:

- `adjustQuantity` and `toggle` clamp/flip in SQL rather than read-modify-write, so two
  phones acting at once cannot lose an update
- `addMany` runs in a transaction; a failed "add all ingredients" can no longer half-apply
- `meals.remove()` no longer touches the plan — the `plan_entries` cascade does it
- `reset()` deliberately throws. Wiping localStorage was safe; truncating the family's
  real data from a UI action is not. Re-seeding belongs in a deliberate script
- every statement filters on `household_id`, so RLS will be reinforcement, not the only guard
- `households.pinned_date` changed to NOT NULL DEFAULT CURRENT_DATE, because
  `settingsSchema.pinnedDate` is required. Migration regenerated as
  `0000_mysterious_black_cat.sql` — it had never been applied anywhere

New test: the seven Postgres enums are asserted equal to their Zod counterparts, so the
two hand-maintained lists cannot drift silently.

Checks: typecheck, lint, 112 tests (was 89) and production build all clean. Ran `npm run dev`
and confirmed Home, Shopping and Meals render correctly with a clean console and no server
errors. Client bundle sizes are byte-identical to before, confirming no database code leaked
into the browser.

**Still on localStorage.** `AgrocerProvider` has not been switched over — that needs a live
database, which needs the Supabase project, which needs Ash's tier decision.

Observed incidentally: the dev server's LAN address is a Tailscale one (100.119.81.51), so
Tailscale is already running on this machine. That materially lowers the cost of the
Tailscale HTTPS option in the Stage 2 staging list.

Next: route handlers, then auth and RLS, then wire the provider.

## 2026-08-23 — Stage 2 started: Drizzle schema and initial migration (Claude Code)

**Stage:** Stage 2
**Status:** In progress

Ash authorised Stage 2. First task complete: the database schema and its migration.

Added:

- `src/db/schema.ts` — 7 tables mirroring the Zod domain schemas, 7 Postgres enums kept
  byte-identical to the `z.enum` options
- `drizzle.config.ts`, `.env.example`, and `db:generate` / `db:migrate` / `db:studio` scripts
- `drizzle/0000_mysterious_black_cat.sql` — 108 lines, generated offline

Dependencies: `drizzle-orm` ^0.45.2, `postgres` ^3.4.9, `drizzle-kit` ^0.31.10 (dev).

Modelling decisions worth recording:

- `households` is the tenant root; every other table carries an indexed `household_id`, so
  RLS becomes one predicate per table once auth lands
- `Settings` folded into `households` — it is 1:1 and would otherwise be a one-row table
- `plan_entries` replaces the nested day/slot/mealId record, keyed on
  (household_id, day, slot). `ON DELETE CASCADE` from `meals` now does what the
  hand-written dangling-slot cleanup in `MealsRepository.remove()` did
- prices stored as integer cents, anticipated by section 5. `numeric` would arrive from the
  driver as a string and need mapping regardless, so cents costs nothing and removes rounding
  ambiguity. The repository divides by 100; `priceSchema` stays a plain number
- meal `ingredients` and `tags` are array columns, matching the Stage 1 domain. A structured
  `meal_ingredients` table becomes worthwhile in Stage 4 for pantry-to-recipe matching

Checks: typecheck, lint, 89 tests and production build all clean. No UI files touched.

**Not done, deliberately:** no Supabase project provisioned and no cloud resource created —
that is spending and needs Ash's tier decision first. The migration has never been applied.

Next: repository implementations against Drizzle, then auth and RLS.

## 2026-08-23 — Stage 2 database decision (Claude Code)

**Stage:** Stage 2 (planning only — no implementation authorised or performed)
**Status:** Decision recorded

Ash asked whether Stage 2 should use DynamoDB or Supabase, with eventual cloud migration as a
requirement. Recorded as ADR-013: **Supabase managed PostgreSQL**, DynamoDB rejected.

Plan changes:

- Stage 2 planned scope now names Supabase, Drizzle migrations, and route handlers behind the
  existing repository interfaces
- ADR-013 added; ADR-008 narrowed to the application tier
- Cognito struck from the Stage 6 AWS scope

Verified before deciding: `npm run check` clean — typecheck, lint, 89 tests passing.

No code was written. Stage 2 implementation still needs explicit authorisation.

Open questions for Ash: Supabase free tier (pauses after ~1 week idle) vs Pro; and whether to
ratify Drizzle.

## 2026-08-22 — Stage 1 closed (Claude Code)

**Stage:** Stage 1
**Status:** COMPLETE — dev-complete milestone

Ash waived definition-of-done items 12 and 13 and approved moving the staging work into
Stage 2, recorded as ADR-012. Stage 1 therefore closes with items 1–11 satisfied.

Delivered across Stage 1:

- the Magic Patterns prototype ported to Next.js App Router with the visual design preserved
- seven screens: Home, Pantry, Shopping, Shopping Mode, Meals, Products, Household, Settings
- Zod-backed domain layer, repository abstraction, localStorage persistence
- meal creation and editing; real date/week service; accessible sheets
- PWA foundation: manifest, icons, offline shell, service worker
- error, not-found and global-error boundaries
- WCAG AA contrast fixes and heading structure corrections
- Docker image, built and smoke-tested
- 89 tests; typecheck, lint and build clean

Moved to Stage 2:

- provisioning `agrocer-stg01`, deploying to it, and the HTTPS decision that gates
  installing the PWA on a phone

Next stage is **not** started and needs explicit authorisation before any Stage 2 work begins.

## 2026-08-22 — Image built, legacy removed, merged to main (Claude Code)

**Stage:** Stage 1
**Status:** In progress — only deployment to the staging VM and the acceptance review remain

Completed:

- removed `legacy/` on request, along with the tsconfig / ESLint / dockerignore exclusions that
  existed only to keep it out of the build. Recoverable from commit `1a1a986`.
- fast-forwarded `main` to the Stage 1 work and pushed; the branch and `main` now match
- **built the Docker image for the first time** and smoke-tested the running container:
  - reports `healthy` on the first healthcheck probe
  - all nine routes return 200, as do the manifest, service worker, an icon and a meal photo
  - `/login` returns the styled 404
  - runs as `uid=1000(node)`, confirming the non-root setup
  - 76.3 MB content / 319 MB on disk

This closes the last item that could be verified from the development machine. Every remaining
Stage 1 task needs the staging VM.

Checks run:

- `npm run typecheck`, `npm run lint` — clean
- `npm run test` — 89 tests passing
- `docker compose build` — succeeded
- container smoke test as above

Blockers:

- **PWA install still needs HTTPS.** Unchanged and still undecided; `docs/staging.md` sets out
  the options. Definition of Done item 11 cannot be met over plain HTTP on the LAN.

Resolved after this entry was written: the app was opened and confirmed working by Ash on
2026-08-22. This clears the caveat carried through the migration, meals, accessibility and
error-boundary entries below — every agent-side check in those entries was HTTP-level or
static, and none of them had confirmed the UI actually rendered correctly. It now has been,
on the development machine.

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

## ADR-012 — Stage 1 closes as a dev-complete milestone; staging moves to Stage 2

**Status:** Accepted (2026-08-22, Ash)

Stage 1's definition of done mixed product work with deployment work. Items 1–11 describe what
the family can do with the app; items 12 and 13 describe where it runs. The product items are
all satisfied and the app has been confirmed working, while the deployment items need a VM that
does not exist yet.

Stage 2 already owns "Docker Compose deployment" and "staging deployment pipeline", so splitting
homelab work across two stages created an artificial dependency: Stage 1 could not close on a
task Stage 2 was going to repeat. Items 12 and 13 are therefore waived for Stage 1 and the
staging tasks folded into Stage 2, where they sit alongside the backend they will eventually
serve.

Nothing is abandoned — the container is built and smoke-tested and `docs/staging.md` is written.
This changes when that work happens, not whether.

## ADR-013 — Supabase (managed PostgreSQL) is the Stage 2 database

**Status:** Accepted (2026-08-23, Ash)

Stage 2 originally said only "PostgreSQL". The open questions were the engine and the host.

**DynamoDB was considered and rejected.** Agrocer's data is relational — households to members,
products to pantry items to shopping items, meal plans keyed by (day, slot) to meals, plus Stage 2's
meal feedback history and inventory events. `MealsRepository.remove()` already has to strip a deleted
meal from dangling planned slots, which is a foreign key in Postgres and hand-written application code
in Dynamo. Stage 4 then wants consumption history, low-stock prediction and budget aggregation, all of
which are ad-hoc analytical queries — precisely what a single-table Dynamo design punishes. At a scale
of two adults and three children, none of Dynamo's advantages apply.

The decisive argument is the cloud-migration requirement. DynamoDB is not a migration path, it is a
destination with no exit: choosing it would bind Stage 6 to AWS permanently. Supabase is plain Postgres,
so moving to RDS or Aurora later is a dump, a restore and a connection string. Choosing Supabase keeps
the cloud options open; choosing Dynamo would close them.

**Supabase over a self-hosted Postgres container.** Ash already uses Supabase. It supplies Auth and RLS,
collapsing much of Stage 2's authentication and household-permission work, and its generated types pair
cleanly with the Zod-first domain layer. The self-hosted Supabase stack (~8 containers) would not sit
comfortably on the 3 GB `agrocer-stg01` spec anyway.

**Consequences**

- The app tier stays on the homelab; the data tier becomes managed cloud. ADR-008 is narrowed, not revoked.
- ADR-007 is strengthened: the data outlives the Ryzen desktop *and* the ThinkCentre node.
- Cognito drops out of the Stage 6 AWS scope while Supabase Auth owns identity.
- Family grocery data now lives with a third party. Accepted deliberately as the price of the above.
- **Open risk:** Supabase free-tier projects pause after ~1 week of inactivity, which is a poor fit for an
  app the family opens a couple of times a week. Either the Pro plan or an accepted cold-start is a
  decision Stage 2 must make before the family relies on it.

**Not decided here:** Drizzle is the standing recommendation for schema and migrations (`drizzle-zod`
keeps Zod as the single source of truth per section 5) but is not yet ratified.

## ADR-014 — AI reaches AshHome only through a server-side provider abstraction

**Status:** Accepted (2026-08-28)

`CLAUDE.md` requires that no application logic bind to one model. The shape that satisfies it
is the one ADR-003 already uses for persistence: features depend on an interface, and the
implementation is chosen in exactly one place.

- Features and route handlers depend on `AiProvider` (`src/ai/types.ts`) and never on Ollama.
- `getAiProvider()` (`src/ai/provider.ts`) is the only code that picks an implementation. A
  cloud fallback, or a swap from qwen3 to gemma, is a change there and nowhere else.
- All of it is server-side. `OLLAMA_BASE_URL` describes the inside of the home network and
  must never reach a browser, so nothing under `src/ai/` may be imported by a client component
  — the same rule as `src/db/client.ts`.
- The model has no tools until Phase 9, and when it gets them they are an explicit allow-list
  of application functions, never system access.

The alternative — calling Ollama directly from a feature, or from the browser — was rejected
on both counts: it would bind AshHome to one model, and it would publish a private network
address to every device on the wall.


## ADR-015 — The AI reaches household data only through a fixed, read-only tool allow-list

**Status:** Accepted (2026-08-29)

`CLAUDE.md` requires that the LLM never receive unrestricted access and act only through
explicitly defined application tools. This records the shape that satisfies it, because the
tempting shortcuts are all worse.

**Lookup is by exact name against a fixed record** (`src/ai/tools/registry.ts`). The rejected
alternative was a generic bridge — letting the model name a repository and a method, or
passing a query through. That is the same class of mistake as string-concatenated SQL: it
turns model output into control flow. A name not in the record is refused, and the refusal is
returned to the model as a tool result so it can explain the limit rather than the request
failing outright.

**Every 9a tool takes no arguments.** No argument can widen what a tool reads. A tool that
later needs one validates it with Zod in the registry before the implementation sees it.

**Tools receive the repositories from `serverRepositories()`**, so they inherit household
scoping — a tool cannot read another family's data any more than a route handler can. This is
also why the tool layer is server-side and stays there.

**Read tools and write tools are separated by construction, not by convention.**
`READ_ONLY_TOOLS` contains only tools that call `list()` / `getPlan()`. A write tool is slice
9b, arrives with a confirmation gate, and does not join that record.

**Tools return prose rather than JSON**, withholding ids, per-item prices and notes. Partly
tokens, mostly reliability: a small local model reads a sentence more dependably than an
object graph, and every field handed over is a field it can garble back at the family.

`/api/ai/ask` owns this loop. `/api/ai/chat` stays a transport with no prompt, no tools and no
data, so there remains one path to household data with a model attached, and it is the one
with the allow-list on it.


## ADR-016 — RLS is enabled with no policies, and the application enforces household scoping

**Status:** Accepted (2026-08-29)

`HANDOFF.md` had long recorded that RLS could not be enabled until authentication landed,
because "enabling RLS without policies blocks all access". That is true of a typical Supabase
app and false of this one, and the difference is worth writing down so nobody re-derives the
wrong conclusion later.

**Why it is false here.** The route handlers reach Postgres through Drizzle over
`DATABASE_URL`, which connects as `postgres`. That role owns all seven tables and has
`rolbypassrls`. Enabling RLS therefore has no effect whatsoever on the application's queries —
measured, not assumed: `npm run db:rls` prints the connecting role and its bypass flag.

**What RLS is actually protecting.** The publishable key. It is public by design — it is meant
to ship in browser bundles — and Supabase exposes every table through PostgREST to whoever
holds it. Before this change that key could read the household, the children's names, the
pantry, the products and the meals, and could insert rows. Both were demonstrated before the
migration and re-tested after: reads now return empty, and an insert is refused with
`42501 new row violates row-level security policy`.

**So enforcement lives in two different places, deliberately.**

- *Household scoping* is enforced by the application, in `src/server/repositories.ts`, which is
  the single place a household id is resolved. This is unchanged, and it is what actually keeps
  one family's data separate from another's.
- *RLS* is the wall around the public key: a deny-all that grants nothing to `anon` or
  `authenticated`.

**Deny-all is the finished state for now, not an unfinished one.** With no code using the
publishable key — nothing in the repository imports `supabase-js`, and it is not a dependency —
granting nothing is exactly correct. Policies become meaningful when authentication introduces
a real `authenticated` role that needs its own household, and they should be written then,
against a schema that links users to households. Writing speculative policies now would mean
guessing at that link.

**The risk this leaves.** Because the application bypasses RLS, a bug in household scoping is
not caught by the database. That is the cost of the arrangement and it is accepted: the
alternative — running application queries as the authenticated user, with `set local role` and
JWT claims per transaction — is a real option, and the right time to weigh it is when
authentication lands, not before.


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

**Status:** Accepted, narrowed by ADR-013 (2026-08-23)

The second Lenovo ThinkCentre Proxmox node is the first staging target. AWS/Azure is introduced later where it creates real value.

ADR-013 narrows this to the *application tier*. From Stage 2 the Next.js container still runs on
`agrocer-stg01`, but the database is managed Supabase rather than a self-hosted Postgres container.
The homelab remains the deployment target; it is no longer the system of record.

---

# 11. Current decisions awaiting implementation

The following decisions are already approved unless explicitly changed:

- ~~Fresh Next.js scaffold/port is preferred over mutating the Vite app in place.~~ Done 2026-08-22.
- ~~Keep the Vite source temporarily during the port until the new implementation is verified.~~
  Removed 2026-08-22 on request. Recoverable from commit `1a1a986` if ever needed.
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
