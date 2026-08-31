/*
 * Agrocer Stage 1 service worker.
 *
 * Deliberately small and hand-written: the app's data already lives in
 * localStorage, so all this needs to do is keep the shell openable offline.
 * A build-time precache (Workbox / next-pwa) can replace it later without
 * changing how the app behaves.
 */

// Bumped from v1: the old cache could hold a stale /api/* GET response (see the fetch handler
// below), and `activate` only deletes caches whose name has changed — bumping it is what
// actually clears that stale data out of an installed PWA rather than leaving it there forever.
const CACHE = 'agrocer-shell-v2';
const OFFLINE_URL = '/offline';

const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Live household data — every /api/* GET must always hit the network. This used to fall
  // through to the "static assets" cache-first branch below, which is exactly backwards for a
  // dynamic endpoint: once /api/shopping was cached once, every future add/edit/remove could
  // keep being shadowed by that same stale response indefinitely, with no error and no way for
  // the app to know its own data was wrong. Real bug, found from a real "I added it but can't
  // see it" report — not a hypothetical.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigations: network first so the family always gets fresh markup, falling
  // back to the cached page and finally the offline screen.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(OFFLINE_URL)) ?? Response.error()),
    );
    return;
  }

  // Static assets: cache first, they are content-hashed or rarely change.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
