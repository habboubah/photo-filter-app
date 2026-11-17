#!/usr/bin/env python3
"""Puts the whole test library into the web demo: `npm run dev` then shows
about 560 real photos and videos instead of the 101 of the curated demo.

Reads test-photos/ (npm run test-photos) and writes
src/native/demo/test-library/ (not in git): a 1024-px copy of every photo
(a video: its poster frame, and a small H.264 copy in videos/ the browser can
play behind the play button) and manifest.json — when, where, what kind (a
screenshot, a WhatsApp copy, a video and its length, a Live Photo, a
favourite), the sizes a phone would report — plus the grey copies for the
features (.cache/test-library-grey/). With ONNX Runtime at hand (ml/'s venv)
it also runs the on-device AI over them: ai.json (each photo's compact vector,
as a phone stores it; each video's poster embedding). scripts/demo-library-facts.mjs then computes
the features with the app's own spec and writes facts.json.

  npm run test-photos       (once)
  npm run demo-library      (this — with ml/'s venv active for the AI — then the facts)
  python3 scripts/demo-library.py --clips   (only the videos' playable copies)

In `npm run dev` the demo shows this library when it is there; `?library=demo`
switches back to the curated 101 photos (`?library=test` to this one again).
The checks, screenshots, preview video and App Review rehearsal always use the
curated demo.
"""
import base64
import csv
import hashlib
import json
import os
import subprocess
import sys
from datetime import datetime

from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'test-photos')
OUT = os.path.join(ROOT, 'src', 'native', 'demo', 'test-library')
PHOTOS = os.path.join(OUT, 'photos')
CLIPS = os.path.join(OUT, 'videos')
GREY = os.path.join(ROOT, '.cache', 'test-library-grey')
WA = 'Android/media/com.whatsapp/WhatsApp/Media/'


def h(s):
    return int(hashlib.sha1(s.encode()).hexdigest()[:8], 16)


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration',
                          '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    return j['streams'][0]['width'], j['streams'][0]['height'], float(j['format']['duration'])


def picture(path, video):
    if video:
        tmp = os.path.join(GREY, 'poster.jpg')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '1', '-i', path, '-frames:v', '1', tmp], check=True)
        path = tmp
    img = Image.open(path)
    img.load()
    return ImageOps.exif_transpose(img).convert('RGB')


def clips(rows):
    """Each video as an H.264 MP4 of at most 720p (the .MOV files are HEVC, which a browser may not
    play): what the demo's player shows. Made once; remade when the video changes."""
    os.makedirs(CLIPS, exist_ok=True)
    made = 0
    for n, r in enumerate(rows, 1):
        if r['kind'] not in ('video', 'video-copy'):
            continue
        f, out = os.path.join(SRC, r['file']), os.path.join(CLIPS, f't{n:04d}.mp4')
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f):
            continue
        tmp = out + '.part.mp4'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-map', '0:v:0', '-map', '0:a:0?',
                        '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
                        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', tmp], check=True)
        os.replace(tmp, out)
        made += 1
    print(f'{made} video copies made → src/native/demo/test-library/videos/')


def main():
    rows = list(csv.DictReader(open(os.path.join(SRC, 'credits.csv'), encoding='utf-8')))
    if '--clips' in sys.argv:
        clips(rows)
        return
    os.makedirs(PHOTOS, exist_ok=True)
    os.makedirs(GREY, exist_ok=True)
    manifest = []
    first = {}  # file → id, for the duplicate
    for n, r in enumerate(rows, 1):
        pid = f't{n:04d}'
        kind, f = r['kind'], os.path.join(SRC, r['file'])
        video = kind in ('video', 'video-copy')
        out = os.path.join(PHOTOS, pid + '.jpg')
        e = {'id': pid, 't': int(datetime.fromisoformat(r['date']).timestamp() * 1000)}
        if r['lat']:
            e['lat'], e['lon'] = float(r['lat']), float(r['lon'])
        if not (os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f) and os.path.exists(os.path.join(GREY, pid + '.pgm'))):
            img = picture(f, video)
            small = img.copy()
            small.thumbnail((1024, 1024), Image.LANCZOS)
            small.save(out, 'JPEG', quality=78, optimize=True)
            g = img.convert('L')
            g.thumbnail((512, 512), Image.LANCZOS)
            with open(os.path.join(GREY, pid + '.pgm'), 'wb') as fh:
                fh.write(b'P5\n%d %d\n255\n' % g.size)
                fh.write(g.tobytes())
        w, hgt = Image.open(f).size if not video else probe(f)[:2]
        if video:
            vw, vh, dur = probe(f)
            e.update(video=True, dur=int(dur * 1000), w=vw, h=vh, bytes=int(dur * 1000 * vw * vh * 0.0004 * (0.9 + (h(pid) % 20) / 100)),
                     dir=WA + 'WhatsApp Video/' if kind == 'video-copy' else 'DCIM/Camera/')
            if kind == 'video-copy':
                e['bytes'] = os.path.getsize(f)
        elif kind == 'screenshot':
            e.update(shot=True, fmt='png', w=1179, h=2556, bytes=600_000 + h(pid) % 900_000, dir='Pictures/Screenshots/')
        elif kind in ('copy', 'meme'):
            e.update(fmt='jpeg', w=w, h=hgt, bytes=os.path.getsize(f), dir=WA + 'WhatsApp Images/')
        elif kind == 'duplicate':
            orig = next(m for m in manifest if m['id'] == first[r['file'].replace(' (1)', '')])
            e.update({k: orig[k] for k in ('w', 'h', 'bytes', 'fmt') if k in orig}, dir='DCIM/Camera/')
        else:  # a camera photo: the size a phone's 12-MP camera gives it
            land = w >= hgt
            e.update(w=4032 if land else 3024, h=3024 if land else 4032, dir='DCIM/Camera/')
            live = kind in ('photo', 'burst') and h(pid) % 4 == 0
            e.update(fmt='heic' if live else 'jpeg', bytes=1_800_000 + h(pid) % 2_400_000 + (3_000_000 if live else 0))
            if live:
                e['live'] = True
            if kind == 'photo' and r['store'] == 'yes' and h(pid + 'fav') % 40 == 0:
                e['fav'] = True
        e['exact'] = True
        first[r['file']] = pid
        manifest.append(e)
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh)
    print(f'{len(manifest)} photos and videos → src/native/demo/test-library/')
    clips(rows)
    ai(manifest)


def ai(manifest):
    try:
        import numpy as np
        import onnxruntime as ort
        sys.path.insert(0, os.path.join(ROOT, 'ml'))
        from eval import pixels
        from compactlib import compact, load_projection, pack
    except ImportError:
        print('No ONNX Runtime here: the AI step is left out (activate ml/\'s venv and run again).')
        return
    meta = json.load(open(os.path.join(ROOT, 'ai-assets', 'vectors.json')))
    proj = load_projection()
    sess = ort.InferenceSession(os.path.join(ROOT, 'ai-assets', 'image.onnx'), providers=['CPUExecutionProvider'])
    path = os.path.join(OUT, 'ai.json')
    old = json.load(open(path)) if os.path.exists(path) else {}
    if old.get('aiVersion') != meta['aiVersion']:
        old = {}
    out = {'aiVersion': meta['aiVersion'], 'photos': {}, 'emb': {}}
    for e in manifest:
        pid = e['id']
        img = os.path.join(PHOTOS, pid + '.jpg')
        key = f"{pid}:{os.path.getmtime(img)}"
        if old.get('keys', {}).get(pid) == key:
            if pid in old.get('photos', {}):
                out['photos'][pid] = old['photos'][pid]
            if pid in old.get('emb', {}):
                out['emb'][pid] = old['emb'][pid]
        else:
            emb = sess.run(None, {'pixels': pixels(img, meta['size'])[None]})[0][0]
            if e.get('video'):
                v = np.round(emb / np.abs(emb).max() * 127).astype(np.int8)
                out['emb'][pid] = base64.b64encode(v.tobytes()).decode()
            else:
                out['photos'][pid] = pack(compact(emb, proj))
        out.setdefault('keys', {})[pid] = key
    with open(path, 'w') as fh:
        json.dump(out, fh, separators=(',', ':'))
    print(f"{len(out['photos'])} photo vectors, {len(out['emb'])} video posters embedded → ai.json")


if __name__ == '__main__':
    main()
