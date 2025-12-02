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
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Handle API routes with cache-first strategy
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Return cached response if available and not too old
        if (cachedResponse) {
          // Fetch fresh data in background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse.clone())
              })
            }
          }).catch(() => {})
          return cachedResponse
        }
        
        // If no cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const responseToCache = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache)
              })
            }
            return response
          })
          .catch(() => {
            // Return empty array for API errors
            return new Response(JSON.stringify([]), {
              headers: { 'Content-Type': 'application/json' }
            })
          })
      })
    )
    return
  }

  // Handle static assets with network-first strategy
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

