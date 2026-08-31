import { describe, expect, it } from 'vitest';
import { localWallClock, parseIcs, upcomingEvents, type CalendarEvent } from './ics';

describe('parseIcs', () => {
  it('parses a real iCloud public-calendar export', () => {
    // Captured 2026-08-31 from a real "Public Calendar" share link, verified before writing
    // this parser rather than guessed at — see AGROCER_MASTER_PLAN.md's progress log.
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//caldav.icloud.com//CALDAVJ 2632B909//EN
X-WR-CALNAME:Family
X-APPLE-CALENDAR-COLOR:#FF2968
BEGIN:VEVENT
CREATED:20260831T083311Z
DTEND;TZID=Pacific/Auckland:20260901T100000
DTSTAMP:20260831T083312Z
DTSTART;TZID=Pacific/Auckland:20260901T090000
LAST-MODIFIED:20260831T083311Z
SEQUENCE:0
SUMMARY:Test event
UID:DF950DC0-520B-4632-9744-3B57227D59F5
URL;VALUE=URI:
X-APPLE-CREATOR-IDENTITY:com.apple.mobilecal
X-APPLE-CREATOR-TEAM-IDENTITY:0000000000
END:VEVENT
BEGIN:VTIMEZONE
TZID:Pacific/Auckland
BEGIN:STANDARD
DTSTART:19280304T020000
TZNAME:NZMT
TZOFFSETFROM:+1230
TZOFFSETTO:+1130
END:STANDARD
END:VTIMEZONE
END:VCALENDAR`;

    expect(parseIcs(ics)).toEqual([
      {
        uid: 'DF950DC0-520B-4632-9744-3B57227D59F5',
        title: 'Test event',
        start: '2026-09-01T09:00:00',
        end: '2026-09-01T10:00:00',
        allDay: false,
        location: null,
      },
    ]);
  });

  it('parses an all-day event (VALUE=DATE, no time component)', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:allday-1
SUMMARY:School holidays start
DTSTART;VALUE=DATE:20260910
DTEND;VALUE=DATE:20260911
END:VEVENT
END:VCALENDAR`;

    expect(parseIcs(ics)).toEqual([
      { uid: 'allday-1', title: 'School holidays start', start: '2026-09-10', end: '2026-09-11', allDay: true, location: null },
    ]);
  });

  it('captures a location and unescapes comma/newline/backslash text', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:loc-1
SUMMARY:Dentist\\, checkup
LOCATION:123 Example St\\, Christchurch
DTSTART:20260915T140000
END:VEVENT
END:VCALENDAR`;

    const [event] = parseIcs(ics);
    expect(event?.title).toBe('Dentist, checkup');
    expect(event?.location).toBe('123 Example St, Christchurch');
  });

  it('handles multiple events in one feed', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:a
SUMMARY:First
DTSTART:20260901T090000
END:VEVENT
BEGIN:VEVENT
UID:b
SUMMARY:Second
DTSTART:20260902T090000
END:VEVENT
END:VCALENDAR`;

    expect(parseIcs(ics).map((event) => event.uid)).toEqual(['a', 'b']);
  });

  it('skips a VALARM sub-block rather than mistaking its fields for the event\'s', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:alarm-1
SUMMARY:Real title
DTSTART:20260901T090000
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:This is a reminder, not the event
END:VALARM
END:VEVENT
END:VCALENDAR`;

    expect(parseIcs(ics)[0]?.title).toBe('Real title');
  });

  it('returns an empty array for a feed with no events', () => {
    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nX-WR-CALNAME:Family\nEND:VCALENDAR`;
    expect(parseIcs(ics)).toEqual([]);
  });

  it('skips an event with no UID rather than throwing', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:No uid
DTSTART:20260901T090000
END:VEVENT
END:VCALENDAR`;

    expect(parseIcs(ics)).toEqual([]);
  });

  it('falls back to a placeholder title when SUMMARY is missing', () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:no-title
DTSTART:20260901T090000
END:VEVENT
END:VCALENDAR`;

    expect(parseIcs(ics)[0]?.title).toBe('(untitled event)');
  });

  it('unfolds a continuation line split across two physical lines', () => {
    const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:fold-1\r\nSUMMARY:A very long ti\r\n tle that wraps\r\nDTSTART:20260901T090000\r\nEND:VEVENT\r\nEND:VCALENDAR';
    expect(parseIcs(ics)[0]?.title).toBe('A very long title that wraps');
  });
});

describe('localWallClock', () => {
  it('formats a Date using its own local getters, not UTC', () => {
    const date = new Date(2026, 8, 1, 9, 5, 3); // month is 0-indexed: September
    expect(localWallClock(date)).toBe('2026-09-01T09:05:03');
  });

  it('pads single-digit months, days, hours, minutes and seconds', () => {
    const date = new Date(2026, 0, 5, 3, 4, 5);
    expect(localWallClock(date)).toBe('2026-01-05T03:04:05');
  });
});

describe('upcomingEvents', () => {
  const timed = (uid: string, start: string): CalendarEvent => ({
    uid, title: uid, start, end: null, allDay: false, location: null,
  });
  const allDay = (uid: string, start: string): CalendarEvent => ({
    uid, title: uid, start, end: null, allDay: true, location: null,
  });

  it('drops events already in the past', () => {
    const events = [timed('past', '2026-08-01T09:00:00'), timed('future', '2026-09-01T09:00:00')];
    expect(upcomingEvents(events, '2026-08-31T00:00:00').map((e) => e.uid)).toEqual(['future']);
  });

  it('keeps an all-day event for the rest of today, even after the wall-clock time has passed', () => {
    const events = [allDay('today', '2026-08-31')];
    expect(upcomingEvents(events, '2026-08-31T23:00:00').map((e) => e.uid)).toEqual(['today']);
  });

  it('sorts soonest first', () => {
    const events = [timed('later', '2026-09-05T09:00:00'), timed('sooner', '2026-09-02T09:00:00')];
    expect(upcomingEvents(events, '2026-09-01T00:00:00').map((e) => e.uid)).toEqual(['sooner', 'later']);
  });

  it('limits the result', () => {
    const events = [timed('a', '2026-09-01T09:00:00'), timed('b', '2026-09-02T09:00:00'), timed('c', '2026-09-03T09:00:00')];
    expect(upcomingEvents(events, '2026-08-31T00:00:00', 2)).toHaveLength(2);
  });
});
