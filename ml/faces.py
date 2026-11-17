"""
Android's face detector (docs/AI.md, "Faces on Android"): YuNet (OpenCV Zoo,
face_detection_yunet_2023mar.onnx, MIT, 0.23 MB) in ONNX Runtime — the iPhone
uses Vision. This is the Python reference of FaceDetector.kt: the same input
(the picture fitted into 640 × 640, padded at the right and bottom, BGR
0–255, channels first), the same decoding of the three strides and the same
non-maximum suppression. Checked against OpenCV's own FaceDetectorYN.

  python ml/faces.py --fixtures      write fixtures/faces/expected.json for FaceDetectorTest.kt
  python ml/faces.py <image> ...     print the faces found

The model ships in ai-assets/ (Android copies it into the APK's assets/ai/).
"""
import argparse
import json
import math
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, 'ai-assets', 'faces.onnx')
SIZE = 640
STRIDES = (8, 16, 32)
SCORE_MIN = 0.6
NMS_IOU = 0.3
FIXTURES = os.path.join(ROOT, 'fixtures', 'faces')


def prepare(img):
    """The picture fitted into SIZE × SIZE (never enlarged), on black at the top left: [1, 3, SIZE, SIZE] BGR 0–255, and the scale."""
    img = img.convert('RGB')
    s = min(1.0, SIZE / max(img.size))
    w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
    small = img.resize((w, h), Image.BILINEAR) if s < 1 else img
    canvas = np.zeros((SIZE, SIZE, 3), dtype=np.float32)
    canvas[:h, :w] = np.asarray(small, dtype=np.float32)[:, :, ::-1]
    return canvas.transpose(2, 0, 1)[None], s


def decode(out, score_min=SCORE_MIN):
    """Faces as [x, y, w, h, score, 10 landmark numbers] in the 640 × 640 input's pixels, before suppression."""
    faces = []
    for stride in STRIDES:
        cls, obj, bbox, kps = (out[f'{k}_{stride}'][0] for k in ('cls', 'obj', 'bbox', 'kps'))
        cols = SIZE // stride
        for idx in range(cls.shape[0]):
            score = math.sqrt(min(1.0, max(0.0, float(cls[idx, 0]))) * min(1.0, max(0.0, float(obj[idx, 0]))))
            if score < score_min:
                continue
            r, c = divmod(idx, cols)
            cx = (c + bbox[idx, 0]) * stride
            cy = (r + bbox[idx, 1]) * stride
            w = math.exp(bbox[idx, 2]) * stride
            h = math.exp(bbox[idx, 3]) * stride
            pts = []
            for n in range(5):
                pts += [float((kps[idx, 2 * n] + c) * stride), float((kps[idx, 2 * n + 1] + r) * stride)]
            faces.append([float(cx - w / 2), float(cy - h / 2), float(w), float(h), score] + pts)
    return faces


def iou(a, b):
    ax2, ay2, bx2, by2 = a[0] + a[2], a[1] + a[3], b[0] + b[2], b[1] + b[3]
    iw = max(0.0, min(ax2, bx2) - max(a[0], b[0]))
    ih = max(0.0, min(ay2, by2) - max(a[1], b[1]))
    inter = iw * ih
    union = a[2] * a[3] + b[2] * b[3] - inter
    return inter / union if union > 0 else 0.0


def suppress(faces):
    kept = []
    for f in sorted(faces, key=lambda f: -f[4]):
        if all(iou(f, k) <= NMS_IOU for k in kept):
            kept.append(f)
    return kept


def detect(path, sess=None):
    import onnxruntime as ort
    sess = sess or ort.InferenceSession(MODEL, providers=['CPUExecutionProvider'])
    x, s = prepare(Image.open(path))
    names = [o.name for o in sess.get_outputs()]
    out = dict(zip(names, sess.run(names, {'input': x})))
    faces = suppress(decode(out))
    # Back to the picture's own pixels.
    return [[v / s if i != 4 else v for i, v in enumerate(f)] for f in faces], s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('images', nargs='*')
    ap.add_argument('--fixtures', action='store_true')
    args = ap.parse_args()
    if args.fixtures:
        cases = []
        for name in sorted(os.listdir(FIXTURES)):
            if not name.endswith('.png'):
                continue
            faces, _ = detect(os.path.join(FIXTURES, name))
            cases.append({'file': name, 'faces': [[round(v, 2) for v in f[:5]] for f in faces]})
        with open(os.path.join(FIXTURES, 'expected.json'), 'w', encoding='utf-8') as f:
            json.dump({'size': SIZE, 'scoreMin': SCORE_MIN, 'tolerance': {'box': 2.0, 'score': 0.02}, 'cases': cases}, f, indent=1)
            f.write('\n')
        print('\n'.join(f"{c['file']}: {len(c['faces'])} faces" for c in cases))
        return
    for path in args.images:
        faces, _ = detect(path)
        print(path, [[round(v, 1) for v in f[:5]] for f in faces])


if __name__ == '__main__':
    main()
