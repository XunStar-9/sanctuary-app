/**
 * Home — composition only.
 *
 * Down from ~150 lines of prop wiring to ~50: each component now subscribes
 * to the stores it needs. This file is just layout + lazy boundaries.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store';
import { uiStore, uiActions } from '@/stores/uiStore';
import { notesActions } from '@/stores/notesStore';
import { AppSidebar } from '@/components/AppSidebar';
import { NoteEditor } from '@/components/NoteEditor';

// Heavy / rarely-opened panels load on demand.
const SettingsPanel   = lazy(() => import('@/components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
const TypographyPanel = lazy(() => import('@/components/TypographyPanel').then(m => ({ default: m.TypographyPanel })));
const LibraryView     = lazy(() => import('@/components/LibraryView').then(m => ({ default: m.LibraryView })));

/* ── Stable selectors ───────────────────────────────────────────────────── */

const selectSidebarOpen    = (s: any) => s.sidebarOpen;
const selectSettingsOpen   = (s: any) => s.settingsOpen;
const selectTypographyOpen = (s: any) => s.typographyOpen;
const selectLibraryOpen    = (s: any) => s.libraryOpen;

/** Mount-on-first-open: keeps initial bundle minimal but avoids re-mounting
 *  the panel each time it's opened (preserves slide-out animation). */
function useMountedOnce(open: boolean): boolean {
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  return mounted;
}

/** Global keyboard shortcuts. */
function useGlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Escape — close the topmost open panel
      if (e.key === 'Escape') {
        const ui = uiStore.getState();
        if (ui.typographyOpen)  { uiActions.closeTypography(); return; }
        if (ui.settingsOpen)    { uiActions.closeSettings();   return; }
        if (ui.libraryOpen)     { uiActions.closeLibrary();    return; }
        if (ui.sidebarOpen && window.innerWidth < 768) { uiActions.closeSidebar(); return; }
      }

      // Cmd/Ctrl+N — new note (prevent browser default new-window)
      if (mod && e.key === 'n') {
        e.preventDefault();
        notesActions.addNote();
        uiActions.openSidebar();
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

export default function Home() {
  useGlobalShortcuts();

  const sidebarOpen    = useStore(uiStore, selectSidebarOpen);
  const settingsOpen   = useStore(uiStore, selectSettingsOpen);
  const typographyOpen = useStore(uiStore, selectTypographyOpen);
  const libraryOpen    = useStore(uiStore, selectLibraryOpen);

  const settingsMounted   = useMountedOnce(settingsOpen);
  const typographyMounted = useMountedOnce(typographyOpen);

  return (
    <div className="h-[100dvh] bg-background text-foreground font-serif selection:bg-primary/20 flex overflow-hidden">
      {/* Mobile-only backdrop dimmer */}
      <div
        onClick={uiActions.closeSidebar}
        className={cn(
          'fixed inset-0 z-30 bg-black/15 backdrop-blur-[2px] md:hidden transition-opacity duration-300',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      <AppSidebar />
      <NoteEditor />

      <Suspense fallback={null}>
        {settingsMounted   && <SettingsPanel />}
        {typographyMounted && <TypographyPanel />}
        {libraryOpen       && <LibraryView />}
      </Suspense>
    </div>
  );
}
