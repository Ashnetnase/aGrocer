import type { Metadata } from 'next';
import { SettingsScreen } from '@/features/settings/SettingsScreen';

export const metadata: Metadata = { title: 'Settings · Agrocer' };

export default function SettingsPage() {
  return <SettingsScreen />;
}
