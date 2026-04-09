import { memo, useRef, useState, useCallback } from 'react';
import { PenLine, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FONT_SIZE_MAP, LINE_HEIGHT_MAP } from '@/lib/types';
import type { Note, FontSize, LineHeight, EditorFont } from '@/lib/types';
import { SelectionToolbar } from '@/components/SelectionToolbar';

// ── Markdown formatting helpers ───────────────────────────────────────────────

const MARKERS = { bold: '**', italic: '_', highlight: '==' } as const;
type FormatKey = keyof typeof MARKERS;

function isWrapped(text: string, start: number, end: number, marker: string): boolean {
  const m = marker.length;
  return (
    start >= m &&
    end <= text.length - m &&
    text.substring(start - m, start) === marker &&
    text.substring(end, end + m) === marker
  );
}

function toggleMarker(
  content: string,
  start: number,
  end: number,
  marker: string,
): { newContent: string; newStart: number; newEnd: number } {
  const m = marker.length;
  if (isWrapped(content, start, end, marker)) {
    const newContent = content.substring(0, start - m) + content.substring(start, end) + content.substring(end + m);
    return { newContent, newStart: start - m, newEnd: end - m };
  } else {
    const newContent = content.substring(0, start) + marker + content.substring(start, end) + marker + content.substring(end);
    return { newContent, newStart: start + m, newEnd: end + m };
  }
}

function clearAllMarkers(content: string, start: number, end: number): { newContent: string } {
  const selected = content.substring(start, end);
  const cleaned = selected.replace(/\*\*/g, '').replace(/==/g, '').replace(/_/g, '');
  return { newContent: content.substring(0, start) + cleaned + content.substring(end) };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SelectionState = {
  x: number; y: number;
  start: number; end: number;
};

type Props = {
  activeNote: Note | null;
  isPlaying: boolean;
  currentSongTitle?: string;
  fontSize: FontSize;
  lineHeight: LineHeight;
  editorFont: EditorFont;
  fontSizeNum: number;
  lineHeightNum: number;
  formattingEnabled: boolean;
  onToggleSidebar: () => void;
  onUpdateNote: (updates: Partial<Note>) => void;
  onOpenSidebar: () => void;
};

export const NoteEditor = memo(function NoteEditor({
  activeNote, isPlaying, currentSongTitle,
  fontSize, lineHeight, editorFont,
  fontSizeNum, lineHeightNum, formattingEnabled,
  onToggleSidebar, onUpdateNote, onOpenSidebar,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  // Detect selection on mouseup/touchend
  const handleSelectionEvent = useCallback((e: React.MouseEvent<HTMLTextAreaElement> | React.TouchEvent<HTMLTextAreaElement>) => {
    if (!formattingEnabled) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    if (start === null || end === null || start === end) { setSelection(null); return; }

    const clientX = 'changedTouches' in e
      ? e.changedTouches[0]?.clientX ?? 0
      : e.clientX;
    const clientY = 'changedTouches' in e
      ? e.changedTouches[0]?.clientY ?? 0
      : e.clientY;

    setSelection({ x: clientX, y: clientY, start, end });
  }, [formattingEnabled]);

  const applyFormat = useCallback((key: FormatKey) => {
    if (!selection || !activeNote) return;
    const marker = MARKERS[key];
    const { newContent, newStart, newEnd } = toggleMarker(activeNote.content, selection.start, selection.end, marker);
    onUpdateNote({ content: newContent, preview: newContent.replace(/[*_=]/g, '').substring(0, 80) });
    setSelection({ ...selection, start: newStart, end: newEnd });
    setTimeout(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    }, 0);
  }, [selection, activeNote, onUpdateNote]);

  const clearFormat = useCallback(() => {
    if (!selection || !activeNote) return;
    const { newContent } = clearAllMarkers(activeNote.content, selection.start, selection.end);
    onUpdateNote({ content: newContent, preview: newContent.replace(/[*_=]/g, '').substring(0, 80) });
    setSelection(null);
  }, [selection, activeNote, onUpdateNote]);

  // Detect current formatting state at selection
  const content = activeNote?.content ?? '';
  const selBold      = selection ? isWrapped(content, selection.start, selection.end, MARKERS.bold)      : false;
  const selItalic    = selection ? isWrapped(content, selection.start, selection.end, MARKERS.italic)    : false;
  const selHighlight = selection ? isWrapped(content, selection.start, selection.end, MARKERS.highlight) : false;

  // Typography inline styles (override Tailwind presets when fine-grained value is set)
  const typoStyle: React.CSSProperties = {};
  if (fontSizeNum > 0)   typoStyle.fontSize   = `${fontSizeNum}px`;
  if (lineHeightNum > 0) typoStyle.lineHeight  = lineHeightNum;

  const typoClass = cn(
    "w-full min-h-[60vh] resize-none bg-transparent border-none outline-none",
    "text-foreground/80 placeholder-muted-foreground/30 focus:ring-0",
    fontSizeNum   === 0 ? FONT_SIZE_MAP[fontSize]    : '',
    lineHeightNum === 0 ? LINE_HEIGHT_MAP[lineHeight] : '',
    editorFont === 'serif' ? 'font-serif' : 'font-sans'
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-[100dvh]">
      {/* Top bar */}
      <div className="flex items-center h-14 px-5 border-b border-border/30 shrink-0 bg-background/60 backdrop-blur-xl gap-3">
        <button onClick={onToggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0">
          <Menu className="w-4 h-4" />
        </button>
        <span className="text-sm font-sans text-muted-foreground/60 truncate select-none tracking-wide">
          {activeNote?.title || 'Sanctuary'}
        </span>
        {isPlaying && currentSongTitle && (
          <div className="ml-auto flex items-center gap-1.5 text-muted-foreground/50 shrink-0">
            <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
            <span className="text-[11px] font-sans truncate max-w-[120px]">{currentSongTitle}</span>
          </div>
        )}
      </div>

      {/* Editor area */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain"
        onClick={() => setSelection(null)}
      >
        {activeNote ? (
          <div className="max-w-2xl mx-auto px-8 md:px-16 pt-14 pb-16">
            <input
              type="text"
              value={activeNote.title}
              onChange={e => onUpdateNote({ title: e.target.value })}
              className="w-full text-3xl md:text-4xl font-serif font-medium bg-transparent border-none outline-none mb-5 text-foreground placeholder-muted-foreground/40 focus:ring-0"
              placeholder="Note Title"
            />
            <p className="text-sm text-muted-foreground font-sans tracking-wide mb-10 flex items-center gap-2">
              <PenLine className="w-3 h-3" />
              {activeNote.date}
            </p>
            <textarea
              ref={textareaRef}
              value={activeNote.content}
              onChange={e => onUpdateNote({
                content: e.target.value,
                preview: e.target.value.replace(/[*_=]/g, '').substring(0, 80) + '...',
              })}
              onMouseUp={handleSelectionEvent}
              onTouchEnd={handleSelectionEvent}
              onKeyUp={() => setSelection(null)}
              className={typoClass}
              style={typoStyle}
              placeholder="Start writing..."
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-8">
            <p className="text-muted-foreground/50 font-sans text-sm">Open the sidebar to select or create a note</p>
            <button onClick={onOpenSidebar}
              className="text-xs font-sans text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1.5">
              <Menu className="w-3.5 h-3.5" /> Open sidebar
            </button>
          </div>
        )}
      </div>

      {/* Floating selection toolbar */}
      {selection && formattingEnabled && (
        <SelectionToolbar
          x={selection.x}
          y={selection.y}
          isBold={selBold}
          isItalic={selItalic}
          isHighlight={selHighlight}
          onBold={() => applyFormat('bold')}
          onItalic={() => applyFormat('italic')}
          onHighlight={() => applyFormat('highlight')}
          onClear={clearFormat}
          onDismiss={() => setSelection(null)}
        />
      )}
    </div>
  );
});
