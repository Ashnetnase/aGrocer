import Link from 'next/link';
import { MapPinOffIcon } from 'lucide-react';
import { MessageScreen } from '@/components/layout/MessageScreen';

export default function NotFound() {
  return (
    <MessageScreen
      icon={MapPinOffIcon}
      title="Nothing here"
      body="That address isn’t part of Agrocer. It may be an old link, or a page that hasn’t been built yet."
    >
      <Link
        href="/"
        className="flex h-12 items-center justify-center rounded-2xl bg-moss-600 text-[15px] font-bold text-white transition-colors duration-150 ease-out hover:bg-moss-700"
      >
        Back to home
      </Link>
    </MessageScreen>
  );
}
