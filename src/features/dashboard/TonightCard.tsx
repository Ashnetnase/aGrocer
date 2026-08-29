'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangleIcon, ClockIcon, UsersIcon } from 'lucide-react';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { usePlannerWeek } from '@/providers/useToday';
import { findMeal, mealFor } from '@/domain/services/meals';
import { describeIngredient, matchMealToPantry } from '@/domain/services/recipeMatch';
import { DashboardCard } from './DashboardCard';

/**
 * Tonight's dinner, read from the same plan the Meals screen writes.
 *
 * Like the shopping card, this waits for the real plan, and reports a failed load rather than
 * loading for ever. `AgrocerProvider` no longer starts from the demo fixtures — it used to,
 * and the wall announced a dinner nobody had planned.
 *
 * **The missing-ingredient warning is real as of Stage 4**, built on pantry-to-recipe
 * matching. It answers the question the card is looked at for: can we actually make this
 * tonight?
 *
 * Cost is still deliberately absent. The warning needs only to know whether an ingredient is
 * *present*; a cost needs quantities and prices per ingredient, which the free-text
 * ingredient list cannot give. A wrong number on the kitchen wall is worse than no number.
 */
export function TonightCard() {
  const { meals, plan, pantry, hydrated, loadFailed } = useAgrocer();
  const week = usePlannerWeek();
  const tonight = findMeal(meals, mealFor(plan, week.todayKey, 'dinner'));
  const match = tonight ? matchMealToPantry(tonight, pantry) : undefined;

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
      {loadFailed ? (
        <p className="py-6 text-base font-semibold text-clay-600">
          Could not reach the household data.
        </p>
      ) : !hydrated ? (
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

            {/*
              Only ever shown when there is something to say. A card that reports "0 missing"
              every night trains the family to stop reading it, and then it is useless on the
              one night it matters.
            */}
            {match && match.missing.length > 0 ? (
              <p className="mt-3 flex items-start gap-2 text-base font-bold text-clay-600">
                <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <span>
                  Need {match.missing.map(describeIngredient).join(', ')}
                </span>
              </p>
            ) : null}

            {match && match.missing.length === 0 && match.low.length > 0 ? (
              <p className="mt-3 text-base font-semibold text-muted">
                Running low on {match.low.map(describeIngredient).join(', ')}
              </p>
            ) : null}

            {match && match.canCook && match.low.length === 0 && match.totalCount > 0 ? (
              <p className="mt-3 text-base font-semibold text-moss-700">
                Everything&rsquo;s in
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="py-6 text-lg text-muted">Nothing planned for tonight yet.</p>
      )}
    </DashboardCard>
  );
}
