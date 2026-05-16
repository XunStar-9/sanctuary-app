/**
 * useSettings — thin facade over `settingsStore`.
 *
 * Returns the full settings snapshot plus action setters. Components that only
 * need one or two fields should subscribe directly via `useStore(settingsStore, …)`
 * for granular re-renders.
 */

import { useStore } from '@/lib/store';
import { settingsStore, settingsActions, type SettingsState } from '@/stores/settingsStore';

const identity = (s: SettingsState) => s;

export function useSettings() {
  const s = useStore(settingsStore, identity);
  return {
    ...s,
    setTheme:             settingsActions.setTheme,
    setFontSize:          settingsActions.setFontSize,
    setLineHeight:        settingsActions.setLineHeight,
    setEditorFont:        settingsActions.setEditorFont,
    setFontSizeNum:       settingsActions.setFontSizeNum,
    setLineHeightNum:     settingsActions.setLineHeightNum,
    setFormattingEnabled: settingsActions.setFormattingEnabled,
  };
}
