/**
 * Sleep timer store
 *
 * Two mutually exclusive countdown modes:
 *   • minutes-based — pauses when the wall-clock target time is reached.
 *   • track-based   — pauses after N more tracks finish (decremented in the
 *                     audio engine's `ended` handler).
 *
 * Drift handling: rather than just decrementing `remainingSecs` in
 * `setInterval(..., 1000)` (which browsers throttle aggressively to ≥1s
 * intervals when the tab is in the background — sometimes much longer), we
 * store the wall-clock `deadline` and recompute `remainingSecs` from
 * `deadline - Date.now()` each tick. We also re-sync on `visibilitychange`
 * so the user sees the correct countdown the moment they switch back.
 *
 * The store owns its own setInterval. We don't persist sleep timer state to
 * localStorage — a sleep timer that survives a tab restart would be surprising
 * UX (the user closed the tab, they almost certainly want quiet).
 */

import { createStore } from '@/lib/store';

export type SleepTimerState = {
  /** Remaining seconds for minute-based mode, or null when not in this mode. */
  remainingSecs: number | null;
  /** Remaining tracks for track-based mode, or null when not in this mode. */
  tracksRemaining: number | null;
};

export const sleepTimerStore = createStore<SleepTimerState>({
  remainingSecs: null,
  tracksRemaining: null,
});

let tickHandle: number | null = null;
/** Wall-clock target (ms since epoch) for minute-based mode. */
let deadline: number | null = null;

function clearTick() {
  if (tickHandle !== null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
  deadline = null;
}

/** Pause via the audio engine. Lazy-loaded to break the import cycle. */
async function pauseAudio() {
  try {
    const mod = await import('@/stores/audioEngine');
    mod.audioEngine.pause();
  } catch { /* engine not available — nothing to do */ }
}

/**
 * Register an end-of-track hook on the audio engine. The hook decrements
 * tracksRemaining (when applicable) and asks the engine to suppress its
 * auto-advance when the timer just expired.
 *
 * We register lazily once at module init via dynamic import to keep the
 * audioEngine module free of any sleepTimer dependency (preventing a cycle
 * through historyStore → audioEngine → sleepTimer → audioEngine).
 *
 * In dev with Vite HMR, this module can re-execute. The audioEngine module is
 * itself a singleton; re-registering would queue a second hook. The hook
 * registry doesn't dedupe by reference, but since each new hook closure calls
 * the same `sleepTimerActions.onTrackEnded` (which is idempotent in its no-op
 * case — returns false when no timer), a stale hook is harmless. To be tidy
 * we still keep an `unregister` reference so future code could clean it up.
 */
let unregisterEndHook: (() => void) | null = null;
void (async () => {
  try {
    const mod = await import('@/stores/audioEngine');
    unregisterEndHook = mod.audioEngine.registerEndOfTrackHook(
      () => sleepTimerActions.onTrackEnded(),
    );
  } catch { /* engine not available — skip */ }
})();
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clearTick();
    unregisterEndHook?.();
  });
}

function tick() {
  if (deadline === null) { clearTick(); return; }
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) {
    clearTick();
    sleepTimerStore.set({ remainingSecs: null, tracksRemaining: null });
    pauseAudio();
    return;
  }
  const next = Math.ceil(remainingMs / 1000);
  if (next !== sleepTimerStore.getState().remainingSecs) {
    sleepTimerStore.set({ remainingSecs: next });
  }
}

function startTicking() {
  if (tickHandle !== null) return;
  tickHandle = window.setInterval(tick, 1000);
}

// Re-sync whenever the tab becomes visible again. Without this the displayed
// countdown could be many seconds off after a long background period.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && deadline !== null) tick();
  });
}

export const sleepTimerActions = {
  /** Schedule pause in `minutes` minutes. Replaces any existing timer. */
  setMinutes(minutes: number) {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      this.cancel();
      return;
    }
    clearTick();
    const secs = Math.round(minutes * 60);
    deadline = Date.now() + secs * 1000;
    sleepTimerStore.set({
      remainingSecs: secs,
      tracksRemaining: null,
    });
    startTicking();
  },

  /** Schedule pause after `tracks` more tracks finish. */
  setTracks(tracks: number) {
    if (!Number.isInteger(tracks) || tracks <= 0) {
      this.cancel();
      return;
    }
    clearTick();
    sleepTimerStore.set({
      remainingSecs: null,
      tracksRemaining: tracks,
    });
  },

  cancel() {
    clearTick();
    sleepTimerStore.set({ remainingSecs: null, tracksRemaining: null });
  },

  /**
   * Called by the audio engine on each `ended` event. If track-based mode is
   * active, decrement and (if zero) request a pause and clear state.
   *
   * Returns `true` when the timer just expired, so the engine can suppress
   * the auto-advance for that one transition (otherwise the next track would
   * start playing for a moment before being paused).
   */
  onTrackEnded(): boolean {
    const { tracksRemaining } = sleepTimerStore.getState();
    if (tracksRemaining === null || tracksRemaining <= 0) return false;
    const next = tracksRemaining - 1;
    if (next <= 0) {
      sleepTimerStore.set({ remainingSecs: null, tracksRemaining: null });
      pauseAudio();
      return true;
    }
    sleepTimerStore.set({ tracksRemaining: next });
    return false;
  },
};

/** Format remainingSecs as "MM:SS" or null. */
export function formatSleepCountdown(secs: number | null): string | null {
  if (secs === null || !Number.isFinite(secs) || secs <= 0) return null;
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
