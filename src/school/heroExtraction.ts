import { z } from 'zod';
import type { AiProvider } from '@/ai/types';
import {
  schoolNotificationActionTypeSchema,
  type SchoolNotificationDraft,
} from '@/domain/schemas/school';
import type { GmailMessage } from './gmail';

/**
 * Turns one raw Hero email into a `SchoolNotificationDraft`, using the background AI provider
 * (Phase 13). CLAUDE.md: "The AI must not invent missing dates, requirements or school
 * information. Where extraction confidence is low, mark the item for user confirmation rather
 * than guessing." — the model is instructed to leave a field `null` rather than guess, and
 * anything that fails to parse cleanly falls back to the raw subject/snippet with
 * `needsReview: true` rather than losing the notice or fabricating detail.
 */

const extractionResultSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().max(2000),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  actionRequired: z.boolean(),
  actionType: schoolNotificationActionTypeSchema.nullable(),
  /** The model's own judgement of whether it was confident in the fields above. */
  confident: z.boolean(),
});

const SYSTEM_PROMPT = `You extract structured facts from a school notification email so a family dashboard can display it.

Reply with ONLY a JSON object, no other text, matching exactly this shape:
{
  "title": string (short, e.g. "Sports day permission slip"),
  "summary": string (one or two sentences, family-friendly, plain language),
  "eventDate": string "YYYY-MM-DD" or null (when something happens, e.g. an event or activity date),
  "dueDate": string "YYYY-MM-DD" or null (when a reply/payment/form is due back),
  "actionRequired": boolean (does a parent need to do something?),
  "actionType": one of "permission", "payment", "rsvp", "reminder", "info", or null,
  "confident": boolean (true only if every field above is clearly stated in the email; false if you had to guess or infer anything)

Rules:
- Never invent a date, amount, or requirement that is not explicitly in the email. If something is unclear or missing, use null and set confident to false.
- The email may include tracking links, addresses, and legal boilerplate — ignore all of that, it is not part of the notice.
- If there is no year given for a date, assume the current year.`;

function buildUserPrompt(message: GmailMessage): string {
  return `Subject: ${message.subject}\nDate: ${message.date}\n\n${message.bodyText.slice(0, 6000)}`;
}

/** A safe fallback draft for anything the model's output doesn't parse cleanly. */
function fallbackDraft(message: GmailMessage): SchoolNotificationDraft {
  return {
    childId: null,
    provider: 'hero-email',
    externalReference: message.id,
    title: message.subject || 'Hero notice',
    summary: message.snippet,
    eventDate: null,
    dueDate: null,
    actionRequired: false,
    actionType: null,
    sourceLink: null,
    needsReview: true,
  };
}

export async function extractHeroNotification(
  provider: AiProvider,
  message: GmailMessage,
): Promise<SchoolNotificationDraft> {
  let result: Awaited<ReturnType<AiProvider['chat']>>;
  try {
    result = await provider.chat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(message) },
      ],
      temperature: 0,
    });
  } catch {
    return fallbackDraft(message);
  }

  const jsonMatch = result.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallbackDraft(message);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return fallbackDraft(message);
  }

  const extraction = extractionResultSchema.safeParse(parsed);
  if (!extraction.success) return fallbackDraft(message);

  const { confident, ...fields } = extraction.data;
  return {
    childId: null,
    provider: 'hero-email',
    externalReference: message.id,
    ...fields,
    sourceLink: null,
    needsReview: !confident,
  };
}
