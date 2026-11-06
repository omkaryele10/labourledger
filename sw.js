const CACHE = 'labourledger-v1';
const CORE = [
  '/',
  '/index.html',
  '/app/',
  '/app/index.html',
  '/assets/css/fonts.css',
  '/assets/css/base.css',
  '/assets/css/landing.css',
  '/assets/css/app.css',
  '/assets/js/config.js',
  '/assets/js/engine.js',
  '/assets/js/store.js',
  '/assets/js/license.js',
  '/assets/js/pdf.js',
  '/assets/js/app.js',
  '/assets/js/landing.js',
  '/assets/vendor/jspdf.umd.min.js',
  '/assets/img/logo.svg',
  '/assets/img/manrope-latin.woff2',
  '/assets/img/fraunces-latin.woff2',
  '/manifest.webmanifest',
  '/sample-report.pdf'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
