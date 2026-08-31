'use client';

import { PlusIcon } from 'lucide-react';

export function FloatingAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      // A plain `bottom-24` clears BottomNav's own height on most devices, but not on a phone
      // with a home-indicator safe area — BottomNav pads itself for `env(safe-area-inset-bottom)`
      // (up to ~34px on notched iPhones), which a fixed 6rem does not, so the nav ends up taller
      // than the button's clearance and visually overlaps its bottom half. Match the same inset.
      className="absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss-600 text-white shadow-lift transition-colors duration-150 ease-out hover:bg-moss-700"
    >
      <PlusIcon className="h-6 w-6" />
    </button>
  );
}
