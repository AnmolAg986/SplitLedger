self.addEventListener('push', function(event) {
  if (event.data) {
    let payload = {};
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'SplitLedger Notification', body: event.data.text() };
    }

    const options = {
      body: payload.body || 'You have a new update in SplitLedger.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1'
      },
      ...payload.options
    };

    event.waitUntil(
      self.registration.showNotification(payload.title || 'SplitLedger', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
