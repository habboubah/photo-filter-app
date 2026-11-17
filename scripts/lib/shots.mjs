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
// While nothing is for sale (UNLOCK_ON_SALE in src/logic/allowance.ts) the
// store set shows what a new user gets: the unlock not owned, so no album
// button, no smaller videos, no Live Photos; the screens that exist only for
// sale (`onSale`) or only show the extras (`extras`) are left out of it.
// ui-review keeps the unlock owned and so still sees the hidden screens.
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
const LOCALE = { de: 'de-DE', en: 'en-GB', ar: 'ar' };

/** Whether the unlock is for sale yet (UNLOCK_ON_SALE in src/logic/allowance.ts). */
export const unlockOnSale = () =>
  /^export const UNLOCK_ON_SALE = true;/m.test(fs.readFileSync(path.join(root, 'src', 'logic', 'allowance.ts'), 'utf8'));

/** The app's own strings, read from source through Vite. */
export async function loadSource() {
  const vite = await createServer({ root, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
  try {
    const tr = await vite.ssrLoadModule('/src/translations.ts');
    await tr.loadLanguage('ar'); // Arabic is its own chunk
    return { strings: tr.default, android: tr.androidStrings, fmt: tr.fmt, plural: tr.plural, onSale: unlockOnSale() };
  } finally {
    await vite.close();
  }
}

/** Everything a screen's `run` needs for one language (and, for Android captures, Android's words). */
export function words(src, lang, platform) {
  const t = platform === 'android' ? { ...src.strings[lang], ...src.android[lang] } : src.strings[lang];
  return { lang, t, onSale: src.onSale, f: (s, vars) => src.fmt(s, vars), p: (base, n) => src.plural(t, base, n) };
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
/** The "Ordnen" tab (trips, on this day, the AI's categories). */
export async function openOrganize(page, w) {
  await page.click(`nav button:has-text("${w.t.tabOrganize}")`);
  await pause(page, 500);
}
/** Back on the "Aufräumen" tab (the categories, the clean-up card), when another tab is showing. */
export async function openClean(page, w) {
  const tab = page.locator(`nav button[aria-current="page"]`);
  if (await tab.count() && !(await tab.innerText()).includes(w.t.tabClean)) {
    await page.click(`nav button:has-text("${w.t.tabClean}")`);
    await pause(page, 500);
  }
}
export async function openTrip(page, w, place = 'Paris') {
  if (!(await page.locator(tripCard(w, place)).count())) await openOrganize(page, w);
  await page.click(tripCard(w, place));
  await pause(page, 700);
}
export async function openSimilar(page, w) {
  await openClean(page, w);
  await page.click(`button:has-text("${w.t.similarTile}")`);
  await pause(page, 600);
}
export async function openGroup(page, w) {
  await openSimilar(page, w);
  await page.click('main button >> nth=0');
  await pause(page, 800);
}
export async function openBlurry(page, w) {
  await openClean(page, w);
  await page.click(`button:has-text("${w.t.failedTile}")`);
  await pause(page, 700);
}
export async function openCleanupReview(page, w) {
  await openClean(page, w);
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
 * `onSale`: only while the unlock is for sale (skipped otherwise). `extras`:
 * shows what the unlock pays for — not in the store set while nothing is sold.
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
    marks: () => ({ cleanup: 'section[aria-labelledby="cleanup-h"]', tiles: 'main div.grid' }),
  },
  {
    // The list of all trips once there are more than the "Ordnen" tab shows (three; the demo has four).
    name: '03-trips', store: true, run: async (page, w) => {
      await openOrganize(page, w);
      const all = page.locator(`button:has-text("${w.t.allTrips}")`);
      if (await all.count()) await all.first().click();
      else await page.evaluate(() => document.getElementById('trips-h')?.scrollIntoView({ block: 'start' }));
      await pause(page, 700);
    },
    marks: w => ({ 'trip-1': `${tripCards(w)} >> nth=0`, 'trip-2': `${tripCards(w)} >> nth=1` }),
  },
  {
    name: '04-trip', store: true, run: (page, w) => openTrip(page, w),
    // The album button only while albums are sold; before, the trip's own "go through" button.
    marks: w => (w.onSale ? { album: `button:has-text("${w.t.createAlbum}")` } : { review: `button:has-text("${w.t.reviewTrip}")` }),
  },
  {
    name: '05-album', store: true, extras: true, run: async (page, w) => {
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
    name: '09-paywall', store: true, onSale: true, prefs: { owned: false }, run: async (page, w) => {
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
  { name: '21-duplicates', run: async (page, w) => { await page.click(`button:has-text("${w.t.duplicatesTile}")`); await pause(page, 600); } },
  { name: '22-screenshots', run: async (page, w) => { await page.click(`button:has-text("${w.t.screenshotsTile}")`); await pause(page, 700); } },
  {
    name: '23-quick-clean', run: async (page, w) => {
      await page.click(`button:has-text("${w.t.cleanupButton}")`);
      await pause(page, 500);
      await page.click(`button:has-text("${w.t.quickClean}")`);
      await pause(page, 700);
    },
  },
  { name: '24-months', run: async (page, w) => { await page.click(`button:has-text("${w.t.monthsCard}")`); await pause(page, 700); } },
  { name: '25-home-end', run: async page => { await page.evaluate(() => window.scrollTo(0, 900)); await pause(page, 400); } },
  { name: '26-large', run: async (page, w) => { await page.click(`button:has-text("${w.t.largeTile}")`); await pause(page, 700); } },
  {
    name: '27-large-video', run: async (page, w) => {
      await page.click(`button:has-text("${w.t.largeTile}")`);
      await pause(page, 600);
      await page.click('main button >> nth=4');
      await pause(page, 800);
    },
  },
  // iPhone only: Android has no Live Photos (the tile is hidden there; home is captured instead).
  {
    name: '28-live', run: async (page, w) => {
      const tile = page.locator(`button:has-text("${w.t.liveTile}")`);
      if (await tile.count()) { await tile.click(); await pause(page, 700); }
    },
  },
  // The on-device AI (docs/AI.md): the utility photos and one category.
  { name: '29-utility', run: async (page, w) => { await page.click(`button:has-text("${w.t.utilityTile}")`); await pause(page, 700); } },
  {
    name: '30-category', run: async (page, w) => {
      await openOrganize(page, w);
      await page.click(`section[aria-labelledby="categories-h"] button >> nth=0`);
      await pause(page, 700);
    },
  },
  // The "Ordnen" tab: on this day, the trips as cover cards, then scrolled to the AI's categories.
  { name: '39-organize', run: openOrganize },
  { name: '40-organize-end', run: async (page, w) => { await openOrganize(page, w); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await pause(page, 400); } },
  // Missglückt: the too dark photos (the demo's pocket shot).
  {
    name: '32-failed-dark', run: async (page, w) => {
      await openBlurry(page, w);
      await page.click(`button:has-text("${w.t.failedDark}")`);
      await pause(page, 500);
    },
  },
  // Android only: "Aus Apps" (the iPhone has no tile; home is captured instead).
  {
    name: '38-apps', run: async (page, w) => {
      const tile = page.locator(`button:has-text("${w.t.appsTile}")`);
      if (await tile.count()) { await tile.click(); await pause(page, 700); }
    },
  },
  // Albums while swiping: the chips under the photo, two photos filed, then the end screen.
  {
    name: '36-album-chips', run: async (page, w) => {
      await page.click(`button:has-text("${w.t.monthsCard}")`);
      await pause(page, 600);
      await page.click('main button >> nth=0');
      await pause(page, 900);
    },
  },
  {
    name: '37-album-summary', run: async (page, w) => {
      await page.click(`button:has-text("${w.t.monthsCard}")`);
      await pause(page, 600);
      await page.click('main button >> nth=4');
      await pause(page, 900);
      for (let i = 0; i < 2; i++) { await page.click(`[role="group"][aria-label="${w.t.fileIntoAlbum}"] button >> nth=0`); await pause(page, 250); }
      await page.click(`button${aria(w.t.delete)}`);
      await pause(page, 200);
      await page.click(`button:has-text("${w.t.finishReview}")`);
      await pause(page, 600);
    },
  },
  // Suchen: the vocabulary's examples, then "Strand" picked and its results (the AI's vectors of the demo photos).
  {
    name: '41-search', run: async (page, w) => {
      await openOrganize(page, w);
      await page.click(`button${aria(w.t.searchOpen)}`);
      await pause(page, 700);
    },
  },
  {
    name: '42-search-results', run: async (page, w) => {
      await openOrganize(page, w);
      await page.click(`button${aria(w.t.searchOpen)}`);
      await pause(page, 600);
      await page.fill('input', w.lang === 'de' ? 'stadt' : w.lang === 'ar' ? 'مدينة' : 'city');
      await pause(page, 300);
      await page.keyboard.press('Enter');
      await pause(page, 900);
    },
  },
  // Ähnliche Fotos: a search result's look-alikes.
  {
    name: '43-like', run: async (page, w) => {
      await openOrganize(page, w);
      await page.click(`button${aria(w.t.searchOpen)}`);
      await pause(page, 600);
      await page.fill('input', w.lang === 'de' ? 'stadt' : w.lang === 'ar' ? 'مدينة' : 'city');
      await page.keyboard.press('Enter');
      await pause(page, 900);
      await page.locator('main button[style*="position: absolute"]').first().click();
      await pause(page, 900);
    },
  },
  // Ähnliche Videos: the demo's two takes at Lake Garda, at the end of the duplicates.
  {
    name: '35-lookalike', run: async (page, w) => {
      await page.click(`button:has-text("${w.t.duplicatesTile}")`);
      await pause(page, 600);
      await page.locator('#lookalike-h').scrollIntoViewIfNeeded();
      await pause(page, 400);
    },
  },
  // Fotos verkleinern: the photos that qualify, the largest saving first.
  { name: '34-compress', run: async (page, w) => { await page.click(`button:has-text("${w.t.compressPhotosTile}")`); await pause(page, 800); } },
  // Aufräumen › Geschützt (the last rows of home): one album switched on (the demo's family album).
  {
    name: '33-protected', run: async (page, w) => {
      await page.click(`main button:has-text("${w.t.protectedRow}")`);
      await pause(page, 900);
      await page.locator('main [role="switch"]').first().check({ force: true });
      await pause(page, 400);
    },
  },
  // The decide-later pile: two photos swiped up in a review, then the pile gone through from home.
  {
    name: '31-later', run: async (page, w) => {
      await openCleanupReview(page, w);
      for (let i = 0; i < 2; i++) { await page.click(`button${aria(w.t.later)}`); await pause(page, 150); }
      await page.click(`button:has-text("${w.t.finishReview}")`);
      await pause(page, 400);
      await page.click(`main button:has-text("${w.t.done}")`);
      await pause(page, 600);
      await page.click(`button${aria(w.t.back)}`);
      await pause(page, 700);
      await page.click(`button:has-text("${w.t.laterCard}")`);
      await pause(page, 900);
    },
  },
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
export async function capture({ variants, screens, outDir, clean = true, onlyNames = null, marks = false, forStore = false }) {
  console.log('Building …');
  execSync('npx vite build', { cwd: root, stdio: 'ignore' });
  const src = await loadSource();
  // The store set before the sale: what a new user sees (the header above).
  const userView = forStore && !src.onSale;
  screens = screens.filter(s => (src.onSale || !s.onSale) && !(userView && s.extras));
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
          await start(page, prefs({ lang: v.lang, theme: v.theme ?? 'light', ...(userView ? { owned: false } : {}), ...s.prefs }));
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
