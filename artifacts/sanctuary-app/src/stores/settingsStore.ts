/**
 * Settings store
 *
 * One persisted object replaces seven independent localStorage entries.
 * The legacy `sanctuary_*` keys are still read on hydrate (one-time migration)
 * so existing users keep their preferences.
 */

import type { ThemeId, FontSize, LineHeight, EditorFont } from '@/lib/types';
import { createStore, persist } from '@/lib/store';

export type SettingsState = {
  theme: ThemeId;
  fontSize: FontSize;
  lineHeight: LineHeight;
  editorFont: EditorFont;
  fontSizeNum: number;       // 0 = use preset
  lineHeightNum: number;     // 0 = use preset
  formattingEnabled: boolean;
  /** UI radius multiplier (1 = default rounding). Range ~0.5–1.5. */
  radiusScale: number;
  /** Global font-size multiplier on <html> (1 = default). Range ~0.85–1.25. */
  globalFontScale: number;
};

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'warm',
  fontSize: 'md',
  lineHeight: 'normal',
  editorFont: 'serif',
  fontSizeNum: 0,
  lineHeightNum: 0,
  formattingEnabled: false,
  radiusScale: 1,
  globalFontScale: 1,
};

const STORAGE_KEY = 'sanctuary_settings';

/** One-shot migration from the old per-key layout. */
function migrateLegacyKeys(): Partial<SettingsState> | null {
  if (typeof localStorage === 'undefined') return null;
  const legacy = {
    theme:             localStorage.getItem('sanctuary_theme'),
    fontSize:          localStorage.getItem('sanctuary_fontsize'),
    lineHeight:        localStorage.getItem('sanctuary_lineheight'),
    editorFont:        localStorage.getItem('sanctuary_editorfont'),
    fontSizeNum:       localStorage.getItem('sanctuary_fontsizenum'),
    lineHeightNum:     localStorage.getItem('sanctuary_lineheightnum'),
    formattingEnabled: localStorage.getItem('sanctuary_formatting'),
  };
  // No legacy data — nothing to do.
  if (!Object.values(legacy).some(v => v !== null)) return null;

  const out: Partial<SettingsState> = {};
  if (legacy.theme)             out.theme = legacy.theme as ThemeId;
  if (legacy.fontSize)          out.fontSize = legacy.fontSize as FontSize;
  if (legacy.lineHeight)        out.lineHeight = legacy.lineHeight as LineHeight;
  if (legacy.editorFont)        out.editorFont = legacy.editorFont as EditorFont;
  if (legacy.fontSizeNum)       out.fontSizeNum = Number(legacy.fontSizeNum) || 0;
  if (legacy.lineHeightNum)     out.lineHeightNum = Number(legacy.lineHeightNum) || 0;
  if (legacy.formattingEnabled) out.formattingEnabled = legacy.formattingEnabled === 'true';
  return out;
}

export const settingsStore = createStore<SettingsState>(DEFAULT_SETTINGS);

// Hydrate: prefer new key, fall back to legacy (and clean it up).
const legacy = migrateLegacyKeys();
if (legacy) {
  settingsStore.set(legacy);
  // Don't delete legacy keys — leave them for safety; they'll just be ignored
  // next time once the new key is present.
}
persist(settingsStore, {
  key: STORAGE_KEY,
  hydrate: (raw, fallback) => {
    if (typeof raw !== 'object' || raw === null) return fallback;
    return { ...fallback, ...(raw as Partial<SettingsState>) };
  },
  debounceMs: 100,
});

// Apply theme to <html> whenever it changes — single side-effect setup.
function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute('data-theme', theme);
}
applyTheme(settingsStore.getState().theme);
let lastTheme: ThemeId = settingsStore.getState().theme;
settingsStore.subscribe(() => {
  const t = settingsStore.getState().theme;
  if (t !== lastTheme) {
    lastTheme = t;
    applyTheme(t);
  }
});

/**
 * Apply UI scaling preferences to the document.
 *
 *  - radiusScale → overrides the `--radius` CSS variable. Tailwind's
 *    `--radius-{sm,md,lg,xl}` are derived from it via calc(), so every
 *    rounded-* utility scales with this single value.
 *  - globalFontScale → sets `font-size` on `<html>` as a percentage. Because
 *    every rem-based size in the app cascades from the root, this scales the
 *    whole interface uniformly.
 */
function applyRadius(scale: number) {
  // Default radius across the app is 1rem; apply scale on top.
  document.documentElement.style.setProperty('--radius', `${scale}rem`);
}
function applyFontScale(scale: number) {
  // Browsers default to 16px == 100%; we just set the html font-size.
  document.documentElement.style.fontSize = `${Math.round(scale * 100)}%`;
}

applyRadius(settingsStore.getState().radiusScale);
applyFontScale(settingsStore.getState().globalFontScale);
let lastRadius = settingsStore.getState().radiusScale;
let lastFontScale = settingsStore.getState().globalFontScale;
settingsStore.subscribe(() => {
  const s = settingsStore.getState();
  if (s.radiusScale !== lastRadius) {
    lastRadius = s.radiusScale;
    applyRadius(s.radiusScale);
  }
  if (s.globalFontScale !== lastFontScale) {
    lastFontScale = s.globalFontScale;
    applyFontScale(s.globalFontScale);
  }
});

/* ── Actions ─────────────────────────────────────────────────────────────── */

export const settingsActions = {
  setTheme:             (v: ThemeId)    => settingsStore.set({ theme: v }),
  setFontSize:          (v: FontSize)   => settingsStore.set({ fontSize: v }),
  setLineHeight:        (v: LineHeight) => settingsStore.set({ lineHeight: v }),
  setEditorFont:        (v: EditorFont) => settingsStore.set({ editorFont: v }),
  setFontSizeNum:       (v: number)     => settingsStore.set({ fontSizeNum: v }),
  setLineHeightNum:     (v: number)     => settingsStore.set({ lineHeightNum: v }),
  setFormattingEnabled: (v: boolean)    => settingsStore.set({ formattingEnabled: v }),
  setRadiusScale:       (v: number)     => settingsStore.set({ radiusScale: clamp(v, 0.5, 1.5) }),
  setGlobalFontScale:   (v: number)     => settingsStore.set({ globalFontScale: clamp(v, 0.85, 1.25) }),
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
