import type { Metadata } from 'next';
import { WifiOffIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Offline · Agrocer' };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#F0EAE0] px-6">
      <div className="w-full max-w-[360px] rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-moss-50 text-moss-600">
          <WifiOffIcon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">You’re offline</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Agrocer couldn’t reach the network for this page. Screens you’ve already opened still work —
          your pantry, list and planner are stored on this device.
        </p>
      </div>
    </div>
  );
}
