// The privacy promise, checked: the app talks to nobody.
//
// 1. Every http(s) URL written into dist/ has to be on the allowlist below,
//    with the reason it is harmless — so a new one gets looked at.
// 2. Builds the app (with the demo library), serves dist/ with `vite preview`,
//    and drives Chromium through what people do — the permission screen, the
//    first scan, a trip and its album (through the paywall and the purchase
//    once the unlock is for sale; before, as an owner would), a similar
//    group and "delete the others", the blurry list, a review whose photos go
//    into "Zum Löschen", that list (one put back, the rest gone through and
//    deleted), the settings and the licences — recording every request. Any request to
//    another origin fails the check (it is aborted, so nothing leaves this
//    machine either).
//
// What this cannot see: the native side. Our own Swift and Kotlin make no
// network call (no URLSession / HttpURLConnection in ios/App/App or
// android/app/src/main/java — the check below greps for them); the Google
// Play Billing Library is Google's own (docs/PLAN.md, "Privacy").
//
// Usage: node scripts/privacy-check.mjs [--no-build]
// Once per machine: npx playwright install chromium
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { build, preview } from 'vite';
import {
  ORIGIN, PORT, aria, loadSource, openBlurry, openGroup, openSettings, openTrip, pause, prefs, root, start, words,
} from './lib/shots.mjs';

const dist = path.join(root, 'dist');

/** URLs that may appear in the bundle, and why they are not requests. */
const ALLOWED_URLS = [
  [/^http:\/\/www\.w3\.org\//, 'XML namespaces (SVG icons) — never fetched'],
  [/^https:\/\/react\.dev\/errors\//, "React's production error text"],
  [/^https:\/\/capacitorjs\.com\//, "a Capacitor console warning's text"],
  [/^https:\/\/tailwindcss\.com/, "Tailwind's banner comment in the CSS"],
  [/^https:\/\/apps\.apple\.com\/app\/id\d*/,
    'Einstellungen › Bildklar bewerten (src/links.ts): handed to the App Store when tapped, never fetched'],
  [/^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.habboubah\.bildklar$/,
    'Einstellungen › Bildklar bewerten in the Android app (src/links.ts): handed to Google Play when tapped, never fetched'],
  [/^https:\/\/habboubah\.github\.io\/privacy-policy\/bildklar\/(de\/)?$/,
    'Einstellungen › Datenschutz (src/links.ts): opened in the browser when tapped, never fetched'],
  [/^http:\/\/www\.apache\.org\/licenses\/$/, 'the Apache 2.0 text in Einstellungen › Lizenzen (src/licences.json) — shown as text, never fetched'],
  [/^https:\/\/motion\.dev$/, "Motion's licence text in Einstellungen › Lizenzen — shown as text, never fetched"],
  [/^https:\/\/ionic\.io$/, "Capacitor's licence texts in Einstellungen › Lizenzen — shown as text, never fetched"],
];

const failures = [];
const fail = msg => { failures.push(msg); console.error(`  ✗ ${msg}`); };
const ok = msg => console.log(`  ✓ ${msg}`);

if (!process.argv.includes('--no-build')) {
  console.log('Building…');
  await build({ root, logLevel: 'error' });
}

// ---- 1. What the bundle mentions -------------------------------------------
console.log('Bundle URLs');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const unknown = new Map();
for (const file of walk(dist)) {
  if (!/\.(js|mjs|html|css|json|webmanifest|svg)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const [url] of text.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
    if (ALLOWED_URLS.some(([re]) => re.test(url))) continue;
    unknown.set(url, path.relative(root, file));
  }
}
if (unknown.size) for (const [url, file] of unknown) fail(`unknown URL in the bundle: ${url} (${file})`);
else ok('every URL in dist/ is on the allowlist');

const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (/http-equiv="Content-Security-Policy"[^>]*connect-src (?:'|&#39;)self/.test(html)) ok("index.html carries the Content-Security-Policy (connect-src 'self')");
else fail("dist/index.html has no Content-Security-Policy with connect-src 'self'");

// ---- 2. Our native code makes no request ------------------------------------
console.log('Native code');
const nativeFiles = [
  ...walk(path.join(root, 'ios', 'App', 'App')).filter(f => f.endsWith('.swift')),
  ...walk(path.join(root, 'ios', 'PhotoFeatures', 'Sources')).filter(f => f.endsWith('.swift')),
  ...walk(path.join(root, 'android', 'app', 'src', 'main', 'java')).filter(f => /\.(kt|java)$/.test(f)),
];
const NETWORK = /\b(URLSession|NSURLConnection|URLRequest|HttpURLConnection|HttpsURLConnection|OkHttp|java\.net\.URL\(|Socket\()/;
const talking = nativeFiles.filter(f => NETWORK.test(fs.readFileSync(f, 'utf8')));
if (talking.length) for (const f of talking) fail(`network code in ${path.relative(root, f)}`);
else ok(`no network code in our ${nativeFiles.length} Swift and Kotlin files`);

// ---- 3. What the app requests ------------------------------------------------
const src = await loadSource();
const w = words(src, 'de');
const server = await preview({ root, logLevel: 'error', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });
const browser = await chromium.launch();
const offenders = new Set();
try {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: 'de-DE', serviceWorkers: 'block',
  });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(ORIGIN) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    offenders.add(url);
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  page.on('console', m => { if (/Content Security Policy/i.test(m.text())) fail(`CSP: ${m.text().split('\n')[0]}`); });
  const step = async (name, fn) => {
    try { await fn(); ok(name); } catch (e) { fail(`${name}: ${e.message.split('\n')[0]}`); }
  };

  console.log('Requests while using the app');
  await step('the permission screen, then access granted and the first scan', async () => {
    await start(page, prefs({ access: 'notDetermined', scanned: false, owned: false }));
    await page.click(`button:has-text("${w.t.permAllow}")`);
    await page.waitForSelector(`text=${w.t.cleanupCard}`, { timeout: 15000 });
    await pause(page, 600);
  });
  await step(src.onSale ? 'a trip: renamed, its album made through the paywall' : 'a trip: renamed, then (as an owner) its album made', async () => {
    await openTrip(page, w);
    await page.click(`button${aria(w.t.editTrip)}`);
    await page.click(`button:has-text("${w.t.rename}")`);
    await page.fill(`[role="dialog"] input`, 'Paris mit Oma');
    await page.click(`[role="dialog"] button${aria(w.t.save)}`);
    await pause(page, 400);
    if (src.onSale) {
      await page.click(`button:has-text("${w.t.createAlbum}")`);
      await page.waitForSelector('[role="dialog"]');
      await page.click(`[role="dialog"] button:has-text("€")`);
    } else {
      // Nothing is for sale (src/logic/allowance.ts): albums show only for an owner.
      await start(page, prefs({ owned: true }));
      await openTrip(page, w);
      await page.click(`button:has-text("${w.t.createAlbum}")`);
    }
    await page.click(`[role="alertdialog"] button:has-text("${w.t.createAlbum}")`, { timeout: 5000 });
    await pause(page, 800);
    await page.click(`button${aria(w.t.back)}`);
    await pause(page, 400);
  });
  await step('a similar group: another best shot picked, the others into Zum Löschen', async () => {
    await openGroup(page, w);
    await page.click('main .grid button >> nth=1');
    await pause(page, 300);
    await page.click(`button:has-text("${w.t.deleteOthers}")`);
    await pause(page, 900);
  });
  await step('the blurry photos, reviewed, into Zum Löschen', async () => {
    await start(page, prefs({ owned: true }));
    await openBlurry(page, w);
    await page.click(`button:has-text("${w.t.reviewBlurry}")`);
    await pause(page, 600);
    await page.click(`button${aria(w.t.delete)}`);
    await page.click(`button${aria(w.t.delete)}`);
    await page.click(`button${aria(w.t.keep)}`);
    await page.click(`button:has-text("${w.t.finishReview}")`);
    await page.click(`button:has-text("${w.t.binAdd}")`);
    await pause(page, 900);
  });
  await step('Zum Löschen: one put back, the rest gone through and deleted', async () => {
    await page.click(`button${aria(w.t.back)}`);
    await pause(page, 400);
    await page.click(`button:has-text("${w.t.binTitle}")`);
    await pause(page, 600);
    await page.click(`button[aria-label$="${w.t.notSelected}"] >> nth=0`);
    await page.click(`button:has-text("${w.t.binRestore}")`);
    await pause(page, 400);
    await page.click(`button:has-text("${w.t.binReview}")`);
    await pause(page, 600);
    await page.click(`button${aria(w.t.delete)}`);
    await page.click(`button:has-text("${w.t.finishReview}")`).catch(() => {});
    await page.click('button:has-text("1 Foto löschen")');
    await pause(page, 900);
  });
  await step('settings: language, appearance, licences, reset', async () => {
    await start(page, prefs({ owned: true }));
    await openSettings(page, w);
    await page.selectOption(`select${aria(w.t.appearance)}`, 'dark');
    await page.selectOption(`select${aria(w.t.appearance)}`, 'light');
    await page.selectOption(`select${aria(w.t.language)}`, 'en');
    await page.selectOption(`select${aria(src.strings.en.language)}`, 'de');
    await page.click(`main button:has-text("${w.t.licences}")`);
    await pause(page, 400);
    await page.click('main button:has-text("SigLIP 2")');
    await pause(page, 400);
    await page.click(`button${aria(w.t.back)}`);
    await page.click(`button${aria(w.t.back)}`);
    await page.click(`main button:has-text("${w.t.resetDecisions}")`);
    await page.click(`[role="alertdialog"] button:has-text("${w.t.resetDecisions}")`);
    await pause(page, 400);
  });
  await pause(page, 500);
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(() => r()));
}

if (offenders.size) for (const url of offenders) fail(`request to another origin: ${url}`);
else ok('no request left the app');

console.log(failures.length ? `\n${failures.length} problem(s).` : '\nPrivacy check passed: nothing leaves the device.');
process.exit(failures.length ? 1 : 0);
