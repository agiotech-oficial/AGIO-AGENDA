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
          const response = await fetch('https://ipapi.co/json/');
          if (response.ok) {
            const data = await response.json();
            ip = data.ip || 'Desconhecido';
            city = data.city || '';
            state = data.region || '';
            country = data.country_name || '';
            neighborhood = ''; // ipapi doesn't always give neighborhood, but we get what we can
            location = [city, state, country].filter(Boolean).join(', ');
          }
        } catch (e) {
          console.warn("Failed to fetch IP:", e);
        }

        const logs = JSON.parse(localStorage.getItem('agenda_tracking_logs') || '[]');
        
        // Find existing users to get demographic info if currentUser is not passed
        const users = JSON.parse(localStorage.getItem('agenda_users') || '[]');
        let demographicData = {};
        if (currentUser) {
           demographicData = {
              age: currentUser.age,
              gender: currentUser.gender,
              profession: currentUser.profession,
              deviceId: currentUser.deviceId,
           };
        } else {
           // Maybe we can get device ID from local storage
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
        console.error("Error tracking access", err);
      }
    };

    trackAccess();
  }, [currentUser]);
}
