# Working on Fotonest

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
| `src/thumbs.ts` | The thumbnail queue (6 at a time, newest first) |
| `src/translations.ts` | All UI text: `de`, `en`, and Android's wording |
| `src/index.css` | The design tokens ("Album") |
| `ios/App/App/` | `PhotoLibraryPlugin.swift` (+ `MainViewController`), `ScanStore.swift` (SQLite), `PurchasesPlugin.swift` (StoreKit 2) |
| `ios/PhotoFeatures/` | `FeatureMath.swift` as a Swift package with its tests (the app target compiles the same file) |
| `android/app/src/main/java/com/habboubah/fotonest/` | `PhotoLibraryPlugin.kt`, `ScanStore.kt`, `FeatureMath.kt`, `PurchasesPlugin.kt`, `MainActivity.kt` |
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
plugins are `src/native/demo/`: 82 drawn photos of a home near Hanau and
trips to Amsterdam, Vienna, Paris and Lake Garda, with bursts, blurry shots and
screenshots. Their facts (`facts.json`) are computed by the app's own feature
spec from the drawn pictures:

```bash
npm run demo-photos      # draws the photos (Pillow), then computes their facts
```

The demo's state lives in localStorage: `fotonest-demo-access`
(`notDetermined` · `limited` · `denied` · `full`, also `?access=…` in the URL),
`fotonest-demo-scanned`, `fotonest-demo-owned`, `fotonest-demo-trashed`,
`fotonest-demo-restorable`, `fotonest-demo-scan-step` (ms per step of a first
scan; the scan screenshot slows it down). `fotonest-dev-platform` = `android`
gives a development or demo build Android's words. In dev the app is a "debug build": the dry run is
on until `fotonest-dry-run` is `0`.

## The features

`src/logic/features.ts` is the spec; `FeatureMath.swift` and `FeatureMath.kt`
follow it to the bit. To change it: change all three, bump `FEATURE_VERSION`
in all three, then

```bash
python3 scripts/feature-fixtures.py                             # only if the pictures change
node --experimental-strip-types scripts/feature-vectors.mjs     # writes fixtures/features/expected.json
npm test && npm run test:ios && npm run test:android
```

## The city table

`npm run cities` downloads GeoNames' `cities15000` and `alternateNamesV2`
(about 210 MB, into `.cache/geonames/`) and writes `src/data/cities.tsv`
(about 1 MB, 31,800 places with German and English names). See
[CITIES.md](CITIES.md) for the licence.

## Icon and splash

The master is `assets/icon.svg` (three photos in a nest, on the teal).

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
