// Raw store screenshots of Bildklar, in German and English: eleven screens per
// language (ten while nothing is for sale: no paywall — see
// scripts/lib/shots.mjs) — home, trips, a trip, the album, a group, the blurry
// ones, the swipe review, duplicates, search, similar photos (the paywall) —
// at 1290 × 2796 (430 × 932 pt @3x), as plain app screens, from the demo
// library. Next to each, <screen>.marks.json says where its parts are
// (the clean-up card, the best shot …), for the pieces the store set lifts
// out of the phone. `npm run store-screenshots` then frames and captions them
// at the sizes the stores ask for — upload those, not these.
//
// Usage:  npm run screenshots                (iPhone and Android, both languages — all npm run store-screenshots needs)
//         npm run screenshots -- --only 02-home,06-group
//         npm run screenshots -- --ios         (only the iPhone ones → screenshots/<de|en>/, for the App Store)
//         npm run screenshots -- --android     (only Android's: Ordner, Papierkorb → screenshots/<de|en>-android/, for Google Play)
// Once per machine:  npx playwright install chromium
// Output: screenshots/<de|en>/02-home.png, 02-home.marks.json …  (a full run
// empties the folder first, so screens that left the set leave with it)
//
// The demo photos are real CC0 photos (scripts/demo-photos.py), fine for the
// store set. Run it on the Mac, so the
// system font is Apple's own. The screens and how each is reached:
// scripts/lib/shots.mjs.
import path from 'path';
import { SCREENS, capture, onlyArg, root } from './lib/shots.mjs';

const outDir = path.join(root, 'screenshots');
// Both by default: the store set needs both (the App Store from the iPhone
// captures, Google Play and its feature graphic from the Android ones).
const onlyAndroid = process.argv.includes('--android');
const onlyIos = process.argv.includes('--ios');
const IOS = [{ id: 'de', lang: 'de' }, { id: 'en', lang: 'en' }];
const ANDROID = [{ id: 'de-android', lang: 'de', platform: 'android' }, { id: 'en-android', lang: 'en', platform: 'android' }];
const failed = await capture({
  variants: onlyAndroid ? ANDROID : onlyIos ? IOS : [...IOS, ...ANDROID],
  screens: SCREENS.filter(s => s.store),
  outDir,
  onlyNames: onlyArg(),
  marks: true,
  forStore: true,
});
const where = onlyAndroid ? 'screenshots/<de|en>-android/' : onlyIos ? 'screenshots/<de|en>/' : 'screenshots/<de|en>/ and <de|en>-android/';
console.log(`\n${failed.length ? 'Done, with gaps' : 'Done'} → ${where}  (1290 × 2796). Next: npm run store-screenshots`);
if (failed.length) process.exit(1);
