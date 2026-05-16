/**
 * SettingsPanel — right-side drawer for theme + size/spacing presets + font.
 *
 * Subscribes to settingsStore directly. Each `Section` block reads only the
 * field it controls, so toggling one option doesn't re-render the others.
 */

import { useEffect, memo } from 'react';
import { X, Type, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { THEMES } from '@/lib/types';
import type { ThemeId, FontSize, LineHeight, EditorFont } from '@/lib/types';
import { useStore } from '@/lib/store';
import { settingsStore, settingsActions } from '@/stores/settingsStore';
import { uiStore, uiActions } from '@/stores/uiStore';
import {
  sleepTimerStore, sleepTimerActions, formatSleepCountdown,
} from '@/stores/sleepTimerStore';

function Section({ title, children, action }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-sans font-medium tracking-[0.15em] uppercase text-muted-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function OptionBtn({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2 rounded-xl text-sm font-sans transition-all duration-150 border active:scale-95',
        active
          ? 'bg-primary text-primary-foreground border-transparent shadow-sm'
          : 'bg-muted/50 text-foreground/70 border-transparent hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

const ThemeSection = memo(function ThemeSection() {
  const theme = useStore(settingsStore, s => s.theme);
  return (
    <Section title="主题配色">
      <div className="flex flex-col gap-1.5">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => settingsActions.setTheme(t.id as ThemeId)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 active:scale-[0.97] text-sm font-sans w-full text-left',
              theme === t.id ? 'bg-muted' : 'hover:bg-muted/60',
            )}
          >
            <span
              className="w-5 h-5 rounded-full shrink-0"
              style={{
                backgroundColor: t.color,
                boxShadow: theme === t.id
                  ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${t.color}`
                  : 'none',
              }}
            />
            <span className={cn('transition-colors', theme === t.id ? 'text-foreground font-medium' : 'text-foreground/70')}>
              {t.label}
            </span>
            {theme === t.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>
    </Section>
  );
});

const FontSizeSection = memo(function FontSizeSection() {
  const fontSize = useStore(settingsStore, s => s.fontSize);
  const fineTuneLink = (
    <button
      onClick={uiActions.openTypography}
      className="text-[10px] font-sans text-primary/70 hover:text-primary transition-all duration-150 active:scale-95"
    >
      精细调节 →
    </button>
  );
  return (
    <Section title="字号大小" action={fineTuneLink}>
      <div className="flex gap-2">
        {(['sm', 'md', 'lg'] as FontSize[]).map((v, i) => (
          <OptionBtn key={v} label={['小', '中', '大'][i]} active={fontSize === v} onClick={() => settingsActions.setFontSize(v)} />
        ))}
      </div>
    </Section>
  );
});

const LineHeightSection = memo(function LineHeightSection() {
  const lineHeight = useStore(settingsStore, s => s.lineHeight);
  const fineTuneLink = (
    <button
      onClick={uiActions.openTypography}
      className="text-[10px] font-sans text-primary/70 hover:text-primary transition-all duration-150 active:scale-95"
    >
      精细调节 →
    </button>
  );
  return (
    <Section title="行间距" action={fineTuneLink}>
      <div className="flex gap-2">
        {(['tight', 'normal', 'relaxed'] as LineHeight[]).map((v, i) => (
          <OptionBtn key={v} label={['紧凑', '舒适', '宽松'][i]} active={lineHeight === v} onClick={() => settingsActions.setLineHeight(v)} />
        ))}
      </div>
    </Section>
  );
});

const FontFamilySection = memo(function FontFamilySection() {
  const editorFont = useStore(settingsStore, s => s.editorFont);
  return (
    <Section title="编辑器字体">
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
            <span className={cn('block', f === 'serif' ? 'font-serif' : 'font-sans')}>
              {f === 'serif' ? '衬线体' : '无衬线'}
            </span>
            <span className="text-[10px] opacity-60 block mt-0.5">
              {f === 'serif' ? 'Playfair' : 'Inter'}
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
});

/* ── Sleep timer ───────────────────────────────────────────────────────── */

/**
 * Compact sleep-timer controls. The active state is shown both as a chip in
 * the music dock (for at-a-glance feedback) and here (for full controls).
 *
 * Two mutually-exclusive modes:
 *  - Minutes: pause after N minutes (any of: 5, 15, 30, 60, custom slider).
 *  - Tracks:  pause after N more tracks finish (1, 3, 5).
 */
const MINUTE_PRESETS = [5, 15, 30, 60] as const;
const TRACK_PRESETS  = [1, 3, 5] as const;

const SleepTimerSection = memo(function SleepTimerSection() {
  const remainingSecs   = useStore(sleepTimerStore, s => s.remainingSecs);
  const tracksRemaining = useStore(sleepTimerStore, s => s.tracksRemaining);
  const active = remainingSecs !== null || tracksRemaining !== null;
  const countdown = formatSleepCountdown(remainingSecs);

  return (
    <Section
      title="睡眠定时"
      action={active ? (
        <button
          onClick={sleepTimerActions.cancel}
          className="text-[10px] font-sans text-muted-foreground/60 hover:text-destructive transition-colors duration-150 active:scale-95"
        >
          取消
        </button>
      ) : undefined}
    >
      {active && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-primary/10 flex items-center gap-2 text-foreground">
          <Moon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[12px] font-sans tabular-nums">
            {countdown
              ? `还剩 ${countdown} 后停止`
              : `在 ${tracksRemaining} 首歌后停止`}
          </span>
        </div>
      )}

      <p className="text-[10px] font-sans text-muted-foreground/60 mb-2">分钟</p>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {MINUTE_PRESETS.map(m => {
          const selected = remainingSecs !== null && Math.abs(remainingSecs - m * 60) <= 60;
          return (
            <button
              key={m}
              onClick={() => sleepTimerActions.setMinutes(m)}
              className={cn(
                'py-1.5 rounded-lg text-[12px] font-sans transition-all duration-150 active:scale-95 tabular-nums',
                selected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-foreground/70 hover:bg-muted',
              )}
            >
              {m}m
            </button>
          );
        })}
      </div>

      <p className="text-[10px] font-sans text-muted-foreground/60 mb-2">曲目</p>
      <div className="grid grid-cols-3 gap-1.5">
        {TRACK_PRESETS.map(n => {
          const selected = tracksRemaining === n;
          return (
            <button
              key={n}
              onClick={() => sleepTimerActions.setTracks(n)}
              className={cn(
                'py-1.5 rounded-lg text-[12px] font-sans transition-all duration-150 active:scale-95',
                selected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-foreground/70 hover:bg-muted',
              )}
            >
              {n} 首
            </button>
          );
        })}
      </div>
    </Section>
  );
});

export const SettingsPanel = memo(function SettingsPanel() {
  const open = useStore(uiStore, s => s.settingsOpen);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') uiActions.closeSettings(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <div
        onClick={uiActions.closeSettings}
        className={cn(
          'fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <div
        className={cn(
          'fixed top-0 right-0 h-full z-50 w-72 bg-card border-l border-border shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60 shrink-0">
          <span className="text-sm font-medium text-foreground tracking-wide">设置</span>
          <div className="flex items-center gap-2">
            <button
              onClick={uiActions.openTypography}
              title="字形设置"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 active:scale-90"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={uiActions.closeSettings}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150 active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5">
            <ThemeSection />
            <FontSizeSection />
            <LineHeightSection />
            <FontFamilySection />
            <SleepTimerSection />
          </div>
        </ScrollArea>
      </div>
    </>
  );
});
