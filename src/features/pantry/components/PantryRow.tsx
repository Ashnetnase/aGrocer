'use client';

import type { PantryItem } from '@/domain/schemas/pantry';
import { StockChip } from '@/components/agrocer/StockChip';
import { QuantityStepper } from '@/components/agrocer/QuantityStepper';

interface PantryRowProps {
  item: PantryItem;
  onAdjust: (delta: number) => void;
  onEdit: () => void;
}

export function PantryRow({ item, onAdjust, onEdit }: PantryRowProps) {
  return (
    <div className="flex items-center gap-3 bg-surface px-4 py-3">
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-ink">{item.name}</p>
          <StockChip state={item.state} size="sm" />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {item.quantity} {item.unit}
          {item.note ? ` · ${item.note}` : ''}
        </p>
      </button>
      <QuantityStepper value={item.quantity} onChange={onAdjust} size="sm" label={item.name} />
    </div>
  );
}
