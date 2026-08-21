import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PantryScreen } from '@/features/pantry/PantryScreen';

export const metadata: Metadata = { title: 'Pantry · Agrocer' };

export default function PantryPage() {
  // `?add=1` and `?filter=attention` are read with useSearchParams, which needs
  // a Suspense boundary during prerender.
  return (
    <Suspense>
      <PantryScreen />
    </Suspense>
  );
}
