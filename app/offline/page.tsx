import type { Metadata } from 'next';
import { WifiOffIcon } from 'lucide-react';
import { MessageScreen } from '@/components/layout/MessageScreen';

export const metadata: Metadata = { title: 'Offline · Agrocer' };

export default function OfflinePage() {
  return (
    <MessageScreen
      icon={WifiOffIcon}
      title="You’re offline"
      body="Agrocer couldn’t reach the network for this page. Screens you’ve already opened still work — your pantry, list and planner are stored on this device."
    />
  );
}
