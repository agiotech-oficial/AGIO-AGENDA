// Utility to automatically and mandatorily capture Device MAC Identifier and Geolocation / IP Location

export interface DeviceInfo {
  deviceId: string;
  macAddress: string;
  allowedDeviceIds: string[];
}

export interface UserLocationInfo {
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  location: string;
  ip: string;
  accuracy?: number;
}

export interface DeviceAndLocation {
  deviceId: string;
  macAddress: string;
  allowedDeviceIds: string[];
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  location: string;
  ip: string;
}

/**
 * Generates a stable, unique hardware-based MAC address format (e.g. 02:4A:8B:1C:9D:E4)
 * and a persistent Device ID for the client device / browser.
 */
export function getDeviceAndMacInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceId: 'DEVICE-SERVER',
      macAddress: '02:00:00:00:00:00',
      allowedDeviceIds: ['DEVICE-SERVER']
    };
  }

  // Check if previously stored in localStorage
  let savedDeviceId = localStorage.getItem('device_id') || localStorage.getItem('agenda_device_id') || '';
  let savedMac = localStorage.getItem('agenda_mac_address') || '';

  if (!savedDeviceId || !savedMac) {
    // Generate deterministic hardware-based fingerprint components
    try {
      const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || String(new Date().getTimezoneOffset());
      const cores = navigator.hardwareConcurrency || 4;
      const mem = (navigator as any).deviceMemory || 4;
      const ua = navigator.userAgent || '';
      const platform = (navigator as any).platform || '';
      const lang = navigator.language || '';

      // Canvas fingerprint
      let canvasHash = 0;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = "14px 'Arial'";
          ctx.fillStyle = '#f60';
          ctx.fillRect(125, 1, 62, 20);
          ctx.fillStyle = '#069';
          ctx.fillText('ÁgioAgenda-Device-FP', 2, 15);
          ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
          ctx.fillText('ÁgioAgenda-Device-FP', 4, 17);
          const dataUrl = canvas.toDataURL();
          for (let i = 0; i < dataUrl.length; i++) {
            canvasHash = ((canvasHash << 5) - canvasHash) + dataUrl.charCodeAt(i);
            canvasHash |= 0;
          }
        }
      } catch (e) {
        canvasHash = 987654321;
      }

      // Combine seed
      const seedStr = `${ua}|${platform}|${screenInfo}|${tz}|${cores}|${mem}|${lang}|${canvasHash}`;
      
      // Hash seed to 6 bytes for MAC Address
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      for (let i = 0; i < seedStr.length; i++) {
        const ch = seedStr.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      
      const b1 = (Math.abs(h1) & 0xfe) | 0x02; // locally administered unicast MAC
      const b2 = (Math.abs(h1 >> 8)) & 0xff;
      const b3 = (Math.abs(h1 >> 16)) & 0xff;
      const b4 = (Math.abs(h2) & 0xff);
      const b5 = (Math.abs(h2 >> 8)) & 0xff;
      const b6 = (Math.abs(h2 >> 16)) & 0xff;

      const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
      savedMac = `${toHex(b1)}:${toHex(b2)}:${toHex(b3)}:${toHex(b4)}:${toHex(b5)}:${toHex(b6)}`;
      savedDeviceId = `MAC-${savedMac.replace(/:/g, '')}`;
    } catch (e) {
      // Safe fallback
      const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
      savedMac = `02:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}`;
      savedDeviceId = `MAC-${savedMac.replace(/:/g, '')}`;
    }

    localStorage.setItem('device_id', savedDeviceId);
    localStorage.setItem('agenda_device_id', savedDeviceId);
    localStorage.setItem('agenda_mac_address', savedMac);
  }

  // Ensure all keys are synchronized
  if (!localStorage.getItem('device_id')) localStorage.setItem('device_id', savedDeviceId);
  if (!localStorage.getItem('agenda_device_id')) localStorage.setItem('agenda_device_id', savedDeviceId);
  if (!localStorage.getItem('agenda_mac_address')) localStorage.setItem('agenda_mac_address', savedMac);

  return {
    deviceId: savedDeviceId,
    macAddress: savedMac,
    allowedDeviceIds: [savedDeviceId]
  };
}

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim with fast timeout
 */
async function reverseGeocodeCoords(lat: number, lng: number): Promise<{ city: string; state: string; country: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' }
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
      const state = addr.state_code || addr.state || '';
      const country = addr.country || 'Brasil';
      return { city, state, country };
    }
  } catch (e) {
    // Ignore and fallback
  }
  return null;
}

/**
 * Fetch IP location from our internal API / external fallback
 */
async function fetchIpLocation(): Promise<UserLocationInfo> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/api/ip', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        return {
          city: data.city || '',
          state: data.region_code || data.region || '',
          country: data.country_name || data.country || 'Brasil',
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          location: data.location || [data.city, data.region, data.country_name].filter(Boolean).join(', ') || 'Desconhecido',
          ip: data.ip || '127.0.0.1'
        };
      }
    }
  } catch (e) {
    // ignore
  }

  // Backup external lookup if internal fails
  try {
    const res = await fetch('https://ipapi.co/json/');
    if (res.ok) {
      const data = await res.json();
      return {
        city: data.city || '',
        state: data.region_code || data.region || '',
        country: data.country_name || 'Brasil',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        location: `${data.city || ''}, ${data.region_code || data.region || ''} - ${data.country_name || ''}`.replace(/^, | - $/g, ''),
        ip: data.ip || 'unknown'
      };
    }
  } catch (e) {}

  return {
    city: '',
    state: '',
    country: 'Brasil',
    latitude: null,
    longitude: null,
    location: 'Desconhecido',
    ip: 'unknown'
  };
}

/**
 * Captures the exact location of the user (GPS Geolocation prioritized, with IP Fallback)
 */
export async function captureUserLocation(): Promise<UserLocationInfo> {
  if (typeof window === 'undefined') {
    return {
      city: '',
      state: '',
      country: 'Brasil',
      latitude: null,
      longitude: null,
      location: 'Desconhecido',
      ip: 'unknown'
    };
  }

  // 1. Fetch IP location first as immediate baseline
  const ipLocPromise = fetchIpLocation();

  // 2. Try browser GPS Geolocation in parallel
  let gpsResult: UserLocationInfo | null = null;
  if ('geolocation' in navigator) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: 60000
        });
      });

      if (pos && pos.coords) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        // Try reverse geocoding to get City and State
        const geoAddr = await reverseGeocodeCoords(lat, lng);
        const ipLoc = await ipLocPromise;

        const city = geoAddr?.city || ipLoc.city || '';
        const state = geoAddr?.state || ipLoc.state || '';
        const country = geoAddr?.country || ipLoc.country || 'Brasil';
        const locationStr = [city, state, country].filter(Boolean).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

        gpsResult = {
          city,
          state,
          country,
          latitude: lat,
          longitude: lng,
          location: locationStr,
          ip: ipLoc.ip,
          accuracy
        };
      }
    } catch (e) {
      // GPS denied, timed out, or unavailable
    }
  }

  if (gpsResult) {
    return gpsResult;
  }

  return await ipLocPromise;
}

/**
 * Automatically captures both MAC / Device ID and Location in a single synchronous/asynchronous call
 */
export async function autoCaptureDeviceAndLocation(): Promise<DeviceAndLocation> {
  const dev = getDeviceAndMacInfo();
  const loc = await captureUserLocation();

  return {
    deviceId: dev.deviceId,
    macAddress: dev.macAddress,
    allowedDeviceIds: dev.allowedDeviceIds,
    city: loc.city,
    state: loc.state,
    country: loc.country,
    latitude: loc.latitude,
    longitude: loc.longitude,
    location: loc.location,
    ip: loc.ip
  };
}
