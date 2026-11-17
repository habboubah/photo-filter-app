// The demo library's facts (src/native/demo/facts.json): for each photo
// scripts/demo-photos.py drew, its time and place from manifest.json and its
// features computed by the app's own spec (src/logic/features.ts) from the
// grey copy — exactly what the native scan would report. Sizes are made up in
// the range of real phone photos, so the clean-up card shows realistic numbers.
// Each photo's compact vector comes from ai.json (ml/demo_ai.py runs the real
// model over the demo photos — the vector a phone would store; the app scores
// the labels and searches from it, docs/AI.md).
//   npm run demo-photos
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { features } from '../src/logic/features.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'src', 'native', 'demo');
const grey = path.join(root, '.cache', 'demo-grey');
const manifest = JSON.parse(fs.readFileSync(path.join(demo, 'manifest.json'), 'utf8'));
const aiFile = path.join(demo, 'ai.json');
const ai = fs.existsSync(aiFile) ? JSON.parse(fs.readFileSync(aiFile, 'utf8')).photos : {};

/*
 * Scan schema 4's facts, as a phone would report them: the file format
 * (iPhone stills are HEIC when they are Live Photos, the rest JPEG;
 * screenshots PNG), one edited photo (never made smaller), the folder each
 * file lies in (Android's RELATIVE_PATH: the camera, the screenshots, the
 * messenger copies in WhatsApp's folder) and, for videos, the picture of
 * their poster frame (`emb`). The embeddings are made up — a seeded unit
 * vector per scene, so the cake video saved twice matches itself and the
 * others don't — not the model's (the demo has no model to run).
 */
const EDITED = new Set(['p063']);
/** Files that came from other apps (Android's "Aus Apps"): the cake video saved again from WhatsApp, a copy from Telegram, a receipt downloaded. */
const DIR = {
  p090: 'Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video/',
  p085: 'Pictures/Telegram/',
  p094: 'Download/',
};
const SCENE = { p089: 'cake', p090: 'cake', p091: 'garda', p092: 'paris', p101: 'garda' };
/** The second take of a scene: its vector a little off the first one's (cosine about 0.94). */
const TAKE_JITTER = { p101: 3 };
function sceneVector(name, jitter = 0) {
  let s = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
  const next = () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31 - 0.5; };
  const v = Array.from({ length: 768 }, next);
  if (jitter) { let j = jitter * 7919; for (let i = 0; i < v.length; i++) { j = (j * 1103515245 + 12345) % 2 ** 31; v[i] += (j / 2 ** 31 - 0.5) * 0.35; } }
  const top = Math.max(...v.map(Math.abs));
  return Buffer.from(Int8Array.from(v.map(x => Math.round((x * 127) / top)))).toString('base64');
}
export function schema4(entry) {
  const out = {};
  if (!entry.video) out.fmt = entry.shot ? 'png' : entry.live ? 'heic' : 'jpeg';
  if (EDITED.has(entry.id)) out.edited = true;
  out.dir = DIR[entry.id] ?? (entry.rec ? 'Movies/Screen recordings/' : entry.shot ? 'Pictures/Screenshots/'
    : entry.copy ? 'Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images/' : 'DCIM/Camera/');
  if (entry.video && !entry.rec && SCENE[entry.id]) out.emb = sceneVector(SCENE[entry.id], TAKE_JITTER[entry.id] ?? 0);
  return out;
}

let seed = 7;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

const facts = process.argv[1]?.endsWith('demo-facts.mjs') ? manifest.map(entry => {
  const buf = fs.readFileSync(path.join(grey, `${entry.id}.pgm`));
  const m = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(buf.subarray(0, 64).toString('latin1'));
  const w = Number(m[1]);
  const h = Number(m[2]);
  const f = features(new Uint8Array(buf.subarray(m[0].length)), w, h);
  // A copy saved from a messenger: smaller and lighter than the camera's original.
  const { copy, note, take, ...rest } = entry;
  const scores = ai[entry.id] ? { vec: ai[entry.id] } : {};
  // A picture of a receipt or a letter: a phone photo, sized without the random source so the photos after it keep their numbers.
  if (note) return { ...rest, w: 4032, h: 3024, bytes: 2_400_000, exact: true, ...f, ...scores, ...schema4(entry) };
  // A second take (a lookalike video): sized without the random source too.
  if (take) return { ...rest, w: 1920, h: 1080, bytes: Math.round(entry.dur * 1920 * 1080 * 0.0004), exact: true, ...f, ...scores, ...schema4(entry) };
  // A video: about 0.4 bytes per pixel and second (what the iPhone's estimate assumes too); a Live Photo carries about 3 MB of video.
  const r = rand();
  const photo = entry.video
    ? (entry.rec
      ? { ...rest, w: 1179, h: 2556, bytes: Math.round(entry.dur * 1179 * 2556 * 0.0004 * (0.9 + r * 0.2)) }
      : { ...rest, w: 1920, h: 1080, bytes: Math.round(entry.dur * 1920 * 1080 * 0.0004 * (0.9 + r * 0.2)) })
    : entry.shot
      ? { ...rest, w: 1179, h: 2556, bytes: Math.round(600_000 + r * 900_000) }
      : copy
        ? { ...rest, w: 1600, h: 1200, bytes: Math.round(250_000 + r * 200_000) }
        : { ...rest, w: 4032, h: 3024, bytes: Math.round(1_800_000 + r * 2_400_000) + (entry.live ? 3_000_000 : 0) };
  return { ...photo, exact: true, ...f, ...scores, ...schema4(entry) };
}) : null;
if (facts) {
  fs.writeFileSync(path.join(demo, 'facts.json'), JSON.stringify(facts) + '\n');
  console.log(`${facts.length} photos → src/native/demo/facts.json`);
}
