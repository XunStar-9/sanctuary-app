/**
 * AppSidebar — left drawer with notes list + mini music player.
 *
 * Visual layout is identical to the previous implementation. The big change
 * is that the component no longer accepts 30+ props: it subscribes to the
 * notes store, audio engine, and ui store directly. The internal layout was
 * also lightly restructured — the playlist drawer and the notes/music sections
 * are now separate sub-components, each rendering only what it needs.
 */

import { useState, useCallback, memo } from 'react';
import {
  X, Plus, Search, Music, Shuffle, SkipBack, Play, Pause, SkipForward,
  Repeat, Upload, Settings, BookOpen, ListMusic, Trash2, Volume2, VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useStore } from '@/lib/store';
import { notesStore, notesActions, notesSelectors } from '@/stores/notesStore';
import { uiStore, uiActions } from '@/stores/uiStore';
import { useAudio } from '@/hooks/useAudio';

const BTN_BASE = 'transition-all duration-150 active:scale-90';
const BTN_ICON = 'flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90';

/* ── Stable selectors ───────────────────────────────────────────────────── */

const selectFilteredNotes = (s: any) => notesSelectors.filtered(s);
const selectActiveNoteId  = (s: any) => s.activeNoteId;
const selectSearchQuery   = (s: any) => s.searchQuery;
const selectSidebarOpen   = (s: any) => s.sidebarOpen;

/* ── Notes section ───────────────────────────────────────────────────────── */

const NotesSection = memo(function NotesSection() {
  const filteredNotes = useStore(notesStore, selectFilteredNotes);
  const activeNoteId = useStore(notesStore, selectActiveNoteId);
  const searchQuery = useStore(notesStore, selectSearchQuery);
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
    <div className="px-5 mb-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Notes</span>
        <button
          onClick={notesActions.addNote}
          className={cn(BTN_ICON, 'w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-muted/50')}
          aria-label="New note"
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
          aria-label="Search notes"
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

      <div className="flex flex-col gap-0.5 mb-4 -mx-2">
        {filteredNotes.map((note, idx) => (
          <div
            key={note.id}
            className={cn(
              'w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 group flex items-start gap-1 animate-slide-in-note',
              activeNoteId === note.id
                ? 'bg-primary/10 text-foreground'
                : 'text-foreground/70 hover:bg-muted/50 hover:text-foreground active:bg-muted/70',
            )}
            style={{ animationDelay: `${idx * 30}ms` }}
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
              aria-label={confirmDelete === note.id ? 'Confirm delete' : 'Delete note'}
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

/* ── Music mini-player ──────────────────────────────────────────────────── */

const MusicSection = memo(function MusicSection({ onOpenPlaylist }: { onOpenPlaylist: () => void }) {
  const audio = useAudio();

  return (
    <>
      <MusicMini {...audio} onOpenPlaylist={onOpenPlaylist} />
      {/* Hidden file input lives here so the audio ref is in scope */}
      <input
        ref={audio.fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={audio.handleFileChange}
      />
    </>
  );
});

type MusicMiniProps = ReturnType<typeof useAudio> & { onOpenPlaylist: () => void };

function MusicMini({
  playlist, currentSong, isPlaying, isShuffle, isRepeat, volume,
  progressPct, displayTime, displayDuration,
  handlePlayPause, handleNext, handlePrev, handleSeek, handleVolume,
  toggleMute, startDrag, stopDrag,
  handleUploadClick, toggleShuffle, toggleRepeat,
  onOpenPlaylist,
}: MusicMiniProps) {
  return (
    <>
      <div className="px-5 mb-3 flex items-center justify-between">
        <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Music</span>
        <button
          onClick={onOpenPlaylist}
          className={cn(BTN_ICON, 'w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-muted/50')}
          title="Playlist"
        >
          <ListMusic className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-5 mb-4">
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <Music className="w-5 h-5 text-muted-foreground/25" />
            <p className="text-[12px] font-sans text-muted-foreground/40">No songs yet</p>
            <button
              onClick={handleUploadClick}
              className={cn(BTN_BASE, 'text-[11px] font-sans text-primary/70 hover:text-primary flex items-center gap-1')}
            >
              <Upload className="w-3 h-3" /> Upload music
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'w-10 h-10 rounded-lg shrink-0 bg-gradient-to-br flex items-center justify-center relative overflow-hidden',
                currentSong?.gradient ?? 'from-muted to-muted/40',
                isPlaying && 'animate-vinyl-spin rounded-full',
              )}>
                {currentSong?.isUploaded && <Music className="w-4 h-4 text-white/50" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate text-foreground">{currentSong?.title ?? '—'}</p>
                <p className="text-[11px] font-sans text-muted-foreground truncate">{currentSong?.artist ?? ''}</p>
              </div>
            </div>

            <Slider
              value={[progressPct]}
              max={100}
              step={0.1}
              className="mb-1"
              onValueChange={handleSeek}
              onPointerDown={startDrag}
              onPointerUp={stopDrag}
            />
            <div className="flex justify-between text-[10px] font-sans text-muted-foreground mb-3">
              <span>{displayTime}</span>
              <span>{displayDuration}</span>
            </div>

            <div className="flex items-center justify-center gap-4 mb-3">
              <button
                onClick={toggleShuffle}
                className={cn(BTN_BASE, isShuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                aria-label="Toggle shuffle"
                aria-pressed={isShuffle}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button onClick={handlePrev} className={cn(BTN_BASE, 'text-foreground/70 hover:text-foreground')} aria-label="Previous track">
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={handlePlayPause}
                className={cn(
                  "w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-all duration-150 hover:scale-105 active:scale-90",
                  isPlaying && 'animate-music-pulse',
                )}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying
                  ? <Pause className="w-4 h-4 fill-current" />
                  : <Play  className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button onClick={handleNext} className={cn(BTN_BASE, 'text-foreground/70 hover:text-foreground')} aria-label="Next track">
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
              <button
                onClick={toggleRepeat}
                className={cn(BTN_BASE, isRepeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
                aria-label="Toggle repeat"
                aria-pressed={isRepeat}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className={cn(BTN_BASE, 'text-muted-foreground/60 hover:text-foreground shrink-0')}
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              >
                {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <Slider value={[volume * 100]} max={100} step={1} className="flex-1" onValueChange={handleVolume} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── Playlist slide-up panel ────────────────────────────────────────────── */

type PlaylistPanelProps = {
  open: boolean;
  onClose: () => void;
};

function PlaylistPanel({ open, onClose }: PlaylistPanelProps) {
  const audio = useAudio();
  const { playlist, currentSongIndex, isPlaying, handleSelectSong, handleRemoveSong, handleUploadClick } = audio;
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
  const open = useStore(uiStore, selectSidebarOpen);
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
      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
        <span className="text-xs font-sans tracking-[0.2em] uppercase text-muted-foreground/50 select-none">Sanctuary</span>
        <button
          onClick={uiActions.closeSidebar}
          className={cn(BTN_ICON, 'w-7 h-7 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50')}
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <NotesSection />
        <div className="mx-5 border-t border-border/30 mb-4" />
        <MusicSection onOpenPlaylist={openPlaylist} />
      </div>

      <div className="px-5 py-4 border-t border-border/20 shrink-0 flex items-center justify-between">
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
