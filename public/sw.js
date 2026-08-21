const CACHE_NAME = 'agenda-agio-v1.0.9';

// In-memory array of scheduled alarms managed by Service Worker
let scheduledWorkerAlarms = [];
let workerAlarmInterval = null;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Periodic check inside SW for scheduled alarms
function startWorkerAlarmChecker() {
  if (workerAlarmInterval) return;
  workerAlarmInterval = setInterval(() => {
    const now = Date.now();
    scheduledWorkerAlarms.forEach((alarm, index) => {
      if (!alarm.dispatched) {
        const diff = alarm.triggerTimestampMs - now;
        if (diff <= 5000 && diff >= -60000) {
          alarm.dispatched = true;
          const isSound = alarm.alarmType === 'sound';
          const title = isSound ? `🚨 ALARME: ${alarm.title}` : `⏰ Lembrete: ${alarm.title}`;
          const body = `Horário: ${alarm.time}. Toque aqui para abrir o compromisso!`;

          self.registration.showNotification(title, {
            body: body,
            icon: '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
            badge: '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
            vibrate: isSound ? [500, 200, 500, 200, 800, 300, 800] : [300, 100, 300],
            tag: `alarm-${alarm.appointmentId}-${alarm.triggerTimestampMs}`,
            requireInteraction: true,
            renotify: true,
            data: {
              url: `/?open_app_id=${alarm.appointmentId}`,
              appointmentId: alarm.appointmentId,
              alarmType: alarm.alarmType
            },
            actions: [
              { action: 'open_appointment', title: 'Abrir Compromisso' },
              { action: 'dismiss', title: 'Dispensar' }
            ]
          });
        }
      }
    });
  }, 10000);
}

startWorkerAlarmChecker();

// Push Notification Event Handler (Web Push from Server)
self.addEventListener('push', (event) => {
  let data = {
    title: '🚨 Ágio Agenda',
    body: 'Você tem um alarme ou compromisso programado!',
    icon: '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
    badge: '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
    vibrate: [400, 150, 400, 150, 800],
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
    badge: data.badge || '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
    vibrate: data.vibrate || [500, 200, 500, 200, 800, 300, 800],
    tag: data.tag || `agio-push-${Date.now()}`,
    requireInteraction: true,
    renotify: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open_app', title: 'Abrir Agenda' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions).then(() => {
      // Notify any open client windows
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PUSH_ALARM_RECEIVED',
            payload: data
          });
        });
      });
    })
  );
});

// Notification Click Handler: 1-Tap to Open App at Appointment
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';
  const appointmentId = event.notification.data ? event.notification.data.appointmentId : null;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (appointmentId) {
            client.postMessage({
              type: 'NAVIGATE_APPOINTMENT',
              appointmentId: appointmentId
            });
          }
          return client;
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Message Listener from Main Window
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'SYNC_SCHEDULED_ALARMS') {
    scheduledWorkerAlarms = Array.isArray(event.data.alarms) ? event.data.alarms : [];
  }
});

// Fetch cache & network fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' || event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
