import type { Metadata } from 'next';
import { ShoppingModeScreen } from '@/features/shopping/ShoppingModeScreen';

export const metadata: Metadata = { title: 'Shopping mode · Agrocer' };

export default function ShoppingModePage() {
  return <ShoppingModeScreen />;
}
