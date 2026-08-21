import React, { useMemo, useState } from 'react';
import { CarrotIcon, CheckIcon, PackageSearchIcon, ShoppingCartIcon, StarIcon } from 'lucide-react';
import { useAgrocer } from '../contexts/AgrocerContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { CATEGORIES } from '../types';
import { nzd } from '../utils/format';

const filters = ['Favourites', 'All', ...CATEGORIES];

export function Products() {
  const { products, addShoppingItem, addPantryItem, shopping } = useAgrocer();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Favourites');
  const [favourites, setFavourites] = useState<string[]>(products.filter((p) => p.favourite).map((p) => p.id));
  const [addedToPantry, setAddedToPantry] = useState<string[]>([]);

  const visible = useMemo(() => {
    return products.
    filter((product) => {
      const matchesQuery =
      product.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      product.brand.toLowerCase().includes(query.trim().toLowerCase());
      const matchesFilter =
      filter === 'All' ? true : filter === 'Favourites' ? favourites.includes(product.id) : product.category === filter;
      return matchesQuery && matchesFilter;
    }).
    sort((a, b) => b.timesBought - a.timesBought);
  }, [products, query, filter, favourites]);

  const toggleFavourite = (id: string) =>
  setFavourites((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);

  return (
    <>
      <ScreenHeader title="Products" subtitle="The things you buy again and again">
        <div className="space-y-3">
          <SearchField value={query} onChange={setQuery} placeholder="Search your usuals" />
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {filters.map((option) => {
              const active = option === filter;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-pressed={active}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors duration-150 ease-out ${
                  active ? 'bg-moss-600 text-white' : 'border border-line bg-surface text-muted hover:text-ink'}`
                  }>
                  
                  {option}
                </button>);

            })}
          </div>
        </div>
      </ScreenHeader>

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
        {visible.length === 0 ?
        <EmptyState
          icon={PackageSearchIcon}
          title="No products here yet"
          body={
          filter === 'Favourites' ?
          'Star the products your family buys most and they’ll appear here for one-tap adding.' :
          `Nothing matches “${query}”. Try a different word or another category.`
          } /> :


        <ul className="space-y-2.5">
            {visible.map((product) => {
            const onList = shopping.some(
              (item) => item.name.toLowerCase() === product.name.toLowerCase() && !item.checked
            );
            const inPantry = addedToPantry.includes(product.id);
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
                    onClick={() => toggleFavourite(product.id)}
                    aria-pressed={favourites.includes(product.id)}
                    aria-label={`${favourites.includes(product.id) ? 'Unfavourite' : 'Favourite'} ${product.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 ease-out hover:bg-canvas">
                    
                      <StarIcon
                      className={`h-[18px] w-[18px] ${
                      favourites.includes(product.id) ? 'fill-honey-500 text-honey-500' : 'text-muted'}`
                      } />
                    
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                    type="button"
                    disabled={onList}
                    onClick={() =>
                    addShoppingItem({
                      name: product.name,
                      category: product.category,
                      quantity: product.defaultQuantity,
                      unit: product.unit,
                      price: product.price,
                      priority: false
                    })
                    }
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-moss-600 text-[13.5px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:bg-moss-50 disabled:text-moss-600">
                    
                      {onList ? <CheckIcon className="h-4 w-4" /> : <ShoppingCartIcon className="h-4 w-4" />}
                      {onList ? 'On the list' : 'Add to list'}
                    </button>
                    <button
                    type="button"
                    disabled={inPantry}
                    onClick={() => {
                      addPantryItem({
                        name: product.name,
                        category: product.category,
                        quantity: product.defaultQuantity,
                        unit: product.unit,
                        state: 'good'
                      });
                      setAddedToPantry((prev) => [...prev, product.id]);
                    }}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line disabled:text-muted">
                    
                      {inPantry ? <CheckIcon className="h-4 w-4" /> : <CarrotIcon className="h-4 w-4" />}
                      {inPantry ? 'In pantry' : 'Add to pantry'}
                    </button>
                  </div>
                </li>);

          })}
          </ul>
        }
      </main>
    </>);

}