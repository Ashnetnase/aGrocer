import type { CalendarEvent } from './ics';

export async function listFamilyCalendarEvents(): Promise<CalendarEvent[]> {
  const response = await fetch('/api/calendar');
  if (!response.ok) throw new Error('Could not load the family calendar');
  const body = (await response.json()) as { events?: CalendarEvent[] };
  return body.events ?? [];
}
