// ─── Book / Reader types ──────────────────────────────────────────────────────

export type BookFormat = 'txt' | 'epub';

export type BookChapter = {
  id: string;
  title: string;
  content: string;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  chapters: BookChapter[];
  addedAt: string;
};

export type BookMark = {
  id: string;
  bookId: string;
  chapterId: string;
  position: number;  // 0-100 scroll percentage within chapter
  label: string;
  createdAt: string;
};

export type ReadingProgress = {
  bookId: string;
  chapterId: string;
  position: number;
};

// ─── App / Settings types ─────────────────────────────────────────────────────

export type ThemeId    = 'warm' | 'ink' | 'forest' | 'dusk' | 'stone';
export type FontSize   = 'sm' | 'md' | 'lg';
export type LineHeight = 'tight' | 'normal' | 'relaxed';
export type EditorFont = 'serif' | 'sans';

export type Note = {
  id: string;
  title: string;
  date: string;
  preview: string;
  content: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  durationSecs: number;
  gradient: string;
  src?: string;
  isUploaded?: boolean;
};

export const THEMES: { id: ThemeId; label: string; color: string }[] = [
  { id: 'warm',   label: '暖沙', color: '#C4937A' },
  { id: 'ink',    label: '墨白', color: '#4A6080' },
  { id: 'forest', label: '林间', color: '#4A7A5C' },
  { id: 'dusk',   label: '暮色', color: '#7A5CA0' },
  { id: 'stone',  label: '石砚', color: '#555555' },
];

export const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
};

export const LINE_HEIGHT_MAP: Record<LineHeight, string> = {
  tight:   'leading-[1.8]',
  normal:  'leading-[2.2]',
  relaxed: 'leading-[2.8]',
};

export const GRADIENTS = [
  'from-violet-200 to-purple-100',
  'from-pink-200 to-rose-100',
  'from-sky-200 to-cyan-100',
  'from-amber-200 to-yellow-100',
  'from-emerald-200 to-teal-100',
  'from-indigo-200 to-blue-100',
  'from-orange-200 to-red-100',
];

export const DEFAULT_NOTES: Note[] = [
  {
    id: '1', title: 'Morning thoughts', date: 'Today, 8:42 AM',
    preview: 'Woke up early before the city started making noise. The light is hitting...',
    content: 'Woke up early before the city started making noise. The light is hitting the floorboards perfectly right now. I made a cup of pour-over coffee, the good beans I got last weekend.\n\nI want to focus today on just being present. Not rushing to the next task, not mentally living in the future. Just existing in the current moment. The air feels crisp and there is a kind of stillness that I want to carry with me throughout the day.',
  },
  {
    id: '2', title: "Things I'm grateful for", date: 'Yesterday, 9:15 PM',
    preview: 'Small moments that made the week feel a bit lighter. The sudden rain on...',
    content: 'Small moments that made the week feel a bit lighter.\n\n- The sudden rain on Tuesday that smelled like wet earth and washed the pavement clean.\n- Finding an old book I forgot I owned, with notes in the margins from myself three years ago.\n- A friend reaching out just to say they were thinking of me.\n- The perfect soft-boiled egg.\n- Quiet evenings like this, where the only sound is the low hum of the refrigerator and a slow song playing.',
  },
  {
    id: '3', title: 'Book recommendations', date: 'Oct 12, 11:30 AM',
    preview: 'A running list of things I need to read. 1. The Poetics of Space...',
    content: 'A running list of things I need to read.\n\n1. The Poetics of Space — Gaston Bachelard\n2. Bluets — Maggie Nelson\n3. The Year of Magical Thinking — Joan Didion\n4. Braiding Sweetgrass — Robin Wall Kimmerer\n\nI need to start setting aside 30 minutes before bed to actually read instead of scrolling. The glow of the screen is ruining my sleep, but physical paper feels grounding.',
  },
  {
    id: '4', title: 'Weekend plans', date: 'Oct 10, 2:00 PM',
    preview: 'Nothing big. I just want to walk down to the lake, pick up some fresh...',
    content: 'Nothing big. I just want to walk down to the lake, pick up some fresh bread from the bakery, and maybe reorganize my desk.\n\nSunday: Do absolutely nothing. Maybe repot the monstera that is getting entirely too large for its corner.',
  },
  {
    id: '5', title: 'To the future me', date: 'Sep 28, 11:55 PM',
    preview: 'Are you still worrying about the things that feel so heavy right now? I hope...',
    content: "Are you still worrying about the things that feel so heavy right now? I hope you've learned to let go of the need to control every outcome.\n\nI hope you are softer. I hope you are kinder to yourself. I hope you still make time for slow mornings and good music.",
  },
];

export const DEFAULT_PLAYLIST: Song[] = [
  { id: 's1', title: 'Bloom', artist: 'Gracie Abrams', duration: '3:42', durationSecs: 222, gradient: 'from-rose-200 to-amber-100' },
];
