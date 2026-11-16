"""
Measures the exported model on a labelled test set and picks each label's
threshold (docs/AI.md, "Test set" and "Thresholds").

  python ml/eval.py [--set ml/testset/smoke] [--models int8,fp32]

The test set is a folder per label (ml/labels.yaml ids, plus "other" for
ordinary photos that are none of them). Every image goes through the phone's
own pre-processing — fitted into 512 × 512 like the scan's analysis image,
then resized to 256 × 256 (no crop, bilinear) and normalised to [-1, 1] —
so the scores here are the scores on the phone.

A utility label's threshold is the lowest score at which at least 90 % of
the photos above it really are that label (a wrong "unwichtig" costs a
memory); a memory label's at 80 %. Writes ml/build/eval.json and prints the
table for docs/AI.md.
"""
import argparse
import glob
import json
import os
import time

import numpy as np
import onnxruntime as ort
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRECISION = {'utility': 0.90, 'memory': 0.80}


def fit512(img):
    w, h = img.size
    s = min(1.0, 512 / max(w, h))
    return img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.BILINEAR) if s < 1 else img


def pixels(path, size):
    img = fit512(Image.open(path).convert('RGB')).resize((size, size), Image.BILINEAR)
    x = np.asarray(img, dtype=np.float32) / 255.0
    return ((x - 0.5) / 0.5).transpose(2, 0, 1)


def scores(emb, vecs, scale, bias):
    return 1 / (1 + np.exp(-(scale * emb @ vecs.T + bias)))


def pick_threshold(s, positive, precision):
    """The lowest threshold whose precision is at least `precision` (and its recall), or None."""
    order = np.argsort(-s)
    tp = np.cumsum(positive[order])
    n = np.arange(1, len(s) + 1)
    prec = tp / n
    best = None
    for i in range(len(s)):
        if prec[i] >= precision and (i + 1 == len(s) or s[order[i]] > s[order[i + 1]]):
            best = (float(s[order[i]]), float(prec[i]), float(tp[i] / max(1, positive.sum())))
    return best


def auc(s, positive):
    """How well the score separates the label from everything else, threshold-free: 1 perfect, 0.5 chance."""
    order = np.argsort(s)
    ranks = np.empty(len(s))
    ranks[order] = np.arange(1, len(s) + 1)
    p = positive.sum()
    n = len(s) - p
    return float((ranks[positive == 1].sum() - p * (p + 1) / 2) / max(1, p * n))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', default=os.path.join(ROOT, 'ml', 'testset', 'smoke'))
    ap.add_argument('--models', default='int8,fp32')
    args = ap.parse_args()
    meta = json.load(open(os.path.join(ROOT, 'ai-assets', 'vectors.json')))
    vecs = np.fromfile(os.path.join(ROOT, 'ai-assets', 'vectors.bin'), dtype=np.float16).astype(np.float32).reshape(len(meta['labels']), meta['dim'])
    ids = [l['id'] for l in meta['labels']]
    kinds = {l['id']: l['kind'] for l in meta['labels']}
    files, truth = [], []
    for folder in sorted(glob.glob(os.path.join(args.set, '*'))):
        label = os.path.basename(folder)
        for f in sorted(glob.glob(os.path.join(folder, '*.jpg'))):
            files.append(f)
            truth.append(label)
    truth = np.array(truth)
    paths = {
        'int8': os.path.join(ROOT, 'ai-assets', 'image.onnx'),
        'fp32': os.path.join(ROOT, 'ml', 'build', 'image-fp32.onnx'),
    }
    report = {'set': os.path.relpath(args.set, ROOT), 'images': len(files), 'models': {}}
    batch = np.stack([pixels(f, meta['size']) for f in files])
    for name in args.models.split(','):
        path = paths.get(name, name)
        if not os.path.exists(path):
            continue
        name = os.path.basename(name).removesuffix('.onnx')
        sess = ort.InferenceSession(path, providers=['CPUExecutionProvider'])
        t0 = time.time()
        emb = np.concatenate([sess.run(None, {'pixels': batch[i:i + 16]})[0] for i in range(0, len(batch), 16)])
        ms = (time.time() - t0) * 1000 / len(files)
        s = scores(emb, vecs, meta['scale'], meta['bias'])
        rows = {}
        for j, label in enumerate(ids):
            positive = (truth == label).astype(np.float64)
            if positive.sum() == 0:
                continue
            got = pick_threshold(s[:, j], positive, PRECISION[kinds[label]])
            rows[label] = {
                'n': int(positive.sum()),
                'auc': round(auc(s[:, j], positive), 3),
                'threshold': round(got[0], 4) if got else None,
                'precision': round(got[1], 3) if got else None,
                'recall': round(got[2], 3) if got else 0.0,
            }
        report['models'][name] = {'msPerImage': round(ms, 1), 'labels': rows, 'embedding': emb.tolist() if name == 'int8' and len(files) <= 16 else None}
    json.dump(report, open(os.path.join(ROOT, 'ml', 'build', 'eval.json'), 'w'), indent=1)
    names = list(report['models'])
    print(f"{report['images']} images · ms per image (desktop CPU): " + ', '.join(f"{n} {report['models'][n]['msPerImage']}" for n in names))
    print('| Label | Kind | Photos | ' + ' | '.join(f'{n} AUC · threshold · precision · recall' for n in names) + ' |')
    print('| --- | --- | --- | ' + ' | '.join('---' for _ in names) + ' |')
    for label in ids:
        cells = []
        for n in names:
            r = report['models'][n]['labels'].get(label)
            if not r:
                cells.append('—')
            elif r['threshold'] is None:
                cells.append(f"{r['auc']:.3f} · none reaches the precision")
            else:
                cells.append(f"{r['auc']:.3f} · {r['threshold']:.3f} · {r['precision']:.2f} · {r['recall']:.2f}")
        n_img = report['models'][names[0]]['labels'].get(label, {}).get('n', 0)
        print(f'| {label} | {kinds[label]} | {n_img} | ' + ' | '.join(cells) + ' |')


if __name__ == '__main__':
    main()
