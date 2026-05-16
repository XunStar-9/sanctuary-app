/**
 * SelectionToolbar — floating bold/italic/highlight bar above a text selection.
 *
 * Visually identical to the previous implementation; minor cleanup:
 *  - Memoized clamp computation.
 *  - Pulled the inline ToolBtn into a typed sub-component.
 *  - useEffect now uses requestAnimationFrame instead of setTimeout(100) so
 *    we still skip the same click that opened us, but we resolve a frame later
 *    rather than waiting an arbitrary 100 ms.
 */

import { useEffect, useRef, memo, useMemo } from 'react';

type Props = {
  x: number;
  y: number;
  isBold: boolean;
  isItalic: boolean;
  isHighlight: boolean;
  onBold: () => void;
  onItalic: () => void;
  onHighlight: () => void;
  onClear: () => void;
  onDismiss: () => void;
};

const TOOLBAR_W = 220;
const TOOLBAR_H = 44;
const GAP = 10;

function ToolBtn({ label, active, title, onClick }: {
  label: string; active: boolean; title: string; onClick: () => void;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`
        px-3 py-2 text-sm rounded-lg transition-all duration-150 select-none active:scale-90
        ${active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground'}
      `}
    >
      {label}
    </button>
  );
}

export const SelectionToolbar = memo(function SelectionToolbar({
  x, y, isBold, isItalic, isHighlight,
  onBold, onItalic, onHighlight, onClear, onDismiss,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const { left, top, arrowLeft, arrowOnTop } = useMemo(() => {
    const l = Math.max(GAP, Math.min(x - TOOLBAR_W / 2, window.innerWidth - TOOLBAR_W - GAP));
    const fitsAbove = y - TOOLBAR_H - GAP > 0;
    return {
      left: l,
      top: fitsAbove ? y - TOOLBAR_H - GAP : y + GAP + 24,
      arrowLeft: Math.min(Math.max(x - l - 6, 12), TOOLBAR_W - 24),
      arrowOnTop: !fitsAbove,
    };
  }, [x, y]);

  // Dismiss on outside click. We wait for the next frame so the same pointer
  // event that opened the toolbar doesn't immediately close it.
  useEffect(() => {
    let attached = false;
    let raf = 0;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    raf = requestAnimationFrame(() => {
      document.addEventListener('pointerdown', handler);
      attached = true;
    });
    return () => {
      cancelAnimationFrame(raf);
      if (attached) document.removeEventListener('pointerdown', handler);
    };
  }, [onDismiss]);

  const hasAny = isBold || isItalic || isHighlight;

  return (
    <div
      ref={ref}
      className="fixed z-[200] flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-xl"
      style={{ left, top }}
    >
      <div
        className="absolute w-2.5 h-2.5 bg-card border-l border-t border-border/50 rotate-45"
        style={{
          bottom: arrowOnTop ? 'auto' : '-5px',
          top: arrowOnTop ? '-5px' : 'auto',
          left: arrowLeft,
          transform: arrowOnTop ? 'rotate(45deg)' : 'rotate(225deg)',
        }}
      />
      <ToolBtn label="B" active={isBold}      title="加粗" onClick={onBold} />
      <ToolBtn label="I" active={isItalic}    title="斜体" onClick={onItalic} />
      <ToolBtn label="H" active={isHighlight} title="高亮" onClick={onHighlight} />
      {hasAny && (
        <>
          <div className="w-px h-5 bg-border/50 mx-0.5" />
          <button
            onMouseDown={e => { e.preventDefault(); onClear(); }}
            title="清除格式"
            className="px-2.5 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors select-none"
          >
            ×
          </button>
        </>
      )}
    </div>
  );
});
