// The film: Shoppinglist's App Store preview, chapter by chapter. This file
// and the copy next to it (copy.<lang>.json) are all that is about this app —
// the scripts play any storyboard.
//
// A chapter is a caption and what happens after it:
//   caption  the key of its line in copy.<lang>.json › captions. It stands on
//            the frozen screen for `hold` seconds, then the screen comes alive.
//   hold     how long the caption stands, with its fades (about 0.6 s of it).
//   setup    (optional) gets the app somewhere else first, off camera; the
//            video dissolves to it.
//   run      what is filmed: `a` taps, types and lights things up (the verbs
//            are in scripts/film.mjs › Actor), `w` are the app's own words
//            in the language being filmed (scripts/lib/shots.mjs › words).
//   card     the end card instead: the icon, the name and the points from
//            copy.<lang>.json › card, for `seconds`.
//
// Every label a tap needs comes from the app's strings (`w.t`), and every
// item by its German catalogue name (`w.name('Karotten')`), like the store
// screenshots — one storyboard films every language, and a renamed button
// stops the run with a message instead of filming the wrong thing.
import { PORT, ORIGIN, SCREENS, aria, home, listTile, loadSource, seed, words } from '../../../../scripts/lib/shots.mjs';

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
export const browserLocale = { de: 'de-DE', en: 'en-GB', ar: 'ar' };

/** The app's settings as it would have stored them. */
export const prefs = lang => ({ 'shoppinglist-lang': lang, 'shoppinglist-theme': 'light' });

/**
 * What is on the lists when the film starts — fewer things than the store
 * screenshots show, so what is added in the film lands where the eye is.
 * By the catalogue's German names, like scripts/lib/shots.mjs › DEMO.
 */
const START = {
  supermarket: { items: ['Milch', 'Brot'], ticked: [] },
  drugstore: { items: ['Zahnpasta', 'Duschgel', 'Windeln', 'Feuchttücher', 'Sonnencreme'], ticked: ['Duschgel'] },
  clothing: { items: ['Socken', 'Winterjacke', 'Sneaker'], ticked: [] },
};

/** Before the camera runs: fill the app by using it, and go back to the start. */
export async function prepare(page, w) {
  await home(page);
  const demo = Object.entries(START).map(([id, d]) => ({ list: w.lists[id], entries: d.items.map(w.name), ticked: d.ticked.map(w.name) }));
  await seed(page, { ...w, demo });
  await home(page);
}

/* ------------------------------------------------------------ what is tapped */

const field = w => `input${aria(w.t.addPlaceholder)}`;
/** A suggestion chip under the add field. */
const chip = (w, de) => `button[role="listitem"]${aria(w.f(w.t.addNamed, { name: w.name(de) }))}`;
/** A row of the results that typing brings up. */
const match = (w, de) => `ul${aria(w.t.suggestions)} button:has-text("${w.name(de)}")`;
/** An item's row on the list: a tap ticks it off. */
const tick = (w, de) => `button${aria(w.f(w.t.markDone, { name: w.name(de) }))}`;
/** Shopping mode's big button. */
const intoBasket = w => `section${aria(w.t.nextUp)} button:has-text("${w.t.intoBasket}")`;

/**
 * The parts a chapter may light up or move in on, by name. The store
 * screenshots' marks (scripts/lib/shots.mjs › SCREENS) all work here, plus
 * what only the film needs.
 */
export const marks = w => ({
  ...Object.assign({}, ...SCREENS.filter(s => s.marks).map(s => s.marks(w))),
  'add-field': field(w),
  // The bag: in a list's dock, or in shopping mode's head.
  bag: ':is(button, span):has(> img[src="/icon.png"])',
});

/* -------------------------------------------------------------- the chapters */

// The story (Bring!'s preview has the same build: a line, then the app doing
// it): your lists → a list for every shop → adding → ticking off into the
// bag, until everything is in it → the icon and the name.
export const chapters = [
  {
    id: 'intro',
    caption: 'intro',
    hold: 2.0,
    run: async a => {
      await a.pause(0.6);
    },
  },
  {
    id: 'lists',
    caption: 'lists',
    hold: 2.0,
    run: async (a, w) => {
      await a.tap('new-list');
      await a.pause(0.75);
      await a.spotlight('types', 1.1);
      await a.tap(`[role="dialog"] button${aria(w.t.cancel)}`);
      await a.pause(0.5);
      await a.tap('list-supermarket');
      await a.pause(0.85);
    },
  },
  {
    id: 'add',
    caption: 'add',
    hold: 1.6,
    run: async (a, w) => {
      await a.tap(chip(w, 'Äpfel'));
      await a.pause(0.5);
      await a.tap(chip(w, 'Bananen'));
      await a.pause(0.6);
      await a.type('add-field', w.typed);
      await a.spotlight(['add-bar', 'matches'], 1.0);
      await a.tap(match(w, 'Karotten'));
      await a.blur();
      await a.pause(0.6);
      // The list with what was just added, the bag and the button: the still
      // the App Store shows where the video does not play.
      a.poster();
      await a.pause(0.25);
    },
  },
  {
    id: 'shop',
    caption: 'shop',
    hold: 2.0,
    run: async (a, w) => {
      await a.tap(tick(w, 'Äpfel'));
      await a.pause(0.7);
      await a.tap(tick(w, 'Brot'));
      await a.pause(0.75);
      await a.tap('start');
      await a.pause(0.85);
      // Three are left: each tap sends the next one into the bag.
      for (let i = 0; i < 3; i++) {
        await a.tap(intoBasket(w));
        await a.pause(0.55);
      }
      // "Alles im Korb!"
      await a.pause(1.1);
    },
  },
  { id: 'end', card: true, seconds: 2.5 },
];
