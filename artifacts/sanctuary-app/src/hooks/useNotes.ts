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

export function useNotes() {
  const [notes,        setNotes]        = useState<Note[]>(loadNotes);
  const [activeNoteId, setActiveNoteId] = useState<string>(() => {
    const saved = localStorage.getItem('sanctuary_active_note');
    if (saved) return saved;
    const loaded = loadNotes();
    return loaded[0]?.id ?? '';
  });
  const [searchQuery,  setSearchQuery]  = useState('');

  const activeNoteIdRef = useRef(activeNoteId);
  activeNoteIdRef.current = activeNoteId;

  const saveTimer = useRef(0);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      localStorage.setItem('sanctuary_notes', JSON.stringify(notes));
    }, 300);
    return () => clearTimeout(saveTimer.current);
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('sanctuary_active_note', activeNoteId);
  }, [activeNoteId]);

  useEffect(() => {
    if (notes.length && !notes.some(n => n.id === activeNoteId)) {
      setActiveNoteId(notes[0].id);
    }
  }, [notes, activeNoteId]);

  const activeNote = useMemo(
    () => notes.find(n => n.id === activeNoteId) ?? notes[0] ?? null,
    [notes, activeNoteId],
  );

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
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
      n.id === activeNoteIdRef.current
        ? { ...n, ...updates, date: DATE_FMT.format(new Date()) }
        : n
    ));
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    setNotes(prev => {
      const next = prev.filter(n => n.id !== id);
      if (id === activeNoteIdRef.current) {
        const idx = prev.findIndex(n => n.id === id);
        const newActive = next[Math.min(idx, next.length - 1)]?.id ?? '';
        setActiveNoteId(newActive);
      }
      return next;
    });
  }, []);

  return {
    notes, activeNote, activeNoteId, setActiveNoteId,
    searchQuery, setSearchQuery,
    filteredNotes, handleAddNote, updateActiveNote, handleDeleteNote,
  };
}
