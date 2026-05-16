/**
 * Global keyboard shortcuts.
 *
 * Registered once at module init via `useGlobalShortcuts` (called from Home).
 * Skips handling when the user is typing in an input/textarea/contenteditable
 * so we never fight with text entry.
 *
 * Shortcuts:
 *   Space         — toggle play/pause
 *   J / K         — prev / next track
 *   Cmd/Ctrl + ,  — open Settings panel
 */

import { useEffect } from 'react';
import { audioEngine } from '@/stores/audioEngine';
import { uiActions } from '@/stores/uiStore';

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return true;
  // Slider thumbs use role="slider" — let arrow keys go to them.
  if (t.getAttribute('role') === 'slider') return true;
  return false;
}

export function useGlobalShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      // Space: toggle play. Use `code` so layouts that don't map space to ' '
      // still work, and avoid conflict with focused buttons (which respond to
      // Space themselves and would have target.tagName === 'BUTTON' — we let
      // them through, then guard:
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        audioEngine.playPause();
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key === ',') {
          e.preventDefault();
          uiActions.openSettings();
        }
        return;
      }
      if (e.key === 'j' || e.key === 'J') { audioEngine.prev(); return; }
      if (e.key === 'k' || e.key === 'K') { audioEngine.next(); return; }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
