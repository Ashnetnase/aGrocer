import React, { useEffect, useState } from 'react';
import { FlagIcon, Trash2Icon } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { TextField } from '../ui/Field';
import { QuantityStepper } from '../ui/QuantityStepper';
import { CATEGORIES, Category, ShoppingItem } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  item: ShoppingItem | null;
  onSave: (values: Omit<ShoppingItem, 'id' | 'checked'>) => void;
  onDelete?: () => void;
}

export function ShoppingItemSheet({ open, onClose, item, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState<Category>('Pantry');
  const [price, setPrice] = useState('0');
  const [priority, setPriority] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? '');
    setUnit(item?.unit ?? 'item');
    setQuantity(item?.quantity ?? 1);
    setCategory(item?.category ?? 'Pantry');
    setPrice(String(item?.price ?? ''));
    setPriority(item?.priority ?? false);
    setNote(item?.note ?? '');
  }, [open, item]);

  const save = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      unit: unit.trim() || 'item',
      quantity,
      category,
      price: Number(price) || 0,
      priority,
      note: note.trim() || undefined
    });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={item ? 'Edit item' : 'Add to shopping list'}
      description={item ? 'Change quantity, price or notes.' : 'Anything the family needs from the shop.'}
      footer={
      <div className="flex gap-2.5">
          {item && onDelete ?
        <button
          type="button"
          onClick={() => {
            onDelete();
            onClose();
          }}
          aria-label="Remove item"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line text-berry-500 transition-colors duration-150 ease-out hover:bg-berry-50">
          
              <Trash2Icon className="h-[18px] w-[18px]" />
            </button> :
        null}
          <button
          type="button"
          onClick={save}
          disabled={!name.trim()}
          className="h-12 flex-1 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700 disabled:bg-line disabled:text-muted">
          
            {item ? 'Save changes' : 'Add to list'}
          </button>
        </div>
      }>
      
      <div className="space-y-4">
        <TextField label="Item" value={name} onChange={setName} placeholder="e.g. Bread" />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Unit" value={unit} onChange={setUnit} placeholder="e.g. loaf" />
          <TextField label="Price each (NZD)" value={price} onChange={setPrice} placeholder="0.00" type="number" />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Quantity</span>
          <QuantityStepper value={quantity} onChange={(d) => setQuantity(Math.max(1, quantity + d))} label="quantity" />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((option) =>
            <button
              key={option}
              type="button"
              onClick={() => setCategory(option)}
              aria-pressed={category === option}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ease-out ${
              category === option ? 'border-moss-600 bg-moss-600 text-white' : 'border-line bg-canvas text-muted'}`
              }>
              
                {option}
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPriority(!priority)}
          aria-pressed={priority}
          className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors duration-150 ease-out ${
          priority ? 'border-clay-400 bg-clay-50' : 'border-line bg-canvas'}`
          }>
          
          <span>
            <span className="block text-sm font-semibold text-ink">Priority</span>
            <span className="block text-xs text-muted">Don’t leave the shop without it</span>
          </span>
          <FlagIcon className={`h-5 w-5 ${priority ? 'fill-clay-500 text-clay-500' : 'text-muted'}`} />
        </button>
        <TextField label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. Blue top" />
      </div>
    </BottomSheet>);

}