// Service Worker for Memoriae PWA
// Provides offline capabilities and enables app installation

const CACHE_NAME = 'memoriae-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((err) => {
        console.error('[SW] Failed to cache assets:', err);
      })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests - always use network
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Skip unsupported request schemes (chrome-extension, moz-extension, etc.)
  // Only cache http and https requests
  let url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    // Invalid URL, skip
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip external domains (third-party scripts, analytics, etc.)
  // Only cache requests from the same origin
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) {
    // Let external requests pass through without caching
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Only cache same-origin responses
            const responseUrl = new URL(response.url);
            if (responseUrl.origin !== self.location.origin) {
              return response;
            }

            // Clone the response (streams can only be consumed once)
            const responseToCache = response.clone();

            // Cache the response (only for same-origin http/https requests)
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch((err) => {
                // Silently fail if caching fails (e.g., quota exceeded, unsupported scheme)
                console.warn('[SW] Failed to cache response:', err);
              });
            });

            return response;
          })
          .catch((error) => {
            // If fetch fails, provide fallback for document requests
            if (event.request.destination === 'document') {
              return caches.match('/index.html').then((fallback) => {
                // Return fallback if available, otherwise return a basic error response
                return fallback || new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
              }).catch(() => {
                // If we can't get the fallback, return a basic error response
                return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
              });
            }
            // For non-document requests, re-throw to let browser handle the error
            // This will cause the fetch to fail, which is the expected behavior
            throw error;
          });
      })
      .catch((error) => {
        // If cache match fails or fetch fails for non-document requests,
        // try fetching directly (this will fail but browser will handle it)
        return fetch(event.request).catch(() => {
          // If all else fails, return a basic error response
          return new Response('Service Worker error', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

