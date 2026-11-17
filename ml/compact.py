"""
Builds ai-assets/compact.bin: the projection that turns the model's 768-number
embedding into the 256-number compact vector the phones store for every photo
(docs/AI.md, "The compact vector").

The projection is the first 256 right-singular vectors of a set of embeddings
(an uncentred PCA): ordinary photos plus drawn receipts, documents, chats,
codes and screens, so the directions that tell those apart are kept. Stored as
float16, row-major [256, 768]. Measured 17 November 2026 on 800 COCO photos
held out of the fit: text search finds the same photos as with all 768 numbers
(R@5 0.89 vs 0.90), copies and same-shot pairs stay as far from different
photos as before, and label scores computed from the compact vector follow the
full ones (correlation 0.96-0.99).

  python ml/compact.py --images <folder> [<folder> ...]

Also keeps the embeddings in ml/build/fit-embeddings.npy for ml/labels.py.
A new projection changes every stored vector: bump AI_VERSION everywhere.
"""
import argparse
import json
import os

import numpy as np

from compactlib import ASSETS, BUILD, embed_files, image_files, meta

DIM = 256


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--images', nargs='+', required=True)
    args = ap.parse_args()
    files = image_files(args.images)
    if len(files) < DIM * 2:
        raise SystemExit(f'{len(files)} images: give at least {DIM * 2}')
    os.makedirs(BUILD, exist_ok=True)
    m = meta()
    emb = embed_files(files, m['size'])
    np.save(os.path.join(BUILD, 'fit-embeddings.npy'), emb)
    _, s, vt = np.linalg.svd(emb, full_matrices=False)
    var = (s ** 2) / (s ** 2).sum()
    vt[:DIM].astype('<f2').tofile(os.path.join(ASSETS, 'compact.bin'))
    m['vecDim'] = DIM
    with open(os.path.join(ASSETS, 'vectors.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, indent=2)
        f.write('\n')
    print(f'compact.bin: {DIM} × {m["dim"]} from {len(files)} images, {var[:DIM].sum():.3f} of the variance')


if __name__ == '__main__':
    main()
