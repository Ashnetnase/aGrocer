'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PackageOpenIcon } from 'lucide-react';
import { CATEGORIES, type Category } from '@/domain/schemas/common';
import type { PantryItem, PantryItemDraft } from '@/domain/schemas/pantry';
import { countPantry, needsAttention } from '@/domain/services/pantry';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { FilterChips, SearchField } from '@/components/agrocer/Field';
import { EmptyState } from '@/components/agrocer/EmptyState';
import { FloatingAddButton } from '@/components/agrocer/FloatingAddButton';
import { PantryRow } from './components/PantryRow';
import { PantryItemSheet } from './components/PantryItemSheet';
import type { ReorderSuggestion } from '@/domain/services/reorderPrediction';

/** Filters are a union rather than `string`, so a typo cannot silently match nothing. */
const FILTERS = ['All', 'Needs attention', ...CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(item: PantryItem, filter: Filter): boolean {
  if (filter === 'All') return true;
  if (filter === 'Needs attention') return needsAttention(item);
  return item.category === (filter as Category);
}

export function PantryScreen() {
  const searchParams = useSearchParams();
  const { pantry, addPantryItem, updatePantryItem, adjustPantryQuantity, removePantryItem } = useAgrocer();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(
    searchParams.get('filter') === 'attention' ? 'Needs attention' : 'All',
  );
  const [sheetOpen, setSheetOpen] = useState(searchParams.get('add') === '1');
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);

  useEffect(() => {
    fetch('/api/pantry/suggestions').then((response) => response.ok ? response.json() : null)
      .then((body: { suggestions?: ReorderSuggestion[] } | null) => setSuggestions(body?.suggestions ?? []))
      .catch(() => setSuggestions([]));
  }, [pantry]);

  const counts = useMemo(() => countPantry(pantry), [pantry]);

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = pantry.filter(
      (item) => item.name.toLowerCase().includes(needle) && matchesFilter(item, filter),
    );
    return CATEGORIES.map((category) => ({
      category,
      items: visible.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [pantry, query, filter]);

  const openAdd = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const handleSave = (draft: PantryItemDraft) => {
    if (editing) void updatePantryItem(editing.id, draft);
    else void addPantryItem(draft);
  };

  return (
    <>
      <ScreenHeader
        title="Pantry"
        subtitle={`${pantry.length} items at home · ${counts.attention} need attention`}
      >
        <div className="space-y-3">
          <SearchField value={query} onChange={setQuery} placeholder="Search the pantry" />
          <FilterChips
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filter pantry"
            renderLabel={(option) =>
              option === 'Needs attention' ? `Needs attention · ${counts.attention}` : option
            }
          />
        </div>
      </ScreenHeader>

      <main className="no-scrollbar relative flex-1 overflow-y-auto px-5 pb-24 pt-4">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Well stocked', value: counts.good, tone: 'text-moss-700 bg-moss-50' },
            { label: 'Low or ageing', value: counts.low, tone: 'text-honey-600 bg-honey-50' },
            { label: 'Out', value: counts.out, tone: 'text-berry-600 bg-berry-50' },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-2xl px-3 py-2.5 ${stat.tone}`}>
              <p className="text-xl font-extrabold leading-none">{stat.value}</p>
              <p className="mt-1 text-[11px] font-semibold leading-tight opacity-80">{stat.label}</p>
            </div>
          ))}
        </div>

        {suggestions.length > 0 ? (
          <section aria-label="Reorder suggestions" className="mt-4 rounded-2xl border border-honey-200 bg-honey-50 p-4">
            <h2 className="text-sm font-bold text-ink">Keep an eye on</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink">
              {suggestions.slice(0, 4).map((suggestion) => (
                <li key={suggestion.itemName}>
                  {suggestion.itemName} — {suggestion.reason === 'recently-empty' ? 'recently ran out' : `used ${suggestion.uses} times recently`}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Suggestions only. Add items to shopping yourself.</p>
          </section>
        ) : null}

        {grouped.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={PackageOpenIcon}
              title={query ? 'Nothing matches that' : 'This shelf is empty'}
              body={
                query
                  ? `No pantry items match “${query}”. Try another word, or add it as a new item.`
                  : 'Add the staples your family keeps at home and Agrocer will keep an eye on what’s running low.'
              }
              actionLabel="Add pantry item"
              onAction={openAdd}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {grouped.map((group) => (
              <section key={group.category} aria-label={group.category}>
                <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                  {group.category}
                </h2>
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                  {group.items.map((item) => (
                    <PantryRow
                      key={item.id}
                      item={item}
                      onAdjust={(delta) => void adjustPantryQuantity(item.id, delta)}
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
      </main>

      <FloatingAddButton label="Add pantry item" onClick={openAdd} />

      <PantryItemSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        item={editing}
        onSave={handleSave}
        onDelete={editing ? () => void removePantryItem(editing.id) : undefined}
      />
    </>
  );
}
