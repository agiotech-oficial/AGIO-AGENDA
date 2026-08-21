/**
 * Wake Lock and Background Execution Manager
 * Keeps the screen alive and prevents background timer throttling when alarms are active.
 */

let wakeLockSentinel: any = null;
let isWakeLockRequested = false;
let keepAliveAudio: HTMLAudioElement | null = null;
let silentAudioContext: AudioContext | null = null;
let keepAliveInterval: NodeJS.Timeout | null = null;

/**
 * Checks if Screen Wake Lock API is supported
 */
export function isWakeLockSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'wakeLock' in navigator;
}

/**
 * Requests Screen Wake Lock
 */
export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  isWakeLockRequested = true;

  if ('wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      
      wakeLockSentinel.addEventListener('release', () => {
        // If release was unexpected and still requested, re-acquire when visible
        if (isWakeLockRequested && document.visibilityState === 'visible') {
          requestScreenWakeLock().catch(() => {});
        }
      });

      startBackgroundKeepAlive();
      return true;
    } catch (err) {
      console.warn('Wake Lock request rejected or failed:', err);
      startBackgroundKeepAlive();
      return false;
    }
  } else {
    // Fallback keep alive
    startBackgroundKeepAlive();
    return false;
  }
}

/**
 * Releases the Screen Wake Lock and stops background audio keep-alive
 */
export async function releaseScreenWakeLock(): Promise<void> {
  isWakeLockRequested = false;
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (e) {
      console.warn('Error releasing wake lock:', e);
    }
    wakeLockSentinel = null;
  }
  stopBackgroundKeepAlive();
}

/**
 * Starts a lightweight silent audio loop to keep browser process and audio engine alive in background
 */
export function startBackgroundKeepAlive(): void {
  if (typeof window === 'undefined') return;

  try {
    if (!silentAudioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        silentAudioContext = new AudioCtx();
      }
    }

    if (silentAudioContext && silentAudioContext.state === 'suspended') {
      silentAudioContext.resume().catch(() => {});
    }

    // Ping audio context every 25 seconds with 0-gain buffer to prevent background suspension
    if (!keepAliveInterval && silentAudioContext) {
      keepAliveInterval = setInterval(() => {
        try {
          if (silentAudioContext && silentAudioContext.state !== 'closed') {
            if (silentAudioContext.state === 'suspended') {
              silentAudioContext.resume().catch(() => {});
            }
            const osc = silentAudioContext.createOscillator();
            const gain = silentAudioContext.createGain();
            gain.gain.setValueAtTime(0.00001, silentAudioContext.currentTime); // Inaudible
            osc.connect(gain);
            gain.connect(silentAudioContext.destination);
            osc.start();
            osc.stop(silentAudioContext.currentTime + 0.05);
          }
        } catch (e) {
          // ignore background ping errors
        }
      }, 25000);
    }
  } catch (e) {
    console.warn('Silent audio keep alive error:', e);
  }
}

/**
 * Stops background keep alive
 */
export function stopBackgroundKeepAlive(): void {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (keepAliveAudio) {
    keepAliveAudio.pause();
    keepAliveAudio = null;
  }
}

// Auto re-acquire wake lock on visibility change if requested
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isWakeLockRequested && !wakeLockSentinel) {
      requestScreenWakeLock().catch(() => {});
    }
  });
}
