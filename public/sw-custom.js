// Custom service worker for push notifications
// This extends the next-pwa generated service worker

// Listen for push notifications
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'Boston Builders AI',
    body: 'You have a new notification',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'notification',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        ...data,
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);

  event.notification.close();

  // Default URL to open
  let urlToOpen = '/dashboard';

  // If notification has custom data with a URL, use that
  if (event.notification.data && event.notification.data.url) {
    urlToOpen = event.notification.data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If there's already an open window, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});
