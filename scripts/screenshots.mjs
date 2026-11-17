// Raw store screenshots of Bildklar, in German and English: nine screens per
// language (seven while nothing is for sale: no album, no paywall — see
// scripts/lib/shots.mjs) at 1290 × 2796 (430 × 932 pt @3x), as plain app screens, from the
// demo library. Next to each, <screen>.marks.json says where its parts are
// (the clean-up card, the best shot …), for the pieces the store set lifts
// out of the phone. `npm run store-screenshots` then frames and captions them
// at the sizes the stores ask for — upload those, not these.
//
// Usage:  npm run screenshots
//         npm run screenshots -- --only 02-home,06-group
//         npm run screenshots -- --android   (Android's words: Ordner, Papierkorb → screenshots/<de|en>-android/, for Google Play)
// Once per machine:  npx playwright install chromium
// Output: screenshots/<de|en>/01-scan.png, 01-scan.marks.json …
//
// The demo photos are real CC0 photos (scripts/demo-photos.py), fine for the
// store set. Run it on the Mac, so the
// system font is Apple's own. The screens and how each is reached:
// scripts/lib/shots.mjs.
import path from 'path';
import { SCREENS, capture, onlyArg, root } from './lib/shots.mjs';

const outDir = path.join(root, 'screenshots');
const android = process.argv.includes('--android');
const failed = await capture({
  variants: android
    ? [{ id: 'de-android', lang: 'de', platform: 'android' }, { id: 'en-android', lang: 'en', platform: 'android' }]
    : [{ id: 'de', lang: 'de' }, { id: 'en', lang: 'en' }],
  screens: SCREENS.filter(s => s.store),
  outDir,
  onlyNames: onlyArg(),
  marks: true,
  forStore: true,
});
console.log(`\n${failed.length ? 'Done, with gaps' : 'Done'} → screenshots/<de|en>${android ? '-android' : ''}/  (1290 × 2796). Next: npm run store-screenshots`);
if (failed.length) process.exit(1);
