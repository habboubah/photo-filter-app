# Bildklar – the plan

A photo organizer for parents, for iPhone and Android: it turns a camera roll
of tens of thousands of pictures into trips (one tap makes an album), finds
near-identical and blurry photos, and suggests what could go — all on the
device. Not a "storage cleaner": the trips are the point, the clean-up comes
with them. Scanning and looking are free; making albums and deleting need one
one-time purchase.

This is the step 0 page of the build prompt (Project › `claude/build-prompt.md`),
kept true as the app grows: the architecture, the data model, the platform
mapping with the API names as checked, the design, and the decisions.

## Architecture

```
┌──────────────────────── web layer (React, the same on both phones) ───────────────────────┐
│ screens (src/components) · store (src/store.ts) · pure logic (src/logic, unit-tested)     │
│ homes · trips · trip names (GeoNames, offline) · similar groups · best shot · blur · review│
└───────────────▲────────────────────────────────────────────────▲───────────────────────────┘
                │ facts, 2,000 rows per call; progress events     │ purchase / restore
┌───────────────┴──────────── PhotoLibrary ──────────┐  ┌────────┴──── Purchases ────────┐
│ iPhone: PhotoKit + Vision + SQLite3 (Swift)         │  │ iPhone: StoreKit 2             │
│ Android: MediaStore + ExifInterface + SQLite (Kotlin)│  │ Android: Play Billing 9.1.0    │
│ access · scan → cache · features · thumbnails       │  └────────────────────────────────┘
│ albums / folders · trash · decisions file           │
└──────────────────────────────────────────────────────┘
   In a browser both plugins are the demo library (src/native/demo): drawn photos with the
   facts the scan would report. `--mode native` builds leave it out entirely.
```

- **Native side** (`ios/App/App/PhotoLibraryPlugin.swift`, `ScanStore.swift`,
  `PurchasesPlugin.swift`; `android/app/src/main/java/com/habboubah/bildklar/*.kt`):
  registered like budget-app's plugin (`MainViewController.capacitorDidLoad`,
  `MainActivity.registerPlugin`), one TypeScript interface each in `src/native/`.
  Heavy work never on the main thread: a serial scan queue/thread, a small pool
  for the analysis (3 at a time), another for thumbnails, so a running scan
  never holds the screens up.
- **The bridge** carries facts, never image data. Thumbnails are JPEG files the
  native side writes to the cache folder (capped at 200 MB, least recently
  used out first); the web view loads them through
  `Capacitor.convertFileSrc()`. Grids are virtualised (`src/ui/Photo.tsx`).
- **The logic** runs in the web layer, pure TypeScript, so both phones behave
  the same and the tests cover it. `detect` (homes, trips, groups) runs once
  per set of photos; edits re-run only the cheap part. Budget: 50,000 photos in
  under 1.5 s on a desktop (`scripts/perf-check.mjs`; measured ~250 ms).

## The scan

1. **List**: every image in the library against the cache. New or changed
   ones (iPhone: `modificationDate`; Android: `GENERATION_MODIFIED`) are stored
   with `fv = 0`; gone ones are dropped.
2. **Analyse**: rows with `fv < FEATURE_VERSION`, newest first, 48 at a time:
   the picture scaled to fit 512 px, turned grey, then the features. Android
   also reads EXIF (GPS with `ACCESS_MEDIA_LOCATION`, the time taken).
3. An interrupted scan just continues: unanalysed rows keep `fv = 0`.
   Bumping `FEATURE_VERSION` re-analyses everything.

**Features** (`src/logic/features.ts` is the spec; `FeatureMath.swift` and
`FeatureMath.kt` follow it to the bit — all three pass the same
`fixtures/features/expected.json`): a 64-bit difference hash (9 × 8 cells),
sharpness (variance of the 4-neighbour Laplacian, exact integer sums),
contrast, mean brightness, clipped pixels. Faces and open eyes (iPhone only,
Vision `VNDetectFaceCaptureQualityRequest` + `VNDetectFaceLandmarksRequest`)
are worked out on demand for a similar group and cached.

## The logic

| | Rule | Where |
|---|---|---|
| Home | The 0.25° cell with the most photo-days; home = the median of the photos in it and its neighbours. A year gets its own home only for a move (≥ 60 photo-days over ≥ 4 months), never for a holiday. | `logic/home.ts` |
| Trip | Located photos > 50 km from home over ≥ 6 h; a photo at home or a gap > 4 days ends it. Photos without a location inside the window join; screenshots never. Key = the day it began. | `logic/trips.ts` |
| Edits | Cuts (`splits`), joins (`merges`), names, hidden — applied in that order, stored by key. | `logic/trips.ts` |
| Name | "City, Month Year": the city most located photos are near (GeoNames cities ≥ 15,000 people, leaning towards bigger places), the country when none is within 60 km. German or English names. | `logic/naming.ts`, `src/data/cities.tsv` |
| Similar | Hashes ≤ 10 bits apart, taken ≤ 3 min apart, linked into groups (union–find). | `logic/similar.ts` |
| Duplicate | Hashes ≤ 2 bits apart at any time, same aspect ratio (±1 %), same light (brightness ±0.03, contrast ±8 %); hashes with < 12 or > 52 bits set (flat pictures) never link. Found through a 4 × 16-bit block index, not pair by pair. Same union–find as similar: a group with a link across more than 3 min is a duplicate group. Keep: favourite, most pixels, sharpest, oldest. | `logic/similar.ts`, `logic/best.ts` |
| Screenshots | `shot` from the scan; the clean-up card counts those older than 30 days. | `logic/screenshots.ts` |
| Quick clean | The clean-up card's photos by kind (duplicates, similar, blurry, old screenshots), each kind on or off, one system dialog. | `logic/smartClean.ts` |
| Months | Calendar months in local time, newest first; a month reviewed to its end is stored as done (`months`). "On this day": today's date in earlier years, no screenshots. | `logic/months.ts` |
| Best | 0.55 sharpness + 0.20 exposure (+ 0.15 face + 0.10 eyes on the iPhone); a favourite always wins; the user's pick wins over all. | `logic/best.ts` |
| Blurry | Sharpness < 12 high, < 30 medium, < 60 low; low contrast moves a photo down a level. First guesses — debug builds show each photo's score to tune them. | `logic/blur.ts` |
| Clean-up | Each group's extra shots (similar and duplicate apart) + high/medium blurry photos + screenshots older than 30 days, never a favourite or a photo kept in a review. | `logic/analyze.ts` |
| Review | Keep / delete per photo with undo; "Delete N photos" at the end → the system's dialog. | `logic/review.ts` |

## Data model

**Scan cache** — SQLite, one table on each phone (iPhone:
`Library/Caches/bildklar/scan.sqlite`, rebuilt if iOS clears it; Android:
`databases/bildklar-scan.db`, kept out of backups):

| Column | |
|---|---|
| `id` TEXT PK | PHAsset `localIdentifier` / `"<volume>:<_ID>"` |
| `t` | taken, ms |
| `stamp` | change marker (iPhone `modificationDate` ms, Android `GENERATION_MODIFIED`) |
| `lat`, `lon` | REAL, null without a location |
| `bytes` | Android exact (`SIZE`); iPhone estimated from the pixels (no public API) |
| `w`, `h`, `fav`, `shot` | size, favourite, screenshot |
| `fv` | feature version, 0 = to analyse |
| `hash`, `sharp`, `contrast`, `expo`, `clip` | the features |
| `faces`, `faceq`, `eyes` | iPhone only, on demand |

plus `meta(key, value)` (`lastScanAt`).

**The user's decisions** — one JSON document (`src/logic/state.ts`,
`SCHEMA_VERSION` 1, read through `normalizeState()`): trip names, cuts,
joins, hidden trips, albums made, best-shot picks, photos kept in a review, and
the purchase hint. **Not in localStorage:** iOS may clear a web view's storage
when the phone runs short of space — exactly this app's users. Not in SQLite
either: it is one small document, so the native side writes it atomically as
a file (`Application Support/bildklar/state.json`, `files/state.json`)
through `getState`/`setState`. On the web (the demo) it is localStorage.

**View preferences** stay `bildklar-*` keys in localStorage (language, theme,
the dry run): losing them costs nothing.

## Platform mapping (APIs as checked, November 2026)

| | iPhone | Android |
|---|---|---|
| Read the library | PhotoKit: `PHPhotoLibrary.requestAuthorization(for: .readWrite)`, `.authorized` / `.limited`; more photos with `presentLimitedLibraryPicker(from:completionHandler:)`; `PHPhotoLibraryPreventAutomaticLimitedAccessAlert` in Info.plist | MediaStore: `READ_MEDIA_IMAGES` (13+), `READ_MEDIA_VISUAL_USER_SELECTED` (14+, "selected photos"; asking again shows the reselection), `READ_EXTERNAL_STORAGE` (≤ 32); `ACCESS_MEDIA_LOCATION` + `MediaStore.setRequireOriginal()` for the GPS |
| List and diff | `PHAsset.fetchAssets(with: .image)`, `modificationDate` | `MediaStore.Images.Media.getContentUri(VOLUME_EXTERNAL)`, `GENERATION_MODIFIED` |
| Picture to analyse | `PHImageManager.requestImage` (synchronous on a background queue, `isNetworkAccessAllowed = false`: never an iCloud download) | `ContentResolver.loadThumbnail(uri, Size(512, 512))` |
| Blur, exposure | the shared spec on a CGContext-drawn grey image | the same spec on `Bitmap.getPixels` |
| Near-identical | the shared dHash | the shared dHash |
| Eyes open | Vision: `VNDetectFaceCaptureQualityRequest`, `VNDetectFaceLandmarksRequest` (eye height / width) | none — **no ML Kit** (its terms: it "sends metrics about the performance and utilization of the APIs" to Google). Sharpness + exposure only |
| "Album" | `PHAssetCollectionChangeRequest.creationRequestForAssetCollection(withTitle:)` + `addAssets` — a real album; also with limited access (iOS 15+) | a folder: `MediaStore.createWriteRequest` (system dialog), then `RELATIVE_PATH = Pictures/Bildklar/<trip>/` — the file is moved, never copied or changed |
| Delete | `PHAssetChangeRequest.deleteAssets` → iOS's dialog → Recently Deleted | `MediaStore.createTrashRequest(…, true)` → Android's dialog → Trash; never `createDeleteRequest`. Hence minSdk 30 |
| Changes while open | `PHPhotoLibraryChangeObserver` | `ContentObserver` on `Images.Media.EXTERNAL_CONTENT_URI` |
| Purchase | StoreKit 2: `Product.products(for:)`, `purchase(confirmIn:)` (iOS 17+) / `purchase()`, `Transaction.updates`, `Transaction.currentEntitlements`, `AppStore.sync()` for Restore | Play Billing 9.1.0: `queryProductDetailsAsync` (INAPP), `launchBillingFlow`, `acknowledgePurchase`, `queryPurchasesAsync` for Restore, `enablePendingPurchases(enableOneTimeProducts)`, `enableAutoServiceReconnection` |

## Safety rules (never broken)

- Nothing is deleted, moved or changed without the user tapping it **and**
  confirming the system's own dialog (iOS's delete alert, Android's
  write/trash request).
- Deleted photos go to Recently Deleted / the Trash only.
- **Dry run**: debug builds start with it on (Einstellungen › Nur in der
  Debug-Version › Probelauf): every write to the library is skipped and the app
  says what it would have done. Release builds never run dry.
- On Android, files are moved only after the consent dialog; their contents
  never change.

## Privacy

No backend, no accounts, no ads, no analytics or crash SDKs, no Firebase, no
ML Kit; our own code makes no network request (`npm run check:privacy` drives
the demo and greps the Swift and Kotlin for network calls). Two honest
footnotes: the **Play Billing Library** sends Google its own usage logs (API
success/failure, connection issues — its release notes, since version 6), and
it brings the `INTERNET` permission with it (docs/ANDROID_RELEASE.md). The
store texts therefore don't promise "no internet".

## Design — "Album"

The photos bring the colour, so the app stays quiet: a warm paper page
(`#F7F3EC`), white cards, slate ink, one deep teal for what you tap, green for
keep, red for delete, amber for blurry. Titles and the big numbers in
**Fraunces** (a soft serif, like the labels in a printed photo album), text in
**Figtree**; both bundled. Flat, no blur, shadows only on what floats. Dark
mode is a near-black slate with a light teal. Trips are cards with a 2 × 2
mosaic of their photos; the clean-up card leads with one big number ("76 MB").

Ahmad asked Claude on 16 November 2026 to decide most things itself, so this
direction was picked without the usual three mockups. Two others were weighed
and can still be tried: **"Kinderzimmer"** (rounded, pastel, playful — closer
to the shopping list, but it fights the photos) and **"Dunkelkammer"** (dark
by default, photo-forward like a pro tool — wrong mood for parents on the
sofa).

## Decisions (taken 16 November 2026)

| Decision | Taken | Why |
|---|---|---|
| Name | **Bildklar** — *Bildklar KI: Foto Reiniger* / *Bildklar AI: Photo Cleaner*; code name `bildklar`; bundle id `com.habboubah.bildklar` | Renamed from *Fotonest* on 16 November 2026: *Fotonest*, *FotoNest* and *PhotoNest* (incl. a "PhotoNest: AI Photo Cleaner") were already in both stores. *Bildklar* ("clear picture") was free in both stores' search (16 Nov 2026); "KI"/"AI" stands for the on-device Vision analysis of the best shot on the iPhone. **Not yet reserved in App Store Connect / Play Console** — do that first (docs/TODO.md). |
| Price | **4,99 €**, one-time, product `com.habboubah.bildklar.unlock` on both stores | An impulse price for a tool you use a few times a year; "pay once, no subscription" is the pitch. Changeable in both consoles at any time, without an app update. |
| Android albums | **Folders**, after the system's consent | The only "album" every gallery app shows. Copying would double the storage, in-app albums would be invisible elsewhere. |
| minSdk | **30** (Android 11) | Trash and write requests exist from 30: a deleted photo always lands in the Trash. |
| iOS minimum | **16** | Room for StoreKit 2 and Vision without fallbacks; covers iPhone 8 and newer. (The rescan compares modification dates, which works on any version.) |
| Decisions storage | **A native JSON file**, not localStorage, not SQLite | See *Data model*. |
| Android language | **Kotlin** (budget-app's plugin is Java) | As the build prompt asked; Capacitor 8's Gradle setup takes Kotlin 2.2 as is. |
| INTERNET permission | **Stays** | The Billing Library brings it anyway; see *Privacy*. |
| iCloud-only photos | **Not downloaded** for the analysis | A local preview is enough for thumbnails; an iCloud-only photo without one gets no features (it is still counted and joins trips). |
| Photo sizes on the iPhone | **Estimated** from the pixels | PhotoKit has no public file size; the undocumented `fileSize` key could cost a rejection. |

## Milestones

| # | | State |
|---|---|---|
| 1 | Repository from the shopping list, permission screens, scan with progress and cache | built; Android compiles and its feature tests pass; iOS written, its feature package tested (`swift test`), **not yet compiled in Xcode** |
| 2 | Trips + album / folder | built, unit-tested |
| 3 | Similar + blurry + clean-up card | built, unit-tested |
| 4 | Review + delete (dry run first) | built |
| 5 | Paywall + restore | built; needs the products in both consoles and sandbox / licence testers |
| 6 | Polish: accessibility, Larger Text, dark mode, small phones, 50,000-photo performance | dark mode, Larger Text (rem scale), virtualised grids, the perf budget done; **a real 50,000-photo library is untested** |
| 8 | Cleaner features from the competitor plan (`claude/feature-gap-plan.md` in the project): duplicates anywhere, screenshots, quick clean, storage on the device, "freed so far", month by month, on this day | built, unit-tested; `getStorage` (Swift, Kotlin) **not yet compiled** |
| 7 | Store assets + checklists + `npm run release:dry` | texts, privacy pages, recorder scenes done; real demo photos, the composed store screenshots and the preview video still to do (docs/TODO.md) |
