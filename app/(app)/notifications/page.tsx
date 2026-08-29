import type { Metadata } from 'next';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';
export const metadata: Metadata = { title: 'Notifications · Agrocer' };
export default function NotificationsPage() { return <NotificationsScreen />; }
