import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MealsScreen } from '@/features/meals/MealsScreen';

export const metadata: Metadata = { title: 'Meals · Agrocer' };

export default function MealsPage() {
  return (
    <Suspense>
      <MealsScreen />
    </Suspense>
  );
}
