'use client';

import React, { useState, useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: any;
    googleMapsScriptLoading?: boolean;
    gm_authFailure?: () => void;
    L?: any;
  }
}

interface AddressLocationPickerProps {
  value: string;
  onChange: (newValue: string) => void;
  isEs?: boolean;
  isEn?: boolean;
  id?: string;
  placeholder?: string;
}

export default function AddressLocationPicker({
  value,
  onChange,
  isEs = false,
  isEn = false,
  id = 'address',
  placeholder,
}: AddressLocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapSearchText, setMapSearchText] = useState('');
  const [isGeocodingSearch, setIsGeocodingSearch] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  // Leaflet map refs & pin state for interactive pin (alfinete)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const leafletMarkerRef = useRef<any>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [isGeocodingPin, setIsGeocodingPin] = useState(false);

  // Load Leaflet CSS and JS dynamically when map modal opens
  useEffect(() => {
    if (!showMapModal) return;

    if (window.L) {
      setIsLeafletLoaded(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setIsLeafletLoaded(true);
      };
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.L) {
          setIsLeafletLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [showMapModal]);

  // Default placeholder
  const defaultPlaceholder = isEs
    ? 'Ej: Av. Paulista, 1000 (Opcional)'
    : isEn
    ? 'E.g., 100 Main St (Optional)'
    : 'Ex: Av. Paulista, 1000 (Opcional)';

  // Intercept Google Maps billing errors to prevent Next.js dev overlay popups
  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
      if (
        msg.includes('Geocoding Service') ||
        msg.includes('enable Billing') ||
        msg.includes('ApiTargetBlockedMapError') ||
        msg.includes('Google Maps JavaScript API error') ||
        msg.includes('gmp-get-started')
      ) {
        console.warn('[Google Maps Billing Notice - Using Free OpenStreetMap Service]:', ...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    window.gm_authFailure = () => {
      console.warn('Google Maps API auth/restriction error: Billing or API may not be enabled on this key.');
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Free Autocomplete Suggestions state (OpenStreetMap / ViaCEP)
  const [suggestions, setSuggestions] = useState<Array<{ title: string; lat?: number; lng?: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const suggestionContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionContainerRef.current && !suggestionContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch free suggestions (ViaCEP if CEP, Nominatim if text)
  const fetchFreeSuggestions = async (query: string) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsFetchingSuggestions(true);
    const cleanQuery = query.trim();

    // Check if query is a Brazilian CEP (8 digits, optional dash)
    const cepMatch = cleanQuery.replace(/\D/g, '');
    if (cepMatch.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepMatch}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            const formatted = `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}, ${data.cep}`;
            setSuggestions([{ title: formatted }]);
            setShowSuggestions(true);
            setIsFetchingSuggestions(false);
            return;
          }
        }
      } catch (err) {
        console.warn('ViaCEP lookup warning:', err);
      }
    }

    // OpenStreetMap Nominatim API search
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cleanQuery
        )}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,es;q=0.8,en;q=0.7' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const items = data.map((item: any) => ({
            title: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }));
          setSuggestions(items);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    } catch (err) {
      console.warn('Nominatim autocomplete warning:', err);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  // Debounced input change for free autocomplete
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    // Debounce suggestion fetching
    const timeoutId = setTimeout(() => {
      fetchFreeSuggestions(val);
    }, 400);

    return () => clearTimeout(timeoutId);
  };

  // Load Google Maps JavaScript API safely in background
  useEffect(() => {
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      'AIzaSyAy1fT71-sfNmoW5Ihm2sqGQhdVb3mS9nI';

    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    if (apiKey && !window.googleMapsScriptLoading) {
      window.googleMapsScriptLoading = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      script.onerror = () => {
        console.warn('Google Maps script failed to load.');
      };
      document.head.appendChild(script);
    }
  }, []);

  // Set up Places Autocomplete on input if Google Maps is loaded
  useEffect(() => {
    if (!mapLoaded || !window.google?.maps?.places || !autocompleteInputRef.current) return;

    try {
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        fields: ['formatted_address', 'geometry', 'name'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place?.formatted_address) {
          onChange(place.formatted_address);
          if (place.geometry?.location) {
            setCoords({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            });
          }
          setLocationStatus(
            isEs ? 'Dirección seleccionada vía Google Maps' : isEn ? 'Address selected via Google Maps' : 'Endereço selecionado via Google Maps'
          );
          setTimeout(() => setLocationStatus(null), 4000);
        }
      });
    } catch (err) {
      console.warn('Google Places Autocomplete init warning:', err);
    }
  }, [mapLoaded, onChange, isEs, isEn]);

  // Function to reverse geocode lat/lng using Nominatim (free, no billing required) or Google Maps fallback
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // Attempt 1: OpenStreetMap Nominatim API (Free, fast, no Google Cloud Billing needed)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addr = data.address || {};
          const street = addr.road || addr.pedestrian || addr.suburb || '';
          const number = addr.house_number ? `, ${addr.house_number}` : '';
          const neighborhood = addr.neighbourhood || addr.suburb ? ` - ${addr.neighbourhood || addr.suburb}` : '';
          const city = addr.city || addr.town || addr.municipality ? `, ${addr.city || addr.town || addr.municipality}` : '';
          const state = addr.state ? ` - ${addr.state}` : '';
          
          if (street) {
            return `${street}${number}${neighborhood}${city}${state}`;
          }
          return data.display_name;
        }
      }
    } catch (e) {
      console.warn('Nominatim reverse geocoding warning:', e);
    }

    // Attempt 2: Google Maps Geocoder if JS SDK loaded and billing enabled
    if (window.google?.maps?.Geocoder) {
      try {
        const geocoder = new window.google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results && response.results[0]) {
          return response.results[0].formatted_address;
        }
      } catch (e) {
        console.warn('Google Maps reverse geocoding warning:', e);
      }
    }

    // Attempt 3: Google Maps REST API if key exists
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      'AIzaSyAy1fT71-sfNmoW5Ihm2sqGQhdVb3mS9nI';

    if (apiKey) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
          return data.results[0].formatted_address;
        }
      } catch (e) {
        console.warn('Google Maps REST Geocoding warning:', e);
      }
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  // Fallback to IP location if browser GPS fails or permission is denied
  const fallbackIpLocation = async () => {
    try {
      const res = await fetch('/api/ip');
      if (res.ok) {
        const data = await res.json();
        if (data && (data.city || data.location !== 'Desconhecido')) {
          const ipAddr = data.location !== 'Desconhecido' ? data.location : `${data.city}, ${data.region || ''} - ${data.country_name || ''}`.replace(/ - $/, '');
          onChange(ipAddr);
          if (data.latitude && data.longitude) {
            setCoords({ lat: data.latitude, lng: data.longitude });
          }
          setLocationStatus(
            isEs
              ? '📍 Ubicación aproximada obtenida (vía IP)'
              : isEn
              ? '📍 Approximate location obtained (via IP)'
              : '📍 Localização aproximada obtida (via IP)'
          );
          setTimeout(() => setLocationStatus(null), 5000);
          return true;
        }
      }
    } catch (e) {
      // Graceful fallback
    }
    return false;
  };

  // Capture current user location using Geolocation API
  const handleCaptureCurrentLocation = async () => {
    if (!navigator.geolocation) {
      const success = await fallbackIpLocation();
      if (!success) {
        alert(
          isEs
            ? 'Geolocalización no soportada por su navegador.'
            : isEn
            ? 'Geolocation is not supported by your browser.'
            : 'Geolocalização não suportada pelo seu navegador.'
        );
      }
      return;
    }

    setIsLocating(true);
    setLocationStatus(
      isEs ? 'Obteniendo ubicación...' : isEn ? 'Getting location...' : 'Obtendo localização...'
    );

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });

        try {
          const addressText = await reverseGeocode(lat, lng);
          onChange(addressText);
          setLocationStatus(
            isEs
              ? '📍 Ubicación capturada automáticamente con Google Maps'
              : isEn
              ? '📍 Location automatically captured with Google Maps'
              : '📍 Localização capturada automaticamente pelo Google Maps'
          );
        } catch (err) {
          console.error(err);
          onChange(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
          setLocationStatus(
            isEs
              ? '📍 Coordenadas capturadas'
              : isEn
              ? '📍 Coordinates captured'
              : '📍 Coordenadas capturadas'
          );
        } finally {
          setIsLocating(false);
          setTimeout(() => setLocationStatus(null), 5000);
        }
      },
      async (error) => {
        setIsLocating(false);

        // Try IP fallback if permission denied or position unavailable
        const fallbackSuccess = await fallbackIpLocation();
        if (fallbackSuccess) return;

        let msg = isEs
          ? 'Error al obtener ubicación. Ingrese el endereço manualmente.'
          : isEn
          ? 'Error getting location. Please enter address manually.'
          : 'Não foi possível obter a localização. Digite o endereço manualmente.';

        if (error.code === error.PERMISSION_DENIED) {
          msg = isEs
            ? 'Permiso de ubicación denegado. Permítalo en el navegador o abra la app en una nueva pestaña.'
            : isEn
            ? 'Location permission denied. Allow it in browser settings or open in a new tab.'
            : 'Permissão de localização negada ou bloqueada no iframe. Permita o acesso no navegador ou abra o app em uma nova aba.';
        }
        setLocationStatus(msg);
        setTimeout(() => setLocationStatus(null), 7000);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Search address inside Map Modal
  const handleMapSearch = async (e?: React.SyntheticEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!mapSearchText.trim()) return;

    setIsGeocodingSearch(true);

    // Attempt 1: Search via Nominatim (Free, no Google billing needed)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          mapSearchText
        )}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data[0]) {
          onChange(data[0].display_name);
          setCoords({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          });
          setIsGeocodingSearch(false);
          return;
        }
      }
    } catch (err) {
      console.warn('Nominatim search warning:', err);
    }

    // Attempt 2: Google Maps Geocoder if JS SDK loaded
    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY ||
      process.env.GOOGLE_MAPS_PLATFORM_KEY ||
      'AIzaSyAy1fT71-sfNmoW5Ihm2sqGQhdVb3mS9nI';

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      try {
        const res = await geocoder.geocode({ address: mapSearchText });
        if (res.results && res.results[0]) {
          const first = res.results[0];
          onChange(first.formatted_address);
          setCoords({
            lat: first.geometry.location.lat(),
            lng: first.geometry.location.lng(),
          });
          setIsGeocodingSearch(false);
          return;
        }
      } catch (err) {
        console.warn('Geocoder search warning:', err);
      }
    }

    if (apiKey) {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            mapSearchText
          )}&key=${apiKey}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results?.[0]) {
          const first = data.results[0];
          onChange(first.formatted_address);
          setCoords({
            lat: first.geometry.location.lat,
            lng: first.geometry.location.lng,
          });
          setIsGeocodingSearch(false);
          return;
        }
      } catch (err) {
        console.warn('REST Geocoder search warning:', err);
      }
    }

    onChange(mapSearchText);
    setIsGeocodingSearch(false);
  };

  // Initialize interactive Leaflet map with draggable Pin (alfinete)
  useEffect(() => {
    if (!showMapModal || !isLeafletLoaded || !mapContainerRef.current) return;
    if (!window.L) return;

    const L = window.L;
    const lat = coords?.lat ?? -23.55052;
    const lng = coords?.lng ?? -46.633308;

    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const map = L.map(mapContainerRef.current).setView([lat, lng], 16);
    leafletMapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Custom Red Pin (Alfinete) icon
    const pinIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: grab; transform: translate(-50%, -100%);">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; width: 40px; height: 40px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,0.6); border: 2.5px solid #ffffff;">
            <span style="transform: rotate(45deg); font-size: 20px; font-weight: bold; margin-top: -2px;">📍</span>
          </div>
          <div style="width: 16px; height: 6px; background: rgba(0,0,0,0.4); border-radius: 50%; filter: blur(1.5px); margin-top: 2px;"></div>
        </div>
      `,
      iconSize: [40, 46],
      iconAnchor: [20, 46],
    });

    const marker = L.marker([lat, lng], {
      draggable: true,
      icon: pinIcon,
    }).addTo(map);

    leafletMarkerRef.current = marker;

    const handlePinPositionChange = async (newLat: number, newLng: number) => {
      setCoords({ lat: newLat, lng: newLng });
      setIsGeocodingPin(true);
      const addr = await reverseGeocode(newLat, newLng);
      setIsGeocodingPin(false);
      if (addr) {
        onChange(addr);
        setMapSearchText(addr);
      }
    };

    // When pin is dragged and dropped
    marker.on('dragend', async (e: any) => {
      const pos = e.target.getLatLng();
      await handlePinPositionChange(pos.lat, pos.lng);
    });

    // When clicking anywhere on map
    map.on('click', async (e: any) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      marker.setLatLng([clickLat, clickLng]);
      await handlePinPositionChange(clickLat, clickLng);
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [showMapModal, isLeafletLoaded]);

  // Sync Leaflet map center & pin position when coordinates change
  useEffect(() => {
    if (leafletMapRef.current && leafletMarkerRef.current && coords) {
      leafletMapRef.current.setView([coords.lat, coords.lng], 16);
      leafletMarkerRef.current.setLatLng([coords.lat, coords.lng]);
    }
  }, [coords]);

  const currentLat = coords?.lat ?? -23.55052;
  const currentLng = coords?.lng ?? -46.633308;
  const openStreetMapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${currentLng - 0.02}%2C${currentLat - 0.02}%2C${currentLng + 0.02}%2C${currentLat + 0.02}&layer=mapnik&marker=${currentLat}%2C${currentLng}`;
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    value || mapSearchText || `${currentLat},${currentLng}`
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  const [useGoogleEmbed, setUseGoogleEmbed] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div ref={suggestionContainerRef} className="relative flex items-center w-full">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none z-10">
          location_on
        </span>

        <input
          ref={autocompleteInputRef}
          id={id}
          type="text"
          className="w-full bg-surface-container border border-white/20 rounded-lg pl-10 pr-24 py-3 text-white outline-none transition-all placeholder:text-gray-400 focus:border-white focus:ring-1 focus:ring-white text-sm"
          placeholder={placeholder || defaultPlaceholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
        />

        {/* Free Autocomplete Suggestion Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-[200] bg-[#082a1d] border border-emerald-500/40 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in duration-150">
            <div className="p-2 text-[10px] uppercase font-bold tracking-wider text-emerald-400/80 bg-black/20 border-b border-emerald-500/20 flex items-center justify-between">
              <span>{isEs ? 'Sugerencias de dirección' : isEn ? 'Address suggestions' : 'Sugestões de endereço'}</span>
              <span className="text-white/40">OpenStreetMap / ViaCEP</span>
            </div>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(item.title);
                  if (item.lat && item.lng) {
                    setCoords({ lat: item.lat, lng: item.lng });
                  }
                  setShowSuggestions(false);
                  setLocationStatus(
                    isEs
                      ? '📍 Dirección seleccionada'
                      : isEn
                      ? '📍 Address selected'
                      : '📍 Endereço selecionado'
                  );
                  setTimeout(() => setLocationStatus(null), 3000);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-emerald-700/50 text-xs text-white border-b border-white/5 last:border-0 flex items-start gap-2 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-emerald-400 text-[16px] shrink-0 mt-0.5">
                  location_on
                </span>
                <span className="line-clamp-2 leading-tight">{item.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {/* Button to automatically capture location via Geolocation / OpenStreetMap */}
          <button
            type="button"
            onClick={handleCaptureCurrentLocation}
            disabled={isLocating}
            className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow cursor-pointer flex items-center gap-1 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              isEs
                ? 'Capturar mi ubicación GPS actual'
                : isEn
                ? 'Capture my current GPS location'
                : 'Capturar minha localização GPS atual'
            }
          >
            {isLocating ? (
              <span className="material-symbols-outlined text-[18px] animate-spin">
                sync
              </span>
            ) : (
              <span className="material-symbols-outlined text-[18px]">
                my_location
              </span>
            )}
            <span className="hidden sm:inline">
              {isLocating
                ? isEs
                  ? 'Buscando...'
                  : isEn
                  ? 'Locating...'
                  : 'Buscando...'
                : isEs
                ? 'GPS'
                : isEn
                ? 'GPS'
                : 'GPS'}
            </span>
          </button>

          {/* Button to view location on Map */}
          <button
            type="button"
            onClick={() => {
              setMapSearchText(value);
              setShowMapModal(true);
            }}
            className="p-1.5 rounded-md bg-surface border border-white/20 hover:bg-white/10 text-white transition-colors cursor-pointer flex items-center text-xs"
            title={
              isEs
                ? 'Ver o ajustar en el Mapa'
                : isEn
                ? 'View or adjust on Map'
                : 'Ver ou ajustar no Mapa'
            }
          >
            <span className="material-symbols-outlined text-[18px]">
              map
            </span>
          </button>
        </div>
      </div>

      {/* Helper text / Status badge */}
      {locationStatus ? (
        <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-[14px]">info</span>
          <span>{locationStatus}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between text-[11px] text-white/60 px-0.5">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-emerald-400">
              map
            </span>
            {isEs
              ? 'Geolocalización gratuita: Puede digitar, usar GPS o buscar en el mapa.'
              : isEn
              ? 'Free Geolocation: Type, use GPS button or search on the map.'
              : 'Geolocalização gratuita: Digite, use o botão GPS ou busque no mapa.'}
          </span>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-white/50 hover:text-white underline cursor-pointer"
            >
              {isEs ? 'Limpiar' : isEn ? 'Clear' : 'Limpar'}
            </button>
          )}
        </div>
      )}

      {/* Map View/Search Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#06402B] border border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-white/15 bg-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">
                  pin_drop
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {isEs
                      ? 'Localización en el Mapa'
                      : isEn
                      ? 'Location on Map'
                      : 'Localização no Mapa'}
                  </h3>
                  <p className="text-xs text-white/70">
                    {isEs
                      ? 'Confirme o busque la dirección exacta de su compromiso'
                      : isEn
                      ? 'Confirm or search the exact address for your appointment'
                      : 'Confirme ou busque o endereço exato do seu compromisso'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3 overflow-y-auto">
              {/* Address Search Container */}
              <div className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                    search
                  </span>
                  <input
                    type="text"
                    value={mapSearchText}
                    onChange={(e) => setMapSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleMapSearch();
                      }
                    }}
                    placeholder={
                      isEs
                        ? 'Buscar dirección o lugar...'
                        : isEn
                        ? 'Search address or place...'
                        : 'Buscar endereço ou lugar...'
                    }
                    className="w-full bg-surface-container border border-white/20 rounded-lg pl-10 pr-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleMapSearch()}
                  disabled={isGeocodingSearch}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isGeocodingSearch ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      sync
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">
                      search
                    </span>
                  )}
                  <span>{isEs ? 'Buscar' : isEn ? 'Search' : 'Buscar'}</span>
                </button>
              </div>

              {/* Provider selector & Action buttons inside modal */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCaptureCurrentLocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 rounded-lg text-xs font-medium border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    my_location
                  </span>
                  <span>
                    {isEs
                      ? 'Usar Mi Ubicación GPS'
                      : isEn
                      ? 'Use My GPS Location'
                      : 'Usar Minha Localização GPS'}
                  </span>
                </button>

                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setUseGoogleEmbed(false)}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      !useGoogleEmbed
                        ? 'bg-emerald-600 text-white font-semibold shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    OpenStreetMap (Grátis)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseGoogleEmbed(true)}
                    className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      useGoogleEmbed
                        ? 'bg-emerald-600 text-white font-semibold shadow'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Google Maps
                  </button>
                </div>
              </div>

              {/* Pin Instruction Banner */}
              <div className="bg-emerald-950/90 border border-emerald-500/40 p-2.5 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow">
                <span className="material-symbols-outlined text-emerald-400 text-lg shrink-0">
                  push_pin
                </span>
                <span>
                  {isEs
                    ? '📌 Haz clic en cualquier lugar del mapa o arrastra el alfinete rojo para marcar la ubicación exacta.'
                    : isEn
                    ? '📌 Click anywhere on the map or drag the red pin to mark the exact location.'
                    : '📌 Clique em qualquer lugar no mapa ou arraste o alfinete vermelho para marcar a localização exata.'}
                </span>
              </div>

              {value && (
                <div className="text-xs text-emerald-300 font-medium truncate max-w-full bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-500/30 flex items-center justify-between">
                  <span className="truncate">📍 {value}</span>
                  {coords && (
                    <span className="text-[10px] text-white/50 shrink-0 ml-2">
                      ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                    </span>
                  )}
                </div>
              )}

              {/* Map Preview / Interactive Pin Container */}
              <div className="relative w-full h-[320px] sm:h-[380px] bg-surface-container rounded-xl overflow-hidden border border-white/15 shadow-inner">
                {!useGoogleEmbed ? (
                  <div ref={mapContainerRef} className="w-full h-full z-0" />
                ) : (
                  <iframe
                    title="Location Preview"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={googleMapsEmbedUrl}
                  />
                )}

                {/* Geocoding indicator for pin dragging */}
                {isGeocodingPin && (
                  <div className="absolute top-3 right-3 z-[1000] bg-black/85 backdrop-blur-md text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/40 shadow-lg flex items-center gap-2 animate-in fade-in">
                    <span className="material-symbols-outlined text-sm animate-spin">
                      sync
                    </span>
                    <span>
                      {isEs
                        ? 'Obteniendo dirección...'
                        : isEn
                        ? 'Fetching address...'
                        : 'Obtendo endereço do alfinete...'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/15 bg-surface-container-low flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="px-4 py-2 rounded-lg bg-surface border border-white/20 text-white text-sm hover:bg-white/10 transition-colors cursor-pointer"
              >
                {isEs ? 'Cancelar' : isEn ? 'Cancel' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (mapSearchText && mapSearchText !== value) {
                    onChange(mapSearchText);
                  }
                  setShowMapModal(false);
                }}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                <span>
                  {isEs
                    ? 'Confirmar Endereço'
                    : isEn
                    ? 'Confirm Address'
                    : 'Confirmar Endereço'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
