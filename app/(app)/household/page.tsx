import type { Metadata } from 'next';
import { HouseholdScreen } from '@/features/household/HouseholdScreen';

export const metadata: Metadata = { title: 'Household · Agrocer' };

export default function HouseholdPage() {
  return <HouseholdScreen />;
}
