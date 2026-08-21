import webpush from 'web-push';

// Stable VAPID Keys for Web Push Notifications
// These allow browser clients (Chrome, Android, Edge, Safari, Firefox) to verify and receive push notifications from this server
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4OOT5ydvjYpG31S-Qsm3d-mE02wK3xGvJk5l2uE';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contato@agioagenda.com';

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn('VAPID setup warning:', e);
}

export interface PushSubscriptionRecord {
  id: string;
  userId?: string;
  deviceId?: string;
  subscription: webpush.PushSubscription;
  createdAt: number;
  lastActive: number;
}

export interface ScheduledAlarmRecord {
  id: string;
  appointmentId: string;
  userId?: string;
  title: string;
  date: string;
  time: string;
  triggerTimestampMs: number; // Unix timestamp in ms
  alarmType: 'text' | 'sound';
  customAudioUrl?: string;
  contact?: string;
  address?: string;
  leadTimeMinutes: number;
  dispatched?: boolean;
}

// In-memory persistent stores for subscriptions and scheduled alarms
const globalForPush = globalThis as unknown as {
  pushSubscriptions?: Map<string, PushSubscriptionRecord>;
  scheduledAlarms?: Map<string, ScheduledAlarmRecord>;
  alarmDispatchInterval?: NodeJS.Timeout | null;
};

if (!globalForPush.pushSubscriptions) {
  globalForPush.pushSubscriptions = new Map();
}

if (!globalForPush.scheduledAlarms) {
  globalForPush.scheduledAlarms = new Map();
}

export const pushSubscriptionsStore = globalForPush.pushSubscriptions;
export const scheduledAlarmsStore = globalForPush.scheduledAlarms;

/**
 * Returns the public VAPID key to provide to the client
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Saves or updates a client push subscription
 */
export function saveSubscription(
  subscription: webpush.PushSubscription,
  userId?: string,
  deviceId?: string
): PushSubscriptionRecord {
  const id = subscription.endpoint;
  const existing = pushSubscriptionsStore.get(id);
  const now = Date.now();

  const record: PushSubscriptionRecord = {
    id,
    userId: userId || existing?.userId,
    deviceId: deviceId || existing?.deviceId,
    subscription,
    createdAt: existing?.createdAt || now,
    lastActive: now,
  };

  pushSubscriptionsStore.set(id, record);
  return record;
}

/**
 * Removes an expired or invalid subscription
 */
export function removeSubscription(endpoint: string): boolean {
  return pushSubscriptionsStore.delete(endpoint);
}

/**
 * Sends a native Web Push Notification to all or specific user subscriptions
 */
export async function sendPushNotification(
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    url?: string;
    appointmentId?: string;
    sound?: string;
    alarmType?: 'text' | 'sound';
    vibrate?: number[];
    tag?: string;
    data?: any;
  },
  filter?: {
    userId?: string;
    deviceId?: string;
    endpoint?: string;
  }
): Promise<{ successCount: number; failureCount: number; errors: any[] }> {
  let targets: PushSubscriptionRecord[] = Array.from(pushSubscriptionsStore.values());

  if (filter?.endpoint) {
    targets = targets.filter(t => t.id === filter.endpoint);
  } else {
    if (filter?.userId) {
      const userTargets = targets.filter(t => t.userId === filter.userId);
      if (userTargets.length > 0) {
        targets = userTargets;
      }
    }
    if (filter?.deviceId) {
      const devTargets = targets.filter(t => t.deviceId === filter.deviceId);
      if (devTargets.length > 0) {
        targets = devTargets;
      }
    }
  }

  const notificationData = {
    title: payload.title || 'Ágio Agenda',
    body: payload.body || 'Lembrete de compromisso',
    icon: payload.icon || '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
    badge: payload.badge || '/aba-%C3%ADcone_agenda_%C3%A1gio___100.png',
    vibrate: payload.vibrate || [300, 100, 300, 100, 300, 100, 600],
    sound: payload.sound || '/alarm.mp3',
    tag: payload.tag || `agio-alarm-${Date.now()}`,
    requireInteraction: true,
    data: {
      url: payload.url || '/',
      appointmentId: payload.appointmentId,
      alarmType: payload.alarmType || 'sound',
      timestamp: Date.now(),
      ...(payload.data || {})
    }
  };

  const payloadString = JSON.stringify(notificationData);

  let successCount = 0;
  let failureCount = 0;
  const errors: any[] = [];

  for (const target of targets) {
    try {
      await webpush.sendNotification(target.subscription, payloadString, {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: 'high'
      });
      successCount++;
    } catch (err: any) {
      failureCount++;
      errors.push({ endpoint: target.id, error: err.message, statusCode: err.statusCode });
      // If 410 (Gone) or 404 (Not Found), subscription is no longer valid
      if (err.statusCode === 410 || err.statusCode === 404) {
        pushSubscriptionsStore.delete(target.id);
      }
    }
  }

  return { successCount, failureCount, errors };
}

/**
 * Registers scheduled alarms for background server-side triggering
 */
export function scheduleAlarm(alarm: ScheduledAlarmRecord): void {
  scheduledAlarmsStore.set(alarm.id, alarm);
  startAlarmDispatcherIfNeeded();
}

/**
 * Clears old or specific scheduled alarms
 */
export function syncScheduledAlarms(
  alarms: ScheduledAlarmRecord[],
  userId?: string
): void {
  if (userId) {
    for (const [id, a] of scheduledAlarmsStore.entries()) {
      if (a.userId === userId) {
        scheduledAlarmsStore.delete(id);
      }
    }
  }
  for (const alarm of alarms) {
    scheduledAlarmsStore.set(alarm.id, alarm);
  }
  startAlarmDispatcherIfNeeded();
}

/**
 * Background Alarm Dispatcher
 * Checks every 15 seconds if any scheduled alarm is due and triggers Web Push
 */
function startAlarmDispatcherIfNeeded() {
  if (globalForPush.alarmDispatchInterval) return;

  globalForPush.alarmDispatchInterval = setInterval(async () => {
    const now = Date.now();
    const alarmsToDispatch: ScheduledAlarmRecord[] = [];

    for (const [id, alarm] of scheduledAlarmsStore.entries()) {
      if (!alarm.dispatched) {
        // If trigger time is within window (up to 2 minutes in the past or 10 seconds ahead)
        const diff = alarm.triggerTimestampMs - now;
        if (diff <= 10000 && diff >= -120000) {
          alarmsToDispatch.push(alarm);
          alarm.dispatched = true;
        } else if (diff < -3600000) {
          // Cleanup alarms older than 1 hour
          scheduledAlarmsStore.delete(id);
        }
      }
    }

    for (const alarm of alarmsToDispatch) {
      const isSound = alarm.alarmType === 'sound';
      const labelTime = alarm.leadTimeMinutes === 0 ? 'agora' : `em ${alarm.leadTimeMinutes} min`;
      const title = isSound ? `🚨 ALARME SONORO: ${alarm.title}` : `⏰ Lembrete: ${alarm.title}`;
      const body = `Horário: ${alarm.time} (${labelTime}). Toque para abrir o compromisso!`;

      await sendPushNotification({
        title,
        body,
        appointmentId: alarm.appointmentId,
        alarmType: alarm.alarmType,
        url: `/?open_app_id=${alarm.appointmentId}`,
        vibrate: isSound ? [500, 200, 500, 200, 800, 300, 800] : [300, 100, 300],
        tag: `alarm-${alarm.appointmentId}-${alarm.leadTimeMinutes}`
      }, {
        userId: alarm.userId
      });
    }
  }, 15000);
}

// Ensure dispatcher starts
startAlarmDispatcherIfNeeded();
