"use client";
import React from 'react';
import { LanguageSelector } from './LanguageSelector';

export const NavigationBar = () => {
  const handleOpenNewTab = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full flex justify-between items-center px-4 py-2 bg-surface-container-low border-b border-outline-variant/30 relative z-30 shadow-sm animate-in fade-in duration-300">
      <div className="flex gap-2 items-center">
        <button 
          onClick={() => window.dispatchEvent(new Event('history_back'))}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/50 text-on-surface shadow-sm active:scale-95 cursor-pointer"
          title="Voltar"
        >
          <span className="material-symbols-outlined text-[20px]" translate="no">chevron_left</span>
        </button>
        <button 
          onClick={() => window.dispatchEvent(new Event('history_forward'))}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/50 text-on-surface shadow-sm active:scale-95 cursor-pointer"
          title="Avançar"
        >
          <span className="material-symbols-outlined text-[20px]" translate="no">chevron_right</span>
        </button>
      </div>

      <div className="flex items-center gap-3">
        <LanguageSelector />

        <div className="text-xs text-on-surface-variant font-medium flex items-center gap-1 opacity-70">
          <span className="material-symbols-outlined text-[14px]" translate="no">swipe</span>
          <span className="hidden md:inline">Navegação</span>
        </div>
      </div>
    </div>
  );
};

