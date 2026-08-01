"use client";
import { useEffect } from 'react';

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export const GoogleTranslateScript = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Helper to enforce notranslate on material icons and restore translated icons
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

          // Check data-icon
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

    // Run protectIcons initially and on MutationObserver
    protectIcons();
    const observer = new MutationObserver(() => {
      protectIcons();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Function to trigger Google Translate combo change
    const applyLanguage = () => {
      try {
        protectIcons();
        const savedLang = localStorage.getItem('user_language');
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieMatch = decodedCookie.match(/googtrans=\/(?:pt|auto)\/([a-z]{2})/);
        const targetLang = savedLang || (cookieMatch ? cookieMatch[1] : 'pt');

        if (targetLang) {
          const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
          if (select) {
            const valToSet = targetLang === 'pt' ? 'pt' : targetLang;
            if (select.value !== valToSet && select.value !== targetLang) {
              select.value = valToSet;
              select.dispatchEvent(new Event('change'));
            }
          }
        }
      } catch (e) {
        // ignore
      }
    };

    // Define Google Translate init callback
    window.googleTranslateElementInit = function() {
      try {
        if (window.google && window.google.translate && window.google.translate.TranslateElement) {
          new window.google.translate.TranslateElement({
            pageLanguage: 'pt',
            includedLanguages: 'pt,en,es',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          }, 'google_translate_element');

          setTimeout(applyLanguage, 300);
          setTimeout(applyLanguage, 1000);
        }
      } catch (e) {
        console.error('Error initializing Google Translate:', e);
      }
    };

    // Inject Google Translate script after initial hydration
    const loadScript = () => {
      if (!document.getElementById('google-translate-script')) {
        const script = document.createElement('script');
        script.id = 'google-translate-script';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.async = true;
        document.body.appendChild(script);
      }
    };

    const timerInit = setTimeout(() => {
      loadScript();
    }, 100);

    const timer1 = setTimeout(applyLanguage, 600);
    const timer2 = setTimeout(applyLanguage, 1500);
    const timer3 = setTimeout(applyLanguage, 3000);

    const handleLangChange = () => {
      setTimeout(() => {
        protectIcons();
        applyLanguage();
      }, 100);
    };

    window.addEventListener('appLanguageChanged', handleLangChange);

    return () => {
      observer.disconnect();
      clearTimeout(timerInit);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('appLanguageChanged', handleLangChange);
    };
  }, []);

  return null;
};


