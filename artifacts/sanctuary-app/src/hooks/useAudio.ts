/**
 * useAudio — thin React binding for the AudioEngine singleton.
 *
 * Provides two levels of subscription:
 *  - `useAudio()` — full snapshot (use sparingly, causes re-render on every timeupdate)
 *  - `useAudioControls()` — stable actions + file input ref only (never triggers re-render)
 *
 * For components that only need a subset of audio state, subscribe directly via
 * `useSyncExternalStore(audioEngine.subscribe, selector)`.
 */

import { useRef, useCallback, useSyncExternalStore } from 'react';
import { audioEngine, type AudioSnapshot } from '@/stores/audioEngine';

/* ── Actions-only hook (zero re-renders from audio state changes) ────────── */

export function useAudioControls() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) audioEngine.uploadFiles(files);
    e.target.value = '';
  }, []);

  const handleRemoveSong = useCallback((e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    audioEngine.removeSong(songId);
  }, []);

  const handleSeek   = useCallback((val: number[]) => audioEngine.seek(val[0]),      []);
  const handleVolume = useCallback((val: number[]) => audioEngine.setVolume(val[0]), []);

  return {
    fileInputRef,
    handleUploadClick,
    handleFileChange,
    handleRemoveSong,
    handlePlayPause:  audioEngine.playPause,
    handleNext:       audioEngine.next,
    handlePrev:       audioEngine.prev,
    handleSelectSong: audioEngine.selectSong,
    handleSeek,
    handleVolume,
    toggleMute:       audioEngine.toggleMute,
    startDrag:        audioEngine.startDrag,
    stopDrag:         audioEngine.stopDrag,
    toggleShuffle:    audioEngine.toggleShuffle,
    toggleRepeat:     audioEngine.toggleRepeat,
  };
}

/* ── Targeted snapshot selectors ─────────────────────────────────────────── */

/**
 * Use a custom selector on the audio engine snapshot. Only re-renders when
 * the selected value changes (Object.is comparison).
 */
export function useAudioSelector<T>(selector: (snap: AudioSnapshot) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const lastRef = useRef<{ value: T } | null>(null);

  return useSyncExternalStore(
    audioEngine.subscribe,
    () => {
      const snap = audioEngine.getSnapshot();
      const value = selectorRef.current(snap);
      const last = lastRef.current;
      if (last && Object.is(last.value, value)) return last.value;
      lastRef.current = { value };
      return value;
    },
    () => {
      const snap = audioEngine.getSnapshot();
      return selectorRef.current(snap);
    },
  );
}

/* ── Full snapshot hook (legacy — prefer targeted selectors) ─────────────── */

export function useAudio() {
  const snap = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot, audioEngine.getSnapshot);
  const controls = useAudioControls();

  return {
    /* state */
    playlist:         snap.playlist,
    currentSong:      snap.currentSong,
    currentSongIndex: snap.currentSongIndex,
    isPlaying:        snap.isPlaying,
    isShuffle:        snap.isShuffle,
    isRepeat:         snap.isRepeat,
    volume:           snap.volume,
    progressPct:      snap.progressPct,
    displayTime:      snap.displayTime,
    displayDuration:  snap.displayDuration,
    /* controls */
    ...controls,
  };
}
