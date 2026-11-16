// The demo library's facts (src/native/demo/facts.json): for each photo
// scripts/demo-photos.py drew, its time and place from manifest.json and its
// features computed by the app's own spec (src/logic/features.ts) from the
// grey copy — exactly what the native scan would report. Sizes are made up in
// the range of real phone photos, so the clean-up card shows realistic numbers.
//   npm run demo-photos
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { features } from '../src/logic/features.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'src', 'native', 'demo');
const grey = path.join(root, '.cache', 'demo-grey');
const manifest = JSON.parse(fs.readFileSync(path.join(demo, 'manifest.json'), 'utf8'));

let seed = 7;
const rand = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };

const facts = manifest.map(entry => {
  const buf = fs.readFileSync(path.join(grey, `${entry.id}.pgm`));
  const m = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(buf.subarray(0, 64).toString('latin1'));
  const w = Number(m[1]);
  const h = Number(m[2]);
  const f = features(new Uint8Array(buf.subarray(m[0].length)), w, h);
  const photo = entry.shot
    ? { ...entry, w: 1179, h: 2556, bytes: Math.round(600_000 + rand() * 900_000) }
    : { ...entry, w: 4032, h: 3024, bytes: Math.round(1_800_000 + rand() * 2_400_000) };
  return { ...photo, exact: true, ...f };
});
fs.writeFileSync(path.join(demo, 'facts.json'), JSON.stringify(facts) + '\n');
console.log(`${facts.length} photos → src/native/demo/facts.json`);
