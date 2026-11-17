"""
Builds the files the apps ship in ai-assets/ (docs/AI.md):

  image.onnx    the SigLIP 2 base/32 image encoder, its matrix weights stored
                in 4 bits (blocks of 32, ONNX Runtime's MatMulNBits; the
                rest stays float — see docs/AI.md for why not int8), input pixels [n, 3, 256, 256] float32 already
                normalised (x / 255 - 0.5) / 0.5, output [n, 768] L2-normalised
  vectors.json  model name, AI_VERSION, input size, the embedding's size
                (and vecDim, kept from ml/compact.py)

After a new model: python ml/compact.py (ai-assets/compact.bin, the phone's
compact vector), then npm run ai:labels (the labels and the search words the
app scores from those vectors), npm run ai:demo and python ml/fixtures.py.

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

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'ai-assets')
WORK = os.path.join(ROOT, 'ml', 'build')
MODEL = 'google/siglip2-base-patch32-256'
SIZE = 256
# Bump with src/logic/ai.ts AI_VERSION and the native AI_VERSION: every photo gets its AI pass again.
AI_VERSION = 2


class ImageEncoder(torch.nn.Module):
    """The vision tower + its attention-pooling head, then L2 normalisation (so the phone only takes dot products)."""

    def __init__(self, model):
        super().__init__()
        self.vision = model.vision_model

    def forward(self, pixel_values):
        pooled = self.vision(pixel_values=pixel_values).pooler_output
        return torch.nn.functional.normalize(pooled, dim=-1)


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

    path = os.path.join(OUT, 'vectors.json')
    old = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    meta = {'model': MODEL, 'aiVersion': AI_VERSION, 'size': SIZE, 'dim': 768}
    if 'vecDim' in old:
        meta['vecDim'] = old['vecDim']
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, indent=2)
        f.write('\n')
    shutil.copy(os.path.join(ROOT, 'ml', 'LICENSES.md'), os.path.join(OUT, 'LICENSES.md'))
    print(f'image.onnx {os.path.getsize(packed) / 1e6:.1f} MB · now python ml/compact.py and npm run ai:labels')


if __name__ == '__main__':
    main()
