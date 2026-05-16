/**
 * UI store — drawer/panel open/close state.
 *
 * Lives apart from the data stores so toggling the sidebar doesn't trigger
 * any selectors watching note/audio/book state.
 *
 * Only `musicExpanded` is persisted (it's a real preference; sidebarOpen etc.
 * are session-scoped and follow viewport width).
 */

import { createStore } from '@/lib/store';

export type UiState = {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  typographyOpen: boolean;
  libraryOpen: boolean;
  musicExpanded: boolean;
};

const MUSIC_KEY = 'sanctuary_music_expanded';

function loadMusicExpanded(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(MUSIC_KEY);
    return raw === null ? false : raw === 'true';
  } catch { return false; }
}

export const uiStore = createStore<UiState>({
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  settingsOpen: false,
  typographyOpen: false,
  libraryOpen: false,
  musicExpanded: loadMusicExpanded(),
});

// Persist musicExpanded eagerly (cheap single bool).
{
  let last = uiStore.getState().musicExpanded;
  uiStore.subscribe(() => {
    const cur = uiStore.getState().musicExpanded;
    if (cur === last) return;
    last = cur;
    try { localStorage.setItem(MUSIC_KEY, String(cur)); } catch { /* quota */ }
  });
}

export const uiActions = {
  openSidebar:    () => uiStore.set({ sidebarOpen: true }),
  closeSidebar:   () => uiStore.set({ sidebarOpen: false }),
  toggleSidebar:  () => uiStore.update(s => ({ ...s, sidebarOpen: !s.sidebarOpen })),

  openSettings:   () => uiStore.set({ settingsOpen: true }),
  closeSettings:  () => uiStore.set({ settingsOpen: false }),

  openTypography: () => uiStore.set({ typographyOpen: true }),
  closeTypography:() => uiStore.set({ typographyOpen: false }),

  openLibrary:    () => uiStore.update(s => ({ ...s, libraryOpen: true, sidebarOpen: false })),
  closeLibrary:   () => uiStore.set({ libraryOpen: false }),

  toggleMusic:    () => uiStore.update(s => ({ ...s, musicExpanded: !s.musicExpanded })),
};
