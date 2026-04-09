import { useRef, memo } from 'react';
import { X, Plus, Search, Music, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Upload, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import type { Note, Song } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;

  notes: Note[];
  filteredNotes: Note[];
  activeNoteId: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;

  playlist: Song[];
  currentSong: Song | undefined;
  currentSongIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
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
  onDragStart: () => void;
  onDragEnd: () => void;
  onRemoveSong: (e: React.MouseEvent, id: string) => void;
  onUploadClick: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
};

export const AppSidebar = memo(function AppSidebar({
  open, onClose, onOpenSettings,
  filteredNotes, activeNoteId, searchQuery, onSearchChange, onSelectNote, onAddNote,
  playlist, currentSong, currentSongIndex, isPlaying, isShuffle, isRepeat,
  progressPct, displayTime, displayDuration,
  fileInputRef, onFileChange,
  onPlayPause, onNext, onPrev, onSelectSong, onSeek, onDragStart, onDragEnd,
  onRemoveSong, onUploadClick, onToggleShuffle, onToggleRepeat,
}: Props) {
  return (
    <aside className={cn(
      "fixed md:relative left-0 top-0 bottom-0 z-40 flex flex-col",
      "w-[300px] bg-card/80 backdrop-blur-2xl border-r border-border/40",
      "transition-transform duration-300 ease-in-out shrink-0",
      open ? "translate-x-0" : "-translate-x-full md:-translate-x-full"
    )}>
      <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={onFileChange} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
        <span className="text-xs font-sans tracking-[0.2em] uppercase text-muted-foreground/50 select-none">Sanctuary</span>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Notes ── */}
        <div className="px-5 mb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Notes</span>
            <button onClick={onAddNote}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              className="w-full pl-8 pr-3 h-8 bg-muted/50 rounded-full text-[13px] font-sans border-none outline-none focus:ring-1 focus:ring-primary/30 placeholder-muted-foreground/40"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="px-3 flex flex-col gap-0.5 mb-4">
          {filteredNotes.map(note => (
            <button key={note.id}
              onClick={() => onSelectNote(note.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-xl transition-colors",
                activeNoteId === note.id
                  ? "bg-primary/10 text-foreground"
                  : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"
              )}>
              <p className="text-[13px] font-medium line-clamp-1 mb-0.5">{note.title}</p>
              <p className="text-[11px] font-sans text-muted-foreground">{note.date}</p>
            </button>
          ))}
          {filteredNotes.length === 0 && (
            <p className="px-3 py-4 text-[13px] font-sans text-muted-foreground/60 text-center">No notes found</p>
          )}
        </div>

        <div className="mx-5 border-t border-border/30 mb-4" />

        {/* ── Music ── */}
        <div className="px-5 mb-3">
          <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Music</span>
        </div>

        <div className="px-5 mb-4">
          {/* Now playing */}
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

          {/* Progress */}
          <Slider value={[progressPct]} max={100} step={0.1}
            className="mb-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
            onValueChange={onSeek}
            onPointerDown={onDragStart}
            onPointerUp={onDragEnd} />
          <div className="flex justify-between text-[10px] font-sans text-muted-foreground mb-3">
            <span>{displayTime}</span>
            <span>{displayDuration}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={onToggleShuffle}
              className={cn("transition-colors", isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <button onClick={onPrev} className="text-foreground/70 hover:text-foreground transition-colors">
              <SkipBack className="w-4 h-4 fill-current" />
            </button>
            <button onClick={onPlayPause}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button onClick={onNext} className="text-foreground/70 hover:text-foreground transition-colors">
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
            <button onClick={onToggleRepeat}
              className={cn("transition-colors", isRepeat ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Playlist */}
        <div className="px-3 flex flex-col gap-0.5 pb-4">
          {playlist.map((song, idx) => (
            <button key={song.id} onClick={() => onSelectSong(idx)}
              className={cn(
                "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl transition-colors group",
                currentSongIndex === idx ? "bg-white/50 dark:bg-white/10" : "hover:bg-muted/40"
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
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[11px] font-sans text-muted-foreground">{song.duration}</span>
                {song.isUploaded && (
                  <button onClick={e => onRemoveSong(e, song.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all ml-0.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </button>
          ))}
          <button onClick={onUploadClick}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors w-full text-left mt-1">
            <Upload className="w-3.5 h-3.5" />
            <span className="text-[13px] font-sans">Upload music</span>
          </button>
        </div>
      </div>

      {/* Settings corner */}
      <div className="px-5 py-4 border-t border-border/20 shrink-0">
        <button onClick={onOpenSettings}
          className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <Settings className="w-3.5 h-3.5" />
          <span className="text-[11px] font-sans tracking-wide">Settings</span>
        </button>
      </div>
    </aside>
  );
});
