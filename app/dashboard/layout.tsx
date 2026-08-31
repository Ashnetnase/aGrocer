import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { HydrationGate } from '@/components/layout/HydrationGate';

/**
 * The wall dashboard's own layout.
 *
 * Deliberately not the `(app)` shell: that frame is a phone-width column with a bottom nav,
 * which is exactly wrong on a tablet mounted on a wall. The dashboard fills the screen and
 * navigates only through the explicit links on its cards.
 *
 * It shares the hydration gate for the same reason the app does (ADR-009) — the server cannot
 * know the family's data or the device's current date.
 */

export const metadata: Metadata = {
  title: 'AshHome Dashboard',
  description: 'The shared family command centre.',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <HydrationGate>{children}</HydrationGate>;
}
