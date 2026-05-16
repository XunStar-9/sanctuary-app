/**
 * AppSidebar — left drawer with notes list + a docked mini music player.
 *
 * Layout shell (top → bottom):
 *   1. Header           ─ logo + close button
 *   2. Notes (scroll)   ─ takes all remaining vertical space, scrollable
 *   3. Music dock       ─ docked above the footer; collapsible
 *   4. Footer           ─ Settings + Library buttons
 *
 * The component subscribes to notes/ui stores and the audio engine directly.
 */

import { useState, useCallback, memo } from 'react';
import {
  X, Plus, Search, Music, Shuffle, SkipBack, Play, Pause, SkipForward,
  Repeat, Upload, Settings, BookOpen, ListMusic, Trash2, Volume2, VolumeX,
  ChevronUp, Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useStore } from '@/lib/store';
import { notesStore, notesActions, notesSelectors } from '@/stores/notesStore';
import { uiStore, uiActions } from '@/stores/uiStore';
import { useAudioControls, useAudioSelector } from '@/hooks/useAudio';
import { useSwipe } from '@/hooks/useSwipe';
import { getAccentHsl } from '@/lib/types';
import { sleepTimerStore, formatSleepCountdown } from '@/stores/sleepTimerStore';

const BTN_BASE = 'transition-all duration-150 active:scale-90';
const BTN_ICON = 'flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90';

/* ── Notes section ───────────────────────────────────────────────────────── */

const NotesSection = memo(function NotesSection() {
  const filteredNotes = useStore(notesStore, s => notesSelectors.filtered(s));
  const activeNoteId = useStore(notesStore, s => s.activeNoteId);
  const searchQuery = useStore(notesStore, s => s.searchQuery);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => {
    notesActions.setActiveNoteId(id);
    if (window.innerWidth < 768) uiActions.closeSidebar();
  }, []);

  const handleDeleteConfirm = useCallback((id: string) => {
    setConfirmDelete(prev => {
      if (prev === id) {
        notesActions.deleteNote(id);
        return null;
      }
      // Auto-clear the confirmation prompt after 3 s.
      window.setTimeout(() => setConfirmDelete(curr => (curr === id ? null : curr)), 3000);
      return id;
    });
  }, []);

  return (
    <div className="px-5 pt-1 pb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Notes</span>
        <button
          onClick={notesActions.addNote}
          className={cn(BTN_ICON, 'w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-muted/50')}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <input
          className="w-full pl-8 pr-8 h-8 bg-muted/50 rounded-full text-[13px] font-sans border-none outline-none placeholder-muted-foreground/40"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => notesActions.setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => notesActions.setSearchQuery('')}
            className={cn(BTN_ICON, 'absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 hover:text-foreground')}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5 -mx-2">
        {filteredNotes.map(note => (
          <div
            key={note.id}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 group flex items-start gap-1',
              activeNoteId === note.id
                ? 'bg-primary/10 text-foreground'
                : 'text-foreground/70 hover:bg-muted/50 hover:text-foreground active:bg-muted/70',
            )}
          >
            <button onClick={() => handleSelect(note.id)} className="flex-1 min-w-0 text-left">
              <p className="text-[13px] font-medium line-clamp-1 mb-0.5">{note.title}</p>
              <p className="text-[11px] font-sans text-muted-foreground">{note.date}</p>
            </button>
            <button
              onClick={() => handleDeleteConfirm(note.id)}
              className={cn(
                'p-1 rounded-md shrink-0 mt-0.5 transition-all duration-150 active:scale-90',
                confirmDelete === note.id
                  ? 'text-destructive bg-destructive/10'
                  : 'text-muted-foreground/20 md:text-transparent md:group-hover:text-muted-foreground/40 hover:text-destructive hover:bg-muted/50',
              )}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {filteredNotes.length === 0 && (
          <p className="px-3 py-4 text-[13px] font-sans text-muted-foreground/60 text-center">No notes found</p>
        )}
      </div>
    </div>
  );
});

/* ── Music dock ──────────────────────────────────────────────────────────── */

type MusicDockProps = { onOpenPlaylist: () => void };

/**
 * Two-state music dock:
 *  - collapsed: single-row card showing cover, title, play/pause, expand chevron.
 *    A 1-px progress strip across the top of the dock keeps the playhead visible.
 *  - expanded:  full controls (transport, seek, volume).
 *
 * The expand/collapse animation uses `grid-template-rows: 0fr ↔ 1fr`, which
 * smoothly transitions to the natural height without measuring it manually.
 */
function MusicDock({
  onOpenPlaylist,
}: MusicDockProps) {
  // Subscribe to individual audio fields for granular re-renders.
  const playlist       = useAudioSelector(s => s.playlist);
  const currentSong    = useAudioSelector(s => s.currentSong);
  const isPlaying      = useAudioSelector(s => s.isPlaying);
  const isShuffle      = useAudioSelector(s => s.isShuffle);
  const isRepeat       = useAudioSelector(s => s.isRepeat);
  const volume         = useAudioSelector(s => s.volume);
  const progressPct    = useAudioSelector(s => s.progressPct);
  const displayTime    = useAudioSelector(s => s.displayTime);
  const displayDuration = useAudioSelector(s => s.displayDuration);
  const { handlePlayPause, handleNext, handlePrev, handleSeek, handleVolume,
          toggleMute, startDrag, stopDrag, handleUploadClick, toggleShuffle, toggleRepeat } = useAudioControls();
  const expanded = useStore(uiStore, s => s.musicExpanded);
  const sleepRemainingSecs   = useStore(sleepTimerStore, s => s.remainingSecs);
  const sleepTracksRemaining = useStore(sleepTimerStore, s => s.tracksRemaining);
  const sleepCountdown       = formatSleepCountdown(sleepRemainingSecs);
  const sleepLabel = sleepCountdown
    ? `Sleep · ${sleepCountdown}`
    : sleepTracksRemaining !== null
      ? `Sleep · ${sleepTracksRemaining} 首`
      : null;

  // Per-song accent. Falls back to the theme primary when no accent is mapped
  // (e.g. the default playlist song or a gradient we don't have a hue for).
  const accentHsl = getAccentHsl(currentSong?.gradient);
  const dockStyle = {
    // CSS custom property scoped to the dock subtree. Buttons read via:
    //   style={{ background: 'hsl(var(--song-accent))' }}
    // and similar. We default to the theme primary so nothing breaks when
    // accent is null.
    '--song-accent': accentHsl ?? 'var(--primary)',
  } as React.CSSProperties;

  // Gesture handlers on the collapsed/expanded header row:
  //   • horizontal swipe → prev/next track
  //   • swipe up        → expand (if collapsed) / open fullscreen (if expanded)
  //   • swipe down      → collapse (if expanded)
  // Click (no swipe) keeps its default toggle behavior; useSwipe.onClickCapture
  // suppresses the synthetic click after a real swipe.
  const swipe = useSwipe({
    onSwipeLeft:  handleNext,
    onSwipeRight: handlePrev,
    onSwipeUp:    () => {
      if (expanded) uiActions.openFullscreenPlayer();
      else          uiActions.toggleMusic();
    },
    onSwipeDown:  () => { if (expanded) uiActions.toggleMusic(); },
  });

  // Empty state: single compact row, dock-height stays minimal.
  if (playlist.length === 0) {
    return (
      <div className="border-t border-border/30 px-5 py-2.5 shrink-0 flex items-center gap-2">
        <Music className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
        <span className="text-[12px] font-sans text-muted-foreground/50 flex-1 truncate">No songs yet</span>
        <button
          onClick={handleUploadClick}
          className={cn(BTN_BASE, 'text-[11px] font-sans text-primary/70 hover:text-primary flex items-center gap-1')}
        >
          <Upload className="w-3 h-3" /> Upload
        </button>
      </div>
    );
  }

  const stopProp = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div className="border-t border-border/30 shrink-0 select-none" style={dockStyle}>
      {/* Always-visible thin progress strip — visual continuity across collapse. */}
      <div className="h-[2px] bg-muted/30">
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${progressPct}%`, background: 'hsl(var(--song-accent) / 0.85)' }}
        />
      </div>

      {/* Header row (always visible). Tapping anywhere on it toggles expanded.
          Horizontal swipe → prev/next track; vertical swipe → expand/collapse. */}
      <button
        onClick={uiActions.toggleMusic}
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
        onClickCapture={swipe.onClickCapture}
        className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left touch-pan-y"
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse music player' : 'Expand music player'}
      >
        <div
          className="flex items-center gap-3 flex-1 min-w-0"
          style={{
            transform: `translateX(${swipe.dragDx}px)`,
            transition: swipe.dragDx === 0 ? 'transform 200ms cubic-bezier(0.32,0.72,0,1)' : 'none',
          }}
        >
          <div className={cn(
            'w-9 h-9 rounded-lg shrink-0 bg-gradient-to-br flex items-center justify-center relative overflow-hidden',
            currentSong?.gradient ?? 'from-muted to-muted/40',
          )}>
            {isPlaying ? (
              <div className="flex items-end gap-0.5">
                <div className="w-0.5 bg-white/85 animate-pulse" style={{ height: '8px',  animationDelay: '0ms'   }} />
                <div className="w-0.5 bg-white/85 animate-pulse" style={{ height: '12px', animationDelay: '150ms' }} />
                <div className="w-0.5 bg-white/85 animate-pulse" style={{ height: '8px',  animationDelay: '300ms' }} />
              </div>
            ) : currentSong?.isUploaded ? (
              <Music className="w-4 h-4 text-white/55" />
            ) : null}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate text-foreground">{currentSong?.title ?? '—'}</p>
            <p className="text-[11px] font-sans text-muted-foreground truncate">
              {sleepLabel ?? (currentSong?.artist ?? '')}
            </p>
          </div>
        </div>

        {/* Quick play/pause (works without expanding). */}
        <span
          role="button"
          tabIndex={0}
          onClick={e => { stopProp(e); handlePlayPause(); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { stopProp(e); handlePlayPause(); } }}
          onPointerDown={stopProp}
          className="w-8 h-8 rounded-full text-primary-foreground flex items-center justify-center shadow-sm transition-all duration-150 hover:scale-105 active:scale-90 shrink-0"
          style={{ background: 'hsl(var(--song-accent))' }}
        >
          {isPlaying
            ? <Pause className="w-3.5 h-3.5 fill-current" />
            : <Play  className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </span>

        <ChevronUp
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground/60 shrink-0 transition-transform duration-200',
            expanded ? 'rotate-0' : 'rotate-180',
          )}
        />
      </button>

      {/* Expanded controls — uses the grid-rows trick for smooth height anim. */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-5 pt-1 pb-3 border-t border-border/20">

            {/* Seek bar with timestamps */}
            <div className="pt-2.5">
              <Slider
                value={[progressPct]}
                max={100}
                step={0.1}
                onValueChange={handleSeek}
                onPointerDown={startDrag}
                onPointerUp={stopDrag}
              />
              <div className="flex justify-between text-[10px] font-sans text-muted-foreground mt-1 mb-2.5 tabular-nums">
                <span>{displayTime}</span>
                <span>{displayDuration}</span>
              </div>
            </div>

            {/* Transport row */}
            <div className="flex items-center justify-center gap-4 mb-2.5">
              <button
                onClick={toggleShuffle}
                title="Shuffle"
                className={cn(BTN_BASE, isShuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button onClick={handlePrev} title="Previous" className={cn(BTN_BASE, 'text-foreground/70 hover:text-foreground')}>
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={handlePlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
                className="w-10 h-10 rounded-full text-primary-foreground flex items-center justify-center shadow-sm transition-all duration-150 hover:scale-105 active:scale-90"
                style={{ background: 'hsl(var(--song-accent))' }}
              >
                {isPlaying
                  ? <Pause className="w-4 h-4 fill-current" />
                  : <Play  className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button onClick={handleNext} title="Next" className={cn(BTN_BASE, 'text-foreground/70 hover:text-foreground')}>
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={toggleRepeat}
                title="Repeat"
                className={cn(BTN_BASE, isRepeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume + secondary actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                title={volume === 0 ? 'Unmute' : 'Mute'}
                className={cn(BTN_BASE, 'text-muted-foreground/60 hover:text-foreground shrink-0')}
              >
                {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                className="flex-1"
                onValueChange={handleVolume}
              />
              <button
                onClick={onOpenPlaylist}
                title="Playlist"
                className={cn(BTN_ICON, 'w-7 h-7 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 shrink-0')}
              >
                <ListMusic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={uiActions.openFullscreenPlayer}
                title="Open full-screen player"
                className={cn(BTN_ICON, 'w-7 h-7 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 shrink-0')}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleUploadClick}
                title="Upload music"
                className={cn(BTN_ICON, 'w-7 h-7 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 shrink-0')}
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Playlist slide-up panel ────────────────────────────────────────────── */

type PlaylistPanelProps = {
  open: boolean;
  onClose: () => void;
};

function PlaylistPanel({ open, onClose }: PlaylistPanelProps) {
  const playlist         = useAudioSelector(s => s.playlist);
  const currentSongIndex = useAudioSelector(s => s.currentSongIndex);
  const isPlaying        = useAudioSelector(s => s.isPlaying);
  const { handleSelectSong, handleRemoveSong, handleUploadClick } = useAudioControls();
  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 z-10 bg-black/15 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />
      <div
        className={cn(
          'absolute left-0 right-0 bottom-0 z-20 flex flex-col bg-card/98 backdrop-blur-xl border-t border-border/40 rounded-t-2xl shadow-2xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ maxHeight: '70%' }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0">
          <span className="text-[13px] font-sans font-medium text-foreground">Playlist</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleUploadClick}
              className={cn(BTN_ICON, 'w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted/50')}
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className={cn(BTN_ICON, 'w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted/50')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {playlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Music className="w-6 h-6 text-muted-foreground/20" />
              <p className="text-[13px] font-sans text-muted-foreground/40 text-center">Playlist is empty</p>
              <button
                onClick={handleUploadClick}
                className={cn(BTN_BASE, 'text-[12px] font-sans text-primary/70 hover:text-primary flex items-center gap-1.5')}
              >
                <Upload className="w-3.5 h-3.5" /> Upload music
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {playlist.map((song, idx) => (
                <div
                  key={song.id}
                  onClick={() => handleSelectSong(idx)}
                  className={cn(
                    'flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl transition-all duration-150 group cursor-pointer',
                    currentSongIndex === idx ? 'bg-primary/10' : 'hover:bg-muted/40 active:bg-muted/60',
                  )}
                >
                  <div className={cn('w-7 h-7 rounded-md shrink-0 bg-gradient-to-br relative overflow-hidden', song.gradient)}>
                    {currentSongIndex === idx && isPlaying ? (
                      <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1">
                        <div className="w-0.5 bg-white/80 animate-pulse" style={{ height: '8px',  animationDelay: '0ms'   }} />
                        <div className="w-0.5 bg-white/80 animate-pulse" style={{ height: '12px', animationDelay: '150ms' }} />
                        <div className="w-0.5 bg-white/80 animate-pulse" style={{ height: '8px',  animationDelay: '300ms' }} />
                      </div>
                    ) : song.isUploaded ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Music className="w-3 h-3 text-white/50" />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[13px] font-medium truncate',
                      currentSongIndex === idx
                        ? 'text-foreground'
                        : 'text-foreground/70 group-hover:text-foreground',
                    )}>
                      {song.title}
                    </p>
                    <p className="text-[11px] font-sans text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-sans text-muted-foreground">{song.duration}</span>
                    <button
                      onClick={e => handleRemoveSong(e, song.id)}
                      className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-muted/50 transition-all duration-150 active:scale-90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Sidebar shell ──────────────────────────────────────────────────────── */

export const AppSidebar = memo(function AppSidebar() {
  const open = useStore(uiStore, s => s.sidebarOpen);
  const controls = useAudioControls();
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const closePlaylist = useCallback(() => setPlaylistOpen(false), []);
  const openPlaylist = useCallback(() => setPlaylistOpen(true), []);

  return (
    <aside
      className={cn(
        'fixed md:relative left-0 top-0 bottom-0 z-40 flex flex-col',
        'w-[300px] bg-card/80 backdrop-blur-2xl border-r border-border/40',
        'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0',
        open ? 'translate-x-0' : '-translate-x-full md:-translate-x-full',
      )}
    >
      <input
        ref={controls.fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={controls.handleFileChange}
      />

      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
        <span className="text-xs font-sans tracking-[0.2em] uppercase text-muted-foreground/50 select-none">Sanctuary</span>
        <button
          onClick={uiActions.closeSidebar}
          className={cn(BTN_ICON, 'w-7 h-7 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notes scroll region — takes all remaining space above the docked music. */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <NotesSection />
      </div>

      {/* Music dock pinned above the footer. */}
      <MusicDock onOpenPlaylist={openPlaylist} />

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/20 shrink-0 flex items-center justify-between">
        <button
          onClick={uiActions.openSettings}
          className={cn(BTN_BASE, 'flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground')}
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="text-[11px] font-sans tracking-wide">Settings</span>
        </button>
        <button
          onClick={uiActions.openLibrary}
          className={cn(BTN_BASE, 'flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground')}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="text-[11px] font-sans tracking-wide">Library</span>
        </button>
      </div>

      <PlaylistPanel open={playlistOpen} onClose={closePlaylist} />
    </aside>
  );
});
