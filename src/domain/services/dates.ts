import { DAY_KEYS, type DayKey } from '../schemas/common';

/**
 * Week/day derivation for the planner.
 *
 * ADR-005: the planner tracks the real current week by default. A pinned date
 * is supported for screenshots and deterministic tests, and is supplied by
 * household settings rather than hard-coded anywhere in the UI.
 */

export interface PlannerDay {
  key: DayKey;
  /** "Monday" */
  label: string;
  /** "Mon" */
  short: string;
  /** "24 Aug" */
  date: string;
  /** ISO yyyy-mm-dd, useful as a stable key and for Stage 2 persistence. */
  iso: string;
  isToday: boolean;
}

export interface PlannerWeek {
  days: PlannerDay[];
  todayKey: DayKey;
  /** "Week of 24–30 Aug" */
  label: string;
  /** "Wednesday 26 Aug" */
  todayLabel: string;
}

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const NZ_LOCALE = 'en-NZ';

/** Parses `yyyy-mm-dd` as a local-time date, avoiding the UTC shift `new Date(iso)` applies. */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Maps a JS day index (0 = Sunday) onto our Monday-first `DayKey`. */
export function dayKeyOf(date: Date): DayKey {
  const index = (date.getDay() + 6) % 7;
  return DAY_KEYS[index] ?? 'mon';
}

/** The Monday on or before `date`, at local midnight. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((date.getDay() + 6) % 7));
  return start;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat(NZ_LOCALE, { day: 'numeric', month: 'short' }).format(date);
}

/**
 * Builds the Monday-first week containing `today`.
 *
 * @param today the reference date — the real current date, or a pinned demo date.
 */
export function buildPlannerWeek(today: Date): PlannerWeek {
  const monday = startOfWeek(today);
  const todayKey = dayKeyOf(today);

  const days: PlannerDay[] = DAY_KEYS.map((key, index) => {
    const date = addDays(monday, index);
    return {
      key,
      label: DAY_LABELS[key],
      short: DAY_LABELS[key].slice(0, 3),
      date: formatDayMonth(date),
      iso: toIsoDate(date),
      isToday: key === todayKey,
    };
  });

  const first = days[0];
  const last = days[days.length - 1];
  const firstDate = first ? parseIsoDate(first.iso) : monday;
  const lastDate = last ? parseIsoDate(last.iso) : monday;

  // "24–30 Aug" when the week sits in one month, "29 Sep – 5 Oct" when it spans two.
  const sameMonth = firstDate.getMonth() === lastDate.getMonth();
  const range = sameMonth
    ? `${firstDate.getDate()}–${formatDayMonth(lastDate)}`
    : `${formatDayMonth(firstDate)} – ${formatDayMonth(lastDate)}`;

  return {
    days,
    todayKey,
    label: `Week of ${range}`,
    todayLabel: `${DAY_LABELS[todayKey]} ${formatDayMonth(today)}`,
  };
}

/** Rotates the week so today comes first — used by the Home "This week" rail. */
export function rotateToToday(days: PlannerDay[], todayKey: DayKey): PlannerDay[] {
  const index = days.findIndex((day) => day.key === todayKey);
  if (index <= 0) return days;
  return [...days.slice(index), ...days.slice(0, index)];
}
