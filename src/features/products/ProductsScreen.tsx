'use client';

import { useMemo, useState } from 'react';
import { CarrotIcon, CheckIcon, PackageSearchIcon, ShoppingCartIcon, StarIcon } from 'lucide-react';
import { CATEGORIES, type Category } from '@/domain/schemas/common';
import { isOnList } from '@/domain/services/shopping';
import { findProductAlternatives } from '@/domain/services/productAlternatives';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { FilterChips, SearchField } from '@/components/agrocer/Field';
import { EmptyState } from '@/components/agrocer/EmptyState';
import { nzd } from '@/lib/format';
import { fuzzyMatch } from '@/lib/search';
import { cn } from '@/lib/utils';

const FILTERS = ['Favourites', 'All', ...CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

export function ProductsScreen() {
  const { products, shopping, pantry, addShoppingItem, addPantryItem, toggleFavourite } = useAgrocer();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('Favourites');

  const visible = useMemo(() => {
    return products
      .filter((product) => {
        const matchesQuery = fuzzyMatch(`${product.name} ${product.brand}`, query);
        const matchesFilter =
          filter === 'All'
            ? true
            : filter === 'Favourites'
              ? product.favourite
              : product.category === (filter as Category);
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => b.timesBought - a.timesBought);
  }, [products, query, filter]);

  return (
    <>
      <ScreenHeader title="Products" subtitle="The things you buy again and again">
        <div className="space-y-3">
          <SearchField value={query} onChange={setQuery} placeholder="Search your usuals" />
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} ariaLabel="Filter products" />
        </div>
      </ScreenHeader>

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {visible.length === 0 ? (
          <EmptyState
            icon={PackageSearchIcon}
            title="No products here yet"
            body={
              filter === 'Favourites'
                ? 'Star the products your family buys most and they’ll appear here for one-tap adding.'
                : `Nothing matches “${query}”. Try a different word or another category.`
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((product) => {
              const alternatives = findProductAlternatives(product, products);
              const onList = isOnList(shopping, product.name);
              const inPantry = pantry.some(
                (item) => item.name.toLowerCase() === product.name.toLowerCase(),
              );
              return (
                <li key={product.id} className="rounded-2xl border border-line bg-surface p-3.5">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[15px] font-bold text-ink">{product.name}</p>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {product.brand} · {product.size}
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-ink">
                        {nzd(product.price)}
                        <span className="ml-2 text-xs font-medium text-muted">
                          usually {product.defaultQuantity} × {product.unit}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void toggleFavourite(product.id)}
                      aria-pressed={product.favourite}
                      aria-label={`${product.favourite ? 'Unfavourite' : 'Favourite'} ${product.name}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 ease-out hover:bg-canvas"
                    >
                      <StarIcon
                        className={cn(
                          'h-[18px] w-[18px]',
                          product.favourite ? 'fill-honey-500 text-honey-500' : 'text-muted',
                        )}
                      />
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={onList}
                      onClick={() =>
                        void addShoppingItem({
                          name: product.name,
                          category: product.category,
                          quantity: product.defaultQuantity,
                          unit: product.unit,
                          price: product.price,
                          priority: false,
                          note: undefined,
                        })
                      }
                      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-moss-600 text-[13.5px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:bg-moss-50 disabled:text-moss-600"
                    >
                      {onList ? <CheckIcon className="h-4 w-4" /> : <ShoppingCartIcon className="h-4 w-4" />}
                      {onList ? 'On the list' : 'Add to list'}
                    </button>
                    <button
                      type="button"
                      disabled={inPantry}
                      onClick={() =>
                        void addPantryItem({
                          name: product.name,
                          category: product.category,
                          quantity: product.defaultQuantity,
                          unit: product.unit,
                          state: 'good',
                          note: undefined,
                        })
                      }
                      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line disabled:text-muted"
                    >
                      {inPantry ? <CheckIcon className="h-4 w-4" /> : <CarrotIcon className="h-4 w-4" />}
                      {inPantry ? 'In pantry' : 'Add to pantry'}
                    </button>
                  </div>
                  {alternatives.length > 0 ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>Alternatives:</span>
                      {alternatives.map((item) => (
                        <button key={item.id} type="button" onClick={() => void addShoppingItem({ name: item.name, category: item.category, quantity: item.defaultQuantity, unit: item.unit, price: item.price, priority: false, note: undefined })} className="rounded-full border border-line px-2 py-1 font-semibold text-ink hover:bg-canvas">
                          {item.name} ({nzd(item.price)})
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
