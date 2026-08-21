import React from 'react';
import { SearchIcon } from 'lucide-react';

export function SearchField({
  value,
  onChange,
  placeholder




}: {value: string;onChange: (value: string) => void;placeholder: string;}) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 text-[15px] text-ink placeholder:text-muted focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100" />
      
    </div>);

}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'






}: {label: string;value: string;onChange: (value: string) => void;placeholder?: string;type?: string;}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[15px] text-ink placeholder:text-muted focus:border-moss-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-moss-100" />
      
    </label>);

}

export function ChipRow({
  options,
  value,
  onChange,
  ariaLabel





}: {options: string[];value: string;onChange: (value: string) => void;ariaLabel: string;}) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ease-out ${
            active ? 'bg-moss-600 text-white' : 'bg-surface text-muted border border-line hover:text-ink'}`
            }>
            
            {option}
          </button>);

      })}
    </div>);

}