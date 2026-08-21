import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * The card used by the offline, error and not-found screens.
 *
 * Shared so a failure never looks like it came from a different application —
 * an installed PWA has no browser chrome to explain an unstyled error page.
 */
export function MessageScreen({
  icon: Icon,
  title,
  body,
  children,
  tone = 'moss',
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: ReactNode;
  tone?: 'moss' | 'berry';
}) {
  const toneClass = tone === 'berry' ? 'bg-berry-50 text-berry-600' : 'bg-moss-50 text-moss-600';

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#F0EAE0] px-6">
      <div className="w-full max-w-[360px] rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-card">
        <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">{title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
        {children ? <div className="mt-5 flex flex-col gap-2.5">{children}</div> : null}
      </div>
    </div>
  );
}
