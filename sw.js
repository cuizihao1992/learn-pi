const CACHE = 'learn-pi-v5';
const BASE_PATH = '/learn-pi';
const OFFLINE_URL = `${BASE_PATH}/offline.html`;

const STATIC_RESOURCES = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  OFFLINE_URL,
  `${BASE_PATH}/styles.css`,
  `${BASE_PATH}/app.js`,
  `${BASE_PATH}/theme.js`,
  `${BASE_PATH}/enhance.js`,
  `${BASE_PATH}/site-search.js`,
  `${BASE_PATH}/search-index.json`,
  `${BASE_PATH}/content-manifest.json`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/icon-192.png`,
  `${BASE_PATH}/icon-512.png`,
  `${BASE_PATH}/assets/screenshots/home.png`,
  `${BASE_PATH}/assets/screenshots/progress.png`,
  `${BASE_PATH}/vendor/lunr.min.js`
];

function shouldCache(request, response) {
  return request.method === 'GET' && response && response.ok && response.type === 'basic';
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(STATIC_RESOURCES.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin || !url.pathname.startsWith(`${BASE_PATH}/`)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (shouldCache(request, response)) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (shouldCache(request, response)) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
