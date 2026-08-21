'use client';

import { PlusIcon } from 'lucide-react';

export function FloatingAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="absolute bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-moss-600 text-white shadow-lift transition-colors duration-150 ease-out hover:bg-moss-700"
    >
      <PlusIcon className="h-6 w-6" />
    </button>
  );
}
