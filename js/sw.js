const CACHE_NAME = 'legal-nexus-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.jpg',
  './css/styles.css',
  './js/config.js',
  './js/utils.js',
  './js/database.js',
  './js/router.js',
  './js/omnibar.js',
  './js/canvas.js',
  './js/dictionary.js',
  './js/intel.js',
  './js/concepts.js',
  './js/dossiers.js',
  './js/ai-engine.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    })
  );
});