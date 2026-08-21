'use client';

import { SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-muted focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
      />
    </div>
  );
}

/**
 * The horizontally scrolling filter row. Generic over the option type so screens
 * keep their `Category` / filter unions instead of falling back to `string`.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  renderLabel,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  renderLabel?: (option: T) => string;
}) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors duration-150 ease-out',
              active ? 'bg-moss-600 text-white' : 'border border-line bg-surface text-muted hover:text-ink',
            )}
          >
            {renderLabel ? renderLabel(option) : option}
          </button>
        );
      })}
    </div>
  );
}
