/**
 * Listening history store
 *
 * Records "real" plays — defined as a track that the user has listened to for
 * at least 30 seconds. The audio engine drives the recording via a private
 * 30-second threshold check; this store just owns the data shape, persistence,
 * and dedup rules.
 *
 * Schema:
 *   entries: HistoryEntry[]  // newest first, capped at MAX_ENTRIES
 *
 * Dedup:
 *   - If the same song is recorded again, the existing entry is moved to the
 *     top with a fresh timestamp (rather than duplicating). This keeps the
 *     "Recent" view useful: you see the most recently played songs, not 50
 *     copies of the same one if a track loops with repeat.
 *
 * Persistence:
 *   - localStorage key: `sanctuary_history`
 *   - Debounced via the persist() helper (200ms default) so rapid skipping
 *     doesn't hammer storage.
 */

import { createStore, persist } from '@/lib/store';
import type { Song } from '@/lib/types';

const MAX_ENTRIES = 50;
const STORAGE_KEY = 'sanctuary_history';

export type HistoryEntry = {
  songId: string;
  title: string;
  artist: string;
  duration: string;
  durationSecs: number;
  gradient: string;
  isUploaded?: boolean;
  /** Timestamp (ms since epoch) of the most recent play that crossed 30s. */
  playedAt: number;
};

export type HistoryState = {
  entries: HistoryEntry[];
};

export const historyStore = createStore<HistoryState>({ entries: [] });

persist(historyStore, {
  key: STORAGE_KEY,
  hydrate: (raw, fallback) => {
    if (typeof raw !== 'object' || raw === null) return fallback;
    const obj = raw as Partial<HistoryState>;
    if (!Array.isArray(obj.entries)) return fallback;
    // Cap restored entries (in case we ever lower MAX_ENTRIES) and drop bad
    // shapes silently — defensive against older formats.
    const cleaned: HistoryEntry[] = [];
    for (const e of obj.entries.slice(0, MAX_ENTRIES)) {
      if (!e || typeof e !== 'object') continue;
      const en = e as HistoryEntry;
      if (typeof en.songId !== 'string' || typeof en.playedAt !== 'number') continue;
      cleaned.push(en);
    }
    return { entries: cleaned };
  },
});

export const historyActions = {
  /**
   * Record a song as "played" (called by the audio engine once playback for
   * a given track passes the 30 s threshold).
   */
  recordPlay(song: Song) {
    if (!song?.id) return;
    const entry: HistoryEntry = {
      songId:       song.id,
      title:        song.title,
      artist:       song.artist,
      duration:     song.duration,
      durationSecs: song.durationSecs,
      gradient:     song.gradient,
      isUploaded:   song.isUploaded,
      playedAt:     Date.now(),
    };
    historyStore.update(s => {
      // Drop any earlier entry for the same song so the song bubbles to top.
      const filtered = s.entries.filter(e => e.songId !== entry.songId);
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
      return { entries: next };
    });
  },

  /** Remove a single entry (e.g. user deletes from Recent list). */
  remove(songId: string) {
    historyStore.update(s => ({ entries: s.entries.filter(e => e.songId !== songId) }));
  },

  /** Clear all history. */
  clear() {
    historyStore.set({ entries: [] });
  },
};
