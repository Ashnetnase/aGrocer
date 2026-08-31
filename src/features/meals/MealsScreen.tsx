'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClockIcon, PlusIcon, UsersIcon } from 'lucide-react';
import type { DayKey, Slot } from '@/domain/schemas/common';
import type { Meal, MealDraft } from '@/domain/schemas/meal';
import {
  countPlannedDinners,
  countPlannedUses,
  findMeal,
  ingredientsToShoppingDrafts,
  mealFor,
} from '@/domain/services/meals';
import { useAgrocer } from '@/providers/AgrocerProvider';
import { usePlannerWeek } from '@/providers/useToday';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { MealImage } from '@/components/agrocer/MealImage';
import { MealPickerSheet } from './components/MealPickerSheet';
import { MealDetailSheet } from './components/MealDetailSheet';
import { MealFormSheet } from './components/MealFormSheet';
import { RecipeImportSheet } from './components/RecipeImportSheet';
import { cn } from '@/lib/utils';

const SLOT_LABELS: Record<Slot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export function MealsScreen() {
  const searchParams = useSearchParams();
  const {
    plan,
    meals,
    products,
    household,
    assignMeal,
    clearMeal,
    addShoppingItems,
    addMeal,
    updateMeal,
    removeMeal,
    listMealFeedback,
    addMealFeedback,
  } = useAgrocer();
  const week = usePlannerWeek();

  const [showAllSlots, setShowAllSlots] = useState(household.settings.showBreakfastAndLunch);
  const [target, setTarget] = useState<{ day: DayKey; slot: Slot }>({ day: week.todayKey, slot: 'dinner' });
  const [pickerOpen, setPickerOpen] = useState(searchParams.get('add') === '1');
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  /** A pasted recipe waiting to be reviewed in the form. Cleared once the form closes. */
  const [importedDraft, setImportedDraft] = useState<MealDraft | null>(null);
  const [addedFor, setAddedFor] = useState<string[]>([]);

  const plannedCount = countPlannedDinners(plan, week.days.map((day) => day.key));
  const targetDay = week.days.find((day) => day.key === target.day);
  const targetMeal = findMeal(meals, mealFor(plan, target.day, target.slot));

  const openSlot = (day: DayKey, slot: Slot) => {
    setTarget({ day, slot });
    if (mealFor(plan, day, slot)) setDetailOpen(true);
    else setPickerOpen(true);
  };

  const addIngredients = () => {
    if (!targetMeal) return;
    void addShoppingItems(ingredientsToShoppingDrafts(targetMeal, products));
    setAddedFor((prev) => [...prev, targetMeal.id]);
  };

  return (
    <>
      <ScreenHeader
        title="Meals"
        subtitle={`${week.label} · ${plannedCount} of 7 dinners planned`}
        action={
          <button
            type="button"
            onClick={() => setShowAllSlots(!showAllSlots)}
            aria-pressed={showAllSlots}
            className={cn(
              'h-10 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors duration-150 ease-out',
              showAllSlots ? 'bg-moss-600 text-white' : 'border border-line bg-surface text-muted',
            )}
          >
            All meals
          </button>
        }
      />

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
        <div className="space-y-3">
          {week.days.map((day) => {
            const dinner = findMeal(meals, mealFor(plan, day.key, 'dinner'));
            return (
              <section
                key={day.key}
                aria-label={day.label}
                className={cn(
                  'overflow-hidden rounded-3xl border',
                  day.isToday ? 'border-moss-300 bg-moss-50' : 'border-line bg-surface',
                )}
              >
                <div className="flex items-baseline justify-between px-4 pt-3">
                  <h2 className="text-[15px] font-extrabold tracking-tight text-ink">
                    {day.label}
                    {day.isToday ? (
                      <span className="ml-2 text-[11px] font-bold uppercase text-moss-600">Today</span>
                    ) : null}
                  </h2>
                  <span className="text-xs font-medium text-muted">{day.date}</span>
                </div>

                <div className="px-3 pb-3 pt-2">
                  {dinner ? (
                    <button
                      type="button"
                      onClick={() => openSlot(day.key, 'dinner')}
                      className="flex w-full items-center gap-3 rounded-2xl bg-surface p-2 text-left shadow-card transition-colors duration-150 ease-out hover:bg-canvas"
                    >
                      <MealImage
                        src={dinner.image}
                        width={64}
                        height={64}
                        className="h-16 w-16 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-ink">{dinner.name}</p>
                        <p className="mt-0.5 flex items-center gap-2.5 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" /> {dinner.minutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" /> Serves {dinner.serves}
                          </span>
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {dinner.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-canvas px-2 py-0.5 text-[10.5px] font-semibold text-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSlot(day.key, 'dinner')}
                      className="flex h-[72px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-moss-700 transition-colors duration-150 ease-out hover:bg-moss-50"
                    >
                      <PlusIcon className="h-4 w-4" /> Plan dinner
                    </button>
                  )}

                  {showAllSlots ? (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(['breakfast', 'lunch'] as const).map((slot) => {
                        const meal = findMeal(meals, mealFor(plan, day.key, slot));
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => openSlot(day.key, slot)}
                            className="rounded-xl border border-line bg-surface px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-canvas"
                          >
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted">
                              {SLOT_LABELS[slot]}
                            </p>
                            <p
                              className={cn(
                                'mt-0.5 truncate text-[13px] font-semibold',
                                meal ? 'text-ink' : 'text-muted',
                              )}
                            >
                              {meal ? meal.name : 'Add'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      <MealPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        meals={meals}
        dayLabel={targetDay?.label ?? ''}
        slotLabel={SLOT_LABELS[target.slot].toLowerCase()}
        onPick={(mealId) => void assignMeal(target.day, target.slot, mealId)}
        onCreate={() => {
          setEditingMeal(null);
          setFormOpen(true);
        }}
        onImport={() => setImportOpen(true)}
        onEdit={(meal) => {
          setEditingMeal(meal);
          setFormOpen(true);
        }}
      />

      <RecipeImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        initialMode="search"
        destination="planner"
        onImport={(draft) => {
          // Straight into the normal form: an import is reviewed and saved like anything
          // else, so there is only ever one path into the meal store.
          setEditingMeal(null);
          setImportedDraft(draft);
          setFormOpen(true);
        }}
      />

      <MealFormSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setImportedDraft(null);
        }}
        meal={editingMeal}
        initialDraft={importedDraft}
        products={products}
        createLabel={importedDraft ? 'Save and plan' : 'Add meal'}
        plannedUses={editingMeal ? countPlannedUses(plan, editingMeal.id) : 0}
        onSave={(draft) => {
          if (editingMeal) void updateMeal(editingMeal.id, draft);
          else if (importedDraft) {
            void (async () => {
              const meal = await addMeal(draft);
              await assignMeal(target.day, target.slot, meal.id);
            })();
          } else void addMeal(draft);
        }}
        onDelete={editingMeal ? () => void removeMeal(editingMeal.id) : undefined}
      />

      <MealDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        meal={targetMeal ?? null}
        products={products}
        members={household.members}
        ateOn={targetDay?.iso ?? week.days[0]!.iso}
        dayLabel={targetDay?.label ?? ''}
        slotLabel={SLOT_LABELS[target.slot]}
        onChange={() => setPickerOpen(true)}
        onRemove={() => void clearMeal(target.day, target.slot)}
        onAddIngredients={addIngredients}
        ingredientsAdded={Boolean(targetMeal && addedFor.includes(targetMeal.id))}
        onLoadFeedback={listMealFeedback}
        onAddFeedback={addMealFeedback}
      />
    </>
  );
}
