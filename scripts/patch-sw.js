// scripts/patch-sw.js
// Appends push notification handlers to the service worker after build
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');

const pushHandlers = `
// --- ReCircle Push Notification Handlers ---
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      var data = event.data.json();
      var options = {
        body: data.body || '',
        icon: data.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: data.data || { url: '/' },
        vibrate: [100, 50, 100],
        tag: 'recircle-notification'
      };
      event.waitUntil(
        self.registration.showNotification(data.title || 'ReCircle', options)
      );
    } catch (e) {
      console.error('Push event error:', e);
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
`;

if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, 'utf8');
  
  // Fix next-pwa generating an empty importScripts() which throws a TypeError
  content = content.replace(/importScripts\(\),/g, '');

  if (!content.includes('ReCircle Push Notification Handlers')) {
    content += pushHandlers;
    fs.writeFileSync(swPath, content);
    console.log('> [patch-sw] Push notification handlers appended and importScripts bug fixed in sw.js');
  } else {
    // Still save the importScripts fix if needed
    fs.writeFileSync(swPath, content);
    console.log('> [patch-sw] Fixed sw.js formatting');
  }
} else {
  console.warn('> [patch-sw] sw.js not found, skipping');
}
