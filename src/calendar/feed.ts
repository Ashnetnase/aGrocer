import { parseIcs, type CalendarEvent } from './ics';

/**
 * Fetches and parses the family calendar (`FAMILY_CALENDAR_ICS_URL` — an iOS "Public Calendar"
 * share link). Server-only: the URL grants read access to whoever has it, so it stays out of
 * the client bundle the same way any other credential-shaped value does, even though it is
 * "just a link" rather than a login.
 *
 * No caching layer here on purpose — a family calendar changes rarely enough that a plain
 * per-request fetch is simpler than a cache invalidation story, and iCloud's public-calendar
 * endpoint is not rate-limited for the traffic one household's dashboard generates.
 */
export async function fetchFamilyCalendarEvents(): Promise<CalendarEvent[]> {
  const configured = process.env.FAMILY_CALENDAR_ICS_URL;
  if (!configured) return [];

  // iOS shares a webcal:// URL; that scheme means "subscribe to this over HTTPS" and every
  // plain HTTP client (including fetch) needs the literal https:// form to follow it.
  const url = configured.replace(/^webcal:\/\//i, 'https://');

  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Family calendar feed answered ${response.status}`);
  }

  return parseIcs(await response.text());
}
