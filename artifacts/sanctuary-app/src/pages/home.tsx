import { useState, useCallback, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { useNotes } from '@/hooks/useNotes';
import { useAudio } from '@/hooks/useAudio';
import { useBooks } from '@/hooks/useBooks';
import { AppSidebar } from '@/components/AppSidebar';
import { NoteEditor } from '@/components/NoteEditor';

const SettingsPanel  = lazy(() => import('@/components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));
const TypographyPanel = lazy(() => import('@/components/TypographyPanel').then(m => ({ default: m.TypographyPanel })));
const LibraryView    = lazy(() => import('@/components/LibraryView').then(m => ({ default: m.LibraryView })));

export default function Home() {
  const [sidebarOpen,    setSidebarOpen]    = useState(true);
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [typographyOpen, setTypographyOpen] = useState(false);
  const [libraryOpen,    setLibraryOpen]    = useState(false);

  const settings = useSettings();
  const notes    = useNotes();
  const audio    = useAudio();
  const books    = useBooks();

  const setActiveNoteId = notes.setActiveNoteId;
  const selectBook      = books.selectBook;

  const handleSelectNote = useCallback((id: string) => {
    setActiveNoteId(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [setActiveNoteId]);

  const openSettings     = useCallback(() => setSettingsOpen(true),  []);
  const closeSettings    = useCallback(() => setSettingsOpen(false), []);
  const openTypography   = useCallback(() => setTypographyOpen(true),  []);
  const closeTypography  = useCallback(() => setTypographyOpen(false), []);
  const closeSidebar     = useCallback(() => setSidebarOpen(false),  []);
  const openSidebar      = useCallback(() => setSidebarOpen(true),   []);
  const toggleSidebar    = useCallback(() => setSidebarOpen(p => !p), []);
  const openLibrary      = useCallback(() => { setLibraryOpen(true); setSidebarOpen(false); }, []);
  const closeLibrary     = useCallback(() => setLibraryOpen(false), []);
  const backToShelf      = useCallback(() => selectBook(''), [selectBook]);

  const handleSelectBook = useCallback((id: string) => {
    selectBook(id);
  }, [selectBook]);

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
        onOpenLibrary={openLibrary}

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
        progressPct={audio.progressPct}
        displayTime={audio.displayTime}
        displayDuration={audio.displayDuration}
        fileInputRef={audio.fileInputRef}
        onFileChange={audio.handleFileChange}
        onPlayPause={audio.handlePlayPause}
        onNext={audio.handleNext}
        onPrev={audio.handlePrev}
        onSelectSong={audio.handleSelectSong}
        onSeek={audio.handleSeek}
        onDragStart={audio.startDrag}
        onDragEnd={audio.stopDrag}
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
        fontSizeNum={settings.fontSizeNum}
        lineHeightNum={settings.lineHeightNum}
        formattingEnabled={settings.formattingEnabled}
        onToggleSidebar={toggleSidebar}
        onUpdateNote={notes.updateActiveNote}
        onOpenSidebar={openSidebar}
      />

      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsPanel
            open={settingsOpen}
            onClose={closeSettings}
            onOpenTypography={openTypography}
            theme={settings.theme}           onTheme={settings.setTheme}
            fontSize={settings.fontSize}     onFontSize={settings.setFontSize}
            lineHeight={settings.lineHeight} onLineHeight={settings.setLineHeight}
            editorFont={settings.editorFont} onEditorFont={settings.setEditorFont}
          />
        )}
        {typographyOpen && (
          <TypographyPanel
            open={typographyOpen}
            onClose={closeTypography}
            editorFont={settings.editorFont}
            onEditorFont={settings.setEditorFont}
            fontSizeNum={settings.fontSizeNum}
            onFontSizeNum={settings.setFontSizeNum}
            lineHeightNum={settings.lineHeightNum}
            onLineHeightNum={settings.setLineHeightNum}
            fontSizePreset={settings.fontSize}
            lineHeightPreset={settings.lineHeight}
            formattingEnabled={settings.formattingEnabled}
            onFormattingEnabled={settings.setFormattingEnabled}
          />
        )}
        {libraryOpen && (
          <LibraryView
            books={books.books}
            activeBook={books.activeBook}
            bookmarks={books.bookmarks}
            progress={books.progress}
            importing={books.importing}
            importError={books.importError}
            fontSize={settings.fontSize}
            lineHeight={settings.lineHeight}
            editorFont={settings.editorFont}
            onImport={books.importBook}
            onSelectBook={handleSelectBook}
            onRemoveBook={books.removeBook}
            onClose={closeLibrary}
            onBackToShelf={backToShelf}
            onSaveProgress={books.saveProgress}
            onAddBookmark={books.addBookmark}
            onRemoveBookmark={books.removeBookmark}
          />
        )}
      </Suspense>
    </div>
  );
}
