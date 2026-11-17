# Bildklar 📸

A photo organizer for parents, for iPhone and Android: trips become albums,
near-identical and blurry photos get cleaned up — all on the device.
German *Bildklar KI: Foto Reiniger*, English *Bildklar AI: Photo Cleaner*; code
name bildklar. Bundle id `com.habboubah.bildklar`.

## Setup

Needs Node.js 22, Xcode (iPhone) and Android Studio (Android).

```bash
npm install
npx playwright install chromium   # once per Mac, for the checks and screenshots
```

## Run

```bash
npm run dev              # http://localhost:3001 — the demo library stands in for the photos
```

## A real test library

```bash
npm run test-photos          # ~200 real CC0 photos and videos with dates and places → test-photos/
npm run test-photos:sim      # into the booted iOS simulator's Photos
npm run test-photos:android  # onto the emulator / test phone adb sees
```

## Build

```bash
npm run build:ios        # native web build → sync into ios/ → opens Xcode, then ▶ Run
npm run build:android    # native web build → sync into android/ → opens Android Studio, then ▶ Run
npm run android:debug    # debug APK → android/app/build/outputs/apk/debug/app-debug.apk
```

## Check

```bash
npm run check            # lint, tests, privacy, performance, contrast, store texts — before a release
npm run test:ios         # the iPhone's feature code (swift test)
npm run test:android     # the Android feature code (gradlew)
```

## Screenshots

```bash
npm run screenshots                               # raw captures → screenshots/de, screenshots/en
npm run screenshots -- --only 02-home,06-group    # only some screens
npm run screenshots -- --android                  # Android's words → screenshots/de-android, en-android (Google Play)
npm run store-screenshots                         # framed store sets → screenshots/store/
npm run ui-review                                 # every screen → screenshots/review/
npm run app-preview                               # App Store preview video → screenshots/store/app-preview/ (needs ffmpeg)
```

## App Review recording

iPhone on the cable, unlocked, Do Not Disturb on, the demo photos on it.

```bash
npm run rehearse:app-review          # checks every step against the code
DRY_RUN=1 npm run record:app-review  # full run on the iPhone, without recording
npm run record:app-review            # the real recording → video in Photos
```

Preparation: [ios/AppReviewRecorder/README.md](ios/AppReviewRecorder/README.md).

## Release

```bash
npm run release:dry      # what would happen; nothing built or sent
npm run release          # both stores on one version
npm run release:ios      # the App Store only (first upload: npm run release:first)
npm run release:android  # Google Play only (once: npm run android:key)
```

## More

Everything else is in [docs/](docs/): [the plan](docs/PLAN.md) (architecture,
data model, platform mapping, decisions) · [features](docs/features.md) ·
[development](docs/DEVELOPMENT.md) · [App Store release](docs/APP_STORE_RELEASE.md) ·
[Android release](docs/ANDROID_RELEASE.md) · [what is left to do](docs/TODO.md).
