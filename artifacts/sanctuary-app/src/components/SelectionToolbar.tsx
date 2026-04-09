import { useEffect, useRef, memo } from 'react';

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

function ToolBtn({
  label, active, title, onClick,
}: { label: string; active: boolean; title: string; onClick: () => void }) {
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
  x, y, isBold, isItalic, isHighlight, onBold, onItalic, onHighlight, onClear, onDismiss,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  const TOOLBAR_W = 220;
  const TOOLBAR_H = 44;
  const GAP = 10;

  const clampedX = Math.max(GAP, Math.min(x - TOOLBAR_W / 2, window.innerWidth - TOOLBAR_W - GAP));
  const clampedY = y - TOOLBAR_H - GAP > 0 ? y - TOOLBAR_H - GAP : y + GAP + 24;

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    // Slight delay so we don't immediately dismiss from the same click that opened
    const id = setTimeout(() => document.addEventListener('pointerdown', handler), 100);
    return () => { clearTimeout(id); document.removeEventListener('pointerdown', handler); };
  }, [onDismiss]);

  const hasAny = isBold || isItalic || isHighlight;

  return (
    <div
      ref={ref}
      className="fixed z-[200] flex items-center gap-0.5 px-1.5 py-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 shadow-xl"
      style={{ left: clampedX, top: clampedY }}
    >
      {/* Indicator triangle */}
      <div
        className="absolute w-2.5 h-2.5 bg-card border-l border-t border-border/50 rotate-45"
        style={{
          bottom: y - TOOLBAR_H - GAP > 0 ? '-5px' : 'auto',
          top: y - TOOLBAR_H - GAP > 0 ? 'auto' : '-5px',
          left: Math.min(Math.max(x - clampedX - 6, 12), TOOLBAR_W - 24),
          transform: y - TOOLBAR_H - GAP > 0 ? 'rotate(225deg)' : 'rotate(45deg)',
        }}
      />

      <ToolBtn label="B" active={isBold}      title="加粗"  onClick={onBold} />
      <ToolBtn label="I" active={isItalic}    title="斜体"  onClick={onItalic} />
      <ToolBtn label="H" active={isHighlight} title="高亮"  onClick={onHighlight} />

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
