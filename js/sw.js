const CACHE_NAME = 'legal-nexus-cache-v5'; 
const urlsToCache = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.png', // Fixed to .png to match your manifest
  './css/styles.css',
  './css/overrides.css', // Added missing css
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
  './js/ai-engine.js',
  './js/graph.js',
  './js/playbooks.js', 
  './js/dashboard.js', 
  './js/main.js',
  './js/flashcards.js',
  './js/templates.js'
];

self.addEventListener('install', event => {
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
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
  // Claim clients immediately so the new SW takes control
  event.waitUntil(self.clients.claim());
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