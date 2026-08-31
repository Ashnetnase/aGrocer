import { NextResponse } from 'next/server';
import { fetchFamilyCalendarEvents } from '@/calendar/feed';
import { serverRepositories } from '@/server/repositories';
import { failed } from '@/server/http';

/**
 * The family calendar (Phase 12) — read-only, sourced from one iPhone's iCloud "Public
 * Calendar" share link (`FAMILY_CALENDAR_ICS_URL`). Requires a signed-in session like every
 * other route, even though the events themselves are not stored per-household in Postgres —
 * `serverRepositories()` is what actually enforces that, the same guard `/api/specials` uses
 * for the same reason (external, unauthenticated data still sits behind Agrocer's own auth).
 *
 * Filtering to "upcoming" and sorting happens client-side (`upcomingEvents()`), not here — the
 * household's own browser is in the household's own timezone, and a server container's clock
 * is not a safe stand-in for that (see `src/calendar/ics.ts`'s module comment).
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await serverRepositories();
    const events = await fetchFamilyCalendarEvents();
    return NextResponse.json({ events });
  } catch (error) {
    return failed(error);
  }
}
