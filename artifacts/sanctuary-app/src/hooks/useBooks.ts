/**
 * useBooks — facade over `booksStore`. Returns the same shape the old hook did,
 * plus memoized derived values for the active book / its bookmarks / its progress.
 */

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { booksStore, booksActions, booksSelectors, type BooksState } from '@/stores/booksStore';

const pickAll = (s: BooksState) => s;

export function useBooks() {
  const s = useStore(booksStore, pickAll);

  const activeBook      = useMemo(() => booksSelectors.activeBook(s),         [s]);
  const activeBookmarks = useMemo(() => booksSelectors.activeBookmarks(s),    [s]);
  const progress        = useMemo(() => booksSelectors.activeBookProgress(s), [s]);

  return {
    books:          s.books,
    activeBook,
    activeBookId:   s.activeBookId,
    bookmarks:      s.bookmarks,
    activeBookmarks,
    progress,
    importing:      s.importing,
    importError:    s.importError,
    importBook:     booksActions.importBook,
    selectBook:     booksActions.selectBook,
    removeBook:     booksActions.removeBook,
    saveProgress:   booksActions.saveProgress,
    addBookmark:    booksActions.addBookmark,
    removeBookmark: booksActions.removeBookmark,
  };
}
