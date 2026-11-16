"""
A synthetic smoke-test set for ml/eval.py, until real photos are labelled
(docs/AI.md, "Test set"): drawn receipts, documents, chat screenshots, QR
codes, whiteboards and slides, accidental shots, memes and photos of screens,
plus ordinary photos from a folder you give (they become the label "other",
and the memory labels where a caption file says so).

  python ml/make_smoke.py --photos <folder of ordinary photos> [--captions file.json]

Writes ml/testset/smoke/<label>/*.jpg (ml/testset/ is gitignored). These
images only tune the first, provisional thresholds — real photos decide.
"""
import argparse
import glob
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'ml', 'testset', 'smoke')
FONTS = '/usr/share/fonts/truetype/dejavu/'
WORDS = ('milk bread cheese apples coffee pasta tomatoes butter water juice eggs rice soap tea chocolate yogurt '
         'invoice amount date customer total payment account number reference period service delivery address '
         'meeting tomorrow ok thanks see you later call me back sounds good love it where are you on my way').split()


def font(size, bold=False, mono=False):
    name = 'DejaVuSansMono.ttf' if mono else ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')
    return ImageFont.truetype(os.path.join(FONTS, name), size)


def words(rnd, n):
    return ' '.join(rnd.choice(WORDS) for _ in range(n))


def table(rnd, w=1024, h=768):
    base = rnd.choice([(150, 110, 80), (120, 120, 125), (200, 190, 175), (60, 60, 65), (175, 140, 100)])
    img = Image.new('RGB', (w, h), base)
    d = ImageDraw.Draw(img)
    for _ in range(40):
        y = rnd.randrange(h)
        shade = tuple(max(0, min(255, c + rnd.randint(-18, 18))) for c in base)
        d.line([(0, y), (w, y + rnd.randint(-30, 30))], fill=shade, width=rnd.randint(2, 8))
    return img.filter(ImageFilter.GaussianBlur(2))


def paste_rotated(bg, sheet, rnd, max_angle=12):
    sheet = sheet.rotate(rnd.uniform(-max_angle, max_angle), expand=True, fillcolor=(0, 0, 0, 0), resample=Image.BICUBIC)
    x = (bg.width - sheet.width) // 2 + rnd.randint(-60, 60)
    y = (bg.height - sheet.height) // 2 + rnd.randint(-40, 40)
    bg.paste(sheet, (x, y), sheet)
    return bg


def receipt(rnd):
    w, h = 300, rnd.randint(560, 700)
    sheet = Image.new('RGBA', (w, h), (250, 249, 244, 255))
    d = ImageDraw.Draw(sheet)
    f, fb = font(15, mono=True), font(20, bold=True)
    d.text((w // 2, 20), rnd.choice(['REWE', 'ALDI', 'EDEKA', 'LIDL', 'DM', 'CAFE ROMA']), font=fb, fill=(20, 20, 20), anchor='mt')
    y = 70
    total = 0
    while y < h - 110:
        price = rnd.randint(49, 1299) / 100
        total += price
        d.text((16, y), rnd.choice(WORDS[:16]).upper()[:16], font=f, fill=(30, 30, 30))
        d.text((w - 16, y), f'{price:.2f}', font=f, fill=(30, 30, 30), anchor='ra')
        y += 24
    d.line([(16, y), (w - 16, y)], fill=(40, 40, 40), width=2)
    d.text((16, y + 12), 'SUMME EUR', font=fb, fill=(10, 10, 10))
    d.text((w - 16, y + 12), f'{total:.2f}', font=fb, fill=(10, 10, 10), anchor='ra')
    return paste_rotated(table(rnd), sheet, rnd)


def document(rnd):
    w, h = 520, 720
    sheet = Image.new('RGBA', (w, h), (252, 252, 250, 255))
    d = ImageDraw.Draw(sheet)
    d.text((40, 40), rnd.choice(['Rechnung', 'Invoice', 'Mietvertrag', 'Bescheid', 'Elternbrief', 'Anmeldung']), font=font(28, bold=True), fill=(15, 15, 15))
    y = 100
    while y < h - 60:
        if rnd.random() < 0.12:
            y += 18
            continue
        d.text((40, y), words(rnd, rnd.randint(6, 9)), font=font(15), fill=(40, 40, 40))
        y += 22
    bg = table(rnd, 1024, 1024) if rnd.random() < 0.5 else Image.new('RGB', (1024, 1024), (235, 235, 232))
    return paste_rotated(bg, sheet, rnd, 8)


def chat(rnd):
    w, h = 590, 1280
    dark = rnd.random() < 0.4
    img = Image.new('RGB', (w, h), (18, 18, 18) if dark else rnd.choice([(236, 229, 221), (255, 255, 255), (242, 242, 247)]))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w, 140], fill=(32, 44, 51) if dark else (0, 128, 105) if rnd.random() < 0.5 else (248, 248, 248))
    d.text((24, 16), '9:41', font=font(22, bold=True), fill=(255, 255, 255) if dark else (20, 20, 20))
    d.text((110, 80), rnd.choice(['Mama', 'Familie', 'Kita Gruppe', 'Ali', 'Sarah']), font=font(26, bold=True), fill=(240, 240, 240) if dark else (20, 20, 20))
    y = 170
    while y < h - 140:
        mine = rnd.random() < 0.5
        text = words(rnd, rnd.randint(2, 7))
        tw = min(400, 14 * len(text))
        x0 = w - tw - 40 if mine else 20
        fill = ((5, 97, 98) if dark else (217, 253, 211)) if mine else ((38, 45, 49) if dark else (255, 255, 255))
        d.rounded_rectangle([x0, y, x0 + tw + 20, y + 54], 14, fill=fill)
        d.text((x0 + 10, y + 14), text[:30], font=font(20), fill=(235, 235, 235) if dark else (20, 20, 20))
        y += 70 + rnd.randint(0, 20)
    d.rounded_rectangle([20, h - 110, w - 20, h - 50], 30, fill=(40, 40, 40) if dark else (255, 255, 255))
    return img


def code(rnd):
    import qrcode
    q = qrcode.make(f'https://example.com/{rnd.randint(0, 10**9)}').convert('RGBA').resize((360, 360), Image.NEAREST)
    sheet = Image.new('RGBA', (440, 520), (250, 250, 250, 255))
    sheet.paste(q, (40, 40))
    ImageDraw.Draw(sheet).text((220, 440), rnd.choice(['Scan me', 'WLAN', 'Ticket', 'Menü']), font=font(30, bold=True), fill=(20, 20, 20), anchor='mm')
    return paste_rotated(table(rnd), sheet, rnd)


def whiteboard(rnd):
    img = Image.new('RGB', (1024, 768), (90, 90, 95))
    d = ImageDraw.Draw(img)
    if rnd.random() < 0.5:
        d.rectangle([60, 60, 964, 700], fill=(244, 245, 243), outline=(160, 160, 160), width=8)
        for i in range(rnd.randint(4, 8)):
            colour = rnd.choice([(20, 40, 160), (170, 20, 20), (20, 120, 40), (20, 20, 20)])
            d.text((110 + rnd.randint(0, 40), 100 + i * 70), words(rnd, rnd.randint(2, 5)), font=font(36), fill=colour)
        for _ in range(3):
            x, y = rnd.randint(500, 850), rnd.randint(150, 600)
            d.ellipse([x, y, x + 120, y + 70], outline=(20, 40, 160), width=4)
    else:
        d.rectangle([0, 0, 1024, 768], fill=(25, 25, 30))
        d.rectangle([120, 80, 904, 560], fill=(250, 250, 250))
        d.text((160, 120), words(rnd, 3).title(), font=font(40, bold=True), fill=(20, 40, 90))
        for i in range(4):
            d.text((180, 220 + i * 70), '• ' + words(rnd, rnd.randint(3, 6)), font=font(28), fill=(30, 30, 30))
        for i in range(10):
            d.ellipse([60 + i * 95, 640, 120 + i * 95, 700], fill=(50, 45, 40))
    return img.filter(ImageFilter.GaussianBlur(1))


def accidental(rnd, photos):
    kind = rnd.random()
    if kind < 0.35 or not photos:
        img = Image.effect_noise((1024, 768), 20).convert('RGB')
        return Image.blend(img, Image.new('RGB', img.size, (8, 6, 5)), 0.85)
    src = Image.open(rnd.choice(photos)).convert('RGB').resize((1024, 768))
    if kind < 0.7:
        return src.filter(ImageFilter.GaussianBlur(28))
    finger = Image.new('RGB', (1024, 768), (205, 130, 110))
    mask = Image.new('L', (1024, 768), 0)
    ImageDraw.Draw(mask).ellipse([-300, 100, 700, 1200], fill=230)
    return Image.composite(finger, src, mask.filter(ImageFilter.GaussianBlur(60))).filter(ImageFilter.GaussianBlur(6))


def meme(rnd, photos):
    src = Image.open(rnd.choice(photos)).convert('RGB').resize((800, 800)) if photos else Image.new('RGB', (800, 800), (90, 120, 150))
    d = ImageDraw.Draw(src)
    f = font(64, bold=True)
    for y, text in ((40, words(rnd, 3).upper()), (700, words(rnd, 3).upper())):
        d.text((400, y), text, font=f, fill=(255, 255, 255), anchor='mt', stroke_width=5, stroke_fill=(0, 0, 0))
    return src


def screen(rnd, photos):
    bg = Image.open(rnd.choice(photos)).convert('RGB').resize((1024, 768)).filter(ImageFilter.GaussianBlur(8)) if photos else table(rnd)
    ui = Image.new('RGB', (640, 400), (250, 250, 252))
    d = ImageDraw.Draw(ui)
    d.rectangle([0, 0, 640, 40], fill=rnd.choice([(30, 90, 200), (40, 40, 40), (200, 60, 50)]))
    for i in range(8):
        d.text((20, 60 + i * 40), words(rnd, rnd.randint(3, 6)), font=font(20), fill=(30, 30, 30))
    for x in range(0, 640, 3):
        d.line([(x, 0), (x + 40, 400)], fill=(235, 235, 240))
    frame = Image.new('RGB', (680, 440), (20, 20, 22))
    frame.paste(ui, (20, 20))
    frame = frame.transform((680, 440), Image.QUAD, (rnd.randint(0, 40), 0, 0, 440, 680, 440, 680 - rnd.randint(0, 40), 0))
    bg.paste(frame, (170 + rnd.randint(-40, 40), 140 + rnd.randint(-40, 40)))
    return bg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--photos', help='a folder of ordinary photos (become "other")')
    ap.add_argument('--captions', help='JSON {file name: caption} to sort ordinary photos into kids / people / pet / landscape / food')
    ap.add_argument('--n', type=int, default=20)
    args = ap.parse_args()
    rnd = random.Random(7)
    photos = sorted(glob.glob(os.path.join(args.photos, '*.jpg'))) if args.photos else []
    makers = {
        'receipt': lambda: receipt(rnd), 'document': lambda: document(rnd), 'chat': lambda: chat(rnd),
        'code': lambda: code(rnd), 'whiteboard': lambda: whiteboard(rnd), 'accidental': lambda: accidental(rnd, photos),
        'meme': lambda: meme(rnd, photos), 'screen': lambda: screen(rnd, photos),
    }
    for label, make in makers.items():
        os.makedirs(os.path.join(OUT, label), exist_ok=True)
        for i in range(args.n):
            make().convert('RGB').save(os.path.join(OUT, label, f'{label}-{i:02d}.jpg'), quality=88)
    if photos:
        captions = json.load(open(args.captions)) if args.captions else {}
        rules = [('kids', ('child', 'boy', 'girl', 'baby', 'kid', 'toddler')), ('pet', (' dog', ' cat', 'puppy', 'dogs ')),
                 ('food', ('food', 'eating', 'cake', 'pizza', 'plate')), ('landscape', ('mountain', 'beach', 'ocean', 'lake', 'snowy hill', 'sunset')),
                 ('people', ('man ', 'woman', 'people', 'person', 'men ', 'women'))]
        for path in photos:
            caption = ' ' + captions.get(os.path.basename(path), '').lower() + ' '
            label = next((l for l, keys in rules if any(k in caption for k in keys)), 'other')
            os.makedirs(os.path.join(OUT, label), exist_ok=True)
            Image.open(path).convert('RGB').save(os.path.join(OUT, label, os.path.basename(path)), quality=88)
    print('written to', OUT)


if __name__ == '__main__':
    main()
