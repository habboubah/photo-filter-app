# Working on Bildklar

What the README leaves out: where things live, the single checks, the native
tests, the demo library, the city table and the icon. The rules the code
follows are in [CLAUDE.md](../CLAUDE.md); the concept in [PLAN.md](PLAN.md).

## Project layout

| Path | What |
|---|---|
| `src/App.tsx` | Navigation (pushed screens, no router), the analysis memos, the paywall, deleting and albums, toasts |
| `src/store.ts` | All state: access, the scan, the photo facts, the decisions, the unlock, view preferences |
| `src/logic/` | Pure logic, tested next to each module: `features` (the spec), `geo`, `home`, `trips`, `naming`, `similar`, `best`, `blur`, `review`, `state`, `analyze`, and `fixtures` (made-up libraries) |
| `src/native/` | The plugins' TypeScript side (`photoLibrary.ts`, `purchases.ts`) and the demo library (`demo/`) |
| `src/components/` | Screens (`*View`) and sheets (`*Sheet`) |
| `src/ui/` | Shared primitives: Screen, Sheet, Button, Field, Toast, Photo (Thumb, PhotoGrid, Mosaic), Controls |
| `src/cities.ts`, `src/data/cities.tsv` | The offline city table and its loader ([CITIES.md](CITIES.md)) |
| `src/licences.json` | Every open-source part the app ships and its licence text, for *Einstellungen › Lizenzen* (`npm run licences`) |
| `src/thumbs.ts` | The thumbnail queue (6 at a time, newest first) |
| `src/translations.ts` | All UI text: `de`, `en`, and Android's wording |
| `src/index.css` | The design tokens ("Album") |
| `ios/App/App/` | `PhotoLibraryPlugin.swift` (+ `MainViewController`), `ScanStore.swift` (SQLite), `PurchasesPlugin.swift` (StoreKit 2) |
| `ios/PhotoFeatures/` | `FeatureMath.swift` as a Swift package with its tests (the app target compiles the same file) |
| `android/app/src/main/java/com/habboubah/bildklar/` | `PhotoLibraryPlugin.kt`, `ScanStore.kt`, `FeatureMath.kt`, `PurchasesPlugin.kt`, `MainActivity.kt` |
| `fixtures/features/` | The shared test pictures and `expected.json` |
| `ios/AppReviewRecorder/` | The UI test that records the App Review video, and its `scenes.json` |
| `scripts/` | Release, screenshots, the checks, icons, the city table, the demo photos, the feature fixtures |
| `store/` | Store texts (`listing.md`), the privacy pages, the Play icon |
| `docs/` | Plan, features, release guides, what is left to do |

## The checks one by one

```bash
npm run lint             # type-check
npm test                 # unit tests (logic, features, translations, dialogs)
npm run check:security   # no console.* in app source, npm audit
npm run check:privacy    # drives the demo through every flow: no request may leave; no network code in Swift/Kotlin
npm run check:perf       # 50,000 photos analysed within budget; the native bundle's size; no demo photo in it
npm run check:listing    # every text in store/listing.md and release-notes/ fits its store's limit
npm run audit:contrast   # every token pair in both themes against WCAG AA
npm run test:ios         # FeatureMath.swift against fixtures/features (swift test — a Mac, or any Linux with Swift)
npm run test:android     # FeatureMath.kt against fixtures/features (JUnit)
```

## Building for a phone

- **iPhone:** `npm run build:ios`, then in Xcode the **App** target →
  *Signing & Capabilities* → your team (already set), ▶ Run. The first build
  resolves the Swift packages.
- **Android:** `npm run build:android` (Android Studio) or `npm run android:debug`
  (an APK to install with `adb install`).
- Both use `vite build --mode native`: without the demo library. A debug build
  starts with the **dry run** on — switch it off in Settings to really write.

## The demo library

In a browser (`npm run dev`, the checks, the screenshots, the rehearsal) the
plugins are `src/native/demo/`: 101 photos and videos of a home near Hanau and
trips to Amsterdam, Vienna, Paris and Lake Garda, with bursts, blurry shots,
copies, screenshots, notes and failed shots. The photos are **real**: CC0
pictures of the test library (below), only those without identifiable people,
so they may go into the store screenshots and the preview video. The
screenshots, notes and failed shots are drawn. Their facts (`facts.json`) are
computed by the app's own feature spec from the pictures:

```bash
npm run demo-photos      # the real photos into the demo, id by id, then their facts (npm run test-photos first: it downloads them)
npm run ai:demo          # the AI's scores, then the facts again (ml/'s venv)
```

`manifest.json` (every time and place) is the demo's story and is edited by
hand: `scripts/demo-photos.py` only makes the pictures (the `SHOTS`, `FRAMES`,
`COPIES` and `POSTERS` tables map each id to its photo), so the screenshots,
the preview video and the App Review scenes still find what they expect.

The demo's state lives in localStorage: `bildklar-demo-access`
(`notDetermined` · `limited` · `denied` · `full`, also `?access=…` in the URL),
`bildklar-demo-scanned`, `bildklar-demo-owned`, `bildklar-demo-trashed`,
`bildklar-demo-restorable`, `bildklar-demo-scan-step` (ms per step of a first
scan; the scan screenshot slows it down). `bildklar-dev-platform` = `android`
gives a development or demo build Android's words. In dev the app is a "debug build": the dry run is
on until `bildklar-dry-run` is `0`.

## The test library

For a full test on a simulator, an emulator or a test phone — never your own
library — `npm run test-photos` builds `test-photos/` (gitignored, about
300 MB): about 560 real photos and videos as a phone holds them. Every one
is **CC0 1.0** (public domain, from Openverse and Wikimedia Commons), so they
may also go into the store screenshots and the preview video; the sources are
in `scripts/test-photos.json`, and `test-photos/credits.csv` maps each file to
its source. `store: false` (`no` in the CSV) marks identifiable people and the
Eiffel Tower lit at night: fine for tests, not for store assets.

The script renames them (`IMG_1001.JPG` …) and gives each a date and a place
in its EXIF (videos: QuickTime `creationdate` and `ISO6709` location): two years
at home in Hainburg, November 2024 to November 2026 — Christmas, birthdays,
Eid, Ramadan, Easter, St. Martin, carnival, Halloween, snow, the zoo, the farm,
food, pets, the twins — and 13 trips (Vienna, Barcelona, Paris, a wedding at
the Baltic Sea, Amsterdam, Istanbul, the Rhine, London, Berlin, skiing in the
Alps, the Black Forest, Lake Garda, the North Sea); some photos without GPS, and photos on
17 November of earlier years for *An diesem Tag*. On top: bursts of
near-identical shots seconds apart (some blurry), photos saved again from
WhatsApp (`IMG-…-WA….jpg`, small, no EXIF), one exact duplicate
(`… (1).JPG`), screenshots (`Screenshot_….png`, made-up apps), a shot in the
pocket and one into the sun, one long video and a lookalike video
(`VID-…-WA….mp4`). The timeline is the `EVENTS` table in the script (trips and
occasions); everyday photos go into `SPREAD`, one a day in their season, never
inside a trip (`TRIPS`).

```bash
npm run test-photos           # downloads into .cache/test-photos/ once, then builds (Pillow, ffmpeg)
npm run test-photos -- --offline   # rebuild from the cache only
npm run test-photos:sim       # xcrun simctl addmedia into the booted simulator
npm run test-photos:android   # adb push into DCIM/Camera, Pictures/Screenshots, WhatsApp's folders; then a media scan
```

Not every kind of photo can be found free: `scripts/test_photos_drawn.py` draws
the rest — receipts, letters, whiteboards, QR codes, photos of a screen (their
seeds are the ones the AI files under *Unwichtige Fotos*, checked with the
model), shaken shots (a real room, tilted and smeared), memes from CC0 photos,
and screenshots of made-up apps. Screenshots carry what an iPhone writes into
one (EXIF UserComment "Screenshot").

**In the browser.** `npm run demo-library` copies the test library into
`src/native/demo/test-library/` (not in git: 1024-px pictures, video posters,
each video as an H.264 MP4 of at most 720p for the browser's player
(`videos/`; alone: `python3 scripts/demo-library.py --clips`), the facts with
the app's own features and, with ml/'s venv active, the AI's scores).
`npm run dev` then shows it instead of the curated demo — its videos play
(`src/native/demo/player.ts`, the phones' players drawn in the browser);
`?library=demo` switches back (remembered in `bildklar-demo-library`). Only the
dev server loads it (`src/native/demo/testLibrary.ts`): production builds — the
checks, the screenshots, the preview video — never contain it, and the App
Review rehearsal pins the curated demo.

Wikimedia Commons slows down a script after a few downloads (HTTP 429): the
script waits and goes on, and whatever is still missing is fetched on the next run.

## The features

`src/logic/features.ts` is the spec; `FeatureMath.swift` and `FeatureMath.kt`
follow it to the bit. To change it: change all three, bump `FEATURE_VERSION`
in all three, then

```bash
python3 scripts/feature-fixtures.py                             # only if the pictures change
node --experimental-strip-types scripts/feature-vectors.mjs     # writes fixtures/features/expected.json
npm test && npm run test:ios && npm run test:android
```

## The licences

*Einstellungen › Über die App › Lizenzen* lists every open-source part the
app ships, alphabetically, and a tap shows its full licence text — the way
Google's "Open source licences" screen and iOS acknowledgements do. The
list is `src/licences.json`, written by `npm run licences` from the
production npm tree (`npm ls --omit=dev`, each package's own LICENSE file)
plus the parts that are not npm packages, listed in `scripts/licences.mjs`:
ONNX Runtime, SigLIP 2, the fonts, GeoNames and, on Android only, AndroidX,
Media3 and the Kotlin standard library. Run it after adding or updating a
dependency or a native library; `src/licences.test.ts` fails while a
dependency or its version is missing.

## The city table

`npm run cities` downloads GeoNames' `cities15000` and `alternateNamesV2`
(about 210 MB, into `.cache/geonames/`) and writes `src/data/cities.tsv`
(about 1 MB, 31,800 places with German and English names). See
[CITIES.md](CITIES.md) for the licence.

## Icon and splash

The master is `assets/icon-master.png` (a smiling broom sweeping photos together, on mint
`#8AE1B7`); `assets/icon-master-foreground.png` is the same picture smaller for
Android's adaptive icon. Both are 1024 × 1024, full-bleed, no transparency.

```bash
node scripts/icon-assets.mjs && npm run assets:generate
```

## Screenshots

`npm run screenshots` captures the nine store screens from the demo, with
`<screen>.marks.json` beside each (`-- --android`: the same with Android's
words, for Google Play); `npm run store-screenshots` composes the App Store
and Play sets (headlines in
`.claude/skills/store-screenshot-studio/config/copy.<de|en>.json`).
`npm run app-preview` films the App Store preview video from the demo
(`.claude/skills/app-preview-video/`).
`npm run ui-review` takes every screen by day and at night (iPhone Pro Max and
SE) and on a small Android phone. Run them on the Mac.

## Adding a language

Add a block to `src/translations.ts` (TypeScript lists any missing key; give
`androidStrings` its twins). A right-to-left language sets `dir: 'rtl'`. Add
its name column to `scripts/cities.mjs` if the city names should follow, and
its `InfoPlist.strings` / `values-<lang>/strings.xml`.
