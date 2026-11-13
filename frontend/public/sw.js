// AURORA MUSIC STREAMING PWA SERVICE WORKER
const CACHE_NAME = 'aurora-app-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/aurora.ico'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve app shell from cache; bypass for audio streams & external APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache audio streams, proxy endpoints, or large media files
  if (
    url.pathname.includes('/stream') ||
    url.pathname.includes('/stream-proxy') ||
    url.hostname.includes('audius') ||
    url.hostname.includes('jamendo') ||
    url.hostname.includes('archive.org') ||
    url.hostname.includes('googlevideo') ||
    url.hostname.includes('youtube') ||
    event.request.headers.get('range')
  ) {
    return; // Pass through to network directly
  }

  // Network-first with cache fallback for app navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Stale-while-revalidate for local static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networked = fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
          }
          return response;
        }).catch(() => cached);
        return cached || networked;
      })
    );
  }
});
