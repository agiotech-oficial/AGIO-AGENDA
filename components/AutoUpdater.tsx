'use client';

import { useEffect, useState } from 'react';

export function AutoUpdater() {
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    // Helper to trigger update notification and reload
    const triggerAutoUpdate = (msg: string) => {
      if (!isMounted) return;
      setUpdateMessage(msg);
      setUpdating(true);

      setTimeout(() => {
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
        window.location.reload();
      }, 1500);
    };

    // 1. Service Worker registration & immediate update check on open
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for service worker updates immediately on open
          registration.update().catch(() => {});

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  triggerAutoUpdate('Nova atualização instalada! Aplicando alterações...');
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('SW registration warning:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }

    // 2. Immediate version endpoint check on app open
    const checkVersion = async () => {
      try {
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache' },
        });

        if (response.ok) {
          const data = await response.json();
          const serverVersion = data.version;
          const savedVersion = localStorage.getItem('agenda_installed_version');

          if (!savedVersion) {
            localStorage.setItem('agenda_installed_version', serverVersion);
          } else if (savedVersion !== serverVersion) {
            localStorage.setItem('agenda_installed_version', serverVersion);
            triggerAutoUpdate('Nova versão detectada! Atualizando o aplicativo...');
          }
        }
      } catch (e) {
        // Network offline or endpoint unreachable
      }
    };

    // Run check immediately when user opens app
    checkVersion();

    // 3. Periodic background check according to settings (defaults to enabled)
    let intervalId: NodeJS.Timeout | null = null;
    const settingsStr = localStorage.getItem('agenda_settings');
    let autoCheck = true;
    let intervalMins = 5;

    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        if (settings.autoUpdateEnabled === false) autoCheck = false;
        if (settings.autoUpdateInterval) intervalMins = Number(settings.autoUpdateInterval) || 5;
      } catch (e) {
        // Ignore JSON parse error
      }
    }

    if (autoCheck) {
      intervalId = setInterval(checkVersion, intervalMins * 60 * 1000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (!updating) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-[#06402B] text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-400/50 flex items-center gap-3 animate-bounce">
      <span className="material-symbols-outlined text-emerald-400 animate-spin text-xl" translate="no">sync</span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Atualização Automática</p>
        <p className="text-xs text-white/90 font-medium">{updateMessage}</p>
      </div>
    </div>
  );
}

