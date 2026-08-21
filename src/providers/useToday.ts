'use client';

import { useEffect, useState } from 'react';
import { buildPlannerWeek, parseIsoDate, type PlannerWeek } from '@/domain/services/dates';
import { useAgrocer } from './AgrocerProvider';

/**
 * The reference "today" for the planner (ADR-005).
 *
 * Real current date by default; household settings can pin a demo date for
 * screenshots and deterministic walkthroughs. The date is re-read whenever the
 * tab becomes visible again, so an app left open overnight rolls over to the
 * new day instead of showing yesterday's plan.
 *
 * Only ever runs on the client — the app content sits behind a hydration gate,
 * so server and client can never disagree about what day it is.
 */
export function useToday(): Date {
  const { household } = useAgrocer();
  const { pinDemoDate, pinnedDate } = household.settings;

  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return pinDemoDate ? parseIsoDate(pinnedDate) : now;
}

export function usePlannerWeek(): PlannerWeek {
  return buildPlannerWeek(useToday());
}
