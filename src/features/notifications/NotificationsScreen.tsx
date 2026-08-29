'use client';
import { useEffect, useState } from 'react';
import { BellIcon } from 'lucide-react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';

interface NotificationItem { kind: string; title: string; detail: string }

export function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  useEffect(() => {
    const load = () => fetch('/api/notifications').then((response) => response.ok ? response.json() : null)
      .then((body: { notifications?: NotificationItem[] } | null) => setItems(body?.notifications ?? []))
      .catch(() => setItems([]));
    void load();
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return <><ScreenHeader title="Notifications" subtitle="Helpful household nudges" /><main className="flex-1 overflow-y-auto px-5 pb-8 pt-4">{items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={`${item.kind}-${item.title}-${index}`} className="flex gap-3 rounded-2xl border border-line bg-surface p-4"><BellIcon className="mt-0.5 h-5 w-5 shrink-0 text-honey-600" /><div><p className="font-bold text-ink">{item.title}</p><p className="mt-1 text-sm text-muted">{item.detail}</p></div></li>)}</ul> : <p className="mt-8 text-center text-muted">No notifications right now.</p>}</main></>;
}
