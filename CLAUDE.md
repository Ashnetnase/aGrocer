# CLAUDE.md — Agrocer Instructions for Claude Code

You are working on **Agrocer**.

## Mandatory first action

Before making changes, read:

1. `AGROCER_MASTER_PLAN.md`
2. the current repository structure
3. relevant files for the requested task

Treat `AGROCER_MASTER_PLAN.md` as the project source of truth.

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

## Required workflow

### Before implementation

Report briefly:

1. what you inspected
2. which stage/task you are working on
3. the files you expect to change
4. any risk or conflict with the master plan

Then proceed if the user has already authorised the work.

### After implementation

1. run appropriate checks
2. fix issues you introduced
3. update `AGROCER_MASTER_PLAN.md`
   - check completed tasks
   - append a Progress Log entry
   - record new architecture decisions if needed
   - record blockers
4. summarise:
   - what changed
   - checks run
   - remaining current-stage work

## Stage completion

Do not mark a stage `COMPLETE` until every item in its Definition of Done is satisfied or explicitly waived by the user.

If a request conflicts with the master plan, explain the conflict and ask before changing the plan.
