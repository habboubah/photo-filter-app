// Every screen of Bildklar, to look at before and after a UI change: German by
// day and by night (iPhone Pro Max and iPhone SE), with large text and on the
// narrowest phones (320 × 568), and English with Android's wording on a small
// Android phone (360 × 800) and a foldable open (840 × 1000) — the first run included (the
// welcome, the first scan, the reveal, the guided review, a tip, the safety
// nets). Captures go to screenshots/review/<variant>/.
//
// Usage:  node scripts/ui-review.mjs
//         node scripts/ui-review.mjs --only 06-group,17-settings
//         node scripts/ui-review.mjs --variant de-dark
// Once per machine:  npx playwright install chromium
import path from 'path';
import { FIRST_RUN_SCREENS, SCREENS, capture, onlyArg, root } from './lib/shots.mjs';

const VARIANTS = [
  { id: 'de-light', lang: 'de' },
  { id: 'de-dark', lang: 'de', theme: 'dark' },
  { id: 'en-android360', lang: 'en', platform: 'android', viewport: { width: 360, height: 800, scale: 2 } },
  // The smallest iPhone still sold (iPhone SE, 375 × 667), by day and by night.
  { id: 'de-light-se', lang: 'de', viewport: { width: 375, height: 667, scale: 2 } },
  { id: 'de-dark-se', lang: 'de', theme: 'dark', viewport: { width: 375, height: 667, scale: 2 } },
  // Large text (the system's text size at 135 %): long German labels must wrap, never be cut.
  { id: 'de-light-large', lang: 'de', fontScale: 1.35 },
  // The narrowest phones and split screen (320 × 568): three tiles to a row, smaller titles, the review's buttons on screen.
  { id: 'de-light-320', lang: 'de', viewport: { width: 320, height: 568, scale: 2 } },
  // A foldable open or a tablet, where Android 16 runs the app at any size (840 × 1000): the wide column, more photos to a row.
  { id: 'en-android-wide', lang: 'en', platform: 'android', viewport: { width: 840, height: 1000, scale: 1 } },
];
const argv = process.argv.slice(2);
const pick = argv.includes('--variant') ? argv[argv.indexOf('--variant') + 1] : null;
const variants = (pick ? VARIANTS.filter(v => v.id === pick) : VARIANTS).map(v => ({ viewport: { width: 430, height: 932, scale: 2 }, ...v }));
if (!variants.length) { console.error(`Unknown variant "${pick}". One of: ${VARIANTS.map(v => v.id).join(', ')}`); process.exit(1); }

const failed = await capture({
  variants,
  // A screen that sets its own theme is shown in the dark variants anyway.
  screens: [...SCREENS, ...FIRST_RUN_SCREENS].filter(s => !s.prefs?.theme),
  outDir: path.join(root, 'screenshots', 'review'),
  onlyNames: onlyArg(argv),
});
console.log(`\n${failed.length ? 'Done, with gaps' : 'Done'} → screenshots/review/`);
if (failed.length) process.exit(1);
