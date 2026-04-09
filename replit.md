# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Sanctuary App (`artifacts/sanctuary-app`)

Personal notes & music PWA built with React + Vite + Tailwind CSS.

**Features**: Notes CRUD (localStorage), HTML5 audio player with file upload, 5 switchable themes, settings panel, immersive novel reader (TXT/EPUB), typography customization, text formatting toolbar on selection.

**Data persistence**:
- Notes: localStorage (debounced 300ms), active note ID persisted, auto-corrects stale IDs
- Music: audio files in IndexedDB (cached connection), playlist metadata in localStorage (debounced 500ms)
- Settings: all 7 keys in localStorage (debounced 100ms)
- Books: localStorage (debounced 500ms), bookmarks/progress saved immediately

**UI features wired**:
- Volume control slider with mute/unmute toggle (restores previous volume)
- Note delete with double-click confirm (trash icon visible on mobile, hover-reveal on desktop)
- Note date auto-updates on edit
- Search clear button (X) in sidebar search field
- `active:scale-90`/`active:scale-95` touch feedback on all interactive buttons
- Music player: shuffle, repeat, seek, upload, playlist panel

**Performance & code quality**:
- `useAudio`: `timeupdate` throttled via rAF + 250ms delta gate; `currentSong` memoized; `clearTimer` helper for null-safe timeout clearing
- `useNotes`: stale closure fixed via `activeNoteIdRef`; stale ID auto-correction effect
- `useBooks`: localStorage save debounced 500ms
- `useSettings`: 7 separate useEffects consolidated into 1 debounced effect (100ms)
- `home.tsx`: SettingsPanel, TypographyPanel, LibraryView lazy-loaded with `React.lazy` + `Suspense`
- All child components wrapped with `React.memo`; callbacks stabilized with `useCallback`
- Zero TypeScript errors (`tsc --noEmit` passes clean)

**Capacitor APK**: Configured for local Android builds. See `BUILD_APK.md` for instructions.
- `pnpm run build:apk` — build web assets + sync to Android
- `pnpm run cap:init` — initialize Android project (first time)
- `pnpm run cap:open` — open in Android Studio
