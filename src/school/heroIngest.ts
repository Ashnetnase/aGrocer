import type { AiProvider } from '@/ai/types';
import type { SchoolRepository } from '@/data/repositories/types';
import type { HouseholdMember } from '@/domain/schemas/household';
import type { SchoolNotification } from '@/domain/schemas/school';
import { matchChildByName } from '@/domain/services/school';
import { extractHeroNotification } from './heroExtraction';
import { getMessage, listRecentMessagesFrom, type GmailConfig } from './gmail';

export interface HeroIngestResult {
  found: number;
  /** Processed through extraction and `school.add()` — includes messages already ingested by
   * an earlier poll, since `add()` is idempotent and this loop has no way to tell new from
   * already-there without the repository reporting it. */
  processed: number;
  skippedWrongSender: number;
}

/**
 * Fetches recent mail from the Hero sender domain, extracts each into a `SchoolNotification`,
 * and writes it. Safe to call repeatedly — `SchoolRepository.add()` is idempotent on
 * `(household, provider, externalReference)`, so a message already ingested is a no-op, not a
 * duplicate row. This is the whole ingestion pipeline; the route handler around it only adds
 * authentication and a household.
 */
export async function ingestHeroEmails(options: {
  gmail: GmailConfig;
  senderDomain: string;
  aiProvider: AiProvider;
  school: SchoolRepository;
  members: HouseholdMember[];
}): Promise<HeroIngestResult> {
  const summaries = await listRecentMessagesFrom(options.gmail, options.senderDomain);

  let processed = 0;
  let skippedWrongSender = 0;

  for (const summary of summaries) {
    // Defense in depth beyond Gmail's own search match — only a From address that actually
    // ends in the approved domain is trusted as a real Hero source (CLAUDE.md: "confirm it is
    // an approved Hero source"). Gmail's `from:` search can match more loosely than this.
    const fromAddress = summary.from.match(/<([^>]+)>/)?.[1] ?? summary.from;
    if (!fromAddress.toLowerCase().endsWith(`@${options.senderDomain.toLowerCase()}`)) {
      skippedWrongSender += 1;
      continue;
    }

    const message = await getMessage(options.gmail, summary.id);
    const draft = await extractHeroNotification(options.aiProvider, message);
    const childId = matchChildByName(options.members, `${draft.title} ${draft.summary}`);

    const notification: SchoolNotification = await options.school.add({ ...draft, childId });
    void notification; // repository dedups; this loop doesn't need to distinguish new vs. existing
    processed += 1;
  }

  return { found: summaries.length, processed, skippedWrongSender };
}
