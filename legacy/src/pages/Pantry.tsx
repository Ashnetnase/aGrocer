import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PackageOpenIcon, PlusIcon } from 'lucide-react';
import { useAgrocer } from '../contexts/AgrocerContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchField } from '../components/ui/Field';
import { EmptyState } from '../components/ui/EmptyState';
import { PantryRow } from '../components/pantry/PantryRow';
import { PantryItemSheet } from '../components/pantry/PantryItemSheet';
import { CATEGORIES, PantryItem } from '../types';

const filters = ['All', 'Needs attention', ...CATEGORIES];

export function Pantry() {
  const location = useLocation() as {state?: {add?: boolean;};};
  const { pantry, updatePantryQuantity, addPantryItem, removePantryItem, updatePantryItem } = useAgrocer();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [sheetOpen, setSheetOpen] = useState(Boolean(location.state?.add));
  const [editing, setEditing] = useState<PantryItem | null>(null);

  const counts = useMemo(
    () => ({
      good: pantry.filter((item) => item.state === 'good').length,
      low: pantry.filter((item) => item.state === 'low' || item.state === 'soon').length,
      out: pantry.filter((item) => item.state === 'out').length
    }),
    [pantry]
  );

  const visible = useMemo(() => {
    return pantry.filter((item) => {
      const matchesQuery = item.name.toLowerCase().includes(query.trim().toLowerCase());
      const matchesFilter =
      filter === 'All' ?
      true :
      filter === 'Needs attention' ?
      item.state !== 'good' :
      item.category === filter;
      return matchesQuery && matchesFilter;
    });
  }, [pantry, query, filter]);

  const grouped = useMemo(() => {
    return CATEGORIES.map((category) => ({
      category,
      items: visible.filter((item) => item.category === category)
    })).filter((group) => group.items.length > 0);
  }, [visible]);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  return (
    <>
      <ScreenHeader
        title="Pantry"
        subtitle={`${pantry.length} items at home · ${counts.low + counts.out} need attention`}>
        
        <div className="space-y-3">
          <SearchField value={query} onChange={setQuery} placeholder="Search the pantry" />
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
                  {option === 'Needs attention' ? ` · ${counts.low + counts.out}` : ''}
                </button>);

            })}
          </div>
        </div>
      </ScreenHeader>

      <main className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
        <div className="grid grid-cols-3 gap-2.5">
          {[
          { label: 'Well stocked', value: counts.good, tone: 'text-moss-700 bg-moss-50' },
          { label: 'Low or ageing', value: counts.low, tone: 'text-honey-600 bg-honey-50' },
          { label: 'Out', value: counts.out, tone: 'text-berry-600 bg-berry-50' }].
          map((stat) =>
          <div key={stat.label} className={`rounded-2xl px-3 py-2.5 ${stat.tone}`}>
              <p className="text-xl font-extrabold leading-none">{stat.value}</p>
              <p className="mt-1 text-[11px] font-semibold leading-tight opacity-80">{stat.label}</p>
            </div>
          )}
        </div>

        {grouped.length === 0 ?
        <div className="mt-6">
            <EmptyState
            icon={PackageOpenIcon}
            title={query ? 'Nothing matches that' : 'This shelf is empty'}
            body={
            query ?
            `No pantry items match “${query}”. Try another word, or add it as a new item.` :
            'Add the staples your family keeps at home and Agrocer will keep an eye on what’s running low.'
            }
            actionLabel="Add pantry item"
            onAction={openAdd} />
          
          </div> :

        <div className="mt-5 space-y-5">
            {grouped.map((group) =>
          <section key={group.category} aria-label={group.category}>
                <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                  {group.category}
                </h2>
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {group.items.map((item) =>
              <PantryRow
                key={item.id}
                item={item}
                onAdjust={(delta) => updatePantryQuantity(item.id, delta)}
                onEdit={() => {
                  setEditing(item);
                  setSheetOpen(true);
                }} />

              )}
                </div>
              </section>
          )}
          </div>
        }
      </main>

      <button
        type="button"
        onClick={openAdd}
        aria-label="Add pantry item"
        className="absolute bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss-600 text-white shadow-lift transition-colors duration-150 ease-out hover:bg-moss-700">
        
        <PlusIcon className="h-6 w-6" />
      </button>

      <PantryItemSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        item={editing}
        onSave={(values) => {
          if (editing) {
            updatePantryItem(editing.id, values);
          } else {
            addPantryItem(values);
          }
        }}
        onDelete={editing ? () => removePantryItem(editing.id) : undefined} />
      
    </>);

}