/**
 * useBooks — facade over `booksStore` with granular selectors.
 *
 * Each field subscribes independently so that e.g. a progress update doesn't
 * re-render consumers that only read the book list. Components that need only
 * one or two fields should subscribe directly via `useStore(booksStore, …)`.
 */

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { booksStore, booksActions, booksSelectors } from '@/stores/booksStore';

export function useBooks() {
  const books        = useStore(booksStore, s => s.books);
  const bookmarks    = useStore(booksStore, s => s.bookmarks);
  const progress     = useStore(booksStore, s => s.progress);
  const activeBookId = useStore(booksStore, s => s.activeBookId);
  const importing    = useStore(booksStore, s => s.importing);
  const importError  = useStore(booksStore, s => s.importError);

  const activeBook = useMemo(
    () => books.find(b => b.id === activeBookId) ?? null,
    [books, activeBookId],
  );

  const activeBookmarks = useMemo(
    () => activeBookId ? bookmarks.filter(b => b.bookId === activeBookId) : [],
    [bookmarks, activeBookId],
  );

  const activeProgress = useMemo(
    () => progress?.bookId === activeBookId ? progress : null,
    [progress, activeBookId],
  );

  return {
    books,
    activeBook,
    activeBookId,
    bookmarks,
    activeBookmarks,
    progress: activeProgress,
    importing,
    importError,
    importBook:     booksActions.importBook,
    selectBook:     booksActions.selectBook,
    removeBook:     booksActions.removeBook,
    saveProgress:   booksActions.saveProgress,
    addBookmark:    booksActions.addBookmark,
    removeBookmark: booksActions.removeBookmark,
  };
}
