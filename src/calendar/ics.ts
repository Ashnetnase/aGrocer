import { z } from 'zod';

/**
 * Read-only iCalendar (RFC 5545) parsing for the family calendar (Phase 12 — one iPhone
 * publishes a "Public Calendar", Agrocer reads it, both phones see the result in-app).
 *
 * Deliberately a small, hand-written parser rather than a library: the only thing this reads
 * is `VEVENT` blocks from one known source (iCloud's public-calendar export), and the fields
 * that matter — title, start, end, location — are a tiny slice of the full spec.
 *
 * **Not supported, on purpose:** `RRULE` recurrence expansion. A recurring event's `VEVENT`
 * still parses — it just shows once, at its own `DTSTART`, not as a series. Expanding
 * recurrence rules correctly (including exceptions) is real complexity with no upcoming need;
 * add it if a recurring event turns out to matter, not speculatively.
 *
 * The household is single-timezone (NZ), so `DTSTART`/`DTEND` are read as wall-clock local
 * time and displayed as-is — deliberately not converted through a `TZID`/UTC timezone
 * database, which would be real complexity bought for nothing this app needs.
 */

export const calendarEventSchema = z.object({
  uid: z.string(),
  title: z.string(),
  /** `YYYY-MM-DD` for an all-day event, `YYYY-MM-DDTHH:mm:ss` otherwise. Local wall-clock time. */
  start: z.string(),
  end: z.string().nullable(),
  allDay: z.boolean(),
  location: z.string().nullable(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

/** Joins RFC 5545's folded continuation lines (a line starting with a space or tab). */
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

/** `\n`, `\,`, `\;`, `\\` — the only escapes RFC 5545 text values use. */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

interface ParsedLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseLine(line: string): ParsedLine | null {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const head = line.slice(0, colonIndex);
  const value = line.slice(colonIndex + 1);
  const [name, ...paramParts] = head.split(';');
  if (!name) return null;

  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const [key, val] = part.split('=');
    if (key && val !== undefined) params[key.toUpperCase()] = val;
  }

  return { name: name.toUpperCase(), params, value };
}

/** `YYYYMMDD` or `YYYYMMDDTHHMMSS[Z]` → `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`. */
function formatDateValue(raw: string): { formatted: string; allDay: boolean } {
  const digits = raw.replace('Z', '');
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);

  if (digits.length === 8) return { formatted: `${year}-${month}-${day}`, allDay: true };

  const hour = digits.slice(9, 11) || '00';
  const minute = digits.slice(11, 13) || '00';
  const second = digits.slice(13, 15) || '00';
  return { formatted: `${year}-${month}-${day}T${hour}:${minute}:${second}`, allDay: false };
}

/** Strips `VALARM` sub-blocks before field extraction — their own `DESCRIPTION` etc. must not
 * be mistaken for the event's. */
function stripAlarms(block: string): string {
  return block.replace(/BEGIN:VALARM[\s\S]*?END:VALARM\r?\n?/g, '');
}

function parseEvent(block: string): CalendarEvent | null {
  const lines = unfold(stripAlarms(block)).split(/\r?\n/);

  let uid: string | null = null;
  let title = '';
  let location: string | null = null;
  let start: string | null = null;
  let end: string | null = null;
  let allDay = false;

  for (const rawLine of lines) {
    const parsed = parseLine(rawLine);
    if (!parsed) continue;

    switch (parsed.name) {
      case 'UID':
        uid = parsed.value;
        break;
      case 'SUMMARY':
        title = unescapeText(parsed.value);
        break;
      case 'LOCATION':
        location = unescapeText(parsed.value) || null;
        break;
      case 'DTSTART': {
        const { formatted, allDay: isAllDay } = formatDateValue(parsed.value);
        start = formatted;
        allDay = isAllDay;
        break;
      }
      case 'DTEND':
        end = formatDateValue(parsed.value).formatted;
        break;
      default:
        break;
    }
  }

  if (!uid || !start) return null;
  return { uid, title: title || '(untitled event)', start, end, allDay, location };
}

/** Every `VEVENT` block in a raw `.ics` document, most fields best-effort — a malformed or
 * unsupported event is skipped, never thrown, since one bad event must not blank the calendar. */
export function parseIcs(text: string): CalendarEvent[] {
  const blocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  const events: CalendarEvent[] = [];
  for (const block of blocks) {
    const event = parseEvent(block);
    if (event) events.push(event);
  }
  return events;
}

/**
 * Upcoming events only, soonest first. `nowLocal` is the household's own wall-clock "now" —
 * `YYYY-MM-DDTHH:mm:ss`, e.g. from `localWallClock(new Date())` in the browser — never a
 * server-computed UTC time, because event times are stored as the wall-clock values iCloud
 * published (see the module doc comment), and a UTC "now" would be off by NZ's whole offset.
 */
export function upcomingEvents(events: CalendarEvent[], nowLocal: string, limit = 10): CalendarEvent[] {
  const today = nowLocal.slice(0, 10);
  return events
    .filter((event) => (event.allDay ? event.start >= today : event.start >= nowLocal))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit);
}

/** The runtime's own local wall-clock time, formatted to match `CalendarEvent.start`. Never
 * `Date.toISOString()`, which is always UTC regardless of the runtime's timezone. */
export function localWallClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
