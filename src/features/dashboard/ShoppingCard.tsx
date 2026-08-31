'use client';

import Link from 'next/link';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { summariseShopping, summariseShoppingBudget } from '@/domain/services/shopping';
import { nzd, pluralise } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DashboardCard } from './DashboardCard';

/**
 * The shopping card, backed by the same repositories as the phone app — one source of truth,
 * never a tablet-specific copy of the list.
 *
 * **Nothing renders until the real list has loaded**, and a failed load says so rather than
 * showing "Loading…" for ever — on a wall tablet that reads as a slow network, and nobody
 * investigates a slow network.
 *
 * `AgrocerProvider` used to seed its initial state with the Stage 1 demo fixtures, which made
 * this gate essential: the kitchen wall showed a convincing fake list until the fetch
 * resolved, and on 2026-08-29 it was mistaken for the family's real one. That seeding is gone
 * now, so the gate is belt and braces — worth keeping, because the failure it prevents is a
 * wall display confidently showing groceries nobody needs.
 *
 * Items are checkable straight from the wall, because that is the whole point of a tablet in
 * the kitchen. Adding an item opens the full list rather than putting a keyboard on the wall:
 * the quick-add control belongs here eventually, but a half-working one would be worse than a
 * clear handoff to the screen that already does it properly.
 */

/** Enough to fill the card without spilling; the rest are summarised in the footer. */
const VISIBLE = 6;

export function ShoppingCard({ className }: { className?: string }) {
  const { shopping, household, toggleShoppingItem, hydrated, loadFailed } = useAgrocer();
  const summary = summariseShopping(shopping);
  const budget = summariseShoppingBudget(summary.total, household.settings.weeklyBudget);
  const visible = shopping.slice(0, VISIBLE);
  const hidden = shopping.length - visible.length;

  return (
    <DashboardCard
      className={className}
      title="Shopping"
      meta={
        hydrated && shopping.length
          ? `${pluralise(summary.remaining.length, 'item')} left · ${nzd(summary.total)}${
              budget ? ` / ${nzd(budget.target)}` : ''
            }`
          : undefined
      }
      action={
        <Link
          href="/shopping"
          className="rounded-full bg-moss-50 px-4 py-2 text-sm font-bold text-moss-700 transition-colors hover:bg-moss-100"
        >
          Open list
        </Link>
      }
    >
      {loadFailed ? (
        // Distinguished from loading on purpose: a wall tablet showing "Loading…" for ever
        // looks like a slow network, and nobody investigates a slow network.
        <p className="py-6 text-base font-semibold text-clay-600">
          Could not reach the household data.
        </p>
      ) : !hydrated ? (
        <p className="py-6 text-base text-muted">Loading…</p>
      ) : shopping.length === 0 ? (
        <p className="py-6 text-base text-muted">Nothing on the list.</p>
      ) : (
        <ul className="grid gap-1 sm:grid-cols-2">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void toggleShoppingItem(item.id)}
                aria-pressed={item.checked}
                // Tall enough to hit reliably with a thumb while holding something else.
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-canvas"
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    item.checked
                      ? 'border-moss-600 bg-moss-600 text-white'
                      : 'border-line bg-surface',
                  )}
                >
                  {item.checked ? <CheckIcon className="h-4 w-4" strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    'truncate text-lg font-semibold',
                    item.checked ? 'text-muted line-through' : 'text-ink',
                  )}
                >
                  {item.name}
                </span>
                {item.quantity > 1 ? (
                  <span className="ml-auto shrink-0 text-sm font-semibold text-muted">
                    ×{item.quantity}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Link
          href="/shopping"
          className="inline-flex items-center gap-2 rounded-full bg-moss-700 px-5 py-3 text-base font-bold text-white transition-colors hover:bg-moss-800"
        >
          <PlusIcon className="h-5 w-5" strokeWidth={2.5} /> Add item
        </Link>
        {hidden > 0 ? (
          <span className="text-sm font-semibold text-muted">+{hidden} more on the list</span>
        ) : null}
      </div>
    </DashboardCard>
  );
}
