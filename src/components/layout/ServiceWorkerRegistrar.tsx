'use client';

import { useEffect } from 'react';

/**
 * Registers the Stage 1 service worker.
 *
 * Development is skipped on purpose: a cached shell during hot reload is more
 * confusing than useful.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.warn('[agrocer] service worker registration failed', error);
      });
    };

    // Wait for load so registration never competes with the first paint.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
