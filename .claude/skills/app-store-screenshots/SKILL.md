---
name: app-store-screenshots
description: Regenerate the raw store screenshots of Bildklar (npm run screenshots → screenshots/<de|en>/ for the App Store and <de|en>-android/ for Google Play, ten screens per language, each with its marks), or capture every screen for a UI review (npm run ui-review). Use when asked to update, refresh or regenerate store screenshots, to add, drop or reorder a screen in the set, to mark a part of a screen for a call-out, or to look at the app before and after a UI change. The composed, captioned upload set is the store-screenshot-studio skill.
---

# Store screenshots (raw captures)

`scripts/screenshots.mjs` builds the app (the web build, with the **demo
library**: `src/native/demo/`), clicks its way to each screen and captures
**nine screens per language** as plain app screens, and next to each one where
its parts are (`<screen>.marks.json`). `store-screenshot-studio`
(`npm run store-screenshots`) then composes and captions them at the sizes the
App Store and Google Play ask for, and lifts the marked parts out of the phone.
Upload those, not these: the raw size (1290 × 2796) fits no required slot.

**The demo photos are real** (`npm run demo-photos`: `scripts/demo-photos.py`
puts the test library's CC0 photos without identifiable people into the demo,
id by id, along `src/native/demo/manifest.json` — each photo's time and place,
kept by hand —; `scripts/demo-facts.mjs` computes `facts.json` from them;
`npm run ai:demo` the AI's scores). They are public domain: fine for the store
set. Only the screenshots, notes and failed shots are drawn.

## Run it

```bash
npx playwright install chromium                      # once per Mac
npm run screenshots                                  # all of them, DE and EN, iPhone and Android → screenshots/<de|en>/ and <de|en>-android/
npm run screenshots -- --ios                         # only the iPhone ones (App Store)
npm run screenshots -- --android                     # only Android's words (Google Play)
npm run screenshots -- --only 02-home,06-group       # just these, e.g. after a fix
npm run store-screenshots                            # the framed upload set from these
```

Run it on the Mac, so the system font is Apple's own.

## What comes out

`screenshots/de/` and `screenshots/en/` (and `…-android/`), 1290 × 2796 PNG
(430 × 932 pt @3x):

| # | file | screen | how it is reached |
|---|---|---|---|
| 2 | `02-home` | home: the clean-up card, the tiles, the trips | start screen |
| 3 | `03-trips` | the trips (all trips with more than four; the demo has four, so home scrolled to them) | *Alle Reisen* or a scroll |
| 4 | `04-trip` | *Paris, Mai 2026* with *Album erstellen* / *Ordner erstellen* | its card |
| 5 | `05-album` | the same after making the album: the toast | the button and the confirmation |
| 6 | `06-group` | a group of near-identical photos, the best one marked | *Fast gleiche* › the first group |
| 7 | `07-blurry` | the blurry list, *Sicher* | the *Unscharfe* tile |
| 8 | `08-review` | the review, half a swipe to the left (the *Löschen* stamp) | *Aufräumen* › *Durchgehen* |
| 9 | `21-duplicates` | the duplicates: each series with the one to keep starred | the *Duplikate* tile |
| 10 | `42-search-results` | search: *Stadt* / *city* picked, the photos the on-device AI finds | *Ordnen* › *Suchen*, the word, Enter |
| 11 | `43-like` | similar photos: a search result on top, its look-alikes below | the same, then the first result |
| 12 | `09-paywall` | the paywall, with the price — **for App Review's in-app purchase screenshot, not for the set** | Settings › *Bildklar freischalten*, not owned |

A full run empties the folders first, so a screen dropped from the list can't
linger. A screen that can't be reached is reported by name (`✗ de/04-trip: …`),
the others are still taken, and the run exits non-zero.

The first scan (`01-scan`) left the set in November 2026 — a progress bar says
little in a listing; `npm run ui-review` still takes it.

## The marks

The store set lifts pieces of a screen out of the phone (the studio's
call-outs). It finds them by name in `screenshots/<dir>/<screen>.marks.json`,
which this run writes with each capture: every mark's box in fractions of the
screen (clipped to it), and its corner radius, measured in the running app in
that language.

Each store screen names its marks in `SCREENS` (`scripts/lib/shots.mjs`):

```js
marks: w => ({ 'trip-1': `${tripCards(w)} >> nth=0`, 'trip-2': `${tripCards(w)} >> nth=1` }),
```

a name and a selector, built from the app's own strings like the clicks are.

| screen | marks |
|---|---|
| `02-home` | `cleanup`, `trip-1`, `tiles` |
| `03-trips` | `trip-1`, `trip-2` |
| `04-trip` | `album` |
| `05-album` | `done`, `toast` |
| `06-group` | `best` |
| `07-blurry` | `grid` |
| `08-review` | `card` |
| `21-duplicates` | `group-1`, `group-2` |
| `42-search-results` | `word` |
| `43-like` | `photo` |
| `09-paywall` | `sheet` |

- **The names are the contract** with the studio's config (`"mark": "best"`).
  When a screen changes, mend the selector and keep the name.
- A mark that is missing (or almost nothing of it is on screen) stops that
  screen — no capture is written with stale marks.
- `npm run ui-review` takes no marks.

## The demo state

`prefs()` in `scripts/lib/shots.mjs` sets the demo before the app starts:
access granted, the library scanned, the unlock bought, no dry run — each can
be changed per screen (`prefs: { scanned: false }`, `{ owned: false }`,
`{ access: 'limited' }`). The Android run also sets
`bildklar-dev-platform` = `android` (honoured by development and demo builds
only), so the app uses Android's words.

## Adding, dropping or reordering a screen

Edit `SCREENS` in `scripts/lib/shots.mjs`. Each entry is a `name` (its
filename; the number is the store order), `store: true` for the store set, and
an optional `run(page, w)` that gets there from a fresh load of home. The app
has no router, so every screen is reached by clicking. **The labels the clicks
need are the app's own** — `w.t` is the language's block of
`src/translations.ts` (with Android's words merged in for the Android captures), `w.f`
is `fmt`, `w.p` is `plural` — so a renamed button can't silently break a
capture. Handles that have proved stable:

| target | selector |
|---|---|
| a trip's card | `tripCard(w, 'Paris')` — its label is `t.openTrip` |
| every trip card | `tripCards(w)` |
| a home tile | `button:has-text("<similarTile / blurryTile>")` |
| bar buttons (settings, back, rescan) | `button[aria-label="<their label>"]` |
| an open sheet | `[role="dialog"]`; a confirmation `[role="alertdialog"]` |
| a settings row | `main button:has-text("<its label>")` |

App Store Connect takes ten per slot, Google Play eight. Every store screen
also needs a slide in `store-screenshot-studio` (its
`config/screenshots.config.json` and both `config/copy.*.json`), its headline
may only claim what the capture shows, and the part the slide lifts needs a
mark (above).

## Every screen, for a UI review

```bash
npm run ui-review                                  # → screenshots/review/<variant>/
npm run ui-review -- --variant de-dark             # one variant
npm run ui-review -- --only 16-trip-menu,17-settings   # some screens
```

Five variants — German by day and at night, both also on a small iPhone
(375 × 667), and English with Android's words on a 360 × 800 phone — of every
screen in `SCREENS`, the store's and the others (permission, denied, limited
access, the similar list, the clean-up view, the review's end, the trip menu,
the settings, dark mode). Run it before and after a change to a screen and
look at both.
