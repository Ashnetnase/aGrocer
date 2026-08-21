import React, { useState } from 'react';
import { ClockIcon, UsersIcon } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { SearchField } from '../ui/Field';
import { Meal } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  meals: Meal[];
  dayLabel: string;
  slotLabel: string;
  onPick: (mealId: string) => void;
}

export function MealPickerSheet({ open, onClose, meals, dayLabel, slotLabel, onPick }: Props) {
  const [query, setQuery] = useState('');
  const visible = meals.filter((meal) => meal.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Plan ${slotLabel}`}
      description={`Choose a meal for ${dayLabel}.`}>
      
      <div className="space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Search meals" />
        <div className="space-y-2">
          {visible.map((meal) =>
          <button
            key={meal.id}
            type="button"
            onClick={() => {
              onPick(meal.id);
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 text-left transition-colors duration-150 ease-out hover:border-moss-200 hover:bg-moss-50">
            
              <img src={meal.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-ink">{meal.name}</p>
                <p className="mt-0.5 flex items-center gap-2.5 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" /> {meal.minutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <UsersIcon className="h-3 w-3" /> {meal.serves}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-1">
                {meal.tags.slice(0, 2).map((tag) =>
              <span key={tag} className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {tag}
                  </span>
              )}
              </div>
            </button>
          )}
          {visible.length === 0 ?
          <p className="py-8 text-center text-sm text-muted">No meals match “{query}”.</p> :
          null}
        </div>
      </div>
    </BottomSheet>);

}