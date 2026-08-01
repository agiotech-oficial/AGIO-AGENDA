'use client';

import React, { useEffect } from 'react';

export const SecurityGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // 1. Block Context Menu (Right Click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Block Keyboard Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+C)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';
      const code = e.code ? e.code.toLowerCase() : '';

      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + Shift + I / J / C (Inspect / Console / Element)
      if (isCtrlOrCmd && e.shiftKey && (key === 'i' || key === 'j' || key === 'c' || code === 'keyi' || code === 'keyj' || code === 'keyc')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + U (View Source)
      if (isCtrlOrCmd && (key === 'u' || code === 'keyu')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + S (Save Page)
      if (isCtrlOrCmd && (key === 's' || code === 'keys')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl + C / Cmd + C (Copy)
      if (isCtrlOrCmd && (key === 'c' || code === 'keyc')) {
        const target = e.target as HTMLElement | null;
        const isInputField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
        if (!isInputField) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }

      // Ctrl + P (Print)
      if (isCtrlOrCmd && (key === 'p' || code === 'keyp')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 3. Block Copy & Cut Events
    const handleCopyCut = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (!isInputField) {
        e.preventDefault();
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', 'Cópia desabilitada por motivos de segurança.');
        }
        return false;
      }
    };

    // 4. Block Drag Start (Images / Links)
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('copy', handleCopyCut);
    document.addEventListener('cut', handleCopyCut);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopyCut);
      document.removeEventListener('cut', handleCopyCut);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return <>{children}</>;
};

