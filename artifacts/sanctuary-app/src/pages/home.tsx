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
import { AppSidebar } from '@/components/AppSidebar';
import { NoteEditor } from '@/components/NoteEditor';

// Eagerly import sleep-timer store so its end-of-track hook registers with
// the audio engine before any track ends, even if no sleep-timer UI is open.
import '@/stores/sleepTimerStore';

// Heavy / rarely-opened panels load on demand.
const SettingsPanel    = lazy(() => import('@/components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
const TypographyPanel  = lazy(() => import('@/components/TypographyPanel').then(m => ({ default: m.TypographyPanel })));
const LibraryView      = lazy(() => import('@/components/LibraryView').then(m => ({ default: m.LibraryView })));
const FullScreenPlayer = lazy(() => import('@/components/FullScreenPlayer').then(m => ({ default: m.FullScreenPlayer })));

/** Mount-on-first-open: keeps initial bundle minimal but avoids re-mounting
 *  the panel each time it's opened (preserves slide-out animation). */
function useMountedOnce(open: boolean): boolean {
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  return mounted;
}

export default function Home() {
  const sidebarOpen        = useStore(uiStore, s => s.sidebarOpen);
  const settingsOpen       = useStore(uiStore, s => s.settingsOpen);
  const typographyOpen     = useStore(uiStore, s => s.typographyOpen);
  const libraryOpen        = useStore(uiStore, s => s.libraryOpen);
  const fullscreenOpen     = useStore(uiStore, s => s.fullscreenPlayerOpen);

  const settingsMounted   = useMountedOnce(settingsOpen);
  const typographyMounted = useMountedOnce(typographyOpen);
  const fullscreenMounted = useMountedOnce(fullscreenOpen);

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
        {fullscreenMounted && fullscreenOpen && <FullScreenPlayer />}
      </Suspense>
    </div>
  );
}
