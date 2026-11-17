// The test set for similar groups, copies and the best shot (docs/AI.md,
// "Test set"), step 2 of 2: the app's own code over what ml/eval_groups.py
// prepared — the features from the grey copies (src/logic/features.ts), the
// cosines from the compact vectors (src/logic/vectors.ts), the links of
// src/logic/similar.ts and the ranking of src/logic/best.ts. Prints the
// tables for docs/AI.md: how each threshold separates the pairs, and how often
// the app's best shot is the one Ahmad would keep.
//
// Usage: npm run ai:eval-groups   (python3 ml/eval_groups.py first, then this)
import fs from 'fs';
import path from 'path';
import { createServer } from 'vite';
import { root } from './lib/shots.mjs';

const data = JSON.parse(fs.readFileSync(path.join(root, 'ml/build/eval-groups.json'), 'utf8'));
const vite = await createServer({ root, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
try {
  const F = await vite.ssrLoadModule('/src/logic/features.ts');
  const V = await vite.ssrLoadModule('/src/logic/vectors.ts');
  const S = await vite.ssrLoadModule('/src/logic/similar.ts');
  const B = await vite.ssrLoadModule('/src/logic/best.ts');

  const featuresOf = key => {
    const buf = fs.readFileSync(path.join(root, 'ml/build/eval-grey', `${key}.pgm`));
    const m = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(buf.subarray(0, 64).toString('latin1'));
    return F.features(new Uint8Array(buf.subarray(m[0].length)), Number(m[1]), Number(m[2]));
  };
  const photoOf = (p, t = 0) => ({ id: p.key, t, bytes: 0, w: p.w, h: p.h, ...featuresOf(p.key) });
  const all = [...data.pairs.flatMap(x => [x.a, x.b]), ...data.groups.flatMap(g => g.photos)];
  const vectors = V.Vectors.of(all.map(p => ({ id: p.key, v: p.vec })));
  const pct = (n, d) => (d ? `${Math.round((100 * n) / d)} %` : '–');

  console.log('Pairs');
  const rows = data.pairs.map(x => {
    const a = photoOf(x.a);
    const b = photoOf(x.b);
    return { kind: x.kind, name: x.name, d: F.hamming(F.hashParts(a.hash), F.hashParts(b.hash)), cos: vectors.cos(x.a.key, x.b.key), a, b };
  });
  const by = k => rows.filter(r => r.kind === k);
  // Similar links as similar.ts makes them, both shots within the time window.
  const simLink = (r, cos) => r.d <= S.MAX_DISTANCE && r.cos >= cos;
  console.log(`  ${by('same').length} same · ${by('copy').length} copy · ${by('different').length} different`);
  console.log('  SIM_COS   same linked   different linked   (hash ≤ ' + S.MAX_DISTANCE + ' too)');
  for (const c of [0.8, 0.83, 0.85, 0.87, 0.89, 0.91, 0.93, 0.95]) {
    const mark = Math.abs(c - S.SIM_COS) < 1e-9 ? '  ← now' : '';
    console.log(`  ${c.toFixed(2)}      ${pct(by('same').filter(r => simLink(r, c)).length, by('same').length).padStart(6)}        ${pct(by('different').filter(r => simLink(r, c)).length, by('different').length).padStart(6)}${mark}`);
  }
  // Copies: a strong link (close hashes, the same shape and light) or a weak one (hash ≤ DUP_EMB_DISTANCE, alike vectors).
  const sameShape = r => Math.abs(r.a.w / r.a.h - r.b.w / r.b.h) <= S.DUP_ASPECT * Math.max(r.a.w / r.a.h, r.b.w / r.b.h);
  const strong = r => r.d <= S.DUP_DISTANCE && sameShape(r) && Math.abs(r.a.expo - r.b.expo) <= S.DUP_EXPO;
  const weak = (r, cos) => r.d <= S.DUP_EMB_DISTANCE && sameShape(r) && r.cos >= cos;
  console.log('  DUP_COS   copy found (strong or weak)   different called a copy');
  for (const c of [0.9, 0.93, 0.95, 0.97]) {
    const mark = Math.abs(c - S.DUP_COS) < 1e-9 ? '  ← now' : '';
    const found = by('copy').filter(r => strong(r) || weak(r, c)).length;
    const wrong = by('different').filter(r => strong(r) || weak(r, c)).length;
    console.log(`  ${c.toFixed(2)}      ${pct(found, by('copy').length).padStart(6)}                     ${pct(wrong, by('different').length).padStart(6)}${mark}`);
  }
  const missed = by('copy').filter(r => !strong(r) && !weak(r, S.DUP_COS));
  if (missed.length) console.log(`  copies missed: ${missed.map(r => `${r.name} (hash ${r.d}, cos ${r.cos?.toFixed(3)})`).join(', ')}`);

  console.log('\nBest shot');
  let top1 = 0;
  let top2 = 0;
  for (const g of data.groups) {
    const photos = g.photos.map((p, i) => ({ ...photoOf(p, i * 1000), file: path.basename(p.file) }));
    const ranked = B.rankGroup(photos);
    if (ranked[0].file === g.best) top1++;
    if (ranked.slice(0, 2).some(p => p.file === g.best)) top2++;
    else console.log(`  ${g.name}: the app keeps ${ranked[0].file}, you ${g.best}`);
  }
  console.log(`  ${data.groups.length} groups: the app's best is yours in ${pct(top1, data.groups.length)}, among its two best in ${pct(top2, data.groups.length)}`);
  console.log('  (without face scores: the phones add faces and, on the iPhone, open eyes and aesthetics)');
} finally {
  await vite.close();
}
