'use client';

import { useEffect } from 'react';
import { useId } from 'react';
import { useController, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { MEAL_TAGS, mealDraftSchema, type Meal, type MealDraft } from '@/domain/schemas/meal';
import type { Product } from '@/domain/schemas/product';
import { formatMealIngredient, parseMealIngredient } from '@/domain/services/meals';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import {
  FormChipMultiSelect,
  FormNumberField,
  FormTextField,
} from '@/components/agrocer/form/FormFields';

const emptyValues: MealDraft = {
  name: '',
  minutes: 30,
  serves: 5,
  tags: [],
  image: undefined,
  description: '',
  ingredients: [],
  ingredientDetails: [],
};

interface MealFormSheetProps {
  open: boolean;
  onClose: () => void;
  meal: Meal | null;
  products: Product[];
  onSave: (draft: MealDraft) => void;
  onDelete?: () => void;
  /** How many planned slots use this meal, so deleting can warn honestly. */
  plannedUses?: number;
}

export function MealFormSheet({
  open,
  onClose,
  meal,
  products,
  onSave,
  onDelete,
  plannedUses = 0,
}: MealFormSheetProps) {
  const form = useForm<MealDraft>({
    resolver: zodResolver(mealDraftSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      meal
        ? {
            name: meal.name,
            minutes: meal.minutes,
            serves: meal.serves,
            tags: meal.tags,
            image: meal.image,
            description: meal.description,
            ingredients: meal.ingredients,
            ingredientDetails:
              meal.ingredientDetails ?? meal.ingredients.map(parseMealIngredient),
          }
        : emptyValues,
    );
  }, [open, meal, form]);

  const submit = form.handleSubmit((values) => {
    onSave({
      ...values,
      ingredients: (values.ingredientDetails ?? []).map(formatMealIngredient),
    });
    onClose();
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={meal ? 'Edit meal' : 'New meal'}
      description={
        meal ? 'Update the recipe your family cooks.' : 'Add a meal you cook, ready to plan any night.'
      }
      footer={
        <div className="flex gap-2.5">
          {meal && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              aria-label="Delete meal"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line text-berry-500 transition-colors duration-150 ease-out hover:bg-berry-50"
            >
              <Trash2Icon className="h-[18px] w-[18px]" />
            </button>
          ) : null}
          <button
            type="submit"
            form="meal-form"
            className="h-12 flex-1 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700"
          >
            {meal ? 'Save changes' : 'Add meal'}
          </button>
        </div>
      }
    >
      <form id="meal-form" onSubmit={submit} className="space-y-4">
        <FormTextField control={form.control} name="name" label="Meal" placeholder="e.g. Butter Chicken" />

        <div className="grid grid-cols-2 gap-3">
          <FormNumberField
            control={form.control}
            name="minutes"
            label="Minutes"
            placeholder="30"
            step="5"
          />
          <FormNumberField control={form.control} name="serves" label="Serves" placeholder="5" step="1" />
        </div>

        <FormTextField
          control={form.control}
          name="description"
          label="Description (optional)"
          placeholder="e.g. Mild enough for the kids"
        />

        <FormChipMultiSelect control={form.control} name="tags" label="Tags" options={MEAL_TAGS} />

        <IngredientFields control={form.control} products={products} />

        {meal && plannedUses > 0 ? (
          <p className="text-xs leading-relaxed text-muted">
            Planned {plannedUses === 1 ? 'once' : `${plannedUses} times`} this week. Deleting the meal
            also clears it from the planner.
          </p>
        ) : null}
      </form>
    </BottomSheet>
  );
}

function IngredientFields({ control, products }: { control: Control<MealDraft>; products: Product[] }) {
  const listId = useId();
  const { field, fieldState } = useController({ control, name: 'ingredientDetails' });
  const values = field.value ?? [];
  const update = (index: number, patch: Partial<(typeof values)[number]>) =>
    field.onChange(values.map((value, position) => (position === index ? { ...value, ...patch } : value)));

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">Ingredients</span>
      <datalist id={listId}>
        {products.map((product) => <option key={product.id} value={product.name} />)}
      </datalist>
      <div className="space-y-2">
        {values.map((ingredient, index) => (
          <div key={index} className="rounded-2xl border border-line bg-canvas p-2">
            <div className="flex gap-2">
              <input
                type="text"
                list={listId}
                value={ingredient.name}
                onChange={(event) => {
                  const name = event.target.value;
                  const product = products.find((candidate) => candidate.name.toLowerCase() === name.trim().toLowerCase());
                  update(index, { name, productId: product?.id });
                }}
                aria-label={`Ingredient ${index + 1}`}
                placeholder="e.g. Chicken breast"
                className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
              />
              <button
                type="button"
                onClick={() => field.onChange(values.filter((_, position) => position !== index))}
                aria-label={`Remove ingredient ${index + 1}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-muted hover:bg-berry-50 hover:text-berry-500"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={ingredient.amount}
                onChange={(event) => update(index, { amount: Number(event.target.value) })}
                aria-label={`Ingredient ${index + 1} amount`}
                className="h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
              />
              <input
                type="text"
                value={ingredient.unit}
                onChange={(event) => update(index, { unit: event.target.value })}
                aria-label={`Ingredient ${index + 1} unit`}
                placeholder="g, kg, ml, pack…"
                className="h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => field.onChange([...values, { name: '', amount: 1, unit: 'item' }])}
        className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-sm font-semibold text-moss-700 hover:bg-moss-50"
      >
        <PlusIcon className="h-4 w-4" /> Add ingredient
      </button>
      {fieldState.error ? <p role="alert" className="mt-1.5 text-[13px] font-medium text-berry-600">Check each ingredient has a name, amount and unit.</p> : null}
      <p className="mt-1.5 text-xs text-muted">Choose a catalogue product by name when possible so the meal cost can be estimated.</p>
    </div>
  );
}
