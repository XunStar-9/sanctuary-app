/**
 * useSwipe — pointer-based swipe gesture detector.
 *
 * Why a custom hook instead of a library?
 *  - We need exactly four directional callbacks (left/right/up/down) with a
 *    distance threshold.
 *  - We need to coexist with an `onClick` handler on the same element: if the
 *    pointer barely moves before pointerup, we let the click fire normally;
 *    otherwise we suppress it.
 *  - No external dep.
 *
 * Returned object:
 *   { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture, dragDx }
 *
 * Spread it onto the element you want to listen on. The `onClickCapture`
 * handler is what swallows the synthetic click after a real swipe so the
 * underlying onClick (e.g. expand/collapse) doesn't also fire.
 *
 * `dragDx` is exposed so the consumer can show a visual translate during the
 * swipe (used by the dock to nudge the cover horizontally as the user drags).
 */

import { useRef, useState, useCallback } from 'react';

export type SwipeOptions = {
  onSwipeLeft?:  () => void;
  onSwipeRight?: () => void;
  onSwipeUp?:    () => void;
  onSwipeDown?:  () => void;
  /** Minimum horizontal distance to fire left/right callbacks. Default 60. */
  thresholdX?: number;
  /** Minimum vertical distance to fire up/down callbacks. Default 40. */
  thresholdY?: number;
  /**
   * Movement under this many px (in either axis) is treated as a click,
   * not a swipe. Default 8.
   */
  clickSlop?: number;
  /**
   * If true, only horizontal swipes are detected (vertical movement is treated
   * as a normal scroll and not consumed). Default false.
   */
  horizontalOnly?: boolean;
};

export function useSwipe({
  onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown,
  thresholdX = 60, thresholdY = 40, clickSlop = 8,
  horizontalOnly = false,
}: SwipeOptions) {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const wasSwipeRef = useRef(false);
  const [dragDx, setDragDx] = useState(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Ignore right-clicks and middle-clicks.
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    wasSwipeRef.current = false;
    setDragDx(0);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    // Live feedback: only show horizontal nudge while horizontal motion dominates.
    if (Math.abs(dx) > Math.abs(dy)) {
      // Rubber-band: clamp so it never feels infinite.
      setDragDx(Math.max(-100, Math.min(100, dx * 0.6)));
    }
  }, []);

  const finish = useCallback((e: React.PointerEvent) => {
    const start = startRef.current;
    startRef.current = null;
    setDragDx(0);
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Pure click — let it through.
    if (adx < clickSlop && ady < clickSlop) {
      wasSwipeRef.current = false;
      return;
    }

    // Decide axis: whichever moved more wins.
    if (adx > ady) {
      if (adx >= thresholdX) {
        wasSwipeRef.current = true;
        if (dx < 0) onSwipeLeft?.();
        else        onSwipeRight?.();
      }
    } else if (!horizontalOnly) {
      if (ady >= thresholdY) {
        wasSwipeRef.current = true;
        if (dy < 0) onSwipeUp?.();
        else        onSwipeDown?.();
      }
    }
  }, [clickSlop, thresholdX, thresholdY, horizontalOnly, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  const onPointerCancel = useCallback(() => {
    startRef.current = null;
    setDragDx(0);
  }, []);

  /**
   * Capture-phase click handler: if the pointerup that just finished was
   * recognized as a swipe, swallow the synthetic click so consumers' onClick
   * doesn't also fire.
   */
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (wasSwipeRef.current) {
      e.stopPropagation();
      e.preventDefault();
      wasSwipeRef.current = false;
    }
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp:     finish,
    onPointerCancel,
    onClickCapture,
    dragDx,
  };
}
