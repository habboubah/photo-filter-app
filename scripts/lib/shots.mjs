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
// While nothing is for sale (UNLOCK_ON_SALE in src/logic/allowance.ts) every
// extra is free and shown (albums, smaller videos, Live Photos), so the store
// set shows them too; only the screens that exist for the sale (`onSale`, the
// paywall) are left out.
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
    await tr.loadFirstRun(); // and so are the first run's strings
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

/** The demo's state before the app starts: access granted, the library scanned, the unlock bought, the first run behind it — each can be changed per screen. */
export function prefs({ lang = 'de', theme = 'light', access = 'full', scanned = true, owned = true, scanStep = null, firstRun = false, seen = ['*'] } = {}) {
  return {
    // Past the first run — the welcome, the first scan's screen, the reveal, the guided review, every
    // tip (src/logic/firstRun.ts) — unless a screen asks to see it: `firstRun: true` is a new install,
    // `seen: []` (or a few ids) an install that has its scan behind it but not the hints.
    'bildklar-welcome': firstRun ? null : '1',
    'bildklar-seen': firstRun ? null : JSON.stringify(seen),
    'bildklar-lang': lang,
    'bildklar-theme': theme,
    'bildklar-demo-access': access,
    'bildklar-demo-scanned': scanned ? '1' : null,
    'bildklar-demo-owned': owned ? '1' : null,
    'bildklar-demo-scan-step': scanStep,
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
  // The first group's photos (the Fotos · Videos switch, when there are similar videos, comes before the cards).
  await page.click('main .card button >> nth=0');
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
 * shows what the unlock pays for (free while nothing is sold).
 */
export const SCREENS = [
  {
    // ui-review only since Nov 2026: a progress bar says little in a store listing.
    name: '01-scan', prefs: { scanned: false, scanStep: '400' },
    // Slowed down to about 10 s (normally 2.6 s), so the capture and its mark
    // catch the card for sure: about a quarter through.
    wait: 1200,
    marks: () => ({ scan: 'section[aria-live="polite"]' }),
  },
  {
    name: '02-home', store: true,
    // The Suggestions card's head: the space that could go and the library's bar (the store set lifts it out).
    marks: () => ({ cleanup: 'section[aria-labelledby="found-h"] > div > div:first-child', tiles: 'main div.grid' }),
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
    marks: w => ({ album: `button:has-text("${w.t.createAlbum}")` }),
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
    {
    name: '15-review-done', run: async (page, w) => {
      await openCleanupReview(page, w);
      for (let i = 0; i < 3; i++) { await page.click(`button${aria(w.t.aside)}`); await pause(page, 120); }
      await page.click(`button:has-text("${w.t.finishReview}")`);
      await pause(page, 500);
    },
  },
  { name: '16-trip-menu', run: async (page, w) => { await openTrip(page, w); await page.click(`button${aria(w.t.editTrip)}`); await pause(page, 700); } },
  { name: '17-settings', run: openSettings, marks: w => ({ display: section(w.t.displaySection) }) },
  { name: '18-settings-end', run: async (page, w) => { await openSettings(page, w); await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await pause(page, 300); } },
  { name: '19-dark', prefs: { theme: 'dark' } },
  { name: '20-dark-group', prefs: { theme: 'dark' }, run: openGroup },
  // In the store set: the exact copies, each series with the one to keep starred.
  {
    name: '21-duplicates', store: true, run: async (page, w) => { await page.click(`button:has-text("${w.t.duplicatesTile}")`); await pause(page, 600); },
    marks: () => ({ 'group-1': 'main button >> nth=0', 'group-2': 'main button >> nth=1' }),
  },
  { name: '22-screenshots', run: async (page, w) => { await page.click(`button:has-text("${w.t.screenshotsTile}")`); await pause(page, 700); } },
  {
    name: '23-quick-clean', run: async (page, w) => {
      await page.click(`button:has-text("${w.t.cleanupButton}")`);
      await pause(page, 700);
    },
  },
  { name: '24-months', run: async (page, w) => { await page.click(`button:has-text("${w.t.monthsCard}")`); await pause(page, 700); } },
  // Coming back after a while (src/useNudges.ts): the card of what is new since the last visit (and a new trip, when one ended lately).
  {
    name: '46-coming-back', run: async page => {
      // Off the app first: leaving it records a visit (now), which would overwrite the old one set here.
      const origin = new URL(page.url()).origin;
      await page.goto(`${origin}/__blank`, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await page.evaluate(() => {
        localStorage.setItem('bildklar-last-visit', String(Date.now() - 140 * 86_400_000));
        localStorage.setItem('bildklar-trips-seen', '[]');
        localStorage.removeItem('bildklar-since-done');
      });
      await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
      await pause(page, 1500);
    },
  },
  {
    // A month left part-way: three photos kept, the review closed — the tile shows the share and "Continue".
    name: '45-months-resume', run: async (page, w) => {
      await page.click(`button:has-text("${w.t.monthsCard}")`);
      await pause(page, 700);
      await page.click('main [data-tip="tip.months"] button >> nth=4');
      await pause(page, 900);
      for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await pause(page, 450); }
      await page.click(`button${aria(w.t.close)}`);
      await pause(page, 900);
    },
  },
  { name: '25-home-end', run: async page => { await page.evaluate(() => window.scrollTo(0, 900)); await pause(page, 400); } },
  { name: '26-large', run: async (page, w) => { await page.click(`button:has-text("${w.t.largeTile}")`); await pause(page, 700); } },
  {
    name: '27-large-video', run: async (page, w) => {
      await page.click(`button:has-text("${w.t.largeTile}")`);
      await pause(page, 600);
      await page.click(`main button[aria-label*=", ${w.t.videoBadge} "]:not([aria-pressed]) >> nth=0`);
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
    // One grid since 18 November 2026: "Alle" adds the photos that are only maybe blurry to the dark and bright ones.
    name: '32-failed-dark', run: async (page, w) => {
      await openBlurry(page, w);
      await page.click(`main button[role="radio"]:has-text("${w.t.filterAll}")`);
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
      // Two albums chosen for the row under the photo (a sheet), then the photo filed into the first.
      await page.click(`[role="group"][aria-label="${w.t.fileIntoAlbum}"] button[aria-haspopup="dialog"]`);
      await pause(page, 500);
      for (let i = 0; i < 2; i++) { await page.click(`[role="dialog"] li button >> nth=${i}`); await pause(page, 150); }
      await page.click(`[role="dialog"] button${aria(w.t.done)}`);
      await pause(page, 500);
      await page.click(`[role="group"][aria-label="${w.t.fileIntoAlbum}"] button[aria-pressed] >> nth=0`);
      await pause(page, 250);
      await page.click(`button${aria(w.t.aside)}`);
      await pause(page, 200);
      await page.click(`button:has-text("${w.t.finishReview}")`);
      await pause(page, 600);
    },
  },
  // Suchen: the vocabulary's examples, then "Strand" picked and its results (the AI's vectors of the demo photos).
  {
    name: '41-search', run: async (page, w) => {
      await openOrganize(page, w);
      await page.click(`button[aria-label^="${w.t.searchOpen}"] >> nth=0`);
      await pause(page, 700);
    },
  },
  {
    // In the store set: one word, and the photos the on-device AI finds for it.
    name: '42-search-results', store: true, run: async (page, w) => {
      await openOrganize(page, w);
      await page.click(`button[aria-label^="${w.t.searchOpen}"] >> nth=0`);
      await pause(page, 600);
      await page.fill('input', w.lang === 'de' ? 'stadt' : w.lang === 'ar' ? 'مدينة' : 'city');
      await pause(page, 300);
      await page.keyboard.press('Enter');
      await pause(page, 900);
      // The field loses its caret, so the capture shows no blinking cursor.
      await page.locator('input').blur();
    },
    marks: w => {
      // The word's chip: its label is t.searchRemove ("Stadt entfernen", "Remove city").
      const [before, after] = w.t.searchRemove.split('{word}');
      const chip = `main button${before ? `[aria-label^="${before}"]` : ''}${after ? `[aria-label$="${after}"]` : ''}`;
      return { word: chip };
    },
  },
  // Ähnliche Fotos: a search result's look-alikes (in the store set).
  {
    name: '43-like', store: true, run: async (page, w) => {
      await openOrganize(page, w);
      await page.click(`button[aria-label^="${w.t.searchOpen}"] >> nth=0`);
      await pause(page, 600);
      await page.fill('input', w.lang === 'de' ? 'stadt' : w.lang === 'ar' ? 'مدينة' : 'city');
      await page.keyboard.press('Enter');
      await pause(page, 900);
      await page.locator('main button[style*="position: absolute"]').first().click();
      await pause(page, 900);
    },
    marks: () => ({ photo: 'main figure' }),
  },
  // Ähnliche Videos: the demo's two takes at Lake Garda and a copied video — the Videos switch on the near-identical screen.
  {
    name: '35-lookalike', run: async (page, w) => {
      await openSimilar(page, w);
      await page.click(`main button[role="radio"]:has-text("${w.t.statVideos}")`);
      await pause(page, 800);
    },
  },
  // One series of similar videos: the one to keep plays from its picture (inside the app), each take from its own button.
  {
    name: '44-lookalike-group', run: async (page, w) => {
      await openSimilar(page, w);
      await page.click(`main button[role="radio"]:has-text("${w.t.statVideos}")`);
      await pause(page, 800);
      await page.locator('main .card button').first().click();
      await pause(page, 900);
      // The demo has no player: it remembers what it was asked to play.
      await page.locator(`main figure ${aria(w.t.playVideo.split('{')[0]).replace('aria-label=', 'aria-label^=')}`).click();
      const asked = await page.evaluate(() => localStorage.getItem('bildklar-demo-preview'));
      if (!asked) throw new Error('the play button asked for no video');
    },
  },
  // Fotos verkleinern: the photos that qualify, the largest saving first.
  // Aufräumen › Mehr Platz › Fotos verkleinern (on home since 19 November 2026), picking.
  {
    name: '34-compress', run: async (page, w) => {
      await page.click(`main button:has-text("${w.t.compressPhotosTile}")`); await pause(page, 800);
      await page.click(`button[aria-pressed]:has-text("${w.t.selectMode}")`); await page.click(`button:has-text("${w.t.pickAll}")`); await pause(page, 500);
    },
  },
  { name: '34-compress-videos', run: async (page, w) => { await page.click(`main button:has-text("${w.t.compressVideosTile}")`); await pause(page, 800); } },
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
      // The pile is a row of home's "More space" now.
      await page.click(`button:has-text("${w.t.laterCard}")`);
      await pause(page, 900);
    },
  },
];

/** A new install, before the photo access was asked for. */
const NEW = { firstRun: true, access: 'notDetermined', scanned: false };
/** Through the reveal after the first scan to home, then into the review of everything suggested — the guided first review. */
async function openGuidedReview(page, w) {
  await page.waitForSelector(`text=${w.t.revealTitle}`, { timeout: 20000 });
  await pause(page, 700);
  await page.click(`button:has-text("${w.t.revealLook}")`);
  await pause(page, 800);
  await openCleanupReview(page, w);
}
/** The reveal's first step: the first group of near-identical photos, opened as the first task. */
async function openFirstGroup(page, w) {
  await page.waitForSelector(`text=${w.t.revealTitle}`, { timeout: 20000 });
  await pause(page, 700);
  await page.click(`button:has-text("${w.t.revealCompare}")`);
  await pause(page, 900);
}
/** Two photos marked in a review and put into "Zum Löschen vorgemerkt", then back on home. */
async function markTwo(page, w) {
  await openCleanupReview(page, w);
  for (let i = 0; i < 2; i++) { await page.click(`button${aria(w.t.aside)}`); await pause(page, 450); }
  await page.click(`button:has-text("${w.t.finishReview}")`);
  await pause(page, 600);
  await page.click(`main button:has-text("${w.t.binAdd}")`);
  await pause(page, 700);
  await page.click(`button${aria(w.t.back)}`);
  await pause(page, 700);
}

/**
 * The first run (docs/DESIGN.md), for ui-review: the welcome, the first scan's screen, the
 * reveal, the guided review and its summary, a tip, the three safety nets, So funktioniert Bildklar.
 */
export const FIRST_RUN_SCREENS = [
  { name: '50-welcome', prefs: NEW, wait: 2900 },
  // Slowed down (about 12 s), so the capture catches the screen half way through.
  { name: '54-first-scan', prefs: { firstRun: true, scanned: false, scanStep: '500' }, wait: 6500 },
  {
    name: '55-reveal', prefs: { firstRun: true, scanned: false },
    run: async (page, w) => { await page.waitForSelector(`text=${w.t.revealTitle}`, { timeout: 20000 }); await pause(page, 1300); },
  },
  { name: '56-guide', prefs: { firstRun: true, scanned: false }, run: openGuidedReview, wait: 1200 },
  {
    name: '57-guide-summary', prefs: { firstRun: true, scanned: false }, run: async (page, w) => {
      await openGuidedReview(page, w);
      for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowLeft']) { await page.keyboard.press(key); await pause(page, 500); }
      await page.click(`button:has-text("${w.t.finishReview}")`);
    },
    wait: 1600,
  },
  // A tip waits for its control to be on screen: home is scrolled to "Zum Löschen vorgemerkt", where the first one points.
  {
    name: '58-tip', prefs: { seen: ['swipeRight', 'swipeLeft', 'swipeUp'] }, run: async (page, w) => {
      await markTwo(page, w);
      await page.evaluate(() => document.querySelector('[data-tip="tip.bin"]')?.scrollIntoView({ block: 'center' }));
    },
    wait: 5500,
  },
  {
    name: '59-safety', prefs: { seen: ['swipeRight', 'swipeLeft', 'swipeUp', 'tip.bin', 'tip.binScreen', 'tip.buttons', 'tip.suggest'] }, run: async (page, w) => {
      await markTwo(page, w);
      await pause(page, 5200); // the toast of the marking is gone
      await page.click('button[data-tip="tip.bin"]');
      await pause(page, 800);
      await page.click('body > div.fixed.bottom-0 button >> nth=0');
    },
    wait: 1500,
  },
  { name: '61-first-group', prefs: { firstRun: true, scanned: false }, run: openFirstGroup, wait: 1500 },
  {
    // Side by side, both photos zoomed to the same spot by one tap.
    name: '62-compare', prefs: { firstRun: true, scanned: false }, run: async (page, w) => {
      await openFirstGroup(page, w);
      await page.click(`button:has-text("${w.t.compareOpen}")`);
      await pause(page, 700);
      const box = await page.locator('[role="dialog"] figure >> nth=0').boundingBox();
      if (box) await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.4);
    },
    wait: 900,
  },
  {
    name: '63-first-task', prefs: { firstRun: true, scanned: false }, run: async (page, w) => {
      await openFirstGroup(page, w);
      await page.click(`button:has-text("${w.t.groupAsideOthers}")`);
    },
    wait: 1400,
  },
  {
    // Marked for deletion as a review tray: every staged photo, the dock reviews the selection (never deletes by itself).
    name: '64-bin', prefs: { seen: ['*'] }, run: async (page, w) => {
      await markTwo(page, w);
      await pause(page, 5200); // the toast of the marking is gone
      await page.click('button[data-tip="tip.bin"]');
    },
    wait: 900,
  },
  {
    // Home with something marked for deletion: its card in its own warm colour.
    name: '65-home-marked', prefs: { seen: ['*'] }, run: async (page, w) => {
      await markTwo(page, w);
      await pause(page, 5200);
      await page.locator('button[data-tip="tip.bin"]').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, 120));
    },
    wait: 700,
  },
  { name: '60-how', run: async (page, w) => { await openSettings(page, w); await page.click(`main button:has-text("${w.t.howTitle}")`); }, wait: 800 },
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
 * Capture `screens` for each variant ({ id, lang, theme?, viewport?, platform?, fontScale? }) into
 * `<outDir>/<id>/<name>.png`. With `marks`, a screen that names marks also
 * gets `<name>.marks.json` next to it. Returns the names that could not be
 * reached.
 */
export async function capture({ variants, screens, outDir, clean = true, onlyNames = null, marks = false, forStore = false }) {
  console.log('Building …');
  execSync('npx vite build', { cwd: root, stdio: 'ignore' });
  const src = await loadSource();
  // The store set before the sale: what a new user sees (no unlock owned; every extra free all the same).
  const userView = forStore && !src.onSale;
  screens = screens.filter(s => src.onSale || !s.onSale);
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
      // Large text, as the system's setting gives it on a phone (src/dynamicType.ts scales the root font size there).
      if (v.fontScale) {
        await ctx.addInitScript(scale => {
          const timer = setInterval(() => { if (document.documentElement) document.documentElement.style.fontSize = `${scale * 100}%`; }, 40);
          setTimeout(() => clearInterval(timer), 4000);
        }, v.fontScale);
      }
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
