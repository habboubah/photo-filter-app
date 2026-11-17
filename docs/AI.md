# On-device AI

Bildklar's AI runs only on the phone, costs nothing per use and sends
nothing anywhere. Plan and reasoning: the "Bildklar — On-device AI plan" doc
(https://claude.ai/artifact/B1RKGpqyQbc2UUFefNqP2r), tab "Implementation plan".

## What runs where

| Part | iPhone | Android |
| --- | --- | --- |
| Shared image model → each photo's compact vector | ONNX Runtime 1.24.2 (Swift package on the App target), CPU | ONNX Runtime 1.24.2 (`com.microsoft.onnxruntime:onnxruntime-android`), CPU |
| Labels, search, look-alikes, similar groups, confidence, what the phone learns | TypeScript, from the vectors (`src/logic/`) | the same |
| Aesthetics score, utility flag | Vision `VNCalculateImageAestheticsScoresRequest` (iOS 18+) | — |
| Faces, open eyes (best shot) | Vision (face capture quality, landmarks) | YuNet face detector in ONNX Runtime (`ai-assets/faces.onnx`, MIT): faces and a face quality, no eyes |
| Best shot | sharpness, exposure, faces, eyes, aesthetics (iOS 18+), learnt weights | sharpness, exposure, faces, learnt weights |

Never: ML Kit, Gemini Nano, MediaPipe Tasks, LiteRT from Google Play services,
Firebase, a network call, MobileCLIP or LAION/OpenAI CLIP weights
(`npm run check:ai` fails on the libraries).

**The rule since AI version 2: native code turns a photo into numbers, every
decision is TypeScript.** The phones store one compact vector per photo; the
app scores the labels, searches and compares photos from it. A new label, a
new search word or a new threshold is an app update, not a new AI pass.

## The model

- `google/siglip2-base-patch32-256`, the image encoder only (Apache 2.0).
- `ai-assets/image.onnx` (76 MB): exported by `ml/export.py`, matrix weights
  in 4 bits (ONNX Runtime's `MatMulNBits`, blocks of 32, symmetric), the rest
  float. Input `pixels` [n, 3, 256, 256] float32, output `embedding` [n, 768],
  L2-normalised.
- Why 4-bit weight-only and not int8: dynamic int8 quantisation (weights and
  activations) bent the embeddings far off — cosine 0.56–0.88 to float32 on
  the smoke set — while the 4-bit weight-only model stays at about 0.96 and
  separates every label as well as float32 (AUC within ±0.02).
  8-bit weight-only is closer still (0.9996) but 112 MB.
- Pre-processing (the same in `ml/compactlib.py`, `ImageEmbedder.swift`,
  `ImageEmbedder.kt`): the scan's analysis image (fitted into 512 × 512),
  resized to 256 × 256 without cropping, RGB, `(x / 255 − 0.5) / 0.5`.

## The compact vector

- `ai-assets/compact.bin`: a 256 × 768 float16 matrix, an uncentred PCA of
  the embeddings (`ml/compact.py`, fitted on the smoke set: 1,600 COCO photos
  and 320 drawn utility pictures). A phone multiplies the embedding by it,
  L2-normalises the 256 numbers and stores them as int8 (each divided by the
  largest, × 127), base64 — 344 characters per photo, column `vec` in the
  scan database (schema 5; 3 and 4 migrate). Videos keep their full
  embedding too (`emb`, for look-alike videos).
- On the set it was fitted on, the 256 numbers keep 96 % of an embedding
  (median; at least 88 %); two photos' cosine changes by 0.02 on average
  (correlation 0.997); int8 costs nothing measurable (cosine ≥ 0.9995 to the
  float vector). Measure again on a real library (below).
- `ai-assets/vectors.json`: model, `aiVersion`, input size, `dim` (768),
  `vecDim` (256). No label data any more.
- The facts carry `vv` (the vector's AI version) only; the app fetches the
  vectors themselves apart, `PhotoLibrary.getVectors({ ids })`, in pages of
  2,000 (`src/store.ts`), and keeps them in one `Float32Array`
  (`src/logic/vectors.ts`, `Vectors`).

`AI_VERSION` (now 2) lives in `src/logic/ai.ts`, `vectors.json`,
`ImageEmbedder.swift` and `ImageEmbedder.kt`: bump all four when the model,
`compact.bin` or the pre-processing change — every photo gets its AI pass
again, the classic features (`FEATURE_VERSION`) stay. `LABELS_VERSION` (now 2,
`src/logic/ai.ts` and `src/logic/aiLabels.json`) moves with the labels only:
no new pass, the app scores again.

## Size

The model is 76 MB, `compact.bin` 384 kB, `faces.onnx` 228 kB (Android only).
ONNX Runtime adds about 26 MB per Android phone type (arm64; Play delivers
only the phone's own type from the bundle — the universal debug APK carries
all four) and a static library on the iPhone. Measure the store download
sizes before release.

## Labels

33 labels in `ml/labels.yaml` → `ml/labels.py` → `src/logic/aiLabels.json`
(each label's text vector, projected through `compact.bin`, int8). The app
scores a photo as `scale · k · dot(vector, label) + bias` with the sigmoid's
`scale` 109.58 and `bias` −16.77 (fitted so the projected scores match the
full model's), in slices of 2,000 photos (`scoreLabels`, about 650 ms for
50,000 photos in the perf check).

| Kind | Labels | What happens |
| --- | --- | --- |
| utility | receipt, document, whiteboard, screen, chat, meme, code, accidental, ticket, product, parking, map | may be suggested as *Unwichtige Fotos* |
| sensitive | idcard, bankcard | **never suggested, protected** (a photo of an ID or a bank card is something people need) |
| memory | kids, baby, people, selfie, group, pet, food, birthday, playground, school, beach, snow, landscape, city, flowers, home, christmas, ramadan, sports | keep a photo out of *Unwichtig*; categories and search |

## Thresholds (provisional)

All in `src/logic/` (logits, not tenths). They come from COCO photos and
drawn pictures and must be tuned on real photos (*Test set*, below).

| What | Where | Value |
| --- | --- | --- |
| "Unwichtig" | `ai.ts` `UTILITY_MIN`, `UTILITY_MARGIN`, `MEMORY_MIN` | best utility label ≥ −5.0 and ≥ 1.0 over the best memory label; never with a memory label above −12 by more |
| …with Vision's utility flag (iPhone) | `UTIL_FLAG_BONUS` | +1.0 |
| …"likely" instead of "check" | `UTILITY_SURE_MARGIN` | 2.0 over the bar |
| ID / bank card (protected) | `SENSITIVE_MIN` | ≥ −7.0 |
| Similar link | `similar.ts` `MAX_DISTANCE`, `WINDOW_MS`, `SIM_COS` | hash ≤ 10 within 3 min **and** cosine ≥ 0.87 |
| Same scene later | `SCENE_DISTANCE`, `SCENE_WINDOW_MS`, `SCENE_COS` | hash ≤ 16 within 30 min and cosine ≥ 0.95 |
| Groups of three or more | `MEDOID_COS` | every photo ≥ 0.84 to the group's medoid, else it leaves |
| Copy (strong) | `DUP_DISTANCE`, `DUP_ASPECT`, `DUP_EXPO`, `DUP_CONTRAST` | hash ≤ 2, same shape and light |
| Copy (weak: edited, filtered) | `DUP_EMB_DISTANCE`, `DUP_COS` | hash ≤ 4, same shape, cosine ≥ 0.95 |
| Search | `search.ts` `SEARCH_MIN`, `SEARCH_LIMIT` | logit ≥ −10, at most 500 |
| Look-alikes of a photo | `LIKE_COS` | cosine ≥ 0.8 |
| Protect look-alikes | `protect.ts` `PROTECT_COS`, `PROTECT_APART_MS` | cosine ≥ 0.92, at least 1 h apart (on unless switched off) |

The app's own scoring (compact int8 vector × `aiLabels.json`) on the smoke
set, `python ml/eval.py --models int8` (17 November 2026; 1,600 COCO photos as
"other"; the threshold is where 90 % of the photos above it are that label):

| Label | Pictures | AUC | Threshold at 90 % | Recall there |
| --- | --- | --- | --- | --- |
| receipt | 40 | 1.000 | −5.3 | 1.00 |
| document | 40 | 0.997 | −4.5 | 0.55 |
| whiteboard | 40 | 0.987 | −3.4 | 0.17 |
| screen | 40 | 0.999 | −4.9 | 0.85 |
| chat | 40 | 0.998 | −3.2 | 0.53 |
| meme | 40 | 0.975 | −4.8 | 0.23 |
| code | 40 | 1.000 | −7.1 | 1.00 |
| accidental | 40 | 0.982 | −5.6 | 0.17 |

The separation (AUC) survives the compact vector; the drawn pictures make the
recall at a fixed bar a poor guide, so `UTILITY_MIN` stays −5 until the real
set says otherwise. ticket, product, parking, map, idcard, bankcard and the
memory labels have no pictures in the smoke set yet.

Without vectors (an old scan, the AI pass not done yet) similar groups fall
back to the hashes alone, as before version 2.

## How sure (confidence)

`src/logic/confidence.ts` gives every suggested delete a level and one reason
(docs/features.md, *Sicher, wahrscheinlich, prüfen*):

| Level | When | Reason shown |
| --- | --- | --- |
| sure | an exact copy (hash ≤ 1, same size); a smaller copy; a burst frame nobody picked | `exactCopy`, `smallerCopy`, `burstExtra` |
| likely | similar to the best shot with cosine ≥ 0.95 (`LIKELY_COS`), or ≥ 0.90 and blurrier (< 50 % of its sharpness) or eyes closed; a clearly blurry photo; an old screenshot; a utility photo well over the bar | `blurrier`, `eyesClosed`, `worseLight`, `nearlySame` (≥ 0.97) |
| check | anything less sure: look-alike videos, a copy only the vectors found, a photo just over a bar | `alteredCopy` … |

Quick clean deletes sure and likely photos in one go and offers the rest as a
review (`oneTap`). The decision still goes through the system's dialog.

## What the phone learns

Both live in the decisions file (`src/logic/state.ts`) and never leave it.

- **The ledger** (`src/logic/ledger.ts`): per kind of suggestion (similar,
  blurry, a utility label …) how many the user deleted and kept in reviews.
  After 10 (`MIN_SEEN`): kept ≥ 30 % → one level less sure; ≥ 50 % → two;
  for utility labels the bar rises by 1 logit per step. Testers see the table
  in *Einstellungen*.
- **Best shot** (`src/logic/best.ts`): when the user picks another photo of a
  group as the one to keep, the signals it was better on (sharpness, light,
  faces, eyes, aesthetics) gain weight. After 10 picks (`MIN_PICKS`) the
  weights move between 0.6 and 1.4.

## Faces on Android

`FaceDetector.kt`: YuNet (OpenCV Zoo, MIT, `ai-assets/faces.onnx`), input
640 × 640, strides 8/16/32, score ≥ 0.6, NMS 0.3, faces smaller than 4 % of
the picture ignored. `faceQ` = detection score × the face crop's sharpness
(log scale, `SHARP_FACE` 300). Run only for photos in similar groups
(`scoreFaces`). Reference: `ml/faces.py`; the unit test checks
`fixtures/faces/` (3 COCO photos, CC BY 2.0) against it.

## Test set (to do, Ahmad)

Two sets, both gitignored in `ml/testset/`, never leaving the Mac:

1. **Labels**: about 400 photos in `ml/testset/real/<label>/` (one folder per
   label, plus `other`), 25–40 per label. `python ml/eval.py --set
   ml/testset/real`.
2. **Groups and copies**: `ml/testset/pairs/{same,copy,different}/<name>/`
   (two photos each: two shots of one moment; a photo and its copy — edited,
   cropped, sent through WhatsApp; two different photos) and
   `ml/testset/groups/<name>/` (a series, with `best.txt` naming the one you
   would keep). `npm run ai:eval-groups` — it embeds them (`ml/eval_groups.py`)
   and runs the app's own code (`scripts/eval-groups.mjs`): how many same
   pairs link, different pairs stay apart, copies are found, the best shot
   is yours.

Send Claude both tables: it sets the thresholds here and in `src/logic/`.

On a small synthetic set (17 November 2026: COCO photos shifted, cropped,
recompressed) the groups gave: different pairs linked 0 %, same pairs 30 %
(the hash limit stops most — shifted frames often exceed hash 10), copies
found 60 % (cropped copies are missed: the hash index needs the same frame),
best shot 5 of 5. **Known limits**: a cropped copy isn't found; a series
with the camera moving can split. Both are tuning targets on the real set.

## Thresholds of the 2.1.0 features (provisional, 17 November 2026)

| What | Where | Value | Tune on |
| --- | --- | --- | --- |
| Too dark | `src/logic/exposure.ts` `DARK_EXPO`, `DARK_CONTRAST` | expo < 0.06 and contrast < 12 | the demo set + Ahmad's test photos (night photos must stay out) |
| Too bright | `BRIGHT_EXPO`, `BRIGHT_CLIP` | expo > 0.94, or clip > 0.6 on a light picture | the same |
| Borderline, with the AI's `accidental` | `BORDER_*` | expo < 0.10 / contrast < 18; expo > 0.90 / clip > 0.45 | the same |
| Lookalike videos | `src/logic/lookalike.ts` `LOOKALIKE_COSINE` | cosine ≥ 0.92 within 2 hours | the demo videos + 50 real video pairs: AUC and precision ≥ 95 % before it ships |
| Smaller photos | `src/logic/compress.ts` `KEEP_MIN_SAVING` (and the native copies) | a copy is kept when ≥ 30 % smaller | 100 real photos per phone |

Write the values chosen and the numbers they rest on here.

## iPhone: which app saved a photo? (test pending)

Apple Photos doesn't record the app that saved a photo. Since 17 November
2026 *Chats & soziale Medien* uses the albums the apps make themselves
(WhatsApp, Telegram, Instagram, Snapchat …; `sourceOfAlbum`). For photos
saved without such an album, a one-day test could add more signals. On 200
of Ahmad's photos whose origin he knows, three signals:

- the original file name (`PHAssetResource.originalFilename`), e.g.
  Telegram's `telegram-cloud-photo-…`;
- no camera make and model in the metadata (read once, in the analyse pass,
  only for photos without a location);
- typical messenger sizes (long side 1600 or 2560 px).

If together they reach **90 % precision**, the iPhone gets the same screen
with one section, *Gespeichert aus Apps* [Saved from apps]. Otherwise it stays
Android-only and docs/features.md says so. **Result:** not run yet.

## Files

| File | What |
| --- | --- |
| `ml/labels.yaml` | labels, kinds, prompts |
| `ml/export.py` | `image.onnx` from the Hugging Face model (`npm run ai:export`) |
| `ml/compactlib.py` | shared: embedding, projection, packing, text vectors |
| `ml/compact.py` | `ai-assets/compact.bin` |
| `ml/labels.py` | `src/logic/aiLabels.json` (`npm run ai:labels`) |
| `ml/words.yaml`, `ml/words.py` | the search vocabulary (DE/EN/AR) → `src/search/words.json` |
| `ml/faces.py` | YuNet reference, `fixtures/faces/expected.json` |
| `ml/eval_groups.py`, `scripts/eval-groups.mjs` | groups, copies, best shot on a labelled set (`npm run ai:eval-groups`) |
| `ml/eval.py` | AUC, thresholds, speed on a labelled set (`npm run ai:eval`) |
| `ml/make_smoke.py` | the drawn smoke set |
| `ml/fixtures.py` | `fixtures/ai/`: 8 inputs of our own + the reference embeddings and compact vectors for the native tests |
| `ml/demo_ai.py` | `src/native/demo/ai.json`: the demo photos' vectors (`npm run ai:demo`) |
| `ai-assets/` | what both apps ship (Android: copied into the APK's `assets/ai/` at build time; iPhone: the folder is a resource of the App target) |

Licences of everything shipped: `ai-assets/LICENSES.md` (also in the app's
licence screen).
