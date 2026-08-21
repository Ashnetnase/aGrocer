import { z } from 'zod';
import { idSchema, nameSchema } from './common';

export const memberRoleSchema = z.enum(['Adult', 'Child']);
export type MemberRole = z.infer<typeof memberRoleSchema>;

export const MEMBER_ROLES = memberRoleSchema.options;

/**
 * Avatar colours are constrained to the Agrocer palette so a member can never
 * introduce a colour from outside the design system.
 */
export const memberColourSchema = z.enum([
  'bg-moss-600',
  'bg-moss-400',
  'bg-clay-500',
  'bg-honey-500',
  'bg-berry-500',
]);
export type MemberColour = z.infer<typeof memberColourSchema>;

export const MEMBER_COLOURS = memberColourSchema.options;

export const householdMemberSchema = z.object({
  id: idSchema,
  name: nameSchema,
  initials: z.string().trim().min(1).max(2),
  role: memberRoleSchema,
  colour: memberColourSchema,
});

export type HouseholdMember = z.infer<typeof householdMemberSchema>;

/** Initials are derived from the name, so the form never asks for them. */
export const householdMemberDraftSchema = householdMemberSchema.omit({ id: true, initials: true });
export type HouseholdMemberDraft = z.infer<typeof householdMemberDraftSchema>;

export const settingsSchema = z.object({
  householdName: nameSchema,
  /** Shown in the shopping screen subtitle, e.g. "New World Thursday". */
  shopLabel: z.string().trim().max(40),
  currency: z.literal('NZD'),
  /** When true the planner pins to `pinnedDate` instead of the real today (ADR-005). */
  pinDemoDate: z.boolean(),
  /** ISO yyyy-mm-dd. Only meaningful while `pinDemoDate` is true. */
  pinnedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use yyyy-mm-dd'),
  /** Show breakfast and lunch slots in the weekly planner by default. */
  showBreakfastAndLunch: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const householdSchema = z.object({
  members: z.array(householdMemberSchema),
  settings: settingsSchema,
});

export type Household = z.infer<typeof householdSchema>;
