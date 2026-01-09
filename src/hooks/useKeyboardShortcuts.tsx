import { useCallback, useEffect } from 'react';

interface KeyboardShortcuts {
  onSpace?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onKeyA?: () => void;
  onKeyB?: () => void;
  onKeyC?: () => void;
  onKeyD?: () => void;
  onKeyE?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore if user is typing in an input
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        shortcuts.onSpace?.();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        shortcuts.onArrowLeft?.();
        break;
      case 'ArrowRight':
        e.preventDefault();
        shortcuts.onArrowRight?.();
        break;
      case 'ArrowUp':
        e.preventDefault();
        shortcuts.onArrowUp?.();
        break;
      case 'ArrowDown':
        e.preventDefault();
        shortcuts.onArrowDown?.();
        break;
      case 'Enter':
        shortcuts.onEnter?.();
        break;
      case 'Escape':
        shortcuts.onEscape?.();
        break;
      case 'KeyA':
        shortcuts.onKeyA?.();
        break;
      case 'KeyB':
        shortcuts.onKeyB?.();
        break;
      case 'KeyC':
        shortcuts.onKeyC?.();
        break;
      case 'KeyD':
        shortcuts.onKeyD?.();
        break;
      case 'KeyE':
        shortcuts.onKeyE?.();
        break;
    }
  }, [enabled, shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
