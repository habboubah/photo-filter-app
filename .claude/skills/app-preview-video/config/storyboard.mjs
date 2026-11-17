// The film: Bildklar's App Store preview, chapter by chapter. This file
// and the copy next to it (copy.<lang>.json) are all that is about this app —
// the scripts play any storyboard.
//
// A chapter is a caption and what happens after it:
//   caption  the key of its line in copy.<lang>.json › captions. It stands on
//            the frozen screen for `hold` seconds, then the screen comes alive.
//   hold     how long the caption stands, with its fades (about 0.6 s of it).
//   setup    (optional) gets the app somewhere else first, off camera; the
//            video dissolves to it.
//   run      what is filmed: `a` taps, scrolls and lights things up (the verbs
//            are in scripts/film.mjs › Actor), `w` are the app's own words
//            in the language being filmed (scripts/lib/shots.mjs › words).
//   card     the end card instead: the icon, the name and the points from
//            copy.<lang>.json › card, for `seconds`.
//
// Every label a tap needs comes from the app's strings (`w.t`), like the store
// screenshots — one storyboard films every language, and a renamed button
// stops the run with a message instead of filming the wrong thing. The film
// runs on the demo library (src/native/demo/): real CC0 photos
// (scripts/demo-photos.py), fine for the store.
import { PORT, ORIGIN, SCREENS, aria, loadSource, prefs as demoPrefs, start, tripCard, unlockOnSale, words } from '../../../../scripts/lib/shots.mjs';

/**
 * Nothing is for sale yet (src/logic/allowance.ts): the film shows what a new
 * user gets — the unlock not owned, a trip looked at instead of made an album.
 */
const ON_SALE = unlockOnSale();

export { loadSource, words };

/** Where the built app is served while it is filmed (the screenshot scripts' port). */
export const server = { port: PORT, origin: ORIGIN };

/**
 * The video. 886 × 1920 is what App Store Connect takes for every iPhone
 * from 6.1″ to 6.9″; at scale 2 the app is laid out 443 × 960 pt, an iPhone
 * Pro Max. reference/app-preview-specs.md has the numbers and their source.
 */
export const video = {
  width: 886,
  height: 1920,
  scale: 2,
  fps: 30,
  // Apple takes 15 to 30 seconds. A film that comes out longer than `maxSeconds`
  // is played a little faster (up to 15 %); past that the run stops.
  minSeconds: 15,
  maxSeconds: 29.5,
  // The room an iPhone keeps for the status bar and the home indicator, in pt.
  safeArea: { top: 59, bottom: 34 },
  // The status bar and the home indicator a screen recording has. false leaves them out.
  statusBar: { time: '9:41' },
  // A dot where each tap lands (Apple: "touch hotspots").
  touchDots: true,
  // A soundtrack, as a path from the repo's root — only music Ahmad may use
  // for advertising, everywhere. null: a silent track (previews play muted).
  music: null,
};

export const locales = ['de', 'en'];
export const browserLocale = { de: 'de-DE', en: 'en-GB' };

/** The app's settings as it would have stored them, and the demo's state: scanned, unlocked once it is for sale, no dry run. */
export const prefs = lang => Object.fromEntries(Object.entries(demoPrefs({ lang, owned: ON_SALE })).filter(([, v]) => v !== null));

/** Before the camera runs: a fresh demo library, home. */
export async function prepare(page, w) {
  await start(page, demoPrefs({ lang: w.lang, owned: ON_SALE }));
}

/* ------------------------------------------------------------ what is tapped */

const button = label => `button${aria(label)}`;
const textButton = text => `button:has-text("${text}")`;

/**
 * The parts a chapter may light up or move in on, by name. The store
 * screenshots' marks (scripts/lib/shots.mjs › SCREENS) all work here, plus
 * what only the film needs.
 */
export const marks = w => ({
  ...Object.assign({}, ...SCREENS.filter(s => s.marks).map(s => s.marks(w))),
  paris: tripCard(w, 'Paris'),
  'create-album': textButton(w.t.createAlbum),
  'confirm-album': `[role="alertdialog"] ${textButton(w.t.createAlbum)}`,
  similar: textButton(w.t.similarTile),
  'first-group': 'main button >> nth=0',
  'cleanup-button': textButton(w.t.cleanupButton),
  'review-all': textButton(w.t.reviewAll),
  keep: button(w.t.keep),
  delete: button(w.t.delete),
  back: button(w.t.back),
});

/* -------------------------------------------------------------- the chapters */

// The story: what the app found (the clean-up card) → a trip becomes an album
// (before the sale: a trip found by itself) → the best of near-identical shots → swiping through what can go → the icon
// and the name.
export const chapters = [
  {
    id: 'intro',
    caption: 'intro',
    hold: 2.0,
    run: async a => {
      await a.pause(0.4);
      await a.spotlight('cleanup', 1.1);
      await a.pause(0.2);
    },
  },
  {
    id: 'trips',
    caption: ON_SALE ? 'trips' : 'tripsFound',
    hold: 2.0,
    run: async a => {
      await a.scrollTo('paris', { block: 'center' });
      await a.pause(0.4);
      await a.tap('paris');
      await a.pause(0.9);
      if (!ON_SALE) {
        // The trip's own photos, named after the place and the month.
        await a.pause(2.2);
        return;
      }
      await a.tap('create-album');
      await a.pause(0.6);
      await a.tap('confirm-album');
      // The toast: "Album angelegt".
      await a.pause(1.3);
    },
  },
  {
    id: 'best',
    caption: 'best',
    hold: 2.0,
    setup: async a => {
      await a.tap('back', { dot: false });
      await a.pause(0.5);
      await a.page.evaluate(() => window.scrollTo(0, 0));
      await a.tap('similar', { dot: false });
      await a.pause(0.6);
    },
    run: async a => {
      await a.tap('first-group');
      await a.pause(0.8);
      await a.spotlight('best', 1.2);
      await a.pause(0.3);
    },
  },
  {
    id: 'review',
    caption: 'review',
    hold: 2.0,
    setup: async a => {
      await a.tap('back', { dot: false });
      await a.pause(0.4);
      await a.tap('back', { dot: false });
      await a.pause(0.5);
      await a.page.evaluate(() => window.scrollTo(0, 0));
      await a.tap('cleanup-button', { dot: false });
      await a.pause(0.5);
      await a.tap('review-all', { dot: false });
      await a.pause(0.7);
    },
    run: async a => {
      // The review with its card and the two buttons: the still the App
      // Store shows where the video does not play.
      a.poster();
      await a.pause(0.5);
      await a.tap('delete');
      await a.pause(0.7);
      await a.tap('keep');
      await a.pause(0.7);
      await a.tap('delete');
      await a.pause(0.8);
    },
  },
  { id: 'end', card: true, seconds: 2.5 },
];
