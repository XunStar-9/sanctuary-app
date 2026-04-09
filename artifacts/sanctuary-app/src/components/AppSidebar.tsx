import { useState, memo } from 'react';
import { X, Plus, Search, Music, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Upload, Settings, BookOpen, ListMusic, Trash2, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import type { Note, Song } from '@/lib/types';

const BTN_BASE = "transition-all duration-150 active:scale-90";
const BTN_ICON = "flex items-center justify-center rounded-lg transition-all duration-150 active:scale-90";

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;

  filteredNotes: Note[];
  activeNoteId: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;
  onDeleteNote: (id: string) => void;

  playlist: Song[];
  currentSong: Song | undefined;
  currentSongIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  volume: number;
  progressPct: number;
  displayTime: string;
  displayDuration: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectSong: (idx: number) => void;
  onSeek: (val: number[]) => void;
  onVolume: (val: number[]) => void;
  onToggleMute: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onRemoveSong: (e: React.MouseEvent, id: string) => void;
  onUploadClick: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
};

export const AppSidebar = memo(function AppSidebar({
  open, onClose, onOpenSettings, onOpenLibrary,
  filteredNotes, activeNoteId, searchQuery, onSearchChange, onSelectNote, onAddNote, onDeleteNote,
  playlist, currentSong, currentSongIndex, isPlaying, isShuffle, isRepeat, volume,
  progressPct, displayTime, displayDuration,
  fileInputRef, onFileChange,
  onPlayPause, onNext, onPrev, onSelectSong, onSeek, onVolume, onToggleMute, onDragStart, onDragEnd,
  onRemoveSong, onUploadClick, onToggleShuffle, onToggleRepeat,
}: Props) {
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDeleteConfirm = (id: string) => {
    if (confirmDelete === id) {
      onDeleteNote(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  return (
    <aside className={cn(
      "fixed md:relative left-0 top-0 bottom-0 z-40 flex flex-col",
      "w-[300px] bg-card/80 backdrop-blur-2xl border-r border-border/40",
      "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0",
      open ? "translate-x-0" : "-translate-x-full md:-translate-x-full"
    )}>
      <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={onFileChange} />

      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
        <span className="text-xs font-sans tracking-[0.2em] uppercase text-muted-foreground/50 select-none">Sanctuary</span>
        <button onClick={onClose}
          className={cn(BTN_ICON, "w-7 h-7 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50")}>
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        <div className="px-5 mb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Notes</span>
            <button onClick={onAddNote}
              className={cn(BTN_ICON, "w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              className="w-full pl-8 pr-8 h-8 bg-muted/50 rounded-full text-[13px] font-sans border-none outline-none placeholder-muted-foreground/40"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => onSearchChange('')}
                className={cn(BTN_ICON, "absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50 hover:text-foreground")}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="px-3 flex flex-col gap-0.5 mb-4">
          {filteredNotes.map(note => (
            <div key={note.id}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 group flex items-start gap-1",
                activeNoteId === note.id
                  ? "bg-primary/10 text-foreground"
                  : "text-foreground/70 hover:bg-muted/50 hover:text-foreground active:bg-muted/70"
              )}>
              <button
                onClick={() => onSelectNote(note.id)}
                className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-medium line-clamp-1 mb-0.5">{note.title}</p>
                <p className="text-[11px] font-sans text-muted-foreground">{note.date}</p>
              </button>
              <button
                onClick={() => handleDeleteConfirm(note.id)}
                className={cn(
                  "p-1 rounded-md shrink-0 mt-0.5 transition-all duration-150 active:scale-90",
                  confirmDelete === note.id
                    ? "text-destructive bg-destructive/10"
                    : "text-muted-foreground/20 md:text-transparent md:group-hover:text-muted-foreground/40 hover:text-destructive hover:bg-muted/50"
                )}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {filteredNotes.length === 0 && (
            <p className="px-3 py-4 text-[13px] font-sans text-muted-foreground/60 text-center">No notes found</p>
          )}
        </div>

        <div className="mx-5 border-t border-border/30 mb-4" />

        <div className="px-5 mb-3 flex items-center justify-between">
          <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Music</span>
          <button onClick={() => setPlaylistOpen(true)}
            className={cn(BTN_ICON, "w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-muted/50")}
            title="Playlist">
            <ListMusic className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-5 mb-4">
          {playlist.length === 0 ? (
            <div className="flex flex-col items-center py-4 gap-2">
              <Music className="w-5 h-5 text-muted-foreground/25" />
              <p className="text-[12px] font-sans text-muted-foreground/40">No songs yet</p>
              <button onClick={onUploadClick}
                className={cn(BTN_BASE, "text-[11px] font-sans text-primary/70 hover:text-primary flex items-center gap-1")}>
                <Upload className="w-3 h-3" /> Upload music
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-lg shrink-0 bg-gradient-to-br flex items-center justify-center relative overflow-hidden",
                  currentSong?.gradient ?? 'from-muted to-muted/40')}>
                  {currentSong?.isUploaded && <Music className="w-4 h-4 text-white/50" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate text-foreground">{currentSong?.title ?? '—'}</p>
                  <p className="text-[11px] font-sans text-muted-foreground truncate">{currentSong?.artist ?? ''}</p>
                </div>
              </div>

              <Slider value={[progressPct]} max={100} step={0.1}
                className="mb-1"
                onValueChange={onSeek}
                onPointerDown={onDragStart}
                onPointerUp={onDragEnd} />
              <div className="flex justify-between text-[10px] font-sans text-muted-foreground mb-3">
                <span>{displayTime}</span>
                <span>{displayDuration}</span>
              </div>

              <div className="flex items-center justify-center gap-4 mb-3">
                <button onClick={onToggleShuffle}
                  className={cn(BTN_BASE, isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
                <button onClick={onPrev} className={cn(BTN_BASE, "text-foreground/70 hover:text-foreground")}>
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>
                <button onClick={onPlayPause}
                  className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-all duration-150 hover:scale-105 active:scale-90">
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button onClick={onNext} className={cn(BTN_BASE, "text-foreground/70 hover:text-foreground")}>
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>
                <button onClick={onToggleRepeat}
                  className={cn(BTN_BASE, isRepeat ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                  <Repeat className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={onToggleMute}
                  className={cn(BTN_BASE, "text-muted-foreground/60 hover:text-foreground shrink-0")}>
                  {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <Slider value={[volume * 100]} max={100} step={1}
                  className="flex-1"
                  onValueChange={onVolume} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border/20 shrink-0 flex items-center justify-between">
        <button onClick={onOpenSettings}
          className={cn(BTN_BASE, "flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground")}>
          <Settings className="w-3.5 h-3.5" />
          <span className="text-[11px] font-sans tracking-wide">Settings</span>
        </button>
        <button onClick={onOpenLibrary}
          className={cn(BTN_BASE, "flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground")}>
          <BookOpen className="w-3.5 h-3.5" />
          <span className="text-[11px] font-sans tracking-wide">Library</span>
        </button>
      </div>

      {/* ── Playlist slide-up panel ── */}
      <div
        onClick={() => setPlaylistOpen(false)}
        className={cn(
          "absolute inset-0 z-10 bg-black/15 transition-opacity duration-300",
          playlistOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />
      <div className={cn(
        "absolute left-0 right-0 bottom-0 z-20 flex flex-col bg-card/98 backdrop-blur-xl border-t border-border/40 rounded-t-2xl shadow-2xl",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        playlistOpen ? "translate-y-0" : "translate-y-full"
      )} style={{ maxHeight: '70%' }}>
        <div className="flex items-center justify-between px-5 py-3.5 shrink-0">
          <span className="text-[13px] font-sans font-medium text-foreground">Playlist</span>
          <div className="flex items-center gap-1">
            <button onClick={onUploadClick}
              className={cn(BTN_ICON, "w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPlaylistOpen(false)}
              className={cn(BTN_ICON, "w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
          {playlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Music className="w-6 h-6 text-muted-foreground/20" />
              <p className="text-[13px] font-sans text-muted-foreground/40 text-center">Playlist is empty</p>
              <button onClick={onUploadClick}
                className={cn(BTN_BASE, "text-[12px] font-sans text-primary/70 hover:text-primary flex items-center gap-1.5")}>
                <Upload className="w-3.5 h-3.5" /> Upload music
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {playlist.map((song, idx) => (
                <div key={song.id}
                  onClick={() => { onSelectSong(idx); }}
                  className={cn(
                    "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl transition-all duration-150 group cursor-pointer",
                    currentSongIndex === idx ? "bg-primary/10" : "hover:bg-muted/40 active:bg-muted/60"
                  )}>
                  <div className={cn("w-7 h-7 rounded-md shrink-0 bg-gradient-to-br relative overflow-hidden", song.gradient)}>
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
                    <p className={cn("text-[13px] font-medium truncate", currentSongIndex === idx ? "text-foreground" : "text-foreground/70 group-hover:text-foreground")}>{song.title}</p>
                    <p className="text-[11px] font-sans text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-sans text-muted-foreground">{song.duration}</span>
                    <button onClick={e => onRemoveSong(e, song.id)}
                      className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-muted/50 transition-all duration-150 active:scale-90">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});
