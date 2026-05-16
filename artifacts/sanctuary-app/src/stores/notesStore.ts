/**
 * Notes store
 *
 * Replaces the old `useNotes` hook. Logic:
 *  - notes[] persisted to `sanctuary_notes`
 *  - activeNoteId persisted to `sanctuary_active_note`
 *  - searchQuery is ephemeral (not persisted)
 *
 * If activeNoteId points to a missing note, we auto-correct on hydrate.
 */

import type { Note } from '@/lib/types';
import { DEFAULT_NOTES } from '@/lib/types';
import { createStore, persist } from '@/lib/store';

export type NotesState = {
  notes: Note[];
  activeNoteId: string;
  searchQuery: string;
};

const PREVIEW_LIMIT = 80;
const NOTES_KEY = 'sanctuary_notes';
const ACTIVE_KEY = 'sanctuary_active_note';

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric',
});

function makePreview(content: string): string {
  const stripped = content.replace(/[*_=]/g, '');
  return stripped.length > PREVIEW_LIMIT
    ? stripped.substring(0, PREVIEW_LIMIT) + '...'
    : stripped;
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Note[];
    }
  } catch { /* corrupted entry */ }
  return DEFAULT_NOTES;
}

function loadActiveId(notes: Note[]): string {
  const raw = localStorage.getItem(ACTIVE_KEY) ?? '';
  if (raw && notes.some(n => n.id === raw)) return raw;
  return notes[0]?.id ?? '';
}

const initialNotes = loadNotes();
const initialActive = loadActiveId(initialNotes);

export const notesStore = createStore<NotesState>({
  notes: initialNotes,
  activeNoteId: initialActive,
  searchQuery: '',
});

// Persist notes (debounced) — only when the notes array actually changes.
let lastNotes = initialNotes;
let notesTimer = 0;
function flushNotes() {
  if (!notesTimer) return;
  clearTimeout(notesTimer);
  notesTimer = 0;
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(lastNotes)); } catch { /* quota */ }
}
notesStore.subscribe(() => {
  const cur = notesStore.getState().notes;
  if (cur === lastNotes) return;
  lastNotes = cur;
  if (notesTimer) clearTimeout(notesTimer);
  notesTimer = window.setTimeout(() => {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(cur)); } catch { /* quota */ }
    notesTimer = 0;
  }, 300);
});
// Flush pending writes on page hide so a tab close doesn't lose the user's
// most recent edits. `pagehide` is more reliable than `beforeunload` on mobile.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushNotes);
}

// Persist active note id eagerly (cheap, single string).
let lastActive = initialActive;
notesStore.subscribe(() => {
  const id = notesStore.getState().activeNoteId;
  if (id !== lastActive) {
    lastActive = id;
    try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* quota */ }
  }
});

/* ── Actions ─────────────────────────────────────────────────────────────── */

export const notesActions = {
  setActiveNoteId: (id: string) => notesStore.set({ activeNoteId: id }),
  setSearchQuery:  (q: string)  => notesStore.set({ searchQuery: q }),

  addNote(): string {
    const note: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      date: DATE_FMT.format(new Date()),
      preview: '',
      content: '',
    };
    notesStore.update(s => ({ ...s, notes: [note, ...s.notes], activeNoteId: note.id }));
    return note.id;
  },

  /** Patch the currently active note. Auto-recomputes preview/date. */
  updateActiveNote(updates: Partial<Note>) {
    notesStore.update(s => {
      const id = s.activeNoteId;
      if (!id) return s;
      const date = DATE_FMT.format(new Date());
      return {
        ...s,
        notes: s.notes.map(n => {
          if (n.id !== id) return n;
          const next: Note = { ...n, ...updates, date };
          if (updates.content !== undefined) next.preview = makePreview(updates.content);
          return next;
        }),
      };
    });
  },

  deleteNote(id: string) {
    notesStore.update(s => {
      const idx = s.notes.findIndex(n => n.id === id);
      if (idx === -1) return s;
      const nextNotes = s.notes.filter(n => n.id !== id);
      let nextActive = s.activeNoteId;
      if (id === s.activeNoteId) {
        nextActive = nextNotes[Math.min(idx, nextNotes.length - 1)]?.id ?? '';
      }
      return { ...s, notes: nextNotes, activeNoteId: nextActive };
    });
  },
};

/* ── Selectors (used by the React layer for memoization) ─────────────────── */

export const notesSelectors = {
  filtered(s: NotesState): Note[] {
    if (!s.searchQuery) return s.notes;
    const q = s.searchQuery.toLowerCase();
    return s.notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  },

  activeNote(s: NotesState): Note | null {
    return s.notes.find(n => n.id === s.activeNoteId) ?? s.notes[0] ?? null;
  },
};

/** Self-heal: if active id no longer exists in notes, fix it. */
notesStore.subscribe(() => {
  const s = notesStore.getState();
  if (s.notes.length && !s.notes.some(n => n.id === s.activeNoteId)) {
    notesStore.set({ activeNoteId: s.notes[0].id });
  }
});
