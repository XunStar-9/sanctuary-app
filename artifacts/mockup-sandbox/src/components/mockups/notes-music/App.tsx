import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX,
  PenLine, Search, Plus, ListMusic, Upload, Music, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ───────────────────────────────────────────────────────────────────

type Note = {
  id: string;
  title: string;
  date: string;
  preview: string;
  content: string;
};

type Song = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSecs: number;
  gradient: string;
  src?: string;
  isUploaded?: boolean;
};

const GRADIENTS = [
  'from-violet-200 to-purple-100',
  'from-pink-200 to-rose-100',
  'from-sky-200 to-cyan-100',
  'from-amber-200 to-yellow-100',
  'from-emerald-200 to-teal-100',
  'from-indigo-200 to-blue-100',
  'from-orange-200 to-red-100',
];

// ─── Default data ─────────────────────────────────────────────────────────────

const DEFAULT_NOTES: Note[] = [
  {
    id: '1', title: 'Morning thoughts', date: 'Today, 8:42 AM',
    preview: 'Woke up early before the city started making noise. The light is hitting...',
    content: 'Woke up early before the city started making noise. The light is hitting the floorboards perfectly right now. I made a cup of pour-over coffee, the good beans I got last weekend.\n\nI want to focus today on just being present. Not rushing to the next task, not mentally living in the future. Just existing in the current moment. The air feels crisp and there is a kind of stillness that I want to carry with me throughout the day.'
  },
  {
    id: '2', title: "Things I'm grateful for", date: 'Yesterday, 9:15 PM',
    preview: 'Small moments that made the week feel a bit lighter. The sudden rain on...',
    content: 'Small moments that made the week feel a bit lighter.\n\n- The sudden rain on Tuesday that smelled like wet earth and washed the pavement clean.\n- Finding an old book I forgot I owned, with notes in the margins from myself three years ago.\n- A friend reaching out just to say they were thinking of me.\n- The perfect soft-boiled egg.\n- Quiet evenings like this, where the only sound is the low hum of the refrigerator and a slow song playing.'
  },
  {
    id: '3', title: 'Book recommendations', date: 'Oct 12, 11:30 AM',
    preview: 'A running list of things I need to read. 1. The Poetics of Space...',
    content: 'A running list of things I need to read.\n\n1. The Poetics of Space — Gaston Bachelard\n2. Bluets — Maggie Nelson\n3. The Year of Magical Thinking — Joan Didion\n4. Braiding Sweetgrass — Robin Wall Kimmerer\n\nI need to start setting aside 30 minutes before bed to actually read instead of scrolling. The glow of the screen is ruining my sleep, but physical paper feels grounding.'
  },
  {
    id: '4', title: 'Weekend plans', date: 'Oct 10, 2:00 PM',
    preview: 'Nothing big. I just want to walk down to the lake, pick up some fresh...',
    content: 'Nothing big. I just want to walk down to the lake, pick up some fresh bread from the bakery, and maybe reorganize my desk.\n\nSunday: Do absolutely nothing. Maybe repot the monstera that is getting entirely too large for its corner.'
  },
  {
    id: '5', title: 'To the future me', date: 'Sep 28, 11:55 PM',
    preview: 'Are you still worrying about the things that feel so heavy right now? I hope...',
    content: "Are you still worrying about the things that feel so heavy right now? I hope you've learned to let go of the need to control every outcome.\n\nI hope you are softer. I hope you are kinder to yourself. I hope you still make time for slow mornings and good music."
  }
];

const DEFAULT_PLAYLIST: Song[] = [
  { id: 's1', title: 'Bloom', artist: 'Gracie Abrams', duration: '3:42', durationSecs: 222, gradient: 'from-rose-200 to-amber-100' },
  { id: 's2', title: 'Suitcase', artist: 'Mt. Wolf', duration: '4:15', durationSecs: 255, gradient: 'from-slate-300 to-stone-400' },
  { id: 's3', title: 'Motion Sickness', artist: 'Phoebe Bridgers', duration: '3:34', durationSecs: 214, gradient: 'from-blue-200 to-indigo-300' },
  { id: 's4', title: 'Ribs', artist: 'Lorde', duration: '3:51', durationSecs: 231, gradient: 'from-teal-100 to-emerald-200' },
  { id: 's5', title: 'Holocene', artist: 'Bon Iver', duration: '5:37', durationSecs: 337, gradient: 'from-orange-100 to-yellow-200' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function secsToString(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function parseFileMeta(file: File, index: number): Omit<Song, 'durationSecs' | 'duration'> {
  const raw = file.name.replace(/\.[^.]+$/, '');
  const dashIdx = raw.indexOf(' - ');
  let title = raw, artist = 'Unknown Artist';
  if (dashIdx !== -1) { artist = raw.substring(0, dashIdx).trim(); title = raw.substring(dashIdx + 3).trim(); }
  return {
    id: `uploaded-${Date.now()}-${index}`, title, artist,
    gradient: GRADIENTS[(index + Math.floor(Date.now() / 1000)) % GRADIENTS.length],
    src: URL.createObjectURL(file), isUploaded: true,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    try { const s = localStorage.getItem('sanctuary_notes_mockup'); return s ? JSON.parse(s) : DEFAULT_NOTES; }
    catch { return DEFAULT_NOTES; }
  });

  const [playlist, setPlaylist] = useState<Song[]>(DEFAULT_PLAYLIST);
  const [activeNoteId, setActiveNoteId] = useState<string>(DEFAULT_NOTES[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  // isDragging tracks seek-bar interaction; use ref (not state) so the audio
  // timeupdate handler — registered once with [] deps — always reads the live value.
  const [isDraggingState, setIsDraggingState] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentSong = playlist[currentSongIndex] ?? playlist[0];

  // Refs that mirror state so stale-closure event listeners always see current values
  const isRepeatRef = useRef(false);
  const isShuffleRef = useRef(false);
  const playlistLengthRef = useRef(playlist.length);
  const isDraggingRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { playlistLengthRef.current = playlist.length; }, [playlist.length]);

  // ── Audio engine ──────────────────────────────────────────────────────────

  const handleAutoNext = useCallback(() => {
    const len = playlistLengthRef.current;
    setCurrentSongIndex(prev =>
      isShuffleRef.current
        ? (() => { const n = Math.floor(Math.random() * len); return n === prev ? (n + 1) % len : n; })()
        : (prev + 1) % len
    );
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    // Use refs so these handlers always read the latest state without stale closures
    const onTimeUpdate = () => { if (!isDraggingRef.current) setCurrentTime(audio.currentTime); };
    const onDurationChange = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onEnded = () => {
      if (isRepeatRef.current) { audio.currentTime = 0; audio.play().catch(() => {}); return; }
      handleAutoNext();
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.volume = volume / 100;
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      audioRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    const song = playlist[currentSongIndex];
    if (song?.src) { audio.src = song.src; setCurrentTime(0); setDuration(0); if (isPlaying) audio.play().catch(() => {}); }
    else { audio.removeAttribute('src'); setCurrentTime(0); setDuration(song?.durationSecs ?? 0); }
  }, [currentSongIndex, playlist]);

  useEffect(() => {
    const audio = audioRef.current; if (!audio || !currentSong?.src) return;
    if (isPlaying) audio.play().catch(() => {}); else audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
    try { localStorage.setItem('sanctuary_notes_mockup', JSON.stringify(notes)); } catch {}
  }, [notes]);

  // ── Controls ──────────────────────────────────────────────────────────────

  const handlePlayPause = () => {
    if (!currentSong?.src) { setIsPlaying(p => !p); return; }
    if (audioRef.current?.paused) audioRef.current.play().catch(() => {}); else audioRef.current?.pause();
  };

  const handleNext = () => {
    setIsPlaying(true);
    setCurrentSongIndex(p => isShuffle
      ? (() => { const n = Math.floor(Math.random() * playlist.length); return n === p ? (n + 1) % playlist.length : n; })()
      : (p + 1) % playlist.length);
  };

  const handlePrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    setIsPlaying(true);
    setCurrentSongIndex(p => p === 0 ? playlist.length - 1 : p - 1);
  };

  const handleSelectSong = (idx: number) => { setCurrentSongIndex(idx); setIsPlaying(true); };

  const handleSeek = (val: number[]) => {
    const d = currentSong?.src ? (audioRef.current?.duration ?? duration) : duration;
    const t = (val[0] / 100) * d;
    setCurrentTime(t);
    if (audioRef.current && currentSong?.src) audioRef.current.currentTime = t;
  };

  const progressPct = () => {
    const d = currentSong?.src ? duration : (currentSong?.durationSecs ?? 0);
    return d ? (currentTime / d) * 100 : 0;
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newSongs: Song[] = files.map((f, i) => ({ ...parseFileMeta(f, i), durationSecs: 0, duration: '--:--' }));
    // Use the functional updater so we read the latest playlist length, not a stale closure value
    setPlaylist(prev => {
      setCurrentSongIndex(prev.length); // index of the first newly added song
      return [...prev, ...newSongs];
    });
    setIsPlaying(true);
    e.target.value = '';
  };

  const handleRemoveSong = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    setPlaylist(prev => {
      const target = prev.find(s => s.id === songId);
      // Revoke the object URL to free memory
      if (target?.src) URL.revokeObjectURL(target.src);
      const next = prev.filter(s => s.id !== songId);
      return next.length ? next : DEFAULT_PLAYLIST;
    });
    setCurrentSongIndex(0);
    setIsPlaying(false);
  };

  // ── Notes ─────────────────────────────────────────────────────────────────

  const activeNote = notes.find(n => n.id === activeNoteId) ?? notes[0] ?? null;

  const handleAddNote = () => {
    const n: Note = {
      id: Date.now().toString(), title: 'New Note',
      date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date()),
      preview: '', content: ''
    };
    setNotes(prev => [n, ...prev]);
    setActiveNoteId(n.id);
  };

  const activeNoteId_ref = useRef(activeNoteId);
  useEffect(() => { activeNoteId_ref.current = activeNoteId; }, [activeNoteId]);

  const updateActiveNote = useCallback((updates: Partial<Note>) => {
    const id = activeNoteId_ref.current;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 md:p-8 font-serif selection:bg-primary/20">
      <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFileChange} />

      <div className="w-full max-w-[1400px] h-[90vh] min-h-[700px] bg-white/40 dark:bg-black/20 backdrop-blur-3xl rounded-[2rem] border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden flex flex-row">

        {/* LEFT: NOTES */}
        <div className="flex-1 flex flex-col h-full bg-card/60 min-w-0">

          <div className="h-20 flex items-center justify-between px-8 border-b border-border/40 shrink-0 gap-4">
            <div className="flex items-center flex-1 max-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
              <Input className="pl-9 h-9 bg-muted/50 border-none rounded-full text-sm font-sans focus-visible:ring-1" placeholder="Search notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <h1 className="text-sm font-medium tracking-widest uppercase text-muted-foreground">Sanctuary</h1>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80 text-primary shrink-0" onClick={handleAddNote}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Notes sidebar */}
            <div className="w-80 border-r border-border/40 flex flex-col shrink-0 bg-secondary/20 h-full">
              <ScrollArea className="flex-1 h-full">
                <div className="p-4 flex flex-col gap-2">
                  {filteredNotes.map(note => (
                    <button key={note.id} onClick={() => setActiveNoteId(note.id)}
                      className={cn("w-full text-left p-4 rounded-xl transition-all duration-200 border text-sm",
                        activeNoteId === note.id ? "bg-white/80 dark:bg-white/5 border-primary/20 shadow-sm" : "bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-white/5")}>
                      <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{note.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2 font-sans tracking-wide">{note.date}</p>
                      <p className="text-muted-foreground line-clamp-2 leading-relaxed text-[13px]">{note.preview || note.content.substring(0, 60)}</p>
                    </button>
                  ))}
                  {filteredNotes.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm font-sans">No notes found.</div>}
                </div>
              </ScrollArea>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col p-12 overflow-y-auto h-full">
              {activeNote ? (
                <div className="max-w-2xl mx-auto w-full mt-4 h-full flex flex-col">
                  <input type="text" value={activeNote.title} onChange={e => updateActiveNote({ title: e.target.value })}
                    className="w-full text-4xl font-serif font-medium bg-transparent border-none outline-none mb-6 text-foreground placeholder-muted-foreground/50 focus:ring-0" placeholder="Note Title" />
                  <p className="text-sm text-muted-foreground font-sans tracking-wide mb-12 flex items-center gap-2">
                    <PenLine className="w-3 h-3" />{activeNote.date}
                  </p>
                  <textarea value={activeNote.content}
                    onChange={e => {
                      const text = e.target.value;
                      // Only append '...' when content actually exceeds the preview length
                      const preview = text.length > 80 ? text.substring(0, 80) + '...' : text;
                      updateActiveNote({ content: text, preview });
                    }}
                    className="w-full flex-1 resize-none bg-transparent border-none outline-none text-foreground/80 leading-[2.2] text-lg font-serif placeholder-muted-foreground/30 focus:ring-0"
                    placeholder="Start writing..." />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-sm">Select a note or create a new one</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: MUSIC PLAYER */}
        <div className="w-[380px] lg:w-[420px] h-full bg-secondary/40 border-l border-border/40 flex flex-col shrink-0">

          <div className="px-8 pt-8 pb-4 flex flex-col items-center shrink-0">
            {/* Album art */}
            <div className="w-64 h-64 rounded-2xl shadow-xl overflow-hidden mb-6 relative">
              <div className={cn("w-full h-full bg-gradient-to-br transition-all duration-1000", currentSong?.gradient)}>
                {currentSong?.isUploaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="w-10 h-10 text-white/40" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/5 rounded-full scale-[1.5] border-[0.5px] border-white/10 opacity-50 mix-blend-overlay pointer-events-none" />
            </div>

            {/* Song info */}
            <div className="text-center mb-6 w-full">
              <h2 className="text-2xl font-serif font-medium mb-1 truncate px-4">{currentSong?.title}</h2>
              <p className="text-muted-foreground font-sans text-sm tracking-wide">{currentSong?.artist}</p>
            </div>

            {/* Progress */}
            <div className="w-full mb-6 px-2">
              <Slider value={[progressPct()]} max={100} step={0.1}
                className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                onValueChange={handleSeek}
                onPointerDown={() => { isDraggingRef.current = true; setIsDraggingState(true); }}
                onPointerUp={() => { isDraggingRef.current = false; setIsDraggingState(false); }}
              />
              <div className="flex justify-between items-center mt-2 text-[11px] font-sans tracking-wider text-muted-foreground">
                <span>{secsToString(currentTime)}</span>
                <span>{currentSong?.src && duration > 0 ? secsToString(duration) : (currentSong?.duration ?? '0:00')}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-5 mb-4 w-full">
              <Button variant="ghost" size="icon" onClick={() => setIsShuffle(p => !p)}
                className={cn("transition-colors", isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Shuffle className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/40 rounded-full w-10 h-10" onClick={handlePrev}>
                <SkipBack className="w-5 h-5 fill-current" />
              </Button>
              <Button variant="default" size="icon"
                className="w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handlePlayPause}>
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </Button>
              <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/40 rounded-full w-10 h-10" onClick={handleNext}>
                <SkipForward className="w-5 h-5 fill-current" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsRepeat(p => !p)}
                className={cn("transition-colors", isRepeat ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Repeat className="w-4 h-4" />
              </Button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 w-full px-6 mt-2">
              <button onClick={() => setIsMuted(p => !p)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <Slider value={[isMuted ? 0 : volume]} max={100} step={1}
                className="w-full [&_[role=slider]]:h-2 [&_[role=slider]]:w-2"
                onValueChange={val => { setVolume(val[0]); setIsMuted(false); }} />
            </div>
          </div>

          {/* Playlist */}
          <div className="px-5 pb-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2 text-xs font-sans tracking-widest uppercase text-muted-foreground">
                <ListMusic className="w-3.5 h-3.5" />
                Up Next
              </div>
              <Button variant="ghost" size="sm"
                className="h-7 px-2.5 text-xs font-sans text-muted-foreground hover:text-primary gap-1.5 rounded-full hover:bg-primary/10"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3 h-3" />
                Upload music
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-1 pb-4">
                {playlist.map((song, idx) => (
                  <button key={song.id} onClick={() => handleSelectSong(idx)}
                    className={cn("flex items-center justify-between p-3 rounded-xl transition-colors w-full text-left group",
                      currentSongIndex === idx ? "bg-white/50 dark:bg-white/10" : "hover:bg-white/30 dark:hover:bg-white/5")}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                      <div className={cn("w-9 h-9 rounded-md shrink-0 bg-gradient-to-br flex items-center justify-center relative", song.gradient)}>
                        {currentSongIndex === idx && isPlaying ? (
                          <div className="w-3 h-3 flex items-end justify-between gap-0.5">
                            <div className="w-0.5 bg-white/80 animate-pulse h-full" style={{ animationDelay: '0ms' }} />
                            <div className="w-0.5 bg-white/80 animate-pulse h-2/3" style={{ animationDelay: '150ms' }} />
                            <div className="w-0.5 bg-white/80 animate-pulse h-full" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : song.isUploaded ? (
                          <Music className="w-3.5 h-3.5 text-white/60" />
                        ) : null}
                      </div>
                      <div className="truncate flex-1 min-w-0">
                        <p className={cn("text-sm font-medium truncate mb-0.5", currentSongIndex === idx ? "text-foreground" : "text-foreground/80 group-hover:text-foreground")}>{song.title}</p>
                        <p className="text-xs font-sans text-muted-foreground truncate">{song.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span className="text-xs font-sans text-muted-foreground">{song.duration}</span>
                      {song.isUploaded && (
                        <button onClick={e => handleRemoveSong(e, song.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all ml-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}
