/**
 * audioUpload — single source of truth for "user wants to pick audio files".
 *
 * Why this exists:
 *  - The music player UI shows an Upload button in three different places
 *    (sidebar dock, sidebar playlist panel, full-screen player). Each used to
 *    create its own `<input type="file">` ref via `useAudioControls()`, but
 *    only one of those refs was ever bound to a real <input> in the DOM, so
 *    the other Upload buttons silently did nothing.
 *  - Solution: a module-level `<input>` is created once and inserted into
 *    document.body. Anyone who wants to trigger a file picker calls
 *    `triggerAudioUpload()`. The handler routes selected files to the
 *    `audioEngine`.
 *
 * Notes:
 *  - The element is created lazily on first call so SSR / tests don't break.
 *  - It's positioned off-screen (not `display:none`) so accessibility tools
 *    and Safari iOS still treat it as activatable.
 */

import { audioEngine } from '@/stores/audioEngine';

let inputEl: HTMLInputElement | null = null;

function ensureInput(): HTMLInputElement {
  if (inputEl) return inputEl;
  const el = document.createElement('input');
  el.type = 'file';
  el.accept = 'audio/*';
  el.multiple = true;
  // Off-screen but focusable. `display:none` would be skipped by some pickers.
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  el.style.top = '-9999px';
  el.style.opacity = '0';
  el.setAttribute('aria-hidden', 'true');
  el.addEventListener('change', () => {
    const files = el.files ? Array.from(el.files) : [];
    if (files.length) audioEngine.uploadFiles(files);
    // Reset so re-picking the same file fires `change` again.
    el.value = '';
  });
  document.body.appendChild(el);
  inputEl = el;
  return el;
}

/** Open the OS file picker for audio files. Selected files are uploaded to
 *  the audio engine automatically. Safe to call multiple times in parallel. */
export function triggerAudioUpload(): void {
  if (typeof document === 'undefined') return;
  ensureInput().click();
}
