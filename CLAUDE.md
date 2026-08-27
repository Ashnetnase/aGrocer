# CLAUDE.md — AshHome / Agrocer Instructions for Claude Code

You are working on my personal family household application.

The long-term product is called **AshHome**.

**Agrocer** is the grocery, pantry, meal-planning and grocery-budget module inside AshHome. It remains its own product/app even when surfaced through AshHome.

## Existing project

There is already an existing Agrocer implementation in this repository.

The original frontend was started with React, TypeScript, Vite, Tailwind CSS, React Router and Context state management. That code now lives under `legacy/`; the active app is the Next.js App Router port described in `AGROCER_MASTER_PLAN.md`.

Do NOT assume the existing implementation is disposable.

Before changing architecture:

1. Inspect the repository.
2. Understand what already works.
3. Identify the current structure.
4. Preserve working functionality wherever reasonable.
5. Do not perform a complete rewrite unless there is an exceptional technical reason and you document that reason first.

## Mandatory first action

Before making changes, read:

1. `AGROCER_MASTER_PLAN.md`
2. `HANDOFF.md`
3. `TASKS.md` if it exists
4. the current repository structure
5. relevant files for the requested task

Treat `AGROCER_MASTER_PLAN.md` as the project source of truth.

Do NOT immediately edit code. Read the persistent project files and inspect the relevant implementation first, then continue the requested task.

If `HANDOFF.md` conflicts with the actual code, trust the actual repository, investigate the discrepancy, and correct `HANDOFF.md`.

If previous work appears incomplete, do not blindly continue it. Verify its current state first.

## Core rules

- Stay inside the active stage unless the user explicitly authorises a stage change.
- The Magic Patterns design is the Stage 1 visual source of truth:
  https://www.magicpatterns.com/c/wcq3xgsyngrycyqffvyrmt/preview?hideToolbar=true&disableComments=true
- Preserve the current Agrocer visual language and mobile UX.
- Do not redesign screens merely because a library has a default component.
- Use Next.js App Router, React, TypeScript, Tailwind, Zod, React Hook Form, and selective shadcn/Radix as specified in the master plan.
- Avoid `any`.
- Keep domain/data layers separate from display components.
- Stage 1 persistence should be localStorage-backed behind repository interfaces.
- Keep the build/typecheck/lint state healthy.
- Do not implement AI, supermarket automation, Kubernetes, AWS/Azure production architecture, or other later-stage features during Stage 1.
- Never create autonomous payment/checkout behaviour.
- Work incrementally. Do NOT attempt to build the entire platform in one session.
- Implement only the requested scope. Do not silently change unrelated functionality.
- Do not introduce dependencies unless they provide a clear benefit.
- Prefer TypeScript throughout the web/backend stack where practical.

## Required workflow

### Before implementation

Report briefly:

1. what you inspected
2. which stage/task you are working on
3. the files you expect to change
4. any risk or conflict with the master plan

Then proceed if the user has already authorised the work.

### After implementation

1. run appropriate checks (build / lint / typecheck / tests)
2. fix problems you introduced
3. update `AGROCER_MASTER_PLAN.md`
   - check completed tasks
   - append a Progress Log entry
   - record new architecture decisions if needed
   - record blockers
4. update `TASKS.md` and `docs/ARCHITECTURE.md` where relevant
5. update `HANDOFF.md`
6. summarise:
   - what changed
   - checks run
   - remaining current-stage work

## Stage completion

Do not mark a stage `COMPLETE` until every item in its Definition of Done is satisfied or explicitly waived by the user.

If a request conflicts with the master plan, explain the conflict and ask before changing the plan.

---

# Long-term vision

AshHome will become a private family household assistant.

Major modules will eventually include:

* Grocery shopping
* Pantry/freezer inventory
* Meal planning
* Grocery budgeting
* Family reminders
* Chores/tasks
* Kids and school (see below)
* Family calendar
* Household maintenance
* Family notifications
* Email notifications
* Local AI assistant
* Home Assistant integration later

The AI should eventually be capable of requests such as:

> We have chicken, mince and sausages in the freezer. Plan five dinners, keep extra groceries under $120, and add everything missing to our shopping list.

The application—not the LLM—must own permanent state.

Use this principle:

**LLM = reasoning and natural language**

**Database = permanent memory**

**Application services = actions**

**Scheduler = reminders**

## Interface modes

AshHome must support three primary interface modes from the **same application**:

1. **Mobile**
   * phones
   * quick shopping additions
   * reminders
   * family tasks
   * AI assistant

2. **Standard App**
   * desktop/laptop/tablet
   * administration
   * detailed editing
   * household configuration

3. **Wall Dashboard**
   * dedicated 10–11 inch Android tablet
   * fullscreen/kiosk mode
   * designed for shared family use
   * large touch-friendly controls
   * glanceable information
   * should work well when always open

The wall dashboard should use a route such as `/dashboard`.

Do NOT create a completely separate application for the wall tablet. Reuse the same feature modules, API and data while providing a dedicated dashboard layout.

---

# Wall dashboard vision

The dashboard should eventually provide quick access to:

* current date/time
* weather
* today's family calendar
* family reminders
* shopping-list summary
* quick-add shopping
* tonight's meal
* weekly meal plan
* chores
* pantry/freezer alerts
* household maintenance reminders
* family AI assistant
* microphone/voice assistant later
* Home Assistant smart-home controls later

Example layout:

```
AshHome Dashboard

Today | Weather | Shopping | Tonight's Meal
Calendar | Chores | Reminders | Home | Ask AshHome
```

The dashboard must prioritize:

* large touch targets
* readability from several metres away
* minimal navigation
* low interaction complexity
* family-friendly shared use
* responsive design
* fullscreen/kiosk operation
* automatic recovery/reload where practical

---

# Device architecture

Plan for device-specific configuration.

A device may eventually have:

* device name
* dashboard type
* permissions
* preferred modules
* kiosk status
* screen/display preferences

Examples:

* **Kitchen Tablet** — family dashboard, shared permissions
* **Personal Phone** — personal/mobile dashboard, authenticated user
* **Admin PC** — full administration

Do not build an unnecessarily complex device-management system during the early stages, but avoid architecture choices that prevent this later.

---

# Kids and school

AshHome must include a first-class **Kids / School** module. The wall dashboard combines
household information, groceries, meals, reminders and children's schedules into one shared
family command centre.

Each child should eventually have a family profile holding:

* name
* avatar/profile image
* colour/theme identifier
* school
* relevant family calendar events
* activities
* reminders
* chores
* school notices
* upcoming school events
* permission/action deadlines

**Least-data principle.** Do not store unnecessary sensitive school or educational
information. Store what the family needs on the dashboard, nothing more.

## Hero school integration

The family uses the Hero school platform (https://our-hero.com/). Hero information may include
school notices, calendar events, term dates, excursion information, permission requests,
reminders, interview bookings and other caregiver notifications.

Integration must be **provider-based and optional**. Hard rules:

* Do NOT scrape authenticated Hero pages.
* Do NOT store the user's Hero username or password.
* Do NOT automate around Hero security controls.

Preferred integration order:

1. Hero notification email ingestion
2. supported calendar feeds/imports where available
3. an officially supported Hero API, if access is ever provided
4. links/deep-links back to Hero for actions that should stay inside Hero

## School notification architecture

Build a generic abstraction so the Kids module never depends on Hero specifically:

```
SchoolProvider
├─ HeroEmailProvider
├─ CalendarProvider
└─ HeroApiProvider   (planned/optional)
```

A normalized school notification may carry: `id`, `childId`, `provider`, `externalReference`,
`title`, `summary`, `receivedAt`, `eventDate`, `dueDate`, `actionRequired`, `actionType`,
`sourceLink`, `read`, `dismissed`.

Design the real schema during the relevant backend/database phase. Do not implement this exact
shape blindly.

## Hero email processing

A future ingestion service may: receive a Hero notification email, confirm it is an approved
Hero source, extract the relevant text, determine which child it applies to where possible,
identify dates/deadlines/events, create a normalized `SchoolNotification`, optionally use the
local AI to write a concise family-friendly summary, surface it on the dashboard, and retain a
link back to the original source.

**The AI must not invent missing dates, requirements or school information.** Where extraction
confidence is low, mark the item for user confirmation rather than guessing.

Do not implement email integration until its phase.

## Family calendar

A combined calendar drawing on manual family events, children's activities, school events,
Hero-derived events, household reminders, appointments, birthdays and recurring activities.

The dashboard shows a simplified **Today / Tomorrow** view, not the full calendar interface.

---

# Wall dashboard requirements

`/dashboard` is the shared family command centre. Plan these cards:

**Kids / School** — each child's next event, today's and tomorrow's activities, unread school
notifications, permission/action deadlines, important reminders. Plus an "Open Kids" action.

**Shopping** — unlike a simple summary, this card shows *actual current items*: interactive
checkboxes, quantity and category where useful, estimated total, remaining count, a quick-add
control, and an open-full-list action. The family should be able to check items off and add
items directly from the tablet. The full Agrocer shopping interface stays available separately.

```
Shopping
☑ Milk      ☐ Bread      ☐ Bananas
☐ Chicken   ☐ Dog food
17 items • Estimated $184
[+ Add Item]  [Open List]
```

**Tonight's Meal** — meal name, optional image, cooking time, approximate cost where available,
a recipe action, and a missing-ingredient warning where relevant.

**Family Schedule** — today's and upcoming events, school activities, appointments, family
events. Use child/profile identifiers so it is immediately clear who an event belongs to.

**Chores** — outstanding chores, who they are assigned to, completion state. Simple touch
completion where permissions allow.

**Reminders** — prioritised: due today, due tomorrow, overdue, school action required.

**Ask AshHome** — a prominent AI area. Eventually: "Add milk to shopping", "What are the kids
doing tomorrow?", "Do we need anything for school tomorrow?", "What are we having for dinner?",
"Create the shopping list for this week's meals", "Remind us tomorrow night about swimming."
Voice input comes later.

## Information hierarchy

Roughly in this order:

1. urgent family/school actions
2. today's family schedule
3. shopping
4. tonight's meal
5. kids/school information
6. reminders
7. chores
8. household information
9. AI assistant
10. smart-home controls (later)

**Do not overcrowd the wall dashboard.** Detailed editing belongs in the normal application
views. The wall tablet is for glanceable information, quick family actions, simple touch
interactions and AI commands.

## Dashboard data behaviour

Dashboard cards read the same AshHome backend as the mobile and desktop views. **One source of
truth** — never a separate copy of shopping, calendar or reminder state for the tablet.

Where practical, use real-time updates or efficient polling so that checking off shopping on a
phone updates the tablet, and likewise for adding an event, receiving a school notification, or
changing tonight's meal.

---

# AI architecture

The initial local AI target will be Ollama running on another machine containing an NVIDIA RTX 5070 12 GB GPU.

AshHome should access Ollama over the local network through a backend AI service.

Do NOT tightly couple application logic to one particular model.

Eventually models may change between:

* Qwen
* Gemma
* other Ollama-compatible models
* optional cloud AI fallback

Create an abstraction so the rest of AshHome does not care which model provider is being used.

---

# Agent safety

The LLM must NEVER receive unrestricted access to the system.

AI actions must use explicitly defined application tools/functions.

Examples:

* getShoppingList()
* addShoppingItem()
* removeShoppingItem()
* getPantry()
* updatePantryItem()
* getMealPlan()
* createMealPlan()
* createReminder()
* getFamilyCalendar()
* createChore()
* assignChore()
* getGroceryBudget()

Low-risk actions may eventually execute automatically.

Sensitive actions should require confirmation.

Examples requiring confirmation:

* sending external email
* deleting calendar events
* purchasing anything
* spending money
* changing another user's permissions
* destructive database operations

Never implement purchasing automation without an explicit future request.

---

# Home Assistant integration

Home Assistant integration is PLANNED.

AshHome should remain responsible for:

* groceries
* meals
* family data
* reminders
* chores
* household AI

Home Assistant should eventually provide:

* lights
* switches
* sensors
* climate
* cameras
* other smart-home devices

The AshHome dashboard may surface selected Home Assistant controls through the AshHome UI.

Do not implement Home Assistant integration until its roadmap phase.

---

# AshHome roadmap (phases)

This is the AshHome-wide roadmap. `AGROCER_MASTER_PLAN.md` remains the source of truth for
Agrocer stage boundaries and Definitions of Done; where the two disagree, ask before
proceeding.

Phase 0 — repository baseline, documentation and persistent handoff

Phase 1 — AshHome shell, responsive navigation and wall-dashboard foundation

Phase 2 — backend/API foundation

Phase 3 — PostgreSQL family data model

Phase 4 — Agrocer shopping lists, favourites and history

Phase 5 — pantry/freezer inventory

Phase 6 — recipe providers and family recipes

Phase 7 — meals, meal planning and grocery budgeting

Phase 8 — local Ollama AI service

Phase 9 — controlled AI tool/action system

Phase 10 — pantry-aware AI meal planning

Phase 11 — reminders, scheduler and notifications

Phase 12 — kids, chores, family calendar and school-data foundation

Phase 13 — Hero/email/calendar school integration

Phase 14 — wall-dashboard enhancements, kiosk/device configuration and shared-family UX

Phase 15 — homelab deployment, monitoring and backups

Phase 16 — Home Assistant integration

Phase 17 — voice assistant and additional external integrations

Do NOT automatically advance through phases. Work on one requested phase/task at a time.

## The Phase 1 dashboard

The initial dashboard should already visually reserve areas for: Kids / Today, Shopping List,
Tonight's Meal, Family Schedule, Chores, Reminders, and Ask AshHome.

These may use placeholder or mock data during Phase 1.

Do NOT prematurely implement PostgreSQL, Hero integration, Ollama or backend services simply to
populate the dashboard. As later phases land, replace placeholder data with real services.

---

# Secrets

Never commit:

* passwords
* API keys
* Ollama credentials
* email credentials
* database passwords
* Cloudflare tokens
* Proxmox tokens
* other secrets

Use environment variables and maintain `.env.example`.

Never place Hero credentials, child-sensitive data or email credentials in `HANDOFF.md`,
`TASKS.md`, `CLAUDE.md`, git, or any source-controlled configuration.

---

# Git rules

Before changing files, run `git status` and understand whether there are pre-existing uncommitted changes.

Never delete or overwrite unrelated user work.

After a meaningful working milestone:

* ensure the code builds
* update `HANDOFF.md`
* make the state easy for another Claude Code session to understand

Do NOT perform destructive Git operations such as:

* `git reset --hard`
* rewriting history
* deleting branches

unless explicitly instructed.

---

# CRITICAL: Persistent handoff system

Claude conversation history must NEVER be treated as the authoritative project memory.

The repository must contain `HANDOFF.md`.

This file is the recovery checkpoint for another Claude Code session. It must always be understandable without access to previous conversations.

Update `HANDOFF.md` after EVERY meaningful milestone, not merely at the very end of a session.

This is important because a Claude Code session may terminate unexpectedly due to:

* daily spending limits
* context limits
* terminal interruption
* application restart
* network failure
* user ending the session

Therefore the handoff file should normally be at most one meaningful development step behind the actual code.

If you suspect context/token limits are approaching:

**STOP starting new work.**

Instead:

1. finish the smallest safe unit possible
2. ensure files are saved
3. run relevant verification
4. update `HANDOFF.md`
5. record the exact next task
6. stop

## HANDOFF.md format

Maintain this structure:

```
# AshHome Development Handoff

## Project
Brief explanation of AshHome and Agrocer.

## Current Stage
The phase currently being worked on.

## Current Working State
Exactly what currently works.

## Completed
Concrete completed work.

## Work In Progress
Anything partially implemented. If nothing is incomplete, write: None.

## Files Changed
Important files changed recently and why.

## Architecture Decisions
Decisions another coding agent MUST preserve unless intentionally revisited.

## Environment / Services
Relevant development services without secrets — frontend port, API port,
PostgreSQL requirement, Ollama endpoint variable name, expected Node version.
Never put credentials here.

## Verification
Most recent successful commands (npm install / build / lint / test).
Include failures if unresolved.

## Known Problems
Known bugs, technical debt or blockers.

## NEXT TASK
One concrete next action, extremely explicit. For example:
"Implement the PostgreSQL shopping_list and shopping_item schema using Drizzle.
Do not start pantry functionality yet."

## Do Not Accidentally Change
Anything fragile or deliberately deferred.

## Last Updated
Date/time if easily available.
```

`HANDOFF.md` must also always document:

* which dashboard cards exist
* whether each card uses mock or real data
* Kids/School integration status
* Hero integration status
* notification ingestion status
* calendar integration status
* the exact NEXT TASK

---

# TASKS.md

Maintain a lightweight roadmap.

Use these statuses:

* `[ ]` not started
* `[~]` in progress
* `[x]` completed
* `[!]` blocked

Do not mark something complete unless it works and has been reasonably verified.

---

# Architecture documentation

Maintain `docs/ARCHITECTURE.md`.

It should describe the current architecture, not merely aspirational architecture.

Clearly distinguish **Current** from **Planned**.

---

# Coding priorities

Optimize for:

1. reliability
2. maintainability
3. privacy
4. security
5. understandable architecture
6. good family user experience

This is a real household application intended to run long-term, not a throwaway coding demo.
