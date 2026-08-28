'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOutIcon } from 'lucide-react';
import { supabaseBrowser } from '@/auth/browser';

/**
 * Sign out (AshHome Stage 2, ADR-017).
 *
 * Renders nothing when authentication is switched off, rather than offering a button that
 * cannot do anything. `NEXT_PUBLIC_AGROCER_AUTH_OFF` mirrors the server's `AGROCER_AUTH="off"`
 * escape hatch, because a client component cannot read the server-only variable.
 *
 * `router.refresh()` after signing out so the server tree re-renders without the session,
 * instead of the router cache serving the signed-in pages until the next hard load.
 */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (process.env.NEXT_PUBLIC_AGROCER_AUTH_OFF === '1') return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void supabaseBrowser()
          .auth.signOut()
          .then(() => {
            router.replace('/sign-in');
            router.refresh();
          });
      }}
      className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-canvas text-[13.5px] font-bold text-ink transition-colors duration-150 ease-out hover:bg-line disabled:opacity-60"
    >
      <LogOutIcon className="h-4 w-4" /> {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
