'use client';

import { useEffect, useState } from 'react';
import { listFamilyCalendarEvents } from '@/calendar/client';
import { localWallClock, upcomingEvents, type CalendarEvent } from '@/calendar/ics';
import { DashboardCard } from './DashboardCard';

/**
 * The family calendar (Phase 12), read-only from one iPhone's iCloud "Public Calendar" share
 * link — see `src/calendar/`. Real as of 2026-08-31; the dashboard's last remaining placeholder
 * beyond Reminders (Phase 11).
 */

function parseLocal(value: string): Date {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = (datePart ?? '').split('-').map(Number);
  if (!timePart) return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0);
}

const dayFormatter = new Intl.DateTimeFormat('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('en-NZ', { hour: 'numeric', minute: '2-digit' });

function formatEvent(event: CalendarEvent): string {
  const day = dayFormatter.format(parseLocal(event.start));
  return event.allDay ? day : `${day}, ${timeFormatter.format(parseLocal(event.start))}`;
}

export function ScheduleCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void listFamilyCalendarEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoaded(true));
  }, []);

  const upcoming = upcomingEvents(events, localWallClock(new Date()), 5);

  return (
    <DashboardCard title="Family schedule">
      {!loaded ? (
        <p className="py-6 text-base text-muted">Loading…</p>
      ) : upcoming.length === 0 ? (
        <p className="py-6 text-base text-muted">Nothing coming up.</p>
      ) : (
        <ul>
          {upcoming.map((event) => (
            <li key={event.uid} className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-0">
              <span className="min-w-0 truncate text-lg font-semibold text-ink">{event.title}</span>
              <span className="shrink-0 text-sm font-bold text-muted">{formatEvent(event)}</span>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}
