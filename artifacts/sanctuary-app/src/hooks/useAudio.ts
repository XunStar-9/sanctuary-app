/**
 * useAudio — thin React binding for the AudioEngine singleton.
 *
 * Three flavors:
 *  - `useAudioControls()` — stable actions only, never re-renders.
 *  - `useAudioSelector(fn)` — subscribes to a single derived value.
 *  - `useAudio()` — full snapshot (re-renders on every timeupdate ~4×/sec —
 *    avoid where possible, prefer the targeted hooks above).
 *
 * The Upload button uses a global file-picker (`triggerAudioUpload`) rather
 * than a per-mount `<input>` ref so multiple mount points (sidebar dock,
 * playlist panel, fullscreen player) all work.
 */

import { useRef, useCallback, useSyncExternalStore } from 'react';
import { audioEngine, type AudioSnapshot } from '@/stores/audioEngine';
import { triggerAudioUpload } from '@/lib/audioUpload';

/* ── Actions-only hook (zero re-renders from audio state changes) ────────── */

export function useAudioControls() {
  const handleRemoveSong = useCallback((e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    audioEngine.removeSong(songId);
  }, []);

  // Slider components emit `number[]` (single-thumb), normalize here.
  const handleSeek   = useCallback((val: number[]) => audioEngine.seek(val[0]),      []);
  const handleVolume = useCallback((val: number[]) => audioEngine.setVolume(val[0]), []);

  return {
    handleUploadClick: triggerAudioUpload,
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
 * Subscribe to a derived value of the audio snapshot. Re-renders only when
 * the selector output changes (Object.is comparison). Selectors don't need
 * to be stable references — we track the latest via a ref.
 */
export function useAudioSelector<T>(selector: (snap: AudioSnapshot) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const lastRef = useRef<{ value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const snap = audioEngine.getSnapshot();
    const value = selectorRef.current(snap);
    const last = lastRef.current;
    if (last && Object.is(last.value, value)) return last.value;
    lastRef.current = { value };
    return value;
  }, []);

  return useSyncExternalStore(audioEngine.subscribe, getSnapshot, getSnapshot);
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
