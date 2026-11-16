// Every screen of Bildklar, to look at before and after a UI change: German by
// day and by night (iPhone Pro Max and iPhone SE), and English with Android's
// wording on a small Android phone (360 × 800). Captures go to
// screenshots/review/<variant>/.
//
// Usage:  node scripts/ui-review.mjs
//         node scripts/ui-review.mjs --only 06-group,17-settings
//         node scripts/ui-review.mjs --variant de-dark
// Once per machine:  npx playwright install chromium
import path from 'path';
import { SCREENS, capture, onlyArg, root } from './lib/shots.mjs';

const VARIANTS = [
  { id: 'de-light', lang: 'de' },
  { id: 'de-dark', lang: 'de', theme: 'dark' },
  { id: 'en-android360', lang: 'en', platform: 'android', viewport: { width: 360, height: 800, scale: 2 } },
  // The smallest iPhone still sold (iPhone SE, 375 × 667), by day and by night.
  { id: 'de-light-se', lang: 'de', viewport: { width: 375, height: 667, scale: 2 } },
  { id: 'de-dark-se', lang: 'de', theme: 'dark', viewport: { width: 375, height: 667, scale: 2 } },
];
const argv = process.argv.slice(2);
const pick = argv.includes('--variant') ? argv[argv.indexOf('--variant') + 1] : null;
const variants = (pick ? VARIANTS.filter(v => v.id === pick) : VARIANTS).map(v => ({ viewport: { width: 430, height: 932, scale: 2 }, ...v }));
if (!variants.length) { console.error(`Unknown variant "${pick}". One of: ${VARIANTS.map(v => v.id).join(', ')}`); process.exit(1); }

const failed = await capture({
  variants,
  // A screen that sets its own theme is shown in the dark variants anyway.
  screens: SCREENS.filter(s => !s.prefs?.theme),
  outDir: path.join(root, 'screenshots', 'review'),
  onlyNames: onlyArg(argv),
});
console.log(`\n${failed.length ? 'Done, with gaps' : 'Done'} → screenshots/review/`);
if (failed.length) process.exit(1);
