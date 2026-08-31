import { NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { createDrizzleRepositories } from '@/data/drizzle/drizzleRepositories';
import { getSummaryAiProvider } from '@/ai/provider';
import { gmailConfigFromEnv } from '@/school/gmail';
import { ingestHeroEmails } from '@/school/heroIngest';

/**
 * Triggers one Hero email ingestion pass (Phase 13). Called by a cron job on the homelab host,
 * never by a signed-in user — there is no household to resolve from a session, so this route
 * is authenticated by a shared secret instead and reads the household from
 * `AGROCER_HOUSEHOLD_ID`, same as the no-auth escape hatch in `src/server/repositories.ts`, but
 * for a legitimate service-to-service call rather than a dev convenience.
 *
 * `HERO_POLL_SECRET` must be set for this route to do anything at all — no secret configured
 * means no polling is possible, not an open endpoint.
 */

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const expectedSecret = process.env.HERO_POLL_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: 'HERO_POLL_SECRET is not configured' }, { status: 501 });
  }
  if (request.headers.get('x-hero-poll-secret') !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const householdId = process.env.AGROCER_HOUSEHOLD_ID;
  const senderDomain = process.env.HERO_SENDER_DOMAIN;
  if (!householdId || !senderDomain) {
    return NextResponse.json(
      { error: 'AGROCER_HOUSEHOLD_ID and HERO_SENDER_DOMAIN must both be set' },
      { status: 501 },
    );
  }

  try {
    const repositories = createDrizzleRepositories(getDb(), householdId);
    const [household, gmail] = await Promise.all([
      repositories.household.get(),
      Promise.resolve(gmailConfigFromEnv()),
    ]);

    const result = await ingestHeroEmails({
      gmail,
      senderDomain,
      aiProvider: getSummaryAiProvider(),
      school: repositories.school,
      members: household.members,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[hero-poll]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ingestion failed' },
      { status: 500 },
    );
  }
}
