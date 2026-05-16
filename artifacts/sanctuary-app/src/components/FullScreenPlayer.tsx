/**
 * FullScreenPlayer — full-bleed playing-now overlay.
 *
 * Mounted as a top-level overlay when `uiStore.fullscreenPlayerOpen` is true.
 * The component subscribes to `audioEngine` (via useAudio) and `uiStore` directly.
 *
 * Layout (top → bottom):
 *   1. Header bar     — Close + title chip + open-playlist
 *   2. Backdrop tint  — full-bleed accent gradient based on current song
 *   3. Cover artwork  — large square, 70% of width, max 320px
 *   4. Title & artist
 *   5. Seek bar with timestamps
 *   6. Transport row  — shuffle / prev / big play-pause / next / repeat
 *   7. Volume row     — mute toggle + slider
 *   8. Tabs           — Queue | Recent (Recent is a placeholder until task 5a)
 *
 * Interactions:
 *   - Swipe down on the upper half of the page → close
 *   - Swipe left/right anywhere on the cover → next/prev
 *   - Click backdrop never closes (the page is full overlay; only swipe / X closes)
 */

import { useState, memo, useCallback } from 'react';
import {
  ChevronDown, Music, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat,
  Volume2, VolumeX, ListMusic, Upload, X, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useAudio } from '@/hooks/useAudio';
import { useSwipe } from '@/hooks/useSwipe';
import { useStore } from '@/lib/store';
import { uiActions } from '@/stores/uiStore';
import { historyStore, historyActions } from '@/stores/historyStore';
import { getAccentHsl } from '@/lib/types';

const BTN_BASE = 'transition-all duration-150 active:scale-90';
const BTN_ICON = 'flex items-center justify-center rounded-full transition-all duration-150 active:scale-90';

/* ── Cover with horizontal swipe → prev/next + vertical swipe → close ────── */

function Cover({
  song, isPlaying, onPrev, onNext, onClose,
}: {
  song: ReturnType<typeof useAudio>['currentSong'];
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const swipe = useSwipe({
    onSwipeLeft:  onNext,
    onSwipeRight: onPrev,
    onSwipeDown:  onClose,
    thresholdY: 80, // a bit higher so accidental scrolls don't dismiss
  });

  return (
    <div
      onPointerDown={swipe.onPointerDown}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={swipe.onPointerUp}
      onPointerCancel={swipe.onPointerCancel}
      onClickCapture={swipe.onClickCapture}
      className="w-full flex items-center justify-center select-none touch-none"
    >
      <div
        className={cn(
          'aspect-square w-[70%] max-w-[320px] rounded-3xl shadow-2xl',
          'bg-gradient-to-br relative overflow-hidden',
          song?.gradient ?? 'from-muted to-muted/40',
        )}
        style={{
          transform: `translateX(${swipe.dragDx}px)`,
          transition: swipe.dragDx === 0
            ? 'transform 250ms cubic-bezier(0.32,0.72,0,1)'
            : 'none',
        }}
      >
        {/* Center icon when no real artwork is available */}
        {song?.isUploaded ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Music className="w-16 h-16 text-white/40" />
          </div>
        ) : null}

        {/* Subtle pulse overlay while playing */}
        {isPlaying && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 60%, rgba(255,255,255,0.18), transparent 60%)',
              animation: 'pulse 3s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Tabs (Queue + Recent) ───────────────────────────────────────────────── */

type TabKey = 'queue' | 'recent';

function QueueTab({ audio }: { audio: ReturnType<typeof useAudio> }) {
  const { playlist, currentSongIndex, isPlaying, handleSelectSong, handleRemoveSong } = audio;
  if (playlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Music className="w-7 h-7 text-muted-foreground/25" />
        <p className="text-[13px] font-sans text-muted-foreground/50">Playlist is empty</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5 px-3 pb-6">
      {playlist.map((song, idx) => (
        <div
          key={song.id}
          onClick={() => handleSelectSong(idx)}
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 group cursor-pointer',
            currentSongIndex === idx ? 'bg-primary/10' : 'hover:bg-muted/40 active:bg-muted/60',
          )}
        >
          <div className={cn('w-9 h-9 rounded-md shrink-0 bg-gradient-to-br relative overflow-hidden', song.gradient)}>
            {currentSongIndex === idx && isPlaying ? (
              <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1.5">
                <div className="w-0.5 bg-white/85 animate-pulse" style={{ height: '10px', animationDelay: '0ms'   }} />
                <div className="w-0.5 bg-white/85 animate-pulse" style={{ height: '14px', animationDelay: '150ms' }} />
                <div className="w-0.5 bg-white/85 animate-pulse" style={{ height: '10px', animationDelay: '300ms' }} />
              </div>
            ) : song.isUploaded ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Music className="w-4 h-4 text-white/55" />
              </div>
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-[13px] font-medium truncate',
              currentSongIndex === idx ? 'text-foreground' : 'text-foreground/70 group-hover:text-foreground',
            )}>
              {song.title}
            </p>
            <p className="text-[11px] font-sans text-muted-foreground truncate">{song.artist}</p>
          </div>
          <span className="text-[11px] font-sans text-muted-foreground tabular-nums shrink-0">{song.duration}</span>
          <button
            onClick={e => handleRemoveSong(e, song.id)}
            className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-muted/50 transition-all duration-150 active:scale-90"
            title="Remove from playlist"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

const RecentTab = memo(function RecentTab({ audio }: { audio: ReturnType<typeof useAudio> }) {
  const entries = useStore(historyStore, s => s.entries);
  const { playlist, handleSelectSong } = audio;

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
        <Music className="w-7 h-7 text-muted-foreground/25" />
        <p className="text-[13px] font-sans text-muted-foreground/60">No recent plays yet</p>
        <p className="text-[11px] font-sans text-muted-foreground/40 leading-relaxed max-w-[220px]">
          Songs you listen to for at least 30&nbsp;seconds will appear here.
        </p>
      </div>
    );
  }

  // Tap a recent entry → if its song is still in the current playlist, jump to
  // it; otherwise gracefully no-op (the song may have been removed).
  const handlePick = (songId: string) => {
    const idx = playlist.findIndex(s => s.id === songId);
    if (idx >= 0) handleSelectSong(idx);
  };

  return (
    <div className="flex flex-col gap-0.5 px-3 pb-6">
      <div className="flex items-center justify-between px-3 py-1 mb-1">
        <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">
          Last {entries.length}
        </span>
        <button
          onClick={historyActions.clear}
          className="text-[10px] font-sans text-muted-foreground/60 hover:text-destructive transition-colors duration-150 active:scale-95"
        >
          Clear
        </button>
      </div>

      {entries.map(entry => {
        const stillInPlaylist = playlist.some(s => s.id === entry.songId);
        return (
          <div
            key={entry.songId}
            onClick={() => handlePick(entry.songId)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 group',
              stillInPlaylist
                ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60'
                : 'opacity-60 cursor-default',
            )}
            title={stillInPlaylist ? '' : 'No longer in playlist'}
          >
            <div className={cn('w-9 h-9 rounded-md shrink-0 bg-gradient-to-br relative overflow-hidden', entry.gradient)}>
              {entry.isUploaded ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music className="w-4 h-4 text-white/55" />
                </div>
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-foreground/90 group-hover:text-foreground">
                {entry.title}
              </p>
              <p className="text-[11px] font-sans text-muted-foreground truncate">
                {entry.artist} · {formatRelativeTime(entry.playedAt)}
              </p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); historyActions.remove(entry.songId); }}
              className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-muted/50 transition-all duration-150 active:scale-90"
              title="Remove from history"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
});

/**
 * Compact relative-time formatter: "just now", "5m", "2h", "3d", or fallback
 * to a short date. Avoids pulling in date-fns since this is the only consumer.
 */
function formatRelativeTime(ts: number): string {
  const sec = Math.max(0, (Date.now() - ts) / 1000);
  if (sec < 60)        return 'just now';
  if (sec < 3600)      return `${Math.floor(sec / 60)}m`;
  if (sec < 86400)     return `${Math.floor(sec / 3600)}h`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d`;
  return new Date(ts).toLocaleDateString();
}

/* ── FullScreenPlayer entry ─────────────────────────────────────────────── */

export const FullScreenPlayer = memo(function FullScreenPlayer() {
  const audio = useAudio();
  const {
    currentSong, isPlaying, isShuffle, isRepeat, volume,
    progressPct, displayTime, displayDuration,
    handlePlayPause, handleNext, handlePrev, handleSeek, handleVolume,
    toggleMute, startDrag, stopDrag,
    handleUploadClick, toggleShuffle, toggleRepeat,
    fileInputRef, handleFileChange,
  } = audio;

  const [tab, setTab] = useState<TabKey>('queue');

  const accentHsl = getAccentHsl(currentSong?.gradient);
  const rootStyle = {
    '--song-accent': accentHsl ?? 'var(--primary)',
  } as React.CSSProperties;

  // Top-bar swipe-down also dismisses, so the user has multiple ways out.
  const topSwipe = useSwipe({
    onSwipeDown: () => uiActions.closeFullscreenPlayer(),
    thresholdY: 50,
    horizontalOnly: false,
  });

  // Body click on backdrop does nothing — only explicit close.
  const close = useCallback(() => uiActions.closeFullscreenPlayer(), []);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-background animate-in fade-in slide-in-from-bottom-8 duration-300"
      style={rootStyle}
    >
      {/* Hidden re-mount of file input so Upload action in this view works. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Backdrop tint */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, hsl(var(--song-accent) / 0.18) 0%, transparent 60%)',
        }}
      />

      {/* Top bar — swipe down here to close. */}
      <div
        onPointerDown={topSwipe.onPointerDown}
        onPointerMove={topSwipe.onPointerMove}
        onPointerUp={topSwipe.onPointerUp}
        onPointerCancel={topSwipe.onPointerCancel}
        className="relative z-10 flex items-center justify-between px-5 pt-5 pb-3 shrink-0 select-none"
      >
        <button
          onClick={close}
          aria-label="Close full-screen player"
          className={cn(BTN_ICON, 'w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50')}
        >
          <ChevronDown className="w-5 h-5" />
        </button>
        <span className="text-[10px] font-sans tracking-[0.18em] uppercase text-muted-foreground/60">
          Now Playing
        </span>
        <button
          onClick={handleUploadClick}
          aria-label="Upload music"
          className={cn(BTN_ICON, 'w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-muted/50')}
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      {/* Cover */}
      <div className="relative z-10 flex flex-col items-center pt-4 pb-6 px-6">
        <Cover
          song={currentSong}
          isPlaying={isPlaying}
          onPrev={handlePrev}
          onNext={handleNext}
          onClose={close}
        />

        <div className="mt-7 text-center max-w-full px-4">
          <p className="text-[20px] font-serif font-medium text-foreground truncate">
            {currentSong?.title ?? '—'}
          </p>
          <p className="text-[13px] font-sans text-muted-foreground mt-1 truncate">
            {currentSong?.artist ?? ''}
          </p>
        </div>
      </div>

      {/* Seek + transport + volume */}
      <div className="relative z-10 px-8 shrink-0">
        <Slider
          value={[progressPct]}
          max={100}
          step={0.1}
          onValueChange={handleSeek}
          onPointerDown={startDrag}
          onPointerUp={stopDrag}
        />
        <div className="flex justify-between text-[11px] font-sans text-muted-foreground mt-1.5 mb-4 tabular-nums">
          <span>{displayTime}</span>
          <span>{displayDuration}</span>
        </div>

        <div className="flex items-center justify-center gap-6 mb-4">
          <button
            onClick={toggleShuffle}
            title="Shuffle"
            className={cn(BTN_BASE, isShuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrev}
            title="Previous"
            className={cn(BTN_BASE, 'text-foreground/80 hover:text-foreground')}
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </button>
          <button
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-14 h-14 rounded-full text-primary-foreground flex items-center justify-center shadow-lg transition-all duration-150 hover:scale-105 active:scale-90"
            style={{ background: 'hsl(var(--song-accent))' }}
          >
            {isPlaying
              ? <Pause className="w-5 h-5 fill-current" />
              : <Play  className="w-5 h-5 fill-current ml-0.5" />}
          </button>
          <button
            onClick={handleNext}
            title="Next"
            className={cn(BTN_BASE, 'text-foreground/80 hover:text-foreground')}
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </button>
          <button
            onClick={toggleRepeat}
            title="Repeat"
            className={cn(BTN_BASE, isRepeat ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={toggleMute}
            title={volume === 0 ? 'Unmute' : 'Mute'}
            className={cn(BTN_BASE, 'text-muted-foreground/70 hover:text-foreground shrink-0')}
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            className="flex-1"
            onValueChange={handleVolume}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="relative z-10 mt-3 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-center gap-1 px-5 shrink-0">
          <div className="flex bg-muted/40 rounded-full p-0.5">
            <TabBtn id="queue" active={tab === 'queue'} onClick={() => setTab('queue')}>
              <ListMusic className="w-3.5 h-3.5" /> Queue
            </TabBtn>
            <TabBtn id="recent" active={tab === 'recent'} onClick={() => setTab('recent')}>
              Recent
            </TabBtn>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain mt-3">
          {tab === 'queue' ? <QueueTab audio={audio} /> : <RecentTab audio={audio} />}
        </div>
      </div>
    </div>
  );
});

/* ── Helpers ───────────────────────────────────────────────────────────── */

function TabBtn({
  id, active, onClick, children,
}: {
  id: TabKey;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      aria-controls={`fsplayer-tab-${id}`}
      className={cn(
        'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-sans transition-all duration-150 active:scale-95',
        active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
