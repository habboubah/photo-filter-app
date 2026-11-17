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

## Test photos

Two sets, both made from real **CC0** photos and videos (public domain: free for
tests, the store screenshots and the preview video; sources in
`scripts/test-photos.json`):

**1. The test library** — about 200 photos and videos for a simulator, an emulator
or a test phone (never your own phone):

```bash
npm run test-photos           # downloads once into .cache/test-photos/, then builds test-photos/ (Pillow, ffmpeg)
npm run test-photos           # again later if it says videos are missing (Wikimedia asks to slow down)
npm run test-photos -- --offline   # rebuild from what is downloaded, without the network
npm run test-photos:sim       # into the booted iOS simulator's Photos (open -a Simulator first)
npm run test-photos:android   # onto the emulator / test phone adb sees, then a media scan
```

Every file gets a new name (`IMG_1001.JPG` …) and a date and place in its
EXIF / QuickTime data: two years at home in Hainburg and trips to Vienna, Paris,
the Baltic Sea, Amsterdam, the Rhine and Lake Garda — with bursts, blurry
shots, WhatsApp copies, a duplicate, screenshots and failed shots.
`test-photos/credits.csv` lists each file's source; `store = no` (identifiable
people, the Eiffel Tower lit at night) are for tests only. To change the story,
edit `EVENTS` in `scripts/test-photos.py`; to add photos, add them to
`scripts/test-photos.json` (CC0 only).

**2. The web demo's photos** — what `npm run dev`, the checks, the screenshots
and the preview video show (only photos without identifiable people):

```bash
npm run test-photos           # once, for the downloads
npm run demo-photos           # puts them into src/native/demo/photos/, computes their facts
npm run ai:demo               # the AI's scores (ml/'s venv: pip install -r ml/requirements.txt)
```

Then reload http://localhost:3001. Which photo each demo id shows is in the tables
at the top of `scripts/demo-photos.py`; the times and places stay in
`src/native/demo/manifest.json`. Details: `docs/DEVELOPMENT.md`.

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
