'use client';

import React, { useState, useEffect } from 'react';

export const PwaSplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect Smartphone vs Tablet/Desktop
    const userAgent = navigator.userAgent || '';
    const isTabletOrDesktop =
      window.innerWidth >= 768 ||
      /iPad|Tablet|PlayBook|Silk/i.test(userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1 && /Macintosh/i.test(userAgent));

    setIsMobileDevice(!isTabletOrDesktop);

    // Detect if app was launched in standalone mode (from installed smartphone/desktop icon)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      window.location.search.includes('standalone=true') ||
      window.location.search.includes('utm_source=pwa');

    const sessionSplashShown = sessionStorage.getItem('pwa_splash_image_shown');

    // Show splash when opened in standalone mode OR on initial app launch if not yet shown in session
    if (isStandaloneMode || !sessionSplashShown) {
      setIsVisible(true);
      sessionStorage.setItem('pwa_splash_image_shown', 'true');

      // Auto fade-out after 2.6 seconds
      const fadeTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 2600);

      // Hide completely after fade animation finishes
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 3100);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsVisible(false);
    }, 400);
  };

  const imageSrc = isMobileDevice ? '/segunda%20Tela.jpeg' : '/tablet-segunda%20tela.png';

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[999999] bg-[#041d13] text-white flex flex-col items-center justify-between p-6 select-none cursor-pointer transition-opacity duration-500 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ touchAction: 'none' }}
    >
      {/* Top spacer / header indicator */}
      <div className="w-full flex justify-between items-center opacity-70 text-xs font-semibold tracking-wider pt-2">
        <span className="flex items-center gap-1 text-emerald-300">
          <span className="material-symbols-outlined text-sm notranslate" translate="no">verified</span>
          Ágio Agenda
        </span>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
          App Instalado
        </span>
      </div>

      {/* Main Image Container */}
      <div className={`flex-1 flex flex-col items-center justify-center my-auto w-full ${isMobileDevice ? 'max-w-sm' : 'max-w-xl md:max-w-2xl'}`}>
        <div className="relative w-full flex justify-center items-center p-3 rounded-3xl bg-emerald-950/40 border border-emerald-500/20 shadow-2xl backdrop-blur-md">
          <img
            src={imageSrc}
            alt="Tela Inicial Ágio Agenda"
            className="w-full max-h-[65vh] object-contain rounded-2xl shadow-lg transition-transform duration-700 transform hover:scale-[1.01]"
          />
        </div>
      </div>

      {/* Bottom Loading Progress & Tip */}
      <div className="w-full max-w-xs flex flex-col items-center gap-3 pb-4">
        <div className="w-full h-1.5 bg-emerald-950 rounded-full overflow-hidden border border-emerald-500/30">
          <div className="h-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-green-400 rounded-full animate-pulse w-full transition-all duration-1000"></div>
        </div>
        <p className="text-xs text-emerald-200/90 font-medium text-center flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-emerald-400 animate-spin notranslate" translate="no">sync</span>
          Iniciando aplicativo...
        </p>
      </div>
    </div>
  );
};

