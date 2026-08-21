/**
 * Client-Side Web Push Notifications Manager
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getPushPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

/**
 * Registers the Service Worker and Subscribes to Web Push
 */
export async function registerPushServiceWorker(userId?: string): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  subscription?: PushSubscription | null;
  error?: string;
}> {
  if (!isPushSupported()) {
    return { supported: false, permission: 'denied', subscribed: false, error: 'Push não suportado neste navegador' };
  }

  try {
    // 1. Request Notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { supported: true, permission, subscribed: false, error: 'Permissão de notificação negada' };
    }

    // 2. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    // 3. Get VAPID Public Key from server
    const vapidRes = await fetch('/api/push', { method: 'GET' });
    const vapidData = await vapidRes.json();
    if (!vapidData.success || !vapidData.vapidPublicKey) {
      throw new Error('Falha ao obter chave pública VAPID do servidor');
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidData.vapidPublicKey);

    // 4. Check existing subscription or subscribe
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any
      });
    }

    // 5. Send subscription to server
    const deviceId = localStorage.getItem('device_id') || localStorage.getItem('deviceId') || undefined;
    const subJson = subscription.toJSON();

    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'subscribe',
        subscription: subJson,
        userId: userId || localStorage.getItem('last_logged_in_user_whatsapp') || undefined,
        deviceId
      })
    });

    return {
      supported: true,
      permission,
      subscribed: true,
      subscription
    };
  } catch (err: any) {
    console.error('Erro ao registrar Push Notification:', err);
    return {
      supported: true,
      permission: getPushPermissionStatus(),
      subscribed: false,
      error: err.message || 'Erro inesperado ao registrar Push'
    };
  }
}

/**
 * Sends a real test Web Push notification to current device via server
 */
export async function testNativePushNotification(userId?: string): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const regResult = await registerPushServiceWorker(userId);
    if (!regResult.subscribed) {
      // If permission is granted directly, fallback to native Notification API
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('🚨 Ágio Agenda - Teste Nativo', {
          body: 'Teste de notificação nativa com som e vibração ativados!',
          icon: '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
          badge: '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
          tag: `test-native-${Date.now()}`
        });
        return { success: true, result: 'Local fallback notification dispatched' };
      }
      return { success: false, error: regResult.error || 'Permissão não concedida' };
    }

    const deviceId = localStorage.getItem('device_id') || localStorage.getItem('deviceId') || undefined;
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'test',
        userId: userId || localStorage.getItem('last_logged_in_user_whatsapp') || undefined,
        deviceId,
        title: '🚨 Ágio Agenda - Teste Push Nativo',
        body: 'Disparo de alarme com vibração e som! Toque aqui para abrir seu compromisso.',
        sound: '/alarm.mp3',
        alarmType: 'sound'
      })
    });

    const data = await res.json();
    return data;
  } catch (e: any) {
    console.error('Erro ao testar Push:', e);
    return { success: false, error: e.message };
  }
}

/**
 * Synchronizes upcoming appointments with the server push alarm scheduler
 */
export async function syncUpcomingAppointmentsToPushServer(
  appointments: any[],
  userId?: string,
  alarmSettings?: {
    alarmLeadTimes?: string[];
    alarmType?: 'text' | 'sound';
    customAudioUrl?: string;
  }
): Promise<void> {
  if (!appointments || appointments.length === 0) return;

  try {
    const now = Date.now();
    const leadTimes = alarmSettings?.alarmLeadTimes || ['0'];
    const defaultAlarmType = alarmSettings?.alarmType || 'sound';
    const customAudioUrl = alarmSettings?.customAudioUrl;

    const alarmsToSchedule: any[] = [];

    appointments.forEach((app) => {
      if (!app.date || !app.time) return;

      const [y, m, d] = app.date.split('-').map(Number);
      const [h, min] = app.time.split(':').map(Number);
      if (!y || !m || !d) return;

      const appDate = new Date(y, m - 1, d, h || 0, min || 0, 0);
      const appTimestamp = appDate.getTime();

      // Get lead times: either from appointment reminders or default alarm lead times
      const activeLeadTimes: string[] = (app.reminders && app.reminders.length > 0)
        ? app.reminders.map((r: string) => r.replace('m', '').replace('h', '60'))
        : leadTimes;

      activeLeadTimes.forEach((lt) => {
        const leadMin = parseInt(lt, 10) || 0;
        const triggerTime = appTimestamp - leadMin * 60 * 1000;

        // Schedule only if trigger time is in future or within last 2 minutes
        if (triggerTime > now - 120000 && triggerTime < now + 7 * 24 * 60 * 60 * 1000) {
          alarmsToSchedule.push({
            id: `${app.id}-${leadMin}-${triggerTime}`,
            appointmentId: app.id,
            userId: userId || app.userId,
            title: app.title,
            date: app.date,
            time: app.time,
            triggerTimestampMs: triggerTime,
            alarmType: app.alarmType || defaultAlarmType,
            customAudioUrl: app.customAudioUrl || customAudioUrl,
            contact: app.contact,
            address: app.address,
            leadTimeMinutes: leadMin
          });
        }
      });
    });

    if (alarmsToSchedule.length > 0) {
      await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_alarms',
          userId,
          alarms: alarmsToSchedule
        })
      });

      // Also notify active Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_SCHEDULED_ALARMS',
          alarms: alarmsToSchedule
        });
      }
    }
  } catch (e) {
    console.warn('Erro ao sincronizar alarmes push com o servidor:', e);
  }
}
