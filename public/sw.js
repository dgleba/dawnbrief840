const CACHE_NAME = 'dawnbrief-pwa-v22';
const SWVERSION_NAME = 'ver22';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install Event: Pre-cache core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching App Shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Service Worker] Pre-cache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Serve cached assets or fetch from network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore non-GET requests or unsupported protocols
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. CRITICAL FOR ANDROID PWA AUDIO RELIABILITY:
  // Never intercept cross-origin requests (all podcast audio streams, CDNs, and media redirects).
  // Cross-origin audio streaming uses HTTP Range 206 responses which cannot be cached by the Cache API.
  // Passing through allows the Android media pipeline to stream, buffer, pause, and seek natively.
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Never intercept audio, video, or range requests even if same-origin
  if (
    request.destination === 'audio' ||
    request.destination === 'video' ||
    request.headers.has('range') ||
    url.pathname.match(/\.(mp3|m4a|aac|ogg|wav|webm|flac)($|\?)/i)
  ) {
    return;
  }

  // 4. API Requests: Network first, fallback to cached JSON if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open('dawnbrief-api-cache').then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || Response.error());
        })
    );
    return;
  }

  // 5. Static App Shell Assets & Navigation: Stale-While-Revalidate / Network First
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok && request.method === 'GET') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Skip waiting message listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
