// Shared by scripts/screenshots.mjs (the store captures), scripts/ui-review.mjs
// (every screen, before and after a UI change), the privacy check and the
// performance check: builds the app with the demo library, serves it, and
// knows how to reach each screen. The app has no router, so every screen is
// reached by clicking.
//
// The demo library (src/native/demo/) stands in for the photo library: drawn
// photos of a home near Hanau and trips to Amsterdam, Vienna, Paris and Lake
// Garda. What a real phone would ask (photo access, the purchase) is settled
// by localStorage keys set before the app starts (`prefs` below).
//
// The labels the clicks need are the app's own: src/translations.ts is loaded
// through Vite, so renaming a button in the app can't silently break a capture.
//
// A store screen also says where its parts are (`marks`): the store set lifts
// pieces of a screen out of the phone (store-screenshot-studio's call-outs),
// and finds them by name in `<screen>.marks.json`, written next to the capture.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORT = 4318;
export const ORIGIN = `http://127.0.0.1:${PORT}`;

/** 430 × 932 pt at 3x = 1290 × 2796, the raw capture size. */
export const IPHONE = { width: 430, height: 932, scale: 3 };
const LOCALE = { de: 'de-DE', en: 'en-GB' };

/** The app's own strings, read from source through Vite. */
export async function loadSource() {
  const vite = await createServer({ root, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
  try {
    const tr = await vite.ssrLoadModule('/src/translations.ts');
    return { strings: tr.default, android: tr.androidStrings, fmt: tr.fmt, plural: tr.plural };
  } finally {
    await vite.close();
  }
}

/** Everything a screen's `run` needs for one language (and, for Android captures, Android's words). */
export function words(src, lang, platform) {
  const t = platform === 'android' ? { ...src.strings[lang], ...src.android[lang] } : src.strings[lang];
  return { lang, t, f: (s, vars) => src.fmt(s, vars), p: (base, n) => src.plural(t, base, n) };
}

/** The demo's state before the app starts: access granted, the library scanned, the unlock bought — each can be changed per screen. */
export function prefs({ lang = 'de', theme = 'light', access = 'full', scanned = true, owned = true, scanStep = null } = {}) {
  return {
    'bildklar-lang': lang,
    'bildklar-theme': theme,
    'bildklar-demo-access': access,
    'bildklar-demo-scanned': scanned ? '1' : null,
    'bildklar-demo-owned': owned ? '1' : null,
    'bildklar-demo-scan-step': scanStep,
    // The production build is no debug build: no dry run, no debug badges.
    'bildklar-dry-run': '0',
  };
}

/** Sets prefs in the page's storage (null removes) and loads home. */
export async function start(page, p) {
  await page.goto(`${ORIGIN}/__blank`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.evaluate(values => {
    localStorage.clear();
    for (const [k, v] of Object.entries(values)) if (v !== null) localStorage.setItem(k, v);
  }, p);
  await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await pause(page, 900);
}

/* ---------------------------------------------------------------- the clicks */

export const pause = (page, ms = 350) => page.waitForTimeout(ms);
export const aria = label => `[aria-label="${label.replace(/"/g, '\\"')}"]`;
export const sheet = '[role="dialog"]';

/** A trip's card, by the start of its title ("Paris"): its label is t.openTrip ("Paris, Mai 2026 öffnen", "Open Paris, May 2026"). */
export const tripCard = (w, place) => {
  const [before] = w.t.openTrip.split('{name}');
  return `main button[aria-label^="${before}${place}"]`;
};
/** Every trip card. */
export const tripCards = w => {
  const [before, after] = w.t.openTrip.split('{name}');
  // An empty ^= or $= matches nothing in CSS, so only the non-empty side is used.
  return `main button${before ? `[aria-label^="${before}"]` : ''}${after ? `[aria-label$="${after}"]` : ''}`;
};
export async function openTrip(page, w, place = 'Paris') {
  await page.click(tripCard(w, place));
  await pause(page, 700);
}
export async function openSimilar(page, w) {
  await page.click(`button:has-text("${w.t.similarTile}")`);
  await pause(page, 600);
}
export async function openGroup(page, w) {
  await openSimilar(page, w);
  await page.click('main button >> nth=0');
  await pause(page, 800);
}
export async function openBlurry(page, w) {
  await page.click(`button:has-text("${w.t.blurryTile}")`);
  await pause(page, 700);
}
export async function openCleanupReview(page, w) {
  await page.click(`button:has-text("${w.t.cleanupButton}")`);
  await pause(page, 500);
  await page.click(`button:has-text("${w.t.reviewAll}")`);
  await pause(page, 900);
}
export async function openSettings(page, w) {
  await page.click(`button${aria(w.t.settings)}`);
  await pause(page, 600);
}

/* ------------------------------------------------------------- the screens */

const section = title => `section:has(> h2:text-is("${title}")) > div`;

/**
 * The screens, in store order. `run` gets there from a fresh start of home.
 * `store: true` ones are the App Store / Google Play set (npm run screenshots);
 * ui-review takes them all. `prefs` changes the demo's state for that screen.
 * `marks` names the parts of a store screen the studio may lift (see above).
 */
export const SCREENS = [
  {
    name: '01-scan', store: true, prefs: { scanned: false, scanStep: '400' },
    // Slowed down to about 10 s (normally 2.6 s), so the capture and its mark
    // catch the card for sure: about a quarter through.
    wait: 1200,
    marks: () => ({ scan: 'section[aria-live="polite"]' }),
  },
  {
    name: '02-home', store: true,
    marks: w => ({ cleanup: 'section[aria-labelledby="cleanup-h"]', 'trip-1': `${tripCards(w)} >> nth=0`, tiles: 'main div.grid' }),
  },
  {
    // The list of all trips once there are more than four; the demo has four, so home scrolled to them.
    name: '03-trips', store: true, run: async (page, w) => {
      const all = page.locator(`button:has-text("${w.t.allTrips}")`);
      if (await all.count()) await all.first().click();
      else await page.evaluate(() => document.getElementById('trips-h')?.scrollIntoView({ block: 'start' }));
      await pause(page, 700);
    },
    marks: w => ({ 'trip-1': `${tripCards(w)} >> nth=0`, 'trip-2': `${tripCards(w)} >> nth=1` }),
  },
  { name: '04-trip', store: true, run: (page, w) => openTrip(page, w), marks: w => ({ album: `button:has-text("${w.t.createAlbum}")` }) },
  {
    name: '05-album', store: true, run: async (page, w) => {
      await openTrip(page, w);
      await page.click(`button:has-text("${w.t.createAlbum}")`);
      await pause(page, 500);
      await page.click(`[role="alertdialog"] button:has-text("${w.t.createAlbum}")`);
      await pause(page, 900);
    },
    marks: () => ({ done: 'main > div:first-child', toast: '[role="status"]' }),
  },
  { name: '06-group', store: true, run: openGroup, marks: () => ({ best: 'main figure' }) },
  { name: '07-blurry', store: true, run: openBlurry, marks: () => ({ grid: 'main > div.relative' }) },
  {
    name: '08-review', store: true, run: async (page, w) => {
      await openCleanupReview(page, w);
      // Half a swipe to the left: the "delete" stamp shows.
      const card = await page.locator('main [role="img"], div[role="img"]').first().boundingBox();
      if (card) {
        await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
        await page.mouse.down();
        await page.mouse.move(card.x + card.width / 2 - 70, card.y + card.height / 2 + 6, { steps: 8 });
      }
    },
    after: async page => { await page.mouse.up(); },
    marks: () => ({ card: 'div[role="img"]' }),
  },
  {
    name: '09-paywall', store: true, prefs: { owned: false }, run: async (page, w) => {
      await openSettings(page, w);
      await page.click(`main button:has-text("${w.t.unlockRow}")`);
      await pause(page, 900);
    },
    marks: () => ({ sheet: sheet }),
  },
  // ---- ui-review only ----
  { name: '10-permission', prefs: { access: 'notDetermined', scanned: false } },
  { name: '11-denied', prefs: { access: 'denied', scanned: false } },
  { name: '12-limited', prefs: { access: 'limited' } },
  { name: '13-similar', run: openSimilar },
  { name: '14-cleanup', run: async (page, w) => { await page.click(`button:has-text("${w.t.cleanupButton}")`); await pause(page, 600); } },
  {
    name: '15-review-done', run: async (page, w) => {
      await openCleanupReview(page, w);
      for (let i = 0; i < 3; i++) { await page.click(`button${aria(w.t.delete)}`); await pause(page, 120); }
      await page.click(`button:has-text("${w.t.finishReview}")`);
      await pause(page, 500);
    },
  },
  { name: '16-trip-menu', run: async (page, w) => { await openTrip(page, w); await page.click(`button${aria(w.t.editTrip)}`); await pause(page, 700); } },
  { name: '17-settings', run: openSettings, marks: w => ({ display: section(w.t.displaySection) }) },
  { name: '18-settings-end', run: async (page, w) => { await openSettings(page, w); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await pause(page, 300); } },
  { name: '19-dark', prefs: { theme: 'dark' } },
  { name: '20-dark-group', prefs: { theme: 'dark' }, run: openGroup },
];

/**
 * Where each of a screen's marks is, right now: its box in fractions of the
 * viewport (so of the capture) and its corner radius in fractions of the
 * viewport's width. A mark that is missing or off the screen is an error —
 * the store set would lift thin air.
 */
export async function measure(page, wanted) {
  const { width: vw, height: vh } = page.viewportSize();
  const marks = {};
  for (const [name, selector] of Object.entries(wanted)) {
    const el = page.locator(selector).first();
    if (!(await el.count())) throw new Error(`mark "${name}" is not on the screen (${selector})`);
    const box = await el.evaluate((node, { vw, vh }) => {
      const r = node.getBoundingClientRect();
      let radius = 0;
      for (let n = node, depth = 0; n && depth < 3 && !radius; n = n.firstElementChild, depth += 1) {
        radius = parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0;
      }
      radius = Math.min(radius, r.width / 2, r.height / 2);
      const f = v => Math.round(v * 1e5) / 1e5;
      // Clipped to the screen: a grid runs on below the fold, the review's
      // card leans out of it half way through a swipe.
      const top = Math.max(0, r.top);
      const bottom = Math.min(vh, r.bottom);
      const left = Math.max(0, r.left);
      const right = Math.min(vw, r.right);
      return { x: f(left / vw), y: f(top / vh), w: f(Math.max(0, right - left) / vw), h: f(Math.max(0, bottom - top) / vh), radius: f(radius / vw) };
    }, { vw, vh });
    if (box.w <= 0.05 || box.h <= 0.02) {
      throw new Error(`mark "${name}" is not on the screen (${selector})`);
    }
    marks[name] = box;
  }
  return marks;
}

/**
 * Capture `screens` for each variant ({ id, lang, theme?, viewport? }) into
 * `<outDir>/<id>/<name>.png`. With `marks`, a screen that names marks also
 * gets `<name>.marks.json` next to it. Returns the names that could not be
 * reached.
 */
export async function capture({ variants, screens, outDir, clean = true, onlyNames = null, marks = false }) {
  console.log('Building …');
  execSync('npx vite build', { cwd: root, stdio: 'ignore' });
  const src = await loadSource();
  const server = await preview({ root, logLevel: 'silent', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });
  const browser = await chromium.launch();
  const failed = [];
  try {
    for (const v of variants) {
      const w = words(src, v.lang, v.platform);
      const dir = path.join(outDir, v.id);
      if (clean && !onlyNames) fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const size = v.viewport ?? IPHONE;
      const ctx = await browser.newContext({
        viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.scale ?? 2,
        locale: LOCALE[v.lang] ?? v.lang, colorScheme: 'light', hasTouch: true, isMobile: true,
      });
      if (v.platform === 'android') await ctx.addInitScript(() => localStorage.setItem('bildklar-dev-platform', 'android'));
      const page = await ctx.newPage();
      page.on('pageerror', e => console.error(`[${v.id}] page error:`, e.message));

      for (const s of screens) {
        if (onlyNames && !onlyNames.includes(s.name)) continue;
        try {
          await start(page, prefs({ lang: v.lang, theme: v.theme ?? 'light', ...s.prefs }));
          if (s.run) await s.run(page, w);
          await pause(page, s.wait ?? 700);
          const found = marks && s.marks ? await measure(page, s.marks(w)) : null;
          await page.screenshot({ path: path.join(dir, `${s.name}.png`) });
          if (found) fs.writeFileSync(path.join(dir, `${s.name}.marks.json`), `${JSON.stringify({ capture: `${s.name}.png`, marks: found }, null, 2)}\n`);
          console.log(`  ${v.id}/${s.name}.png${found ? `  (${Object.keys(found).length} marks)` : ''}`);
          if (s.after) await s.after(page, w);
        } catch (e) {
          failed.push(`${v.id}/${s.name}`);
          console.error(`✗ ${v.id}/${s.name}: ${String(e.message).split('\n')[0]}`);
          if (s.after) await s.after(page, w).catch(() => {});
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    await new Promise(r => server.httpServer.close(() => r()));
  }
  return failed;
}

/** `--only 02-home,04-trip` → ['02-home', '04-trip']; absent → null. */
export function onlyArg(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--only');
  return i === -1 ? null : String(argv[i + 1] ?? '').split(',').map(s => s.trim()).filter(Boolean);
}
