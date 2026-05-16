/**
 * useNotes — facade over `notesStore`. Memoizes derived `filteredNotes` and
 * `activeNote` with selectors so consumers don't recompute on every render.
 */

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { notesStore, notesActions, notesSelectors, type NotesState } from '@/stores/notesStore';

const pickNotes        = (s: NotesState) => s.notes;
const pickActiveId     = (s: NotesState) => s.activeNoteId;
const pickSearch       = (s: NotesState) => s.searchQuery;

export function useNotes() {
  const notes = useStore(notesStore, pickNotes);
  const activeNoteId = useStore(notesStore, pickActiveId);
  const searchQuery = useStore(notesStore, pickSearch);

  const filteredNotes = useMemo(
    () => notesSelectors.filtered({ notes, activeNoteId, searchQuery }),
    [notes, searchQuery, activeNoteId],
  );

  const activeNote = useMemo(
    () => notesSelectors.activeNote({ notes, activeNoteId, searchQuery }),
    [notes, activeNoteId, searchQuery],
  );

  return {
    notes,
    activeNote,
    activeNoteId,
    searchQuery,
    filteredNotes,
    setActiveNoteId:  notesActions.setActiveNoteId,
    setSearchQuery:   notesActions.setSearchQuery,
    handleAddNote:    notesActions.addNote,
    updateActiveNote: notesActions.updateActiveNote,
    handleDeleteNote: notesActions.deleteNote,
  };
}
