const CACHE_NAME = 'rfb-inventory-v1'

// Install service worker
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from network, cache for offline
self.addEventListener('fetch', (event) => {
  // Skip API routes and non-GET requests
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone()
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return response
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request)
    })
  )
})

