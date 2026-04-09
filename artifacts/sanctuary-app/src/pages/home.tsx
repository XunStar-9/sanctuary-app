import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { useNotes } from '@/hooks/useNotes';
import { useAudio } from '@/hooks/useAudio';
import { AppSidebar } from '@/components/AppSidebar';
import { NoteEditor } from '@/components/NoteEditor';
import { SettingsPanel } from '@/components/SettingsPanel';

export default function Home() {
  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settings = useSettings();
  const notes    = useNotes();
  const audio    = useAudio();

  const handleSelectNote = useCallback((id: string) => {
    notes.setActiveNoteId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [notes]);

  const openSettings  = useCallback(() => setSettingsOpen(true),  []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const closeSidebar  = useCallback(() => setSidebarOpen(false),  []);
  const openSidebar   = useCallback(() => setSidebarOpen(true),   []);
  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);

  return (
    <div className="h-[100dvh] bg-background text-foreground font-serif selection:bg-primary/20 flex overflow-hidden">

      {/* Mobile sidebar backdrop */}
      <div
        onClick={closeSidebar}
        className={cn(
          "fixed inset-0 z-30 bg-black/15 backdrop-blur-[2px] md:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      <AppSidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        onOpenSettings={openSettings}

        notes={notes.notes}
        filteredNotes={notes.filteredNotes}
        activeNoteId={notes.activeNoteId}
        searchQuery={notes.searchQuery}
        onSearchChange={notes.setSearchQuery}
        onSelectNote={handleSelectNote}
        onAddNote={notes.handleAddNote}

        playlist={audio.playlist}
        currentSong={audio.currentSong}
        currentSongIndex={audio.currentSongIndex}
        isPlaying={audio.isPlaying}
        isShuffle={audio.isShuffle}
        isRepeat={audio.isRepeat}
        progressPct={audio.progressPct()}
        displayTime={audio.displayTime()}
        displayDuration={audio.displayDuration()}
        fileInputRef={audio.fileInputRef}
        onFileChange={audio.handleFileChange}
        onPlayPause={audio.handlePlayPause}
        onNext={audio.handleNext}
        onPrev={audio.handlePrev}
        onSelectSong={audio.handleSelectSong}
        onSeek={audio.handleSeek}
        onDragStart={() => audio.setIsDragging(true)}
        onDragEnd={() => audio.setIsDragging(false)}
        onRemoveSong={audio.handleRemoveSong}
        onUploadClick={audio.handleUploadClick}
        onToggleShuffle={audio.toggleShuffle}
        onToggleRepeat={audio.toggleRepeat}
      />

      <NoteEditor
        activeNote={notes.activeNote}
        isPlaying={audio.isPlaying}
        currentSongTitle={audio.currentSong?.title}
        fontSize={settings.fontSize}
        lineHeight={settings.lineHeight}
        editorFont={settings.editorFont}
        onToggleSidebar={toggleSidebar}
        onUpdateNote={notes.updateActiveNote}
        onOpenSidebar={openSidebar}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={closeSettings}
        theme={settings.theme}           onTheme={settings.setTheme}
        fontSize={settings.fontSize}     onFontSize={settings.setFontSize}
        lineHeight={settings.lineHeight} onLineHeight={settings.setLineHeight}
        editorFont={settings.editorFont} onEditorFont={settings.setEditorFont}
      />
    </div>
  );
}
