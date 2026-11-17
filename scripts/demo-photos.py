#!/usr/bin/env python3
"""Puts real photos into the demo library (src/native/demo/photos/): the
drawn scenes of scripts/demo-photos.py become CC0 photos of the test library
(scripts/test-photos.py — public domain, free for the store screenshots and
the preview video), only those without identifiable people (store=true in
scripts/test-photos.json).

The demo's manifest stays as it is — every time, place, burst, blurry shot,
copy and video keeps its id — so the screenshots, the preview video and the
App Review scenes still find what they expect. Only the pictures change:
each id below gets a photo that fits its place and season; a burst's frames
are the same photo cropped a little differently, the blurry ones blurred,
the messenger copies small copies of their original, a video's poster the
middle 16:9 band. The screenshots, notes and failed shots stay drawn.

Then the grey copies for the features (.cache/demo-grey/), so run after it:
  python3 scripts/demo-real.py && npm run ai:demo
(npm run demo-photos:real does both but the AI step, which needs ml/'s venv.)
Run `npm run test-photos` once first: it downloads the photos.
"""
import json
import os
import random
import sys

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DEMO = os.path.join(ROOT, 'src', 'native', 'demo')
PHOTOS = os.path.join(DEMO, 'photos')
SRC = os.path.join(ROOT, '.cache', 'test-photos', 'src')
GREY = os.path.join(ROOT, '.cache', 'demo-grey')
SOURCES = json.load(open(os.path.join(ROOT, 'scripts', 'test-photos.json'), encoding='utf-8'))['photos']

# id → source photo. Home near Hanau, by season; then Amsterdam (Aug 2025),
# Vienna (Dec 2025), Paris (May 2026), Lake Garda (Jul 2026).
SHOTS = {
    # garden
    'p001': 'ho49', 'p008': 'ho50', 'p013': 'xho33', 'p017': 'ho104', 'p024': 'xho60', 'p028': 'ho103',
    # playground
    'p002': 'ho79', 'p009': 'xho9', 'p014': 'ho78', 'p021': 'xho56', 'p025': 'ho84', 'p030': 'xho79',
    # cake
    'p003': 'ho16', 'p010': 'ho9', 'p015': 'ho12', 'p022': 'xho57', 'p026': 'xho63', 'p031': 'ho19',
    # out and about
    'p004': 'pe23', 'p011': 'na8', 'p016': 'na0', 'p023': 'pe26', 'p027': 'na17', 'p032': 'na1',
    # Amsterdam
    'p033': 'am7', 'p036': 'am19', 'p037': 'am23', 'p038': 'am4', 'p039': 'am38', 'p040': 'am45',
    'p041': 'am20', 'p042': 'am32', 'p043': 'am52',
    # Vienna
    'p044': 'vi24', 'p045': 'vi14', 'p046': 'vi8', 'p047': 'xvi56', 'p048': 'xvi3', 'p050': 'vi35',
    # Paris
    'p051': 'pa2', 'p052': 'pa23', 'p056': 'pa3', 'p057': 'pa21', 'p058': 'pa11', 'p059': 'pa19',
    'p060': 'pa24', 'p061': 'pa35', 'p062': 'pa36', 'p063': 'pa38', 'p064': 'pa47', 'p067': 'pa56',
    # Lake Garda
    'p068': 'ga2', 'p069': 'ga0', 'p070': 'ga12', 'p071': 'ga15', 'p072': 'ga17', 'p073': 'ga10',
    'p074': 'ga7', 'p077': 'ga9', 'p078': 'ga5', 'p079': 'ga21', 'p080': 'ga24', 'p082': 'ga8',
}
# More frames of a burst (seconds after the first): id → the first shot.
FRAMES = {'p005': 'p004', 'p006': 'p004', 'p007': 'p004', 'p018': 'p017', 'p019': 'p017', 'p020': 'p017',
          'p034': 'p033', 'p035': 'p033', 'p049': 'p048', 'p053': 'p052', 'p054': 'p052', 'p055': 'p052',
          'p065': 'p064', 'p066': 'p064', 'p075': 'p074', 'p076': 'p074', 'p081': 'p080'}
BLURRY = {'p009', 'p025', 'p036', 'p046', 'p063', 'p070', 'p071'}  # out of focus
SOFT = {'p034', 'p049', 'p053', 'p065', 'p075', 'p081'}  # the shaky frame of a burst
COPIES = {'p083': 'p040', 'p084': 'p021', 'p085': 'p060'}  # saved again from a messenger
POSTERS = {'p089': 'ho20', 'p090': 'ho20', 'p091': 'ga11', 'p101': 'ga11', 'p092': 'pa41'}
DRAWN = {'p012', 'p029', 'p086', 'p087', 'p088', 'p093', 'p094', 'p095', 'p096', 'p097', 'p098', 'p099', 'p100'}
W, H = 1024, 768


def photo(key, variant=0):
    """The source photo, cropped to 4:3 (W x H); another variant is a slightly other crop."""
    if not SOURCES[key]['store']:
        raise SystemExit(f'{key} is not for store assets (scripts/test-photos.json)')
    path = os.path.join(SRC, key)
    if not os.path.exists(path):
        raise SystemExit(f'{path} is missing: run npm run test-photos first (it downloads the photos)')
    img = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    w, h = img.size
    cw, ch = (int(h * W / H), h) if w / h > W / H else (w, int(w * H / W))
    sw, sh = int(cw * 0.94), int(ch * 0.94)
    j = random.Random(f'{key}-{variant}')
    x0 = (w - sw) // 2 + j.randint(-(cw - sw) // 2, (cw - sw) // 2)
    y0 = (h - sh) // 2 + j.randint(-(ch - sh) // 2, (ch - sh) // 2)
    return img.crop((x0, y0, x0 + sw, y0 + sh)).resize((W, H), Image.LANCZOS)


def grey(img, name):
    g = img.convert('L')
    g.thumbnail((512, 512), Image.LANCZOS)
    with open(os.path.join(GREY, name + '.pgm'), 'wb') as f:
        f.write(b'P5\n%d %d\n255\n' % g.size)
        f.write(g.tobytes())


def main():
    manifest = json.load(open(os.path.join(DEMO, 'manifest.json')))
    ids = {e['id'] for e in manifest}
    covered = set(SHOTS) | set(FRAMES) | set(COPIES) | set(POSTERS) | DRAWN
    assert ids == covered, ids ^ covered
    os.makedirs(GREY, exist_ok=True)
    made = {}
    for e in manifest:
        name = e['id']
        out = os.path.join(PHOTOS, name + '.jpg')
        if name in DRAWN:
            img = Image.open(out).convert('RGB')
        else:
            if name in SHOTS:
                img = photo(SHOTS[name])
            elif name in FRAMES:
                first = FRAMES[name]
                img = photo(SHOTS[first], variant=int(name[1:]))
                img = ImageEnhance.Brightness(img).enhance(random.Random(name).uniform(0.94, 1.06))
            elif name in COPIES:
                img = made[COPIES[name]].resize((800, 600), Image.LANCZOS)
            else:
                img = photo(POSTERS[name], variant=1 if e.get('take') else 0)
                top = (H - W * 9 // 16) // 2
                img = img.crop((0, top, W, top + W * 9 // 16))
            if name in BLURRY:
                img = img.filter(ImageFilter.GaussianBlur(6))
            elif name in SOFT:
                img = img.filter(ImageFilter.GaussianBlur(3))
            img.save(out, 'JPEG', quality=55 if name in COPIES else 80, optimize=True)
            made[name] = img
        assert (e['w'], e['h']) == img.size or name in COPIES or name in DRAWN, (name, img.size, e['w'], e['h'])
        grey(img, name)
    print(f'{len(manifest) - len(DRAWN)} real photos and posters, {len(DRAWN)} drawn → src/native/demo/photos/')


if __name__ == '__main__':
    sys.exit(main())
