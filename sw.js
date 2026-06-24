const CACHE = 'learn-pi-v1';
const STATIC_RES = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/theme.js',
  '/enhance.js',
  '/site-search.js',
  '/search-index.json',
  '/content-manifest.json',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/vendor/lunr.min.js',
  '/.nojekyll'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      // Try each resource individually so one failure doesn't block others
      return Promise.allSettled(
        STATIC_RES.map((url) =>
          cache.add(url).catch(() => {/* skip failed */})
        )
      );
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // For page navigations: network-first, fallback to cache
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // For static assets: cache-first
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE).then((c) => c.put(request, clone));
      return res;
    }))
  );
});
