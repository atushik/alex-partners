// Service Worker for Alex-Partners - Push Notifications & Speed
const CACHE_NAME = 'alex-partners-v1.0';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/icon.jpg',
  '/manifest-partner.json'
];

// Install
self.addEventListener('install', (event) => {
  console.log('[SW Partners] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW Partners] Caching assets');
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  console.log('[SW Partners] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW Partners] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('firestore') || url.pathname.includes('firebase')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

// 🔔 PUSH NOTIFICATION HANDLER
self.addEventListener('push', (event) => {
  console.log('[SW Partners] 🔔 Push notification received!', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Nouvelle notification', body: event.data.text() };
    }
  }
  
  const title = data.title || '🔔 AlexLivraison - Nouvelle Commande!';
  const options = {
    body: data.body || 'Vous avez reçu une nouvelle commande',
    icon: '/icon.jpg',
    badge: '/icon.jpg',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'order-notification',
    requireInteraction: true,
    silent: false,
    data: data,
    actions: [
      { action: 'view', title: '👀 Voir', icon: '/icon.jpg' },
      { action: 'dismiss', title: '❌ Fermer' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Partners] Notification clicked:', event.action);
  event.notification.close();
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if window already open
        for (let client of clientList) {
          if (client.url.includes('alex-partners') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Background sync (for offline order updates)
self.addEventListener('sync', (event) => {
  console.log('[SW Partners] Background sync:', event.tag);
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncOrders() {
  console.log('[SW Partners] Syncing orders...');
  // This will be called when connection is restored
}
