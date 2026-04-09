import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, List, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book, BookMark, ReadingProgress } from '@/lib/types';
import type { FontSize, LineHeight, EditorFont } from '@/lib/types';

const FONT_SIZE_MAP: Record<FontSize, string>    = { sm: 'text-[16px]', md: 'text-[18px]', lg: 'text-[21px]' };
const LINE_HEIGHT_MAP: Record<LineHeight, string> = { tight: 'leading-[1.9]', normal: 'leading-[2.4]', relaxed: 'leading-[3.0]' };

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

function normalizeForCompare(s: string): string {
  return s.replace(/[\s\u3000·\-—–:：.。,，、]+/g, '').toLowerCase();
}

function ContentParagraphs({ content, chapterTitle, fontSize, lineHeight, editorFont }: {
  content: string;
  chapterTitle: string;
  fontSize: FontSize;
  lineHeight: LineHeight;
  editorFont: EditorFont;
}) {
  const paragraphs = useMemo(() => {
    const blocks = content.split(/\n{2,}/);
    const result: string[] = [];
    const titleNorm = normalizeForCompare(chapterTitle);
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      const paraNorm = normalizeForCompare(trimmed);
      if (result.length === 0 && titleNorm && (paraNorm === titleNorm || titleNorm.includes(paraNorm) || paraNorm.includes(titleNorm))) continue;
      result.push(trimmed);
    }
    return result;
  }, [content, chapterTitle]);

  const baseClass = cn(
    FONT_SIZE_MAP[fontSize],
    LINE_HEIGHT_MAP[lineHeight],
    editorFont === 'serif' ? 'font-serif' : 'font-sans',
    'text-foreground/85 selection:bg-primary/20'
  );

  return (
    <div className={baseClass}>
      {paragraphs.map((para, i) => {
        const isSubHeading = para.length <= 40 && !para.includes('\n') && i > 0;
        if (isSubHeading) {
          return (
            <p key={i} className="text-center font-medium text-foreground mt-10 mb-6 tracking-wide">
              {para}
            </p>
          );
        }
        const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
        return (
          <p key={i} className="mb-[1.2em] indent-[2em] break-words">
            {lines.join(' ')}
          </p>
        );
      })}
    </div>
  );
}

export const BookReader = memo(function BookReader({
  book, bookmarks, progress,
  fontSize, lineHeight, editorFont,
  onBack, onSaveProgress, onAddBookmark, onRemoveBookmark,
}: Props) {
  const [chapterIdx,     setChapterIdx]     = useState<number>(() => {
    if (!progress) return 0;
    const idx = book.chapters.findIndex(c => c.id === progress.chapterId);
    return idx >= 0 ? idx : 0;
  });
  const [scrollPct,      setScrollPct]      = useState(progress?.position ?? 0);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [panelOpen,      setPanelOpen]      = useState(false);
  const [panelTab,       setPanelTab]       = useState<'chapters' | 'bookmarks'>('chapters');

  const contentRef  = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chapter       = book.chapters[chapterIdx];
  const totalChapters = book.chapters.length;

  const isBookmarked = bookmarks.some(
    b => b.bookId === book.id && b.chapterId === chapter?.id && Math.abs(b.position - scrollPct) < 3
  );

  const showToolbar = useCallback(() => {
    setToolbarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setToolbarVisible(false), 3500);
  }, []);

  useEffect(() => {
    showToolbar();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore scroll position on chapter change
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const restorePos = progress?.chapterId === chapter?.id ? (progress?.position ?? 0) : 0;
    if (restorePos > 0) {
      requestAnimationFrame(() => {
        el.scrollTop = (restorePos / 100) * (el.scrollHeight - el.clientHeight);
      });
    } else {
      el.scrollTop = 0;
    }
  }, [chapterIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track scroll → save progress
  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const pct = el.scrollHeight <= el.clientHeight
      ? 0
      : (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
    setScrollPct(pct);
    if (chapter) onSaveProgress(book.id, chapter.id, pct);
  }, [book.id, chapter, onSaveProgress]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('[data-panel]')) return;
    if (panelOpen) { setPanelOpen(false); return; }
    showToolbar();
  }, [panelOpen, showToolbar]);

  const goToChapter = useCallback((idx: number) => {
    setChapterIdx(idx);
    setScrollPct(0);
    setPanelOpen(false);
  }, []);

  // Use functional updaters to avoid stale chapterIdx in closures
  const handlePrevChapter = useCallback(() => {
    setChapterIdx(prev => {
      if (prev > 0) {
        setScrollPct(0);
        setPanelOpen(false);
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleNextChapter = useCallback(() => {
    setChapterIdx(prev => {
      if (prev < totalChapters - 1) {
        setScrollPct(0);
        setPanelOpen(false);
        return prev + 1;
      }
      return prev;
    });
  }, [totalChapters]);

  const handleAddBookmark = useCallback(() => {
    if (!chapter) return;
    const label = `${chapter.title} · ${Math.round(scrollPct)}%`;
    onAddBookmark(book.id, chapter.id, scrollPct, label);
  }, [book.id, chapter, scrollPct, onAddBookmark]);

  const handleJumpBookmark = useCallback((bm: BookMark) => {
    const idx = book.chapters.findIndex(c => c.id === bm.chapterId);
    if (idx < 0) return;
    setChapterIdx(idx);
    setPanelOpen(false);
    setTimeout(() => {
      const el = contentRef.current;
      if (!el) return;
      el.scrollTop = (bm.position / 100) * (el.scrollHeight - el.clientHeight);
    }, 80);
  }, [book.chapters]);

  if (!chapter) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" onClick={handleContentClick}>

      {/* ── Top toolbar ── pointer-events-none on gradient, auto on buttons */}
      <div className={cn(
        "absolute top-0 left-0 right-0 z-10 flex items-center gap-2 px-4 h-14 pointer-events-none",
        "bg-gradient-to-b from-background via-background/80 to-transparent",
        "transition-all duration-300",
        toolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      )}>
        <button onClick={e => { e.stopPropagation(); onBack(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 pointer-events-auto">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 px-1 pointer-events-auto">
          <p className="text-[13px] font-medium text-foreground truncate leading-tight">{book.title}</p>
          <p className="text-[11px] font-sans text-muted-foreground/70 truncate leading-tight">{chapter.title}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); handleAddBookmark(); }}
          title={isBookmarked ? '已添加书签' : '添加书签'}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 pointer-events-auto",
            isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}>
          {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
        <button onClick={e => { e.stopPropagation(); setPanelOpen(p => !p); showToolbar(); }}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 pointer-events-auto",
            panelOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}>
          <List className="w-4 h-4" />
        </button>
      </div>

      {/* ── Reading content ── */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-none pt-16 pb-28"
      >
        <div className="max-w-[680px] mx-auto px-6 md:px-14 py-8">
          <div className="flex flex-col items-center mb-14 mt-4">
            <div className="w-8 h-[1px] bg-primary/25 mb-6" />
            <h2 className={cn(
              "font-serif font-semibold text-foreground text-center leading-snug tracking-wider",
              fontSize === 'lg' ? 'text-2xl' : 'text-xl'
            )}>
              {chapter.title}
            </h2>
            <div className="w-8 h-[1px] bg-primary/25 mt-6" />
          </div>

          <ContentParagraphs
            content={chapter.content}
            chapterTitle={chapter.title}
            fontSize={fontSize}
            lineHeight={lineHeight}
            editorFont={editorFont}
          />

          {/* Chapter navigation at bottom of content */}
          <div className="mt-16 flex flex-col gap-3">
            {chapterIdx < totalChapters - 1 && (
              <button
                onClick={e => { e.stopPropagation(); handleNextChapter(); }}
                className="relative z-20 w-full py-3.5 rounded-xl border border-border/40 text-sm font-sans text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                下一章：{book.chapters[chapterIdx + 1]?.title}
              </button>
            )}
            {chapterIdx > 0 && (
              <button
                onClick={e => { e.stopPropagation(); handlePrevChapter(); }}
                className="relative z-20 w-full py-3 rounded-xl text-[13px] font-sans text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                上一章：{book.chapters[chapterIdx - 1]?.title}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom progress bar ── pointer-events-none on gradient, auto on buttons */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-10 px-4 py-3 pointer-events-none",
        "bg-gradient-to-t from-background via-background/80 to-transparent",
        "transition-all duration-300",
        toolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}>
        <div className="h-[2px] bg-muted/40 rounded-full mb-3 overflow-hidden">
          <div
            className="h-full bg-primary/50 rounded-full transition-all duration-500"
            style={{ width: `${scrollPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between pointer-events-auto">
          <button onClick={e => { e.stopPropagation(); handlePrevChapter(); }}
            disabled={chapterIdx === 0}
            className="flex items-center gap-1 text-[12px] font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
            <ChevronLeft className="w-3.5 h-3.5" /> 上一章
          </button>
          <span className="text-[11px] font-sans text-muted-foreground/50">
            {chapterIdx + 1} / {totalChapters}
            {scrollPct > 0 && ` · ${Math.round(scrollPct)}%`}
          </span>
          <button onClick={e => { e.stopPropagation(); handleNextChapter(); }}
            disabled={chapterIdx === totalChapters - 1}
            className="flex items-center gap-1 text-[12px] font-sans text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30">
            下一章 <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Chapter / Bookmark side panel ── */}
      <>
        <div
          data-panel
          onClick={e => { e.stopPropagation(); setPanelOpen(false); }}
          className={cn(
            "absolute inset-0 z-20 bg-black/10 backdrop-blur-[2px] transition-opacity duration-300",
            panelOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        />
        <div
          data-panel
          className={cn(
            "absolute top-0 right-0 bottom-0 z-30 w-72 bg-card/98 backdrop-blur-xl border-l border-border/40 flex flex-col shadow-2xl",
            "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
            panelOpen ? "translate-x-0" : "translate-x-full"
          )}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
            <div className="flex gap-1 bg-muted/50 rounded-xl p-0.5">
              {(['chapters', 'bookmarks'] as const).map(tab => (
                <button key={tab} onClick={() => setPanelTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[13px] font-sans transition-all duration-150",
                    panelTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}>
                  {tab === 'chapters' ? '目录' : `书签${bookmarks.length ? ` (${bookmarks.length})` : ''}`}
                </button>
              ))}
            </div>
            <button onClick={() => setPanelOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {panelTab === 'chapters' && (
              <div className="py-2">
                {book.chapters.map((ch, idx) => (
                  <button key={ch.id} onClick={() => goToChapter(idx)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors border-l-2 text-[13px] font-sans",
                      idx === chapterIdx
                        ? "border-primary bg-primary/8 text-foreground font-medium"
                        : "border-transparent text-foreground/60 hover:bg-muted/40 hover:text-foreground"
                    )}>
                    <span className="line-clamp-2 leading-snug">{ch.title}</span>
                  </button>
                ))}
              </div>
            )}

            {panelTab === 'bookmarks' && (
              <div className="py-2">
                {bookmarks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 px-4 gap-3">
                    <Bookmark className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-[13px] font-sans text-muted-foreground/50 text-center">
                      点击顶部书签图标<br />在当前位置添加书签
                    </p>
                  </div>
                )}
                {bookmarks.map(bm => {
                  const bmChapter = book.chapters.find(c => c.id === bm.chapterId);
                  const date = new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(bm.createdAt));
                  return (
                    <div key={bm.id}
                      className="flex items-start gap-2 px-4 py-3 hover:bg-muted/30 transition-colors group border-b border-border/20 last:border-0">
                      <button onClick={() => handleJumpBookmark(bm)} className="flex-1 text-left min-w-0">
                        <p className="text-[13px] font-medium text-foreground line-clamp-1 leading-snug">{bmChapter?.title ?? ''}</p>
                        <p className="text-[11px] font-sans text-muted-foreground/60 mt-0.5">
                          {Math.round(bm.position)}% · {date}
                        </p>
                      </button>
                      <button onClick={() => onRemoveBookmark(bm.id)}
                        className="opacity-0 group-hover:opacity-100 mt-0.5 p-1 rounded-md text-muted-foreground hover:text-destructive transition-all shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    </div>
  );
});
