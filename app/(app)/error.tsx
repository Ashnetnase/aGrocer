'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TriangleAlertIcon } from 'lucide-react';
import { MessageScreen } from '@/components/layout/MessageScreen';

/**
 * Catches render errors inside the app shell.
 *
 * The family's data lives in localStorage and is untouched by a render failure,
 * so the copy says so — the instinct on seeing an error screen is to assume the
 * shopping list is gone.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[agrocer] screen failed to render', error);
  }, [error]);

  return (
    <MessageScreen
      icon={TriangleAlertIcon}
      tone="berry"
      title="That screen didn’t load"
      body="Something went wrong rendering this page. Your pantry, list and planner are stored on this device and haven’t been touched."
    >
      <button
        type="button"
        onClick={reset}
        className="h-12 rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700"
      >
        Try again
      </button>
      <Link
        href="/"
        className="flex h-12 items-center justify-center rounded-2xl border border-line bg-canvas text-[15px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line"
      >
        Back to home
      </Link>
    </MessageScreen>
  );
}
