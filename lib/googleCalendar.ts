import { getFirebaseAuth } from './firebase';
import { GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged } from 'firebase/auth';

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events'
];

let cachedAccessToken: string | null = null;
let isConnecting = false;

// Event listener callbacks
type AuthCallback = (connected: boolean, user: User | null) => void;
const listeners: Set<AuthCallback> = new Set();

export const subscribeToGCalAuth = (cb: AuthCallback) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const notifyListeners = (connected: boolean, user: User | null) => {
  listeners.forEach(cb => {
    try {
      cb(connected, user);
    } catch (e) {
      console.error('Error in GCal listener:', e);
    }
  });
};

// Check if token is available
export const isGoogleCalendarConnected = (): boolean => {
  return !!cachedAccessToken;
};

export const getGoogleCalendarToken = (): string | null => {
  return cachedAccessToken;
};

// Initialize auth state
export const initGoogleCalendarAuth = (onStatusChange?: AuthCallback) => {
  if (onStatusChange) {
    listeners.add(onStatusChange);
  }

  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      cachedAccessToken = null;
      notifyListeners(false, null);
    }
  });
};

// Connect with Google Calendar using Firebase Auth Popup
export const connectGoogleCalendar = async (): Promise<{ success: boolean; user?: User; token?: string; error?: string }> => {
  if (isConnecting) return { success: false, error: 'Conexão já em andamento' };
  isConnecting = true;

  try {
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    CALENDAR_SCOPES.forEach(scope => provider.addScope(scope));
    provider.setCustomParameters({
      prompt: 'consent',
      access_type: 'offline'
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      notifyListeners(true, result.user);
      return { success: true, user: result.user, token: cachedAccessToken };
    } else {
      throw new Error('Não foi possível obter o token de acesso da Google');
    }
  } catch (error: any) {
    console.error('Erro ao conectar Google Calendar:', error);
    return { success: false, error: error.message || 'Erro de autenticação' };
  } finally {
    isConnecting = false;
  }
};

export const disconnectGoogleCalendar = () => {
  cachedAccessToken = null;
  notifyListeners(false, null);
};

export interface GCalInjectOptions {
  leadTimes?: string[];
  autoAlarmSound?: boolean;
}

export interface GCalInjectResult {
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
}

/**
 * Injeta ou atualiza de forma silenciosa e precisa a configuração do Alarme Inteligente no Google Agenda.
 * O Google Agenda então dispara o alarme/notificação sonora nativa do sistema nos minutos programados.
 */
export const injectAppointmentToGoogleCalendar = async (
  appointment: {
    id: string | number;
    title: string;
    date: string;
    time?: string;
    contact?: string;
    address?: string;
    description?: string;
    notes?: string;
    reminders?: string[];
    gcalEventId?: string;
    alarmType?: 'text' | 'sound';
  },
  options?: GCalInjectOptions
): Promise<GCalInjectResult> => {
  if (!cachedAccessToken) {
    return {
      success: false,
      error: 'Google Agenda não conectado. Conecte sua conta Google para habilitar a injeção silenciosa.'
    };
  }

  try {
    const dateStr = appointment.date; // "YYYY-MM-DD"
    const timeStr = appointment.time || '09:00'; // "HH:MM"
    
    // Constrói data de início e fim no formato ISO com Timezone local
    const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(startDateTime.getTime())) {
      throw new Error('Data ou horário inválido');
    }

    // Duração padrão de 1 hora
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    // Antecedências do alarme inteligente (em minutos)
    const rawLeadTimes = options?.leadTimes || appointment.reminders || ['0'];
    const reminderMinutes: number[] = Array.from(
      new Set(
        rawLeadTimes
          .map(rt => {
            const num = parseInt(String(rt).replace(/[^\d]/g, ''), 10);
            return isNaN(num) ? 0 : num;
          })
          .filter(mins => mins >= 0 && mins <= 40320) // até 4 semanas
      )
    );

    if (reminderMinutes.length === 0) {
      reminderMinutes.push(0); // Na hora do compromisso por padrão
    }

    // Configuração dos lembretes pop-up no Google Agenda
    const overrides = reminderMinutes.map(minutes => ({
      method: 'popup',
      minutes: minutes
    }));

    // Descrição rica com detalhes do agendamento
    const descriptionParts = [
      `⏰ Alarme Inteligente programado via Ágio Agenda`,
      appointment.contact ? `👤 Contato: ${appointment.contact}` : '',
      appointment.address ? `📍 Endereço: ${appointment.address}` : '',
      appointment.notes ? `📝 Notas: ${appointment.notes}` : '',
      appointment.description ? `📋 Detalhes: ${appointment.description}` : '',
      `🔔 Antecedências programadas: ${reminderMinutes.map(m => m === 0 ? 'Na hora' : `${m}min antes`).join(', ')}`
    ].filter(Boolean).join('\n');

    const eventPayload: any = {
      summary: `⏰ ${appointment.title}`,
      description: descriptionParts,
      start: {
        dateTime: startDateTime.toISOString(),
      },
      end: {
        dateTime: endDateTime.toISOString(),
      },
      reminders: {
        useDefault: false,
        overrides: overrides
      }
    };

    if (appointment.address && appointment.address.trim() !== '') {
      eventPayload.location = appointment.address;
    }

    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    let method = 'POST';

    // Se já tiver gcalEventId, atualiza silenciosamente (PUT)
    if (appointment.gcalEventId) {
      url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(appointment.gcalEventId)}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      // Se der 404 ao atualizar, tenta criar um novo
      if (response.status === 404 && method === 'PUT') {
        const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cachedAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventPayload),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          return {
            success: true,
            eventId: createData.id,
            htmlLink: createData.htmlLink
          };
        }
      }

      throw new Error(errData?.error?.message || `Erro ${response.status} ao sincronizar com Google Agenda`);
    }

    const data = await response.json();
    return {
      success: true,
      eventId: data.id,
      htmlLink: data.htmlLink
    };
  } catch (error: any) {
    console.error('Erro na injeção silenciosa no Google Agenda:', error);
    return {
      success: false,
      error: error.message || 'Erro ao sincronizar com Google Agenda'
    };
  }
};

/**
 * Remove evento sincronizado do Google Agenda quando o compromisso for excluído.
 */
export const deleteEventFromGoogleCalendar = async (gcalEventId: string): Promise<boolean> => {
  if (!cachedAccessToken || !gcalEventId) return false;

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(gcalEventId)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${cachedAccessToken}`,
        },
      }
    );
    return response.ok || response.status === 404;
  } catch (e) {
    console.error('Erro ao deletar evento no Google Agenda:', e);
    return false;
  }
};
