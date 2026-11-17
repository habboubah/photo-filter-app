"""
Builds src/search/words.json from ml/words.yaml: the search vocabulary, each
concept's vector in the compact space (packed like the labels, see
ml/labels.py) and its words in German, English and Arabic. The app scores a
photo for a concept like for a label — scale · k · dot(vector, concept) + bias,
with the scale and bias ml/labels.py fitted — and ranks the photos by it.

  python ml/words.py

Runs after ml/labels.py (it reuses that file's scale and bias). A word added:
run this; no new scan, no new version.
"""
import json
import os

import numpy as np
import yaml

from compactlib import ROOT, load_projection, meta, pack, text_model, text_vectors

OUT = os.path.join(ROOT, 'src', 'search', 'words.json')


def parse(line):
    parts = [p.strip() for p in line.split('|')]
    if len(parts) != 4:
        raise SystemExit(f'ml/words.yaml: expected "prompt | en | de | ar": {line}')
    words = [[w.strip() for w in p.split(',') if w.strip()] for p in parts[1:]]
    return parts[0], dict(zip(('en', 'de', 'ar'), words))


def main():
    with open(os.path.join(ROOT, 'ml', 'words.yaml'), encoding='utf-8') as f:
        concepts = [parse(c) for c in yaml.safe_load(f)['concepts']]
    with open(os.path.join(ROOT, 'src', 'logic', 'aiLabels.json'), encoding='utf-8') as f:
        labels = json.load(f)
    model, processor = text_model()
    vecs = text_vectors(model, processor, [[f'a photo of {p}', p] for p, _ in concepts])
    lp = vecs @ load_projection().T
    out = {
        'aiVersion': meta()['aiVersion'],
        'scale': labels['scale'],
        'bias': labels['bias'],
        'concepts': [
            {'k': round(float(np.abs(r).max() / 127), 8), 'v': pack(r), **words}
            for (_, words), r in zip(concepts, lp)
        ],
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print(f'{len(concepts)} concepts → src/search/words.json ({os.path.getsize(OUT) / 1000:.0f} kB)')


if __name__ == '__main__':
    main()
