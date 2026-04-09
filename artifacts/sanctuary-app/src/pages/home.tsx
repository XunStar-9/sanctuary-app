import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX,
  PenLine, Search, Plus, ListMusic, ArrowLeft, Upload, Music, Trash2, SlidersHorizontal, X, Settings, Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Settings types & constants ───────────────────────────────────────────────

type ThemeId     = 'warm' | 'ink' | 'forest' | 'dusk' | 'stone';
type FontSize    = 'sm' | 'md' | 'lg';
type LineHeight  = 'tight' | 'normal' | 'relaxed';
type EditorFont  = 'serif' | 'sans';

const THEMES: { id: ThemeId; label: string; color: string }[] = [
  { id: 'warm',   label: '暖沙', color: '#C4937A' },
  { id: 'ink',    label: '墨白', color: '#4A6080' },
  { id: 'forest', label: '林间', color: '#4A7A5C' },
  { id: 'dusk',   label: '暮色', color: '#7A5CA0' },
  { id: 'stone',  label: '石砚', color: '#555555' },
];

const FONT_SIZE_MAP: Record<FontSize, string>   = { sm: 'text-base', md: 'text-lg', lg: 'text-xl' };
const LINE_HEIGHT_MAP: Record<LineHeight, string> = { tight: 'leading-[1.8]', normal: 'leading-[2.2]', relaxed: 'leading-[2.8]' };

// ─── Settings Panel ────────────────────────────────────────────────────────────

type SettingsProps = {
  open: boolean;
  onClose: () => void;
  theme: ThemeId;       onTheme: (v: ThemeId) => void;
  fontSize: FontSize;   onFontSize: (v: FontSize) => void;
  lineHeight: LineHeight; onLineHeight: (v: LineHeight) => void;
  editorFont: EditorFont; onEditorFont: (v: EditorFont) => void;
};

function SettingsPanel({ open, onClose, theme, onTheme, fontSize, onFontSize, lineHeight, onLineHeight, editorFont, onEditorFont }: SettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <p className="text-[10px] font-sans font-medium tracking-[0.15em] uppercase text-muted-foreground mb-3">{title}</p>
      {children}
    </div>
  );

  const OptionRow = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick}
      className={cn(
        "flex-1 py-2 rounded-xl text-sm font-sans transition-all duration-150 border",
        active
          ? "bg-primary text-primary-foreground border-transparent shadow-sm"
          : "bg-muted/50 text-foreground/70 border-transparent hover:bg-muted hover:text-foreground"
      )}>
      {label}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 h-full z-50 w-72 bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60 shrink-0">
          <span className="text-sm font-medium text-foreground tracking-wide">设置</span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-5">

            {/* Theme */}
            <Section title="主题配色">
              <div className="flex flex-col gap-1.5">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => onTheme(t.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-sans w-full text-left",
                      theme === t.id ? "bg-muted" : "hover:bg-muted/60"
                    )}>
                    <span className="w-5 h-5 rounded-full shrink-0 transition-all" style={{
                      backgroundColor: t.color,
                      boxShadow: theme === t.id ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${t.color}` : 'none'
                    }} />
                    <span className={cn("transition-colors", theme === t.id ? "text-foreground font-medium" : "text-foreground/70")}>{t.label}</span>
                    {theme === t.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </Section>

            {/* Font size */}
            <Section title="字号大小">
              <div className="flex gap-2">
                <OptionRow label="小" active={fontSize === 'sm'} onClick={() => onFontSize('sm')} />
                <OptionRow label="中" active={fontSize === 'md'} onClick={() => onFontSize('md')} />
                <OptionRow label="大" active={fontSize === 'lg'} onClick={() => onFontSize('lg')} />
              </div>
            </Section>

            {/* Line height */}
            <Section title="行间距">
              <div className="flex gap-2">
                <OptionRow label="紧凑" active={lineHeight === 'tight'}   onClick={() => onLineHeight('tight')} />
                <OptionRow label="舒适" active={lineHeight === 'normal'}  onClick={() => onLineHeight('normal')} />
                <OptionRow label="宽松" active={lineHeight === 'relaxed'} onClick={() => onLineHeight('relaxed')} />
              </div>
            </Section>

            {/* Editor font */}
            <Section title="编辑器字体">
              <div className="flex gap-2">
                <button onClick={() => onEditorFont('serif')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm border transition-all duration-150",
                    editorFont === 'serif'
                      ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                      : "bg-muted/50 text-foreground/70 border-transparent hover:bg-muted"
                  )}>
                  <span className="font-serif block">衬线体</span>
                  <span className="text-[10px] opacity-60 block mt-0.5">Playfair</span>
                </button>
                <button onClick={() => onEditorFont('sans')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm border transition-all duration-150",
                    editorFont === 'sans'
                      ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                      : "bg-muted/50 text-foreground/70 border-transparent hover:bg-muted"
                  )}>
                  <span className="font-sans block">无衬线</span>
                  <span className="text-[10px] opacity-60 block mt-0.5">Inter</span>
                </button>
              </div>
            </Section>

          </div>
        </ScrollArea>
      </div>
    </>
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme,      setTheme]      = useState<ThemeId>(    () => (localStorage.getItem('sanctuary_theme')       as ThemeId)      ?? 'warm');
  const [fontSize,   setFontSize]   = useState<FontSize>(   () => (localStorage.getItem('sanctuary_fontsize')    as FontSize)     ?? 'md');
  const [lineHeight, setLineHeight] = useState<LineHeight>(  () => (localStorage.getItem('sanctuary_lineheight')  as LineHeight)   ?? 'normal');
  const [editorFont, setEditorFont] = useState<EditorFont>(  () => (localStorage.getItem('sanctuary_editorfont')  as EditorFont)   ?? 'serif');

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('sanctuary_theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('sanctuary_fontsize',   fontSize);   }, [fontSize]);
  useEffect(() => { localStorage.setItem('sanctuary_lineheight', lineHeight); }, [lineHeight]);
  useEffect(() => { localStorage.setItem('sanctuary_editorfont', editorFont); }, [editorFont]);

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  };

  const updateActiveNote = (updates: Partial<Note>) => {
    if (!activeNote) return;
    setNotes(notes.map(n => n.id === activeNote.id ? { ...n, ...updates } : n));
  };

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-[100dvh] bg-background text-foreground font-serif selection:bg-primary/20 flex overflow-hidden">

      {/* ── Sidebar backdrop (click to close on mobile) ── */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-black/15 backdrop-blur-[2px] md:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* ── Slide-in Sidebar ── */}
      <aside className={cn(
        "fixed md:relative left-0 top-0 bottom-0 z-40 flex flex-col",
        "w-[300px] bg-card/80 backdrop-blur-2xl border-r border-border/40",
        "transition-transform duration-300 ease-in-out shrink-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:-translate-x-full"
      )}>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleFileChange} />

        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
          <span className="text-xs font-sans tracking-[0.2em] uppercase text-muted-foreground/50 select-none">Sanctuary</span>
          <button onClick={() => setSidebarOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ── Notes section ── */}
          <div className="px-5 mb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Notes</span>
              <button onClick={handleAddNote}
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
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="px-3 flex flex-col gap-0.5 mb-4">
            {filteredNotes.map(note => (
              <button key={note.id}
                onClick={() => { setActiveNoteId(note.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
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

          {/* Divider */}
          <div className="mx-5 border-t border-border/30 mb-4" />

          {/* ── Music section ── */}
          <div className="px-5 mb-3">
            <span className="text-[10px] font-sans tracking-[0.15em] uppercase text-muted-foreground/60">Music</span>
          </div>

          {/* Mini player */}
          <div className="px-5 mb-4">
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

            <Slider value={[progressPct()]} max={100} step={0.1}
              className="mb-1 [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5"
              onValueChange={handleSeek}
              onPointerDown={() => setIsDragging(true)}
              onPointerUp={() => setIsDragging(false)} />
            <div className="flex justify-between text-[10px] font-sans text-muted-foreground mb-3">
              <span>{displayTime()}</span>
              <span>{displayDuration()}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setIsShuffle(p => !p)}
                className={cn("transition-colors", isShuffle ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button onClick={handlePrev} className="text-foreground/70 hover:text-foreground transition-colors">
                <SkipBack className="w-4 h-4 fill-current" />
              </button>
              <button onClick={handlePlayPause}
                className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button onClick={handleNext} className="text-foreground/70 hover:text-foreground transition-colors">
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
              <button onClick={() => setIsRepeat(p => !p)}
                className={cn("transition-colors", isRepeat ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Playlist */}
          <div className="px-3 flex flex-col gap-0.5 pb-4">
            {playlist.map((song, idx) => (
              <button key={song.id} onClick={() => handleSelectSong(idx)}
                className={cn(
                  "flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl transition-colors group",
                  currentSongIndex === idx ? "bg-white/50 dark:bg-white/10" : "hover:bg-muted/40"
                )}>
                <div className={cn("w-7 h-7 rounded-md shrink-0 bg-gradient-to-br relative overflow-hidden", song.gradient)}>
                  {currentSongIndex === idx && isPlaying && (
                    <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1">
                      <div className="w-0.5 bg-white/80 animate-pulse" style={{ height: '8px', animationDelay: '0ms' }} />
                      <div className="w-0.5 bg-white/80 animate-pulse" style={{ height: '12px', animationDelay: '150ms' }} />
                      <div className="w-0.5 bg-white/80 animate-pulse" style={{ height: '8px', animationDelay: '300ms' }} />
                    </div>
                  )}
                  {song.isUploaded && !(currentSongIndex === idx && isPlaying) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music className="w-3 h-3 text-white/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-medium truncate", currentSongIndex === idx ? "text-foreground" : "text-foreground/70 group-hover:text-foreground")}>{song.title}</p>
                  <p className="text-[11px] font-sans text-muted-foreground truncate">{song.artist}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-sans text-muted-foreground">{song.duration}</span>
                  {song.isUploaded && (
                    <button onClick={e => handleRemoveSong(e, song.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-destructive transition-all ml-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </button>
            ))}
            <button onClick={handleUploadClick}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground/70 hover:text-foreground hover:bg-muted/40 transition-colors w-full text-left mt-1">
              <Upload className="w-3.5 h-3.5" />
              <span className="text-[13px] font-sans">Upload music</span>
            </button>
          </div>
        </div>

        {/* ── Settings corner ── */}
        <div className="px-5 py-4 border-t border-border/20 shrink-0">
          <button onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <Settings className="w-3.5 h-3.5" />
            <span className="text-[11px] font-sans tracking-wide">Settings</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-[100dvh]">

        {/* Top bar */}
        <div className="flex items-center h-14 px-5 border-b border-border/30 shrink-0 bg-background/60 backdrop-blur-xl gap-3">
          <button onClick={() => setSidebarOpen(p => !p)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
            <Menu className="w-4 h-4" />
          </button>
          <span className="text-sm font-sans text-muted-foreground/60 truncate select-none tracking-wide">
            {activeNote?.title || 'Sanctuary'}
          </span>
          {isPlaying && (
            <div className="ml-auto flex items-center gap-1.5 text-muted-foreground/50 shrink-0">
              <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              <span className="text-[11px] font-sans truncate max-w-[120px]">{currentSong?.title}</span>
            </div>
          )}
        </div>

        {/* Note editor */}
        <div className="flex-1 overflow-y-auto">
          {activeNote ? (
            <div className="max-w-2xl mx-auto px-8 md:px-16 pt-14 pb-16">
              <input type="text" value={activeNote.title}
                onChange={e => updateActiveNote({ title: e.target.value })}
                className="w-full text-3xl md:text-4xl font-serif font-medium bg-transparent border-none outline-none mb-5 text-foreground placeholder-muted-foreground/40 focus:ring-0"
                placeholder="Note Title" />
              <p className="text-sm text-muted-foreground font-sans tracking-wide mb-10 flex items-center gap-2">
                <PenLine className="w-3 h-3" />{activeNote.date}
              </p>
              <textarea value={activeNote.content}
                onChange={e => updateActiveNote({ content: e.target.value, preview: e.target.value.substring(0, 80) + '...' })}
                className={cn(
                  "w-full min-h-[60vh] resize-none bg-transparent border-none outline-none text-foreground/80 placeholder-muted-foreground/30 focus:ring-0",
                  FONT_SIZE_MAP[fontSize],
                  LINE_HEIGHT_MAP[lineHeight],
                  editorFont === 'serif' ? 'font-serif' : 'font-sans'
                )}
                placeholder="Start writing..." />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
              <p className="text-muted-foreground/50 font-sans text-sm">Open the sidebar to select or create a note</p>
              <button onClick={() => setSidebarOpen(true)}
                className="text-xs font-sans text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1.5">
                <Menu className="w-3.5 h-3.5" /> Open sidebar
              </button>
            </div>
          )}
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        theme={theme}       onTheme={setTheme}
        fontSize={fontSize} onFontSize={setFontSize}
        lineHeight={lineHeight} onLineHeight={setLineHeight}
        editorFont={editorFont} onEditorFont={setEditorFont}
      />
    </div>
  );
}
