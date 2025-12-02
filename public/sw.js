// RFB Inventory - Offline-First Service Worker
const CACHE_NAME = 'rfb-inventory-v3'
const RUNTIME_CACHE = 'rfb-runtime-v3'
const DATA_CACHE = 'rfb-data-v3'

// Critical files for offline functionality
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/raw-materials',
  '/essential-items',
  '/recipes',
  '/production',
  '/purchases',
  '/cost-calculator',
  '/reports',
  '/settings',
  '/manifest.json',
  '/favicon.ico',
]

// Install - cache critical resources immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell')
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => {
        console.log('[SW] Skip waiting')
        return self.skipWaiting()
      })
      .catch((err) => {
        console.error('[SW] Cache failed:', err)
      })
  )
})

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== RUNTIME_CACHE && 
                     cacheName !== DATA_CACHE
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            })
        )
      })
      .then(() => {
        console.log('[SW] Claiming clients')
        return self.clients.claim()
      })
  )
})

// Fetch - offline-first strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // API requests - Cache first, then network (for offline support)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          // Return cached data immediately
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              // Update cache with fresh data
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone())
              }
              return networkResponse
            })
            .catch(() => {
              // Network failed, return cached data
              return cachedResponse || new Response(
                JSON.stringify({ 
                  offline: true, 
                  error: 'Offline mode - cached data only' 
                }),
                { 
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }
              )
            })

          // Return cached response if available, otherwise wait for network
          return cachedResponse || fetchPromise
        })
      })
    )
    return
  }

  // Static assets and pages - Cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version immediately
        // Update cache in background
        fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, networkResponse)
            })
          }
        }).catch(() => {})
        
        return cachedResponse
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((networkResponse) => {
          // Cache successful responses
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch((err) => {
          console.error('[SW] Fetch failed:', err)
          // Return offline page
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <title>Offline - RFB Inventory</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: #f3f4f6;
                  }
                  .container {
                    text-align: center;
                    padding: 2rem;
                    background: white;
                    border-radius: 1rem;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                  }
                  .icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                  }
                  h1 {
                    color: #dc2626;
                    margin: 0 0 1rem 0;
                  }
                  p {
                    color: #6b7280;
                    margin: 0.5rem 0;
                  }
                  button {
                    margin-top: 1.5rem;
                    padding: 0.75rem 1.5rem;
                    background: #dc2626;
                    color: white;
                    border: none;
                    border-radius: 0.5rem;
                    font-size: 1rem;
                    cursor: pointer;
                  }
                  button:hover {
                    background: #b91c1c;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">📡</div>
                  <h1>You're Offline</h1>
                  <p>RFB Inventory Management</p>
                  <p>Please check your internet connection</p>
                  <p>Cached data is available in the app</p>
                  <button onclick="window.location.reload()">Try Again</button>
                </div>
              </body>
            </html>`,
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' }
            }
          )
        })
    })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

// Sync data when back online
async function syncData() {
  try {
    console.log('[SW] Syncing data...')
    // Implement your sync logic here
    return Promise.resolve()
  } catch (error) {
    console.error('[SW] Sync failed:', error)
    return Promise.reject(error)
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls)
      })
    )
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        )
      })
    )
  }
})

// Push notification support (future)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('RFB Inventory', options)
  )
})

console.log('[SW] Service Worker loaded - Offline support enabled ✓')
