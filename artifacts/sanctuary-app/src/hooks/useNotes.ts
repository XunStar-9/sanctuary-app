import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Note } from '@/lib/types';
import { DEFAULT_NOTES } from '@/lib/types';

function loadNotes(): Note[] {
  const saved = localStorage.getItem('sanctuary_notes');
  if (saved) { try { return JSON.parse(saved) as Note[]; } catch { /* fall through */ } }
  return DEFAULT_NOTES;
}

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric',
});

const initialNotes = loadNotes();

export function useNotes() {
  const [notes,        setNotes]        = useState<Note[]>(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string>(initialNotes[0]?.id ?? '');
  const [searchQuery,  setSearchQuery]  = useState('');

  const saveTimer = useRef(0);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      localStorage.setItem('sanctuary_notes', JSON.stringify(notes));
    }, 300);
    return () => clearTimeout(saveTimer.current);
  }, [notes]);

  const activeNote = useMemo(
    () => notes.find(n => n.id === activeNoteId) ?? notes[0] ?? null,
    [notes, activeNoteId],
  );

  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  const handleAddNote = useCallback(() => {
    const n: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      date: DATE_FMT.format(new Date()),
      preview: '',
      content: '',
    };
    setNotes(prev => [n, ...prev]);
    setActiveNoteId(n.id);
  }, []);

  const updateActiveNote = useCallback((updates: Partial<Note>) => {
    setNotes(prev => prev.map(n =>
      n.id === activeNoteId ? { ...n, ...updates } : n
    ));
  }, [activeNoteId]);

  return {
    notes, activeNote, activeNoteId, setActiveNoteId,
    searchQuery, setSearchQuery,
    filteredNotes, handleAddNote, updateActiveNote,
  };
}
