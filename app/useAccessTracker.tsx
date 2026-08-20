import { useEffect, useRef } from 'react';

export function useAccessTracker(currentUser: any) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    if (typeof window === 'undefined') return;
    
    // We only track once per session
    const sessionTracked = sessionStorage.getItem('agenda_session_tracked');
    if (sessionTracked) {
       trackedRef.current = true;
       return;
    }

    const trackAccess = async () => {
      try {
        let ip = 'Desconhecido';
        let location = 'Desconhecido';
        let city = '', state = '', country = '', neighborhood = '';

        try {
          const response = await fetch('/api/ip');
          if (response.ok) {
            const data = await response.json();
            ip = data.ip || 'Desconhecido';
            city = data.city || '';
            state = data.region || data.region_code || '';
            country = data.country_name || data.country || '';
            neighborhood = '';
            location = data.location || [city, state, country].filter(Boolean).join(', ') || 'Desconhecido';
          }
        } catch (e) {
          // Graceful fallback
        }

        const logs = JSON.parse(localStorage.getItem('agenda_tracking_logs') || '[]');
        
        // Find existing users to get demographic info if currentUser is not passed
        let demographicData = {};
        if (currentUser) {
           demographicData = {
              age: currentUser.age,
              gender: currentUser.gender,
              profession: currentUser.profession,
              deviceId: currentUser.deviceId,
           };
        } else {
           const deviceId = localStorage.getItem('agenda_device_id') || 'unknown';
           demographicData = { deviceId };
        }

        const newLog = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          timestamp: new Date().toISOString(),
          type: 'access',
          ip,
          location,
          city,
          state,
          country,
          neighborhood,
          userId: currentUser?.id || 'anonymous',
          userName: currentUser?.name || 'Visitante',
          userEmail: currentUser?.email || '',
          details: 'Acesso ao aplicativo',
          ...demographicData
        };

        logs.push(newLog);
        localStorage.setItem('agenda_tracking_logs', JSON.stringify(logs));
        sessionStorage.setItem('agenda_session_tracked', 'true');
        trackedRef.current = true;
      } catch (err) {
        // Silent error handling for telemetry
      }
    };

    trackAccess();
  }, [currentUser]);
}
