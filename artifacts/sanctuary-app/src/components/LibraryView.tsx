/**
 * LibraryView — full-screen book shelf or active reader.
 *
 * Subscribes to booksStore + settingsStore (for typography passed to the
 * reader). Splits the shelf grid into its own memoized sub-component so
 * picking a book doesn't re-render the import button.
 */

import { useRef, memo, useCallback } from 'react';
import { BookOpen, Upload, Trash2, ArrowLeft, BookMarked } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Book } from '@/lib/types';
import { useStore } from '@/lib/store';
import { booksStore, booksActions, booksSelectors } from '@/stores/booksStore';
import { uiActions } from '@/stores/uiStore';
import { BookReader } from '@/components/BookReader';

const SHELF_DATE_FMT = new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' });
function formatDate(iso: string) {
  try { return SHELF_DATE_FMT.format(new Date(iso)); } catch { return ''; }
}

/* ── Single book card ───────────────────────────────────────────────────── */

const BookCard = memo(function BookCard({ book, bookmarkCount }: {
  book: Book;
  bookmarkCount: number;
}) {
  return (
    <div className="group relative">
      <button onClick={() => booksActions.selectBook(book.id)} className="w-full text-left">
        <div className={cn(
          'w-full aspect-[2/3] rounded-xl mb-3 relative overflow-hidden',
          'bg-gradient-to-br from-primary/20 to-primary/5',
          'border border-border/30 shadow-sm',
          'group-hover:shadow-md group-hover:scale-[1.02] transition-all duration-200',
        )}>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
            <BookOpen className="w-8 h-8 text-primary/30 mb-3 shrink-0" />
            <p className="text-[11px] font-serif font-medium text-foreground/60 text-center line-clamp-3 leading-snug">
              {book.title}
            </p>
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary/20 rounded-l-xl" />
          {bookmarkCount > 0 && (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary/80 flex items-center justify-center">
              <span className="text-[9px] text-primary-foreground font-sans font-bold">{bookmarkCount}</span>
            </div>
          )}
        </div>
        <p className="text-[13px] font-medium text-foreground line-clamp-1">{book.title}</p>
        <p className="text-[11px] font-sans text-muted-foreground mt-0.5">{book.author}</p>
        <p className="text-[10px] font-sans text-muted-foreground/50 mt-0.5">
          {book.chapters.length} 章 · {formatDate(book.addedAt)}
        </p>
      </button>
      <button
        onClick={e => { e.stopPropagation(); booksActions.removeBook(book.id); }}
        className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-background/80 backdrop-blur-sm border border-border/30 flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-background/95 transition-all duration-150 active:scale-90 shadow-sm"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

/* ── Shelf ──────────────────────────────────────────────────────────────── */

const Shelf = memo(function Shelf() {
  const books     = useStore(booksStore, selectBooks);
  const bookmarks = useStore(booksStore, selectBookmarks);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) booksActions.importBook(file);
    e.target.value = '';
  }, []);

  return (
    <>
      <input ref={fileInputRef} type="file" accept=".txt,.epub,.md" className="hidden" onChange={onPickFile} />

      <ShelfHeader onImport={() => fileInputRef.current?.click()} />

      <div className="flex-1 overflow-y-auto">
        <ImportError />
        {books.length === 0 ? (
          <EmptyShelf onImport={() => fileInputRef.current?.click()} />
        ) : (
          <div className="px-5 py-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {books.map(book => {
                const bkCount = bookmarks.filter(b => b.bookId === book.id).length;
                return <BookCard key={book.id} book={book} bookmarkCount={bkCount} />;
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
});

const ShelfHeader = memo(function ShelfHeader({ onImport }: { onImport: () => void }) {
  const importing = useStore(booksStore, selectImporting);
  return (
    <div className="flex items-center gap-3 px-5 h-14 border-b border-border/30 bg-background/80 backdrop-blur-xl shrink-0">
      <button
        onClick={uiActions.closeLibrary}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150 active:scale-90"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-sans text-muted-foreground/70 tracking-wide select-none">Library</span>
      <div className="ml-auto">
        <button
          onClick={onImport}
          disabled={importing}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-150 active:scale-95 text-[13px] font-sans disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {importing ? 'Importing…' : 'Import'}
        </button>
      </div>
    </div>
  );
});

const ImportError = memo(function ImportError() {
  const err = useStore(booksStore, selectImportErr);
  if (!err) return null;
  return (
    <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-sans">
      {err}
    </div>
  );
});

function EmptyShelf({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
        <BookMarked className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <div>
        <p className="text-foreground/70 font-sans text-sm mb-1">No books yet</p>
        <p className="text-muted-foreground/50 font-sans text-[13px]">Import a .txt or .epub file to start reading</p>
      </div>
      <button
        onClick={onImport}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-150 active:scale-95 text-sm font-sans"
      >
        <Upload className="w-4 h-4" />
        Import a book
      </button>
    </div>
  );
}

/* ── Selectors ──────────────────────────────────────────────────────────── */

const selectActiveBook = (s: BooksState) => booksSelectors.activeBook(s);
const selectBooks      = (s: BooksState) => s.books;
const selectBookmarks  = (s: BooksState) => s.bookmarks;
const selectImporting  = (s: BooksState) => s.importing;
const selectImportErr  = (s: BooksState) => s.importError;

/* ── LibraryView entry ──────────────────────────────────────────────────── */

export const LibraryView = memo(function LibraryView() {
  const activeBook = useStore(booksStore, selectActiveBook);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {activeBook ? <BookReader book={activeBook} /> : <Shelf />}
    </div>
  );
});
