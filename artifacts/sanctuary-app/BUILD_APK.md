# Sanctuary — APK Build Guide

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+
- [Android Studio](https://developer.android.com/studio) (with Android SDK)
- Java 17+

## Steps

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd <repo>/artifacts/sanctuary-app
pnpm install
```

### 2. Initialize Android Project (first time only)

```bash
pnpm run cap:init
```

This creates the `android/` directory with the native Android project.

### 3. Build Web Assets & Sync

```bash
pnpm run build:apk
```

This builds the Vite app into `dist/public/` and syncs it into the Android project.

### 4. Open in Android Studio

```bash
pnpm run cap:open
```

Android Studio will open. Wait for Gradle sync to complete.

### 5. Generate APK

In Android Studio:

1. **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`

For a signed release APK:

1. **Build > Generate Signed Bundle / APK**
2. Choose APK, create or select a keystore
3. Choose `release` build variant
4. The signed APK will be in `android/app/build/outputs/apk/release/`

### 6. Install on Device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Or transfer the APK file to your Android device and install it directly.

## Rebuilding After Code Changes

```bash
pnpm run build:apk
pnpm run cap:open
```

Then rebuild in Android Studio.
