#!/usr/bin/env python3
"""Builds the test library: about 200 real photos and videos, as a phone would
hold them, for a full test of Bildklar on a simulator, an emulator or a test
phone (never your own library). Writes test-photos/ (gitignored).

Every picture and clip is CC0 1.0 — public domain, free for the store
screenshots and the preview video too, no credit needed — listed with its
source in scripts/test-photos.json (store=false: identifiable people or the
Eiffel Tower lit at night; fine for tests, keep them out of store assets).

The script gives each one a new name and a new life: two years of a family
near Hanau (Hainburg) from November 2024 to November 2026 — Christmas,
birthdays, Eid, snow, the playground, the twins' first weeks — and trips to
Vienna, Paris, a wedding at the Baltic Sea, Amsterdam, the Rhine and Lake
Garda. The date and the place go into the EXIF (the file's time follows),
for videos into the QuickTime metadata. On top come what a real library
has: bursts of near-identical shots seconds apart, blurry ones, photos saved
again from WhatsApp (smaller, without EXIF), one exact duplicate, screenshots,
a shot in the pocket and one into the sun, and a lookalike video.

Needs Pillow and ffmpeg. Downloads into .cache/test-photos/ once (resumable:
run it again if a server asked to slow down). Run: npm run test-photos
Then: npm run test-photos:sim (the booted iOS simulator) or :android (adb).
"""
import csv
import json
import os
import random
import shutil
import subprocess
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SOURCES = json.load(open(os.path.join(ROOT, 'scripts', 'test-photos.json'), encoding='utf-8'))
CACHE = os.path.join(ROOT, '.cache', 'test-photos')
SRC = os.path.join(CACHE, 'src')
VID = os.path.join(CACHE, 'video')
OUT = os.path.join(ROOT, 'test-photos')
TZ = ZoneInfo('Europe/Berlin')
UA = 'BildklarTestPhotos/1.0 (local test-photo script)'

# Places: (lat, lon, jitter in degrees).
PLACES = {
    'home': (50.0815, 8.9325, 0.006), 'hanau': (50.1264, 8.9283, 0.004), 'frankfurt': (50.1109, 8.6821, 0.01),
    'uni': (50.1279, 8.6669, 0.002), 'festhalle': (50.1118, 8.6505, 0.001), 'spessart': (50.0520, 9.2480, 0.02),
    'vienna': (48.2050, 16.3700, 0.012), 'paris': (48.8600, 2.3400, 0.015), 'eiffel': (48.8570, 2.2960, 0.003),
    'liege': (50.6240, 5.5670, 0.01), 'baltic': (53.9940, 10.7820, 0.004), 'amsterdam': (52.3700, 4.8900, 0.012),
    'rhine': (50.0700, 7.7670, 0.012), 'malcesine': (45.7632, 10.8090, 0.006), 'sirmione': (45.4925, 10.6065, 0.003),
    'limone': (45.8130, 10.7920, 0.005), 'riva': (45.8850, 10.8420, 0.005), 'brenner': (47.0020, 11.5070, 0.01),
}

D = datetime  # local time, Europe/Berlin


def ev(keys, start, end, place, gps=0.9):
    """An event: its photos spread between start and end, in this order."""
    return {'keys': keys.split(), 'start': start, 'end': end, 'place': place, 'gps': gps}


# The two years, oldest first. Keys are scripts/test-photos.json's (photos)
# and v:<key> (videos). Trips have nothing at home in between.
EVENTS = [
    ev('ho110', D(2024, 11, 17, 15, 20), D(2024, 11, 17, 15, 40), 'home'),
    ev('pe3', D(2024, 11, 30, 10, 5), D(2024, 11, 30, 10, 6), 'home'),
    # Vienna, Christmas markets
    ev('xvi58', D(2024, 12, 12, 8, 40), D(2024, 12, 12, 8, 41), None, gps=0),
    ev('vi8 xvi23 vi24 v:tram xdo62 vi7 xvi56 xvi0', D(2024, 12, 12, 11, 30), D(2024, 12, 12, 21, 40), 'vienna'),
    ev('vi14 vi18 vi20 vi35 xvi33 v:danube', D(2024, 12, 13, 10, 0), D(2024, 12, 13, 17, 30), 'vienna'),
    ev('xvi1 xvi3 xvi5 xvi6', D(2024, 12, 14, 10, 30), D(2024, 12, 14, 12, 0), 'vienna'),
    ev('ho27 ho28', D(2024, 12, 24, 17, 0), D(2024, 12, 24, 19, 30), 'home'),
    ev('ho95 ho104 ho105', D(2025, 1, 10, 9, 15), D(2025, 1, 10, 9, 40), 'home'),
    ev('pe0', D(2025, 1, 25, 20, 10), D(2025, 1, 25, 20, 11), 'home'),
    ev('xpe84 xpe87', D(2025, 2, 2, 16, 0), D(2025, 2, 2, 16, 4), None, gps=0),  # old prints, scanned
    ev('do1', D(2025, 2, 14, 21, 50), D(2025, 2, 14, 21, 51), 'frankfurt'),
    # a birthday
    ev('xpe97 ho9 ho19 ho20 v:cakecut xpe100', D(2025, 3, 8, 15, 0), D(2025, 3, 8, 17, 30), 'home'),
    # Eid al-Fitr
    ev('xpe20 xpe33', D(2025, 3, 30, 8, 0), D(2025, 3, 30, 9, 0), 'hanau'),
    ev('xpe45 xpe37 xpe36', D(2025, 3, 30, 13, 0), D(2025, 3, 30, 15, 0), 'home'),
    ev('ho49 ho50 xho60', D(2025, 4, 12, 11, 0), D(2025, 4, 12, 11, 30), 'home'),
    ev('ho78 ho79 ho84', D(2025, 4, 26, 15, 0), D(2025, 4, 26, 16, 0), 'home'),
    # Paris
    ev('v:eurostar', D(2025, 5, 22, 9, 40), D(2025, 5, 22, 9, 41), 'liege'),
    ev('pa2 pa3 pa11 pa56', D(2025, 5, 22, 14, 0), D(2025, 5, 22, 21, 30), 'paris'),
    ev('pa23 pa21 pa41 pa42 pa43 pa19 v:eiffel pa27 pa30', D(2025, 5, 23, 10, 0), D(2025, 5, 23, 22, 30), 'eiffel'),
    ev('pa35 pa24 pa38 pa39 pa47 pa36', D(2025, 5, 24, 10, 0), D(2025, 5, 24, 21, 0), 'paris'),
    ev('xpe110', D(2025, 5, 25, 11, 0), D(2025, 5, 25, 11, 1), 'paris'),
    # a wedding at the Baltic Sea
    ev('xpe130 xpe131 xpe60 xpe102 xpe106', D(2025, 6, 21, 14, 0), D(2025, 6, 21, 22, 0), 'baltic'),
    ev('xpe78 xpe80', D(2025, 7, 4, 11, 0), D(2025, 7, 4, 12, 0), 'uni'),
    ev('ho66', D(2025, 7, 20, 9, 30), D(2025, 7, 20, 9, 31), 'home'),
    ev('ho103', D(2025, 7, 19, 18, 30), D(2025, 7, 19, 18, 31), 'home'),
    ev('na17', D(2025, 7, 27, 14, 0), D(2025, 7, 27, 14, 1), 'spessart'),
    # Amsterdam
    ev('am19 am23 am4 am5 am38 am45', D(2025, 8, 14, 13, 0), D(2025, 8, 14, 20, 0), 'amsterdam'),
    ev('am9 am11 am15 v:canal am18 am20 am21', D(2025, 8, 15, 10, 0), D(2025, 8, 15, 18, 0), 'amsterdam'),
    ev('am30 am32 am33 am34 am7 am52', D(2025, 8, 16, 10, 0), D(2025, 8, 16, 21, 30), 'amsterdam'),
    ev('xho9 xho56', D(2025, 9, 6, 16, 0), D(2025, 9, 6, 16, 30), 'home'),
    ev('xpe15 v:rave xpe61', D(2025, 9, 13, 20, 30), D(2025, 9, 13, 22, 30), 'festhalle'),
    ev('v:hedgehog', D(2025, 9, 28, 19, 40), D(2025, 9, 28, 19, 41), 'home'),
    ev('na21 na28', D(2025, 10, 4, 12, 0), D(2025, 10, 4, 15, 0), 'rhine'),
    ev('na1 na8', D(2025, 10, 19, 14, 0), D(2025, 10, 19, 15, 0), 'spessart'),
    ev('xho33 xho38', D(2025, 10, 25, 11, 0), D(2025, 10, 25, 11, 30), 'home'),
    ev('pe4', D(2025, 11, 2, 13, 0), D(2025, 11, 2, 13, 1), 'home'),
    ev('xho45 v:rain', D(2025, 11, 17, 16, 10), D(2025, 11, 17, 16, 12), 'home'),
    ev('xdo9', D(2025, 12, 6, 10, 0), D(2025, 12, 6, 10, 1), None, gps=0),
    ev('xdo14', D(2025, 12, 13, 19, 0), D(2025, 12, 13, 19, 1), 'frankfurt'),
    ev('v:lights ho33 ho35', D(2025, 12, 23, 18, 0), D(2025, 12, 24, 19, 0), 'home'),
    ev('v:fireworks', D(2025, 12, 31, 23, 58), D(2025, 12, 31, 23, 59), 'home'),
    ev('na0 v:snow', D(2026, 1, 15, 10, 0), D(2026, 1, 15, 10, 20), 'home'),
    ev('xdo74', D(2026, 2, 10, 11, 0), D(2026, 2, 10, 11, 1), 'frankfurt'),
    ev('xpe116', D(2026, 2, 14, 12, 0), D(2026, 2, 14, 12, 1), 'frankfurt'),
    ev('pe10', D(2026, 2, 20, 21, 0), D(2026, 2, 20, 21, 1), 'home'),
    # the next birthday
    ev('ho12 ho16 xho57 v:treecake xho63', D(2026, 3, 8, 15, 0), D(2026, 3, 8, 17, 0), 'home'),
    ev('xpe107 xpe108', D(2026, 3, 20, 22, 10), D(2026, 3, 20, 22, 11), 'home'),  # Eid evening, too dark
    ev('xpe121', D(2026, 3, 28, 9, 0), D(2026, 3, 28, 9, 1), 'frankfurt'),
    ev('xdo8', D(2026, 4, 3, 18, 0), D(2026, 4, 3, 18, 1), 'hanau'),
    ev('v:fair', D(2026, 4, 25, 17, 0), D(2026, 4, 25, 17, 1), 'frankfurt'),
    ev('xdo19 xdo20', D(2026, 5, 12, 9, 0), D(2026, 5, 12, 9, 1), 'home'),
    # Lake Garda
    ev('v:sailing', D(2026, 6, 5, 9, 30), D(2026, 6, 5, 9, 31), 'brenner'),
    ev('ga2 ga0 ga3 xdo33 ga5', D(2026, 6, 5, 15, 0), D(2026, 6, 5, 21, 0), 'malcesine'),
    ev('ga7 ga8 ga9 v:lakes ga21', D(2026, 6, 6, 10, 0), D(2026, 6, 6, 17, 0), 'limone'),
    ev('ga10 ga11 ga12 ga15 v:channel', D(2026, 6, 7, 10, 0), D(2026, 6, 7, 20, 30), 'sirmione'),
    ev('ga4 ga17 ga19 ga24', D(2026, 6, 8, 9, 0), D(2026, 6, 8, 18, 0), 'riva'),
    ev('xho58 pe16 pe23 pe24 pe26', D(2026, 6, 20, 11, 0), D(2026, 6, 20, 17, 0), 'home'),
    ev('xho54', D(2026, 7, 2, 19, 0), D(2026, 7, 2, 19, 1), 'home'),
    ev('v:kittens', D(2026, 8, 15, 17, 0), D(2026, 8, 15, 17, 1), 'home'),
    # the twins
    ev('ho0 ho1', D(2026, 8, 25, 10, 0), D(2026, 8, 25, 10, 30), 'hanau'),
    ev('xho79 ho4', D(2026, 9, 10, 15, 0), D(2026, 9, 10, 15, 40), 'home'),
    ev('xho80', D(2026, 9, 21, 12, 0), D(2026, 9, 21, 12, 1), 'home'),
    ev('xho27 xho29 xho26', D(2026, 10, 4, 16, 0), D(2026, 10, 4, 16, 5), 'home'),
    ev('na33 na34', D(2026, 10, 11, 17, 0), D(2026, 10, 11, 17, 30), 'spessart'),
    ev('ho7 v:spied', D(2026, 10, 24, 9, 0), D(2026, 10, 24, 9, 30), 'home'),
    ev('ho67', D(2026, 11, 1, 10, 0), D(2026, 11, 1, 10, 1), 'home'),
    ev('do0', D(2026, 11, 7, 13, 0), D(2026, 11, 7, 13, 1), None, gps=0),
    ev('ho8', D(2026, 11, 15, 8, 30), D(2026, 11, 15, 8, 31), 'home'),
]
# Bursts: n more frames, 2–3 s apart, a little moved; the first one blurry where marked.
BURSTS = {'pa23': (3, True), 'ga2': (2, True), 'ho16': (2, False), 'xpe37': (3, True),
          'pe4': (2, False), 'am7': (2, False), 'xpe131': (2, False)}
# Saved again from WhatsApp, hours later: smaller, recompressed, no EXIF.
COPIES = {'xpe100': 20, 'ho19': 3, 'am45': 30, 'xpe106': 14}
DUPLICATE = 'pa21'  # an exact second file
SCREENSHOTS = [D(2025, 1, 3, 20, 14), D(2025, 6, 2, 8, 2), D(2025, 9, 30, 13, 37), D(2026, 1, 22, 22, 5),
               D(2026, 5, 30, 7, 48), D(2026, 11, 12, 18, 21)]
ACCIDENTS = [('dark', D(2025, 6, 1, 14, 3)), ('bright', D(2026, 4, 25, 13, 12))]
VIDEO_COPY = ('kittens', 26)  # the kittens video again, from WhatsApp a day later
MAX_SECONDS = {'sailing': 45}  # one long video; the rest are cut to 30 s


def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return True
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as r, open(path + '.part', 'wb') as f:
                shutil.copyfileobj(r, f)
            os.replace(path + '.part', path)
            return True
        except Exception as e:  # 429: the server wants us slower
            print(f'  {os.path.basename(path)}: {e}; waiting', file=sys.stderr)
            time.sleep(20 * (attempt + 1))
    return False


def download():
    os.makedirs(SRC, exist_ok=True)
    missing = []
    for key, s in SOURCES['photos'].items():
        if not fetch(s['url'], os.path.join(SRC, key)):
            missing.append(key)
        time.sleep(0.2)
    for key, s in SOURCES['videos'].items():
        if not fetch(s['url'], os.path.join(SRC, 'v-' + key)):
            missing.append('v:' + key)
        time.sleep(2)
    return missing


def offset(local):
    o = local.replace(tzinfo=TZ).utcoffset()
    m = int(o.total_seconds() // 60)
    return f'{"+" if m >= 0 else "-"}{abs(m) // 60:02d}:{abs(m) % 60:02d}'


def dms(v):
    v = abs(v)
    d = int(v)
    m = int((v - d) * 60)
    s = round(((v - d) * 60 - m) * 60, 2)
    return (d, m, s)


def exif_for(when, gps):
    exif = Image.Exif()
    stamp = when.strftime('%Y:%m:%d %H:%M:%S')
    exif[0x0132] = stamp  # DateTime
    sub = exif.get_ifd(0x8769)
    sub[0x9003] = stamp  # DateTimeOriginal
    sub[0x9004] = stamp  # DateTimeDigitized
    sub[0x9010] = sub[0x9011] = sub[0x9012] = offset(when)  # OffsetTime*
    if gps:
        lat, lon = gps
        g = exif.get_ifd(0x8825)
        utc = when.replace(tzinfo=TZ).astimezone(timezone.utc)
        g.update({0: b'\x02\x02\x00\x00', 1: 'N' if lat >= 0 else 'S', 2: dms(lat), 3: 'E' if lon >= 0 else 'W',
                  4: dms(lon), 7: (utc.hour, utc.minute, utc.second), 29: utc.strftime('%Y:%m:%d')})
    return exif.tobytes()


def stamp_file(path, when):
    t = when.replace(tzinfo=TZ).timestamp()
    os.utime(path, (t, t))


def open_rgb(key):
    img = Image.open(os.path.join(SRC, key))
    img.load()
    return ImageOps.exif_transpose(img).convert('RGB')


def frame(img, rnd, k):
    """Another frame of a burst: moved a few pixels, a touch brighter or darker."""
    w, h = img.size
    dx, dy = rnd.randint(-w // 60, w // 60), rnd.randint(-h // 60, h // 60)
    crop = img.crop((w // 30 + dx, h // 30 + dy, w - w // 30 + dx, h - h // 30 + dy)).resize((w, h), Image.LANCZOS)
    return ImageEnhance.Brightness(crop).enhance(rnd.uniform(0.94, 1.06))


def font(size):
    return ImageFont.load_default(size=size)


def screenshot(rnd, i):
    """A phone screenshot of a made-up app: a chat, a list, a ticket, weather, notes, a map."""
    W, H = 1179, 2556
    kind = ['chat', 'list', 'ticket', 'weather', 'notes', 'map'][i % 6]
    bg = {'chat': (236, 229, 221), 'list': (242, 242, 247), 'ticket': (245, 247, 250), 'weather': (70, 130, 200),
          'notes': (255, 251, 235), 'map': (232, 236, 228)}[kind]
    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)
    ink = (255, 255, 255) if kind == 'weather' else (20, 20, 25)
    d.text((70, 50), f'{rnd.randint(7, 22)}:{rnd.randint(0, 59):02d}', fill=ink, font=font(48))
    d.rounded_rectangle((W - 190, 62, W - 80, 104), 12, outline=ink, width=4)
    if kind == 'chat':
        d.rectangle((0, 140, W, 330), fill=(247, 247, 247))
        d.ellipse((60, 175, 180, 295), fill=(120, 170, 140))
        d.text((210, 200), 'Familie', fill=ink, font=font(56))
        y = 400
        lines = ['Wann seid ihr da?', 'So gegen 15 Uhr', 'Bringt ihr Kuchen mit?', 'Ja, Erdbeerkuchen!', 'Super, bis gleich',
                 'Parkplatz ist hinten am Haus', 'Okay 👍', 'Sind gleich da']
        for n, text in enumerate(lines):
            mine = n % 2 == 1
            tw = 60 + len(text) * 27
            x0 = W - 60 - tw if mine else 60
            d.rounded_rectangle((x0, y, x0 + tw, y + 120), 36, fill=(217, 253, 211) if mine else (255, 255, 255))
            d.text((x0 + 34, y + 34), text, fill=ink, font=font(46))
            y += 170
    elif kind == 'list':
        d.text((70, 180), 'Einkauf', fill=ink, font=font(96))
        for n, text in enumerate(['Milch', 'Brot', 'Windeln Gr. 1', 'Äpfel', 'Kaffee', 'Feuchttücher', 'Joghurt', 'Reis', 'Tomaten']):
            y = 360 + n * 150
            d.rounded_rectangle((60, y, W - 60, y + 130), 24, fill=(255, 255, 255))
            d.ellipse((100, y + 35, 160, y + 95), outline=(0, 122, 255), width=5, fill=(0, 122, 255) if n < 3 else None)
            d.text((200, y + 38), text, fill=ink, font=font(52))
    elif kind == 'ticket':
        d.rounded_rectangle((80, 260, W - 80, 2100), 48, fill=(255, 255, 255))
        d.text((150, 330), 'Bahnticket', fill=ink, font=font(80))
        d.text((150, 470), 'Hanau Hbf  →  Frankfurt (Main) Hbf', fill=ink, font=font(48))
        d.text((150, 560), 'Gültig: 30.09.2025 · 2. Klasse', fill=(90, 90, 100), font=font(44))
        for x in range(0, 25):
            for y in range(0, 25):
                if rnd.random() < 0.5 or (x < 7 and y < 7) or (x > 17 and y < 7) or (x < 7 and y > 17):
                    d.rectangle((240 + x * 28, 800 + y * 28, 268 + x * 28, 828 + y * 28), fill=(0, 0, 0))
    elif kind == 'weather':
        d.text((W // 2 - 140, 320), 'Hainburg', fill=ink, font=font(72))
        d.text((W // 2 - 150, 430), f'{rnd.randint(-3, 28)}°', fill=ink, font=font(260))
        for n in range(10):
            y = 1000 + n * 120
            d.text((120, y), ['Heute', 'Mi', 'Do', 'Fr', 'Sa', 'So', 'Mo', 'Di', 'Mi', 'Do'][n], fill=ink, font=font(52))
            d.rounded_rectangle((420, y + 20, 980, y + 44), 12, fill=(255, 255, 255, 80), outline=ink)
    elif kind == 'notes':
        d.text((70, 180), 'Notizen', fill=ink, font=font(96))
        for n, text in enumerate(['Kinderarzt Di 9:30', 'U3 Untersuchung mitbringen:', '– gelbes Heft', '– Versichertenkarte',
                                  'Kita-Anmeldung anrufen', 'Geschenk für Oma', 'Reifen wechseln']):
            d.text((90, 380 + n * 110), text, fill=ink, font=font(54))
    else:
        for _ in range(40):
            x, y = rnd.randint(0, W), rnd.randint(140, H)
            d.line((x, y, x + rnd.randint(-600, 600), y + rnd.randint(-600, 600)), fill=(255, 255, 255), width=rnd.choice([14, 24, 40]))
        d.ellipse((W // 2 - 40, H // 2 - 40, W // 2 + 40, H // 2 + 40), fill=(0, 122, 255), outline=(255, 255, 255), width=10)
        d.rounded_rectangle((40, H - 520, W - 40, H - 60), 48, fill=(255, 255, 255))
        d.text((100, H - 460), 'Spielplatz am Main', fill=ink, font=font(60))
        d.text((100, H - 370), '12 Min. zu Fuß', fill=(90, 90, 100), font=font(46))
    return img


def accident(kind, rnd):
    img = Image.new('RGB', (3024, 4032), (6, 5, 8) if kind == 'dark' else (250, 251, 249))
    d = ImageDraw.Draw(img)
    for _ in range(40000):
        x, y = rnd.randrange(3024), rnd.randrange(4032)
        v = rnd.randint(0, 16) if kind == 'dark' else rnd.randint(232, 255)
        d.point((x, y), (v, v, v))
    if kind == 'bright':
        d.rectangle((0, 3700, 3024, 4032), fill=(236, 236, 233))
    return img.filter(ImageFilter.GaussianBlur(3))


def ffmpeg_video(src, dst, when, gps, seconds, small=False):
    iso = when.replace(tzinfo=TZ).isoformat()
    utc = when.replace(tzinfo=TZ).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000000Z')
    width = 848 if small else 1920
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', src, '-t', str(seconds), '-map', '0:v:0', '-map', '0:a:0?',
           '-vf', f"scale=w='min({width},iw)':h=-2", '-c:v', 'libx264', '-preset', 'veryfast',
           '-crf', '30' if small else '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k' if small else '128k',
           '-metadata', f'creation_time={utc}']
    if not small:
        cmd += ['-movflags', '+faststart+use_metadata_tags', '-metadata', f'com.apple.quicktime.creationdate={iso}']
        if gps:
            loc = f'{gps[0]:+08.4f}{gps[1]:+09.4f}+000.000/'
            cmd += ['-metadata', f'com.apple.quicktime.location.ISO6709={loc}', '-metadata', f'location={loc}']
    else:
        cmd += ['-movflags', '+faststart']
    subprocess.run(cmd + [dst + '.part.' + dst.rsplit('.', 1)[1]], check=True)
    os.replace(dst + '.part.' + dst.rsplit('.', 1)[1], dst)


def plan(rnd):
    """Every item with its time and place, in time order."""
    items = []
    for e in EVENTS:
        n = len(e['keys'])
        span = (e['end'] - e['start']).total_seconds()
        for i, key in enumerate(e['keys']):
            t = e['start'] + timedelta(seconds=span * (i + rnd.uniform(0.05, 0.6)) / max(n, 1))
            t = t.replace(microsecond=0)
            gps = None
            if e['place'] and rnd.random() < e['gps']:
                lat, lon, j = PLACES[e['place']]
                gps = (round(lat + rnd.uniform(-j, j), 6), round(lon + rnd.uniform(-j, j), 6))
            if key.startswith('v:'):
                items.append({'kind': 'video', 'key': key[2:], 'when': t, 'gps': gps})
                continue
            items.append({'kind': 'photo', 'key': key, 'when': t, 'gps': gps})
            if key in BURSTS:
                extra, blurry = BURSTS[key]
                for k in range(extra):
                    items.append({'kind': 'burst', 'key': key, 'when': t + timedelta(seconds=2 * (k + 1) + rnd.randint(0, 1)),
                                  'gps': gps, 'frame': k, 'blur': blurry and k == 0})
            if key in COPIES:
                items.append({'kind': 'copy', 'key': key, 'when': t + timedelta(hours=COPIES[key], minutes=rnd.randint(0, 50)), 'gps': None})
            if key == DUPLICATE:
                items.append({'kind': 'duplicate', 'key': key, 'when': t, 'gps': gps})
    vk, hours = VIDEO_COPY
    first = next(x for x in items if x['kind'] == 'video' and x['key'] == vk)
    items.append({'kind': 'video-copy', 'key': vk, 'when': first['when'] + timedelta(hours=hours), 'gps': None})
    for i, t in enumerate(SCREENSHOTS):
        items.append({'kind': 'screenshot', 'key': f'screenshot-{i}', 'when': t, 'gps': None, 'n': i})
    for kind, t in ACCIDENTS:
        items.append({'kind': 'accident', 'key': f'accident-{kind}', 'when': t, 'gps': PLACES['home'][:2], 'what': kind})
    return sorted(items, key=lambda x: x['when'])  # stable: a burst stays behind its first shot


def build():
    rnd = random.Random(2026)
    items = plan(rnd)
    used = [x['key'] for x in items if x['kind'] == 'photo']
    assert sorted(used) == sorted(SOURCES['photos']), set(SOURCES['photos']) ^ set(used)
    assert len(used) == len(set(used))
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(VID, exist_ok=True)
    for f in os.listdir(OUT):
        if not f.startswith('.'):
            os.remove(os.path.join(OUT, f))
    rows = []
    number = 1000
    wa = 0
    last = {}
    for x in items:
        when, gps, key = x['when'], x['gps'], x['key']
        src = SOURCES['videos' if x['kind'].startswith('video') else 'photos'].get(key, {})
        if x['kind'] in ('photo', 'burst', 'accident'):
            number += 1
            name = f'IMG_{number:04d}.JPG'
            if x['kind'] == 'accident':
                img = accident(x['what'], random.Random(number))
            else:
                img = open_rgb(key)
                if x['kind'] == 'burst':
                    img = frame(img, random.Random(f'{key}{x["frame"]}'), x['frame'])
                    if x['blur']:
                        img = img.filter(ImageFilter.GaussianBlur(max(img.size) / 140))
            img.save(os.path.join(OUT, name), 'JPEG', quality=90, exif=exif_for(when, gps))
            last[key] = name
        elif x['kind'] == 'duplicate':
            name = last[key].replace('.JPG', ' (1).JPG')
            shutil.copyfile(os.path.join(OUT, last[key]), os.path.join(OUT, name))
        elif x['kind'] == 'copy':
            wa += 1
            name = f'IMG-{when:%Y%m%d}-WA{wa:04d}.jpg'
            img = open_rgb(key)
            img.thumbnail((1600, 1600), Image.LANCZOS)
            img.save(os.path.join(OUT, name), 'JPEG', quality=60)
        elif x['kind'] == 'screenshot':
            name = f'Screenshot_{when:%Y%m%d-%H%M%S}.png'
            screenshot(random.Random(x['n']), x['n']).save(os.path.join(OUT, name), 'PNG', optimize=True)
        elif x['kind'] == 'video':
            number += 1
            name = f'IMG_{number:04d}.MOV'
            cached = os.path.join(VID, f'{key}-{when:%Y%m%d%H%M%S}.mov')
            raw = os.path.join(SRC, 'v-' + key)
            if not os.path.exists(cached):
                if not os.path.exists(raw):
                    print(f'  video {key} not downloaded yet — skipped (run again)', file=sys.stderr)
                    continue
                print(f'  converting {key}', file=sys.stderr)
                ffmpeg_video(raw, cached, when, gps, MAX_SECONDS.get(key, 30))
            shutil.copyfile(cached, os.path.join(OUT, name))
        else:  # video-copy
            wa += 1
            name = f'VID-{when:%Y%m%d}-WA{wa:04d}.mp4'
            cached = os.path.join(VID, f'{key}-copy.mp4')
            raw = os.path.join(SRC, 'v-' + key)
            if not os.path.exists(cached):
                if not os.path.exists(raw):
                    continue
                ffmpeg_video(raw, cached, when, None, MAX_SECONDS.get(key, 30), small=True)
            shutil.copyfile(cached, os.path.join(OUT, name))
        stamp_file(os.path.join(OUT, name), when)
        rows.append({'file': name, 'date': when.replace(tzinfo=TZ).isoformat(), 'lat': gps[0] if gps else '', 'lon': gps[1] if gps else '',
                     'kind': x['kind'], 'source': key, 'title': src.get('title', 'made by scripts/test-photos.py'),
                     'creator': src.get('creator', ''), 'licence': src.get('licence', 'CC0 1.0'), 'page': src.get('page', ''),
                     'store': 'yes' if src.get('store', True) else 'no'})
    with open(os.path.join(OUT, 'credits.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    kinds = {}
    for r in rows:
        kinds[r['kind']] = kinds.get(r['kind'], 0) + 1
    print(f'{len(rows)} files → test-photos/  {kinds}')


if __name__ == '__main__':
    if '--offline' not in sys.argv:
        missing = download()
        if missing:
            print(f'not downloaded yet: {" ".join(missing)} — run again later', file=sys.stderr)
    build()
