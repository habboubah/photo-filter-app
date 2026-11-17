"""Drawn pictures for the test library (scripts/test-photos.py): what a phone
holds besides moments, and what the free photo libraries hardly have — photos
taken to remember a piece of information (receipts, letters, whiteboards, a QR
code, a photo of a screen), memes saved from a chat, accidental shots, and
screenshots of made-up apps. Everything here is made with Pillow: no brand, no
real person, nothing to license. The on-device AI files the first kinds under
"Unwichtige Fotos" (src/logic/ai.ts); scripts/test-photos.py checks it does.
"""
import math
import random

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

INK = (25, 25, 30)
GOODS = ('Milch 1,5%', 'Vollkornbrot', 'Gouda Scheiben', 'Äpfel 1kg', 'Bananen', 'Kaffee Bohnen', 'Spaghetti', 'Tomaten passiert',
         'Butter', 'Mineralwasser 6x1,5l', 'Apfelsaft', 'Eier 10 St.', 'Basmati Reis', 'Joghurt Natur', 'Windeln Gr. 2',
         'Feuchttücher', 'Hummus', 'Fladenbrot', 'Datteln', 'Gurken', 'Paprika rot', 'Zahnpasta', 'Spülmittel', 'Linsen rot')
SHOPS = ('FRISCHMARKT HAINBURG', 'BÄCKEREI SONNENKORN', 'DROGERIE BLÜTE', 'GEMÜSE ALI & SÖHNE', 'TANKSTELLE AM MAIN', 'BAUMARKT KLEIN')
WORDS = ('die der und wir Sie Ihr Kind bitte Termin Elternabend Kita Gruppe Anmeldung Rechnung Betrag Datum Unterschrift '
         'Mitteilung Hinweis Woche Ausflug Zoo Bus Abfahrt Uhr Rückkehr Kosten Euro bis zum Freitag mitbringen Brotdose '
         'Regenjacke Name Adresse Straße Hausnummer Postleitzahl Ort Telefon Vertrag Seite Mieter Vermieter Nebenkosten').split()


def font(size):
    return ImageFont.load_default(size=size)


def table(rnd, w, h, base=None):
    base = base or rnd.choice([(150, 112, 82), (186, 160, 128), (90, 92, 98), (215, 210, 200)])
    img = Image.new('RGB', (w, h), base)
    d = ImageDraw.Draw(img)
    for _ in range(80):
        y = rnd.randrange(h)
        shade = tuple(max(0, min(255, c + rnd.randint(-16, 16))) for c in base)
        d.line([(0, y), (w, y + rnd.randint(-40, 40))], fill=shade, width=rnd.randint(3, 12))
    return img.filter(ImageFilter.GaussianBlur(3))


def photographed(sheet, rnd, w=2016, h=1512, bg=None, angle=8):
    """A sheet lying on a table, photographed with a phone: turned a little, a shadow, light falling off, noise."""
    img = bg or table(rnd, w, h)
    sheet = sheet.convert('RGBA')
    scale = min((w * 0.86) / sheet.width, (h * 0.9) / sheet.height)
    sheet = sheet.resize((int(sheet.width * scale), int(sheet.height * scale)), Image.LANCZOS)
    sheet = sheet.rotate(rnd.uniform(-angle, angle), expand=True, fillcolor=(0, 0, 0, 0), resample=Image.BICUBIC)
    x, y = (w - sheet.width) // 2 + rnd.randint(-w // 30, w // 30), (h - sheet.height) // 2 + rnd.randint(-h // 30, h // 30)
    shadow = Image.new('RGBA', sheet.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 90), (0, 0), sheet.split()[3])
    img.paste(shadow.filter(ImageFilter.GaussianBlur(18)), (x + 14, y + 18), shadow.filter(ImageFilter.GaussianBlur(18)))
    img.paste(sheet, (x, y), sheet)
    return finish(img, rnd)


def finish(img, rnd, blur=0.8):
    """Light falling off towards the corners, a touch of blur and sensor noise."""
    w, h = img.size
    mask = Image.radial_gradient('L').resize((w, h)).point(lambda v: int(v * 0.55))
    img = Image.composite(Image.new('RGB', (w, h), (0, 0, 0)), img, mask)
    img = ImageEnhance.Brightness(img).enhance(rnd.uniform(1.05, 1.25))
    noise = Image.effect_noise((w // 4, h // 4), 18).resize((w, h)).convert('RGB')
    img = Image.blend(img, noise, 0.04)
    return img.filter(ImageFilter.GaussianBlur(blur))


def receipt(rnd):
    lines = rnd.randint(9, 16)
    sheet = Image.new('RGB', (560, 260 + lines * 44 + 260), (250, 249, 244))
    d = ImageDraw.Draw(sheet)
    d.text((280, 40), rnd.choice(SHOPS), font=font(30), fill=INK, anchor='mt')
    d.text((280, 84), 'Hauptstraße %d · 63512 Hainburg' % rnd.randint(1, 90), font=font(20), fill=INK, anchor='mt')
    d.line([(30, 130), (530, 130)], fill=INK, width=2)
    y, total = 160, 0.0
    for _ in range(lines):
        price = rnd.randint(39, 1499) / 100
        total += price
        d.text((30, y), rnd.choice(GOODS), font=font(26), fill=INK)
        d.text((530, y), f'{price:.2f} €'.replace('.', ','), font=font(26), fill=INK, anchor='ra')
        y += 44
    d.line([(30, y + 10), (530, y + 10)], fill=INK, width=3)
    d.text((30, y + 30), 'SUMME', font=font(36), fill=INK)
    d.text((530, y + 30), f'{total:.2f} €'.replace('.', ','), font=font(36), fill=INK, anchor='ra')
    d.text((30, y + 100), 'Kartenzahlung   %02d.%02d.%d  %02d:%02d' % (rnd.randint(1, 28), rnd.randint(1, 12), rnd.choice([2025, 2026]),
                                                              rnd.randint(8, 20), rnd.randint(0, 59)), font=font(20), fill=INK)
    d.text((280, y + 170), 'Vielen Dank für Ihren Einkauf!', font=font(22), fill=INK, anchor='mt')
    return photographed(sheet, rnd, 1512, 2016, angle=10)


def document(rnd):
    sheet = Image.new('RGB', (1240, 1754), (252, 252, 250))
    d = ImageDraw.Draw(sheet)
    title = rnd.choice(['Elternbrief', 'Rechnung Nr. %d' % rnd.randint(1000, 9999), 'Anmeldung Kindertagesstätte',
                        'Mitteilung der Hausverwaltung', 'Einladung Elternabend', 'Mietvertrag – Seite 2', 'Bescheinigung'])
    d.text((110, 120), 'Hainburg, %02d.%02d.%d' % (rnd.randint(1, 28), rnd.randint(1, 12), rnd.choice([2025, 2026])), font=font(30), fill=INK)
    d.text((110, 260), title, font=font(56), fill=INK)
    y = 380
    for _ in range(rnd.randint(18, 26)):
        if rnd.random() < 0.15:
            y += 30
            continue
        line = ' '.join(rnd.choice(WORDS) for _ in range(rnd.randint(9, 13)))
        d.text((110, y), line.capitalize(), font=font(30), fill=(45, 45, 50))
        y += 50
        if y > 1500:
            break
    if rnd.random() < 0.5:  # a little table
        for r in range(4):
            d.rectangle([110, 1450 + r * 46, 1130, 1496 + r * 46], outline=INK, width=2)
    pts = [(160 + i * 18, 1640 + int(18 * math.sin(i * 0.9 + rnd.random()))) for i in range(16)]
    d.line(pts, fill=(20, 40, 140), width=4)  # a signature
    return photographed(sheet, rnd, 1512, 2016, angle=6)


def whiteboard(rnd):
    """A whiteboard in an office or a classroom: marker writing, boxes and arrows, sticky notes, magnets."""
    w, h = 2016, 1512
    img = Image.new('RGB', (w, h), rnd.choice([(196, 192, 184), (170, 176, 182), (210, 205, 196)]))
    d = ImageDraw.Draw(img)
    d.rectangle([40, 50, w - 40, h - 110], fill=(244, 246, 245), outline=(165, 168, 172), width=22)
    d.rectangle([40, h - 110, w - 40, h - 80], fill=(140, 142, 148))
    d.rectangle([600, h - 135, 760, h - 110], fill=(30, 60, 170))  # a marker on the tray
    colours = [(20, 50, 170), (190, 25, 25), (20, 120, 50), (20, 20, 20)]
    head = rnd.choice(['Sprint 14', 'Elternabend 24.9.', 'Wochenplan', 'Ideen App', 'Projekt Garten', 'Umzug'])
    d.text((140, 120), head, font=font(96), fill=colours[0], stroke_width=3, stroke_fill=colours[0])
    d.line([(140, 240), (900, 250)], fill=colours[0], width=8)
    y = 300
    for i in range(rnd.randint(6, 8)):
        line = '- ' + ' '.join(rnd.choice(WORDS) for _ in range(rnd.randint(2, 4)))
        d.text((160 + rnd.randint(-15, 15), y), line, font=font(64), fill=colours[i % 4], stroke_width=2, stroke_fill=colours[i % 4])
        y += 125
    for _ in range(rnd.randint(2, 3)):  # boxes, an arrow between them
        x0, y0 = rnd.randint(1150, 1450), rnd.randint(150, 900)
        d.rectangle([x0, y0, x0 + 380, y0 + 200], outline=colours[1], width=9)
        d.text((x0 + 30, y0 + 60), rnd.choice(WORDS), font=font(60), fill=colours[1], stroke_width=2, stroke_fill=colours[1])
    d.line([(1100, 700), (1300, 820)], fill=colours[3], width=9)
    for _ in range(rnd.randint(2, 4)):  # sticky notes and magnets
        x0, y0 = rnd.randint(1500, 1800), rnd.randint(150, 1150)
        d.rectangle([x0, y0, x0 + 170, y0 + 170], fill=rnd.choice([(255, 236, 110), (255, 170, 200), (160, 230, 160)]))
        d.ellipse([x0 + 70, y0 - 20, x0 + 110, y0 + 20], fill=(200, 30, 30))
    img = img.rotate(rnd.uniform(-3, 3), resample=Image.BICUBIC, fillcolor=(190, 186, 180))
    return finish(img, rnd, 1.0)


def qr_code(rnd):
    sheet = Image.new('RGB', (900, 1150), (250, 250, 250))
    d = ImageDraw.Draw(sheet)
    cell, n = 26, 29
    for y in range(n):
        for x in range(n):
            corner = (x < 7 and y < 7) or (x > n - 8 and y < 7) or (x < 7 and y > n - 8)
            if corner:
                cx = x if x < 7 else x - (n - 7)
                cy = y if y < 7 else y - (n - 7)
                on = cx in (0, 6) or cy in (0, 6) or (2 <= cx <= 4 and 2 <= cy <= 4)
            else:
                on = rnd.random() < 0.5
            if on:
                d.rectangle([73 + x * cell, 80 + y * cell, 73 + (x + 1) * cell - 1, 80 + (y + 1) * cell - 1], fill=(12, 12, 12))
    d.text((450, 930), rnd.choice(['WLAN Gäste', 'Speisekarte', 'Elternportal', 'Parkschein']), font=font(64), fill=INK, anchor='mt')
    d.text((450, 1030), 'Code scannen', font=font(36), fill=(90, 90, 95), anchor='mt')
    return photographed(sheet, rnd, 1512, 2016, angle=12)


def screen_photo(rnd):
    """A photo of a computer screen: dark room, the bezel, a spreadsheet or a timetable, moiré."""
    w, h = 2016, 1512
    img = Image.new('RGB', (w, h), (28, 26, 30))
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = 160, 140, w - 160, h - 260
    d.rectangle([x0 - 40, y0 - 40, x1 + 40, y1 + 40], fill=(12, 12, 14))
    d.rectangle([x0, y0, x1, y1], fill=(236, 240, 246))
    d.rectangle([x0, y0, x1, y0 + 70], fill=(60, 110, 200))
    if rnd.random() < 0.5:  # a spreadsheet
        for r in range(16):
            for c in range(8):
                xx, yy = x0 + 20 + c * 200, y0 + 100 + r * 54
                d.rectangle([xx, yy, xx + 200, yy + 54], outline=(180, 186, 196), width=2)
                if rnd.random() < 0.8:
                    d.text((xx + 12, yy + 12), str(rnd.randint(1, 9999)), font=font(28), fill=(30, 30, 40))
    else:  # text and a timetable
        for r in range(14):
            d.text((x0 + 40, y0 + 110 + r * 62), '%02d:%02d  ' % (7 + r, rnd.choice([0, 15, 30, 45])) +
                   ' '.join(rnd.choice(WORDS) for _ in range(6)), font=font(40), fill=(30, 30, 40))
    d.rectangle([w // 2 - 200, y1 + 40, w // 2 + 200, y1 + 120], fill=(40, 40, 44))  # the stand
    for y in range(y0, y1, 6):  # moiré
        d.line([(x0, y + int(3 * math.sin(y / 37))), (x1, y + int(3 * math.cos(y / 41)))], fill=(205, 212, 222), width=1)
    img = img.rotate(rnd.uniform(-5, 5), resample=Image.BICUBIC, fillcolor=(28, 26, 30))
    return finish(img, rnd, 1.3)


def accidental(rnd, kind):
    w, h = 1512, 2016
    if kind == 'floor':
        img = table(rnd, w, h, rnd.choice([(120, 100, 80), (160, 150, 140), (90, 80, 70)]))
        img = img.filter(ImageFilter.GaussianBlur(14))
    elif kind == 'finger':
        img = Image.new('RGB', (w, h), (140, 160, 170))
        d = ImageDraw.Draw(img)
        d.rectangle([0, h // 2, w, h], fill=(110, 120, 100))
        img = img.filter(ImageFilter.GaussianBlur(20))
        d = ImageDraw.Draw(img)
        d.ellipse([-w // 2, -h // 4, w * 0.75, h * 0.7], fill=(196, 120, 96))
        img = img.filter(ImageFilter.GaussianBlur(40))
    elif kind == 'ceiling':
        img = Image.new('RGB', (w, h), (232, 230, 226))
        d = ImageDraw.Draw(img)
        d.ellipse([w // 2 - 160, h // 3 - 160, w // 2 + 160, h // 3 + 160], fill=(255, 252, 240))
        d.line([(0, h * 0.8), (w, h * 0.75)], fill=(200, 196, 190), width=30)
        img = img.filter(ImageFilter.BoxBlur(30))
    else:  # shaken: a room, smeared sideways
        img = Image.new('RGB', (w, h), (180, 170, 160))
        d = ImageDraw.Draw(img)
        for _ in range(30):
            x, y = rnd.randrange(w), rnd.randrange(h)
            d.rectangle([x, y, x + rnd.randint(80, 400), y + rnd.randint(80, 400)], fill=tuple(rnd.randint(40, 230) for _ in range(3)))
        img = img.filter(ImageFilter.BoxBlur(45)).filter(ImageFilter.GaussianBlur(12))
    return finish(img, rnd, 2)


MEME_LINES = [('WENN DER KAFFEE', 'NOCH NICHT WIRKT'), ('MONTAGMORGEN', 'SCHON WIEDER?'), ('ICH NACH DEM', 'ELTERNABEND'),
              ('NUR NOCH 5 MINUTEN', 'SAGTEN SIE'), ('WOCHENENDE', 'ENDLICH!'), ('KEINER:', 'ICH UM 3 UHR: SNACK')]


def meme(photo, rnd, n):
    """A picture with a caption at the top and the bottom, as a chat passes it around: square, small, no EXIF."""
    img = ImageOps.fit(photo, (1080, 1080), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    top, bottom = MEME_LINES[n % len(MEME_LINES)]
    f = font(92)
    for text, y in ((top, 40), (bottom, 1080 - 140)):
        d.text((540, y), text, font=f, fill=(255, 255, 255), anchor='mt', stroke_width=7, stroke_fill=(0, 0, 0))
    return img


def status_bar(d, W, ink, rnd):
    d.text((70, 50), f'{rnd.randint(7, 22)}:{rnd.randint(0, 59):02d}', fill=ink, font=font(48))
    d.rounded_rectangle((W - 190, 62, W - 80, 104), 12, outline=ink, width=4)


def chat_shot(rnd):
    W, H = 1179, 2556
    img = Image.new('RGB', (W, H), (236, 229, 221))
    d = ImageDraw.Draw(img)
    status_bar(d, W, INK, rnd)
    d.rectangle((0, 140, W, 330), fill=(247, 247, 247))
    d.ellipse((60, 175, 180, 295), fill=tuple(rnd.randint(90, 200) for _ in range(3)))
    d.text((210, 200), rnd.choice(['Familie', 'Kita Gruppe Sonne', 'Mama', 'Fußball U9', 'Nachbarn']), fill=INK, font=font(56))
    lines = ['Wann seid ihr da?', 'So gegen 15 Uhr', 'Bringt ihr Kuchen mit?', 'Ja, Erdbeerkuchen!', 'Super 😊',
             'Morgen ist Laternenfest', 'Nicht vergessen: Brotdose', 'Wer holt die Kinder ab?', 'Ich, bin um 16 Uhr da',
             'Danke dir!', 'Fotos kommen gleich', 'Der Ausflug war toll', 'Treffen 9 Uhr am Bahnhof', 'Okay 👍']
    y = 400
    for n in range(rnd.randint(7, 11)):
        text = rnd.choice(lines)
        mine = rnd.random() < 0.5
        tw = 60 + len(text) * 27
        x0 = W - 60 - tw if mine else 60
        d.rounded_rectangle((x0, y, x0 + tw, y + 120), 36, fill=(217, 253, 211) if mine else (255, 255, 255))
        d.text((x0 + 34, y + 34), text, fill=INK, font=font(46))
        y += 170
    d.rounded_rectangle((40, H - 200, W - 40, H - 80), 60, fill=(255, 255, 255))
    return img


def code_shot(rnd):
    W, H = 1179, 2556
    img = Image.new('RGB', (W, H), (30, 32, 40))
    d = ImageDraw.Draw(img)
    status_bar(d, W, (230, 230, 230), rnd)
    toks = ['const', 'let', 'function', 'return', 'if', 'await', 'export', 'import', 'from', 'photos', 'trip', 'filter',
            'map', '=>', '(', ')', '{', '}', '[]', 'true', 'false', 'null', '.length', 'id', 'date']
    colours = [(198, 120, 221), (97, 175, 239), (152, 195, 121), (229, 192, 123), (224, 108, 117), (200, 200, 205)]
    for r in range(40):
        y = 180 + r * 56
        d.text((20, y), f'{r + 1:3d}', fill=(100, 104, 116), font=font(32))
        x = 120 + 30 * rnd.randint(0, 3)
        for _ in range(rnd.randint(2, 7)):
            t = rnd.choice(toks)
            d.text((x, y), t, fill=rnd.choice(colours), font=font(32))
            x += 20 + len(t) * 19
            if x > W - 100:
                break
    return img


def feed_shot(rnd):
    W, H = 1179, 2556
    img = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    status_bar(d, W, INK, rnd)
    y = 170
    while y < H - 300:
        d.ellipse((40, y, 130, y + 90), fill=tuple(rnd.randint(80, 220) for _ in range(3)))
        d.rectangle((160, y + 20, 160 + rnd.randint(200, 420), y + 50), fill=(60, 60, 66))
        top = tuple(rnd.randint(60, 230) for _ in range(3))
        bottom = tuple(rnd.randint(30, 200) for _ in range(3))
        for yy in range(y + 120, y + 900):
            t = (yy - y - 120) / 780
            d.line([(0, yy), (W, yy)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
        d.rectangle((40, y + 930, 40 + rnd.randint(400, 900), y + 960), fill=(80, 80, 86))
        y += 1060
    return img


def calendar_shot(rnd):
    W, H = 1179, 2556
    img = Image.new('RGB', (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    status_bar(d, W, INK, rnd)
    d.text((70, 180), rnd.choice(['März', 'Juni', 'September', 'Dezember']), fill=(220, 50, 50), font=font(90))
    for i, wd in enumerate('MDMDFSS'):
        d.text((90 + i * 150, 340), wd, fill=(120, 120, 120), font=font(40))
    for n in range(35):
        x, y = 70 + (n % 7) * 150, 440 + (n // 7) * 200
        d.text((x + 30, y), str(n % 31 + 1), fill=INK, font=font(48))
        if rnd.random() < 0.3:
            d.rounded_rectangle((x + 5, y + 80, x + 140, y + 120), 10, fill=rnd.choice([(255, 180, 60), (90, 160, 250), (120, 200, 120)]))
    return img


def shaken(photo, angle, blur):
    """A shot taken by accident while the phone was moving: a real room, tilted and smeared."""
    img = ImageOps.fit(photo, (1512, 2016), Image.LANCZOS).rotate(angle, resample=Image.BICUBIC)
    return img.filter(ImageFilter.BoxBlur(blur))
