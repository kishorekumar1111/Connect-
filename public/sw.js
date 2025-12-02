// Service Worker for EduMesh PWA
const CACHE_NAME = 'edumesh-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/vite.svg',
  '/assets/index.css',
  '/assets/index.js',
  '/assets/vendor.js',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// Fetch event - serve from cache, fall back to network with network-first strategy for API calls
self.addEventListener('fetch', event => {
  // For API calls, use network-first strategy
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('firestore.googleapis.com') ||
      event.request.url.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // For static assets, use cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(
            response => {
              // Don't cache if not a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            }
          );
        })
        .catch(error => {
          console.log('Fetch failed; returning offline page instead.', error);
          // You could return a custom offline page here
        })
    );
  }
});