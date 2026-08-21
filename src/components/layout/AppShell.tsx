import type { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

/**
 * The phone frame from the Magic Patterns design.
 *
 * Two changes from the prototype, both device-fit fixes rather than redesign:
 * `100dvh` instead of `h-screen` so mobile browser chrome does not crop the
 * bottom nav, and safe-area padding for notched devices in standalone PWA mode.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-[#F0EAE0] py-0 md:py-10">
      <div className="relative flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-canvas md:h-[880px] md:rounded-[38px] md:border md:border-black/5 md:shadow-lift">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
