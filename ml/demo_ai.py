"""
The demo library's AI facts (src/native/demo/ai.json): every demo photo run
through ai-assets/image.onnx with the phone's pre-processing, so the web
demo, the screenshots and the privacy check show what a phone would.
scripts/demo-facts.mjs merges them into facts.json.

  python ml/demo_ai.py && node --experimental-strip-types scripts/demo-facts.mjs
"""
import json
import os

import numpy as np
import onnxruntime as ort

from eval import pixels

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMO = os.path.join(ROOT, 'src', 'native', 'demo')


def main():
    meta = json.load(open(os.path.join(ROOT, 'ai-assets', 'vectors.json')))
    vecs = np.fromfile(os.path.join(ROOT, 'ai-assets', 'vectors.bin'), dtype=np.float16).astype(np.float32).reshape(len(meta['labels']), meta['dim'])
    sess = ort.InferenceSession(os.path.join(ROOT, 'ai-assets', 'image.onnx'), providers=['CPUExecutionProvider'])
    manifest = json.load(open(os.path.join(DEMO, 'manifest.json')))
    out = {}
    for entry in manifest:
        if entry.get('video'):
            continue
        x = pixels(os.path.join(DEMO, 'photos', entry['id'] + '.jpg'), meta['size'])[None]
        emb = sess.run(None, {'pixels': x})[0][0]
        logits = meta['scale'] * emb @ vecs.T + meta['bias']
        out[entry['id']] = [int(round(float(v) * 10)) for v in logits]
    with open(os.path.join(DEMO, 'ai.json'), 'w', encoding='utf-8') as f:
        json.dump({'aiVersion': meta['aiVersion'], 'photos': out}, f, separators=(',', ':'))
        f.write('\n')
    print(f'{len(out)} photos → src/native/demo/ai.json')


if __name__ == '__main__':
    main()
