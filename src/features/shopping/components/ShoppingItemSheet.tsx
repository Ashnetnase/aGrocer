'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FlagIcon, Trash2Icon } from 'lucide-react';
import { CATEGORIES } from '@/domain/schemas/common';
import {
  shoppingItemDraftSchema,
  type ShoppingItem,
  type ShoppingItemDraft,
} from '@/domain/schemas/shopping';
import type { Product } from '@/domain/schemas/product';
import { guessCategory } from '@/domain/services/categoryGuess';
import { BottomSheet } from '@/components/agrocer/BottomSheet';
import {
  FormChipSelect,
  FormNumberField,
  FormQuantityField,
  FormTextField,
  FormToggleCard,
} from '@/components/agrocer/form/FormFields';
import { cn } from '@/lib/utils';
import type { RetailerProduct } from '@/shopping/schemas';
import { MatchNewWorldProduct } from './MatchNewWorldProduct';

const emptyValues: ShoppingItemDraft = {
  name: '',
  unit: 'item',
  quantity: 1,
  category: 'Pantry',
  price: 0,
  priority: false,
  note: undefined,
};

interface ShoppingItemSheetProps {
  open: boolean;
  onClose: () => void;
  item: ShoppingItem | null;
  products: Product[];
  onSave: (draft: ShoppingItemDraft) => void;
  onDelete?: () => void;
  extensionOnline: boolean;
  liveProducts: RetailerProduct[];
  liveMessage?: string;
  searching: boolean;
  onLiveSearch: (query: string) => void;
  onCancelSearch: () => void;
  onProductMatched: (message: string) => void;
}

export function ShoppingItemSheet({
  open, onClose, item, products, onSave, onDelete,
  extensionOnline, liveProducts, liveMessage, searching, onLiveSearch, onCancelSearch, onProductMatched,
}: ShoppingItemSheetProps) {
  const form = useForm<ShoppingItemDraft>({
    resolver: zodResolver(shoppingItemDraftSchema),
    defaultValues: emptyValues,
  });

  // Forces MatchNewWorldProduct to remount each time the sheet opens, so a match made for one
  // item (or a previous add) can never be shown stale against the next item.
  const sessionRef = useRef(0);
  const [session, setSession] = useState(0);

  useEffect(() => {
    if (!open) return;
    sessionRef.current += 1;
    setSession(sessionRef.current);
    form.reset(
      item
        ? {
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            category: item.category,
            price: item.price,
            priority: item.priority,
            note: item.note,
          }
        : emptyValues,
    );
  }, [open, item, form]);

  const watchedName = form.watch('name');
  const watchedQuantity = form.watch('quantity');

  // Suggests a category from the name as it's typed — never on edit (an explicit category
  // already chosen for an existing item is never second-guessed), and never once the person has
  // picked a category themselves, so the guess only ever fills a blank, it never overrides one.
  useEffect(() => {
    if (item || form.formState.dirtyFields.category) return;
    const guess = guessCategory(watchedName, products);
    if (guess) form.setValue('category', guess);
  }, [watchedName, item, products, form]);

  const submit = form.handleSubmit((values) => {
    onSave({ ...values, note: values.note?.trim() ? values.note.trim() : undefined });
    onClose();
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={item ? 'Edit item' : 'Add to shopping list'}
      description={item ? 'Change quantity, price or notes.' : 'Anything the family needs from the shop.'}
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
            form="shopping-item-form"
            className="h-12 flex-1 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700"
          >
            {item ? 'Save changes' : 'Add to list'}
          </button>
        </div>
      }
    >
      <form id="shopping-item-form" onSubmit={submit} className="space-y-4">
        <FormTextField control={form.control} name="name" label="Item" placeholder="e.g. Bread" />
        <div className="grid grid-cols-2 gap-3">
          <FormTextField control={form.control} name="unit" label="Unit" placeholder="e.g. loaf" />
          <FormNumberField
            control={form.control}
            name="price"
            label="Price each (NZD)"
            placeholder="0.00"
          />
        </div>
        <FormQuantityField control={form.control} name="quantity" label="Quantity" min={1} />
        <FormChipSelect control={form.control} name="category" label="Category" options={CATEGORIES} />
        <FormToggleCard
          control={form.control}
          name="priority"
          label="Priority"
          description="Don’t leave the shop without it"
          icon={(active) => (
            <FlagIcon className={cn('h-5 w-5', active ? 'fill-clay-500 text-clay-500' : 'text-muted')} />
          )}
        />
        <FormTextField control={form.control} name="note" label="Note (optional)" placeholder="e.g. Blue top" />
      </form>
      <div className="mt-4">
        <MatchNewWorldProduct
          key={session}
          itemName={watchedName}
          quantity={watchedQuantity}
          extensionOnline={extensionOnline}
          liveProducts={liveProducts}
          liveMessage={liveMessage}
          searching={searching}
          onLiveSearch={onLiveSearch}
          onCancelSearch={onCancelSearch}
          onSaved={onProductMatched}
          onMatchedName={(name) => form.setValue('name', name, { shouldDirty: true, shouldTouch: true })}
        />
      </div>
    </BottomSheet>
  );
}
