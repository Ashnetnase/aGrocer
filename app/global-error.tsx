'use client';

import { useEffect } from 'react';
import './globals.css';

/**
 * Last-resort boundary: catches failures in the root layout itself, so it has
 * to supply its own <html> and <body>.
 *
 * Deliberately dependency-free — no shared components, no icon library, no
 * font variable. Whatever broke may be the thing those imports rely on, and a
 * fallback that can itself fail is not a fallback.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[agrocer] fatal error', error);
  }, [error]);

  return (
    <html lang="en-NZ">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#F0EAE0] px-6">
          <div className="w-full max-w-[360px] rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-card">
            <h1 className="text-lg font-bold text-ink">Agrocer couldn’t start</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Something failed before the app could load. Your data is stored on this device and hasn’t
              been touched.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 h-12 w-full rounded-2xl bg-moss-600 text-[15px] font-bold text-white"
            >
              Reload Agrocer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
