import { z } from 'zod';
import { idSchema, nameSchema } from './common';

/**
 * Household chores (Phase 12). Deliberately as simple as CLAUDE.md asks for: "outstanding
 * chores, who they are assigned to, completion state. Simple touch completion." No recurrence
 * engine — a household resets its list with `clearCompleted()` (mirrors the shopping list's
 * "clear checked"), the same manual weekly reset a fridge whiteboard already gets.
 */
export const choreSchema = z.object({
  id: idSchema,
  title: nameSchema,
  /** Null means unassigned — shown that way, not hidden or defaulted to someone. */
  assignedMemberId: idSchema.nullable(),
  done: z.boolean(),
});

export type Chore = z.infer<typeof choreSchema>;

/** Shape accepted by the add/edit form. `done` is owned by the repository (starts false). */
export const choreDraftSchema = choreSchema.omit({ id: true, done: true });
export type ChoreDraft = z.infer<typeof choreDraftSchema>;

export const chorePatchSchema = choreDraftSchema.partial();
export type ChorePatch = z.infer<typeof chorePatchSchema>;
