'use client';
import { useEffect, useState } from 'react';
import { BellIcon } from 'lucide-react';
import { ScreenHeader } from '@/components/layout/ScreenHeader';

interface NotificationItem { kind: string; title: string; detail: string }

export function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const load = () => { setLoading(true); setError(false); return fetch('/api/notifications').then((response) => { if (!response.ok) throw new Error('notifications'); return response.json(); })
      .then((body: { notifications?: NotificationItem[] }) => setItems(body.notifications ?? []))
      .catch(() => { setItems([]); setError(true); }).finally(() => setLoading(false)); };
    void load();
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return <><ScreenHeader title="Notifications" subtitle="Helpful household nudges" /><main className="flex-1 overflow-y-auto px-5 pb-8 pt-4" aria-live="polite">{loading ? <p className="mt-8 text-center text-muted">Loading notifications…</p> : error ? <p className="mt-8 text-center text-clay-600">Could not load notifications.</p> : items.length ? <ul className="space-y-2">{items.map((item, index) => <li key={`${item.kind}-${item.title}-${index}`} className="flex gap-3 rounded-2xl border border-line bg-surface p-4"><BellIcon className="mt-0.5 h-5 w-5 shrink-0 text-honey-600" /><div><p className="font-bold text-ink">{item.title}</p><p className="mt-1 text-sm text-muted">{item.detail}</p></div></li>)}</ul> : <p className="mt-8 text-center text-muted">No notifications right now.</p>}<button type="button" onClick={() => window.location.reload()} className="mx-auto mt-5 block text-sm font-semibold text-moss-700 underline">Refresh</button></main></>;
}
