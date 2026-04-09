import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, 
  PenLine, Search, Plus, ListMusic, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

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
};

type MobileView = 'notes-list' | 'note-editor' | 'player';

const DEFAULT_NOTES: Note[] = [
  {
    id: '1',
    title: 'Morning thoughts',
    date: 'Today, 8:42 AM',
    preview: 'Woke up early before the city started making noise. The light is hitting...',
    content: 'Woke up early before the city started making noise. The light is hitting the floorboards perfectly right now. I made a cup of pour-over coffee, the good beans I got last weekend.\n\nI want to focus today on just being present. Not rushing to the next task, not mentally living in the future. Just existing in the current moment. The air feels crisp and there is a kind of stillness that I want to carry with me throughout the day.'
  },
  {
    id: '2',
    title: "Things I'm grateful for",
    date: 'Yesterday, 9:15 PM',
    preview: 'Small moments that made the week feel a bit lighter. The sudden rain on...',
    content: 'Small moments that made the week feel a bit lighter.\n\n- The sudden rain on Tuesday that smelled like wet earth and washed the pavement clean.\n- Finding an old book I forgot I owned, with notes in the margins from myself three years ago.\n- A friend reaching out just to say they were thinking of me.\n- The perfect soft-boiled egg.\n- Quiet evenings like this, where the only sound is the low hum of the refrigerator and a slow song playing.'
  },
  {
    id: '3',
    title: 'Book recommendations',
    date: 'Oct 12, 11:30 AM',
    preview: 'A running list of things I need to read. 1. The Poetics of Space...',
    content: 'A running list of things I need to read.\n\n1. The Poetics of Space — Gaston Bachelard\n2. Bluets — Maggie Nelson\n3. The Year of Magical Thinking — Joan Didion\n4. Braiding Sweetgrass — Robin Wall Kimmerer\n\nI need to start setting aside 30 minutes before bed to actually read instead of scrolling. The glow of the screen is ruining my sleep, but physical paper feels grounding.'
  },
  {
    id: '4',
    title: 'Weekend plans',
    date: 'Oct 10, 2:00 PM',
    preview: 'Nothing big. I just want to walk down to the lake, pick up some fresh...',
    content: 'Nothing big. I just want to walk down to the lake, pick up some fresh bread from the bakery, and maybe reorganize my desk.\n\nSunday: Do absolutely nothing. Maybe repot the monstera that is getting entirely too large for its corner.'
  },
  {
    id: '5',
    title: 'To the future me',
    date: 'Sep 28, 11:55 PM',
    preview: 'Are you still worrying about the things that feel so heavy right now? I hope...',
    content: "Are you still worrying about the things that feel so heavy right now? I hope you've learned to let go of the need to control every outcome.\n\nI hope you are softer. I hope you are kinder to yourself. I hope you still make time for slow mornings and good music."
  }
];

const PLAYLIST: Song[] = [
  { id: 's1', title: 'Bloom', artist: 'Gracie Abrams', duration: '3:42', durationSecs: 222, gradient: 'from-rose-200 to-amber-100' },
  { id: 's2', title: 'Suitcase', artist: 'Mt. Wolf', duration: '4:15', durationSecs: 255, gradient: 'from-slate-300 to-stone-400' },
  { id: 's3', title: 'Motion Sickness', artist: 'Phoebe Bridgers', duration: '3:34', durationSecs: 214, gradient: 'from-blue-200 to-indigo-300' },
  { id: 's4', title: 'Ribs', artist: 'Lorde', duration: '3:51', durationSecs: 231, gradient: 'from-teal-100 to-emerald-200' },
  { id: 's5', title: 'Holocene', artist: 'Bon Iver', duration: '5:37', durationSecs: 337, gradient: 'from-orange-100 to-yellow-200' }
];

export default function Home() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('sanctuary_notes');
    if (saved) { try { return JSON.parse(saved); } catch { return DEFAULT_NOTES; } }
    return DEFAULT_NOTES;
  });

  const [activeNoteId, setActiveNoteId] = useState<string>(notes.length > 0 ? notes[0].id : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [progress, setProgress] = useState(30);
  const [mobileView, setMobileView] = useState<MobileView>('notes-list');
  const [mobileTab, setMobileTab] = useState<'notes' | 'player'>('notes');

  useEffect(() => {
    localStorage.setItem('sanctuary_notes', JSON.stringify(notes));
  }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId) || (notes.length > 0 ? notes[0] : null);
  const currentSong = PLAYLIST[currentSongIndex];

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleNext = () => { setCurrentSongIndex(p => (p + 1) % PLAYLIST.length); setProgress(0); };
  const handlePrev = () => { setCurrentSongIndex(p => (p === 0 ? PLAYLIST.length - 1 : p - 1)); setProgress(0); };
  const handleSelectSong = (i: number) => { setCurrentSongIndex(i); setIsPlaying(true); setProgress(0); };

  const formatProgress = (percent: number, total: number) => {
    const s = Math.floor((percent / 100) * total);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const handleAddNote = () => {
    const n: Note = {
      id: Date.now().toString(),
      title: 'New Note',
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

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    setMobileView('note-editor');
  };

  // ─── NOTES LIST ──────────────────────────────────────────────────────────────
  const NotesList = (
    <div className="flex flex-col h-full">
      <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b border-border/40 shrink-0 gap-3">
        <div className="flex items-center flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
          <Input
            className="pl-9 h-9 bg-muted/50 border-none rounded-full text-sm font-sans focus-visible:ring-1"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <span className="text-xs font-sans tracking-widest uppercase text-muted-foreground hidden md:block select-none">Notes</span>
        <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80 text-primary shrink-0" onClick={handleAddNote}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 md:p-4 flex flex-col gap-2">
          {filteredNotes.map(note => (
            <button
              key={note.id}
              onClick={() => handleSelectNote(note.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl transition-all duration-200 border text-sm",
                activeNoteId === note.id
                  ? "bg-white/80 dark:bg-white/5 border-primary/20 shadow-sm"
                  : "bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-white/5"
              )}
            >
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{note.title}</h3>
              <p className="text-xs text-muted-foreground mb-1.5 font-sans tracking-wide">{note.date}</p>
              <p className="text-muted-foreground line-clamp-2 leading-relaxed text-[13px]">{note.preview || note.content.substring(0, 60)}</p>
            </button>
          ))}
          {filteredNotes.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm font-sans">No notes found.</div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // ─── NOTE EDITOR ─────────────────────────────────────────────────────────────
  const NoteEditor = (
    <div className="flex flex-col h-full">
      <div className="h-16 md:h-20 flex items-center px-4 md:px-8 border-b border-border/40 shrink-0 gap-3">
        <Button
          variant="ghost" size="icon"
          className="rounded-full hover:bg-muted/80 text-muted-foreground md:hidden shrink-0"
          onClick={() => setMobileView('notes-list')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-xs font-sans tracking-widest uppercase text-muted-foreground truncate">
          {activeNote?.title || 'Note'}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-12">
        {activeNote ? (
          <div className="max-w-2xl mx-auto w-full">
            <input
              type="text"
              value={activeNote.title}
              onChange={e => updateActiveNote({ title: e.target.value })}
              className="w-full text-3xl md:text-4xl font-serif font-medium bg-transparent border-none outline-none mb-4 text-foreground placeholder-muted-foreground/50 focus:ring-0"
              placeholder="Note Title"
            />
            <p className="text-sm text-muted-foreground font-sans tracking-wide mb-8 flex items-center gap-2">
              <PenLine className="w-3 h-3" />
              {activeNote.date}
            </p>
            <textarea
              value={activeNote.content}
              onChange={e => updateActiveNote({ content: e.target.value, preview: e.target.value.substring(0, 80) + '...' })}
              className="w-full min-h-[50vh] resize-none bg-transparent border-none outline-none text-foreground/80 leading-[2.2] text-lg font-serif placeholder-muted-foreground/30 focus:ring-0"
              placeholder="Start writing..."
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-sm">
            Select a note or create a new one
          </div>
        )}
      </div>
    </div>
  );

  // ─── MUSIC PLAYER ────────────────────────────────────────────────────────────
  const MusicPlayer = (
    <div className="flex flex-col h-full">
      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 flex flex-col items-center shrink-0">
        <div className="w-52 h-52 md:w-64 md:h-64 rounded-2xl shadow-xl overflow-hidden mb-6 relative">
          <div className={cn("w-full h-full bg-gradient-to-br transition-all duration-1000", currentSong.gradient)} />
          <div className="absolute inset-0 bg-black/5 rounded-full scale-[1.5] border-[0.5px] border-white/10 opacity-50 mix-blend-overlay pointer-events-none" />
        </div>

        <div className="text-center mb-6 w-full">
          <h2 className="text-xl md:text-2xl font-serif font-medium mb-1 truncate px-4">{currentSong.title}</h2>
          <p className="text-muted-foreground font-sans text-sm tracking-wide">{currentSong.artist}</p>
        </div>

        <div className="w-full mb-6 px-2">
          <Slider
            value={[progress]}
            max={100}
            step={1}
            className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
            onValueChange={val => setProgress(val[0])}
          />
          <div className="flex justify-between items-center mt-2 text-[11px] font-sans tracking-wider text-muted-foreground">
            <span>{formatProgress(progress, currentSong.durationSecs)}</span>
            <span>{currentSong.duration}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-5 mb-4 w-full">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Shuffle className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/40 dark:hover:bg-white/10 rounded-full w-10 h-10" onClick={handlePrev}>
            <SkipBack className="w-5 h-5 fill-current" />
          </Button>
          <Button
            variant="default" size="icon"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-white/40 dark:hover:bg-white/10 rounded-full w-10 h-10" onClick={handleNext}>
            <SkipForward className="w-5 h-5 fill-current" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Repeat className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3 w-full px-6 mt-2">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <Slider defaultValue={[70]} max={100} step={1} className="w-full [&_[role=slider]]:h-2 [&_[role=slider]]:w-2" />
        </div>
      </div>

      <div className="px-4 md:px-6 pb-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-3 text-xs font-sans tracking-widest uppercase text-muted-foreground px-2">
          <ListMusic className="w-3.5 h-3.5" />
          Up Next
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 pb-4">
            {PLAYLIST.map((song, idx) => (
              <button
                key={song.id}
                onClick={() => handleSelectSong(idx)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl transition-colors w-full text-left group",
                  currentSongIndex === idx ? "bg-white/50 dark:bg-white/10" : "hover:bg-white/30 dark:hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={cn("w-9 h-9 rounded-md shrink-0 bg-gradient-to-br flex items-center justify-center", song.gradient)}>
                    {currentSongIndex === idx && isPlaying && (
                      <div className="w-3 h-3 flex items-end justify-between gap-0.5">
                        <div className="w-0.5 bg-white/80 animate-pulse h-full" style={{ animationDelay: '0ms' }} />
                        <div className="w-0.5 bg-white/80 animate-pulse h-2/3" style={{ animationDelay: '150ms' }} />
                        <div className="w-0.5 bg-white/80 animate-pulse h-full" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                  <div className="truncate">
                    <p className={cn("text-sm font-medium truncate mb-0.5", currentSongIndex === idx ? "text-foreground" : "text-foreground/80 group-hover:text-foreground")}>{song.title}</p>
                    <p className="text-xs font-sans text-muted-foreground truncate">{song.artist}</p>
                  </div>
                </div>
                <span className="text-xs font-sans text-muted-foreground ml-3 shrink-0">{song.duration}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-serif selection:bg-primary/20">

      {/* ── DESKTOP LAYOUT (md+) ─────────────────────────────────── */}
      <div className="hidden md:flex items-center justify-center p-8 min-h-[100dvh]">
        <div className="w-full max-w-[1400px] h-[90vh] min-h-[700px] bg-white/40 dark:bg-black/20 backdrop-blur-3xl rounded-[2rem] border border-white/50 dark:border-white/10 shadow-2xl overflow-hidden flex flex-row">

          {/* Header: title centered above both panels */}
          <div className="flex-1 flex flex-col h-full bg-card/60 min-w-0">

            {/* Notes header row */}
            <div className="h-20 flex items-center justify-between px-8 border-b border-border/40 shrink-0 gap-4">
              <div className="flex items-center flex-1 max-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 bg-muted/50 border-none rounded-full text-sm font-sans focus-visible:ring-1"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
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
                      <button
                        key={note.id}
                        onClick={() => setActiveNoteId(note.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl transition-all duration-200 border text-sm",
                          activeNoteId === note.id
                            ? "bg-white/80 dark:bg-white/5 border-primary/20 shadow-sm"
                            : "bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-white/5"
                        )}
                      >
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{note.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2 font-sans tracking-wide">{note.date}</p>
                        <p className="text-muted-foreground line-clamp-2 leading-relaxed text-[13px]">{note.preview || note.content.substring(0, 60)}</p>
                      </button>
                    ))}
                    {filteredNotes.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm font-sans">No notes found.</div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Editor */}
              <div className="flex-1 flex flex-col p-12 overflow-y-auto h-full">
                {activeNote ? (
                  <div className="max-w-2xl mx-auto w-full mt-4 h-full flex flex-col">
                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={e => updateActiveNote({ title: e.target.value })}
                      className="w-full text-4xl font-serif font-medium bg-transparent border-none outline-none mb-6 text-foreground placeholder-muted-foreground/50 focus:ring-0"
                      placeholder="Note Title"
                    />
                    <p className="text-sm text-muted-foreground font-sans tracking-wide mb-12 flex items-center gap-2">
                      <PenLine className="w-3 h-3" />
                      {activeNote.date}
                    </p>
                    <textarea
                      value={activeNote.content}
                      onChange={e => updateActiveNote({ content: e.target.value, preview: e.target.value.substring(0, 80) + '...' })}
                      className="w-full flex-1 resize-none bg-transparent border-none outline-none text-foreground/80 leading-[2.2] text-lg font-serif placeholder-muted-foreground/30 focus:ring-0"
                      placeholder="Start writing..."
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-sm">
                    Select a note or create a new one
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Music Player */}
          <div className="w-[380px] lg:w-[420px] h-full bg-secondary/40 border-l border-border/40 flex flex-col shrink-0">
            {MusicPlayer}
          </div>
        </div>
      </div>

      {/* ── MOBILE LAYOUT (< md) ──────────────────────────────────── */}
      <div className="flex md:hidden flex-col h-[100dvh]">

        {/* Mobile content area */}
        <div className="flex-1 overflow-hidden bg-card/60">
          {mobileTab === 'notes' && (
            mobileView === 'note-editor'
              ? NoteEditor
              : NotesList
          )}
          {mobileTab === 'player' && (
            <div className="h-full overflow-y-auto bg-secondary/40">
              {MusicPlayer}
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div className="shrink-0 bg-background/80 backdrop-blur-xl border-t border-border/50 flex safe-area-inset-bottom">
          <button
            onClick={() => { setMobileTab('notes'); if (mobileView === 'note-editor') setMobileView('note-editor'); else setMobileView('notes-list'); }}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-sans tracking-wide transition-colors",
              mobileTab === 'notes' ? "text-primary" : "text-muted-foreground"
            )}
          >
            <PenLine className="w-5 h-5" />
            Notes
          </button>

          {/* Mini player indicator */}
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 -top-0.5 w-12 h-0.5 rounded-full transition-all duration-300",
            isPlaying ? "bg-primary" : "bg-transparent"
          )} />

          <button
            onClick={() => setMobileTab('player')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-sans tracking-wide transition-colors relative",
              mobileTab === 'player' ? "text-primary" : "text-muted-foreground"
            )}
          >
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
