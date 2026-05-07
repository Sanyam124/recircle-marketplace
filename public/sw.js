// --- ReCircle Service Worker ---

// Lifecycle: Immediately activate on install (critical for mobile browsers)
self.addEventListener('install', function(event) {
  // Skip the waiting phase — become active immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  // Claim all open tabs so push works without a page reload
  event.waitUntil(self.clients.claim());
});

// --- Push Notification Handlers ---

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      let payload;
      try {
        payload = event.data.json();
      } catch (err) {
        // Fallback for Chrome DevTools manual text push
        payload = { title: 'Test Push', body: event.data.text() };
      }
      
      var options = {
        body: payload.body || '',
        icon: payload.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: payload.data || { url: '/' },
        vibrate: [100, 50, 100],
        tag: 'recircle-' + Date.now()
      };
      event.waitUntil(
        self.registration.showNotification(payload.title || 'ReCircle', options)
      );
    } catch (e) {
      console.error('Push event parser loop error:', e);
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
