'use client';

import { useState } from 'react';
import { CheckIcon, RepeatIcon, XIcon } from 'lucide-react';
import type { OrderLineItem } from '@/domain/schemas/orderHistory';
import { summariseCommonOrder } from '@/domain/services/orderHistory';
import { guessCategory } from '@/domain/services/categoryGuess';
import { useAgrocer } from '@/providers/AgrocerProvider';

/**
 * Quick-adds frequently bought items straight onto the shopping list, right where items are
 * normally added — the same underlying data and add logic as Settings' "Your common order",
 * just surfaced here too so building a list from buying habits doesn't need a trip to Settings.
 *
 * Empty until order history has been imported (Settings → Order history), and says so rather
 * than showing nothing with no explanation.
 */
export function CommonOrderQuickAdd({ onAdded }: { onAdded: (message: string) => void }) {
  const { shopping, products, listOrderHistory, addShoppingItem, addShoppingItems } = useAgrocer();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [orderHistory, setOrderHistory] = useState<OrderLineItem[]>([]);
  const [addingAll, setAddingAll] = useState(false);

  const commonOrder = summariseCommonOrder(orderHistory, { limit: 10 });

  // The real shopping list, not just what this panel has added this session — an item put on
  // the list yesterday, from anywhere, is still "already on the list" today.
  const onListNames = new Set(
    shopping.filter((item) => !item.checked).map((item) => item.name.trim().toLowerCase()),
  );
  const isOnList = (name: string) => onListNames.has(name.trim().toLowerCase());

  const draftFor = (entry: (typeof commonOrder)[number]) => ({
    name: entry.name,
    category: guessCategory(entry.name, products) ?? ('Pantry' as const),
    quantity: Math.max(1, Math.round(entry.typicalQuantity)),
    unit: entry.unit,
    price: 0,
    priority: false,
  });

  const addEntry = async (entry: (typeof commonOrder)[number]) => {
    if (isOnList(entry.name)) {
      onAdded(`${entry.name} is already on your shopping list.`);
      return;
    }
    await addShoppingItem(draftFor(entry));
    onAdded(`${entry.name} added to your shopping list.`);
  };

  const addAll = async () => {
    const toAdd = commonOrder.filter((entry) => !isOnList(entry.name));
    if (toAdd.length === 0) {
      onAdded('Everything in your common order is already on the list.');
      return;
    }
    setAddingAll(true);
    try {
      await addShoppingItems(toAdd.map(draftFor));
      const skipped = commonOrder.length - toAdd.length;
      onAdded(
        `${toAdd.length} item${toAdd.length === 1 ? '' : 's'} added to your shopping list.` +
          (skipped > 0 ? ` ${skipped} already on the list.` : ''),
      );
    } finally {
      setAddingAll(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (!loaded) void listOrderHistory().then((history) => { setOrderHistory(history); setLoaded(true); }).catch(() => setLoaded(true));
        }}
        className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-sm font-bold text-ink transition-colors duration-150 ease-out hover:bg-canvas"
      >
        <RepeatIcon className="h-4 w-4" /> Add from your common order
      </button>
    );
  }

  return (
    <section aria-label="Add from your common order" className="mb-3 rounded-2xl border border-moss-200 bg-moss-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-ink">Your common order</h2>
          <p className="text-xs text-muted">Items you buy most, from imported order history.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {!loaded ? (
        <p className="mt-3 text-sm text-muted">Loading…</p>
      ) : commonOrder.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No order history yet. Import past New World orders in Settings → Order history to build this list.
        </p>
      ) : (
        <>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void addAll()}
              disabled={addingAll}
              className="text-xs font-bold text-moss-700 disabled:opacity-50"
            >
              {addingAll ? 'Adding…' : 'Add all'}
            </button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {commonOrder.map((entry) => {
              const onList = isOnList(entry.name);
              return (
                <li key={entry.name} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-ink">
                    {entry.name}
                    {entry.matchedProductId ? <CheckIcon className="ml-1.5 inline h-3.5 w-3.5 text-moss-600" aria-label="Matched to a New World product" /> : null}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{entry.timesOrdered}×</span>
                  <button
                    type="button"
                    onClick={() => void addEntry(entry)}
                    disabled={onList}
                    className="shrink-0 rounded-full bg-moss-50 px-2.5 py-1 text-xs font-bold text-moss-700 disabled:opacity-50"
                  >
                    {onList ? 'On list' : 'Add'}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
