'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LockIcon } from 'lucide-react';
import { supabaseBrowser } from '@/auth/browser';
import { cn } from '@/lib/utils';

/**
 * Sign in (AshHome Stage 2, ADR-017).
 *
 * Built on `MessageScreen`'s language — same canvas, card, radius and shadow — rather than as
 * a new visual idea. An installed PWA has no browser chrome, so a sign-in screen that looks
 * like a different application looks like a phishing page.
 *
 * Email and password, because magic links need email delivery configured and this has to work
 * on the home network today. The session lands in cookies via `@supabase/ssr`, which is what
 * lets the route handlers know who is asking.
 */

/**
 * Supabase reports a wrong password and an unknown email identically, on purpose — telling
 * them apart would let anyone test which addresses have accounts. This keeps that property
 * while replacing the wording, which is written for developers.
 */
export function describeSignInError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password do not match.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email address first, then sign in.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Wait a minute and try again.';
  return 'Could not sign in. Try again.';
}

export function SignInScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(undefined);

    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(describeSignInError(signInError.message));
      setPassword('');
      setBusy(false);
      return;
    }

    // `refresh()` before navigating, so the server re-renders with the new session cookie
    // rather than serving the signed-out tree from the router cache.
    const next = searchParams.get('next') ?? '/';
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#F0EAE0] px-6">
      <div className="w-full max-w-[360px] rounded-3xl border border-line bg-surface px-6 py-10 shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-moss-50 text-moss-600">
          <LockIcon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-center text-lg font-bold text-ink">Sign in to AshHome</h1>
        <p className="mt-1 text-center text-sm leading-relaxed text-muted">
          Your household&rsquo;s groceries, meals and pantry.
        </p>

        <form className="mt-6 flex flex-col gap-3" onSubmit={(event) => void signIn(event)}>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[15px] text-ink placeholder:text-muted focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[15px] text-ink placeholder:text-muted focus:border-moss-400 focus:outline-none focus:ring-2 focus:ring-moss-100"
            />
          </label>

          {error ? (
            // `role="alert"` so a failed attempt is announced, not just recoloured.
            <p role="alert" className="text-sm font-semibold text-clay-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className={cn(
              'mt-1 h-12 rounded-2xl text-[15px] font-bold text-white transition-colors',
              busy ? 'cursor-not-allowed bg-line' : 'bg-moss-700 hover:bg-moss-800',
            )}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-relaxed text-muted">
          Accounts are created in Supabase and linked to a family member with{' '}
          <code className="font-semibold">npm run db:claim</code>. Signing up alone does not
          grant access to a household.
        </p>
      </div>
    </div>
  );
}
