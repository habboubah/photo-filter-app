# Working on Shoppinglist

What the README leaves out: where things live, the single checks, the icon,
the web app, the share page and adding a language. The rules the code follows
are in [CLAUDE.md](../CLAUDE.md).

## Project layout

| Path | What |
|---|---|
| `src/App.tsx` | Navigation (pushed screens, no router), toasts, sheets |
| `src/store.ts` | All state, persisted to `localStorage` (`shoppinglist-*` keys; `korb-*` ones from an earlier version move over at start) |
| `src/logic.ts` | Pure logic — merging, parsing, ranking, storage validation (tested in `logic.test.ts`) |
| `src/share.ts` | A list inside a link, and back |
| `src/links.ts`, `src/platform.ts` | The links *Über die App* opens; which app we run in |
| `src/data/defaults.ts` | Built-in list types, suggestions and aisle sections |
| `src/translations.ts` | All UI text: `de`, `en`, `ar`, and Android's wording |
| `src/index.css` | The design tokens: themes, the accent, list hues, radii, shadows, fonts, motion |
| `src/components/` | Screens (`*View`) and sheets (`*Sheet`) |
| `src/ui/` | Shared primitives: Screen, Sheet, Button, Field, Picture, Ring, Toast … |
| `src/assets/fonts/` | Sora (Latin subset, SIL Open Font License), the font of titles and numbers — bundled, never loaded from a server |
| `ios/`, `android/` | The Capacitor shells |
| `ios/AppReviewRecorder/` | The UI test that records the App Review video, and its `scenes.json` (its README is the guide) |
| `scripts/` | Release (`release.js`, `release-android.js`), screenshots (`screenshots.mjs`, `ui-review.mjs`, `lib/shots.mjs`), the checks, `icon-assets.mjs`, the App Review rehearsal and recording (`rehearse-app-review.mjs`, `record-app-review.sh`, `record-watch.sh`) |
| `store/` | Store texts for both stores (`listing.md`), the privacy pages, the share page |
| `release-notes/` | Google Play's release notes per version and language |
| `docs/` | Features, the concept, the release guides, what is left to do |
| `.claude/skills/` | Design, UX, animation, screenshot and release skills (shared with budget-app), and `app-preview-video`: the App Store preview video's scripts, storyboard and words |

## The checks one by one

`npm run check` runs all of these in order; each also runs alone:

```bash
npm run lint             # type-check
npm test                 # unit tests
npm run check:security   # no console.* in app source, npm audit
npm run check:privacy    # drives the built app: no request may leave it
npm run check:perf       # bundle budget, no long task while typing
npm run audit:contrast   # every accent, theme and list colour against WCAG AA
```

## Building for a phone

- **Xcode, the first time:** the **App** target → *Signing & Capabilities* →
  your team. After changing web code, `npm run build:ios` again.
- **Android:** `npm run build:android`, then ▶ Run in Android Studio
  ([ANDROID_RELEASE.md](ANDROID_RELEASE.md)).
- **Icon and splash screens** come from the icon picture, `assets/icon-source.png` (and `icon-source-android.png`, the same picture smaller for Android's round mask). The original is `assets/icon-original.jpg`:

  ```bash
  node scripts/icon-assets.mjs && npm run assets:generate
  ```

## The web app

Host `dist/` (`npm run build:web`) on any HTTPS host, open it in the phone's
browser and add it to the home screen: it opens full-screen and works offline.
The iPhone app, the Android app and the web app each keep their own data —
*Einstellungen › Datensicherung* moves lists between them.

## Screenshots

`screenshots/store/iphone-6.3/` is the App Store set, `play-phone/` and
`play-feature/` are Google Play's; `contact-sheet.png` shows the App Store set,
`contact-sheet-play-phone.png` Google Play's. A slide is one flat colour, a
headline, a large phone, a piece of the screen lifted out of it and a sticker
on the seam to the next slide: the headlines are in
`.claude/skills/store-screenshot-studio/config/copy.<de|en>.json`, the
composition in `config/screenshots.config.json` next to them, and why it is
composed that way in `reference/composition.md` there. `npm run screenshots`
also writes `<screen>.marks.json` next to each capture — where the add field,
an aisle's card, a tile is — and the set lifts those parts by name; they are
named in `scripts/lib/shots.mjs` (`marks`).
`npm run ui-review` takes every screen by day and at night (iPhone Pro Max
and iPhone SE), in Arabic and on a small Android phone — run it before and after a UI change. Run all of them on
the Mac, so the font and emoji are Apple's.

## The app preview video

`npm run app-preview` makes the video that plays in front of the screenshots
on the App Store listing: `screenshots/store/app-preview/app-preview-<de|en>.mp4`
(886 × 1920, about 28 seconds), a `poster-<lang>.png` and a
`contact-sheet-<lang>.png` — a still every half second, the way to look at
the video without playing it. It films the built app while it is really used
(the chapters and their taps are in
`.claude/skills/app-preview-video/config/storyboard.mjs`, found by the app's
own strings like the screenshots' clicks), lays the captions
(`config/copy.<de|en>.json` there), a light on a part of the screen, touch
dots, the status bar and the end card over it, and checks the file against
Apple's specification (`reference/app-preview-specs.md` there, with the
upload steps). `npm run app-preview -- --compose` makes the video again from
the same film, for a changed caption or timing. It needs ffmpeg
(`brew install ffmpeg`). Run it on the Mac, so the emoji and the status
bar's font are Apple's and the film is smooth.

## The share page

Shared links point to `https://habboubah.github.io/privacy-policy/shopping-list/share/`.
That page is `store/share/index.html`; publish it (and the updated privacy
pages) by copying them into the `privacy-policy` repo and pushing:

```bash
mkdir -p ../privacy-policy/shopping-list/share ../privacy-policy/shopping-list/de
cp store/share/index.html ../privacy-policy/shopping-list/share/index.html
cp store/privacy/index.html ../privacy-policy/shopping-list/index.html
cp store/privacy/de/index.html ../privacy-policy/shopping-list/de/index.html
cd ../privacy-policy && git add shopping-list && git commit -m "Update the shopping list's privacy pages and share page" && git push
```

Until it is published, shared links open a 404. The list still arrives: the
receiver copies the message and pastes it into the app ("Neue Liste" ›
"Geteilte Liste einfügen", `src/components/PasteListSheet.tsx`;
`payloadFromText` in `src/share.ts` finds the list in the text). "In der App öffnen" uses the `shoppinglist://` URL scheme, registered (beside the older `korb://`) in
`ios/App/App/Info.plist` and `android/app/src/main/AndroidManifest.xml`.

## Adding a language

Add a block to `src/translations.ts` (TypeScript lists any missing key; give
`androidStrings` its twin for strings that name iOS or iCloud) and a name for
each type, section and item in `src/data/defaults.ts` (the tests fail until
every one has it). A right-to-left language sets `dir: 'rtl'` in its block, as
Arabic does; the layout then mirrors itself.
