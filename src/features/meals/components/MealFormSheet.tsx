'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2Icon } from 'lucide-react';
import { MEAL_TAGS, mealDraftSchema, type Meal, type MealDraft } from '@/domain/schemas/meal';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import {
  FormChipMultiSelect,
  FormNumberField,
  FormStringListField,
  FormTextField,
} from '@/components/agrocer/form/FormFields';

const emptyValues: MealDraft = {
  name: '',
  minutes: 30,
  serves: 5,
  tags: [],
  image: undefined,
  description: '',
  ingredients: [''],
};

interface MealFormSheetProps {
  open: boolean;
  onClose: () => void;
  meal: Meal | null;
  onSave: (draft: MealDraft) => void;
  onDelete?: () => void;
  /** How many planned slots use this meal, so deleting can warn honestly. */
  plannedUses?: number;
}

export function MealFormSheet({
  open,
  onClose,
  meal,
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
            ingredients: meal.ingredients.length > 0 ? meal.ingredients : [''],
          }
        : emptyValues,
    );
  }, [open, meal, form]);

  const submit = form.handleSubmit((values) => {
    onSave({
      ...values,
      // Blank rows are how an empty ingredient list looks in the UI; drop them.
      ingredients: values.ingredients.map((item) => item.trim()).filter(Boolean),
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

        <FormStringListField
          control={form.control}
          name="ingredients"
          label="Ingredients"
          placeholder="e.g. Chicken breast 1kg"
          addLabel="Add ingredient"
        />

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
