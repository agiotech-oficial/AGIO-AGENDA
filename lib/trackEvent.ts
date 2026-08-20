export interface TrackingEvent {
  id: string;
  timestamp: string;
  type: 'click' | 'navigation' | 'login' | 'action';
  details: string;
  userId: string;
  userEmail: string;
  userName: string;
  ip: string;
  location: string;
  userAgent: string;
}

let cachedIpInfo = { ip: 'unknown', location: 'unknown' };

if (typeof window !== 'undefined') {
  // Try to fetch location
  fetch('/api/ip')
    .then(r => r.json())
    .then(data => {
      if (data.ip) {
        cachedIpInfo = {
          ip: data.ip,
          location: data.location || `${data.city || 'Desconhecido'}, ${data.region || ''} - ${data.country_name || ''}`
        };
      }
    })
    .catch(() => {});
}

export function trackEvent(
  type: TrackingEvent['type'],
  details: string,
  user?: any
) {
  if (typeof window === 'undefined') return;

  const logsStr = localStorage.getItem('agenda_tracking_logs') || '[]';
  let logs: TrackingEvent[] = [];
  try {
    logs = JSON.parse(logsStr);
  } catch (e) {}

  const uid = user ? (user.id || user.uid) : 'GUEST';
  const uemail = user ? user.email : 'guest@guest';
  const uname = user ? (user.name || user.displayName || 'Convidado') : 'Convidado';

  const newEvent: TrackingEvent = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    type,
    details,
    userId: uid || 'GUEST',
    userEmail: uemail || 'guest@guest',
    userName: uname || 'Convidado',
    ip: cachedIpInfo.ip,
    location: cachedIpInfo.location,
    userAgent: navigator.userAgent
  };

  logs.push(newEvent);
  
  // Keep only last 1000 events to avert huge storage limit hits
  if (logs.length > 1000) {
    logs = logs.slice(logs.length - 1000);
  }
  
  localStorage.setItem('agenda_tracking_logs', JSON.stringify(logs));
}
