# On-device AI

Bildklar's AI runs only on the phone, costs nothing per use and sends
nothing anywhere. Plan and reasoning: the "Bildklar — On-device AI plan" doc
(https://claude.ai/artifact/B1RKGpqyQbc2UUFefNqP2r), tab "Implementation plan".

## What runs where

| Part | iPhone | Android |
| --- | --- | --- |
| Shared image model (labels, "Unwichtige Fotos", categories) | ONNX Runtime 1.24.2 (Swift package on the App target), CPU | ONNX Runtime 1.24.2 (`com.microsoft.onnxruntime:onnxruntime-android`), CPU |
| Aesthetics score, utility flag | Vision `VNCalculateImageAestheticsScoresRequest` (iOS 18+) | — |
| Faces, open eyes (best shot) | Vision (face capture quality, landmarks) | — (the face models of the plan come in a later step) |

Never: ML Kit, Gemini Nano, MediaPipe Tasks, LiteRT from Google Play services,
Firebase, a network call, MobileCLIP or LAION/OpenAI CLIP weights
(`npm run check:ai` fails on the libraries).

## The model

- `google/siglip2-base-patch32-256`, the image encoder only (Apache 2.0).
- `ai-assets/image.onnx` (76 MB): exported by `ml/export.py`, matrix weights
  in 4 bits (ONNX Runtime's `MatMulNBits`, blocks of 32, symmetric), the rest
  float. Input `pixels` [n, 3, 256, 256] float32, output `embedding` [n, 768],
  L2-normalised.
- Why 4-bit weight-only and not int8: dynamic int8 quantisation (weights and
  activations) bent the embeddings far off — cosine 0.56–0.88 to float32 on
  the smoke set — while the 4-bit weight-only model stays at about 0.96 and
  separates every label as well as float32 (AUC within ±0.02, table below).
  8-bit weight-only is closer still (0.9996) but 112 MB.
- `ai-assets/vectors.bin`: one float16 row of 768 per label — the mean of the
  label's prompt embeddings (`ml/labels.yaml`), L2-normalised.
  `vectors.json`: model, `aiVersion`, input size, the sigmoid's `scale`
  (111.83) and `bias` (−16.77), the labels in order.
- Pre-processing (the same in `ml/eval.py`, `ImageEmbedder.swift`,
  `ImageEmbedder.kt`): the scan's analysis image (fitted into 512 × 512),
  resized to 256 × 256 without cropping, RGB, `(x / 255 − 0.5) / 0.5`.
- What a phone stores per photo: `ai` = each label's logit
  (`scale · dot(image, label) + bias`) × 10, rounded, in label order. The
  thresholds below are in the same unit (logits, not tenths).

`AI_VERSION` (now 1) lives in `src/logic/ai.ts`, `vectors.json`,
`ImageEmbedder.swift` and `ImageEmbedder.kt`: bump all four when the model,
the labels or the pre-processing change — every photo gets its AI pass again,
the classic features (`FEATURE_VERSION`) stay.

## Labels

| Label | Kind | What |
| --- | --- | --- |
| receipt | utility | till receipts, bills |
| document | utility | letters, forms, invoices, tickets |
| whiteboard | utility | whiteboards, slides, handwritten notes |
| screen | utility | a photo of a computer or TV screen |
| chat | utility | a screenshot saved as a photo (forwarded, not flagged by the system) |
| meme | utility | memes, greeting images with text |
| code | utility | QR codes, barcodes |
| accidental | utility | pocket, floor, black and finger shots |
| kids, people, pet, food, landscape | memory | what families keep photos for |

## Thresholds (provisional)

The rule (`src/logic/ai.ts`): a photo is "unwichtig" when its best utility
label reaches **−5.0** (logit) *and* beats its best memory label by at least
**1.0**. It is never suggested when it is a favourite, a screenshot (they
have their own list), a video, kept in a review, or shows a face (iPhone).

On the smoke set this flags 0 of 600 ordinary photos and 99 of 160 drawn
utility pictures (62 %). **These thresholds come from drawn test pictures**:
they are deliberately strict and must be tuned again on real photos (below).

Smoke set (`ml/make_smoke.py`: 160 drawn utility pictures + 600 ordinary
photos from Flickr8k's test split for the evaluation only — none of them is
in the repository), desktop CPU:

| Label | Photos | 4-bit AUC | float32 AUC |
| --- | --- | --- | --- |
| receipt | 20 | 1.000 | 1.000 |
| document | 20 | 0.991 | 0.987 |
| whiteboard | 20 | 0.976 | 0.991 |
| screen | 20 | 1.000 | 1.000 |
| chat | 20 | 0.997 | 0.998 |
| meme | 20 | 0.982 | 0.979 |
| code | 20 | 1.000 | 1.000 |
| accidental | 20 | 0.989 | 0.996 |
| kids | 241 | 0.898 | 0.897 |
| pet | 137 | 0.949 | 0.947 |
| people | 154 | 0.637 | 0.627 |
| landscape | 50 | 0.773 | 0.741 |

People and landscape separate poorly here because Flickr8k's captions mix
them (most photos with a landscape also show people). Speed: about 97 ms per
photo on a 2-core desktop CPU (4-bit and float32 alike) — measure the phones.

## Test set (to do, Ahmad)

1. Put about 400 photos in `ml/testset/real/<label>/` (one folder per label
   above, plus `other` for ordinary photos): your own or licensed, 25–40 per
   label. The folder is gitignored and never leaves your Mac.
2. `python ml/eval.py --set ml/testset/real` (venv from `ml/requirements.txt`).
3. Send Claude the table: it sets the thresholds in `src/logic/ai.ts` and
   this file.

## Files

| File | What |
| --- | --- |
| `ml/labels.yaml` | labels, kinds, prompts |
| `ml/export.py` | `ai-assets/` from the Hugging Face model (`npm run ai:export`) |
| `ml/eval.py` | AUC, thresholds, speed on a labelled set (`npm run ai:eval`) |
| `ml/make_smoke.py` | the drawn smoke set |
| `ml/fixtures.py` | `fixtures/ai/`: 8 inputs of our own + the reference embeddings and logits for the native tests |
| `ml/demo_ai.py` | `src/native/demo/ai.json`: the demo photos' scores (`npm run ai:demo`) |
| `ai-assets/` | what both apps ship (Android: copied into the APK's `assets/ai/` at build time; iPhone: the folder is a resource of the App target) |

Licences of everything shipped: `ai-assets/LICENSES.md` (also in the app's
licence screen).
