"""
The demo library's AI facts (src/native/demo/ai.json): every demo photo (and
each video's poster frame) run through ai-assets/image.onnx with the phone's
pre-processing and turned into the compact vector a phone would store
(ai-assets/compact.bin, docs/AI.md) — so the web demo, the screenshots and the
privacy check show the labels, groups and search results a phone would.
scripts/demo-facts.mjs merges them into facts.json.

  python ml/demo_ai.py && node --experimental-strip-types scripts/demo-facts.mjs
"""
import json
import os

from compactlib import compact, embed_files, load_projection, meta, pack

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEMO = os.path.join(ROOT, 'src', 'native', 'demo')


def main():
    m = meta()
    manifest = json.load(open(os.path.join(DEMO, 'manifest.json')))
    entries = [e for e in manifest if not e.get('rec') and os.path.exists(os.path.join(DEMO, 'photos', e['id'] + '.jpg'))]
    emb = embed_files([os.path.join(DEMO, 'photos', e['id'] + '.jpg') for e in entries], m['size'])
    vecs = compact(emb, load_projection())
    out = {e['id']: pack(v) for e, v in zip(entries, vecs)}
    with open(os.path.join(DEMO, 'ai.json'), 'w', encoding='utf-8') as f:
        json.dump({'aiVersion': m['aiVersion'], 'photos': out}, f, separators=(',', ':'))
        f.write('\n')
    print(f'{len(out)} photos → src/native/demo/ai.json')


if __name__ == '__main__':
    main()
