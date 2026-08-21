'use client';

import { MinusIcon, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  unit?: string;
  onChange: (delta: number) => void;
  size?: 'sm' | 'md';
  /** Used to build the button labels, e.g. "Increase Milk". */
  label: string;
  min?: number;
}

export function QuantityStepper({ value, unit, onChange, size = 'md', label, min = 0 }: QuantityStepperProps) {
  const button = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-line bg-canvas p-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(-1)}
        disabled={value <= min}
        className={cn(
          button,
          'flex items-center justify-center bg-surface text-ink shadow-sm transition-colors duration-150 ease-out hover:bg-moss-50 active:bg-moss-100 disabled:opacity-40',
        )}
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span
        className={cn(
          'min-w-[52px] text-center font-semibold text-ink',
          size === 'sm' ? 'text-sm' : 'text-base',
        )}
      >
        {value}
        {unit ? <span className="ml-0.5 text-xs font-medium text-muted">{unit}</span> : null}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(1)}
        className={cn(
          button,
          'flex items-center justify-center bg-surface text-ink shadow-sm transition-colors duration-150 ease-out hover:bg-moss-50 active:bg-moss-100',
        )}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
