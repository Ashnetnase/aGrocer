import React, { useEffect, useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { TextField } from '../ui/Field';
import { QuantityStepper } from '../ui/QuantityStepper';
import { CATEGORIES, Category, PantryItem, StockState } from '../../types';

const states: {value: StockState;label: string;active: string;}[] = [
{ value: 'good', label: 'Good', active: 'bg-moss-600 text-white border-moss-600' },
{ value: 'low', label: 'Low', active: 'bg-honey-500 text-white border-honey-500' },
{ value: 'soon', label: 'Use soon', active: 'bg-clay-500 text-white border-clay-500' },
{ value: 'out', label: 'Out', active: 'bg-berry-500 text-white border-berry-500' }];


interface Props {
  open: boolean;
  onClose: () => void;
  item: PantryItem | null;
  onSave: (item: Omit<PantryItem, 'id'>) => void;
  onDelete?: () => void;
}

export function PantryItemSheet({ open, onClose, item, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<Category>('Pantry');
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<StockState>('good');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? '');
    setUnit(item?.unit ?? 'pack');
    setCategory(item?.category ?? 'Pantry');
    setQuantity(item?.quantity ?? 1);
    setState(item?.state ?? 'good');
    setNote(item?.note ?? '');
  }, [open, item]);

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), unit: unit.trim() || 'pack', category, quantity, state, note: note.trim() || undefined });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={item ? 'Edit pantry item' : 'Add pantry item'}
      description={item ? 'Update what’s left at home.' : 'Track something the family keeps at home.'}
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
          
            {item ? 'Save changes' : 'Add to pantry'}
          </button>
        </div>
      }>
      
      <div className="space-y-4">
        <TextField label="Item" value={name} onChange={setName} placeholder="e.g. Milk" />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Unit" value={unit} onChange={setUnit} placeholder="e.g. 2L bottle" />
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">Quantity</span>
            <div className="flex h-12 items-center">
              <QuantityStepper value={quantity} onChange={(d) => setQuantity(Math.max(0, quantity + d))} label="quantity" size="sm" />
            </div>
          </div>
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
        <div>
          <span className="mb-1.5 block text-sm font-semibold text-ink">Stock level</span>
          <div className="grid grid-cols-4 gap-2">
            {states.map((option) =>
            <button
              key={option.value}
              type="button"
              onClick={() => setState(option.value)}
              aria-pressed={state === option.value}
              className={`rounded-xl border py-2.5 text-[13px] font-semibold transition-colors duration-150 ease-out ${
              state === option.value ? option.active : 'border-line bg-canvas text-muted'}`
              }>
              
                {option.label}
              </button>
            )}
          </div>
        </div>
        <TextField label="Note (optional)" value={note} onChange={setNote} placeholder="e.g. Half remaining" />
      </div>
    </BottomSheet>);

}