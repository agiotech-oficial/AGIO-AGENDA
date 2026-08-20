"use client";
import React, { useState, useEffect, useRef } from 'react';

// Helper to completely purge all previous googtrans cookies across all domains and paths
export function clearAllGoogtransCookies() {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`];
  const parts = host.split('.');
  if (parts.length >= 2) {
    const rootDomain = parts.slice(-2).join('.');
    domains.push(rootDomain, `.${rootDomain}`);
  }

  const uniqueDomains = Array.from(new Set(domains));
  uniqueDomains.forEach((dom) => {
    const d = dom ? ` domain=${dom};` : '';
    window.document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;${d}`;
    window.document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
}

// Helper to set clean cookies for Google Translate
export function setTranslateCookie(lang: string) {
  if (typeof window === 'undefined') return;
  
  clearAllGoogtransCookies();

  if (lang === 'pt') {
    return;
  }

  const targetCookie = `/pt/${lang}`;
  const autoCookie = `/auto/${lang}`;
  
  // Set simple root cookie
  window.document.cookie = `googtrans=${targetCookie}; path=/;`;
  window.document.cookie = `googtrans=${autoCookie}; path=/;`;

  const host = window.location.hostname;
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    window.document.cookie = `googtrans=${targetCookie}; path=/; domain=.${host}`;
    window.document.cookie = `googtrans=${autoCookie}; path=/; domain=.${host}`;
    const parts = host.split('.');
    if (parts.length >= 2) {
      const rootDomain = parts.slice(-2).join('.');
      window.document.cookie = `googtrans=${targetCookie}; path=/; domain=.${rootDomain}`;
      window.document.cookie = `googtrans=${autoCookie}; path=/; domain=.${rootDomain}`;
    }
  }
}

// Function to trigger change on google translate select element
export function triggerGoogleTranslate(lang: string): boolean {
  if (typeof window === 'undefined') return false;

  setTranslateCookie(lang);

  const select = (document.querySelector('.goog-te-combo') || document.querySelector('#google_translate_element select')) as HTMLSelectElement | null;
  if (select) {
    let targetValue = '';
    if (lang === 'pt') {
      const opt = Array.from(select.options).find((o) => o.value === '' || o.value.toLowerCase() === 'pt');
      targetValue = opt ? opt.value : '';
    } else {
      const opt = Array.from(select.options).find((o) => o.value.toLowerCase() === lang.toLowerCase());
      targetValue = opt ? opt.value : lang;
    }

    select.value = targetValue;
    
    try {
      const evt = document.createEvent('HTMLEvents');
      evt.initEvent('change', true, true);
      select.dispatchEvent(evt);
    } catch (e) {}

    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  return false;
}

export const LanguageSelector = () => {
  const [currentLang, setCurrentLang] = useState('pt');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkLang = () => {
      if (typeof window !== 'undefined') {
        const savedLang = localStorage.getItem('user_language');
        if (savedLang) {
          setCurrentLang(savedLang);
        } else {
          const decodedCookie = decodeURIComponent(window.document.cookie);
          const match = decodedCookie.match(/googtrans=\/(?:pt|auto)\/([a-z]{2})/i);
          if (match && match[1]) {
            const l = match[1].toLowerCase();
            setCurrentLang(l);
            localStorage.setItem('user_language', l);
          } else {
            setCurrentLang('pt');
          }
        }
      }
    };

    checkLang();
    window.addEventListener('appLanguageChanged', checkLang);
    return () => window.removeEventListener('appLanguageChanged', checkLang);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };

    if (isLangOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isLangOpen]);

  function setLanguage(lang: string) {
    if (typeof window === 'undefined') return;

    const prevLang = currentLang;
    localStorage.setItem('user_language', lang);
    setCurrentLang(lang);
    setIsLangOpen(false);

    setTranslateCookie(lang);
    const triggered = triggerGoogleTranslate(lang);
    window.dispatchEvent(new CustomEvent('appLanguageChanged', { detail: lang }));

    // If switching back to Portuguese from another language, reload to restore original text cleanly
    if (lang === 'pt' && prevLang !== 'pt') {
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }

    if (!triggered) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const ok = triggerGoogleTranslate(lang);
        if (ok || attempts >= 8) {
          clearInterval(interval);
          if (!ok && lang !== 'pt') {
            window.location.reload();
          }
        }
      }, 150);
    }
  }

  const languages = [
    { code: 'pt', name: 'Português', icon: 'https://flagcdn.com/w40/br.png' },
    { code: 'en', name: 'English', icon: 'https://flagcdn.com/w40/us.png' },
    { code: 'es', name: 'Español', icon: 'https://flagcdn.com/w40/es.png' }
  ];

  const activeLang = languages.find((l) => l.code === currentLang) || languages[0];

  return (
    <div ref={containerRef} className="relative z-[9999] notranslate" translate="no">
      <button 
        type="button"
        onClick={() => setIsLangOpen(!isLangOpen)}
        className="flex items-center gap-1.5 text-xs font-semibold bg-surface-container/90 hover:bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant/60 transition-all shadow-sm notranslate cursor-pointer select-none text-on-surface"
        title="Selecione o Idioma / Select Language"
        translate="no"
      >
        <img 
          src={activeLang.icon} 
          alt={activeLang.name} 
          className="w-5 h-auto rounded-sm object-cover pointer-events-none" 
        />
        <span className="text-[11px] font-bold uppercase tracking-wider notranslate hidden xs:inline text-on-surface">
          {activeLang.code}
        </span>
        <span className="material-symbols-outlined text-[16px] notranslate pointer-events-none text-on-surface/80" translate="no" aria-hidden="true">
          {isLangOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
        </span>
      </button>

      {isLangOpen && (
        <div className="absolute left-0 top-full mt-1.5 bg-surface-container border border-outline-variant/50 rounded-xl shadow-2xl overflow-hidden min-w-[145px] z-[10000] notranslate backdrop-blur-md" translate="no">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2.5 hover:bg-surface-container-high transition-colors notranslate cursor-pointer ${
                currentLang === lang.code ? 'text-primary bg-primary/10 font-bold' : 'text-on-surface'
              }`}
              translate="no"
            >
              <img src={lang.icon} alt={lang.name} className="w-5 h-auto rounded-sm object-cover pointer-events-none" />
              <span className="notranslate">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
