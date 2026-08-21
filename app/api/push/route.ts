import { NextRequest, NextResponse } from 'next/server';
import {
  getVapidPublicKey,
  saveSubscription,
  removeSubscription,
  sendPushNotification,
  syncScheduledAlarms,
  pushSubscriptionsStore,
  scheduledAlarmsStore,
  ScheduledAlarmRecord
} from '@/lib/pushServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      vapidPublicKey: getVapidPublicKey(),
      subscriptionsCount: pushSubscriptionsStore.size,
      scheduledAlarmsCount: scheduledAlarmsStore.size
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao obter configuração Push' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'subscribe') {
      const { subscription, userId, deviceId } = body;
      if (!subscription || !subscription.endpoint) {
        return NextResponse.json(
          { success: false, error: 'Inscrição Push inválida ou sem endpoint' },
          { status: 400 }
        );
      }

      const record = saveSubscription(subscription, userId, deviceId);
      return NextResponse.json({
        success: true,
        message: 'Inscrição Push registrada com sucesso',
        recordId: record.id
      });
    }

    if (action === 'unsubscribe') {
      const { endpoint } = body;
      if (endpoint) {
        removeSubscription(endpoint);
      }
      return NextResponse.json({
        success: true,
        message: 'Inscrição Push removida com sucesso'
      });
    }

    if (action === 'test') {
      const { userId, deviceId, endpoint, title, body: msgBody, sound, alarmType } = body;

      const result = await sendPushNotification(
        {
          title: title || '🚨 Ágio Agenda - Teste de Notificação Push',
          body: msgBody || 'Teste com som nativo e vibração ativados! Toque aqui para abrir o aplicativo.',
          sound: sound || '/alarm.mp3',
          alarmType: alarmType || 'sound',
          url: '/?test_push=1',
          vibrate: [400, 150, 400, 150, 800],
          tag: `test-push-${Date.now()}`
        },
        { userId, deviceId, endpoint }
      );

      return NextResponse.json({
        success: true,
        result
      });
    }

    if (action === 'sync_alarms') {
      const { userId, alarms } = body;
      if (Array.isArray(alarms)) {
        const records: ScheduledAlarmRecord[] = alarms.map((a: any) => ({
          id: a.id || `${a.appointmentId}-${a.leadTimeMinutes}-${a.triggerTimestampMs}`,
          appointmentId: a.appointmentId,
          userId: userId || a.userId,
          title: a.title || 'Compromisso',
          date: a.date,
          time: a.time,
          triggerTimestampMs: Number(a.triggerTimestampMs),
          alarmType: a.alarmType || 'sound',
          customAudioUrl: a.customAudioUrl,
          contact: a.contact,
          address: a.address,
          leadTimeMinutes: Number(a.leadTimeMinutes || 0),
          dispatched: false
        }));

        syncScheduledAlarms(records, userId);
      }

      return NextResponse.json({
        success: true,
        scheduledCount: scheduledAlarmsStore.size
      });
    }

    return NextResponse.json(
      { success: false, error: 'Ação não suportada' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Push API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro no servidor de Push' },
      { status: 500 }
    );
  }
}
