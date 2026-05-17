/**
 * TypographyPanel — fine-grained font size / line-height sliders + font picker.
 *
 * Subscribes to settingsStore directly. Each row reads a single field so
 * dragging the font-size slider doesn't re-render the line-height slider.
 */

import { useEffect, memo, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorFont, FontSize, LineHeight } from '@/lib/types';
import { useStore } from '@/lib/store';
import { settingsStore, settingsActions } from '@/stores/settingsStore';
import { uiStore, uiActions } from '@/stores/uiStore';

/* ── Stable selectors ───────────────────────────────────────────────────── */

const selectFontSizeNum      = (s: any) => s.fontSizeNum;
const selectFontSizePreset   = (s: any) => s.fontSize;
const selectLineHeightNum    = (s: any) => s.lineHeightNum;
const selectLineHeightPreset = (s: any) => s.lineHeight;
const selectEditorFont       = (s: any) => s.editorFont;
const selectFormattingOn     = (s: any) => s.formattingEnabled;
const selectTypoOpen         = (s: any) => s.typographyOpen;

const FONT_SIZE_PRESETS:   Record<FontSize, number>   = { sm: 15, md: 18, lg: 21 };
const LINE_HEIGHT_PRESETS: Record<LineHeight, number> = { tight: 1.8, normal: 2.2, relaxed: 2.8 };

/* ── Slider primitive ───────────────────────────────────────────────────── */

type SliderRowProps = {
  label: string;
  effectiveValue: number;
  isCustom: boolean;
  min: number; max: number; step: number;
  display: string;
  onChange: (v: number) => void;
  onReset: () => void;
};

function SliderRow({ label, effectiveValue, isCustom, min, max, step, display, onChange, onReset }: SliderRowProps) {
  const pct = ((effectiveValue - min) / (max - min)) * 100;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-sans font-medium tracking-[0.12em] uppercase text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-sans text-foreground tabular-nums">{display}</span>
          {isCustom && (
            <button
              onClick={onReset}
              className="text-[10px] font-sans text-muted-foreground/60 hover:text-muted-foreground transition-all duration-150 active:scale-95 px-1.5 py-0.5 rounded bg-muted/40"
            >
              重置
            </button>
          )}
        </div>
      </div>
      <div className="relative h-8 flex items-center select-none touch-pan-x">
        <div className="absolute left-0 right-0 h-[5px] bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-[width] duration-75 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range" min={min} max={max} step={step}
          value={effectiveValue}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-8"
        />
        <div
          className="absolute w-5 h-5 rounded-full bg-primary shadow-md border-2 border-background pointer-events-none transition-transform duration-100 ease-out"
          style={{ left: `calc(${pct}% - 10px)` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-sans text-muted-foreground/40">{min}</span>
        <span className="text-[10px] font-sans text-muted-foreground/40">{max}</span>
      </div>
    </div>
  );
}

function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-sans text-foreground/80">{label}</span>
      <button
        onClick={onToggle}
        aria-label={label}
        className={cn(
          'relative rounded-full transition-colors duration-200 shrink-0 flex items-center',
          enabled ? 'bg-primary' : 'bg-muted',
        )}
        style={{ width: '42px', height: '24px' }}
      >
        <span className={cn(
          'absolute top-[4px] left-[4px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          enabled ? 'translate-x-[18px]' : 'translate-x-0',
        )} />
      </button>
    </div>
  );
}

/* ── Specialized rows ───────────────────────────────────────────────────── */

const FontSizeRow = memo(function FontSizeRow() {
  const fontSizeNum   = useStore(settingsStore, selectFontSizeNum);
  const fontSizePreset = useStore(settingsStore, selectFontSizePreset);
  const effective = fontSizeNum > 0 ? fontSizeNum : (FONT_SIZE_PRESETS[fontSizePreset] ?? 18);
  return (
    <SliderRow
      label="字号"
      effectiveValue={effective}
      isCustom={fontSizeNum > 0}
      min={12} max={28} step={1}
      display={`${Math.round(effective)}px`}
      onChange={settingsActions.setFontSizeNum}
      onReset={() => settingsActions.setFontSizeNum(0)}
    />
  );
});

const LineHeightRow = memo(function LineHeightRow() {
  const lineHeightNum    = useStore(settingsStore, selectLineHeightNum);
  const lineHeightPreset = useStore(settingsStore, selectLineHeightPreset);
  const effective = lineHeightNum > 0 ? lineHeightNum : (LINE_HEIGHT_PRESETS[lineHeightPreset] ?? 2.2);
  return (
    <SliderRow
      label="行距"
      effectiveValue={effective}
      isCustom={lineHeightNum > 0}
      min={1.4} max={3.2} step={0.1}
      display={effective.toFixed(1)}
      onChange={settingsActions.setLineHeightNum}
      onReset={() => settingsActions.setLineHeightNum(0)}
    />
  );
});

const FontFamilyRow = memo(function FontFamilyRow() {
  const editorFont = useStore(settingsStore, selectEditorFont);
  return (
    <div className="mb-6">
      <p className="text-[11px] font-sans font-medium tracking-[0.12em] uppercase text-muted-foreground mb-2.5">字体</p>
      <div className="flex gap-2">
        {(['serif', 'sans'] as EditorFont[]).map(f => (
          <button
            key={f}
            onClick={() => settingsActions.setEditorFont(f)}
            className={cn(
              'flex-1 py-3 rounded-xl text-sm border transition-all duration-150 active:scale-95',
              editorFont === f
                ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
                : 'bg-muted/50 text-foreground/70 border-transparent hover:bg-muted',
            )}
          >
            <span className={cn('block text-[15px]', f === 'serif' ? 'font-serif' : 'font-sans')}>
              {f === 'serif' ? '衬线' : '无衬线'}
            </span>
            <span className="text-[10px] opacity-60 block mt-0.5">
              {f === 'serif' ? 'Playfair Display' : 'Inter'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

const Preview = memo(function Preview() {
  const editorFont       = useStore(settingsStore, selectEditorFont);
  const fontSizeNum      = useStore(settingsStore, selectFontSizeNum);
  const fontSizePreset   = useStore(settingsStore, selectFontSizePreset);
  const lineHeightNum    = useStore(settingsStore, selectLineHeightNum);
  const lineHeightPreset = useStore(settingsStore, selectLineHeightPreset);
  const effFs = fontSizeNum   > 0 ? fontSizeNum   : (FONT_SIZE_PRESETS[fontSizePreset]   ?? 18);
  const effLh = lineHeightNum > 0 ? lineHeightNum : (LINE_HEIGHT_PRESETS[lineHeightPreset] ?? 2.2);
  const style = useMemo(() => ({ fontSize: `${Math.round(effFs)}px`, lineHeight: effLh }), [effFs, effLh]);
  return (
    <div className="mb-6 px-4 py-4 rounded-xl bg-muted/30 border border-border/30">
      <p className="text-[10px] font-sans text-muted-foreground/60 mb-2 tracking-widest uppercase">预览</p>
      <p
        className={cn(editorFont === 'serif' ? 'font-serif' : 'font-sans', 'text-foreground/80 break-words')}
        style={style}
      >
        千里之行，始于足下。
      </p>
    </div>
  );
});

const FormattingToggle = memo(function FormattingToggle() {
  const enabled = useStore(settingsStore, selectFormattingOn);
  return (
    <div className="border-t border-border/30 pt-5">
      <p className="text-[11px] font-sans font-medium tracking-[0.12em] uppercase text-muted-foreground mb-4">文字标注</p>
      <Toggle
        enabled={enabled}
        onToggle={() => settingsActions.setFormattingEnabled(!enabled)}
        label="选中文字启用标注"
      />
      <p className={cn(
        'text-[11px] font-sans leading-relaxed mt-2 transition-all duration-200',
        enabled ? 'text-muted-foreground/60' : 'text-muted-foreground/30',
      )}>
        {enabled
          ? '在笔记正文中选中文字，将出现标注工具栏'
          : '开启后可对正文进行加粗、斜体、高亮标注'}
      </p>
    </div>
  );
});

/* ── Panel shell ────────────────────────────────────────────────────────── */

export const TypographyPanel = memo(function TypographyPanel() {
  const open = useStore(uiStore, selectTypoOpen);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') uiActions.closeTypography(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <div
        onClick={uiActions.closeTypography}
        className={cn(
          'fixed inset-0 bg-black/10 backdrop-blur-[1px] transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 55 }}
      />
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-72 bg-card border-l border-border shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ zIndex: 60 }}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border/60 shrink-0">
          <button
            onClick={uiActions.closeTypography}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 active:scale-90 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground tracking-wide">字形设置</span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <FontSizeRow />
          <LineHeightRow />
          <FontFamilyRow />
          <Preview />
          <FormattingToggle />
        </div>
      </div>
    </>
  );
});
