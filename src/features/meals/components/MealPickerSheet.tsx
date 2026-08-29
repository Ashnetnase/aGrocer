'use client';

import { useState } from 'react';
import { ClipboardPasteIcon, ClockIcon, PencilIcon, PlusIcon, UsersIcon } from 'lucide-react';
import type { Meal } from '@/domain/schemas/meal';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import { SearchField } from '@/components/agrocer/Field';
import { MealImage } from '@/components/agrocer/MealImage';

interface MealPickerSheetProps {
  open: boolean;
  onClose: () => void;
  meals: Meal[];
  dayLabel: string;
  slotLabel: string;
  onPick: (mealId: string) => void;
  onCreate: () => void;
  /** Opens the paste-a-recipe sheet. Same moment as creating one, less typing. */
  onImport: () => void;
  onEdit: (meal: Meal) => void;
}

export function MealPickerSheet({
  open,
  onClose,
  meals,
  dayLabel,
  slotLabel,
  onPick,
  onCreate,
  onImport,
  onEdit,
}: MealPickerSheetProps) {
  const [query, setQuery] = useState('');
  const visible = meals.filter((meal) => meal.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Plan ${slotLabel}`}
      description={`Choose a meal for ${dayLabel}.`}
    >
      <div className="space-y-3">
        <SearchField value={query} onChange={setQuery} placeholder="Search meals" />

        <button
          type="button"
          onClick={() => {
            onClose();
            onCreate();
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-moss-700 transition-colors duration-150 ease-out hover:bg-moss-50"
        >
          <PlusIcon className="h-4 w-4" /> Create a new meal
        </button>

        {/*
          Beside "create", because this is the same moment — you wanted a meal you do not
          have. Pasting is usually faster than typing a recipe out, and it lands in the same
          form for review either way.
        */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onImport();
          }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-moss-700 transition-colors duration-150 ease-out hover:bg-moss-50"
        >
          <ClipboardPasteIcon className="h-4 w-4" /> Paste a recipe
        </button>

        <div className="space-y-2">
          {visible.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-2.5 transition-colors duration-150 ease-out hover:border-moss-200 hover:bg-moss-50"
            >
              <button
                type="button"
                onClick={() => {
                  onPick(meal.id);
                  onClose();
                }}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <MealImage
                  src={meal.image}
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-xl"
                  iconClassName="h-5 w-5"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{meal.name}</span>
                  <span className="mt-0.5 flex items-center gap-2.5 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" /> {meal.minutes} min
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-3 w-3" /> {meal.serves}
                    </span>
                  </span>
                  {meal.tags.length > 0 ? (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {meal.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-canvas px-2 py-0.5 text-[10.5px] font-semibold text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(meal);
                }}
                aria-label={`Edit ${meal.name}`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors duration-150 ease-out hover:bg-canvas hover:text-ink"
              >
                <PencilIcon className="h-[17px] w-[17px]" />
              </button>
            </div>
          ))}

          {visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No meals match “{query}”.</p>
          ) : null}
        </div>
      </div>
    </BottomSheet>
  );
}
