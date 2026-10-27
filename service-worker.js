// ============================================
// Service Worker — فلوسي راحت فين؟
// Caches app shell for offline support
// ============================================

const CACHE_VERSION = 'flosy-v1.0.0';
const CACHE_FILES = [
  './',
  './index.html',
  './styles.css',
  './db.js',
  './app.js',
  './manifest.json',
];

// Install — cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('Service Worker: Cache failed', err);
      })
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_VERSION)
          .map((name) => {
            console.log('Service Worker: Deleting old cache', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          // Cache new resources dynamically
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // If both cache and network fail, return offline page
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});
