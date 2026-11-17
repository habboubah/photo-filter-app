"""
Builds src/logic/aiLabels.json: the labels of ml/labels.yaml as the app scores
them on the phone, from each photo's compact vector (docs/AI.md).

For each label: the mean of its prompts' text embeddings (SigLIP 2's text
tower, 768 numbers), projected with ai-assets/compact.bin into the compact
space (not normalised again) and packed as int8 with its scale `k`. A photo's
logit for the label is

    scale · k · dot(vector / |vector|, label_int8) + bias

where `scale` and `bias` are fitted here so these logits match the model's own
(logit_scale · dot(embedding, text) + logit_bias, computed with all 768
numbers) on the embeddings ml/compact.py kept: the thresholds in
src/logic/ai.ts are in the model's logit units.

  python ml/labels.py

A label added, removed or reworded: run this, bump LABELS_VERSION in
src/logic/ai.ts and add the label's name in every language. No new scan.
"""
import json
import os

import numpy as np
import yaml

from compactlib import MODEL, ROOT, compact, fit_embeddings, load_projection, meta, pack, text_model, text_vectors

OUT = os.path.join(ROOT, 'src', 'logic', 'aiLabels.json')
# Bump with src/logic/ai.ts LABELS_VERSION.
LABELS_VERSION = 2


def main():
    with open(os.path.join(ROOT, 'ml', 'labels.yaml'), encoding='utf-8') as f:
        labels = yaml.safe_load(f)['labels']
    model, processor = text_model()
    vecs = text_vectors(model, processor, [l['prompts'] for l in labels])
    proj = load_projection()
    emb = fit_embeddings()
    s0 = float(model.logit_scale.exp().item())
    b0 = float(model.logit_bias.item())
    full = s0 * emb @ vecs.T + b0
    lp = vecs @ proj.T                      # labels in the compact space, not normalised
    q = np.stack([np.round(r * 127 / np.abs(r).max()) * (np.abs(r).max() / 127) for r in lp])   # as the app reads them
    c = compact(emb, proj)
    cq = np.stack([np.round(r * 127 / np.abs(r).max()) for r in c])
    cq /= np.linalg.norm(cq, axis=1, keepdims=True)
    d = cq @ q.T
    a = np.vstack([d.ravel(), np.ones(d.size)]).T
    (scale, bias), *_ = np.linalg.lstsq(a, full.ravel(), rcond=None)
    pred = scale * d + bias
    rmse = float(np.sqrt(((pred - full) ** 2).mean()))
    corr = [float(np.corrcoef(full[:, i], pred[:, i])[0, 1]) for i in range(len(labels))]
    out = {
        'model': MODEL,
        'aiVersion': meta()['aiVersion'],
        'labelsVersion': LABELS_VERSION,
        'dim': int(proj.shape[0]),
        'scale': round(float(scale), 4),
        'bias': round(float(bias), 4),
        'labels': [
            {'id': l['id'], 'kind': l['kind'], 'k': round(float(np.abs(r).max() / 127), 8), 'v': pack(r)}
            for l, r in zip(labels, lp)
        ],
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, separators=(',', ':'))
        f.write('\n')
    print(f'{len(labels)} labels → src/logic/aiLabels.json · scale {scale:.3f} bias {bias:.3f} · rmse {rmse:.2f} logits · '
          f'correlation {min(corr):.3f}–{max(corr):.3f}')


if __name__ == '__main__':
    main()
