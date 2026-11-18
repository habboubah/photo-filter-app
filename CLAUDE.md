# CLAUDE.md

Steering file for AI assistants working in this repository: where the code
lives, the rules it follows, and what to check before a change is done.

Bildklar is built the same way as the shopping list (`../shopping-list`) and
Spartopf (`../budget-app`): the same architecture, settings, release and
screenshot tooling and skills. When a convention is missing here, the shopping
list's `CLAUDE.md` is the reference, then budget-app's `docs/CLAUDE.md` —
**except for the look**, which is Bildklar's own ("Album", see *Styling*), and
the native code, which follows budget-app's plugin pattern. This file stays at
the root; every other document lives in `docs/` (only `README.md` stays here):

| File | What it is for |
|---|---|
| `README.md` | Only the commands: setup, run, build, check, screenshots, release |
| `docs/TECHNOLOGY.md` | An overview for readers: the stack, the tools, which AI runs, how and why |
| `docs/PLAN.md` | The concept: architecture, data model, platform mapping, design, the decisions and why |
| `docs/DEVELOPMENT.md` | The project layout, the single checks, the native tests, the demo library, the test library, the city table, icons |
| `docs/DESIGN.md` | The design system: tone, tokens, type, spacing, motion, component states, the first run |
| `docs/features.md` | Every feature, as the user sees it |
| `docs/TODO.md` | What only Ahmad can do: devices, Xcode, the stores, photos |
| `docs/APP_STORE_RELEASE.md`, `docs/ANDROID_RELEASE.md` | The store releases step by step |
| `docs/CITIES.md` | The offline city table and its licence (GeoNames, CC BY 4.0) |
| `store/listing.md` | Every store listing text, App Store and Google Play, in one file |

## What this app is
**Bildklar** (*Bildklar KI: Foto Reiniger* / *Bildklar AI: Photo Cleaner*; code
name **bildklar**, bundle id `com.habboubah.bildklar`): a photo organizer for
parents on iPhone and Android. It scans the photo library on the device, turns
trips into albums (iPhone) or folders (Android), finds near-identical and
blurry photos and suggests what could go. Free to scan and look, and the first 50 deletes; albums and
further deleting need one one-time purchase (`com.habboubah.bildklar.unlock`, 4,99 €).
**For now everything is free** (since 18 November 2026): `UNLOCK_ON_SALE = false`
(`src/logic/allowance.ts`) — the extras work for everyone with no paywall,
deleting has no limit, and each install is marked `early`, which keeps the
extras and unlimited deletes after the sale. A new paid feature goes through
`needUnlock` in `App.tsx` (free while `extrasFree()`); it is always shown,
never as "coming soon". The store set, the preview video and the App Review
scenes follow the switch (docs/PLAN.md, *Pricing*).
**No backend, no account, nothing leaves the device.**

## Stack
- React 19 + TypeScript (strict), Vite 6, Tailwind CSS 4, `lucide-react`, `motion`.
- Capacitor 8 wraps `dist/` into `ios/` and `android/`. Our own plugins:
  `PhotoLibrary` and `Purchases` (Swift in `ios/App/App/`, Kotlin in
  `android/app/src/main/java/com/habboubah/bildklar/`, TypeScript in `src/native/`).
- npm only. **Dependencies are pinned to exact versions** (no `^`/`~`), the
  shopping list's versions unless a newer one is needed. `npm run check` runs
  `npm audit --omit=dev --audit-level=high`. Before adding one: prefer the
  platform and what's here; read its releases, issues and licence. Anything
  that touches the photo library or purchases is our own code, not a plugin.
- **Privacy and security.** The app talks to nobody: `scripts/privacy-check.mjs`
  drives the built app through every flow and fails on any request to another
  origin, every URL in the bundle must be on its allowlist, and our Swift and
  Kotlin must contain no network calls. Production builds carry a CSP
  (`vite.config.ts`). No `console.*` in app source (`check:security`).
  No analytics, crash reporting, Firebase or ML Kit — ever (docs/PLAN.md, *Privacy*).
- **On-device AI** (docs/AI.md): SigLIP 2's image encoder (`ai-assets/image.onnx`,
  Apache 2.0) in **ONNX Runtime 1.24.2** on both phones — the same version in
  `ios/scripts/add-ai.rb` / `ios/AIFeatures/Package.swift` and
  `onnxruntimeVersion` (`android/variables.gradle`). Never ML Kit, Gemini Nano,
  MediaPipe Tasks, LiteRT from Play services or a cloud model
  (`npm run check:ai` fails on them). The model and the projection live once,
  in `ai-assets/`; `ml/` rebuilds and measures them.

## Architecture rules
- **No router.** `App.tsx` holds one state per pushed screen. The `pushed`
  array (deepest first) is the nav's single source of truth (back button,
  scroll reset, slide direction) and must match the render order in `content()`.
  The root has two tabs (`tab`: `clean` = `HomeView`, `organize` =
  `OrganizeView`); they are one screen for the stack, so pushed screens slide
  over either, and switching crossfades and keeps each tab's scroll position.
- **No global store library.** All state lives in `useAppStore()` in
  `src/store.ts`. Immutable updates only.
- **Screens** are `src/components/XxxView.tsx`, bottom sheets `XxxSheet.tsx`.
  Named exports, props typed above.
- **Shared primitives** in `src/ui/` (`Screen`, `SectionHead`, `Group`, `Row`, `MenuRow`,
  `IconTile`, `Next`, `Away`, `Dock`, `TabBar`, `StorageBar`, `Empty`, `Sheet`, `Confirm`, `Button`,
  `IconButton`, `Field`, `Toast`, `Progress`, `SwitchRow`, `Segmented`,
  `Badge`, `Thumb`, `PhotoGrid`, `Mosaic`, `SortMenu`, `haptics`; for the first
  run `TipHost`, `Dots`, `CountUp`, `Ring`, `PhotoFrame`, `Foot`). Compose them.
- **Screens opened less often are lazy** (`lazy()` in `App.tsx`, under one
  `<Suspense>`): the main bundle has a budget (`scripts/perf-check.mjs`). A new
  screen is lazy unless home needs it at once.
- **Platform**: `src/platform.ts` (`isNative`, `isAndroid`, `isIos`). Never
  sniff the user agent for behaviour.
- **Pure logic** goes in `src/logic/` (one module per concern, tested next to
  it: `*.test.ts`). Components never compute trips, groups or sizes themselves.
- **The bridge carries facts, never image data.** Facts come in pages of
  `PAGE` (2,000) rows; progress comes as `scanProgress` events. Thumbnails are
  files the native side writes; `<img>` loads them via `fileUrl()` (`Capacitor.convertFileSrc`).
- **Grids are virtualised** (`PhotoGrid`). Never render a list of every photo.
- **Videos play inside the app**: `PlayerContext` (`src/ui/play.tsx`, provided
  in `App.tsx`) → `PhotoLibrary.preview` — iPhone AVPlayerViewController,
  Android `VideoPlayer.kt` (a full-screen VideoView). Never hand a video to
  another app (no `ACTION_VIEW`). A big picture of a video takes `<PlayOver>`;
  a `PhotoGrid` without `onOpen` plays its video tiles by itself.
- **The first run** (docs/DESIGN.md): the welcome (`WelcomeView`), the first
  scan's screen (`FirstScanView`) and its reveal (`RevealView`) are root-level
  steps in `App.tsx` (`root`), shown once; the guided review (`ReviewGuide`),
  the safety moments (`SafetyNets`) and the tips are one-time too. What was
  seen is `store.seen` (`src/logic/firstRun.ts`, `bildklar-seen`). **A tip is
  an entry in `src/tips.ts` and a `data-tip="<id>"` on its control** — one
  host (`ui/Tip.tsx`), one at a time; no screen builds its own hint. Home's
  next step and the reveal's recommendation are one choice
  (`src/logic/nextStep.ts`).
- **The user's decisions** (`src/logic/state.ts`) go through `normalizeState()`
  and are saved by the native plugin as a file — not localStorage (iOS may
  clear it on a full phone). Add fields as optional; bump `SCHEMA_VERSION`
  and migrate in `normalizeState` when a shape changes. View preferences
  (language, theme, dry run) stay `bildklar-*` localStorage keys.
- **The features are a spec.** `src/logic/features.ts`, `FeatureMath.swift`
  (`ios/PhotoFeatures`, also compiled into the app) and `FeatureMath.kt` must
  give the same numbers for `fixtures/features/` (`expected.json`). Change all
  three together, bump `FEATURE_VERSION` in all three, then
  `node --experimental-strip-types scripts/feature-vectors.mjs`.
- **The AI is a spec too.** Native code turns a photo into its **compact
  vector** (the embedding × `ai-assets/compact.bin`, 256 numbers, int8 base64)
  and stores it; everything else is TypeScript from the vectors: label scores
  (`src/logic/aiLabels.json`), search (`src/search/words.json`), similar
  groups, copies, look-alikes. `src/logic/ai.ts` (`LABELS`, `AI_VERSION`,
  `LABELS_VERSION`, the thresholds), `ml/labels.yaml`, `aiLabels.json`,
  `ai-assets/vectors.json`, `ImageEmbedder.swift` and `ImageEmbedder.kt`
  agree (`check:ai`); the native embedders must match
  `fixtures/ai/expected.json` (`npm run test:ios:ai`, `npm run test:android`).
  New labels or search words: `npm run ai:labels`, bump `LABELS_VERSION` (no
  new AI pass). A new model or projection: `ml/export.py`, `ml/compact.py`,
  `npm run ai:labels`, `ml/fixtures.py`, `npm run ai:demo`, bump `AI_VERSION`
  everywhere. Vectors come over the bridge apart from the facts
  (`getVectors`, pages of 2,000) and live in one `Float32Array`
  (`src/logic/vectors.ts`); hot loops copy imported constants into locals.
- **How sure** (`src/logic/confidence.ts`): every finder's delete gets a
  `Trust` (sure / likely / check) and a `Detail`; quick clean deletes only
  `oneTap` ones. What the user keeps (`src/logic/ledger.ts`) and their
  best-shot picks (`best.ts` `learnPick`) live in the decisions file and only
  make the app *less* sure or reweigh the best shot — never more eager.
  Photos of an ID or a bank card (the `sensitive` labels) are protected.
- **The demo library** (`src/native/demo/`) is the plugins in a browser. It
  must never reach a native build: native builds use `vite build --mode native`
  (`__DEMO__` false); `scripts/perf-check.mjs` fails if a demo photo is in that bundle.
- Web loaders for `registerPlugin` are memoised (`demo ??= …`): Capacitor runs
  an async loader once per racing call, which split listeners across instances.

## Safety rules (never break these)
- Never delete, move or change a photo automatically. Every delete or move
  needs the user's tap **and** the system's own dialog.
- **Choosing to delete puts aside, never deletes** (`src/logic/bin.ts`,
  *Zum Löschen vorgemerkt* / *Marked for deletion*, formerly *Zum Löschen*): a review's end, a
  group's *Die anderen zum Löschen vormerken*, quick clean and a list's *Löschen vormerken*
  call `toBin` (App.tsx) — the photos leave every
  finder (`lib` is the library without the bin; `all` has it) and wait in
  `AppState.bin`. Only the bin's screen (and a review started from it) calls
  `deletePhotos` → the system's dialog, after a sheet that shows exactly what
  goes and its size (BinView). A new place that deletes goes through `toBin`
  too. Marking for deletion is never styled as deleting: no red, no trash icon
  (`Archive` and teal or quiet glass); red (`neg`, `destructive`) is only
  for what really deletes. (Exception: the originals after a smaller copy or a Live Photo
  made a still — the copy is already saved.)
- A new asset (a plain photo made from a Live Photo, a smaller copy of a video
  or of a photo) needs the user's tap and a confirmation in the app; the original stays and
  goes only through the system's delete dialog afterwards. The copy keeps the
  original's date, place and favourite flag (and, for a still, its albums).
- Deleted photos go to Recently Deleted (iPhone) / the Trash (Android) only —
  `deleteAssets` / `createTrashRequest`, never `createDeleteRequest`, never
  `MANAGE_MEDIA`.
- **Dry run**: every native write takes `dryRun`. Debug builds start with it
  on (`store.ts`: `debug && dryRunPref !== false`); release builds never run dry.
- On Android, files are moved (RELATIVE_PATH) only after `createWriteRequest`'s
  dialog, and their contents never change. Nothing is copied — except a smaller
  video or photo, which is a new file of the app's own next to the original.
- A protected photo is never suggested for deleting — a favourite (system
  Photos / Gallery), a photo kept in a review, one protected by hand, in a
  protected trip or album. Every finder asks `isProtected` (`src/logic/protect.ts`)
  or takes the protected set as its `kept`; never a check of its own.
- Filing into albums while swiping writes nothing during the review; the end
  screen confirms everything at once (`addToAlbums`; Android: one
  `createWriteRequest` dialog).

## i18n
- `src/translations.ts`: one flat object per language (`de`, `en`, `ar`).
  Default `de`; first run follows the device language. Every key in every
  block, with the same `{placeholders}` (`translations.test.ts` checks).
- Counts go through `plural(t, 'photos', n)` (`_one` / `_other` keys) and sizes
  through `bytes(t, n)` — never hand-built. Arabic's extra forms (two: صورتان,
  few: 3–10 صور) live in `EXTRA_PLURALS`; a new `_one`/`_other` pair needs its
  Arabic `_two` / `_few` there too.
- **The first run's strings** (the welcome, the photo access, the first scan,
  the reveal, the guided review, the safety moments, the tips, *So
  funktioniert Bildklar*) are German and English in `src/translations.firstRun.ts`,
  their own chunk (Arabic has them in its one block). A screen that shows one
  is loaded through `withFirstRun` in `App.tsx`; code in the main bundle must
  not read them at render time (`loadFirstRun` lays them in when the screen comes).
- **Android's wording**: a string that names the iPhone, Apple Photos, an
  album or "Zuletzt gelöscht" gets a twin in `androidStrings` (a test fails
  otherwise). Albums are "Ordner" on Android.
- **Arabic** (`dir: 'rtl'`, since 17 November 2026): the layout mirrors itself
  through logical spacing (`ps-`/`pe-`/`start-`/`end-`), `rtl:rotate-180` on
  directional icons, numbers in `num` (Western digits). What follows the
  finger stays physical: the review's delete / keep buttons and stamps
  (`dir="ltr"`, `left-`/`right-`) match the swipe. Figtree has no Arabic, so
  the system's Arabic face draws it; titles drop their tracking in RTL (it
  would tear the joined letters). Trip names take the English city name and
  the Arabic comma; Android's folder wording has Arabic twins too. Native
  texts: `ar.lproj` (permission, widget), `values-ar` (launcher, widget).
  The Arabic block is its own chunk (`src/translations.ar.ts`), loaded by
  `loadLanguage('ar')` before the first render and before switching to it, so
  the main bundle stays German and English.

## Styling — "Glass" (iOS 27 look, 17 November 2026) and "Album" on Android (18 November 2026), docs/REDESIGN.md
- **Read `docs/DESIGN.md` before any UI change and keep it updated** — it is the design system; this section is its short form.
- The look of the system apps since iOS 26, as refined in iOS 27: the content
  is the page (photos edge to edge, white grouped cards on the cool grouped
  background), the controls float above it on glass. **One deep teal** for
  what you tap. Green (`keep`) is keep and the best shot, red (`neg`) is
  delete, amber (`warn`) is blurry.
- **All colours, radii, shadows, fonts and easings are tokens in
  `src/index.css`** — never a literal hex in a component. After touching any
  colour, run `npm run audit:contrast` — it must pass (it also checks the
  inks on glass and the white glyph on every hue's squircle).
- Layers: `bg-bg` the page (`#F2F2F7` / black), `bg-surface` a card / grouped
  list / sheet, `bg-surface-2` a translucent fill. A card is `rounded-md card`
  (24 px) — no border, no shadow. Corners are concentric: a photo inside a
  card takes the card's radius minus its inset.
- **Glass, drawn — no `backdrop-filter`, no `filter: blur`** (Android's
  WebView): `glass` for what floats (bar buttons, the tab bar, a secondary or
  danger button, the toast, a chip on a photo), `glass-flat` for the same
  material inside a card or sheet, `sheen` on a prominent (teal / red / green)
  fill. Where content meets a floating bar it fades into the page
  (`edge-fade-top` behind the top bar once scrolled, `dock-fade` under the
  dock and the tab bar) — never a line.
- **Type**: Figtree for everything (bundled in `src/assets/fonts/`, OFL —
  never a font from the network). Titles and headings with `title-face`;
  the big numbers with `display` (Figtree 800, tight) — sizes through
  `<BigNumber>` (number large, unit small and quiet). Fraunces is no longer
  in the app; the store-screenshot and preview-video tools still use it for
  their headlines.
- Photo cards (a category on *Aufräumen*, *An diesem Tag* on *Ordnen*, the
  word cards on *Suchen*, three or four to a row):
  the photos fill the card, the name and the figure lie white on
  `photo-shade` at its foot. Smaller tiles, four to a row (the trips and the
  AI's categories on *Ordnen*), carry the name and the count **under** the
  photo, as Photos does. A chip on a
  photo is `glass` (or `bg-veil` for small facts like a date).
- Settings-style rows lead with an `IconTile`: a white symbol on the hue's
  solid squircle (`data-hue` → `bg-hue-solid`), as in iOS Settings. Hues:
  `sky`, `sand`, `mint`, `rose`, `lilac`, `stone`, `cyan`, `pink` (`--hue-bg`,
  `--hue-ink`, `--hue-solid`); duplicates = rose, similar = lilac, similar
  videos = cyan, all photos = pink, blurry = sand, scan = mint, access = sky.
  A category's hue is also its dot and its segment in the `StorageBar`.
- What a screen does floats at the bottom in thumb reach (`<Dock>` with
  `<Screen docked>`). One prominent button; a second action goes **under**
  it as a plain text button (`variant="ghost"`), never squeezed beside it.
  The root's tabs float as a glass capsule (`<TabBar>` with `<Screen tabbed>`),
  the current tab in a lens of the same glass.
- Sheets float inset from the edges with large corners (`rounded-xl`), their
  close button `glass-flat`, their confirm button teal with `sheen`.
- Motion: short and soft; transform and opacity only; all of it collapses
  under reduced motion. The review card follows the finger and flies out.
- Home (*Aufräumen*) is a greeting, then the one next step, then what is
  marked for deletion, then the storage overview. An empty list is `<Empty>`
  (illustration, one line, the way on); a real delete asks through
  `<DeleteSheet>`; a photo looked at closely opens `<ZoomView>`.
- A screen says what it is for behind an (i) in its bar (`<Screen info>`,
  a sheet), never in a paragraph above its content; its subtitle carries the
  count and the size, its Dock button says what you get
  (*Durchgehen · 6 Dateien · 585 MB*).
- Type scale in rem (follows Dynamic Type, `dynamicType.ts`); touch targets
  44 px. No `hover:` styles.

### Android — "Album" (18 November 2026, docs/REDESIGN.md)
Android keeps the layout and swaps the material, through
`[data-platform="android"]` (set in `main.tsx`) in `src/index.css`:
- **Warm neutrals**: a paper page (`#F5F3EF` / `#12110F`), warm white cards,
  warm greys for text; the same one teal for what you tap; red only for
  deleting. `npm run audit:contrast` checks both Android themes too.
- **Flat glass**: `glass` is a solid fill with a hairline edge and a soft
  shadow, `sheen` adds nothing — no specular highlights on Android.
- **Quiet icon tiles**: `IconTile` (`.icon-tile`) is a neutral squircle with
  the ink in it; the photos carry the colour.
- Photo-led and calm: home keeps its clean-up card on top, then one next
  step (`NextStep`), categories as rows with their photos and size; a group compares in a
  large uncropped viewer. New screens follow it; never an Android-only fork
  of a component.

## Native iOS
- **UIScene lifecycle** exactly as the shopping list has it (`SceneDelegate`,
  `UIApplicationSceneManifest`, the scene hook in `AppDelegate`); `SceneDelegate`
  makes `MainViewController` (in `PhotoLibraryPlugin.swift`) the root, which
  registers our plugins. Never remove it; `scripts/release.js` refuses to ship without it.
- Keep `@capacitor/core`, `@capacitor/ios`, `@capacitor/android` and
  `@capacitor/cli` on the same version, ≥ 8.5.
- Deployment target **iOS 16**. `Info.plist`: `NSPhotoLibraryUsageDescription`
  (texts in `<lang>.lproj/InfoPlist.strings`),
  `PHPhotoLibraryPreventAutomaticLimitedAccessAlert` (the app offers its own
  "Fotos auswählen").
- A new Swift file must be added to `App.xcodeproj` (file reference, group,
  Sources) — ours are listed there; `FeatureMath.swift` is referenced from
  `ios/PhotoFeatures/`. `ios/scripts/add-ai.rb` adds `ImageEmbedder.swift`,
  the `ai-assets` folder (a bundle resource) and the ONNX Runtime package.
- **The widget** is its own target, `BildklarWidget` (WidgetKit, iOS 16+,
  `ios/App/BildklarWidget/`, bundle id `com.habboubah.bildklar.widget`), added
  by `ios/scripts/add-widget.rb` and embedded in the app. App and widget share
  the App Group `group.com.habboubah.bildklar` (both `.entitlements`): the app
  writes `widget.json` and `widget.jpg` there (`PhotoLibrary.setWidget`), the
  widget only reads them. `release.js` moves the widget's version with the app's.
- Bursts: every fetch passes `includeAllBurstAssets` (the hidden frames of a
  burst take space too).
- Never ask PhotoKit for network access (`isNetworkAccessAllowed = false`).

## Native Android
- `android/` is Capacitor's project with the shopping list's Gradle setup:
  version and version code from `package.json` (0.1.0 → 10000, plus
  `ANDROID_BUILD`), the upload key from the environment, R8 on for release.
  **minSdk 30.** Kotlin 2.2 (`kotlinVersion` in `variables.gradle`).
- Dependencies of our own: `androidx.exifinterface`, the **Play Billing
  Library** (`billingVersion`, 9.1.0 — must stay on a version Play accepts),
  **Media3 Transformer** (`media3Version`: smaller videos, on the phone),
  **ONNX Runtime** (`onnxruntimeVersion`: the on-device AI; `ai-assets/` is
  copied into `assets/ai/` at build time, the unit tests use its desktop build).
  Faces for the best shot: YuNet (`ai-assets/faces.onnx`, OpenCV Zoo, MIT) in
  the same ONNX Runtime (`FaceDetector.kt`, reference `ml/faces.py`,
  `fixtures/faces/`). No Google services, no Firebase, no ML Kit.
- The home-screen widget: `BildklarWidget.kt` (AppWidgetProvider, layout
  `widget_bildklar.xml`), fed by `PhotoLibrary.setWidget`.
- `SCHEDULE_EXACT_ALARM` (brought by `@capacitor/local-notifications`) is
  removed in the manifest: the weekly reminder may be a little late, and Play
  keeps exact alarms for clocks and calendars.
- Activity results (permissions, MediaStore's write/trash requests) use
  launchers registered in the plugin's `load()` via `bridge.registerForActivityResult`.
- `npm run test:android` runs the feature tests on the JVM (CI too).

## Accessibility
- Text 4.5:1, icons 3:1 (`npm run audit:contrast`, both themes, every hue).
  `text-fg-faint` only for placeholders and decoration.
- Every photo tile is a button or an image with a label (its date); every
  icon button has a label. The review has buttons for keep / delete beside
  the swipe, and arrow keys.
- Pinch-zoom stays enabled. Motion respects reduced motion (`MotionConfig`).

## Commands
| Task | Command |
|---|---|
| Dev server (the demo library) | `npm run dev` → http://localhost:3001 |
| Type-check / unit tests | `npm run lint` / `npm test` |
| **All the gates** (before a release, in CI) | `npm run check` |
| Privacy / performance / contrast / security / store texts alone | `npm run check:privacy` / `check:perf` / `audit:contrast` / `check:security` / `check:listing` |
| Native feature tests | `npm run test:ios` (swift test) / `npm run test:android` (gradlew) |
| The AI: iPhone embedder test (Mac) / guardrails | `npm run test:ios:ai` / `npm run check:ai` |
| The AI: model export / labels and search words / measurement / groups on a test set / demo vectors (venv: `ml/requirements.txt`) | `npm run ai:export` / `npm run ai:labels` / `npm run ai:eval` / `npm run ai:eval-groups` / `npm run ai:demo` |
| Build + open Xcode / Android Studio / a debug APK | `npm run build:ios` / `npm run build:android` / `npm run android:debug` |
| Icons and splash from `assets/icon-master.png` | `node scripts/icon-assets.mjs && npm run assets:generate` |
| The city table (GeoNames) | `npm run cities` |
| The licences list (after adding or updating a dependency) | `npm run licences` |
| The demo's real photos (keeps the manifest), then the AI's scores and the facts | `npm run demo-photos && npm run ai:demo` |
| A real test library (~560 CC0 photos and videos, dates and places) / onto the simulator / onto Android / into `npm run dev` | `npm run test-photos` / `test-photos:sim` / `test-photos:android` / `demo-library` |
| Every screen before and after a UI change (the first run and large text included) | `npm run ui-review` (→ `screenshots/review/`; `-- --only 54-first-scan --variant de-light` for one) |
| Store screenshots: raw (iPhone words / Android words) / framed | `npm run screenshots` (both; `-- --ios` / `-- --android` for one) / `npm run store-screenshots` |
| The App Store preview video | `npm run app-preview` (needs ffmpeg) |
| App Store preview video | `npm run app-preview` |
| App Review recording: rehearse / record | `npm run rehearse:app-review` / `npm run record:app-review` |
| Release to both stores (TestFlight + Play internal) | `npm run release` (preview: `npm run release:dry`) |

The screenshot and check scripts find their buttons by the app's own strings
(`scripts/lib/shots.mjs` loads `src/translations.ts`), so a renamed label
can't break them — a changed flow can: run `npm run ui-review` and
`npm run rehearse:app-review` after changing how a screen is reached.

## Releasing (only when explicitly asked)
Same pipeline as the shopping list: `scripts/release.js` ships **both stores
on one version** (`--ios` / `--android` for one). It gates on `npm run check`,
builds the web app once in `--mode native`, then Android (signed bundle →
Play's internal track) and iOS (archive → TestFlight), then commits and tags.
Credentials live in the gitignored `.env.release`. Submitting for review and
promoting to production stay manual. Checklists: `docs/APP_STORE_RELEASE.md`,
`docs/ANDROID_RELEASE.md`.

## Before calling a change done
1. `npm run check` — lint, security, tests, build, privacy, performance, contrast, store texts.
2. Native code changed → `npm run test:ios` / `npm run test:android`, and
   `npm run android:debug`; Swift changes need a build in Xcode (`npm run build:ios`).
3. `npm run dev` and exercise the change at phone width (375–430 px).
4. A screen changed → `npm run ui-review` before and after; look at day,
   night, the iPhone SE and the small Android phone.
5. The decisions' shape changed → old state files still load (`normalizeState`).
6. Keep the docs true (all in `docs/`): a feature → `docs/features.md` and the
   What's New in `store/listing.md`; a rule → this file; anything for Ahmad →
   `docs/TODO.md`; a flow of the App Review recording →
   `ios/AppReviewRecorder/scenes.json`, then `npm run rehearse:app-review`.

## Commit style
Short, imperative, feature-focused summaries, no conventional-commit prefixes.

## Committing and merging (as in the shopping list)
- **Commit without being asked**, on a branch off `main`, one commit per finished step.
- **Merge into `main` when the job is finished** (`git merge --no-ff`), once
  the checks pass; then delete the merged branch.
- **Never push** unless Ahmad asks for it.
