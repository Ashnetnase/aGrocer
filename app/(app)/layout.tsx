import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HydrationGate } from '@/components/layout/HydrationGate';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <HydrationGate>{children}</HydrationGate>
    </AppShell>
  );
}
