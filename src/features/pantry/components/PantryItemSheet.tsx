'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2Icon } from 'lucide-react';
import { CATEGORIES, type StockState } from '@/domain/schemas/common';
import { pantryItemDraftSchema, type PantryItem, type PantryItemDraft } from '@/domain/schemas/pantry';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import {
  FormChipSelect,
  FormQuantityField,
  FormTextField,
} from '@/components/agrocer/form/FormFields';

const STOCK_OPTIONS = ['Good', 'Low', 'Use soon', 'Out'] as const;
type StockOption = (typeof STOCK_OPTIONS)[number];

const STOCK_BY_LABEL: Record<StockOption, StockState> = {
  Good: 'good',
  Low: 'low',
  'Use soon': 'soon',
  Out: 'out',
};

const LABEL_BY_STOCK: Record<StockState, StockOption> = {
  good: 'Good',
  low: 'Low',
  soon: 'Use soon',
  out: 'Out',
};

const STOCK_ACTIVE_CLASS: Record<StockOption, string> = {
  Good: 'bg-moss-600 text-white border-moss-600',
  Low: 'bg-honey-500 text-white border-honey-500',
  'Use soon': 'bg-clay-500 text-white border-clay-500',
  Out: 'bg-berry-500 text-white border-berry-500',
};

/**
 * Form shape: the stock level is edited as its display label and mapped back to
 * the domain `StockState` on submit, so the design's wording stays in the UI
 * layer rather than leaking into the schema.
 */
const formSchema = pantryItemDraftSchema
  .omit({ state: true })
  .extend({ stockLabel: z.enum(STOCK_OPTIONS) });

type FormValues = z.infer<typeof formSchema>;

const emptyValues: FormValues = {
  name: '',
  unit: 'pack',
  category: 'Pantry',
  quantity: 1,
  stockLabel: 'Good',
  note: undefined,
};

interface PantryItemSheetProps {
  open: boolean;
  onClose: () => void;
  item: PantryItem | null;
  onSave: (draft: PantryItemDraft) => void;
  onDelete?: () => void;
}

export function PantryItemSheet({ open, onClose, item, onSave, onDelete }: PantryItemSheetProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues,
  });

  // Reset each time the sheet opens so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!open) return;
    form.reset(
      item
        ? {
            name: item.name,
            unit: item.unit,
            category: item.category,
            quantity: item.quantity,
            stockLabel: LABEL_BY_STOCK[item.state],
            note: item.note,
          }
        : emptyValues,
    );
  }, [open, item, form]);

  const submit = form.handleSubmit((values) => {
    const { stockLabel, note, ...rest } = values;
    onSave({
      ...rest,
      state: STOCK_BY_LABEL[stockLabel],
      note: note?.trim() ? note.trim() : undefined,
    });
    onClose();
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={item ? 'Edit pantry item' : 'Add pantry item'}
      description={item ? 'Update what’s left at home.' : 'Track something the family keeps at home.'}
      footer={
        <div className="flex gap-2.5">
          {item && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              aria-label="Remove item"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line text-berry-500 transition-colors duration-150 ease-out hover:bg-berry-50"
            >
              <Trash2Icon className="h-[18px] w-[18px]" />
            </button>
          ) : null}
          <button
            type="submit"
            form="pantry-item-form"
            className="h-12 flex-1 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:bg-line disabled:text-muted"
          >
            {item ? 'Save changes' : 'Add to pantry'}
          </button>
        </div>
      }
    >
      <form id="pantry-item-form" onSubmit={submit} className="space-y-4">
        <FormTextField control={form.control} name="name" label="Item" placeholder="e.g. Milk" />
        <div className="grid grid-cols-2 gap-3">
          <FormTextField control={form.control} name="unit" label="Unit" placeholder="e.g. 2L bottle" />
          <FormQuantityField control={form.control} name="quantity" label="Quantity" size="sm" />
        </div>
        <FormChipSelect control={form.control} name="category" label="Category" options={CATEGORIES} />
        <FormChipSelect
          control={form.control}
          name="stockLabel"
          label="Stock level"
          options={STOCK_OPTIONS}
          columns={4}
          activeClassName={(option) => STOCK_ACTIVE_CLASS[option]}
        />
        <FormTextField
          control={form.control}
          name="note"
          label="Note (optional)"
          placeholder="e.g. Half remaining"
        />
      </form>
    </BottomSheet>
  );
}
