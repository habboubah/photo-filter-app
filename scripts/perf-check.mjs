// Performance guardrails. Desktop machines stand in for the phone, so these
// are budgets that catch a regression, not promises:
//   - the analysis of a 50,000-photo library (src/logic/fixtures.ts: homes,
//     trips, similar groups, best shots, blurry photos, the AI's utility photos
//     and categories, the clean-up card)
//     stays under ANALYSIS_BUDGET_MS — on a phone it runs once per scan;
//   - re-applying an edit (a renamed or cut trip) stays under EDIT_BUDGET_MS;
//   - the main bundle: at most 10 % over the recorded gzip size (built in
//     --mode native, as it ships: without the demo library).
//
// Usage: node scripts/perf-check.mjs [--no-build]
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { build, createServer } from 'vite';
import { root } from './lib/shots.mjs';

/**
 * The main chunk's gzip size (level 9) when this was recorded. Raise it only
 * with a line here saying what made it grow.
 *   - November 2026: 146 kB — React, Motion, Capacitor, the screens and the logic.
 *   - 17 November 2026: 162 kB — Arabic's plural rules and the chat groups (158 kB), then the AI's
 *     version 2: the compact vectors and the label scoring, two-signal groups, how sure each
 *     suggestion is, search's entry points, protecting look-alikes, and their strings in German and
 *     English. The search vocabulary (67 kB) is a chunk of its own, loaded with the search screen.
 *   - 18 November 2026: 180 kB — the redesigned Aufräumen and Ordnen, the albums on Ordnen, picking
 *     with select all / deselect all, the player in place, the scan's photo and video counts, and
 *     every screen's (i) written out as numbered steps, in German and English. The album and
 *     album-picker screens are chunks of their own.
 */
const BUNDLE_GZIP_BASELINE = 180_000;
const BUNDLE_GROWTH = 1.10;
/**
 * 50,000 photos (about 62,000 with bursts and screenshots), on a desktop. Measured 16 November 2026: ~300 ms;
 * 17 November 2026, with the AI's vectors (similar groups confirmed by them, 33 labels): see the two lines below.
 */
const ANALYSIS_BUDGET_MS = 1500;
const EDIT_BUDGET_MS = 400;
/**
 * Every photo's label scores from its vector (src/logic/ai.ts scoreLabels), once per launch when the vectors
 * arrive — in slices, so the screen stays responsive (src/store.ts). Measured 17 November 2026: ~650 ms.
 */
const LABELS_BUDGET_MS = 1500;
const PHOTOS = 50_000;

let failures = 0;
const report = (pass, msg) => { console.log(`  ${pass ? '✓' : '✗'} ${msg}`); if (!pass) failures += 1; };

// The bundle first: the dev server below sets NODE_ENV to development for the rest of the process.
console.log('Bundle');
const outDir = path.join(root, 'dist-native-perf');
await build({ root, mode: 'native', logLevel: 'error', build: { outDir, emptyOutDir: true } });
try {
  const assets = path.join(outDir, 'assets');
  const main = fs.readdirSync(assets).filter(f => /^index-.*\.js$/.test(f))
    .map(f => ({ f, size: fs.statSync(path.join(assets, f)).size })).sort((x, y) => y.size - x.size)[0];
  const gzip = zlib.gzipSync(fs.readFileSync(path.join(assets, main.f)), { level: 9 }).length;
  report(gzip <= BUNDLE_GZIP_BASELINE * BUNDLE_GROWTH,
    `main bundle ${(gzip / 1000).toFixed(1)} kB gzip (recorded ${(BUNDLE_GZIP_BASELINE / 1000).toFixed(0)} kB, allowed +${Math.round((BUNDLE_GROWTH - 1) * 100)} %)`);
  const demo = fs.readdirSync(assets).filter(f => /\.jpg$/.test(f));
  report(demo.length === 0, demo.length ? `the native build carries ${demo.length} demo photos` : 'the native build carries no demo photos');
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

console.log('Analysis of a 50,000-photo library');
const vite = await createServer({ root, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
try {
  const fixtures = await vite.ssrLoadModule('/src/logic/fixtures.ts');
  const a = await vite.ssrLoadModule('/src/logic/analyze.ts');
  const geo = await vite.ssrLoadModule('/src/logic/geo.ts');
  const st = await vite.ssrLoadModule('/src/logic/state.ts');
  const ai = await vite.ssrLoadModule('/src/logic/ai.ts');
  const vec = await vite.ssrLoadModule('/src/logic/vectors.ts');
  const tr = await vite.ssrLoadModule('/src/logic/trips.ts');
  const { photos } = fixtures.fakeLibrary(PHOTOS, 1);
  const cities = new geo.CityIndex(geo.parseCities(fs.readFileSync(path.join(root, 'src/data/cities.tsv'), 'utf8')));
  const state = st.emptyState();
  // As on a phone after the AI's pass: every photo with a vector (made up, following its hash).
  const vectors = vec.Vectors.of(fixtures.fakeVectors(photos, 1));
  const run = () => {
    const t0 = performance.now();
    const lib = a.makeLibrary(photos);
    const det = a.detect(lib, vectors);
    const trips = a.buildTrips(lib, det.trips, state, cities, 'de', 'de-DE');
    const groups = a.buildGroups(lib, det.groups, state);
    const blurry = a.findBlurry(lib, groups);
    const utility = ai.findUtility(lib.photos, new Set());
    const cats = ai.categories(lib.photos);
    const sum = a.summarize(lib, groups, blurry, new Set(), [], utility);
    return { ms: performance.now() - t0, lib, det, trips, groups, blurry, utility, cats, sum };
  };
  run(); // warm up the JIT, as a phone's second scan would be
  const r = run();
  report(r.ms <= ANALYSIS_BUDGET_MS,
    `${r.lib.photos.length.toLocaleString('en')} photos → ${r.trips.length} trips, ${r.groups.length} similar groups, ${r.blurry.length} blurry, ${r.utility.length} utility, ${r.cats.length} categories in ${Math.round(r.ms)} ms (budget ${ANALYSIS_BUDGET_MS} ms)`);
  // The labels' scores for every vector: once per load of the vectors (only new ones after that).
  const labelFile = JSON.parse(fs.readFileSync(path.join(root, 'src/logic/aiLabels.json'), 'utf8'));
  const model = ai.labelModel(labelFile);
  const tl = performance.now();
  ai.scoreLabels(vectors, model);
  const labelMs = performance.now() - tl;
  report(labelMs <= LABELS_BUDGET_MS, `${vectors.size.toLocaleString('en')} vectors scored for ${ai.LABELS.length} labels in ${Math.round(labelMs)} ms (budget ${LABELS_BUDGET_MS} ms)`);
  const t0 = performance.now();
  const edited = { ...state, trips: { ...tr.setName(state.trips, r.trips[0].key, 'Umbenannt'), albums: {} } };
  a.buildTrips(r.lib, r.det.trips, edited, cities, 'de', 'de-DE');
  const editMs = performance.now() - t0;
  report(editMs <= EDIT_BUDGET_MS, `a renamed trip re-applied in ${Math.round(editMs)} ms (budget ${EDIT_BUDGET_MS} ms)`);
} finally {
  await vite.close();
}

console.log(failures ? `\n${failures} budget(s) missed.` : '\nPerformance budgets hold.');
process.exit(failures ? 1 : 0);
