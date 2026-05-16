/**
 * NoteEditor — main editing surface.
 *
 * Subscribes to: notesStore (active note + content), settingsStore (typography),
 * audioEngine (playing-now indicator). All formatting helpers were moved to
 * `@/lib/markdown` so this file is just UI + selection bookkeeping.
 */

import { memo, useRef, useState, useCallback, useMemo, useSyncExternalStore } from 'react';
import { PenLine, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FONT_SIZE_MAP, LINE_HEIGHT_MAP } from '@/lib/types';
import { useStore } from '@/lib/store';
import { settingsStore } from '@/stores/settingsStore';
import { notesStore, notesActions, notesSelectors } from '@/stores/notesStore';
import { uiActions } from '@/stores/uiStore';
import { audioEngine } from '@/stores/audioEngine';
import { isWrapped, toggleMarker, clearAllMarkers, MARKERS, type FormatKey } from '@/lib/markdown';
import { SelectionToolbar } from '@/components/SelectionToolbar';

type SelectionState = {
  x: number; y: number;
  start: number; end: number;
};

/**
 * Subscribe to the audio engine but only re-render this component when the
 * two fields we actually display change. We memoize the snapshot via a ref
 * so React's identity check is happy.
 */
function useAudioBadge() {
  const lastRef = useRef<{ isPlaying: boolean; title?: string }>({ isPlaying: false, title: undefined });
  return useSyncExternalStore(
    audioEngine.subscribe,
    () => {
      const s = audioEngine.getSnapshot();
      const next = { isPlaying: s.isPlaying, title: s.currentSong?.title };
      const prev = lastRef.current;
      if (prev.isPlaying === next.isPlaying && prev.title === next.title) return prev;
      lastRef.current = next;
      return next;
    },
    () => lastRef.current,
  );
}

export const NoteEditor = memo(function NoteEditor() {
  const activeNote = useStore(notesStore, s => notesSelectors.activeNote(s));
  const fontSize           = useStore(settingsStore, s => s.fontSize);
  const lineHeight         = useStore(settingsStore, s => s.lineHeight);
  const editorFont         = useStore(settingsStore, s => s.editorFont);
  const fontSizeNum        = useStore(settingsStore, s => s.fontSizeNum);
  const lineHeightNum      = useStore(settingsStore, s => s.lineHeightNum);
  const formattingEnabled  = useStore(settingsStore, s => s.formattingEnabled);
  const audio = useAudioBadge();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const handleSelectionEvent = useCallback((e: React.MouseEvent<HTMLTextAreaElement> | React.TouchEvent<HTMLTextAreaElement>) => {
    if (!formattingEnabled) return;
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    if (start === null || end === null || start === end) { setSelection(null); return; }
    const x = 'changedTouches' in e ? e.changedTouches[0]?.clientX ?? 0 : e.clientX;
    const y = 'changedTouches' in e ? e.changedTouches[0]?.clientY ?? 0 : e.clientY;
    setSelection({ x, y, start, end });
  }, [formattingEnabled]);

  const applyFormat = useCallback((key: FormatKey) => {
    if (!selection || !activeNote) return;
    const marker = MARKERS[key];
    const { newContent, newStart, newEnd } = toggleMarker(activeNote.content, selection.start, selection.end, marker);
    notesActions.updateActiveNote({ content: newContent });
    setSelection({ ...selection, start: newStart, end: newEnd });
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(newStart, newEnd);
    });
  }, [selection, activeNote]);

  const clearFormat = useCallback(() => {
    if (!selection || !activeNote) return;
    const newContent = clearAllMarkers(activeNote.content, selection.start, selection.end);
    notesActions.updateActiveNote({ content: newContent });
    setSelection(null);
  }, [selection, activeNote]);

  // Inspect current formatting at the selection (for active-state on toolbar buttons).
  const content = activeNote?.content ?? '';
  const flags = useMemo(() => {
    if (!selection) return { bold: false, italic: false, highlight: false };
    return {
      bold:      isWrapped(content, selection.start, selection.end, MARKERS.bold),
      italic:    isWrapped(content, selection.start, selection.end, MARKERS.italic),
      highlight: isWrapped(content, selection.start, selection.end, MARKERS.highlight),
    };
  }, [content, selection]);

  const typoStyle: React.CSSProperties = {};
  if (fontSizeNum > 0) typoStyle.fontSize = `${fontSizeNum}px`;
  if (lineHeightNum > 0) typoStyle.lineHeight = lineHeightNum;

  const typoClass = cn(
    'w-full min-h-[60vh] resize-none bg-transparent border-none outline-none focus:ring-0',
    'text-foreground/80 placeholder-muted-foreground/30',
    fontSizeNum   === 0 ? FONT_SIZE_MAP[fontSize]    : '',
    lineHeightNum === 0 ? LINE_HEIGHT_MAP[lineHeight] : '',
    editorFont === 'serif' ? 'font-serif' : 'font-sans',
  );

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    notesActions.updateActiveNote({ content: e.target.value });
  }, []);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    notesActions.updateActiveNote({ title: e.target.value });
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-[100dvh]">
      <div className="flex items-center h-14 px-5 border-b border-border/30 shrink-0 bg-background/60 backdrop-blur-xl gap-3">
        <button
          onClick={uiActions.toggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150 active:scale-90 shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
        <span className="text-sm font-sans text-muted-foreground/60 truncate select-none tracking-wide">
          {activeNote?.title || 'Sanctuary'}
        </span>
        {audio.isPlaying && audio.title && (
          <div className="ml-auto flex items-center gap-1.5 text-muted-foreground/50 shrink-0">
            <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
            <span className="text-[11px] font-sans truncate max-w-[120px]">{audio.title}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain" onClick={() => setSelection(null)}>
        {activeNote ? (
          <div className="max-w-2xl mx-auto px-8 md:px-16 pt-14 pb-16">
            <input
              type="text"
              value={activeNote.title}
              onChange={handleTitleChange}
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
              onChange={handleContentChange}
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
            <button
              onClick={uiActions.openSidebar}
              className="text-xs font-sans text-muted-foreground/40 hover:text-muted-foreground transition-all duration-150 active:scale-95 flex items-center gap-1.5"
            >
              <Menu className="w-3.5 h-3.5" /> Open sidebar
            </button>
          </div>
        )}
      </div>

      {selection && formattingEnabled && (
        <SelectionToolbar
          x={selection.x}
          y={selection.y}
          isBold={flags.bold}
          isItalic={flags.italic}
          isHighlight={flags.highlight}
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
