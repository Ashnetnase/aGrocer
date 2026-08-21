import { describe, expect, it } from 'vitest';
import { addDays, buildPlannerWeek, dayKeyOf, parseIsoDate, rotateToToday, startOfWeek, toIsoDate } from './dates';

describe('parseIsoDate', () => {
  it('parses as local time, not UTC', () => {
    const date = parseIsoDate('2026-08-22');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(22);
  });

  it('round-trips through toIsoDate', () => {
    expect(toIsoDate(parseIsoDate('2026-01-05'))).toBe('2026-01-05');
  });
});

describe('dayKeyOf', () => {
  it('treats Monday as the first day of the week', () => {
    expect(dayKeyOf(parseIsoDate('2026-08-17'))).toBe('mon');
    expect(dayKeyOf(parseIsoDate('2026-08-22'))).toBe('sat');
    expect(dayKeyOf(parseIsoDate('2026-08-23'))).toBe('sun');
  });
});

describe('startOfWeek', () => {
  it('returns the Monday of the containing week', () => {
    expect(toIsoDate(startOfWeek(parseIsoDate('2026-08-22')))).toBe('2026-08-17');
  });

  it('returns the same day when given a Monday', () => {
    expect(toIsoDate(startOfWeek(parseIsoDate('2026-08-17')))).toBe('2026-08-17');
  });

  it('walks back into the previous month on a Sunday', () => {
    // Sunday 1 Nov 2026 belongs to the week starting Monday 26 Oct.
    expect(toIsoDate(startOfWeek(parseIsoDate('2026-11-01')))).toBe('2026-10-26');
  });
});

describe('addDays', () => {
  it('rolls over month boundaries', () => {
    expect(toIsoDate(addDays(parseIsoDate('2026-08-30'), 3))).toBe('2026-09-02');
  });
});

describe('buildPlannerWeek', () => {
  it('builds seven Monday-first days and marks today', () => {
    const week = buildPlannerWeek(parseIsoDate('2026-08-22'));
    expect(week.days).toHaveLength(7);
    expect(week.days.map((day) => day.key)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
    expect(week.todayKey).toBe('sat');
    expect(week.days.filter((day) => day.isToday)).toHaveLength(1);
    expect(week.days[0]?.iso).toBe('2026-08-17');
    expect(week.days[6]?.iso).toBe('2026-08-23');
  });

  it('labels a week that sits inside one month as a compact range', () => {
    expect(buildPlannerWeek(parseIsoDate('2026-08-22')).label).toBe('Week of 17–23 Aug');
  });

  it('spells out both months when the week spans two', () => {
    // Mon 28 Sep – Sun 4 Oct 2026.
    expect(buildPlannerWeek(parseIsoDate('2026-09-30')).label).toBe('Week of 28 Sept – 4 Oct');
  });

  it('describes today for the home header', () => {
    expect(buildPlannerWeek(parseIsoDate('2026-08-22')).todayLabel).toBe('Saturday 22 Aug');
  });
});

describe('rotateToToday', () => {
  it('puts today first and keeps the rest of the week in order', () => {
    const week = buildPlannerWeek(parseIsoDate('2026-08-22'));
    const rotated = rotateToToday(week.days, week.todayKey);
    expect(rotated.map((day) => day.key)).toEqual(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']);
  });

  it('leaves the week untouched when today is Monday', () => {
    const week = buildPlannerWeek(parseIsoDate('2026-08-17'));
    expect(rotateToToday(week.days, week.todayKey)).toEqual(week.days);
  });
});
