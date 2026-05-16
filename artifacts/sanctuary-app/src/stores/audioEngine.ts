/**
 * AudioEngine — framework-free wrapper around <audio>.
 *
 * Old design: 350-line `useAudio` hook that mixed React state, refs, an
 * HTMLAudioElement, retry logic, and IndexedDB. Hard to reason about.
 *
 * New design: a plain TS class owns all mutable state and the audio element.
 * It exposes `subscribe(listener)` for the React layer (and any other consumer)
 * to read the latest snapshot. The `useAudio` hook is then ~30 lines.
 *
 * Behaviour preserved from the original:
 *  - Default playlist (one entry, no `src`) + uploaded songs from IndexedDB.
 *  - Shuffle / repeat / volume mute toggle.
 *  - Pointer-drag-aware seek (don't update UI from `timeupdate` while dragging).
 *  - Retry on transient audio errors (max 3 attempts, exponential-ish backoff).
 *  - Auto-advance on `ended` (or repeat the current track).
 *  - Persist uploaded playlist meta to localStorage; binaries to IndexedDB.
 *  - Discard `pause` events fired during a src swap.
 */

import type { Song } from '@/lib/types';
import { DEFAULT_PLAYLIST, GRADIENTS } from '@/lib/types';
import {
  saveAudioFile, loadAudioFile, removeAudioFile,
  savePlaylistMeta, loadPlaylistMeta,
} from '@/lib/audioStorage';

const MAX_RETRY = 3;
const RETRY_BASE_MS = 1000;
const META_DEBOUNCE = 500;

function secsToString(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function parseFileMeta(file: File, index: number): Omit<Song, 'durationSecs' | 'duration'> {
  const raw = file.name.replace(/\.[^.]+$/, '');
  const dashIdx = raw.indexOf(' - ');
  const artist = dashIdx !== -1 ? raw.substring(0, dashIdx).trim() : 'Unknown Artist';
  const title  = dashIdx !== -1 ? raw.substring(dashIdx + 3).trim() : raw;
  return {
    id: `uploaded-${Date.now()}-${index}`,
    title, artist,
    gradient: GRADIENTS[(index + Math.floor(Date.now() / 1000)) % GRADIENTS.length],
    src: URL.createObjectURL(file),
    isUploaded: true,
  };
}

function shufflePick(prev: number, len: number): number {
  if (len <= 1) return 0;
  const n = Math.floor(Math.random() * (len - 1));
  return n >= prev ? n + 1 : n;
}

export type AudioSnapshot = {
  playlist: Song[];
  currentSongIndex: number;
  currentSong: Song | undefined;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isDragging: boolean;
  /* derived */
  progressPct: number;
  displayTime: string;
  displayDuration: string;
};

type Listener = (snap: AudioSnapshot) => void;

export class AudioEngine {
  private el: HTMLAudioElement;
  private listeners = new Set<Listener>();
  private snapshot!: AudioSnapshot;
  private wantPlay = false;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private metaTimer: ReturnType<typeof setTimeout> | null = null;
  private prevVolume = 1;
  private rafId = 0;
  private lastReportedTime = 0;

  /* mutable state — kept off the React side */
  private playlist: Song[];
  private currentSongIndex = 0;
  private isPlaying = false;
  private isShuffle = false;
  private isRepeat = false;
  private volume = 1;
  private currentTime = 0;
  private duration = 0;
  private isDragging = false;

  constructor() {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.volume = 1;

    // Build initial playlist: defaults + persisted meta (binaries hydrated async).
    const savedMeta = loadPlaylistMeta();
    this.playlist = savedMeta.length
      ? [...DEFAULT_PLAYLIST, ...savedMeta.map(s => ({ ...s, src: undefined as string | undefined }))]
      : DEFAULT_PLAYLIST;
    this.duration = this.playlist[0]?.durationSecs ?? 0;

    this.computeSnapshot();
    this.bindAudioEvents();
    this.loadAudioBlobs();
  }

  /* ── Subscription ──────────────────────────────────────────────────── */

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  getSnapshot = (): AudioSnapshot => this.snapshot;

  private notify() {
    this.computeSnapshot();
    for (const l of this.listeners) l(this.snapshot);
  }

  private computeSnapshot() {
    const song = this.playlist[this.currentSongIndex];
    const dur = song?.src && this.duration > 0 ? this.duration : (song?.durationSecs ?? 0);
    this.snapshot = {
      playlist: this.playlist,
      currentSongIndex: this.currentSongIndex,
      currentSong: song,
      isPlaying: this.isPlaying,
      isShuffle: this.isShuffle,
      isRepeat: this.isRepeat,
      volume: this.volume,
      currentTime: this.currentTime,
      duration: this.duration,
      isDragging: this.isDragging,
      progressPct: dur ? (this.currentTime / dur) * 100 : 0,
      displayTime: secsToString(this.currentTime),
      displayDuration: song?.src && this.duration > 0
        ? secsToString(this.duration)
        : (song?.duration ?? '0:00'),
    };
  }

  /* ── Persistence ───────────────────────────────────────────────────── */

  private async loadAudioBlobs() {
    const meta = loadPlaylistMeta();
    if (!meta.length) return;
    const restored: Song[] = [];
    for (const m of meta) {
      const blobUrl = await loadAudioFile(m.id);
      restored.push({ ...m, src: blobUrl ?? undefined });
    }
    // Re-run on each notify: keep defaults, replace uploaded entries.
    const defaults = this.playlist.filter(s => !s.isUploaded);
    this.playlist = [...defaults, ...restored];
    this.notify();
  }

  private schedulePersistMeta() {
    if (this.metaTimer) clearTimeout(this.metaTimer);
    this.metaTimer = setTimeout(() => {
      const uploaded = this.playlist.filter(s => s.isUploaded);
      savePlaylistMeta(uploaded.map(s => ({
        id: s.id, title: s.title, artist: s.artist,
        duration: s.duration, durationSecs: s.durationSecs,
        gradient: s.gradient, isUploaded: true as const,
      })));
    }, META_DEBOUNCE);
  }

  /* ── <audio> wiring ────────────────────────────────────────────────── */

  private clearRetry() {
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
  }

  private safePlay() {
    const p = this.el.play();
    if (!p) return;
    p.catch((err: DOMException) => {
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') return;
      if (this.retryCount < MAX_RETRY && this.wantPlay) {
        this.retryCount += 1;
        this.clearRetry();
        this.retryTimer = setTimeout(() => {
          if (this.wantPlay) this.safePlay();
        }, RETRY_BASE_MS * this.retryCount);
      }
    });
  }

  private bindAudioEvents() {
    const el = this.el;

    el.addEventListener('timeupdate', () => {
      if (this.isDragging) return;
      const t = el.currentTime;
      if (Math.abs(t - this.lastReportedTime) < 0.25) return;
      cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        this.lastReportedTime = t;
        this.currentTime = t;
        this.notify();
      });
    });

    el.addEventListener('durationchange', () => {
      if (!isFinite(el.duration)) return;
      const d = el.duration;
      this.duration = d;
      const idx = this.currentSongIndex;
      const song = this.playlist[idx];
      if (song && (song.durationSecs === 0 || song.duration === '--:--')) {
        this.playlist = this.playlist.map((s, i) =>
          i === idx ? { ...s, durationSecs: d, duration: secsToString(d) } : s,
        );
        this.schedulePersistMeta();
      }
      this.notify();
    });

    el.addEventListener('play', () => {
      this.retryCount = 0;
      this.isPlaying = true;
      this.notify();
    });

    el.addEventListener('pause', () => {
      // During src swap the browser fires pause+empty; ignore that transient.
      if (el.src === '' || el.src === window.location.href) return;
      this.isPlaying = false;
      this.notify();
    });

    el.addEventListener('ended', () => {
      const len = this.playlist.length;
      if (!len) return;
      if (this.isRepeat) {
        el.currentTime = 0;
        this.safePlay();
        return;
      }
      this.wantPlay = true;
      this.isPlaying = true;
      this.advance(this.isShuffle ? shufflePick(this.currentSongIndex, len) : (this.currentSongIndex + 1) % len);
    });

    el.addEventListener('error', () => {
      if (!this.wantPlay) return;
      if (this.retryCount < MAX_RETRY) {
        this.retryCount += 1;
        const savedTime = el.currentTime;
        this.clearRetry();
        this.retryTimer = setTimeout(() => {
          if (!this.wantPlay) return;
          const src = el.src;
          if (!src) return;
          el.src = src;
          el.currentTime = savedTime;
          this.safePlay();
        }, RETRY_BASE_MS * this.retryCount);
      }
    });

    el.addEventListener('stalled', () => this.scheduleResume(2000));
    el.addEventListener('waiting', () => this.scheduleResume(3000));
  }

  private scheduleResume(delay: number) {
    if (!this.wantPlay) return;
    this.clearRetry();
    this.retryTimer = setTimeout(() => {
      if (this.wantPlay && this.el.paused) this.safePlay();
    }, delay);
  }

  /** Switch to a song index — load its src and apply wantPlay intent. */
  private advance(nextIndex: number) {
    this.currentSongIndex = nextIndex;
    this.retryCount = 0;
    this.clearRetry();
    const song = this.playlist[nextIndex];
    this.currentTime = 0;
    if (song?.src) {
      this.el.src = song.src;
      this.el.load();
      this.duration = 0; // wait for durationchange
      if (this.wantPlay) this.safePlay();
    } else {
      this.el.removeAttribute('src');
      this.duration = song?.durationSecs ?? 0;
      this.wantPlay = false;
      this.isPlaying = false;
    }
    this.notify();
  }

  /* ── Public actions ────────────────────────────────────────────────── */

  playPause = () => {
    if (!this.playlist.length) return;
    const song = this.playlist[this.currentSongIndex];
    if (!song?.src) {
      // No actual audio attached — flip the UI flag only.
      this.isPlaying = !this.isPlaying;
      this.wantPlay = this.isPlaying;
      this.notify();
      return;
    }
    if (this.el.paused) {
      this.wantPlay = true;
      this.safePlay();
    } else {
      this.wantPlay = false;
      this.el.pause();
    }
  };

  next = () => {
    if (!this.playlist.length) return;
    this.wantPlay = true;
    this.isPlaying = true;
    const len = this.playlist.length;
    this.advance(this.isShuffle ? shufflePick(this.currentSongIndex, len) : (this.currentSongIndex + 1) % len);
  };

  prev = () => {
    if (!this.playlist.length) return;
    if (this.el.currentTime > 3) {
      this.el.currentTime = 0;
      this.currentTime = 0;
      this.notify();
      return;
    }
    this.wantPlay = true;
    this.isPlaying = true;
    const len = this.playlist.length;
    this.advance(this.currentSongIndex === 0 ? len - 1 : this.currentSongIndex - 1);
  };

  selectSong = (idx: number) => {
    if (idx < 0 || idx >= this.playlist.length) return;
    this.wantPlay = true;
    this.isPlaying = true;
    this.advance(idx);
  };

  seek = (pct: number) => {
    const song = this.playlist[this.currentSongIndex];
    const d = song?.src ? (this.el.duration || this.duration) : this.duration;
    const t = (pct / 100) * d;
    this.currentTime = t;
    if (song?.src && isFinite(t)) this.el.currentTime = t;
    this.notify();
  };

  setVolume = (pct: number) => {
    const v = Math.max(0, Math.min(1, pct / 100));
    if (v > 0) this.prevVolume = v;
    this.volume = v;
    this.el.volume = v;
    this.notify();
  };

  toggleMute = () => {
    if (this.volume > 0) {
      this.prevVolume = this.volume;
      this.volume = 0;
    } else {
      this.volume = this.prevVolume || 1;
    }
    this.el.volume = this.volume;
    this.notify();
  };

  toggleShuffle = () => { this.isShuffle = !this.isShuffle; this.notify(); };
  toggleRepeat  = () => { this.isRepeat  = !this.isRepeat;  this.notify(); };
  startDrag     = () => { this.isDragging = true;  this.notify(); };
  stopDrag      = () => { this.isDragging = false; this.notify(); };

  uploadFiles = (files: File[]) => {
    if (!files.length) return;
    const newSongs: Song[] = files.map((f, i) => ({
      ...parseFileMeta(f, i),
      durationSecs: 0,
      duration: '--:--',
    }));
    files.forEach((f, i) => { saveAudioFile(newSongs[i].id, f).catch(() => {}); });
    const wasLen = this.playlist.length;
    this.playlist = [...this.playlist, ...newSongs];
    this.wantPlay = true;
    this.isPlaying = true;
    this.schedulePersistMeta();
    this.advance(wasLen); // jump to first new song
  };

  removeSong = (songId: string) => {
    const removeIdx = this.playlist.findIndex(s => s.id === songId);
    if (removeIdx === -1) return;
    const removed = this.playlist[removeIdx];
    if (removed.isUploaded) {
      if (removed.src) URL.revokeObjectURL(removed.src);
      removeAudioFile(songId).catch(() => {});
    }
    const next = this.playlist.filter(s => s.id !== songId);
    this.playlist = next;

    if (!next.length) {
      this.currentSongIndex = 0;
      this.wantPlay = false;
      this.isPlaying = false;
      this.el.pause();
      this.el.removeAttribute('src');
      this.schedulePersistMeta();
      this.notify();
      return;
    }
    if (removeIdx < this.currentSongIndex) {
      this.currentSongIndex -= 1;
    } else if (removeIdx === this.currentSongIndex) {
      // Pause and stay on the same numerical index (now showing the next song).
      this.wantPlay = false;
      this.isPlaying = false;
      this.currentSongIndex = Math.min(this.currentSongIndex, next.length - 1);
      const song = this.playlist[this.currentSongIndex];
      if (song?.src) {
        this.el.src = song.src;
        this.el.load();
      } else {
        this.el.removeAttribute('src');
      }
      this.duration = song?.durationSecs ?? 0;
      this.currentTime = 0;
    }
    this.schedulePersistMeta();
    this.notify();
  };

  /* ── Cleanup (for HMR / future use) ────────────────────────────────── */

  destroy() {
    this.clearRetry();
    if (this.metaTimer) clearTimeout(this.metaTimer);
    cancelAnimationFrame(this.rafId);
    this.el.pause();
    this.el.src = '';
    this.listeners.clear();
  }
}

/* Singleton — created once for the lifetime of the app. */
export const audioEngine = new AudioEngine();
