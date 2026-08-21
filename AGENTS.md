# AGENTS.md — Agrocer Instructions for Codex and Other Coding Agents

This repository belongs to **Agrocer**.

## Read first

Before planning, editing, reviewing, or generating code, read:

- `AGROCER_MASTER_PLAN.md`

This file defines:

- product vision
- current active stage
- architecture
- approved stack
- stage boundaries
- completed work
- next work
- design source of truth

## Current operating principle

Work on the **current active stage only**.

Do not jump ahead into AI, supermarket integration, cloud migration, Kubernetes, or other future work unless explicitly instructed.

## Stage 1 design source of truth

Magic Patterns preview:

https://www.magicpatterns.com/c/wcq3xgsyngrycyqffvyrmt/preview?hideToolbar=true&disableComments=true

Preserve its visual identity and interaction design unless fixing a real technical, accessibility, or usability issue.

## Codex role

Codex is especially useful for:

- focused feature implementation
- repo-aware refactoring
- code review
- TypeScript correctness
- tests
- build/lint/typecheck fixes
- accessibility fixes
- repository/data layer work
- CI/CD later
- security review later

Do not independently redesign the UI.

## Before changing code

1. read the master plan
2. inspect relevant files
3. identify current stage
4. keep changes scoped
5. avoid unrelated refactors

## After meaningful changes

Update `AGROCER_MASTER_PLAN.md`:

- `[x]` completed checklist items
- progress log entry
- tests/build checks run
- blockers
- architecture decision if a real project-level decision changed

Never mark a stage complete without satisfying its Definition of Done.

## Quality rules

- strict TypeScript
- no unnecessary `any`
- Zod at data boundaries
- repository abstraction for Stage 1 persistence
- mobile-first
- preserve design tokens
- accessible interaction primitives
- avoid unnecessary dependencies
- no secrets in source
- no autonomous checkout/payment
- no scope creep
