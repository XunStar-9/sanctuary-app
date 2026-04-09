import { useState, useEffect, useRef, useCallback } from 'react';
import type { Song } from '@/lib/types';
import { DEFAULT_PLAYLIST, GRADIENTS } from '@/lib/types';

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

export function useAudio() {
  const [playlist,          setPlaylist]          = useState<Song[]>(DEFAULT_PLAYLIST);
  const [currentSongIndex,  setCurrentSongIndex]  = useState(0);
  const [isPlaying,         setIsPlaying]         = useState(false);
  const [isShuffle,         setIsShuffle]         = useState(false);
  const [isRepeat,          setIsRepeat]          = useState(false);
  const [currentTime,       setCurrentTime]       = useState(0);
  const [duration,          setDuration]          = useState(0);
  const [isDragging,        setIsDragging]        = useState(false);

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const shuffleNext = useCallback((prev: number, len: number) => {
    const n = Math.floor(Math.random() * len);
    return n === prev ? (n + 1) % len : n;
  }, []);

  // Use refs for event handler closures so they always see the latest values
  const isShuffleRef = useRef(isShuffle);
  const isRepeatRef  = useRef(isRepeat);
  const playlistRef  = useRef(playlist);
  useEffect(() => { isShuffleRef.current = isShuffle;  }, [isShuffle]);
  useEffect(() => { isRepeatRef.current  = isRepeat;   }, [isRepeat]);
  useEffect(() => { playlistRef.current  = playlist;   }, [playlist]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate     = () => { if (!isDragging) setCurrentTime(audio.currentTime); };
    const onDurationChange = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onPlay  = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      // Use refs to avoid stale closures
      if (isRepeatRef.current) { audio.currentTime = 0; audio.play(); return; }
      const len = playlistRef.current.length;
      setCurrentSongIndex(prev =>
        isShuffleRef.current ? shuffleNext(prev, len) : (prev + 1) % len
      );
    };

    audio.addEventListener('timeupdate',     onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play',           onPlay);
    audio.addEventListener('pause',          onPause);
    audio.addEventListener('ended',          onEnded);

    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play',           onPlay);
      audio.removeEventListener('pause',          onPause);
      audio.removeEventListener('ended',          onEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const song = playlist[currentSongIndex];
    if (song?.src) {
      audio.src = song.src;
      setCurrentTime(0);
      setDuration(0);
      if (isPlaying) audio.play().catch(() => {});
    } else {
      audio.removeAttribute('src');
      setCurrentTime(0);
      setDuration(song?.durationSecs ?? 0);
    }
  }, [currentSongIndex, playlist]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playlist[currentSongIndex]?.src) return;
    if (isPlaying) audio.play().catch(() => {});
    else           audio.pause();
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSong = playlist[currentSongIndex] ?? playlist[0];

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (!playlist[currentSongIndex]?.src) { setIsPlaying(p => !p); return; }
    if (audioRef.current.paused) audioRef.current.play().catch(() => {});
    else                         audioRef.current.pause();
  }, [currentSongIndex, playlist]);

  const handleNext = useCallback(() => {
    setIsPlaying(true);
    setCurrentSongIndex(p =>
      isShuffle ? shuffleNext(p, playlist.length) : (p + 1) % playlist.length
    );
  }, [isShuffle, playlist.length, shuffleNext]);

  const handlePrev = useCallback(() => {
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

  const handleSeek = useCallback((val: number[]) => {
    const song = playlistRef.current[currentSongIndex];
    const d = song?.src ? (audioRef.current?.duration ?? duration) : duration;
    const t = (val[0] / 100) * d;
    setCurrentTime(t);
    if (audioRef.current && song?.src) audioRef.current.currentTime = t;
  }, [currentSongIndex, duration]);

  const progressPct = useCallback((): number => {
    const d = currentSong?.src ? duration : (currentSong?.durationSecs ?? 0);
    return d ? (currentTime / d) * 100 : 0;
  }, [currentSong, currentTime, duration]);

  const displayTime     = useCallback(() => secsToString(currentTime), [currentTime]);
  const displayDuration = useCallback(() => {
    if (currentSong?.src && duration > 0) return secsToString(duration);
    return currentSong?.duration ?? '0:00';
  }, [currentSong, duration]);

  const handleUploadClick = useCallback(() => fileInputRef.current?.click(), []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newSongs: Song[] = files.map((f, i) => ({ ...parseFileMeta(f, i), durationSecs: 0, duration: '--:--' }));
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
      const next = prev.filter(s => s.id !== songId);
      if (!next.length) {
        setCurrentSongIndex(0);
        setIsPlaying(false);
        return DEFAULT_PLAYLIST;
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

  return {
    playlist, currentSong, currentSongIndex,
    isPlaying, isShuffle, isRepeat, currentTime, duration, isDragging,
    audioRef, fileInputRef,
    setIsDragging,
    handlePlayPause, handleNext, handlePrev, handleSelectSong,
    handleSeek, progressPct, displayTime, displayDuration,
    handleUploadClick, handleFileChange, handleRemoveSong,
    toggleShuffle, toggleRepeat,
  };
}
