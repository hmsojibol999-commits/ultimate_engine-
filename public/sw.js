/* Shadow-Grid service worker (F-25). Plain JS on purpose: no build step, no library.
 * - Shell cache (versioned): the HTML page, icons, manifest. Replaced when SHELL_VERSION changes.
 * - Asset cache (never versioned): Vite files in /assets/ have content hashes, so they never change
 *   and old open tabs can still load their lazy chunks after an update.
 * - Never caches /api/ or /s/ (share links and the assistant must always be live).
 * Bump SHELL_VERSION when this file's behaviour changes. */
const SHELL_VERSION = 'sg-shell-v1';
const ASSET_CACHE = 'sg-assets';
const SHELL_FILES = ['/', '/favicon.svg', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_VERSION).then((cache) => cache.addAll(SHELL_FILES)).catch(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n.startsWith('sg-shell-') && n !== SHELL_VERSION).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isLive(url) {
  return url.pathname.startsWith('/api/') || url.pathname.startsWith('/s/');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || isLive(url)) return; // let the network handle it

  // Page loads: network first (fresh deploys), cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(SHELL_VERSION).then((c) => c.put('/', copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => (await caches.match('/')) || new Response('Offline', { status: 503 })),
    );
    return;
  }

  // Hashed build files: cache first, then fill the cache.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).catch(() => undefined);
        return res;
      }),
    );
    return;
  }

  // Other same-origin files (icons, favicon): cached copy if present, else network.
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
