import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The shell every wall-dashboard card shares.
 *
 * Sized for a 10–11" tablet read from across the kitchen: larger type than the phone app,
 * generous padding, and no dense controls. Detailed editing stays in the normal app views.
 */

interface DashboardCardProps {
  title: string;
  /** Shown beside the title — a count, a total, a time. Kept short. */
  meta?: string;
  /** Marks a card whose data is not real yet, so nobody mistakes mock data for the family's. */
  placeholder?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function DashboardCard({
  title,
  meta,
  placeholder,
  action,
  className,
  children,
}: DashboardCardProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-sm',
        className,
      )}
    >
      <header className="mb-3 flex shrink-0 items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
          {meta ? <span className="text-sm font-semibold text-muted">{meta}</span> : null}
        </div>
        {action}
      </header>

      {/* Scrolls inside its own card, so a long list never makes the wall display scroll. */}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

      {placeholder ? (
        <p className="mt-3 shrink-0 rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-muted">
          Placeholder — real data arrives with {placeholder}
        </p>
      ) : null}
    </section>
  );
}
