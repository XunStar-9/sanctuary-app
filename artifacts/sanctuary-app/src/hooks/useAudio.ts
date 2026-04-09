import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Song } from '@/lib/types';
import { DEFAULT_PLAYLIST, GRADIENTS } from '@/lib/types';
import {
  saveAudioFile, loadAudioFile, removeAudioFile,
  savePlaylistMeta, loadPlaylistMeta,
} from '@/lib/audioStorage';

function secsToString(s: number): string {
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

function buildInitialPlaylist(): Song[] {
  const saved = loadPlaylistMeta();
  if (saved.length) {
    return [
      ...DEFAULT_PLAYLIST,
      ...saved.map(s => ({ ...s, src: undefined })),
    ];
  }
  return DEFAULT_PLAYLIST;
}

function clearTimer(ref: React.RefObject<ReturnType<typeof setTimeout> | null>) {
  if (ref.current !== null) { clearTimeout(ref.current); ref.current = null; }
}

const MAX_RETRY = 3;
const RETRY_DELAY = 1000;

export function useAudio() {
  const [playlist,          setPlaylist]          = useState<Song[]>(buildInitialPlaylist);
  const [currentSongIndex,  setCurrentSongIndex]  = useState(0);
  const [isPlaying,         setIsPlaying]         = useState(false);
  const [isShuffle,         setIsShuffle]         = useState(false);
  const [isRepeat,          setIsRepeat]          = useState(false);
  const [currentTime,       setCurrentTime]       = useState(0);
  const [duration,          setDuration]          = useState(0);
  const [isDragging,        setIsDragging]        = useState(false);
  const [volume,            setVolume]            = useState(1);

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const shuffleNext = useCallback((prev: number, len: number) => {
    const n = Math.floor(Math.random() * len);
    return n === prev ? (n + 1) % len : n;
  }, []);

  const isShuffleRef  = useRef(isShuffle);
  const isRepeatRef   = useRef(isRepeat);
  const playlistRef   = useRef(playlist);
  const isDraggingRef = useRef(isDragging);
  const currentSongIndexRef = useRef(currentSongIndex);
  const durationRef = useRef(duration);
  const isPlayingRef = useRef(isPlaying);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  isShuffleRef.current  = isShuffle;
  isRepeatRef.current   = isRepeat;
  playlistRef.current   = playlist;
  isDraggingRef.current = isDragging;
  currentSongIndexRef.current = currentSongIndex;
  durationRef.current   = duration;
  isPlayingRef.current  = isPlaying;

  const rafId = useRef(0);

  useEffect(() => {
    const saved = loadPlaylistMeta();
    if (!saved.length) return;
    let cancelled = false;
    (async () => {
      const restored: Song[] = [];
      for (const meta of saved) {
        const blobUrl = await loadAudioFile(meta.id);
        restored.push({ ...meta, src: blobUrl ?? undefined });
      }
      if (cancelled) return;
      setPlaylist(prev => {
        const defaults = prev.filter(s => !s.isUploaded);
        return [...defaults, ...restored];
      });
    })();
    return () => { cancelled = true; };
  }, []);

  const persistTimer = useRef(0);
  useEffect(() => {
    clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      const uploaded = playlist.filter(s => s.isUploaded);
      savePlaylistMeta(
        uploaded.map(s => ({
          id: s.id, title: s.title, artist: s.artist,
          duration: s.duration, durationSecs: s.durationSecs,
          gradient: s.gradient, isUploaded: true as const,
        }))
      );
    }, 500);
    return () => clearTimeout(persistTimer.current);
  }, [playlist]);

  const safePlay = useCallback((audio: HTMLAudioElement) => {
    const p = audio.play();
    if (p) {
      p.catch((err) => {
        if (err.name === 'AbortError') return;
        if (err.name === 'NotAllowedError') return;
        if (retryCountRef.current < MAX_RETRY && isPlayingRef.current) {
          retryCountRef.current += 1;
          clearTimer(retryTimerRef);
          retryTimerRef.current = setTimeout(() => {
            if (!audioRef.current || !isPlayingRef.current) return;
            safePlay(audioRef.current);
          }, RETRY_DELAY * retryCountRef.current);
        }
      });
    }
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = volume;
    audioRef.current = audio;

    let lastReportedTime = 0;
    const onTimeUpdate = () => {
      if (isDraggingRef.current) return;
      const t = audio.currentTime;
      if (Math.abs(t - lastReportedTime) < 0.25) return;
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        lastReportedTime = t;
        setCurrentTime(t);
      });
    };
    const onDurationChange = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onPlay  = () => { retryCountRef.current = 0; setIsPlaying(true); };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      const len = playlistRef.current.length;
      if (!len) return;
      if (isRepeatRef.current) { audio.currentTime = 0; safePlay(audio); return; }
      setCurrentSongIndex(prev =>
        isShuffleRef.current ? shuffleNext(prev, len) : (prev + 1) % len
      );
    };

    const onError = () => {
      if (!isPlayingRef.current) return;
      if (retryCountRef.current < MAX_RETRY) {
        retryCountRef.current += 1;
        const savedTime = audio.currentTime;
        clearTimer(retryTimerRef);
        retryTimerRef.current = setTimeout(() => {
          if (!audioRef.current || !isPlayingRef.current) return;
          const src = audioRef.current.src;
          if (!src) return;
          audioRef.current.src = src;
          audioRef.current.currentTime = savedTime;
          safePlay(audioRef.current);
        }, RETRY_DELAY * retryCountRef.current);
      }
    };

    const onStalled = () => {
      if (!isPlayingRef.current) return;
      clearTimer(retryTimerRef);
      retryTimerRef.current = setTimeout(() => {
        if (!audioRef.current || !isPlayingRef.current) return;
        if (audioRef.current.paused) safePlay(audioRef.current);
      }, 2000);
    };

    const onWaiting = () => {
      clearTimer(retryTimerRef);
      retryTimerRef.current = setTimeout(() => {
        if (!audioRef.current || !isPlayingRef.current) return;
        if (audioRef.current.paused) safePlay(audioRef.current);
      }, 3000);
    };

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('error',          onError);
    audio.addEventListener('stalled',        onStalled);
    audio.addEventListener('waiting',        onWaiting);

    return () => {
      cancelAnimationFrame(rafId.current);
      clearTimer(retryTimerRef);
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
      audio.removeEventListener('error',          onError);
      audio.removeEventListener('stalled',        onStalled);
      audio.removeEventListener('waiting',        onWaiting);
      audio.pause();
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    retryCountRef.current = 0;
    clearTimer(retryTimerRef);
    const song = playlist[currentSongIndex];
    if (song?.src) {
      audio.src = song.src;
      audio.load();
      setCurrentTime(0);
      setDuration(0);
      if (isPlaying) safePlay(audio);
    } else {
      audio.removeAttribute('src');
      setCurrentTime(0);
      setDuration(song?.durationSecs ?? 0);
    }
  }, [currentSongIndex, playlist]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playlist[currentSongIndex]?.src) return;
    if (isPlaying) safePlay(audio);
    else           audio.pause();
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSong = useMemo(
    () => playlist[currentSongIndex] ?? playlist[0] ?? undefined,
    [playlist, currentSongIndex],
  );

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current || !playlistRef.current.length) return;
    if (!playlistRef.current[currentSongIndexRef.current]?.src) { setIsPlaying(p => !p); return; }
    if (audioRef.current.paused) safePlay(audioRef.current);
    else                         audioRef.current.pause();
  }, [safePlay]);

  const handleNext = useCallback(() => {
    if (!playlist.length) return;
    setIsPlaying(true);
    setCurrentSongIndex(p =>
      isShuffle ? shuffleNext(p, playlist.length) : (p + 1) % playlist.length
    );
  }, [isShuffle, playlist.length, shuffleNext]);

  const handlePrev = useCallback(() => {
    if (!playlist.length) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setIsPlaying(true);
    setCurrentSongIndex(p => p === 0 ? playlist.length - 1 : p - 1);
  }, [playlist.length]);

  const handleSelectSong = useCallback((idx: number) => {
    setCurrentSongIndex(idx);
    setIsPlaying(true);
  }, []);

  const prevVolumeRef = useRef(1);
  const handleVolume = useCallback((val: number[]) => {
    const v = val[0] / 100;
    if (v > 0) prevVolumeRef.current = v;
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume;
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
    } else {
      const restored = prevVolumeRef.current || 1;
      setVolume(restored);
      if (audioRef.current) audioRef.current.volume = restored;
    }
  }, [volume]);

  const handleSeek = useCallback((val: number[]) => {
    const song = playlistRef.current[currentSongIndexRef.current];
    const d = song?.src ? (audioRef.current?.duration ?? durationRef.current) : durationRef.current;
    const t = (val[0] / 100) * d;
    setCurrentTime(t);
    if (audioRef.current && song?.src) audioRef.current.currentTime = t;
  }, []);

  const progressPct = useMemo((): number => {
    const d = currentSong?.src ? duration : (currentSong?.durationSecs ?? 0);
    return d ? (currentTime / d) * 100 : 0;
  }, [currentSong, currentTime, duration]);

  const displayTime     = useMemo(() => secsToString(currentTime), [currentTime]);
  const displayDuration = useMemo(() => {
    if (currentSong?.src && duration > 0) return secsToString(duration);
    return currentSong?.duration ?? '0:00';
  }, [currentSong, duration]);

  const handleUploadClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newSongs: Song[] = files.map((f, i) => ({ ...parseFileMeta(f, i), durationSecs: 0, duration: '--:--' }));
    for (let i = 0; i < files.length; i++) {
      saveAudioFile(newSongs[i].id, files[i]).catch(() => {});
    }
    setPlaylist(prev => {
      const next = [...prev, ...newSongs];
      setCurrentSongIndex(prev.length);
      return next;
    });
    setIsPlaying(true);
    e.target.value = '';
  }, []);

  const handleRemoveSong = useCallback((e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    setPlaylist(prev => {
      const removeIdx = prev.findIndex(s => s.id === songId);
      if (removeIdx === -1) return prev;
      const removed = prev[removeIdx];
      if (removed.isUploaded) {
        if (removed.src) URL.revokeObjectURL(removed.src);
        removeAudioFile(songId).catch(() => {});
      }
      const next = prev.filter(s => s.id !== songId);
      if (!next.length) {
        setCurrentSongIndex(0);
        setIsPlaying(false);
        if (audioRef.current) { audioRef.current.pause(); audioRef.current.removeAttribute('src'); }
        return next;
      }
      setCurrentSongIndex(ci => {
        if (removeIdx < ci) return ci - 1;
        if (removeIdx === ci) {
          setIsPlaying(false);
          return Math.min(ci, next.length - 1);
        }
        return ci;
      });
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => setIsShuffle(p => !p), []);
  const toggleRepeat  = useCallback(() => setIsRepeat(p => !p),  []);
  const startDrag     = useCallback(() => setIsDragging(true),   []);
  const stopDrag      = useCallback(() => setIsDragging(false),  []);

  return {
    playlist, currentSong, currentSongIndex,
    isPlaying, isShuffle, isRepeat, volume,
    fileInputRef,
    progressPct, displayTime, displayDuration,
    handlePlayPause, handleNext, handlePrev, handleSelectSong,
    handleSeek, handleVolume, toggleMute, startDrag, stopDrag,
    handleUploadClick, handleFileChange, handleRemoveSong,
    toggleShuffle, toggleRepeat,
  };
}
