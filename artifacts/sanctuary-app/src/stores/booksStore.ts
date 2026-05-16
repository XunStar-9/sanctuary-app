/**
 * Books store — library, bookmarks, reading progress.
 *
 * Uses the `persist()` helper with a custom `pick` to save only the four data
 * fields (books, bookmarks, progress, activeBookId) while skipping ephemeral
 * UI state (importing, importError).
 *
 * Backwards-compatible: reads the four legacy localStorage keys on first load
 * (one-time migration), then persists everything under a single new key.
 */

import type { Book, BookMark, ReadingProgress } from '@/lib/types';
import { parseTxt, parseEpub } from '@/utils/bookParser';
import { createStore, persist } from '@/lib/store';

const STORAGE_KEY = 'sanctuary_books_v2';

// Legacy keys (read-only, for one-time migration).
const LEGACY_BOOKS_KEY     = 'sanctuary_books';
const LEGACY_BOOKMARKS_KEY = 'sanctuary_bookmarks';
const LEGACY_PROGRESS_KEY  = 'sanctuary_reading_progress';
const LEGACY_ACTIVE_KEY    = 'sanctuary_active_book';

export type BooksState = {
  books: Book[];
  bookmarks: BookMark[];
  progress: ReadingProgress | null;
  activeBookId: string | null;
  importing: boolean;
  importError: string | null;
};

/** Persisted subset — excludes ephemeral fields. */
type PersistedBooks = Pick<BooksState, 'books' | 'bookmarks' | 'progress' | 'activeBookId'>;

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

/** One-shot migration from 4 separate keys → single consolidated key. */
function migrateLegacy(): Partial<PersistedBooks> | null {
  // If new key already exists, skip migration.
  if (localStorage.getItem(STORAGE_KEY) !== null) return null;
  const books     = loadJson<Book[]>(LEGACY_BOOKS_KEY, []);
  const bookmarks = loadJson<BookMark[]>(LEGACY_BOOKMARKS_KEY, []);
  const progress  = loadJson<ReadingProgress | null>(LEGACY_PROGRESS_KEY, null);
  const activeBookId = loadJson<string | null>(LEGACY_ACTIVE_KEY, null);
  // Only return if there's actual data to migrate.
  if (!books.length && !bookmarks.length && !progress && !activeBookId) return null;
  return { books, bookmarks, progress, activeBookId };
}

const legacy = migrateLegacy();

export const booksStore = createStore<BooksState>({
  books:        legacy?.books ?? [],
  bookmarks:    legacy?.bookmarks ?? [],
  progress:     legacy?.progress ?? null,
  activeBookId: legacy?.activeBookId ?? null,
  importing:    false,
  importError:  null,
});

// Persist using the standard helper — debounced 300ms, only data fields.
persist(booksStore, {
  key: STORAGE_KEY,
  pick: (s): PersistedBooks => ({
    books: s.books,
    bookmarks: s.bookmarks,
    progress: s.progress,
    activeBookId: s.activeBookId,
  }),
  hydrate: (raw, fallback) => {
    if (typeof raw !== 'object' || raw === null) return fallback;
    const data = raw as Partial<PersistedBooks>;
    return {
      ...fallback,
      books:        Array.isArray(data.books) ? data.books : fallback.books,
      bookmarks:    Array.isArray(data.bookmarks) ? data.bookmarks : fallback.bookmarks,
      progress:     data.progress ?? fallback.progress,
      activeBookId: data.activeBookId ?? fallback.activeBookId,
    };
  },
  debounceMs: 300,
});

// Self-heal: drop active id if it's stale.
{
  const s = booksStore.getState();
  if (s.activeBookId && !s.books.some(b => b.id === s.activeBookId)) {
    booksStore.set({ activeBookId: null });
  }
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

/** Cache for `bookmarkCountMap` — keyed by the bookmarks array reference so
 *  that consumers using `useStore(booksStore, s => booksSelectors.bookmarkCountMap(s))`
 *  get a stable Map and only re-render when bookmarks actually change. */
let _bmCountCache: { src: BookMark[]; map: Map<string, number> } | null = null;

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
  /** Pre-computed bookmark count map: { bookId → count }. O(bookmarks) once;
   *  the result is memoized by bookmark-array identity so React selectors
   *  don't see a fresh Map on every store change. */
  bookmarkCountMap(s: BooksState): Map<string, number> {
    if (_bmCountCache && _bmCountCache.src === s.bookmarks) return _bmCountCache.map;
    const map = new Map<string, number>();
    for (const bm of s.bookmarks) {
      map.set(bm.bookId, (map.get(bm.bookId) ?? 0) + 1);
    }
    _bmCountCache = { src: s.bookmarks, map };
    return map;
  },
};
