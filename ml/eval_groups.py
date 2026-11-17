"""
The test set for similar groups, copies and the best shot (docs/AI.md, "Test
set"), step 1 of 2: every picture embedded with the shipped model and turned
into its compact vector, and a grey copy (fitted into 512 × 512, the spec's
grey: src/logic/features.ts) for the features. Step 2,
scripts/eval-groups.mjs, runs the app's own code over them.

  npm run ai:eval-groups       (both steps)

The folders (ml/testset/ is gitignored and never leaves the Mac):

  ml/testset/pairs/same/<name>/      two shots of the same moment (a burst, a retake seconds later)
  ml/testset/pairs/copy/<name>/      a photo and its copy (saved from WhatsApp, edited, filtered, cropped)
  ml/testset/pairs/different/<name>/ two photos that are NOT the same shot, but alike (the same swing,
                                     the same table, minutes apart)
  ml/testset/groups/<name>/          a burst or series, with best.txt naming the file you would keep

Each pair folder holds exactly two pictures (jpg, jpeg, png or heic converted
to jpg). About 100 pairs of each kind and 50 groups give numbers worth tuning
on. Writes ml/build/eval-groups.json and ml/build/eval-grey/*.pgm.
"""
import json
import os

import numpy as np
from PIL import Image

from compactlib import BUILD, ROOT, compact, embed_files, load_projection, meta, pack
from eval import fit512

SET = os.path.join(ROOT, 'ml', 'testset')
HOW = '''ml/testset/ — your own photos, never in git, never leaves the Mac.
One folder per example; name the folders anything (01, beach-burst, …).

  pairs/same/<name>/       2 photos: the same moment twice (a burst, a retake seconds later)
  pairs/copy/<name>/       2 photos: a photo and its copy (from WhatsApp, edited, filtered, cropped)
  pairs/different/<name>/  2 photos: NOT the same shot, but alike (the same swing, minutes apart)
  groups/<name>/           a burst or series (2 or more) + best.txt with the file name you would keep

JPEG or PNG (export HEIC from Photos as JPEG: File › Export). About 50 of each
kind of pair and 10 groups to start, 100 and 50 for numbers worth tuning on.
Then: npm run ai:eval-groups
'''
GREY = os.path.join(BUILD, 'eval-grey')
EXT = ('.jpg', '.jpeg', '.png')


def pictures(folder):
    return sorted(os.path.join(folder, f) for f in os.listdir(folder) if f.lower().endswith(EXT))


def grey(path, out):
    """The spec's grey copy: fitted into 512 × 512 (never enlarged), g = (77R + 150G + 29B + 128) >> 8, as a PGM."""
    img = fit512(Image.open(path).convert('RGB'))
    a = np.asarray(img, dtype=np.int32)
    g = ((77 * a[:, :, 0] + 150 * a[:, :, 1] + 29 * a[:, :, 2] + 128) >> 8).astype(np.uint8)
    with open(out, 'wb') as f:
        f.write(f'P5\n{g.shape[1]} {g.shape[0]}\n255\n'.encode('ascii'))
        f.write(g.tobytes())


def main():
    os.makedirs(GREY, exist_ok=True)
    entries = []          # (kind, name, files)
    for kind in ('same', 'copy', 'different'):
        root = os.path.join(SET, 'pairs', kind)
        if not os.path.isdir(root):
            continue
        for name in sorted(os.listdir(root)):
            files = pictures(os.path.join(root, name))
            if len(files) == 2:
                entries.append(('pair:' + kind, name, files))
            else:
                print(f'skipped pairs/{kind}/{name}: {len(files)} pictures, not 2')
    groups_root = os.path.join(SET, 'groups')
    if os.path.isdir(groups_root):
        for name in sorted(os.listdir(groups_root)):
            folder = os.path.join(groups_root, name)
            files = pictures(folder)
            best = open(os.path.join(folder, 'best.txt')).read().strip() if os.path.exists(os.path.join(folder, 'best.txt')) else None
            if len(files) >= 2 and best and best in [os.path.basename(f) for f in files]:
                entries.append(('group', name, files, best))
            else:
                print(f'skipped groups/{name}: needs two or more pictures and best.txt naming one of them')
    if not entries:
        for sub in ('pairs/same', 'pairs/copy', 'pairs/different', 'groups'):
            os.makedirs(os.path.join(SET, sub), exist_ok=True)
        with open(os.path.join(SET, 'README.txt'), 'w', encoding='utf-8') as f:
            f.write(HOW)
        raise SystemExit('No pictures in ml/testset/ yet. The folders are ready now — what goes where:\n\n' + HOW)

    every = sorted({f for e in entries for f in e[2]})
    vecs = compact(embed_files(every, meta()['size']), load_projection())
    index = {}
    for i, f in enumerate(every):
        key = f'{i:05d}'
        grey(f, os.path.join(GREY, key + '.pgm'))
        w, h = Image.open(f).size
        index[f] = {'key': key, 'file': os.path.relpath(f, SET), 'w': w, 'h': h, 'vec': pack(vecs[i])}

    out = {'pairs': [], 'groups': []}
    for e in entries:
        if e[0] == 'group':
            out['groups'].append({'name': e[1], 'best': e[3], 'photos': [index[f] for f in e[2]]})
        else:
            out['pairs'].append({'kind': e[0][5:], 'name': e[1], 'a': index[e[2][0]], 'b': index[e[2][1]]})
    with open(os.path.join(BUILD, 'eval-groups.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f)
    print(f"{len(out['pairs'])} pairs, {len(out['groups'])} groups, {len(every)} pictures → ml/build/eval-groups.json")


if __name__ == '__main__':
    main()
