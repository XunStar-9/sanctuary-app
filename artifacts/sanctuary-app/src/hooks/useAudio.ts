/**
 * useAudio — thin React binding for the AudioEngine singleton.
 *
 * The previous file was 350+ lines mixing React state, refs, an HTMLAudioElement
 * and IndexedDB. All of that now lives in `audioEngine.ts`. This hook just:
 *  1. Subscribes to the engine for re-renders.
 *  2. Owns the `<input type="file">` ref + click handler (purely DOM).
 *  3. Exposes the engine's actions under their old names so component code
 *     keeps working unchanged.
 */

import { useRef, useCallback, useSyncExternalStore } from 'react';
import { audioEngine } from '@/stores/audioEngine';

export function useAudio() {
  const snap = useSyncExternalStore(audioEngine.subscribe, audioEngine.getSnapshot, audioEngine.getSnapshot);
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

  // Slider components emit `number[]` (single-thumb), normalize here.
  const handleSeek    = useCallback((val: number[]) => audioEngine.seek(val[0]),       []);
  const handleVolume  = useCallback((val: number[]) => audioEngine.setVolume(val[0]),  []);

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

    /* file-input plumbing */
    fileInputRef,
    handleUploadClick,
    handleFileChange,

    /* controls */
    handlePlayPause:  audioEngine.playPause,
    handleNext:       audioEngine.next,
    handlePrev:       audioEngine.prev,
    handleSelectSong: audioEngine.selectSong,
    handleSeek,
    handleVolume,
    toggleMute:       audioEngine.toggleMute,
    startDrag:        audioEngine.startDrag,
    stopDrag:         audioEngine.stopDrag,
    handleRemoveSong,
    toggleShuffle:    audioEngine.toggleShuffle,
    toggleRepeat:     audioEngine.toggleRepeat,
  };
}
