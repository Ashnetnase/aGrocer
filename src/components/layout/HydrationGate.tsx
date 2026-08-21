'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Renders children only after hydration.
 *
 * Agrocer's content depends on two things the server cannot know: the family's
 * localStorage data and the device's current date. Rendering it server-side
 * would either produce hydration mismatches or flash seeded demo data over the
 * family's real list. The static chrome (canvas, bottom nav) still paints
 * immediately, so the app never looks blank.
 */
export function HydrationGate({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return <>{mounted ? children : fallback}</>;
}
