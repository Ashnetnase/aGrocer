import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ShoppingScreen } from '@/features/shopping/ShoppingScreen';

export const metadata: Metadata = { title: 'Shopping · Agrocer' };

export default function ShoppingPage() {
  return (
    <Suspense>
      <ShoppingScreen />
    </Suspense>
  );
}
