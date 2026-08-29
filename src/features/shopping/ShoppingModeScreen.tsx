'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2Icon, ChevronDownIcon, ScanLineIcon, XIcon } from 'lucide-react';
import { groupByCategory, summariseShopping } from '@/domain/services/shopping';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { EmptyState } from '@/components/agrocer/EmptyState';
import { ShoppingRow } from './components/ShoppingRow';
import { nzd } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Shopping Mode is its own route so it can be opened directly, survives a
 * refresh mid-shop, and gets the back button as a natural exit. The bottom nav
 * is hidden here — in the aisle the family only needs the list.
 */
export function ShoppingModeScreen() {
  const router = useRouter();
  const { shopping, household, toggleShoppingItem, clearChecked } = useAgrocer();
  const [showTrolley, setShowTrolley] = useState(false);

  const { remaining, checked, total, trolleyTotal, progress } = useMemo(
    () => summariseShopping(shopping),
    [shopping],
  );
  const groups = useMemo(() => groupByCategory(remaining), [remaining]);

  const exit = () => router.push('/shopping');

  return (
    <>
      <header className="shrink-0 bg-moss-700 px-5 pb-4 pt-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-moss-200">
              <ScanLineIcon className="h-3.5 w-3.5" /> Shopping mode
            </p>
            {/* This screen has no ScreenHeader, so the count is its h1. */}
            <h1 className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight">
              {remaining.length} left to grab
            </h1>
            <p className="mt-0.5 text-sm text-moss-100">
              {nzd(trolleyTotal)} in trolley · {nzd(total)} estimated
              {household.settings.weeklyBudget != null
                ? ` / ${nzd(household.settings.weeklyBudget)} budget`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={exit}
            className="flex h-10 items-center gap-1.5 rounded-full bg-white/15 px-3.5 text-sm font-semibold transition-colors duration-150 ease-out hover:bg-white/25"
          >
            <XIcon className="h-4 w-4" /> Exit
          </button>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main
        className="no-scrollbar relative flex-1 overflow-y-auto px-5 pt-4"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        {remaining.length === 0 ? (
          <EmptyState
            icon={CheckCircle2Icon}
            title="That’s everything"
            body={`All ${checked.length} items are in the trolley — ${nzd(trolleyTotal)} estimated. Nice work.`}
            actionLabel="Finish and clear list"
            onAction={() => {
              void clearChecked();
              exit();
            }}
          />
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.category} aria-label={group.category}>
                <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted">
                  {group.category}
                </h2>
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {group.items.map((item) => (
                    <ShoppingRow
                      key={item.id}
                      item={item}
                      shoppingMode
                      onToggle={() => void toggleShoppingItem(item.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {checked.length > 0 ? (
          <section className="mt-5" aria-label="In the trolley">
            <button
              type="button"
              onClick={() => setShowTrolley(!showTrolley)}
              aria-expanded={showTrolley}
              className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <span className="text-sm font-semibold text-ink">In the trolley · {checked.length}</span>
              <ChevronDownIcon
                className={cn(
                  'h-4 w-4 text-muted transition-transform duration-200 ease-out',
                  showTrolley && 'rotate-180',
                )}
              />
            </button>
            {showTrolley ? (
              <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line opacity-70">
                {checked.map((item) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    shoppingMode
                    onToggle={() => void toggleShoppingItem(item.id)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </>
  );
}
