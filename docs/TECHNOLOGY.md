# Bildklar — technology overview

How Bildklar is built: the technology, the tools, and which AI it uses, how and
why. This page is an overview. The details live in `docs/PLAN.md` (architecture
and decisions), `docs/AI.md` (the model, thresholds and measurements) and
`docs/DEVELOPMENT.md` (layout and checks).

## The app in one paragraph

Bildklar (*Bildklar KI: Fotos aufräumen* / *Bildklar AI: Photo Cleaner*) is a
photo organizer for parents on iPhone and Android. It scans the photo library
**on the phone**, turns trips into albums (iPhone) or folders (Android), finds
duplicates, near-identical shots, blurry, too dark or too bright photos, large
videos and "unimportant" pictures (receipts, documents, screenshots of
chats …), and suggests what could go. Scanning and looking are free, and so are
the first 50 deletes. Albums and further deleting need one purchase (4,99 €,
no subscription). **No backend, no account, and no photo or fact about a photo
leaves the device.**

## Architecture at a glance

```
┌──────────── Web layer: React + TypeScript (the same code on both phones) ────────────┐
│ screens (src/components) · state (src/store.ts) · pure logic (src/logic, tested)     │
│ trips · trip names · similar/duplicate groups · best shot · blur · AI decisions      │
└──────────────▲───────────────────────────────────────────────▲───────────────────────┘
               │ facts only, 2,000 rows per call + progress     │ purchase / restore
┌──────────────┴──────────── PhotoLibrary plugin ─────────┐ ┌───┴──── Purchases plugin ───┐
│ iPhone: PhotoKit · Vision · ONNX Runtime · SQLite (Swift)│ │ iPhone: StoreKit 2          │
│ Android: MediaStore · ExifInterface · ONNX Runtime ·     │ │ Android: Play Billing 9.1.0 │
│          Media3 · SQLite (Kotlin)                        │ └─────────────────────────────┘
│ scan → cache · features · AI scores · thumbnails ·       │
│ albums / folders · trash · decisions file · widget       │
└──────────────────────────────────────────────────────────┘
```

Three ideas carry the design:

1. **One UI and one set of rules for both phones.** Screens and all decisions
   (what is a trip, which shot is best, what is "unimportant") are TypeScript
   in a web view. Both phones behave the same, and every rule has unit tests.
2. **Native code does the heavy, private work.** It reads the library, works
   out the numbers for each photo, runs the AI, writes thumbnails and makes
   every change to the library. Only *facts* (numbers, dates, ids) cross the
   bridge, never image data.
3. **Nothing happens without the user.** Every delete or move needs the user's
   tap *and* the system's own dialog. Deleted photos go to Recently Deleted /
   the Trash, never straight to permanent deletion.

## Technology stack

| Layer | Technology | Why |
|---|---|---|
| UI | **React 19**, **TypeScript** (strict), **Tailwind CSS 4**, `motion` (animations), `lucide-react` (icons) | One codebase for both phones; the same stack as Ahmad's other apps (shopping list, Spartopf) |
| Build | **Vite 6**, npm, dependencies pinned to exact versions | Fast builds; pinned versions make every build reproducible |
| Native wrapper | **Capacitor 8** (`ios/`, `android/`) | Wraps the web app into real store apps and lets us write our own native plugins |
| Native plugins | Our own `PhotoLibrary` and `Purchases`, in **Swift** (iPhone) and **Kotlin** (Android) | Anything that touches photos or money is our own code, not a third-party plugin |
| Photo access | iPhone: **PhotoKit**. Android: **MediaStore** + **ExifInterface** | The system APIs, with full and "selected photos" access |
| Scan cache | **SQLite**, one table per phone | The next scan handles only new or changed photos |
| User decisions | A **JSON file** written by the native side (`state.json`) | Not localStorage: iOS may clear it when the phone is full, exactly when people use this app |
| Image AI | **SigLIP 2** image encoder in **ONNX Runtime 1.24.2** (both phones) and **Apple Vision** (iPhone) | See *The AI* below |
| Videos | **Media3 Transformer** (Android), AVFoundation (iPhone) | Makes a smaller copy of a video on the phone |
| Purchases | **StoreKit 2** (iPhone), **Play Billing Library 9.1.0** (Android) | One one-time product on both stores, with Restore |
| Extras | Home-screen widget (WidgetKit / AppWidgetProvider), local notifications (weekly reminder), haptics, keep-awake during a scan | |
| Offline place names | **GeoNames** city table, bundled (CC BY 4.0) | Trip names like *Paris, Mai 2026* without a geocoding server |
| Fonts | **Figtree** and **Fraunces**, bundled (OFL) | No font is loaded from the network |
| Languages | German and English (`src/translations.ts`), RTL-ready for Arabic | |

**Minimums:** iOS 16, Android 11 (minSdk 30, because Android's Trash and write
requests exist from 30).

## How a scan works

1. **List.** Every photo and video in the library is compared with the SQLite
   cache. New and changed items are queued; removed ones are dropped. An
   interrupted scan simply continues where it stopped.
2. **Analyse (classic image maths).** Each queued photo is scaled to fit
   512 × 512 px and measured, newest first:
   - a 64-bit **difference hash** (dHash) to find near-identical photos and
     duplicates,
   - **sharpness** (variance of the Laplacian) for blurry photos,
   - **brightness, contrast and clipped pixels** for exposure (too dark, too
     bright).

   These numbers follow one shared spec: `src/logic/features.ts`,
   `FeatureMath.swift` and `FeatureMath.kt` must give exactly the same results
   on the same test images (`fixtures/features/`).
3. **AI pass.** The on-device model looks at each photo and stores a score per
   label (below).
4. **Decide (TypeScript).** The web layer turns the facts into trips, groups,
   lists and suggestions. 50,000 photos take about 250 ms on a desktop; the
   budget is checked by `scripts/perf-check.mjs`.

Much of the app needs **no AI at all**. Trips come from GPS and time (home =
the place with the most photo-days; a trip = more than 50 km away for at least
6 hours). Near-identical photos come from the hash, blur from sharpness. These
methods are fast, predictable and easy to test, so AI is used only where plain
maths can't tell *what* a photo shows.

## The AI

### Which AI

| Part | iPhone | Android |
|---|---|---|
| **Shared image model**: what a photo shows (receipt, document, kids, pet …) | SigLIP 2 image encoder in ONNX Runtime 1.24.2, on the CPU | the same model and runtime |
| Aesthetics score, "utility photo" flag | Apple Vision `VNCalculateImageAestheticsScoresRequest` (iOS 18+) | — |
| Faces, open eyes (for the best shot) | Apple Vision (face capture quality, face landmarks) | YuNet face detector (OpenCV Zoo, MIT, 228 kB) in the same ONNX Runtime: faces and a face quality, no eyes |

**The model:** `google/siglip2-base-patch32-256`, a vision-language model by
Google, published under the **Apache 2.0** licence. Only its **image encoder**
ships in the app, as `ai-assets/image.onnx` (76 MB).

### How it is used

SigLIP 2 was trained on pairs of images and texts. It turns a picture into a
list of 768 numbers (an *embedding*), and it turns a sentence into a list in
the same space. A picture and a sentence that match end up close together.
That allows **zero-shot classification**: the app needs no training on our own
photos, only a few written descriptions per label.

1. **Before release, on the developer's computer** (`ml/compact.py`,
   `ml/labels.py`, `ml/words.py`): a 256 × 768 projection (`ai-assets/compact.bin`)
   is fitted that keeps about 96 % of an embedding in a third of the numbers.
   Each label in `ml/labels.yaml` and each of the 247 search words in
   `ml/words.yaml` has a few text prompts ("a photo of a till receipt", …);
   the text encoder turns them into vectors in the same compact space, stored
   with the app (`src/logic/aiLabels.json`, `src/search/words.json`). The text
   encoder is never shipped, which keeps the app smaller.
2. **On the phone, for every photo:** the analysis image is resized to
   256 × 256, the image encoder produces its embedding, and the phone stores
   its **compact vector**: 256 numbers as int8 (344 characters) in the cache.
   That is all native code does.
3. **Every decision is TypeScript** (`src/logic/`), so it is tested and can
   be tuned — and new labels or search words added — without touching native
   code or analysing the photos again:
   - each label's score is one dot product with the photo's vector;
   - a photo is **"unwichtig"** (unimportant) when its best *utility* label is
     strong enough **and** clearly beats its best *memory* label; a photo of
     an ID or a bank card (*sensitive*) is never suggested;
   - otherwise its **category** is its best *memory* label;
   - two photos are alike when their vectors are (cosine): that confirms
     near-identical groups, finds edited copies, a photo's look-alikes, and
     search ranks photos by a word's vector.

**The 33 labels**

| Kind | Labels |
|---|---|
| Utility (kept to remember information, not a moment) | receipt, document, whiteboard, screen (a photo of a screen), chat, meme, code (QR / barcode), accidental (pocket, floor, finger shots), ticket, product, parking (a parking sign or level), map |
| Sensitive (needed, never suggested) | idcard, bankcard |
| Memory (what families keep photos for) | kids, baby, people, selfie, group, pet, food, birthday, playground, school, beach, snow, landscape, city, flowers, home, christmas, ramadan, sports |

**What the AI powers in the app**

- **Unwichtige Fotos** (Unimportant photos): receipts, documents, photos of
  screens, memes, codes and accidental shots, with chips per kind and the
  reason shown in the review (*KI: Kassenzettel*).
- **Auf deinen Fotos** (On your photos): browse by category: kids, people,
  pets, food, landscapes.
- **Ähnliche Videos** (Similar videos): retakes of the same scene, found by
  comparing the embeddings of the videos' poster frames.
- **Borderline exposure:** the *accidental* label lets a borderline dark or
  bright photo into the list.
- **Near-identical photos and copies:** a group needs close hashes *and*
  alike vectors; the same scene up to 30 minutes later joins when very alike;
  an edited or filtered copy is found by its vector.
- **How sure:** every suggested delete says *Sicher*, *Wahrscheinlich* or
  *Bitte prüfen* and why (an exact copy, blurrier, eyes closed …); quick
  clean deletes only the sure ones in one tap.
- **Suchen** (Search): photos by what is in them, in German, English and
  Arabic (247 concepts), and **Ähnliche Fotos** (look-alikes) of any photo.
- **Learning on the phone:** when the user keeps many of one kind of
  suggestion, the app becomes less sure of that kind; when they pick another
  best shot, it learns which signals they care about. Stored in the decisions
  file, never sent.
- **Best shot:** on the iPhone Vision's faces, open eyes and, on iOS 18+, its
  aesthetics score join sharpness and exposure; on Android YuNet's faces and
  their sharpness.

**Safety nets.** The AI only *suggests*. A photo is never suggested when it is
a favourite, kept in a review, protected by hand, part of a protected trip or
album, alike to a protected photo, a photo of an ID or a bank card, a video, a screenshot (screenshots have their own list) or, on the
iPhone, shows a face. Deleting still needs the user's tap and the system's
dialog. The thresholds are deliberately strict: on the test set they flagged
**0 of 600 ordinary photos**.

### Why this AI

| Reason | What it means |
|---|---|
| **Privacy** | The model runs on the phone. No photo, embedding or result is sent anywhere; the app works in flight mode. |
| **No running costs** | No cloud AI, so nothing is paid per photo. That makes a one-time 4,99 € price possible. |
| **One model for both phones** | The same ONNX file and the same ONNX Runtime version on iPhone and Android, so both give the same scores. Golden test files (`fixtures/ai/`) check this. |
| **Licence** | Apache 2.0 allows commercial use in a paid app. |
| **Zero-shot** | A new label is a few text prompts plus a re-export, not a training project. |
| **Size vs quality** | The weights are compressed to **4 bits** (ONNX Runtime `MatMulNBits`): 76 MB, and the labels separate as well as with the full float32 model (AUC within ±0.02). Ordinary int8 quantisation was tested and rejected because it distorted the embeddings too much (cosine 0.56–0.88 to float32, against about 0.96 for 4-bit). |
| **Apple Vision on top** | Built into iOS: free, on the device, no extra download, good at faces and aesthetics. |

**Ruled out, and why**

| Option | Why not |
|---|---|
| Google ML Kit, Gemini Nano, MediaPipe Tasks | They send usage metrics to Google |
| LiteRT through Google Play services | Depends on Google services |
| MobileCLIP / MobileCLIP 2 | Research-only licence |
| OpenAI CLIP, OpenCLIP (LAION) weights | Their terms put deployed commercial use out of scope |
| Any cloud AI | Photos would leave the phone, and every scan would cost money |

`npm run check:ai` fails the build if one of these libraries ever shows up.

### Numbers (test set, desktop CPU)

- How well each label separates (AUC, 4-bit model): receipt, screen and code
  1.000; chat 0.997; document 0.991; accidental 0.989; meme 0.982;
  whiteboard 0.976; pet 0.949; kids 0.898. People (0.637) and landscape
  (0.773) are weaker, partly because the test photos mix them.
- Speed: about 97 ms per photo on a 2-core desktop CPU. The phones work in
  batches of 16, newest photos first, and pause when the phone gets hot.
- Size: model 76 MB, plus about 26 MB of ONNX Runtime per Android phone type
  (Play delivers only the phone's own type).

**Still open:** the thresholds come from drawn test pictures and are
provisional. They will be tuned on about 400 real, labelled photos
(`ml/eval.py`), and speed and heat still have to be measured on real phones
(`docs/AI.md`, `docs/TODO.md`).

## Privacy and security, and how they are enforced

| Promise | How it is enforced |
|---|---|
| The app talks to nobody | `scripts/privacy-check.mjs` drives the built app through every flow and fails on any request to another origin. Every URL in the bundle must be on an allowlist. The Swift and Kotlin code must contain no network calls. |
| No tracking | No analytics, crash reporting, Firebase or ads, ever |
| Locked-down web view | A Content Security Policy in production builds; no `console.*` in app code |
| No surprise deletes | Every write needs a tap and the system dialog |
| Honest store texts | The Play Billing Library sends Google its own usage logs and brings the `INTERNET` permission, so the store texts never promise "no internet" |

## Tools and quality gates

| Purpose | Tool / command |
|---|---|
| All checks (before a release, in CI) | `npm run check`: type-check, security audit, unit tests (**Vitest**), build, privacy, performance, contrast, store-text lengths, AI guardrails |
| Native tests | `npm run test:ios` (Swift Package tests), `npm run test:android` (JUnit on the JVM), `npm run test:ios:ai` (the iPhone embedder against the reference outputs) |
| Accessibility | `npm run audit:contrast`: 4.5:1 for text and 3:1 for icons, in both themes |
| UI review and screenshots | **Playwright** drives the demo library: `npm run ui-review`, `npm run screenshots`, the store-screenshot studio |
| Store video and App Review | `npm run app-preview` (ffmpeg), `npm run record:app-review` (an iPhone UI test that records the screen) |
| AI pipeline | Python in `ml/`: `ai:export` (model → ONNX, 4-bit, label vectors), `ai:eval` (AUC, thresholds, speed), `ai:demo` (scores for the demo photos) |
| Release | `npm run release`: one version to TestFlight and Google Play's internal track, gated on `npm run check` |
| Browser demo | `npm run dev`: both plugins replaced by a demo library of drawn photos; it is left out of every native build |
