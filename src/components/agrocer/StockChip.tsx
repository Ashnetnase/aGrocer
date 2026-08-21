import type { StockState } from '@/domain/schemas/common';
import { cn } from '@/lib/utils';

const styles: Record<StockState, { label: string; className: string; dot: string }> = {
  good: { label: 'Good', className: 'bg-moss-50 text-moss-700', dot: 'bg-moss-500' },
  low: { label: 'Low', className: 'bg-honey-50 text-honey-600', dot: 'bg-honey-500' },
  out: { label: 'Out', className: 'bg-berry-50 text-berry-600', dot: 'bg-berry-500' },
  soon: { label: 'Use soon', className: 'bg-clay-50 text-clay-600', dot: 'bg-clay-500' },
};

export function StockChip({ state, size = 'md' }: { state: StockState; size?: 'sm' | 'md' }) {
  const style = styles[state];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        style.className,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden="true" />
      {style.label}
    </span>
  );
}

export const stockLabel = (state: StockState): string => styles[state].label;
