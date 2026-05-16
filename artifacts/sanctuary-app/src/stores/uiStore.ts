/**
 * UI store — drawer/panel open/close state.
 *
 * Lives apart from the data stores so toggling the sidebar doesn't trigger
 * any selectors watching note/audio/book state.
 */

import { createStore } from '@/lib/store';

export type UiState = {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  typographyOpen: boolean;
  libraryOpen: boolean;
};

export const uiStore = createStore<UiState>({
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  settingsOpen: false,
  typographyOpen: false,
  libraryOpen: false,
});

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
};
