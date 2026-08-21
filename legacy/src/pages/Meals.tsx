import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ClockIcon, PlusIcon, UsersIcon } from 'lucide-react';
import { useAgrocer } from '../contexts/AgrocerContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { MealPickerSheet } from '../components/meals/MealPickerSheet';
import { MealDetailSheet } from '../components/meals/MealDetailSheet';
import { days, todayKey } from '../data/meals';
import { DayKey, Slot } from '../types';

const slotLabels: Record<Slot, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

export function Meals() {
  const location = useLocation() as {state?: {add?: boolean;};};
  const { plan, meals, getMeal, assignMeal, clearMeal, addShoppingItem, products } = useAgrocer();
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [target, setTarget] = useState<{day: DayKey;slot: Slot;}>({ day: todayKey as DayKey, slot: 'dinner' });
  const [pickerOpen, setPickerOpen] = useState(Boolean(location.state?.add));
  const [detailOpen, setDetailOpen] = useState(false);
  const [addedFor, setAddedFor] = useState<string[]>([]);

  const plannedCount = days.filter((day) => plan[day.key]?.dinner).length;
  const targetDay = days.find((day) => day.key === target.day);
  const targetMeal = getMeal(plan[target.day]?.[target.slot]);

  const openSlot = (day: DayKey, slot: Slot) => {
    setTarget({ day, slot });
    if (plan[day]?.[slot]) setDetailOpen(true);else
    setPickerOpen(true);
  };

  const addIngredients = () => {
    if (!targetMeal) return;
    targetMeal.ingredients.forEach((ingredient) => {
      const match = products.find((product) => ingredient.toLowerCase().startsWith(product.name.toLowerCase()));
      addShoppingItem({
        name: match ? match.name : ingredient,
        category: match ? match.category : 'Pantry',
        quantity: 1,
        unit: match ? match.unit : 'item',
        price: match ? match.price : 4.5,
        priority: false,
        note: `For ${targetMeal.name}`
      });
    });
    setAddedFor((prev) => [...prev, targetMeal.id]);
  };

  return (
    <>
      <ScreenHeader
        title="Meals"
        subtitle={`Week of 24–30 Aug · ${plannedCount} of 7 dinners planned`}
        action={
        <button
          type="button"
          onClick={() => setShowAllSlots(!showAllSlots)}
          aria-pressed={showAllSlots}
          className={`h-10 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors duration-150 ease-out ${
          showAllSlots ? 'bg-moss-600 text-white' : 'border border-line bg-surface text-muted'}`
          }>
          
            All meals
          </button>
        } />
      

      <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-4">
        <div className="space-y-3">
          {days.map((day) => {
            const dinner = getMeal(plan[day.key]?.dinner);
            const isToday = day.key === todayKey;
            return (
              <section
                key={day.key}
                aria-label={day.label}
                className={`overflow-hidden rounded-3xl border ${
                isToday ? 'border-moss-300 bg-moss-50' : 'border-line bg-surface'}`
                }>
                
                <div className="flex items-baseline justify-between px-4 pt-3">
                  <h2 className="text-[15px] font-extrabold tracking-tight text-ink">
                    {day.label}
                    {isToday ? <span className="ml-2 text-[11px] font-bold uppercase text-moss-600">Today</span> : null}
                  </h2>
                  <span className="text-xs font-medium text-muted">{day.date}</span>
                </div>

                <div className="px-3 pb-3 pt-2">
                  {dinner ?
                  <button
                    type="button"
                    onClick={() => openSlot(day.key, 'dinner')}
                    className="flex w-full items-center gap-3 rounded-2xl bg-surface p-2 text-left shadow-card transition-colors duration-150 ease-out hover:bg-canvas">
                    
                      <img src={dinner.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
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
                          {dinner.tags.map((tag) =>
                        <span
                          key={tag}
                          className="rounded-full bg-canvas px-2 py-0.5 text-[10.5px] font-semibold text-muted">
                          
                              {tag}
                            </span>
                        )}
                        </div>
                      </div>
                    </button> :

                  <button
                    type="button"
                    onClick={() => openSlot(day.key, 'dinner')}
                    className="flex h-[72px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-moss-700 transition-colors duration-150 ease-out hover:bg-moss-50">
                    
                      <PlusIcon className="h-4 w-4" /> Plan dinner
                    </button>
                  }

                  {showAllSlots ?
                  <div className="mt-2 grid grid-cols-2 gap-2">
                      {(['breakfast', 'lunch'] as Slot[]).map((slot) => {
                      const meal = getMeal(plan[day.key]?.[slot]);
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => openSlot(day.key, slot)}
                          className="rounded-xl border border-line bg-surface px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-canvas">
                          
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted">
                              {slotLabels[slot]}
                            </p>
                            <p className={`mt-0.5 truncate text-[13px] font-semibold ${meal ? 'text-ink' : 'text-muted'}`}>
                              {meal ? meal.name : 'Add'}
                            </p>
                          </button>);

                    })}
                    </div> :
                  null}
                </div>
              </section>);

          })}
        </div>
      </main>

      <MealPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        meals={meals}
        dayLabel={targetDay?.label ?? ''}
        slotLabel={slotLabels[target.slot].toLowerCase()}
        onPick={(mealId) => assignMeal(target.day, target.slot, mealId)} />
      

      <MealDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        meal={targetMeal ?? null}
        dayLabel={targetDay?.label ?? ''}
        slotLabel={slotLabels[target.slot]}
        onChange={() => setPickerOpen(true)}
        onRemove={() => clearMeal(target.day, target.slot)}
        onAddIngredients={addIngredients}
        ingredientsAdded={Boolean(targetMeal && addedFor.includes(targetMeal.id))} />
      
    </>);

}