#!/usr/bin/env python3
"""Draws the test pictures the feature tests share (fixtures/features/).

The TypeScript, Swift and Kotlin feature code all read these grey images and
must produce the values in expected.json (written by
scripts/feature-vectors.mjs from the TypeScript spec). The pictures are drawn
here, so their licence is ours.

  scene.pgm       a sunny landscape with a house and a tree, 512 x 384
  scene-blur.pgm  the same, blurred (radius 2.5): must score less sharp
  scene-copy.pgm  the same, re-saved as a JPEG at 384 x 288 and a little
                  brighter: must hash close to scene.pgm
  fog.pgm         a low-contrast picture (fog): little to see
  other.pgm       a different picture: must hash far from scene.pgm

Needs Pillow (pip install pillow). Run: python3 scripts/feature-fixtures.py
"""
import io
import os
import random

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'fixtures', 'features')


def grey(img):
    """The spec's grey: (77 R + 150 G + 29 B + 128) >> 8."""
    rgb = img.convert('RGB')
    w, h = rgb.size
    px = rgb.load()
    data = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            data[y * w + x] = (77 * r + 150 * g + 29 * b + 128) >> 8
    return w, h, bytes(data)


def write_pgm(name, img):
    w, h, data = grey(img)
    with open(os.path.join(OUT, name), 'wb') as f:
        f.write(b'P5\n%d %d\n255\n' % (w, h))
        f.write(data)


def scene(seed=1, w=512, h=384):
    rnd = random.Random(seed)
    img = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):  # sky
        t = y / h
        d.line([(0, y), (w, y)], fill=(int(90 + 120 * t), int(150 + 80 * t), int(230 - 30 * t)))
    d.ellipse([w * 0.72, h * 0.08, w * 0.86, h * 0.27], fill=(255, 236, 160))
    pts = [(0, h * 0.62)] + [(x, h * (0.55 + 0.08 * rnd.random())) for x in range(0, w + 40, 40)] + [(w, h), (0, h)]
    d.polygon(pts, fill=(70, 140, 70))
    for _ in range(1400):  # grass texture
        x, y = rnd.randrange(w), rnd.randrange(int(h * 0.6), h)
        g = rnd.randrange(90, 190)
        d.line([(x, y), (x + rnd.randrange(-2, 3), y - rnd.randrange(3, 9))], fill=(40, g, 40))
    d.rectangle([w * 0.2, h * 0.45, w * 0.42, h * 0.75], fill=(220, 200, 170))  # house
    d.polygon([(w * 0.18, h * 0.46), (w * 0.31, h * 0.3), (w * 0.44, h * 0.46)], fill=(170, 60, 50))
    for wx in (0.24, 0.34):
        d.rectangle([w * wx, h * 0.52, w * (wx + 0.05), h * 0.6], fill=(60, 90, 140))
    d.rectangle([w * 0.29, h * 0.63, w * 0.33, h * 0.75], fill=(100, 60, 40))
    d.rectangle([w * 0.62, h * 0.48, w * 0.65, h * 0.72], fill=(90, 60, 30))  # tree
    for _ in range(500):
        x, y = rnd.gauss(w * 0.635, w * 0.06), rnd.gauss(h * 0.4, h * 0.08)
        g = rnd.randrange(80, 170)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(30, g, 30))
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    base = scene()
    write_pgm('scene.pgm', base)
    write_pgm('scene-blur.pgm', base.filter(ImageFilter.GaussianBlur(2.5)))
    buf = io.BytesIO()
    ImageEnhance.Brightness(base.resize((384, 288), Image.LANCZOS)).enhance(1.06).save(buf, 'JPEG', quality=55)
    write_pgm('scene-copy.pgm', Image.open(io.BytesIO(buf.getvalue())))
    fog = Image.blend(base, Image.new('RGB', base.size, (200, 200, 205)), 0.85)
    write_pgm('fog.pgm', fog)
    write_pgm('other.pgm', scene(seed=9).transpose(Image.FLIP_LEFT_RIGHT).rotate(180))
    print('Wrote', ', '.join(sorted(os.listdir(OUT))))


if __name__ == '__main__':
    main()
