'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ClockIcon, UsersIcon } from 'lucide-react';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { usePlannerWeek } from '@/providers/useToday';
import { findMeal, mealFor } from '@/domain/services/meals';
import { DashboardCard } from './DashboardCard';

/**
 * Tonight's dinner, read from the same plan the Meals screen writes.
 *
 * Like the shopping card, this waits for the real plan. `AgrocerProvider` starts from the
 * Stage 1 demo fixtures, which include a planned dinner — so without the gate the wall
 * announces a meal nobody planned.
 *
 * Cost and the missing-ingredient warning are deliberately absent: both need ingredient-level
 * matching against products and pantry, which belongs with the recipe work rather than being
 * approximated here. A wrong number on the kitchen wall is worse than no number.
 */
export function TonightCard() {
  const { meals, plan, hydrated } = useAgrocer();
  const week = usePlannerWeek();
  const tonight = findMeal(meals, mealFor(plan, week.todayKey, 'dinner'));

  return (
    <DashboardCard
      title="Tonight's meal"
      action={
        <Link
          href="/meals"
          className="rounded-full bg-moss-50 px-4 py-2 text-sm font-bold text-moss-700 transition-colors hover:bg-moss-100"
        >
          {hydrated && tonight ? 'Recipe' : 'Plan it'}
        </Link>
      }
    >
      {!hydrated ? (
        <p className="py-6 text-base text-muted">Loading…</p>
      ) : tonight ? (
        <div className="flex items-center gap-5">
          {tonight.image ? (
            <Image
              src={tonight.image}
              alt=""
              width={128}
              height={128}
              className="h-28 w-28 shrink-0 rounded-2xl object-cover"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-3xl font-extrabold leading-tight tracking-tight text-ink">
              {tonight.name}
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-4 text-base font-semibold text-muted">
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-5 w-5" /> {tonight.minutes} min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="h-5 w-5" /> Serves {tonight.serves}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <p className="py-6 text-lg text-muted">Nothing planned for tonight yet.</p>
      )}
    </DashboardCard>
  );
}
