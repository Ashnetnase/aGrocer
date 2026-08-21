import React from 'react';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: {children: React.ReactNode;}) {
  return (
    <div className="flex min-h-full w-full justify-center bg-[#F0EAE0] py-0 md:py-10">
      <div className="relative flex h-screen w-full max-w-[440px] flex-col overflow-hidden bg-canvas md:h-[880px] md:rounded-[38px] md:border md:border-black/5 md:shadow-lift">
        {children}
        <BottomNav />
      </div>
    </div>);

}