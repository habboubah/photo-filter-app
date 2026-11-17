"""
Shared helpers for the compact embedding (docs/AI.md, "The compact vector"):
embedding images with the shipped model exactly as the phone does, the
256 × 768 projection in ai-assets/compact.bin, and the int8 packing the phone
and the app share.
"""
import base64
import glob
import json
import os

import numpy as np

from eval import pixels

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'ai-assets')
BUILD = os.path.join(ROOT, 'ml', 'build')
MODEL = 'google/siglip2-base-patch32-256'


def meta():
    with open(os.path.join(ASSETS, 'vectors.json'), encoding='utf-8') as f:
        return json.load(f)


def image_files(folders):
    out = []
    for folder in folders:
        for ext in ('jpg', 'jpeg', 'png'):
            out += glob.glob(os.path.join(folder, '**', f'*.{ext}'), recursive=True)
    return sorted(set(out))


def embed_files(files, size=256, batch=16):
    """Each file's 768-d embedding from ai-assets/image.onnx (the 4-bit model the phones run), L2-normalised."""
    import onnxruntime as ort
    sess = ort.InferenceSession(os.path.join(ASSETS, 'image.onnx'), providers=['CPUExecutionProvider'])
    out = []
    for i in range(0, len(files), batch):
        x = np.stack([pixels(f, size) for f in files[i:i + batch]])
        out.append(sess.run(['embedding'], {'pixels': x})[0])
    e = np.concatenate(out).astype(np.float32)
    return e / np.linalg.norm(e, axis=1, keepdims=True)


def load_projection():
    m = meta()
    p = np.fromfile(os.path.join(ASSETS, 'compact.bin'), dtype='<f2').astype(np.float32)
    return p.reshape(m['vecDim'], m['dim'])


def compact(emb, proj):
    """The phone's compact vector: the projection, L2-normalised (float, before packing)."""
    y = emb @ proj.T
    return y / np.linalg.norm(y, axis=-1, keepdims=True)


def pack(v):
    """int8 in base64, each vector scaled by its own largest value (ImageEmbedder.packed on both phones)."""
    v = np.asarray(v, dtype=np.float32)
    top = float(np.abs(v).max())
    k = 127.0 / top if top > 0 else 0.0
    q = np.clip(np.round(v * k), -127, 127).astype(np.int8)
    return base64.b64encode(q.tobytes()).decode('ascii')


def unpack(s):
    return np.frombuffer(base64.b64decode(s), dtype=np.int8).astype(np.float32)


def text_model():
    import torch  # noqa: F401
    from transformers import AutoModel, AutoProcessor
    return AutoModel.from_pretrained(MODEL).eval(), AutoProcessor.from_pretrained(MODEL)


def text_vectors(model, processor, prompt_lists):
    """One L2-normalised 768-d vector per list of prompts: the mean of the prompts' embeddings."""
    import torch
    rows = []
    for prompts in prompt_lists:
        inputs = processor(text=[p.lower() for p in prompts], padding='max_length', max_length=64, truncation=True, return_tensors='pt')
        with torch.no_grad():
            emb = model.get_text_features(input_ids=inputs['input_ids'])
        if not torch.is_tensor(emb):
            emb = emb.pooler_output
        emb = torch.nn.functional.normalize(emb, dim=-1).mean(dim=0)
        rows.append(torch.nn.functional.normalize(emb, dim=-1).numpy())
    return np.stack(rows).astype(np.float32)


def fit_embeddings():
    path = os.path.join(BUILD, 'fit-embeddings.npy')
    if not os.path.exists(path):
        raise SystemExit('ml/build/fit-embeddings.npy is missing: run ml/compact.py first')
    return np.load(path)
