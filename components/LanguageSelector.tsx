"use client";
import React, { useState, useEffect } from 'react';

export const LanguageSelector = () => {
  const [currentLang, setCurrentLang] = useState('pt');
  const [isLangOpen, setIsLangOpen] = useState(false);

  useEffect(() => {
    const checkLang = () => {
      if (typeof window !== 'undefined') {
        const savedLang = localStorage.getItem('user_language');
        if (savedLang) {
          setCurrentLang(savedLang);
        } else {
          const decodedCookie = decodeURIComponent(window.document.cookie);
          const match = decodedCookie.match(/googtrans=\/pt\/([a-z]{2})/);
          if (match && match[1]) {
            setCurrentLang(match[1]);
            localStorage.setItem('user_language', match[1]);
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

  function setLanguage(lang: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_language', lang);
      
      const host = window.location.hostname;

      if (lang === 'pt') {
        window.document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.document.cookie = 'googtrans=/pt/pt; path=/;';
        window.document.cookie = 'googtrans=/auto/pt; path=/;';
        try {
          if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            window.document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${host}`;
          }
        } catch (e) {}
      } else {
        window.document.cookie = `googtrans=/pt/${lang}; path=/;`;
        window.document.cookie = `googtrans=/auto/${lang}; path=/;`;
        try {
          if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
            window.document.cookie = `googtrans=/pt/${lang}; path=/; domain=.${host}`;
            window.document.cookie = `googtrans=/auto/${lang}; path=/; domain=.${host}`;
          }
        } catch (e) {}
      }

      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        select.value = lang === 'pt' ? 'pt' : lang;
        select.dispatchEvent(new Event('change'));
        select.dispatchEvent(new Event('click'));
      }

      window.dispatchEvent(new CustomEvent('appLanguageChanged', { detail: lang }));
      setCurrentLang(lang);
      setIsLangOpen(false);

      if (!select) {
        // If Google Translate combo isn't present yet, reload quickly so Google Translate script initializes with new cookie
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  }

  const languages = [
    { code: 'pt', name: 'Português', icon: 'https://flagcdn.com/w40/br.png' },
    { code: 'en', name: 'English', icon: 'https://flagcdn.com/w40/us.png' },
    { code: 'es', name: 'Español', icon: 'https://flagcdn.com/w40/es.png' }
  ];

  return (
    <div className="relative z-[9999] notranslate" translate="no">
      <button 
        onClick={() => setIsLangOpen(!isLangOpen)}
        className="flex items-center gap-1.5 text-xs font-semibold bg-surface-container hover:bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant/50 transition-all shadow-sm notranslate"
        title="Selecione o Idioma"
        translate="no"
      >
        <img src={languages.find(l => l.code === currentLang)?.icon || 'https://flagcdn.com/w40/br.png'} alt="Idioma" className="w-5 h-auto rounded-sm object-cover" />
        <span className="material-symbols-outlined text-[16px] notranslate" translate="no" aria-hidden="true">{isLangOpen ? 'arrow_drop_up' : 'arrow_drop_down'}</span>
      </button>

      {isLangOpen && (
        <div className="absolute right-0 top-full mt-1 bg-surface-container border border-outline-variant/50 rounded-xl shadow-xl overflow-hidden min-w-[140px] z-[10000] notranslate" translate="no">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center gap-2 hover:bg-surface-container-high transition-colors notranslate ${currentLang === lang.code ? 'text-primary bg-primary/10' : 'text-on-surface'}`}
              translate="no"
            >
              <img src={lang.icon} alt={lang.name} className="w-5 h-auto rounded-sm object-cover" />
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
