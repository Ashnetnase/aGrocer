'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBasketIcon } from 'lucide-react';
import type { ShoppingItem, ShoppingItemDraft } from '@/domain/schemas/shopping';
import {
  groupByCategory,
  summariseShopping,
  summariseShoppingBudget,
} from '@/domain/services/shopping';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { EmptyState } from '@/components/agrocer/EmptyState';
import { FloatingAddButton } from '@/components/agrocer/FloatingAddButton';
import { ShoppingRow } from './components/ShoppingRow';
import { ShoppingItemSheet } from './components/ShoppingItemSheet';
import { nzd } from '@/lib/format';
import { cn } from '@/lib/utils';

export function ShoppingScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    shopping,
    household,
    toggleShoppingItem,
    addShoppingItem,
    updateShoppingItem,
    removeShoppingItem,
    clearChecked,
  } = useAgrocer();

  const [sheetOpen, setSheetOpen] = useState(searchParams.get('add') === '1');
  const [editing, setEditing] = useState<ShoppingItem | null>(null);

  const { remaining, checked, total, progress } = useMemo(() => summariseShopping(shopping), [shopping]);
  const budget = summariseShoppingBudget(total, household.settings.weeklyBudget);
  const groups = useMemo(() => groupByCategory(shopping), [shopping]);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const handleSave = (draft: ShoppingItemDraft) => {
    if (editing) void updateShoppingItem(editing.id, draft);
    else void addShoppingItem(draft);
  };

  return (
    <>
      <ScreenHeader title="Shopping" subtitle={`${remaining.length} to buy · ${household.settings.shopLabel}`}>
        <div className="rounded-3xl border border-line bg-surface p-4 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-muted">In the trolley</p>
              <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-ink">
                {checked.length} of {shopping.length}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-muted">Estimated total</p>
              <p className="mt-0.5 text-[22px] font-extrabold leading-tight tracking-tight text-moss-700">
                {nzd(total)}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-moss-500" style={{ width: `${progress}%` }} />
          </div>
          {budget ? (
            <div className="mt-3 rounded-2xl bg-canvas px-3 py-2.5">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span className="text-muted">Weekly budget {nzd(budget.target)}</span>
                <span className={budget.over ? 'text-berry-600' : 'text-moss-700'}>
                  {budget.over
                    ? `${nzd(Math.abs(budget.remaining))} over`
                    : `${nzd(budget.remaining)} left`}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={cn(
                    'h-full rounded-full',
                    budget.over ? 'bg-berry-500' : 'bg-moss-500',
                  )}
                  style={{ width: `${budget.progress}%` }}
                />
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/shopping/mode')}
            disabled={shopping.length === 0}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:bg-line disabled:text-muted"
          >
            <ShoppingBasketIcon className="h-[18px] w-[18px]" /> Start shopping mode
          </button>
        </div>
      </ScreenHeader>

      <main className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
        {shopping.length === 0 ? (
          <EmptyState
            icon={ShoppingBasketIcon}
            title="Nothing on the list"
            body="Add what the family needs, or pull staples straight from your Products list."
            actionLabel="Add an item"
            onAction={openAdd}
          />
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.category} aria-label={group.category}>
                <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                  {group.category}
                </h2>
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {group.items.map((item) => (
                    <ShoppingRow
                      key={item.id}
                      item={item}
                      shoppingMode={false}
                      onToggle={() => void toggleShoppingItem(item.id)}
                      onEdit={() => {
                        setEditing(item);
                        setSheetOpen(true);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {checked.length > 0 ? (
          <button
            type="button"
            onClick={() => void clearChecked()}
            className="mt-5 w-full rounded-2xl border border-line bg-surface py-3 text-sm font-semibold text-muted transition-colors duration-150 ease-out hover:text-ink"
          >
            Clear {checked.length} bought items
          </button>
        ) : null}
      </main>

      <FloatingAddButton label="Add shopping item" onClick={openAdd} />

      <ShoppingItemSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        item={editing}
        onSave={handleSave}
        onDelete={editing ? () => void removeShoppingItem(editing.id) : undefined}
      />
    </>
  );
}
