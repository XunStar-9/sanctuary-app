import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Book, BookMark, ReadingProgress } from '@/lib/types';
import { parseTxt, parseEpub } from '@/utils/bookParser';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function saveJson(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* localStorage full */ }
}

export function useBooks() {
  const [books,     setBooks]     = useState<Book[]>(() => loadJson('sanctuary_books', []));
  const [bookmarks, setBookmarks] = useState<BookMark[]>(() => loadJson('sanctuary_bookmarks', []));
  const [progress,  setProgress]  = useState<ReadingProgress | null>(() => loadJson('sanctuary_reading_progress', null));
  const [activeBookId, setActiveBookId] = useState<string | null>(() => loadJson('sanctuary_active_book', null));
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const bookSaveTimer = useRef(0);
  useEffect(() => {
    clearTimeout(bookSaveTimer.current);
    bookSaveTimer.current = window.setTimeout(() => {
      saveJson('sanctuary_books', books);
    }, 500);
    return () => clearTimeout(bookSaveTimer.current);
  }, [books]);

  const activeBook = useMemo(() => books.find(b => b.id === activeBookId) ?? null, [books, activeBookId]);

  const bookProgress = useMemo(() =>
    progress?.bookId === activeBookId ? progress : null,
    [progress, activeBookId]
  );

  const activeBookmarks = useMemo(() =>
    bookmarks.filter(b => b.bookId === activeBookId),
    [bookmarks, activeBookId]
  );

  const importBook = useCallback(async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsed: Awaited<ReturnType<typeof parseTxt>>;
      if (ext === 'epub') {
        parsed = await parseEpub(file);
      } else if (ext === 'txt' || ext === 'md') {
        parsed = await parseTxt(file);
      } else {
        throw new Error(`Unsupported format: .${ext}`);
      }
      const book: Book = {
        id: `book-${Date.now()}`,
        title: parsed.title,
        author: parsed.author,
        format: ext === 'epub' ? 'epub' : 'txt',
        chapters: parsed.chapters,
        addedAt: new Date().toISOString(),
      };
      setBooks(prev => [book, ...prev]);
      setActiveBookId(book.id);
      saveJson('sanctuary_active_book', book.id);
      const initialProgress: ReadingProgress = { bookId: book.id, chapterId: book.chapters[0]?.id ?? '', position: 0 };
      setProgress(initialProgress);
      saveJson('sanctuary_reading_progress', initialProgress);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }, []);

  const selectBook = useCallback((bookId: string) => {
    setActiveBookId(bookId);
    saveJson('sanctuary_active_book', bookId);
  }, []);

  const removeBook = useCallback((bookId: string) => {
    setBooks(prev => prev.filter(b => b.id !== bookId));
    setBookmarks(prev => {
      const next = prev.filter(b => b.bookId !== bookId);
      saveJson('sanctuary_bookmarks', next);
      return next;
    });
    setActiveBookId(prev => {
      const next = prev === bookId ? null : prev;
      saveJson('sanctuary_active_book', next);
      return next;
    });
  }, []);

  const saveProgress = useCallback((bookId: string, chapterId: string, position: number) => {
    const p: ReadingProgress = { bookId, chapterId, position };
    setProgress(p);
    saveJson('sanctuary_reading_progress', p);
  }, []);

  const addBookmark = useCallback((bookId: string, chapterId: string, position: number, label: string) => {
    const bm: BookMark = {
      id: `bm-${Date.now()}`,
      bookId, chapterId, position, label,
      createdAt: new Date().toISOString(),
    };
    setBookmarks(prev => {
      const next = [bm, ...prev];
      saveJson('sanctuary_bookmarks', next);
      return next;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = prev.filter(b => b.id !== id);
      saveJson('sanctuary_bookmarks', next);
      return next;
    });
  }, []);

  return {
    books, activeBook, activeBookId,
    bookmarks, activeBookmarks,
    progress: bookProgress,
    importing, importError,
    importBook, selectBook, removeBook,
    saveProgress, addBookmark, removeBookmark,
  };
}
