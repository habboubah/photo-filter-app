// Writes fixtures/features/expected.json: what the feature spec
// (src/logic/features.ts) computes for each test picture. The Swift
// (ios/PhotoFeatures) and Kotlin (android/app/src/test) tests must get exactly
// the same numbers from the same pictures, so a score means the same on both
// phones. Run after changing the spec or the pictures:
//   node --experimental-strip-types scripts/feature-vectors.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { FEATURE_VERSION, features, hamming, hashParts } from '../src/logic/features.ts';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'features');

export function readPgm(file) {
  const buf = fs.readFileSync(file);
  // "P5\n<w> <h>\n255\n" then w*h bytes.
  const header = buf.subarray(0, 64).toString('latin1');
  const m = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(header);
  if (!m) throw new Error(`${file} is not a binary PGM`);
  return { w: Number(m[1]), h: Number(m[2]), grey: new Uint8Array(buf.subarray(m[0].length)) };
}

const expected = { featureVersion: FEATURE_VERSION, pictures: {} };
for (const name of fs.readdirSync(dir).filter(f => f.endsWith('.pgm')).sort()) {
  const { w, h, grey } = readPgm(path.join(dir, name));
  expected.pictures[name] = { w, h, ...features(grey, w, h) };
}
const p = expected.pictures;
const d = (a, b) => hamming(hashParts(p[a].hash), hashParts(p[b].hash));
expected.checks = {
  'scene sharper than its blurred copy': p['scene.pgm'].sharp > p['scene-blur.pgm'].sharp,
  [`scene ~ scene-copy (distance ${d('scene.pgm', 'scene-copy.pgm')})`]: d('scene.pgm', 'scene-copy.pgm') <= 10,
  [`scene ≠ other (distance ${d('scene.pgm', 'other.pgm')})`]: d('scene.pgm', 'other.pgm') > 20,
};
fs.writeFileSync(path.join(dir, 'expected.json'), JSON.stringify(expected, null, 2) + '\n');
console.log(JSON.stringify(expected, null, 2));
if (Object.values(expected.checks).some(ok => !ok)) { console.error('A check failed: change the pictures or the spec.'); process.exit(1); }
