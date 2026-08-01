'use client';

import { useEffect, useState } from 'react';

export function AutoUpdater() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [intervalMs, setIntervalMs] = useState(300000); // Default 5 mins

  useEffect(() => {
    // Read from localStorage to know interval and if it's enabled
    const loadSettings = () => {
      const settingsStr = localStorage.getItem('agenda_settings');
      if (settingsStr) {
        try {
          const settings = JSON.parse(settingsStr);
          setIsEnabled(!!settings.autoUpdateEnabled);
          if (settings.autoUpdateInterval) {
            setIntervalMs(settings.autoUpdateInterval * 60 * 1000);
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    
    loadSettings();
    // Re-check settings occasionally
    const settingsInterval = setInterval(loadSettings, 60000);
    return () => clearInterval(settingsInterval);
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    let currentVersion: string | null = null;

    const checkVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${new Date().getTime()}`, {
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (currentVersion === null) {
            // First successful load
            currentVersion = data.version || '1.0';
          } else if (currentVersion !== data.version) {
            // Version differs! Refresh to get new files from Hostgator
            console.log(`Nova versão detectada (${data.version}). Atualizando o app...`);
            window.location.reload();
          }
        }
      } catch (e) {
        // network issue or file not found, silently ignore to not spam console
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, intervalMs);
    
    return () => clearInterval(interval);
  }, [isEnabled, intervalMs]);

  return null; // This component handles side-effects only
}
