import { z } from 'zod';
import { idSchema } from './common';

/**
 * Where a school notification came from (CLAUDE.md's `SchoolProvider` abstraction).
 * `manual` covers hand-entered notifications — always available, needs no integration.
 */
export const schoolNotificationProviderSchema = z.enum(['hero-email', 'manual']);
export type SchoolNotificationProvider = z.infer<typeof schoolNotificationProviderSchema>;

/** What kind of response a notification is asking the family for, if any. */
export const schoolNotificationActionTypeSchema = z.enum([
  'permission',
  'payment',
  'rsvp',
  'reminder',
  'info',
]);
export type SchoolNotificationActionType = z.infer<typeof schoolNotificationActionTypeSchema>;

/**
 * A normalised school notification, shaped per CLAUDE.md's Kids/School section.
 *
 * `eventDate`/`dueDate` are nullable, separate fields — a notice can carry either, both, or
 * neither, and they mean different things (when something happens vs. when a reply is due).
 * `childId` is nullable: extraction that can't tell which child a notice is about must not
 * guess (CLAUDE.md: "The AI must not invent missing dates, requirements or school
 * information") — an unattributed notification is still shown, just not filed under a child.
 */
export const schoolNotificationSchema = z.object({
  id: idSchema,
  childId: idSchema.nullable(),
  provider: schoolNotificationProviderSchema,
  /** Source dedup key (e.g. a Gmail message id). Null for hand-entered notifications. */
  externalReference: z.string().trim().max(200).nullable(),
  title: z.string().trim().min(1, 'Required').max(200, 'Too long'),
  summary: z.string().trim().max(2000, 'Too long'),
  receivedAt: z.string(),
  eventDate: z.string().nullable(),
  dueDate: z.string().nullable(),
  actionRequired: z.boolean(),
  actionType: schoolNotificationActionTypeSchema.nullable(),
  /** Deep-link back to Hero, or wherever the notice came from. */
  sourceLink: z.string().trim().max(500).nullable(),
  read: z.boolean(),
  dismissed: z.boolean(),
});
export type SchoolNotification = z.infer<typeof schoolNotificationSchema>;

export const schoolNotificationDraftSchema = schoolNotificationSchema.omit({
  id: true,
  read: true,
  dismissed: true,
  receivedAt: true,
}).extend({
  receivedAt: z.string().optional(),
});
export type SchoolNotificationDraft = z.infer<typeof schoolNotificationDraftSchema>;
