"use client";
import { useEffect } from 'react';
import { triggerGoogleTranslate } from './LanguageSelector';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export const GoogleTranslateScript = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Helper to enforce notranslate on material symbols and keep icons intact
    const protectIcons = () => {
      try {
        const iconElements = document.querySelectorAll('.material-symbols-outlined, [class*="material-symbols"]');
        iconElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (!htmlEl.classList.contains('notranslate')) {
            htmlEl.classList.add('notranslate');
          }
          if (htmlEl.getAttribute('translate') !== 'no') {
            htmlEl.setAttribute('translate', 'no');
          }

          let dataIcon = htmlEl.getAttribute('data-icon');
          if (!dataIcon) {
            const currentText = htmlEl.textContent?.trim();
            if (currentText && !currentText.includes(' ') && currentText.length < 40) {
              dataIcon = currentText;
              htmlEl.setAttribute('data-icon', currentText);
            }
          }

          if (dataIcon) {
            const fontChild = htmlEl.querySelector('font');
            const currentText = htmlEl.textContent?.trim();
            if (fontChild || currentText !== dataIcon) {
              htmlEl.innerHTML = dataIcon;
            }
          }
        });
      } catch (e) {
        // ignore
      }
    };

    protectIcons();
    const observer = new MutationObserver(() => {
      protectIcons();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    const applySavedLanguage = () => {
      try {
        protectIcons();
        const savedLang = localStorage.getItem('user_language') || 'pt';
        if (savedLang !== 'pt') {
          triggerGoogleTranslate(savedLang);
        }
      } catch (e) {
        // ignore
      }
    };

    // Google Translate Initialization
    window.googleTranslateElementInit = function() {
      try {
        if (window.google && window.google.translate && window.google.translate.TranslateElement) {
          new window.google.translate.TranslateElement({
            pageLanguage: 'pt',
            includedLanguages: 'pt,en,es',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');

          setTimeout(applySavedLanguage, 100);
          setTimeout(applySavedLanguage, 400);
          setTimeout(applySavedLanguage, 1000);
        }
      } catch (e) {
        console.error('Error initializing Google Translate:', e);
      }
    };

    // Load Google Translate script dynamically if not present
    const loadScript = () => {
      if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.body.appendChild(script);
      } else if (window.google?.translate?.TranslateElement) {
        applySavedLanguage();
      }
    };

    loadScript();

    const timer1 = setTimeout(applySavedLanguage, 300);
    const timer2 = setTimeout(applySavedLanguage, 800);
    const timer3 = setTimeout(applySavedLanguage, 2000);

    const handleLangChange = () => {
      setTimeout(() => {
        protectIcons();
        applySavedLanguage();
      }, 50);
    };

    window.addEventListener('appLanguageChanged', handleLangChange);

    return () => {
      observer.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('appLanguageChanged', handleLangChange);
    };
  }, []);

  return null;
};
