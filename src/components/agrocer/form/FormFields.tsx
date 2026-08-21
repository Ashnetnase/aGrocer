'use client';

import { useId } from 'react';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { QuantityStepper } from '../QuantityStepper';

/**
 * React Hook Form bindings for the Magic Patterns field styles.
 *
 * Each field renders exactly the prototype's markup and adds what it was
 * missing: a real label association, `aria-invalid`, and an inline error
 * message driven by the Zod resolver.
 */

interface BaseProps<TValues extends FieldValues> {
  control: Control<TValues>;
  name: FieldPath<TValues>;
  label: string;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] font-medium text-berry-600">
      {message}
    </p>
  );
}

export function FormTextField<TValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: BaseProps<TValues> & { placeholder?: string }) {
  const id = useId();
  const { field, fieldState } = useController({ control, name });
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={field.value ?? ''}
        onChange={field.onChange}
        onBlur={field.onBlur}
        ref={field.ref}
        placeholder={placeholder}
        aria-invalid={fieldState.invalid || undefined}
        aria-describedby={fieldState.error ? errorId : undefined}
        className={cn(
          'h-12 w-full rounded-2xl border bg-canvas px-4 text-[15px] text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2',
          fieldState.error
            ? 'border-berry-500 focus:border-berry-500 focus:ring-berry-50'
            : 'border-line focus:border-moss-400 focus:ring-moss-100',
        )}
      />
      <FieldError id={errorId} message={fieldState.error?.message} />
    </div>
  );
}

/**
 * Numeric input that keeps the raw string in the DOM but hands React Hook Form
 * a `number`, so Zod validates the real value rather than a coerced `0`.
 */
export function FormNumberField<TValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  step = '0.01',
}: BaseProps<TValues> & { placeholder?: string; step?: string }) {
  const id = useId();
  const { field, fieldState } = useController({ control, name });
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={field.value === undefined || field.value === null || Number.isNaN(field.value) ? '' : field.value}
        onChange={(event) => {
          const raw = event.target.value;
          field.onChange(raw === '' ? undefined : Number(raw));
        }}
        onBlur={field.onBlur}
        ref={field.ref}
        placeholder={placeholder}
        aria-invalid={fieldState.invalid || undefined}
        aria-describedby={fieldState.error ? errorId : undefined}
        className={cn(
          'h-12 w-full rounded-2xl border bg-canvas px-4 text-[15px] text-ink placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2',
          fieldState.error
            ? 'border-berry-500 focus:border-berry-500 focus:ring-berry-50'
            : 'border-line focus:border-moss-400 focus:ring-moss-100',
        )}
      />
      <FieldError id={errorId} message={fieldState.error?.message} />
    </div>
  );
}

export function FormQuantityField<TValues extends FieldValues>({
  control,
  name,
  label,
  min = 0,
  size = 'md',
}: BaseProps<TValues> & { min?: number; size?: 'sm' | 'md' }) {
  const { field, fieldState } = useController({ control, name });
  const value: number = typeof field.value === 'number' ? field.value : min;

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <div className={size === 'sm' ? 'flex h-12 items-center' : undefined}>
        <QuantityStepper
          value={value}
          min={min}
          size={size}
          label={label.toLowerCase()}
          onChange={(delta) => field.onChange(Math.max(min, value + delta))}
        />
      </div>
      <FieldError id={`${name}-error`} message={fieldState.error?.message} />
    </div>
  );
}

/** Wrapping pill selector — used for category, stock level and member role. */
export function FormChipSelect<TValues extends FieldValues, TOption extends string>({
  control,
  name,
  label,
  options,
  columns,
  activeClassName,
  renderLabel,
}: BaseProps<TValues> & {
  options: readonly TOption[];
  /** When set, renders a fixed grid instead of a wrapping pill row. */
  columns?: number;
  /** Per-option active styling, e.g. stock levels use their own colours. */
  activeClassName?: (option: TOption) => string;
  /** Display text when the stored value is not what the family should read. */
  renderLabel?: (option: TOption) => string;
}) {
  const { field, fieldState } = useController({ control, name });

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <div
        role="group"
        aria-label={label}
        className={columns ? 'grid gap-2' : 'flex flex-wrap gap-2'}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((option) => {
          const active = field.value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => field.onChange(option)}
              aria-pressed={active}
              className={cn(
                'border font-semibold transition-colors duration-150 ease-out',
                columns ? 'rounded-xl py-2.5 text-[13px]' : 'rounded-full px-3 py-1.5 text-[13px]',
                active
                  ? (activeClassName?.(option) ?? 'border-moss-600 bg-moss-600 text-white')
                  : 'border-line bg-canvas text-muted hover:text-ink',
              )}
            >
              {renderLabel ? renderLabel(option) : option}
            </button>
          );
        })}
      </div>
      <FieldError id={`${name}-error`} message={fieldState.error?.message} />
    </div>
  );
}

/** The full-width toggle card used for "Priority" and the settings switches. */
export function FormToggleCard<TValues extends FieldValues>({
  control,
  name,
  label,
  description,
  icon,
  activeClassName = 'border-clay-400 bg-clay-50',
}: BaseProps<TValues> & {
  description?: string;
  icon?: (active: boolean) => React.ReactNode;
  activeClassName?: string;
}) {
  const { field } = useController({ control, name });
  const active = Boolean(field.value);

  return (
    <button
      type="button"
      onClick={() => field.onChange(!active)}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors duration-150 ease-out',
        active ? activeClassName : 'border-line bg-canvas',
      )}
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
      {icon ? (
        icon(active)
      ) : (
        <span
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ease-out',
            active ? 'bg-moss-600' : 'bg-line',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-all duration-150 ease-out',
              active ? 'left-[22px]' : 'left-0.5',
            )}
          />
        </span>
      )}
    </button>
  );
}
