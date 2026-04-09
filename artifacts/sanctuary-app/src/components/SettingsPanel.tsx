import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { THEMES } from '@/lib/types';
import type { ThemeId, FontSize, LineHeight, EditorFont } from '@/lib/types';

type Props = {
  open: boolean;
  onClose: () => void;
  theme: ThemeId;       onTheme: (v: ThemeId) => void;
  fontSize: FontSize;   onFontSize: (v: FontSize) => void;
  lineHeight: LineHeight; onLineHeight: (v: LineHeight) => void;
  editorFont: EditorFont; onEditorFont: (v: EditorFont) => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-[10px] font-sans font-medium tracking-[0.15em] uppercase text-muted-foreground mb-3">{title}</p>
      {children}
    </div>
  );
}

function OptionBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn(
        "flex-1 py-2 rounded-xl text-sm font-sans transition-all duration-150 border",
        active
          ? "bg-primary text-primary-foreground border-transparent shadow-sm"
          : "bg-muted/50 text-foreground/70 border-transparent hover:bg-muted hover:text-foreground"
      )}>
      {label}
    </button>
  );
}

export function SettingsPanel({ open, onClose, theme, onTheme, fontSize, onFontSize, lineHeight, onLineHeight, editorFont, onEditorFont }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />
      <div ref={panelRef}
        className={cn(
          "fixed top-0 right-0 h-full z-50 w-72 bg-card border-l border-border shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          open ? "translate-x-0" : "translate-x-full"
        )}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60 shrink-0">
          <span className="text-sm font-medium text-foreground tracking-wide">设置</span>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5">

            <Section title="主题配色">
              <div className="flex flex-col gap-1.5">
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => onTheme(t.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-sans w-full text-left",
                      theme === t.id ? "bg-muted" : "hover:bg-muted/60"
                    )}>
                    <span className="w-5 h-5 rounded-full shrink-0" style={{
                      backgroundColor: t.color,
                      boxShadow: theme === t.id ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${t.color}` : 'none',
                    }} />
                    <span className={cn("transition-colors", theme === t.id ? "text-foreground font-medium" : "text-foreground/70")}>{t.label}</span>
                    {theme === t.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="字号大小">
              <div className="flex gap-2">
                <OptionBtn label="小" active={fontSize === 'sm'} onClick={() => onFontSize('sm')} />
                <OptionBtn label="中" active={fontSize === 'md'} onClick={() => onFontSize('md')} />
                <OptionBtn label="大" active={fontSize === 'lg'} onClick={() => onFontSize('lg')} />
              </div>
            </Section>

            <Section title="行间距">
              <div className="flex gap-2">
                <OptionBtn label="紧凑"  active={lineHeight === 'tight'}   onClick={() => onLineHeight('tight')} />
                <OptionBtn label="舒适"  active={lineHeight === 'normal'}  onClick={() => onLineHeight('normal')} />
                <OptionBtn label="宽松"  active={lineHeight === 'relaxed'} onClick={() => onLineHeight('relaxed')} />
              </div>
            </Section>

            <Section title="编辑器字体">
              <div className="flex gap-2">
                {(['serif', 'sans'] as EditorFont[]).map(f => (
                  <button key={f} onClick={() => onEditorFont(f)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-sm border transition-all duration-150",
                      editorFont === f
                        ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                        : "bg-muted/50 text-foreground/70 border-transparent hover:bg-muted"
                    )}>
                    <span className={cn("block", f === 'serif' ? 'font-serif' : 'font-sans')}>
                      {f === 'serif' ? '衬线体' : '无衬线'}
                    </span>
                    <span className="text-[10px] opacity-60 block mt-0.5">
                      {f === 'serif' ? 'Playfair' : 'Inter'}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

          </div>
        </ScrollArea>
      </div>
    </>
  );
}
