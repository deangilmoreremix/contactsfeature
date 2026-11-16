// Service worker: offline app shell + cache-first for BUILT STATIC ASSETS only.
//
// Never cached (always network, the worker does not even call respondWith):
//   - anything that is not a same-origin GET
//   - /.netlify/functions/* and /api/*
//   - Supabase and any other cross-origin request (auth, REST, realtime, storage)
// Navigations are network-first; the last good HTML is kept only as an offline fallback.

const VERSION = 'v2';
const STATIC_CACHE = `smartcrm-static-${VERSION}`;
const SHELL_CACHE = `smartcrm-shell-${VERSION}`;
const KEEP = new Set([STATIC_CACHE, SHELL_CACHE]);

// Vite emits content-hashed files under /assets/, so they are immutable and safe to cache-first.
const STATIC_PATH = /^\/assets\/.+\.(?:js|css|woff2?|ttf|png|jpe?g|gif|svg|webp|avif|ico)$/i;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // also removes the v1 caches, which held API responses
      .then((names) => Promise.all(names.filter((n) => !KEEP.has(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, OpenAI proxies, CDNs, ...
  if (url.pathname.startsWith('/.netlify/') || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then((cached) => cached || Response.error())),
    );
    return;
  }

  if (STATIC_PATH.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok && response.type === 'basic') {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
