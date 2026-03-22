// JazzNode Service Worker — offline cache + push notifications
// Bump SW_VERSION on each meaningful change to bust the cache.
const SW_VERSION = 3;
const CACHE_NAME = `jazznode-v${SW_VERSION}`;
const PRECACHE_URLS = [
  '/search-index.json',
];

// Install: precache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Notify all clients when a new SW version activates
self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window' }).then((clients) => {
    for (const client of clients) {
      client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
    }
  });
});

// Fetch: network-first for pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Cache-first for search index and static assets
  if (url.pathname === '/search-index.json' || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetched;
      })
    );
    return;
  }

  // Network-first for pages (cache as fallback for offline)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'JazzNode', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/badge-96.png',
    tag: data.tag || 'jazznode-notification',
    data: { url: data.url || '/' },
    actions: data.actions || [],
    // Large image shown when notification is expanded (e.g. event poster)
    ...(data.image && { image: data.image }),
    // Timestamp for notification ordering & grouping
    timestamp: data.timestamp || Date.now(),
    // Re-alert even if a notification with the same tag already exists
    renotify: data.renotify ?? true,
    // iOS ignores vibrate — sound is controlled by system settings
    // Android will use device default notification sound
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'JazzNode', options)
      .then(() => {
        // Update app icon badge count (Badging API)
        if (self.navigator && 'setAppBadge' in self.navigator) {
          return self.navigator.setAppBadge();
        }
      })
  );
});

// Notification click handler — open the linked page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Clear app icon badge when user taps a notification
  if (self.navigator && 'clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge();
  }

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new tab
      return self.clients.openWindow(url);
    })
  );
});
