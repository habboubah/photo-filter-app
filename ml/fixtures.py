"""
The golden fixtures for the native AI tests (fixtures/ai/): a few pictures
of our own (drawn demo photos and drawn utility pictures from
ml/make_smoke.py), each already turned into the model's 256 × 256 input,
with the embedding and the compact vector (ai-assets/compact.bin, docs/AI.md)
this Python reference computes. ImageEmbedderTests (iOS) and
ImageEmbedderTest (Android) run the same pictures through the app's own code
and must land within the tolerances in expected.json — so both phones store
the vectors the app's labels, groups and search were tuned on.

  python ml/fixtures.py      (after ml/export.py and ml/compact.py)

The pictures already in fixtures/ai/ are kept (they are the inputs); only a
missing one is made again from ml/make_smoke.py's set or the demo photos.
"""
import json
import os

import numpy as np
import onnxruntime as ort
from PIL import Image

from eval import fit512
from compactlib import compact, load_projection

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'fixtures', 'ai')
SMOKE = os.path.join(ROOT, 'ml', 'testset', 'smoke')
DEMO = os.path.join(ROOT, 'src', 'native', 'demo', 'photos')
PICTURES = [
    (os.path.join(SMOKE, 'receipt', 'receipt-00.jpg'), 'receipt'),
    (os.path.join(SMOKE, 'chat', 'chat-00.jpg'), 'chat'),
    (os.path.join(SMOKE, 'code', 'code-00.jpg'), 'code'),
    (os.path.join(SMOKE, 'document', 'document-01.jpg'), 'document'),
    (os.path.join(SMOKE, 'whiteboard', 'whiteboard-01.jpg'), 'whiteboard'),
    (os.path.join(DEMO, 'p001.jpg'), 'demo'),
    (os.path.join(DEMO, 'p040.jpg'), 'demo'),
    (os.path.join(DEMO, 'p085.jpg'), 'demo'),
]


def main():
    meta = json.load(open(os.path.join(ROOT, 'ai-assets', 'vectors.json')))
    size = meta['size']
    proj = load_projection()
    sess = ort.InferenceSession(os.path.join(ROOT, 'ai-assets', 'image.onnx'), providers=['CPUExecutionProvider'])
    os.makedirs(OUT, exist_ok=True)
    cases = []
    for i, (path, kind) in enumerate(PICTURES):
        name = f'{i:02d}-{kind}.png'
        if os.path.exists(os.path.join(OUT, name)):
            img = Image.open(os.path.join(OUT, name)).convert('RGB')
        else:
            img = fit512(Image.open(path).convert('RGB')).resize((size, size), Image.BILINEAR)
            img.save(os.path.join(OUT, name))
        x = ((np.asarray(img, dtype=np.float32) / 255.0 - 0.5) / 0.5).transpose(2, 0, 1)[None]
        emb = sess.run(None, {'pixels': x})[0][0]
        vec = compact(emb, proj)
        cases.append({
            'file': name,
            'embedding': [round(float(v), 5) for v in emb],
            'vector': [round(float(v), 5) for v in vec],
        })
    out = {
        'aiVersion': meta['aiVersion'],
        'tolerance': {'cosine': 0.995, 'vectorCosine': 0.995},
        'cases': cases,
    }
    with open(os.path.join(OUT, 'expected.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1)
        f.write('\n')
    print(f'{len(cases)} cases → fixtures/ai/expected.json')


if __name__ == '__main__':
    main()
