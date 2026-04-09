import { memo } from 'react';
import { PenLine, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FONT_SIZE_MAP, LINE_HEIGHT_MAP } from '@/lib/types';
import type { Note, FontSize, LineHeight, EditorFont } from '@/lib/types';

type Props = {
  activeNote: Note | null;
  isPlaying: boolean;
  currentSongTitle?: string;
  fontSize: FontSize;
  lineHeight: LineHeight;
  editorFont: EditorFont;
  onToggleSidebar: () => void;
  onUpdateNote: (updates: Partial<Note>) => void;
  onOpenSidebar: () => void;
};

export const NoteEditor = memo(function NoteEditor({
  activeNote, isPlaying, currentSongTitle,
  fontSize, lineHeight, editorFont,
  onToggleSidebar, onUpdateNote, onOpenSidebar,
}: Props) {
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

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
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
              value={activeNote.content}
              onChange={e => onUpdateNote({ content: e.target.value, preview: e.target.value.substring(0, 80) + '...' })}
              className={cn(
                "w-full min-h-[60vh] resize-none bg-transparent border-none outline-none text-foreground/80 placeholder-muted-foreground/30 focus:ring-0",
                FONT_SIZE_MAP[fontSize],
                LINE_HEIGHT_MAP[lineHeight],
                editorFont === 'serif' ? 'font-serif' : 'font-sans'
              )}
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
    </div>
  );
});
