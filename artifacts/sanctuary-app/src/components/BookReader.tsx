import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, List, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book, BookChapter, BookMark, ReadingProgress } from '@/lib/types';
import type { FontSize, LineHeight, EditorFont } from '@/lib/types';

const FONT_SIZE_MAP: Record<FontSize, string>   = { sm: 'text-base', md: 'text-lg', lg: 'text-xl' };
const LINE_HEIGHT_MAP: Record<LineHeight, string> = { tight: 'leading-[1.8]', normal: 'leading-[2.2]', relaxed: 'leading-[2.8]' };

type Props = {
  book: Book;
  bookmarks: BookMark[];
  progress: ReadingProgress | null;
  fontSize: FontSize;
  lineHeight: LineHeight;
  editorFont: EditorFont;
  onBack: () => void;
  onSaveProgress: (bookId: string, chapterId: string, position: number) => void;
  onAddBookmark: (bookId: string, chapterId: string, position: number, label: string) => void;
  onRemoveBookmark: (id: string) => void;
};

export const BookReader = memo(function BookReader({
  book, bookmarks, progress,
  fontSize, lineHeight, editorFont,
  onBack, onSaveProgress, onAddBookmark, onRemoveBookmark,
}: Props) {
  const [chapterIdx, setChapterIdx] = useState<number>(() => {
    if (!progress) return 0;
    const idx = book.chapters.findIndex(c => c.id === progress.chapterId);
    return idx >= 0 ? idx : 0;
  });
  const [scrollPct,   setScrollPct]   = useState(progress?.position ?? 0);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'chapters' | 'bookmarks'>('chapters');
  const [hideTimer, setHideTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const contentRef  = useRef<HTMLDivElement>(null);
  const chapter     = book.chapters[chapterIdx];
  const totalChapters = book.chapters.length;

  const isBookmarked = bookmarks.some(
    b => b.bookId === book.id && b.chapterId === chapter?.id && Math.abs(b.position - scrollPct) < 2
  );

  // Restore scroll position when chapter changes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const pos = (progress?.chapterId === chapter?.id) ? (progress?.position ?? 0) : 0;
    el.scrollTop = (pos / 100) * (el.scrollHeight - el.clientHeight);
  }, [chapterIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track scroll position
  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const pct = el.scrollHeight <= el.clientHeight
      ? 0
      : (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    setScrollPct(pct);
    if (chapter) onSaveProgress(book.id, chapter.id, pct);
  }, [book.id, chapter, onSaveProgress]);

  // Auto-hide toolbar
  const resetHideTimer = useCallback(() => {
    setToolbarVisible(true);
    if (hideTimer) clearTimeout(hideTimer);
    const t = setTimeout(() => setToolbarVisible(false), 3000);
    setHideTimer(t);
  }, [hideTimer]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimer) clearTimeout(hideTimer); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContentClick = useCallback(() => {
    if (panelOpen) { setPanelOpen(false); return; }
    resetHideTimer();
  }, [panelOpen, resetHideTimer]);

  const goToChapter = useCallback((idx: number) => {
    setChapterIdx(idx);
    setScrollPct(0);
    setPanelOpen(false);
    contentRef.current?.scrollTo({ top: 0 });
  }, []);

  const handlePrevChapter = useCallback(() => {
    if (chapterIdx > 0) goToChapter(chapterIdx - 1);
  }, [chapterIdx, goToChapter]);

  const handleNextChapter = useCallback(() => {
    if (chapterIdx < totalChapters - 1) goToChapter(chapterIdx + 1);
  }, [chapterIdx, totalChapters, goToChapter]);

  const handleAddBookmark = useCallback(() => {
    if (!chapter) return;
    const label = chapter.title || `${book.title} — ${Math.round(scrollPct)}%`;
    onAddBookmark(book.id, chapter.id, scrollPct, label);
  }, [book.id, chapter, scrollPct, onAddBookmark]);

  const handleJumpBookmark = useCallback((bm: BookMark) => {
    const idx = book.chapters.findIndex(c => c.id === bm.chapterId);
    if (idx >= 0) {
      setChapterIdx(idx);
      setPanelOpen(false);
      // Restore scroll after render
      setTimeout(() => {
        const el = contentRef.current;
        if (!el) return;
        el.scrollTop = (bm.position / 100) * (el.scrollHeight - el.clientHeight);
      }, 50);
    }
  }, [book.chapters]);

  if (!chapter) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" onClick={handleContentClick}>

      {/* ── Top toolbar (auto-hide) ── */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 h-14",
        "bg-gradient-to-b from-background/95 to-transparent backdrop-blur-sm",
        "transition-all duration-300",
        toolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      )}>
        <button onClick={(e) => { e.stopPropagation(); onBack(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{book.title}</p>
          <p className="text-[11px] font-sans text-muted-foreground truncate">{chapter.title}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); handleAddBookmark(); }}
          title={isBookmarked ? 'Already bookmarked' : 'Add bookmark'}
          className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0",
            isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}>
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); setPanelOpen(p => !p); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0">
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* ── Chapter content ── */}
      <div ref={contentRef} onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-14 pb-16">
        <div className="max-w-2xl mx-auto px-6 md:px-16 py-10">
          <h2 className="text-xl font-serif font-semibold text-foreground mb-8 leading-tight">{chapter.title}</h2>
          <div className={cn(
            "text-foreground/80 whitespace-pre-wrap break-words",
            FONT_SIZE_MAP[fontSize],
            LINE_HEIGHT_MAP[lineHeight],
            editorFont === 'serif' ? 'font-serif' : 'font-sans'
          )}>
            {chapter.content}
          </div>
        </div>
      </div>

      {/* ── Bottom bar (auto-hide) ── */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-10 px-4 py-3",
        "bg-gradient-to-t from-background/95 to-transparent backdrop-blur-sm",
        "transition-all duration-300",
        toolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {/* Progress bar */}
        <div className="h-[2px] bg-muted/40 rounded-full mb-3 overflow-hidden">
          <div className="h-full bg-primary/60 rounded-full transition-all duration-300" style={{ width: `${scrollPct}%` }} />
        </div>
        {/* Chapter nav */}
        <div className="flex items-center justify-between">
          <button onClick={(e) => { e.stopPropagation(); handlePrevChapter(); }}
            disabled={chapterIdx === 0}
            className="flex items-center gap-1 text-[12px] font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[11px] font-sans text-muted-foreground/60">
            {chapterIdx + 1} / {totalChapters}
          </span>
          <button onClick={(e) => { e.stopPropagation(); handleNextChapter(); }}
            disabled={chapterIdx === totalChapters - 1}
            className="flex items-center gap-1 text-[12px] font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Chapter / Bookmark panel ── */}
      <div className={cn(
        "absolute top-0 right-0 bottom-0 z-20 w-72 bg-card/95 backdrop-blur-xl border-l border-border/40 flex flex-col",
        "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        panelOpen ? "translate-x-0" : "translate-x-full"
      )} onClick={e => e.stopPropagation()}>
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40 shrink-0">
          <div className="flex gap-4">
            <button onClick={() => setPanelTab('chapters')}
              className={cn("text-sm font-sans transition-colors", panelTab === 'chapters' ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
              目录
            </button>
            <button onClick={() => setPanelTab('bookmarks')}
              className={cn("text-sm font-sans transition-colors", panelTab === 'bookmarks' ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
              书签 {bookmarks.length > 0 && <span className="text-[10px] ml-1 text-muted-foreground">({bookmarks.length})</span>}
            </button>
          </div>
          <button onClick={() => setPanelOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto">
          {panelTab === 'chapters' && (
            <div className="py-2">
              {book.chapters.map((ch, idx) => (
                <button key={ch.id} onClick={() => goToChapter(idx)}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors text-sm font-sans",
                    idx === chapterIdx
                      ? "bg-primary/10 text-foreground font-medium"
                      : "text-foreground/70 hover:bg-muted/40 hover:text-foreground"
                  )}>
                  <span className="line-clamp-2">{ch.title}</span>
                </button>
              ))}
            </div>
          )}
          {panelTab === 'bookmarks' && (
            <div className="py-2">
              {bookmarks.length === 0 && (
                <p className="px-4 py-8 text-[13px] font-sans text-muted-foreground/60 text-center">
                  点击右上角书签图标添加书签
                </p>
              )}
              {bookmarks.map(bm => {
                const bmChapter = book.chapters.find(c => c.id === bm.chapterId);
                return (
                  <div key={bm.id}
                    className="flex items-start gap-2 px-4 py-3 hover:bg-muted/40 transition-colors group">
                    <button onClick={() => handleJumpBookmark(bm)} className="flex-1 text-left min-w-0">
                      <p className="text-[13px] font-medium text-foreground line-clamp-1">{bm.label}</p>
                      <p className="text-[11px] font-sans text-muted-foreground mt-0.5">
                        {bmChapter?.title ?? ''} · {Math.round(bm.position)}%
                      </p>
                    </button>
                    <button onClick={() => onRemoveBookmark(bm.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
