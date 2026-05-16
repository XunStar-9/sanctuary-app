/**
 * Books store — library, bookmarks, reading progress.
 *
 * Behavior matches the old `useBooks` hook:
 *  - Books, bookmarks, progress, active id each have their own localStorage key
 *    (preserved for backwards compatibility).
 *  - Books are persisted *eagerly* on import/remove (so a tab close doesn't
 *    leave a stale active id pointing at nothing). Other writes are debounced.
 *  - If activeBookId points to a missing book, it self-heals to null.
 */

import type { Book, BookMark, ReadingProgress } from '@/lib/types';
import { parseTxt, parseEpub } from '@/utils/bookParser';
import { createStore } from '@/lib/store';

const BOOKS_KEY     = 'sanctuary_books';
const BOOKMARKS_KEY = 'sanctuary_bookmarks';
const PROGRESS_KEY  = 'sanctuary_reading_progress';
const ACTIVE_KEY    = 'sanctuary_active_book';

export type BooksState = {
  books: Book[];
  bookmarks: BookMark[];
  progress: ReadingProgress | null;
  activeBookId: string | null;
  importing: boolean;
  importError: string | null;
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export const booksStore = createStore<BooksState>({
  books:        loadJson<Book[]>(BOOKS_KEY, []),
  bookmarks:    loadJson<BookMark[]>(BOOKMARKS_KEY, []),
  progress:     loadJson<ReadingProgress | null>(PROGRESS_KEY, null),
  activeBookId: loadJson<string | null>(ACTIVE_KEY, null),
  importing:    false,
  importError:  null,
});

// Self-heal: drop active id if it's stale.
{
  const s = booksStore.getState();
  if (s.activeBookId && !s.books.some(b => b.id === s.activeBookId)) {
    booksStore.set({ activeBookId: null });
    saveJson(ACTIVE_KEY, null);
  }
}

/* Persistence: only the four data keys; ephemeral fields aren't saved. */
let booksTimer = 0;
let bookmarksTimer = 0;
function trackKey<K extends keyof BooksState>(
  key: K,
  ls: string,
  timerRef: { v: number },
  delay = 300,
) {
  let prev = booksStore.getState()[key];
  booksStore.subscribe(() => {
    const curr = booksStore.getState()[key];
    if (Object.is(curr, prev)) return;
    prev = curr;
    if (timerRef.v) clearTimeout(timerRef.v);
    timerRef.v = window.setTimeout(() => saveJson(ls, curr), delay);
  });
}
trackKey('books',     BOOKS_KEY,     { v: booksTimer });
trackKey('bookmarks', BOOKMARKS_KEY, { v: bookmarksTimer });

// Progress and active id are tiny — write immediately.
{
  let prev = booksStore.getState().progress;
  booksStore.subscribe(() => {
    const curr = booksStore.getState().progress;
    if (Object.is(curr, prev)) return;
    prev = curr;
    saveJson(PROGRESS_KEY, curr);
  });
}
{
  let prev = booksStore.getState().activeBookId;
  booksStore.subscribe(() => {
    const curr = booksStore.getState().activeBookId;
    if (Object.is(curr, prev)) return;
    prev = curr;
    saveJson(ACTIVE_KEY, curr);
  });
}

/* ── Actions ─────────────────────────────────────────────────────────────── */

export const booksActions = {
  async importBook(file: File) {
    booksStore.set({ importing: true, importError: null });
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsed;
      if (ext === 'epub') parsed = await parseEpub(file);
      else if (ext === 'txt' || ext === 'md') parsed = await parseTxt(file);
      else throw new Error(`Unsupported format: .${ext}`);

      const book: Book = {
        id: `book-${Date.now()}`,
        title: parsed.title,
        author: parsed.author,
        format: ext === 'epub' ? 'epub' : 'txt',
        chapters: parsed.chapters,
        addedAt: new Date().toISOString(),
      };
      const initialProgress: ReadingProgress = {
        bookId: book.id,
        chapterId: book.chapters[0]?.id ?? '',
        position: 0,
      };
      booksStore.update(s => ({
        ...s,
        books: [book, ...s.books],
        activeBookId: book.id,
        progress: initialProgress,
      }));
      // Persist immediately — protects against tab close before debounce flushes.
      saveJson(BOOKS_KEY,    booksStore.getState().books);
      saveJson(ACTIVE_KEY,   book.id);
      saveJson(PROGRESS_KEY, initialProgress);
    } catch (e) {
      booksStore.set({ importError: e instanceof Error ? e.message : 'Import failed' });
    } finally {
      booksStore.set({ importing: false });
    }
  },

  selectBook(bookId: string) {
    booksStore.set({ activeBookId: bookId });
  },

  clearActive() {
    booksStore.set({ activeBookId: null });
  },

  removeBook(bookId: string) {
    booksStore.update(s => ({
      ...s,
      books:        s.books.filter(b => b.id !== bookId),
      bookmarks:    s.bookmarks.filter(b => b.bookId !== bookId),
      activeBookId: s.activeBookId === bookId ? null : s.activeBookId,
    }));
    // Persist eagerly to keep keys in sync if user closes the tab.
    const next = booksStore.getState();
    saveJson(BOOKS_KEY,     next.books);
    saveJson(BOOKMARKS_KEY, next.bookmarks);
    saveJson(ACTIVE_KEY,    next.activeBookId);
  },

  saveProgress(bookId: string, chapterId: string, position: number) {
    booksStore.set({ progress: { bookId, chapterId, position } });
  },

  addBookmark(bookId: string, chapterId: string, position: number, label: string) {
    const bm: BookMark = {
      id: `bm-${Date.now()}`,
      bookId, chapterId, position, label,
      createdAt: new Date().toISOString(),
    };
    booksStore.update(s => ({ ...s, bookmarks: [bm, ...s.bookmarks] }));
  },

  removeBookmark(id: string) {
    booksStore.update(s => ({ ...s, bookmarks: s.bookmarks.filter(b => b.id !== id) }));
  },
};

/* ── Selectors ───────────────────────────────────────────────────────────── */

export const booksSelectors = {
  activeBook(s: BooksState): Book | null {
    return s.books.find(b => b.id === s.activeBookId) ?? null;
  },
  activeBookProgress(s: BooksState): ReadingProgress | null {
    return s.progress?.bookId === s.activeBookId ? s.progress : null;
  },
  activeBookmarks(s: BooksState): BookMark[] {
    if (!s.activeBookId) return [];
    return s.bookmarks.filter(b => b.bookId === s.activeBookId);
  },
};
