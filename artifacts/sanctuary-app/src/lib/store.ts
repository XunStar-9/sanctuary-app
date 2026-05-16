/**
 * Tiny, dependency-free store built on `useSyncExternalStore`.
 *
 * Why not Zustand / Redux / Jotai?
 *  - We don't want to add a runtime dep for a small SPA.
 *  - This file is ~80 lines and gives us:
 *      • selector-based subscriptions (granular re-renders)
 *      • optional localStorage persistence with debounce
 *      • framework-free `getState` for non-React code (e.g. AudioEngine)
 *
 * Usage:
 *   const counter = createStore({ n: 0 });
 *   const n = useStore(counter, s => s.n);
 *   counter.set({ n: 1 });
 *   counter.update(s => ({ n: s.n + 1 }));
 */

import { useSyncExternalStore, useRef, useCallback } from 'react';

export type Listener = () => void;

export type Store<T> = {
  getState: () => T;
  set: (partial: Partial<T> | ((s: T) => Partial<T>)) => void;
  update: (updater: (s: T) => T) => void;
  subscribe: (listener: Listener) => () => void;
};

export function createStore<T extends object>(initial: T): Store<T> {
  let state: T = initial;
  const listeners = new Set<Listener>();

  const getState = () => state;

  const setState = (next: T) => {
    if (Object.is(next, state)) return;
    state = next;
    // Snapshot listeners so subscribers added during notification
    // don't get fired this round, and removed ones won't be called.
    const snapshot = Array.from(listeners);
    for (const l of snapshot) l();
  };

  const set: Store<T>['set'] = (partial) => {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    setState({ ...state, ...patch });
  };

  const update: Store<T>['update'] = (updater) => {
    setState(updater(state));
  };

  const subscribe: Store<T>['subscribe'] = (listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  return { getState, set, update, subscribe };
}

/** Subscribe to a slice of a store. Re-renders only when selector output changes (Object.is). */
export function useStore<T, U>(store: Store<T>, selector: (s: T) => U): U {
  // Stable getSnapshot memoizes the latest selector output to avoid the
  // "getSnapshot should be cached" warning from React when selectors
  // produce object references.
  const lastSnapRef = useRef<{ value: U; state: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const state = store.getState();
    const last = lastSnapRef.current;
    if (last && Object.is(last.state, state)) return last.value;
    const value = selector(state);
    if (last && Object.is(last.value, value)) {
      lastSnapRef.current = { value: last.value, state };
      return last.value;
    }
    lastSnapRef.current = { value, state };
    return value;
  }, [store, selector]);

  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

/* ── Persistence helpers ─────────────────────────────────────────────────── */

type PersistOptions<T> = {
  key: string;
  /** Pick which fields to persist (default: full state). */
  pick?: (s: T) => unknown;
  /** Custom revival when reading from storage. */
  hydrate?: (raw: unknown, fallback: T) => T;
  /** Debounce writes (default 200ms). */
  debounceMs?: number;
};

export function persist<T extends object>(store: Store<T>, opts: PersistOptions<T>): void {
  // 1. Hydrate
  try {
    const raw = localStorage.getItem(opts.key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      const next = opts.hydrate
        ? opts.hydrate(parsed, store.getState())
        : { ...store.getState(), ...parsed };
      store.set(next);
    }
  } catch { /* corrupted entry — ignore and keep defaults */ }

  // 2. Subscribe & write
  let timer = 0;
  const delay = opts.debounceMs ?? 200;
  store.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      try {
        const value = opts.pick ? opts.pick(store.getState()) : store.getState();
        localStorage.setItem(opts.key, JSON.stringify(value));
      } catch { /* quota exceeded — drop silently */ }
    }, delay);
  });
}

/** Subscribe imperatively (for non-React code or one-shot side effects). */
export function subscribeKey<T, K>(
  store: Store<T>,
  selector: (s: T) => K,
  callback: (value: K, prev: K) => void,
): () => void {
  let prev = selector(store.getState());
  return store.subscribe(() => {
    const next = selector(store.getState());
    if (!Object.is(next, prev)) {
      const old = prev;
      prev = next;
      callback(next, old);
    }
  });
}
