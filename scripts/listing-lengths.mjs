// Checks that every text in store/listing.md fits its store's limit.
// Usage: node scripts/listing-lengths.mjs   (exits 1 when one is too long)
//
// Characters are counted as the stores count them (Unicode code points);
// the App Store keywords field counts bytes (UTF-8), so "ä" costs two.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = fs.readFileSync(path.join(root, 'store', 'listing.md'), 'utf8');

const chars = s => [...s].length;
const bytes = s => Buffer.byteLength(s, 'utf8');

// section heading → [what, limit, counter]; fenced blocks in the section are checked.
const BLOCKS = {
  '2.2': ['promotional text', 170, chars],
  '2.3': ['description', 4000, chars],
  '2.5': ['review notes', 4000, chars],
  '3.2': ['full description', 4000, chars],
  '3.5': ['photo permissions declaration', 500, chars],
};
// table row label → [limit, counter]; every `backticked` value in the row is checked.
const ROWS = {
  'App name (30)': [30, chars],
  Name: [30, chars],
  Subtitle: [30, chars],
  'App name': [30, chars],
  'Short description': [80, chars],
};

const sections = text.split(/^### /m).slice(1).map(s => ({ id: s.split(' ')[0], body: s }));
const shared = text.split(/^## 1\./m)[1]?.split(/^## 2\./m)[0] ?? '';
let bad = 0;
const report = (what, value, limit, count) => {
  const n = count(value);
  const ok = n <= limit;
  if (!ok) bad++;
  console.log(`${ok ? '✓' : '✗'} ${String(n).padStart(4)} / ${limit}  ${what}`);
};

for (const { id, body } of [{ id: '1', body: shared }, ...sections]) {
  if (BLOCKS[id]) {
    const [what, limit, count] = BLOCKS[id];
    for (const m of body.matchAll(/(?:\*\*(\w+):\*\*\s*)?```\n([\s\S]*?)\n```/g)) {
      report(`${id} ${what}${m[1] ? ` (${m[1]})` : ''}`, m[2], limit, count);
    }
  }
  for (const line of body.split('\n')) {
    const label = line.match(/^\|\s*([^|]+?)\s*\|/)?.[1];
    if (label && ROWS[label]) {
      const [limit, count] = ROWS[label];
      for (const m of line.matchAll(/`([^`]+)`/g)) report(`${id} ${label}: ${m[1]}`, m[1], limit, count);
    }
    const kw = line.match(/^- \*\*(\w+):\*\* `([^`]+)`/);
    if (id === '2.1' && kw) {
      report(`2.1 keywords (${kw[1]}, bytes)`, kw[2], 100, bytes);
      if (/, /.test(kw[2])) { bad++; console.log('✗ keywords: no spaces after commas'); }
    }
  }
}

// The release notes the scripts send (Play: 500 per language).
const notesDir = path.join(root, 'release-notes');
for (const dir of fs.readdirSync(notesDir)) {
  for (const f of fs.readdirSync(path.join(notesDir, dir))) {
    report(`release-notes/${dir}/${f}`, fs.readFileSync(path.join(notesDir, dir, f), 'utf8').trim(), 500, chars);
  }
}

console.log(bad ? `\n${bad} too long.` : '\nAll texts fit.');
process.exit(bad ? 1 : 0);
