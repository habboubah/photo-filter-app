---
name: app-store-screenshots
description: Regenerate the raw store screenshots of Shoppinglist (npm run screenshots → screenshots/<de|en>/, nine screens per language, each with its marks), or capture every screen for a UI review (npm run ui-review). Use when asked to update, refresh or regenerate store screenshots, to add, drop or reorder a screen in the set, to mark a part of a screen for a call-out, or to look at the app before and after a UI change. The composed, captioned upload set is the store-screenshot-studio skill.
---

# Store screenshots (raw captures)

`scripts/screenshots.mjs` builds the app, fills it with a shopping week by
actually using it (typing items, ticking some off) and captures **nine screens
per language** as plain app screens, and next to each one where its parts are
(`<screen>.marks.json`). `store-screenshot-studio`
(`npm run store-screenshots`) then composes and captions them at the sizes the
App Store and Google Play ask for, and lifts the marked parts out of the phone.
Upload those, not these: the raw size (1290 × 2796) fits no required slot.

## Run it

```bash
npx playwright install chromium        # once per Mac
npm run screenshots                    # all nine, DE and EN
npm run screenshots -- --only 02-list,08-settings    # just these, e.g. after a fix
npm run store-screenshots              # the framed upload set from these
```

Run it on the Mac, so the emoji and system font are Apple's own.

## What comes out

`screenshots/de/` and `screenshots/en/`, 1290 × 2796 PNG (430 × 932 pt @3x):

| # | file | screen | how it is reached |
|---|---|---|---|
| 1 | `01-home` | home: the hero with what is still to buy, three lists | start screen |
| 2 | `02-list` | the Supermarkt list, sorted by aisle | its card |
| 3 | `03-add` | typing "2 kg Kar": live suggestions with the quantity | the add field |
| 4 | `04-suggestions` | *Alle Vorschläge*: the catalogue as a picture grid | the chip at the rail's end |
| 5 | `05-shopping` | shopping mode, "6 von 14" | *Einkauf starten*, three more ticked |
| 6 | `06-new-list` | *Neue Liste*: the list types | the docked button on home |
| 7 | `07-item` | *Artikel bearbeiten*: quantity, unit, note, picture | the pencil on Tomaten |
| 8 | `08-settings` | *Einstellungen*: the backup hint ("Die App speichert alles nur auf diesem Gerät"), language, appearance, colour | the gear on home |
| 9 | `09-dark` | the Supermarkt list at night | the list with the theme set to dark |

A full run empties both folders first, so a screen dropped from the list can't
linger. A screen that can't be reached is reported by name (`✗ de/07-item: …`),
the others are still taken, and the run exits non-zero.

## The marks

The store set lifts pieces of a screen out of the phone — the add field, an
aisle's card, a tile (the studio's call-outs). It finds them by name in
`screenshots/<de|en>/<screen>.marks.json`, which this run writes with each
capture: every mark's box in fractions of the screen, and its corner radius,
measured in the running app in that language.

Each store screen names its marks in `SCREENS` (`scripts/lib/shots.mjs`):

```js
marks: w => ({ 'add-bar': addBar(w), matches: `ul${aria(w.t.suggestions)}` }),
```

a name and a selector, built from the app's own strings like the clicks are.

| screen | marks |
|---|---|
| `01-home` | `list-supermarket`, `list-drugstore`, `list-clothing`, `new-list` |
| `02-list`, `09-dark` | `add-bar`, `suggestions`, `aisle-1` … `aisle-3`, `start` |
| `03-add` | `add-bar`, `matches` |
| `04-suggestions` | `search`, `tile-milk`, `tile-apples`, `tile-bananas`, `tile-bread`, `tile-eggs`, `tile-chicken`, `tile-tomatoes`, `tile-cucumber`, `tile-yoghurt` |
| `05-shopping` | `progress`, `next` |
| `06-new-list` | `types`, `type-supermarket`, `type-produce`, `type-butcher`, `type-bakery`, `type-drinks`, `type-drugstore`, `type-household`, `type-clothing`, `type-pharmacy`, `type-hardware` |
| `07-item` | `quantity`, `stepper`, `units` |
| `08-settings` | `display`, `backup`, `backup-note` |

- **The names are the contract** with the studio's config (`"mark": "add-bar"`).
  When a screen changes, mend the selector and keep the name.
- A mark has to be wholly on the screen when the capture is taken. One that is
  missing or cut off stops that screen (`✗ de/02-list: mark "aisle-1" is not on
  the screen …`) — no capture is written with stale marks.
- The corner radius is the element's own, or that of the first thing in it when
  it has none (an aisle's card is drawn by its rows).
- `npm run ui-review` takes no marks.

## The demo data

`DEMO` in `scripts/lib/shots.mjs`: Supermarkt with fourteen items (three
ticked), Drogerie with five (one ticked), Kleidung with three. Items are named
by the catalogue's German names and looked up in each language, so every one
gets its picture and its aisle; a name that is not in
`src/data/defaults.ts` stops the run with a message.

## Adding, dropping or reordering a screen

Edit `SCREENS` in `scripts/lib/shots.mjs`. Each entry is a `name` (its
filename; the number is the store order), `store: true` for the store set, and
an optional `run(page, w)` that gets there from a fresh load of home. The app
has no router, so every screen is reached by clicking. **The labels the clicks
need are the app's own** — `w.t` is the language's block of
`src/translations.ts`, `w.f` is `fmt`, `w.lists` the starter lists' names,
`w.name('Tomaten')` an item's name in that language — so a renamed button
can't silently break a capture. Handles that have proved stable:

| target | selector |
|---|---|
| a list's card on home | `button[aria-label^="<openList with its name>"]` — `openList(page, w, id)` |
| the add field | `input[aria-label="<addPlaceholder>"]` |
| tick an item | `button[aria-label="<markDone with its name>"]` |
| an item's pencil | `button[aria-label="<editItem with its name>"]` |
| bar buttons (settings, share, list menu, back) | `button[aria-label="<their label>"]` |
| an open sheet | `[role="dialog"]`; its close and confirm buttons by `aria-label` |
| a settings row | `main button:has-text("<its label>")` |

App Store Connect takes ten per slot, Google Play eight (the Play target lists
its eight in the studio's config). Every store screen also needs a slide in
`store-screenshot-studio` (its `config/screenshots.config.json` and both
`config/copy.*.json`), its headline may only claim what the capture shows, and
the part the slide lifts needs a mark (above).

## Every screen, for a UI review

```bash
npm run ui-review                                  # → screenshots/review/<variant>/
npm run ui-review -- --variant de-dark             # one variant
npm run ui-review -- --only 08-settings,11-types   # some screens
```

Four variants — German by day, German at night, Arabic (right to left) and
English on a 360 × 800 Android phone — of every screen in `SCREENS`, the
store's and the others (the end of the settings, list types, a type, the list
menu, a list's actions, the reorder view, the delete-all dialog). Run it
before and after a change to a screen and look at both.
