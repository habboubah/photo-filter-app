#!/usr/bin/env python3
"""Draws the demo library's photos: src/native/demo/photos/*.jpg.

The web build has no photo library, so the demo library (src/native/demo/)
stands in for it — in `npm run dev`, the privacy check, the screenshots, the
preview video and the App Review rehearsal. Its photos are drawn here, so
they are ours to use anywhere (no licence to track, no faces of children).
Real photos for the store assets are listed in docs/TODO.md.

Writes, per photo, a JPEG (1024 px long side) and its grey 512-px copy
(.cache/demo-grey/*.pgm), plus src/native/demo/manifest.json: when and where
each was "taken". scripts/demo-facts.mjs then computes the features with the
app's own spec. Needs Pillow. Run: npm run demo-photos
"""
import json
import math
import os
import random
from datetime import datetime, timedelta

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'src', 'native', 'demo', 'photos')
GREY = os.path.join(ROOT, '.cache', 'demo-grey')
W, H = 1024, 768


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sky(d, top, bottom, h=H):
    for y in range(h):
        d.line([(0, y), (W, y)], fill=lerp(top, bottom, y / h))


def hills(d, rnd, base, colour, amp=40, step=60):
    pts = [(0, H)]
    for x in range(0, W + step, step):
        pts.append((x, base + rnd.uniform(-amp, amp)))
    pts.append((W, H))
    d.polygon(pts, fill=colour)


def texture(d, rnd, box, colours, n=1500, size=3):
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y = rnd.uniform(x0, x1), rnd.uniform(y0, y1)
        r = rnd.uniform(1, size)
        d.ellipse([x - r, y - r, x + r, y + r], fill=rnd.choice(colours))


def sun(d, x, y, r, colour):
    d.ellipse([x - r, y - r, x + r, y + r], fill=colour)


def paris(rnd, v):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    sky(d, (255, 170, 120), (255, 226, 190))
    sun(d, 760 + v * 6, 220, 60, (255, 240, 200))
    x = 0
    while x < W:  # roofs
        w = rnd.randint(70, 130)
        top = rnd.randint(330, 430)
        d.rectangle([x, top, x + w, 560], fill=lerp((210, 190, 170), (150, 130, 120), rnd.random()))
        d.polygon([(x - 4, top), (x + w // 2, top - rnd.randint(20, 50)), (x + w + 4, top)], fill=(90, 100, 120))
        for wy in range(top + 20, 540, 34):
            for wx in range(x + 10, x + w - 14, 24):
                d.rectangle([wx, wy, wx + 12, wy + 18], fill=(255, 220, 160) if rnd.random() < 0.3 else (80, 80, 100))
        x += w + 6
    d.ellipse([440, 250, 600, 400], fill=(230, 225, 210))  # a dome
    d.rectangle([505, 200, 535, 260], fill=(230, 225, 210))
    d.rectangle([0, 560, W, H], fill=(70, 110, 150))  # the river
    for _ in range(140):
        y = rnd.uniform(570, H)
        x = rnd.uniform(0, W)
        d.line([(x, y), (x + rnd.uniform(20, 60), y)], fill=(255, 210, 170), width=2)
    return img


def garda(rnd, v):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    sky(d, (90, 160, 230), (200, 230, 250))
    sun(d, 200 + v * 5, 150, 50, (255, 250, 220))
    hills(d, rnd, 330, (90, 110, 140), amp=90, step=90)
    hills(d, rnd, 400, (70, 120, 90), amp=50, step=70)
    d.rectangle([0, 470, W, H], fill=(40, 120, 160))
    for _ in range(220):
        y = rnd.uniform(480, H)
        x = rnd.uniform(0, W)
        d.line([(x, y), (x + rnd.uniform(10, 40), y)], fill=(170, 220, 240), width=2)
    for bx in (300 + v * 8, 640 - v * 6):  # boats
        d.polygon([(bx, 560), (bx + 90, 560), (bx + 70, 590), (bx + 20, 590)], fill=(250, 250, 245))
        d.polygon([(bx + 45, 470), (bx + 45, 555), (bx + 90, 555)], fill=(255, 255, 255))
    texture(d, rnd, (0, 380, W, 470), [(50, 110, 70), (80, 140, 80), (40, 90, 60)], n=900, size=4)
    return img


def amsterdam(rnd, v):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    sky(d, (150, 190, 230), (230, 240, 250))
    x = -20 + v * 4
    colours = [(170, 70, 50), (60, 70, 90), (200, 160, 90), (120, 60, 50), (90, 110, 80), (180, 120, 80)]
    while x < W:
        w = rnd.randint(90, 120)
        top = rnd.randint(150, 260)
        c = rnd.choice(colours)
        d.rectangle([x, top, x + w, 560], fill=c)
        d.polygon([(x, top), (x + w // 2, top - 60), (x + w, top)], fill=c)
        for wy in range(top + 20, 540, 46):
            for wx in range(x + 14, x + w - 24, 32):
                d.rectangle([wx, wy, wx + 18, wy + 30], fill=(240, 240, 235))
                d.rectangle([wx + 3, wy + 3, wx + 15, wy + 27], fill=(60, 70, 90))
        x += w + 2
    d.rectangle([0, 560, W, H], fill=(60, 80, 70))
    for _ in range(200):
        y = rnd.uniform(565, H)
        x = rnd.uniform(0, W)
        d.line([(x, y), (x + rnd.uniform(10, 50), y)], fill=(130, 150, 140), width=2)
    for bx in range(80, W, 260):  # bikes on the railing
        d.ellipse([bx, 520, bx + 40, 560], outline=(30, 30, 30), width=4)
        d.ellipse([bx + 60, 520, bx + 100, 560], outline=(30, 30, 30), width=4)
        d.line([(bx + 20, 540), (bx + 50, 515), (bx + 80, 540)], fill=(30, 30, 30), width=4)
    return img


def vienna(rnd, v):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    sky(d, (20, 30, 70), (70, 80, 130))
    for _ in range(60):
        x, y = rnd.uniform(0, W), rnd.uniform(0, 300)
        d.ellipse([x, y, x + 2, y + 2], fill=(230, 230, 255))
    d.polygon([(380, 520), (500, 120 + v * 3), (620, 520)], fill=(60, 50, 60))  # a spire
    for i in range(6):  # market stalls
        x = 40 + i * 165
        d.rectangle([x, 470, x + 140, 640], fill=(120, 70, 40))
        d.polygon([(x - 10, 470), (x + 70, 420), (x + 150, 470)], fill=(200, 40, 40))
        for lx in range(x, x + 140, 14):
            d.ellipse([lx, 476, lx + 8, 484], fill=(255, 220, 120))
    d.rectangle([0, 640, W, H], fill=(235, 238, 245))
    texture(d, rnd, (0, 0, W, H), [(255, 255, 255), (220, 225, 240)], n=500, size=3)
    return img


def home(rnd, v, kind):
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    if kind == 'garden':
        sky(d, (140, 200, 240), (220, 240, 250))
        hills(d, rnd, 460, (90, 160, 80), amp=20)
        texture(d, rnd, (0, 470, W, H), [(70, 150, 60), (100, 180, 70), (60, 130, 50)], n=2500)
        for fx in range(40, W, 70):
            d.ellipse([fx + v * 3, 600, fx + 26 + v * 3, 626], fill=rnd.choice([(255, 90, 90), (255, 210, 60), (250, 250, 250)]))
        d.rectangle([700, 300, 880, 470], fill=(200, 120, 90))
        d.polygon([(690, 300), (790, 220), (890, 300)], fill=(120, 60, 50))
    elif kind == 'swing':
        sky(d, (160, 210, 245), (230, 245, 250))
        d.rectangle([0, 520, W, H], fill=(210, 190, 150))
        d.line([(300, 520), (420, 180), (540, 520)], fill=(200, 60, 60), width=14)
        d.line([(500, 520), (620, 180), (740, 520)], fill=(200, 60, 60), width=14)
        d.line([(420, 180), (620, 180)], fill=(200, 60, 60), width=14)
        sx = 520 + 30 * math.sin(v)
        d.line([(480, 185), (sx - 20, 420)], fill=(60, 60, 60), width=4)
        d.line([(560, 185), (sx + 20, 420)], fill=(60, 60, 60), width=4)
        d.rectangle([sx - 40, 420, sx + 40, 434], fill=(80, 60, 40))
        texture(d, rnd, (0, 520, W, H), [(190, 170, 130), (225, 205, 165)], n=1500, size=2)
    elif kind == 'cake':
        sky(d, (250, 235, 220), (240, 215, 195))
        d.rectangle([0, 520, W, H], fill=(190, 140, 100))
        d.ellipse([300, 380, 724, 520], fill=(255, 245, 240))
        d.rectangle([300, 300, 724, 450], fill=(255, 180, 190))
        d.ellipse([300, 240, 724, 360], fill=(255, 220, 225))
        for i in range(5):
            cx = 390 + i * 60
            d.rectangle([cx, 200, cx + 12, 290], fill=(120, 170, 240))
            d.ellipse([cx - 4, 170 + v * 2, cx + 16, 205], fill=(255, 200, 60))
        texture(d, rnd, (320, 250, 700, 340), [(255, 100, 120), (120, 200, 255), (255, 230, 90)], n=200, size=4)
    else:  # park
        sky(d, (120, 180, 230), (210, 230, 245))
        hills(d, rnd, 420, (80, 150, 80), amp=30)
        for tx in range(60, W, 190):
            d.rectangle([tx + 30, 300, tx + 50, 470], fill=(100, 70, 40))
            texture(d, rnd, (tx - 30, 160, tx + 110, 330), [(40, 120, 50), (70, 150, 60), (30, 100, 40)], n=500, size=6)
        d.rectangle([0, 560, W, H], fill=(200, 190, 170))
    return img


def screenshot(rnd, v):
    img = Image.new('RGB', (590, 1278), (245, 245, 247))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 590, 90], fill=(255, 255, 255))
    for i in range(9):
        y = 130 + i * 120
        d.rounded_rectangle([30, y, 560, y + 100], 18, fill=(255, 255, 255))
        d.ellipse([50, y + 20, 110, y + 80], fill=rnd.choice([(255, 150, 120), (120, 190, 255), (150, 220, 160)]))
        d.rectangle([130, y + 30, 130 + rnd.randint(200, 380), y + 46], fill=(60, 60, 70))
        d.rectangle([130, y + 58, 130 + rnd.randint(120, 300), y + 70], fill=(170, 170, 180))
    return img


SCENES = {'paris': paris, 'garda': garda, 'amsterdam': amsterdam, 'vienna': vienna}
PLACES = {
    'paris': (48.857, 2.352), 'garda': (45.886, 10.842), 'amsterdam': (52.372, 4.900),
    'vienna': (48.208, 16.373), 'home': (50.132, 8.917),
}


def main():
    rnd = random.Random(2026)
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(GREY, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    manifest = []
    n = 0

    def save(img, when, place, extra=None):
        nonlocal n
        n += 1
        name = f'p{n:03d}'
        img.save(os.path.join(OUT, name + '.jpg'), 'JPEG', quality=78, optimize=True)
        g = img.convert('RGB')
        g.thumbnail((512, 512), Image.LANCZOS)
        w, h = g.size
        px = g.load()
        data = bytearray(w * h)
        for y in range(h):
            for x in range(w):
                r, gg, b = px[x, y]
                data[y * w + x] = (77 * r + 150 * gg + 29 * b + 128) >> 8
        with open(os.path.join(GREY, name + '.pgm'), 'wb') as f:
            f.write(b'P5\n%d %d\n255\n' % (w, h))
            f.write(bytes(data))
        entry = {'id': name, 't': int(when.timestamp() * 1000), 'w': img.size[0], 'h': img.size[1]}
        if place:
            lat, lon = PLACES[place]
            entry['lat'] = round(lat + rnd.uniform(-0.02, 0.02), 5)
            entry['lon'] = round(lon + rnd.uniform(-0.03, 0.03), 5)
        entry.update(extra or {})
        manifest.append(entry)

    def trip(place, start, days, per_day, groups, blurry):
        when = start
        shots = days * per_day
        group_at = set(rnd.sample(range(shots), len(groups)))
        blur_at = set(rnd.sample(sorted(set(range(shots)) - group_at), blurry))
        gi = 0
        for i in range(shots):
            day = i // per_day
            when = start + timedelta(days=day, hours=9 + (i % per_day) * (10 / per_day), minutes=rnd.randint(0, 30))
            seed = rnd.randint(0, 10**6)
            img = SCENES[place](random.Random(seed), rnd.randint(0, 4))
            if i in blur_at:
                img = img.filter(ImageFilter.GaussianBlur(rnd.choice([3, 4, 6])))
            no_gps = rnd.random() < 0.12
            save(img, when, None if no_gps else place)
            if i in group_at:  # near-identical shots seconds apart
                for k in range(groups[gi] - 1):
                    v = random.Random(seed)
                    shot = SCENES[place](v, k + 1)
                    if k == 0:
                        shot = shot.filter(ImageFilter.GaussianBlur(1.6))
                    shot = ImageEnhance.Brightness(shot).enhance(rnd.uniform(0.93, 1.07))
                    save(shot, when + timedelta(seconds=3 * (k + 1)), None if no_gps else place)
                gi += 1

    # Home: a photo every few days, with a few groups and blurry ones — never
    # inside a trip (a photo at home would end it).
    away = [(datetime(2025, 8, 13), datetime(2025, 8, 18)), (datetime(2025, 12, 11), datetime(2025, 12, 16)),
            (datetime(2026, 5, 21), datetime(2026, 5, 27)), (datetime(2026, 7, 27), datetime(2026, 8, 2))]
    start = datetime(2025, 6, 1, 16)
    kinds = ['garden', 'swing', 'cake', 'park']
    for i in range(24):
        when = start + timedelta(days=i * 21 + rnd.randint(0, 5), hours=rnd.randint(0, 3))
        while any(a <= when <= b for a, b in away):
            when += timedelta(days=4)
        kind = kinds[i % 4]
        seed = rnd.randint(0, 10**6)
        img = home(random.Random(seed), 0, kind)
        if i in (5, 17):
            img = img.filter(ImageFilter.GaussianBlur(5))
        save(img, when, 'home', {'fav': True} if i == 9 else None)
        if i in (3, 12):
            for k in range(3):
                shot = home(random.Random(seed), k + 1, kind)
                save(ImageEnhance.Brightness(shot).enhance(rnd.uniform(0.95, 1.05)), when + timedelta(seconds=2 * (k + 1)), 'home')
        if i in (7, 20):
            save(screenshot(rnd, i), when + timedelta(minutes=5), None, {'shot': True})

    trip('amsterdam', datetime(2025, 8, 14, 0), 3, 3, [3], 1)
    trip('vienna', datetime(2025, 12, 12, 0), 3, 2, [2], 1)
    trip('paris', datetime(2026, 5, 22, 0), 4, 3, [4, 3], 1)
    trip('garda', datetime(2026, 7, 28, 0), 4, 3, [3, 2], 2)

    with open(os.path.join(ROOT, 'src', 'native', 'demo', 'manifest.json'), 'w') as f:
        json.dump(sorted(manifest, key=lambda e: e['t']), f, indent=1)
    print(f'{n} photos')


if __name__ == '__main__':
    main()
