import { useRef, memo } from 'react';
import { BookOpen, Upload, Trash2, ArrowLeft, BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book, BookMark, ReadingProgress } from '@/lib/types';
import type { FontSize, LineHeight, EditorFont } from '@/lib/types';
import { BookReader } from '@/components/BookReader';

type Props = {
  books: Book[];
  activeBook: Book | null;
  bookmarks: BookMark[];
  progress: ReadingProgress | null;
  importing: boolean;
  importError: string | null;
  fontSize: FontSize;
  lineHeight: LineHeight;
  editorFont: EditorFont;
  onImport: (file: File) => void;
  onSelectBook: (id: string) => void;
  onRemoveBook: (id: string) => void;
  onClose: () => void;
  onBackToShelf: () => void;
  onSaveProgress: (bookId: string, chapterId: string, position: number) => void;
  onAddBookmark: (bookId: string, chapterId: string, position: number, label: string) => void;
  onRemoveBookmark: (id: string) => void;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(iso));
  } catch { return ''; }
}

export const LibraryView = memo(function LibraryView({
  books, activeBook, bookmarks, progress,
  importing, importError,
  fontSize, lineHeight, editorFont,
  onImport, onSelectBook, onRemoveBook, onClose, onBackToShelf,
  onSaveProgress, onAddBookmark, onRemoveBookmark,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { onImport(file); e.target.value = ''; }
  };

  // If active book → show immersive reader
  if (activeBook) {
    return (
      <BookReader
        book={activeBook}
        bookmarks={bookmarks.filter(b => b.bookId === activeBook.id)}
        progress={progress}
        fontSize={fontSize}
        lineHeight={lineHeight}
        editorFont={editorFont}
        onBack={onBackToShelf}
        onSaveProgress={onSaveProgress}
        onAddBookmark={onAddBookmark}
        onRemoveBookmark={onRemoveBookmark}
      />
    );
  }

  // Otherwise → show book shelf
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-border/30 bg-background/80 backdrop-blur-xl shrink-0">
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-sans text-muted-foreground/70 tracking-wide select-none">Library</span>
        <div className="ml-auto">
          <button onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-[13px] font-sans disabled:opacity-50">
            <Upload className="w-3.5 h-3.5" />
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".txt,.epub,.md" className="hidden" onChange={handleFileChange} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {importError && (
          <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-sans">
            {importError}
          </div>
        )}

        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
              <BookMarked className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-foreground/70 font-sans text-sm mb-1">No books yet</p>
              <p className="text-muted-foreground/50 font-sans text-[13px]">Import a .txt or .epub file to start reading</p>
            </div>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-sans">
              <Upload className="w-4 h-4" />
              Import a book
            </button>
          </div>
        ) : (
          <div className="px-5 py-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {books.map(book => {
                const bkCount = bookmarks.filter(b => b.bookId === book.id).length;
                return (
                  <div key={book.id} className="group relative">
                    <button onClick={() => onSelectBook(book.id)}
                      className="w-full text-left">
                      {/* Book cover */}
                      <div className={cn(
                        "w-full aspect-[2/3] rounded-xl mb-3 relative overflow-hidden",
                        "bg-gradient-to-br from-primary/20 to-primary/5",
                        "border border-border/30 shadow-sm",
                        "group-hover:shadow-md group-hover:scale-[1.02] transition-all duration-200"
                      )}>
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                          <BookOpen className="w-8 h-8 text-primary/30 mb-3 shrink-0" />
                          <p className="text-[11px] font-serif font-medium text-foreground/60 text-center line-clamp-3 leading-snug">
                            {book.title}
                          </p>
                        </div>
                        {/* Spine line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 rounded-l-xl" />
                        {bkCount > 0 && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center">
                            <span className="text-[9px] text-primary-foreground font-sans font-bold">{bkCount}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[13px] font-medium text-foreground line-clamp-1">{book.title}</p>
                      <p className="text-[11px] font-sans text-muted-foreground mt-0.5">{book.author}</p>
                      <p className="text-[10px] font-sans text-muted-foreground/50 mt-0.5">
                        {book.chapters.length} 章 · {formatDate(book.addedAt)}
                      </p>
                    </button>
                    {/* Delete button */}
                    <button onClick={e => { e.stopPropagation(); onRemoveBook(book.id); }}
                      className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-background/80 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
