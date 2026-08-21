import React from 'react';
import { CheckIcon, FlagIcon } from 'lucide-react';
import { ShoppingItem } from '../../types';
import { nzd } from '../../utils/format';

interface Props {
  item: ShoppingItem;
  shoppingMode: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export function ShoppingRow({ item, shoppingMode, onToggle, onEdit }: Props) {
  const box = shoppingMode ? 'h-11 w-11' : 'h-8 w-8';

  return (
    <div className={`flex items-center gap-3 bg-surface ${shoppingMode ? 'px-4 py-4' : 'px-4 py-3'}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={`Mark ${item.name} as ${item.checked ? 'not bought' : 'bought'}`}
        onClick={onToggle}
        className={`${box} flex shrink-0 items-center justify-center rounded-xl border-2 transition-colors duration-150 ease-out ${
        item.checked ? 'border-moss-600 bg-moss-600 text-white' : 'border-line bg-canvas text-transparent hover:border-moss-300'}`
        }>
        
        <CheckIcon className={shoppingMode ? 'h-6 w-6' : 'h-4 w-4'} strokeWidth={3} />
      </button>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <p
            className={`truncate font-semibold text-ink ${shoppingMode ? 'text-[17px]' : 'text-[15px]'} ${
            item.checked ? 'text-muted line-through' : ''}`
            }>
            
            {item.name}
          </p>
          {item.priority && !item.checked ?
          <FlagIcon className="h-3.5 w-3.5 shrink-0 fill-clay-500 text-clay-500" aria-label="Priority" /> :
          null}
        </div>
        <p className={`mt-0.5 truncate text-muted ${shoppingMode ? 'text-[13px]' : 'text-xs'}`}>
          {item.quantity} × {item.unit}
          {item.note ? ` · ${item.note}` : ''}
        </p>
      </button>

      <span className={`shrink-0 font-semibold ${item.checked ? 'text-muted' : 'text-ink'} ${shoppingMode ? 'text-[15px]' : 'text-sm'}`}>
        {nzd(item.price * item.quantity)}
      </span>
    </div>);

}