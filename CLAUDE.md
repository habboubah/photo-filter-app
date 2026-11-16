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
| `docs/PLAN.md` | The concept: architecture, data model, platform mapping, design, the decisions and why |
| `docs/DEVELOPMENT.md` | The project layout, the single checks, the native tests, the demo library, the city table, icons |
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
blurry photos and suggests what could go. Free to scan and look; albums and
deleting need one one-time purchase (`com.habboubah.bildklar.unlock`, 4,99 €).
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

## Architecture rules
- **No router.** `App.tsx` holds one state per pushed screen. The `pushed`
  array (deepest first) is the nav's single source of truth (back button,
  scroll reset, slide direction) and must match the render order in `content()`.
- **No global store library.** All state lives in `useAppStore()` in
  `src/store.ts`. Immutable updates only.
- **Screens** are `src/components/XxxView.tsx`, bottom sheets `XxxSheet.tsx`.
  Named exports, props typed above.
- **Shared primitives** in `src/ui/` (`Screen`, `Group`, `Row`, `MenuRow`,
  `IconTile`, `Next`, `Away`, `Dock`, `Empty`, `Sheet`, `Confirm`, `Button`,
  `IconButton`, `Field`, `Toast`, `Progress`, `SwitchRow`, `Segmented`,
  `Badge`, `Thumb`, `PhotoGrid`, `Mosaic`, `haptics`). Compose them.
- **Platform**: `src/platform.ts` (`isNative`, `isAndroid`, `isIos`). Never
  sniff the user agent for behaviour.
- **Pure logic** goes in `src/logic/` (one module per concern, tested next to
  it: `*.test.ts`). Components never compute trips, groups or sizes themselves.
- **The bridge carries facts, never image data.** Facts come in pages of
  `PAGE` (2,000) rows; progress comes as `scanProgress` events. Thumbnails are
  files the native side writes; `<img>` loads them via `fileUrl()` (`Capacitor.convertFileSrc`).
- **Grids are virtualised** (`PhotoGrid`). Never render a list of every photo.
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
- **The demo library** (`src/native/demo/`) is the plugins in a browser. It
  must never reach a native build: native builds use `vite build --mode native`
  (`__DEMO__` false); `scripts/perf-check.mjs` fails if a demo photo is in that bundle.
- Web loaders for `registerPlugin` are memoised (`demo ??= …`): Capacitor runs
  an async loader once per racing call, which split listeners across instances.

## Safety rules (never break these)
- Never delete, move or change a photo automatically. Every write needs the
  user's tap **and** the system's own dialog.
- Deleted photos go to Recently Deleted (iPhone) / the Trash (Android) only —
  `deleteAssets` / `createTrashRequest`, never `createDeleteRequest`, never
  `MANAGE_MEDIA`.
- **Dry run**: every native write takes `dryRun`. Debug builds start with it
  on (`store.ts`: `debug && dryRunPref !== false`); release builds never run dry.
- On Android, files are moved (RELATIVE_PATH) only after `createWriteRequest`'s
  dialog, and their contents never change. Nothing is copied.
- A favourite (system Photos / Gallery) is never suggested for deleting, and a
  photo the user kept in a review is never suggested again.

## i18n
- `src/translations.ts`: one flat object per language (`de`, `en`). Default
  `de`; first run follows the device language. Every key in every block, with
  the same `{placeholders}` (`translations.test.ts` checks).
- Counts go through `plural(t, 'photos', n)` (`_one` / `_other` keys) and sizes
  through `bytes(t, n)` — never hand-built.
- **Android's wording**: a string that names the iPhone, Apple Photos, an
  album or "Zuletzt gelöscht" gets a twin in `androidStrings` (a test fails
  otherwise). Albums are "Ordner" on Android.
- Keep the shopping list's RTL rules so Arabic can come without layout work:
  logical spacing (`ps-`/`pe-`/`start-`/`end-`), `rtl:rotate-180` on
  directional icons, numbers in `num`.

## Styling — "Album" (Bildklar's own look, 16 November 2026)
- The photos bring the colour; the app stays quiet: warm paper page, white
  cards, slate ink, **one deep teal** for what you tap. Green (`keep`) is keep
  and the best shot, red (`neg`) is delete, amber (`warn`) is blurry.
- **All colours, radii, shadows, fonts and easings are tokens in
  `src/index.css`** — never a literal hex in a component. After touching any
  colour, run `npm run audit:contrast` — it must pass.
- Layers: `bg-bg` the page, `bg-surface` a card / sheet / bar button,
  `bg-surface-2` a fill. A card is `rounded-md card` — no border, no shadow.
  Only what floats casts a shadow (`shadow-e2`, `shadow-e3`). **No
  `backdrop-filter`, no `filter: blur`** (Android's WebView).
- **Type**: Fraunces (`display`) for titles, the trip names and the big
  numbers; Figtree for everything else. Both bundled in `src/assets/fonts/`
  (OFL) — never load a font from the network.
- Photos: `photo` utility (soft 8 px corners, the fill while loading). Text
  on a photo sits on `bg-veil`.
- Tiles take a hue with `data-hue` (`sky`, `sand`, `mint`, `rose`, `lilac`,
  `stone`) and paint with `bg-hue-bg` / `text-hue-ink`: similar = lilac,
  blurry = sand, scan = mint, access = sky.
- What a screen does floats at the bottom in thumb reach (`<Dock>` with
  `<Screen docked>`): *Album erstellen*, *Durchgehen*, *Die anderen löschen*.
- Motion: short and soft; transform and opacity only; all of it collapses
  under reduced motion. The review card follows the finger and flies out.
- Type scale in rem (follows Dynamic Type, `dynamicType.ts`); touch targets
  44 px. No `hover:` styles.

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
  Sources) — the four of ours are listed there; `FeatureMath.swift` is
  referenced from `ios/PhotoFeatures/`.
- Never ask PhotoKit for network access (`isNetworkAccessAllowed = false`).

## Native Android
- `android/` is Capacitor's project with the shopping list's Gradle setup:
  version and version code from `package.json` (0.1.0 → 10000, plus
  `ANDROID_BUILD`), the upload key from the environment, R8 on for release.
  **minSdk 30.** Kotlin 2.2 (`kotlinVersion` in `variables.gradle`).
- Dependencies of our own: `androidx.exifinterface`, the **Play Billing
  Library** (`billingVersion`, 9.1.0 — must stay on a version Play accepts).
  No Google services, no Firebase, no ML Kit.
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
| Build + open Xcode / Android Studio / a debug APK | `npm run build:ios` / `npm run build:android` / `npm run android:debug` |
| Icons and splash from `assets/icon.svg` | `node scripts/icon-assets.mjs && npm run assets:generate` |
| The city table (GeoNames) | `npm run cities` |
| The demo photos and their facts | `npm run demo-photos` |
| Every screen before and after a UI change | `npm run ui-review` (→ `screenshots/review/`) |
| Store screenshots: raw (iPhone words / Android words) / framed | `npm run screenshots` (`-- --android`) / `npm run store-screenshots` |
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
