import type { Metadata } from 'next';
import { SpecialsScreen } from '@/features/specials/SpecialsScreen';
export const metadata: Metadata = { title: 'Specials · Agrocer' };
export default function SpecialsPage() { return <SpecialsScreen />; }
