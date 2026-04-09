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

**Performance optimizations applied**:
- `useAudio`: `timeupdate` throttled via rAF + 250ms delta gate; `currentSong` memoized with `useMemo`
- `useNotes`: localStorage save debounced 300ms
- `useBooks`: localStorage save debounced 500ms
- `useSettings`: 7 separate useEffects consolidated into 1 debounced effect (100ms)
- `home.tsx`: SettingsPanel, TypographyPanel, LibraryView lazy-loaded with `React.lazy` + `Suspense`
- All child components wrapped with `React.memo`; callbacks stabilized with `useCallback`

**Capacitor APK**: Configured for local Android builds. See `BUILD_APK.md` for instructions.
- `pnpm run build:apk` — build web assets + sync to Android
- `pnpm run cap:init` — initialize Android project (first time)
- `pnpm run cap:open` — open in Android Studio
