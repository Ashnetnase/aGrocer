# Agrocer

A mobile-first family grocery, pantry and meal-planning PWA.

Read `AGROCER_MASTER_PLAN.md` before making changes — it is the project source of truth.
**Current stage: Stage 1** (usable manual PWA, local persistence, no backend or AI).

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The app is a fixed-width phone layout: it fills the screen on a
phone and sits in a device frame from `md` upwards.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (domain and seed tests) |
| `npm run check` | typecheck + lint + test |

`node scripts/generate-icons.mjs` regenerates the PWA icons from the design tokens.

## Structure

```text
app/                  App Router routes; (app) is the shell + bottom nav group
src/domain/           Zod schemas (source of truth) and framework-free services
src/data/             Repository interfaces, localStorage implementation, seed data
src/features/         One folder per domain: screens and their components
src/components/       agrocer/ design primitives (incl. RHF form fields), layout/ shell
src/providers/        AgrocerProvider and the date hooks
```

### Architecture notes

- **Zod is the source of truth.** Every domain type derives from a schema via `z.infer`, and stored
  data is validated on read — anything invalid falls back to the seed rather than breaking a screen.
- **Components never touch repositories or seed data.** They go through `useAgrocer()`; Stage 2
  swaps the repository implementation for an API client without changing a screen.
- **The Magic Patterns design is the visual source of truth.** Do not redesign a screen because a
  library ships a different default component.

## Design

Stage 1 visual source:
https://www.magicpatterns.com/c/wcq3xgsyngrycyqffvyrmt/preview?hideToolbar=true&disableComments=true

Design tokens live in `tailwind.config.ts` and are ported verbatim from the generated UI.
