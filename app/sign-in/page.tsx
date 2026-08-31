import { Suspense } from 'react';
import type { Metadata } from 'next';
import { SignInScreen } from '@/features/auth/SignInScreen';

export const metadata: Metadata = { title: 'Sign in · AshHome' };

/**
 * `useSearchParams` needs a Suspense boundary or the whole route opts out of static
 * rendering. The fallback is the card's own background, so the transition is a fade rather
 * than a flash of white.
 */
export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] w-full bg-[#F0EAE0]" />}>
      <SignInScreen />
    </Suspense>
  );
}
