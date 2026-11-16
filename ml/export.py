"""
Builds the files the apps ship in ai-assets/ (docs/AI.md):

  image.onnx    the SigLIP 2 base/32 image encoder, its matrix weights stored
                in 4 bits (blocks of 32, ONNX Runtime's MatMulNBits; the
                rest stays float — see docs/AI.md for why not int8), input pixels [n, 3, 256, 256] float32 already
                normalised (x / 255 - 0.5) / 0.5, output [n, 768] L2-normalised
  vectors.bin   one float16 row of 768 per label (ml/labels.yaml order): the
                mean of the label's prompt embeddings, L2-normalised
  vectors.json  model name, AI_VERSION, input size, the sigmoid's scale and
                bias, the labels (id, kind)

A photo's score for a label (computed on the phone) is
  sigmoid(scale * dot(image, label) + bias), shown as a whole percent.

Usage (in a venv with ml/requirements.txt):
  python ml/export.py                   # SigLIP 2 base/32 (the default)
  python ml/export.py --keep-float      # also keep ml/build/image-fp32.onnx, the reference for ml/eval.py

Downloads the model from Hugging Face (Apache 2.0) on the first run; nothing
here runs in the app.
"""
import argparse
import json
import os
import shutil

import numpy as np
import torch
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'ai-assets')
WORK = os.path.join(ROOT, 'ml', 'build')
MODEL = 'google/siglip2-base-patch32-256'
SIZE = 256
# Bump with src/logic/ai.ts AI_VERSION and the native AI_VERSION: every photo gets its AI pass again.
AI_VERSION = 1


class ImageEncoder(torch.nn.Module):
    """The vision tower + its attention-pooling head, then L2 normalisation (so the phone only takes dot products)."""

    def __init__(self, model):
        super().__init__()
        self.vision = model.vision_model

    def forward(self, pixel_values):
        pooled = self.vision(pixel_values=pixel_values).pooler_output
        return torch.nn.functional.normalize(pooled, dim=-1)


def load_labels():
    with open(os.path.join(ROOT, 'ml', 'labels.yaml'), encoding='utf-8') as f:
        return yaml.safe_load(f)['labels']


def text_vectors(model, processor, labels):
    rows = []
    for label in labels:
        prompts = [p.lower() for p in label['prompts']]
        inputs = processor(text=prompts, padding='max_length', max_length=64, return_tensors='pt')
        with torch.no_grad():
            emb = model.get_text_features(input_ids=inputs['input_ids'])
        if not torch.is_tensor(emb):
            emb = emb.pooler_output
        emb = torch.nn.functional.normalize(emb, dim=-1).mean(dim=0)
        rows.append(torch.nn.functional.normalize(emb, dim=-1).numpy())
    return np.stack(rows).astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--keep-float', action='store_true')
    args = ap.parse_args()

    from transformers import AutoModel, AutoProcessor
    import onnx
    from onnxruntime.quantization.matmul_nbits_quantizer import DefaultWeightOnlyQuantConfig, MatMulNBitsQuantizer

    os.makedirs(OUT, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    model = AutoModel.from_pretrained(MODEL).eval()
    processor = AutoProcessor.from_pretrained(MODEL)

    fp32 = os.path.join(WORK, 'image-fp32.onnx')
    encoder = ImageEncoder(model).eval()
    dummy = torch.zeros(1, 3, SIZE, SIZE)
    torch.onnx.export(
        encoder, (dummy,), fp32, input_names=['pixels'], output_names=['embedding'],
        dynamic_axes={'pixels': {0: 'n'}, 'embedding': {0: 'n'}}, opset_version=17, dynamo=False,
    )
    # Weight-only 4-bit: the activations stay float. Dynamic int8 (weights and
    # activations) bent the embeddings far off (cosine 0.6-0.8 to float32);
    # this keeps them at about 0.96 and the labels' separation (AUC) the same.
    packed = os.path.join(OUT, 'image.onnx')
    q = MatMulNBitsQuantizer(onnx.load(fp32), algo_config=DefaultWeightOnlyQuantConfig(block_size=32, is_symmetric=True, bits=4))
    q.process()
    onnx.save(q.model.model, packed)

    if not args.keep_float:
        os.remove(fp32)

    labels = load_labels()
    vecs = text_vectors(model, processor, labels)
    vecs.astype(np.float16).tofile(os.path.join(OUT, 'vectors.bin'))
    scale = float(model.logit_scale.exp().item())
    bias = float(model.logit_bias.item())
    meta = {
        'model': MODEL,
        'aiVersion': AI_VERSION,
        'size': SIZE,
        'dim': int(vecs.shape[1]),
        'scale': round(scale, 6),
        'bias': round(bias, 6),
        'labels': [{'id': l['id'], 'kind': l['kind']} for l in labels],
    }
    with open(os.path.join(OUT, 'vectors.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
        f.write('\n')
    shutil.copy(os.path.join(ROOT, 'ml', 'LICENSES.md'), os.path.join(OUT, 'LICENSES.md'))
    print(f'image.onnx {os.path.getsize(packed) / 1e6:.1f} MB · {len(labels)} labels · scale {scale:.3f} bias {bias:.3f}')


if __name__ == '__main__':
    main()
