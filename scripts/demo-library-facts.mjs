// The test library's facts (src/native/demo/test-library/facts.json): each
// photo's time, place and kind from manifest.json (scripts/demo-library.py),
// its features computed by the app's own spec (src/logic/features.ts) from the
// grey copy, and the AI's scores and video embeddings from ai.json.
//   npm run demo-library
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { features } from '../src/logic/features.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src', 'native', 'demo', 'test-library');
const grey = path.join(root, '.cache', 'test-library-grey');
if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
  console.log('No test library in the demo yet: npm run test-photos, then npm run demo-library.');
  process.exit(0);
}
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const aiFile = path.join(dir, 'ai.json');
const ai = fs.existsSync(aiFile) ? JSON.parse(fs.readFileSync(aiFile, 'utf8')) : { photos: {}, emb: {} };
const facts = manifest.map(e => {
  const buf = fs.readFileSync(path.join(grey, `${e.id}.pgm`));
  const m = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(buf.subarray(0, 64).toString('latin1'));
  const f = features(new Uint8Array(buf.subarray(m[0].length)), Number(m[1]), Number(m[2]));
  return { ...e, ...f, ...(ai.photos?.[e.id] ? { ai: ai.photos[e.id] } : {}), ...(ai.emb?.[e.id] ? { emb: ai.emb[e.id] } : {}) };
});
fs.writeFileSync(path.join(dir, 'facts.json'), JSON.stringify(facts) + '\n');
console.log(`${facts.length} photos → src/native/demo/test-library/facts.json`);
