import type { Metadata } from 'next';
import { KidsScreen } from '@/features/kids/KidsScreen';

export const metadata: Metadata = { title: 'Kids & School · Agrocer' };

export default function KidsPage() {
  return <KidsScreen />;
}
