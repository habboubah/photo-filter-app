# Bildklar 📸

A photo organizer for parents, for iPhone and Android: trips become albums,
near-identical and blurry photos get cleaned up — all on the device.
German *Bildklar KI: Fotos aufräumen*, English *Bildklar AI: Photo Cleaner*; code
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

**1. The test library** — about 560 photos and videos (≈ 300 MB) for a simulator, an emulator
or a test phone (never your own phone):

```bash
npm run test-photos           # downloads once into .cache/test-photos/, then builds test-photos/ (Pillow, ffmpeg)
npm run test-photos           # again later if it says videos are missing (Wikimedia asks to slow down)
npm run test-photos -- --offline   # rebuild from what is downloaded, without the network
npm run test-photos:sim       # into the booted iOS simulator's Photos (open -a Simulator first)
npm run test-photos:android   # onto the emulator / test phone adb sees, then a media scan
```

Every file gets a new name (`IMG_1001.JPG` …) and a date and place in its
EXIF / QuickTime data: two years at home in Hainburg — family, parties, Eid,
Ramadan, Easter, carnival, Christmas, food, pets, the zoo and the farm — and
13 trips (Vienna, Barcelona, Paris, the Baltic Sea, Amsterdam, Istanbul, the
Rhine, London, Berlin, the Alps, the Black Forest, Lake Garda, the North Sea),
with bursts, blurry shots, WhatsApp copies, memes, a duplicate, 30 screenshots,
failed shots, 20 videos and ~40 unimportant photos (receipts, letters,
whiteboards, QR codes, photos of a screen, shaken shots — drawn, so the AI
files them under *Unwichtige Fotos*).
`test-photos/credits.csv` lists each file's source; `store = no` (identifiable
people, the Eiffel Tower lit at night) are for tests only. To change the story,
edit `EVENTS` in `scripts/test-photos.py`; to add photos, add them to
`scripts/test-photos.json` (CC0 only).

**2. The whole test library in the browser** — `npm run dev` shows it at
http://localhost:3001 once it is built (`?library=demo` switches back to the
curated demo, `?library=test` to this one again):

```bash
npm run test-photos           # once
npm run demo-library          # copies it into src/native/demo/test-library/ (not in git), with ml/'s venv for the AI
```

**3. The curated demo's photos** — the 101 the checks, the screenshots, the preview
video and the App Review rehearsal always use (only photos without identifiable people):

```bash
npm run test-photos           # once, for the downloads
npm run demo-photos           # puts them into src/native/demo/photos/, computes their facts
npm run ai:demo               # the AI's vectors (ml/.venv: pip install -r ml/requirements-light.txt)
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
npm run screenshots && npm run store-screenshots && npm run app-preview 

npm run screenshots                               # raw captures → screenshots/de, en (App Store) and de-android, en-android (Google Play)
npm run screenshots -- --only 02-home,06-group    # only some screens
npm run screenshots -- --ios                      # only the iPhone ones (or --android: only Google Play's)
npm run store-screenshots                         # framed store sets → screenshots/store/
npm run ui-review                                 # every screen → screenshots/review/
npm run app-preview                               # App Store preview video → screenshots/store/app-preview/ (needs ffmpeg)
```

## App Review recording

iPhone on the cable, unlocked, Do Not Disturb on, **only the test photos on it**
(`test-photos/`, AirDropped). Every full run deletes Bildklar and installs it
again from TestFlight, so the first run is filmed.

```bash
npm run rehearse:app-review          # checks every step against the code
DRY_RUN=1 npm run record:app-review  # full run on the iPhone, without recording
npm run record:app-review            # the real recording → video in Photos
npm run record:watch                 # leave open: Claude starts the runs and reads the log
```

To let Claude run and fix it: start `npm run record:watch` in a Terminal
window, leave it open, then write in a new Claude session:

> Run the App Review dry run through record:watch, read build/record-last.log,
> fix every error and run it again until it passes. Then tell me to record.

Preparation: [ios/AppReviewRecorder/README.md](ios/AppReviewRecorder/README.md).

The video too large to upload? Make it smaller (needs ffmpeg):

```bash
ffmpeg -i "ScreenRecording_11-20-2026 16.MP4" -vf "scale=-2:1280,fps=30" -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -an -movflags +faststart app-review-small.mp4
```

## Release

```bash
npm run release:dry      # what would happen; nothing built or sent
npm run release          # both stores on one version
npm run release:ios      # the App Store only (first upload: npm run release:first)
npm run release:android  # Google Play only (once: npm run android:key)
npm run store:listing:dry  # the store texts, screenshots and video that would go up; nothing sent
npm run store:listing     # put them into App Store Connect and the Play Console
```

### The whole release with Claude (skill `bildklar-full-release`)

One request, and Claude does every step itself: What's New, `npm run check`,
screenshots, preview video, `npm run release`, `npm run store:listing`. When
nothing in the app changed since the last tag, it only brings the store pages
(texts, screenshots, video) up to date. Only **Add for Review** (App Store) and
**promoting** the Play release stay yours.

The skill is in `docs/skills/bildklar-full-release/SKILL.md`.

1. On the **Mac** (Xcode and the keys are there), start Claude Code in this
   folder: `cd ~/repos/photo-filter-app && claude` — or the desktop app's
   *Code* tab with this folder as a local session.
2. The first time, install the skill — paste:
   ```text
   Kopiere docs/skills/bildklar-full-release nach .claude/skills/bildklar-full-release.
   ```
   then start a new session (so it sees the skill). After that, always:
   ```text
   /bildklar-full-release
   ```
   Without installing, this works too:
   ```text
   Lies docs/skills/bildklar-full-release/SKILL.md und führe es komplett aus.
   ```
3. Add what is special this time if you like: *„ohne neues Video“*,
   *„nur Google Play“*, *„nur die Listings“*. It always takes the next patch
   version (the last number); minor and major releases are not done.
4. At the end it tells you what went up and what is left (also in
   `docs/TODO.md`). It never submits for review or pushes.

Before the first run: `.env.release` filled in (see `.env.release.example`),
`npx playwright install chromium` and `brew install ffmpeg`.

## More

Everything else is in [docs/](docs/): [the plan](docs/PLAN.md) (architecture,
data model, platform mapping, decisions) · [features](docs/features.md) ·
[development](docs/DEVELOPMENT.md) · [App Store release](docs/APP_STORE_RELEASE.md) ·
[Android release](docs/ANDROID_RELEASE.md) · [what is left to do](docs/TODO.md).
