import type { Metadata } from 'next';
import { ChoresScreen } from '@/features/chores/ChoresScreen';

export const metadata: Metadata = { title: 'Chores · Agrocer' };

export default function ChoresPage() {
  return <ChoresScreen />;
}
