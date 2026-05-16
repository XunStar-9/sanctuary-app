/**
 * Sleep timer store
 *
 * Two mutually exclusive countdown modes:
 *   • minutes-based — ticks every second; pause when remainingSecs reaches 0
 *   • track-based   — pauses after N more tracks finish (decremented in the
 *                     audio engine's `ended` handler)
 *
 * The store owns its own setInterval. We don't persist sleep timer state to
 * localStorage — a sleep timer that survives a tab restart would be surprising
 * UX (the user closed the tab, they almost certainly want quiet).
 *
 * To avoid an import cycle (audioEngine imports nothing from this module, but
 * this module wants to *call* audioEngine.pause), we resolve the engine via a
 * lazy dynamic import on the timer-fired path. That path runs at most once per
 * timer expiry, so the cost is negligible.
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

function clearTick() {
  if (tickHandle !== null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
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
 */
void (async () => {
  try {
    const mod = await import('@/stores/audioEngine');
    mod.audioEngine.registerEndOfTrackHook(() => sleepTimerActions.onTrackEnded());
  } catch { /* engine not available — skip */ }
})();

function startTicking() {
  if (tickHandle !== null) return;
  tickHandle = window.setInterval(() => {
    const { remainingSecs } = sleepTimerStore.getState();
    if (remainingSecs === null) { clearTick(); return; }
    const next = remainingSecs - 1;
    if (next <= 0) {
      clearTick();
      sleepTimerStore.set({ remainingSecs: null, tracksRemaining: null });
      pauseAudio();
    } else {
      sleepTimerStore.set({ remainingSecs: next });
    }
  }, 1000);
}

export const sleepTimerActions = {
  /** Schedule pause in `minutes` minutes. Replaces any existing timer. */
  setMinutes(minutes: number) {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      this.cancel();
      return;
    }
    clearTick();
    sleepTimerStore.set({
      remainingSecs: Math.round(minutes * 60),
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
