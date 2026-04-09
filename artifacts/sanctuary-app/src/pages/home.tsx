import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX,
  PenLine, Search, Plus, ListMusic, ArrowLeft, Upload, Music, Trash2, Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Themes ──────────────────────────────────────────────────────────────────

type ThemeId = 'warm' | 'ink' | 'forest' | 'dusk' | 'stone';

const THEMES: { id: ThemeId; label: string; color: string }[] = [
  { id: 'warm',   label: '暖沙', color: '#C4937A' },
  { id: 'ink',    label: '墨白', color: '#4A6080' },
  { id: 'forest', label: '林间', color: '#4A7A5C' },
  { id: 'dusk',   label: '暮色', color: '#7A5CA0' },
  { id: 'stone',  label: '石砚', color: '#555555' },
];

function ThemePicker({ theme, onChange }: { theme: ThemeId; onChange: (t: ThemeId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          open ? "bg-muted" : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
        )}
        title="切换主题"
      >
        <Palette className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 bg-card border border-border rounded-2xl shadow-lg p-3 flex flex-col gap-2.5 min-w-[120px]">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              className={cn(
                "flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors text-sm font-sans w-full text-left",
                theme === t.id ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 ring-offset-background transition-all"
                style={{ backgroundColor: t.color, boxShadow: theme === t.id ? `0 0 0 2px ${t.color}55, 0 0 0 3px hsl(var(--background))` : 'none' }}
              />
              <span className="text-foreground/80">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

type MobileView = 'notes-list' | 'note-editor' | 'player';

// ─── Gradients pool for uploaded songs ───────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function secsToString(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function parseFileMeta(file: File, index: number): Omit<Song, 'durationSecs' | 'duration'> {
  const raw = file.name.replace(/\.[^.]+$/, '');
  const dashIdx = raw.indexOf(' - ');
  let title = raw;
  let artist = 'Unknown Artist';
  if (dashIdx !== -1) {
    artist = raw.substring(0, dashIdx).trim();
    title = raw.substring(dashIdx + 3).trim();
  }
  return {
    id: `uploaded-${Date.now()}-${index}`,
    title,
    artist,
    gradient: GRADIENTS[(index + Math.floor(Date.now() / 1000)) % GRADIENTS.length],
    src: URL.createObjectURL(file),
    isUploaded: true,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Home() {
  const [theme, setTheme] = useState<ThemeId>(() => {
    return (localStorage.getItem('sanctuary_theme') as ThemeId) ?? 'warm';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sanctuary_theme', theme);
  }, [theme]);

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('sanctuary_notes');
    if (saved) { try { return JSON.parse(saved); } catch { return DEFAULT_NOTES; } }
    return DEFAULT_NOTES;
  });

  const [playlist, setPlaylist] = useState<Song[]>(DEFAULT_PLAYLIST);
  const [activeNoteId, setActiveNoteId] = useState<string>(notes[0]?.id ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>('notes-list');
  const [mobileTab, setMobileTab] = useState<'notes' | 'player'>('notes');
  const [isDragging, setIsDragging] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentSong = playlist[currentSongIndex] ?? playlist[0];

  // ── Audio engine ──────────────────────────────────────────────────────────

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => { if (!isDragging) setCurrentTime(audio.currentTime); };
    const onDurationChange = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onEnded = () => {
      if (isRepeat) { audio.currentTime = 0; audio.play(); return; }
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
  }, []);

  const handleAutoNext = useCallback(() => {
    setCurrentSongIndex(prev => {
      if (isShuffle) {
        const next = Math.floor(Math.random() * playlist.length);
        return next === prev ? (next + 1) % playlist.length : next;
      }
      return (prev + 1) % playlist.length;
    });
  }, [isShuffle, playlist.length]);

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
  }, [currentSongIndex, playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentSong?.src) return;
    if (isPlaying) { audio.play().catch(() => {}); }
    else { audio.pause(); }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // ── Playback controls ──────────────────────────────────────────────────────

  const handlePlayPause = () => {
    if (!currentSong?.src) { setIsPlaying(p => !p); return; }
    if (audioRef.current?.paused) { audioRef.current.play().catch(() => {}); }
    else { audioRef.current?.pause(); }
  };

  const handleNext = () => {
    setIsPlaying(true);
    setCurrentSongIndex(p => isShuffle
      ? (() => { const n = Math.floor(Math.random() * playlist.length); return n === p ? (n + 1) % playlist.length : n; })()
      : (p + 1) % playlist.length
    );
  };

  const handlePrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setIsPlaying(true);
    setCurrentSongIndex(p => p === 0 ? playlist.length - 1 : p - 1);
  };

  const handleSelectSong = (idx: number) => {
    setCurrentSongIndex(idx);
    setIsPlaying(true);
  };

  const handleSeek = (val: number[]) => {
    const pct = val[0];
    const d = currentSong?.src ? (audioRef.current?.duration ?? duration) : duration;
    const t = (pct / 100) * d;
    setCurrentTime(t);
    if (audioRef.current && currentSong?.src) { audioRef.current.currentTime = t; }
  };

  const progressPct = () => {
    const d = currentSong?.src ? duration : (currentSong?.durationSecs ?? 0);
    if (!d) return 0;
    return (currentTime / d) * 100;
  };

  const displayTime = () => secsToString(currentTime);
  const displayDuration = () => {
    if (currentSong?.src && duration > 0) return secsToString(duration);
    return currentSong?.duration ?? '0:00';
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newSongs: Song[] = files.map((f, i) => {
      const meta = parseFileMeta(f, i);
      return { ...meta, durationSecs: 0, duration: '--:--' };
    });
    setPlaylist(prev => [...prev, ...newSongs]);
    const firstNewIdx = playlist.length;
    setCurrentSongIndex(firstNewIdx);
    setIsPlaying(true);
    e.target.value = '';
  };

  const handleRemoveSong = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    setPlaylist(prev => {
      const next = prev.filter(s => s.id !== songId);
      if (next.length === 0) return DEFAULT_PLAYLIST;
      return next;
    });
    setCurrentSongIndex(0);
    setIsPlaying(false);
  };

  // ── Notes ─────────────────────────────────────────────────────────────────

  useEffect(() => { localStorage.setItem('sanctuary_notes', JSON.stringify(notes)); }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId) ?? notes[0] ?? null;

  const handleAddNote = () => {
    const n: Note = {
      id: Date.now().toString(), title: 'New Note',
      date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date()),
      preview: '', content: ''
    };
    setNotes([n, ...notes]);
    setActiveNoteId(n.id);
    setMobileView('note-editor');
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    if (!activeNote) return;
    setNotes(notes.map(n => n.id === activeNote.id ? { ...n, ...updates } : n));
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectNote = (id: string) => { setActiveNoteId(id); setMobileView('note-editor'); };

  // ── Sub-components ────────────────────────────────────────────────────────

  const NotesList = (
    <div className="flex flex-col h-full">
      <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b border-border/40 shrink-0 gap-3">
        <div className="flex items-center flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
          <Input className="pl-9 h-9 bg-muted/50 border-none rounded-full text-sm font-sans focus-visible:ring-1" placeholder="Search notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <span className="text-xs font-sans tracking-widest uppercase text-muted-foreground hidden md:block select-none">Notes</span>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80 text-primary" onClick={handleAddNote}>
            <Plus className="w-4 h-4" />
          </Button>
          <ThemePicker theme={theme} onChange={setTheme} />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 md:p-4 flex flex-col gap-2">
          {filteredNotes.map(note => (
            <button key={note.id} onClick={() => handleSelectNote(note.id)}
              className={cn("w-full text-left p-4 rounded-xl transition-all duration-200 border text-sm",
                activeNoteId === note.id ? "bg-white/80 dark:bg-white/5 border-primary/20 shadow-sm" : "bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-white/5")}>
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{note.title}</h3>
              <p className="text-xs text-muted-foreground mb-1.5 font-sans tracking-wide">{note.date}</p>
              <p className="text-muted-foreground line-clamp-2 leading-relaxed text-[13px]">{note.preview || note.content.substring(0, 60)}</p>
            </button>
          ))}
          {filteredNotes.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm font-sans">No notes found.</div>}
        </div>
      </ScrollArea>
    </div>
  );

  const NoteEditor = (
    <div className="flex flex-col h-full">
      <div className="h-16 md:h-20 flex items-center px-4 md:px-8 border-b border-border/40 shrink-0 gap-3">
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80 text-muted-foreground md:hidden shrink-0" onClick={() => setMobileView('notes-list')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-sans tracking-widest uppercase text-muted-foreground truncate">{activeNote?.title || 'Note'}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        {activeNote ? (
          <div className="max-w-2xl mx-auto w-full">
            <input type="text" value={activeNote.title} onChange={e => updateActiveNote({ title: e.target.value })}
              className="w-full text-3xl md:text-4xl font-serif font-medium bg-transparent border-none outline-none mb-4 text-foreground placeholder-muted-foreground/50 focus:ring-0" placeholder="Note Title" />
            <p className="text-sm text-muted-foreground font-sans tracking-wide mb-8 flex items-center gap-2">
              <PenLine className="w-3 h-3" />{activeNote.date}
            </p>
            <textarea value={activeNote.content}
              onChange={e => updateActiveNote({ content: e.target.value, preview: e.target.value.substring(0, 80) + '...' })}
              className="w-full min-h-[50vh] resize-none bg-transparent border-none outline-none text-foreground/80 leading-[2.2] text-lg font-serif placeholder-muted-foreground/30 focus:ring-0"
              placeholder="Start writing..." />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-sm">Select a note or create a new one</div>
        )}
      </div>
    </div>
  );

  const MusicPlayer = (
    <div className="flex flex-col h-full">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFileChange} />

      {/* Player header */}
      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 flex flex-col items-center shrink-0">

        {/* Album art */}
        <div className="w-48 h-48 md:w-60 md:h-60 rounded-2xl shadow-xl overflow-hidden mb-5 relative">
          {currentSong ? (
            <div className={cn("w-full h-full bg-gradient-to-br transition-all duration-1000", currentSong.gradient)}>
              {currentSong.isUploaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Music className="w-10 h-10 text-white/40" />
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Music className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Song info + upload trigger */}
        <div className="text-center mb-5 w-full relative">
          <h2 className="text-xl md:text-2xl font-serif font-medium mb-1 truncate px-8">{currentSong?.title ?? 'No song'}</h2>
          <p className="text-muted-foreground font-sans text-sm tracking-wide">{currentSong?.artist ?? ''}</p>
        </div>

        {/* Progress */}
        <div className="w-full mb-5 px-2">
          <Slider value={[progressPct()]} max={100} step={0.1}
            className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            onValueChange={handleSeek}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
          />
          <div className="flex justify-between items-center mt-2 text-[11px] font-sans tracking-wider text-muted-foreground">
            <span>{displayTime()}</span>
            <span>{displayDuration()}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-4 w-full">
          <Button variant="ghost" size="icon" onClick={() => setIsShuffle(p => !p)}
            className={cn("transition-colors", isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <Shuffle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/40 dark:hover:bg-white/10 rounded-full w-10 h-10" onClick={handlePrev}>
            <SkipBack className="w-5 h-5 fill-current" />
          </Button>
          <Button variant="default" size="icon"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handlePlayPause}>
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/40 dark:hover:bg-white/10 rounded-full w-10 h-10" onClick={handleNext}>
            <SkipForward className="w-5 h-5 fill-current" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsRepeat(p => !p)}
            className={cn("transition-colors", isRepeat ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <Repeat className="w-4 h-4" />
          </Button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 w-full px-6">
          <button onClick={() => setIsMuted(p => !p)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <Slider value={[isMuted ? 0 : volume]} max={100} step={1}
            className="w-full [&_[role=slider]]:h-2 [&_[role=slider]]:w-2"
            onValueChange={val => { setVolume(val[0]); setIsMuted(false); }} />
        </div>
      </div>

      {/* Playlist */}
      <div className="px-4 md:px-5 pb-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2 text-xs font-sans tracking-widest uppercase text-muted-foreground">
            <ListMusic className="w-3.5 h-3.5" />
            Up Next
          </div>
          <Button variant="ghost" size="sm"
            className="h-7 px-2.5 text-xs font-sans text-muted-foreground hover:text-primary gap-1.5 rounded-full hover:bg-primary/10"
            onClick={handleUploadClick}>
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
                  <div className={cn("w-9 h-9 rounded-md shrink-0 bg-gradient-to-br flex items-center justify-center relative overflow-hidden", song.gradient)}>
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
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-serif selection:bg-primary/20">

      {/* ── DESKTOP (md+) ───────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center justify-center p-8 min-h-[100dvh]">
        <div className="w-full max-w-[1400px] h-[90vh] min-h-[700px] bg-white/40 dark:bg-black/20 backdrop-blur-3xl rounded-[2rem] border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden flex flex-row">

          {/* Notes area */}
          <div className="flex-1 flex flex-col h-full bg-card/60 min-w-0">
            <div className="h-20 flex items-center justify-between px-8 border-b border-border/40 shrink-0 gap-4">
              <div className="flex items-center flex-1 max-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                <Input className="pl-9 h-9 bg-muted/50 border-none rounded-full text-sm font-sans focus-visible:ring-1" placeholder="Search notes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <h1 className="text-sm font-medium tracking-widest uppercase text-muted-foreground">Sanctuary</h1>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80 text-primary" onClick={handleAddNote}>
                  <Plus className="w-4 h-4" />
                </Button>
                <ThemePicker theme={theme} onChange={setTheme} />
              </div>
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
                      onChange={e => updateActiveNote({ content: e.target.value, preview: e.target.value.substring(0, 80) + '...' })}
                      className="w-full flex-1 resize-none bg-transparent border-none outline-none text-foreground/80 leading-[2.2] text-lg font-serif placeholder-muted-foreground/30 focus:ring-0"
                      placeholder="Start writing..." />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-sm">Select a note or create a new one</div>
                )}
              </div>
            </div>
          </div>

          {/* Music player */}
          <div className="w-[380px] lg:w-[420px] h-full bg-secondary/40 border-l border-border/40 flex flex-col shrink-0">
            {MusicPlayer}
          </div>
        </div>
      </div>

      {/* ── MOBILE (< md) ───────────────────────────────────────────────────── */}
      <div className="flex md:hidden flex-col h-[100dvh]">
        <div className="flex-1 overflow-hidden bg-card/60">
          {mobileTab === 'notes' && (mobileView === 'note-editor' ? NoteEditor : NotesList)}
          {mobileTab === 'player' && (
            <div className="h-full overflow-y-auto bg-secondary/40">{MusicPlayer}</div>
          )}
        </div>

        {/* Bottom tab bar */}
        <div className="shrink-0 bg-background/80 backdrop-blur-xl border-t border-border/50 flex relative">
          <button onClick={() => { setMobileTab('notes'); }}
            className={cn("flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-sans tracking-wide transition-colors",
              mobileTab === 'notes' ? "text-primary" : "text-muted-foreground")}>
            <PenLine className="w-5 h-5" />
            Notes
          </button>
          <button onClick={() => setMobileTab('player')}
            className={cn("flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-sans tracking-wide transition-colors relative",
              mobileTab === 'player' ? "text-primary" : "text-muted-foreground")}>
            <ListMusic className="w-5 h-5" />
            Music
            {isPlaying && mobileTab !== 'player' && (
              <span className="absolute top-2.5 right-8 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
