import React from 'react';
import { ClockIcon, RefreshCwIcon, ShoppingCartIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Meal } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  meal: Meal | null;
  dayLabel: string;
  slotLabel: string;
  onChange: () => void;
  onRemove: () => void;
  onAddIngredients: () => void;
  ingredientsAdded: boolean;
}

export function MealDetailSheet({
  open,
  onClose,
  meal,
  dayLabel,
  slotLabel,
  onChange,
  onRemove,
  onAddIngredients,
  ingredientsAdded
}: Props) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={meal?.name ?? ''}
      description={`${slotLabel} · ${dayLabel}`}
      footer={
      <div className="flex gap-2.5">
          <button
          type="button"
          onClick={() => {
            onRemove();
            onClose();
          }}
          aria-label="Remove meal from this day"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line text-berry-500 transition-colors duration-150 ease-out hover:bg-berry-50">
          
            <Trash2Icon className="h-[18px] w-[18px]" />
          </button>
          <button
          type="button"
          onClick={() => {
            onClose();
            onChange();
          }}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-canvas text-[15px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line">
          
            <RefreshCwIcon className="h-4 w-4" /> Change
          </button>
          <button
          type="button"
          onClick={onAddIngredients}
          disabled={ingredientsAdded}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:bg-moss-100 disabled:text-moss-600">
          
            <ShoppingCartIcon className="h-4 w-4" /> {ingredientsAdded ? 'Added' : 'Add items'}
          </button>
        </div>
      }>
      
      {meal ?
      <div>
          <img src={meal.image} alt="" className="h-40 w-full rounded-2xl object-cover" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {meal.tags.map((tag) =>
          <span key={tag} className="rounded-full bg-moss-50 px-2.5 py-1 text-[11px] font-semibold text-moss-700">
                {tag}
              </span>
          )}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">{meal.description}</p>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-2xl border border-line bg-canvas px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <ClockIcon className="h-3.5 w-3.5" /> Ready in
              </p>
              <p className="mt-0.5 text-[17px] font-extrabold text-ink">{meal.minutes} min</p>
            </div>
            <div className="flex-1 rounded-2xl border border-line bg-canvas px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <UsersIcon className="h-3.5 w-3.5" /> Serves
              </p>
              <p className="mt-0.5 text-[17px] font-extrabold text-ink">{meal.serves} people</p>
            </div>
          </div>
          <h3 className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-wider text-muted">You’ll need</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {meal.ingredients.map((ingredient) =>
          <li key={ingredient} className="bg-surface px-4 py-3 text-[15px] font-medium text-ink">
                {ingredient}
              </li>
          )}
          </ul>
        </div> :
      null}
    </BottomSheet>);

}