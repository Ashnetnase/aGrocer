import React from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';

interface Props {
  value: number;
  unit?: string;
  onChange: (delta: number) => void;
  size?: 'sm' | 'md';
  label: string;
}

export function QuantityStepper({ value, unit, onChange, size = 'md', label }: Props) {
  const button =
  size === 'sm' ?
  'h-8 w-8 rounded-lg' :
  'h-10 w-10 rounded-xl';

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-line bg-canvas p-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(-1)}
        className={`${button} flex items-center justify-center bg-surface text-ink shadow-sm transition-colors duration-150 ease-out hover:bg-moss-50 active:bg-moss-100 disabled:opacity-40`}
        disabled={value <= 0}>
        
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className={`min-w-[52px] text-center font-semibold text-ink ${size === 'sm' ? 'text-sm' : 'text-base'}`}>
        {value}
        {unit ? <span className="ml-0.5 text-xs font-medium text-muted">{unit}</span> : null}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(1)}
        className={`${button} flex items-center justify-center bg-surface text-ink shadow-sm transition-colors duration-150 ease-out hover:bg-moss-50 active:bg-moss-100`}>
        
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>);

}