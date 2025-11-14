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
  // Skip non-GET requests - let browser handle them
  if (event.request.method !== 'GET') {
    return;
  }

  // Parse URL early to check if we should handle this request
  let url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    // Invalid URL, skip - let browser handle it
    return;
  }

  // Skip unsupported request schemes (chrome-extension, moz-extension, etc.)
  // Only handle http and https requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Skip API requests - always use network (don't cache)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip navigation requests (document requests) - let React Router handle them
  // We'll only provide a fallback if the network request fails
  const isNavigationRequest = event.request.destination === 'document' || 
                               event.request.mode === 'navigate' ||
                               event.request.mode === 'same-origin';

  // Skip external domains (third-party scripts, analytics, CDNs, etc.)
  // Only cache requests from the same origin
  // Use a more robust check that handles edge cases
  try {
    const requestOrigin = url.origin;
    const serviceWorkerOrigin = self.location.origin;
    
    // If origins don't match, skip (let browser handle external requests)
    if (requestOrigin !== serviceWorkerOrigin) {
      return;
    }
  } catch (e) {
    // If we can't determine origin, skip to be safe
    return;
  }

  // For navigation requests, always fetch fresh (don't cache) but provide offline fallback
  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // For navigation requests, always return fresh response (don't cache)
          return response;
        })
        .catch((error) => {
          // If fetch fails, provide fallback to index.html for SPA routing
          return caches.match('/index.html').then((fallback) => {
            return fallback || new Response('Network error', { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' }
            });
          }).catch(() => {
            return new Response('Network error', { 
              status: 503, 
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // For same-origin requests, handle caching
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
            // Validate response before caching
            if (!response || !response.ok || response.status !== 200) {
              return response;
            }

            // Check response type - only cache 'basic' type (same-origin)
            // 'cors' responses might be from external domains even if URL looks same-origin
            if (response.type !== 'basic' && response.type !== 'default') {
              return response;
            }

            // Double-check response URL is same-origin before caching
            try {
              const responseUrl = new URL(response.url);
              if (responseUrl.origin !== self.location.origin) {
                return response;
              }
            } catch (e) {
              // If we can't parse response URL, don't cache
              return response;
            }

            // Clone the response (streams can only be consumed once)
            const responseToCache = response.clone();

            // Cache the response asynchronously (don't block response)
            // Only cache if request is cacheable
            if (event.request.cache !== 'no-store' && event.request.cache !== 'no-cache') {
              caches.open(CACHE_NAME).then((cache) => {
                // Additional safety check before caching
                try {
                  const requestUrl = new URL(event.request.url);
                  if (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') {
                    cache.put(event.request, responseToCache).catch((err) => {
                      // Silently fail if caching fails (e.g., quota exceeded, unsupported scheme)
                      // Don't log errors for known unsupported schemes
                      if (!err.message || !err.message.includes('unsupported')) {
                        console.warn('[SW] Failed to cache response:', err);
                      }
                    });
                  }
                } catch (e) {
                  // If URL parsing fails, don't cache
                }
              }).catch(() => {
                // If cache.open fails, silently continue
              });
            }

            return response;
          })
          .catch((error) => {
            // If fetch fails, provide fallback for document requests (SPA routing)
            if (event.request.destination === 'document' || event.request.mode === 'navigate') {
              return caches.match('/index.html').then((fallback) => {
                // Return fallback if available, otherwise return a basic error response
                return fallback || new Response('Network error', { 
                  status: 503, 
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                });
              }).catch(() => {
                // If we can't get the fallback, return a basic error response
                return new Response('Network error', { 
                  status: 503, 
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/html' }
                });
              });
            }
            // For non-document requests, re-throw to let browser handle the error
            throw error;
          });
      })
      .catch((error) => {
        // If cache match fails, fetch from network
        return fetch(event.request).catch(() => {
          // If fetch also fails and it's a navigation request, return index.html
          if (event.request.destination === 'document' || event.request.mode === 'navigate') {
            return caches.match('/index.html').then((fallback) => {
              return fallback || new Response('Service Worker error', { 
                status: 503, 
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/html' }
              });
            }).catch(() => {
              return new Response('Service Worker error', { 
                status: 503, 
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/html' }
              });
            });
          }
          // For non-navigation requests, return error response
          return new Response('Service Worker error', { 
            status: 503, 
            statusText: 'Service Unavailable' 
          });
        });
      })
  );
});

