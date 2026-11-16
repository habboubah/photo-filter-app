# store-screenshot-studio

Turns the raw app captures in `screenshots/<locale>/` into store-ready marketing
screenshots — one flat brand colour, a big headline, a large phone, pieces of
the screen lifted out of it, stickers that run from slide to slide — plus the
Google Play feature graphic and a contact sheet per store.

## Prerequisites

- `npm install` (Playwright is already a devDependency of this repo)
- Chromium, once per machine: `npx playwright install chromium --only-shell`
- Python 3 for the validator — **standard library only**, nothing to install
- Raw captures present, with their marks: `npm run screenshots` (it writes
  `<capture>.marks.json` next to each capture — where the add field, an aisle's
  card, a tile … is — and the call-outs are found by those names)

No other dependencies. See "Dependencies" below for why.

## One command

```bash
npm run store-screenshots
```

Runs export → feature graphic → contact sheet → validate. Exits non-zero if any
file misses a store spec.

Individual steps, for iterating:

```bash
node .claude/skills/store-screenshot-studio/scripts/render.mjs --slide list --locale de --out /tmp/proof.png --scale 1
node .claude/skills/store-screenshot-studio/scripts/render.mjs --slide list --locale en --target play-phone --out /tmp/proof-play.png
node .claude/skills/store-screenshot-studio/scripts/export.mjs
node .claude/skills/store-screenshot-studio/scripts/feature_graphic.mjs
node .claude/skills/store-screenshot-studio/scripts/preview.mjs
python3 .claude/skills/store-screenshot-studio/scripts/validate.py
```

## Output

```
screenshots/store/
  iphone-6.3/{de,en}/01-home.png … 09-dark.png         1206×2622 PNG
  play-phone/{de,en}/01-home.jpg … 08-dark.jpg         1080×1920 JPEG, with the ribbon
  play-feature/{de,en}/feature-graphic.jpg             1024×500 JPEG, with the ribbon
  contact-sheet.png                                    the iPhone set
  contact-sheet-play-phone.png                         the Play set and the feature graphics
```

`iphone-6.3` is the set for App Store Connect's required *iPhone with Dynamic
Island (medium display)* slot; `play-phone` and `play-feature` are Google
Play's. Each run deletes and rewrites only the folders this script makes,
including ones from older configs (`apple-6.9`, `apple-6.5`); files next to
them (`play-icon-512.png`) are left alone.

The Play set carries the *Kostenlos* / *Free* ribbon and the price points
("Kein Abo"); the App Store set does not, because Apple rejects price words on
screenshots. See *Ribbon and points* in `SKILL.md`.

## Layout of the skill

| Path | What |
|---|---|
| `SKILL.md` | Trigger description and the workflow with its approval gates |
| `config/screenshots.config.json` | Slides (layout, phone, call-outs), stickers, targets, feature graphic |
| `config/theme.json` | Colours (lifted from `src/index.css`), fonts, backgrounds, the frame's colour |
| `config/copy.<locale>.json` | Headlines, sublines and points per language, plus `dir` for RTL |
| `templates/slide.html` + `slide.css` | The one template; layout switches on a data attribute |
| `assets/fonts/fonts.css` | The app's own fonts, loaded from `src/assets/fonts/` (Baloo 2, Nunito; SIL OFL 1.1, licence next to them) |
| `assets/stickers/` | Twelve original drawings (SVG) for the seams between slides |
| `assets/frames/README.md` | Why the device frame is CSS, not a PNG |
| `scripts/render.mjs` | One slide; also the shared renderer |
| `scripts/export.mjs` | Every slide × locale × target |
| `scripts/feature_graphic.mjs` | 1024×500 Play feature graphic |
| `scripts/preview.mjs` | Contact sheets, one per target |
| `scripts/validate.py` | Store compliance, headline rules, composition rules |
| `reference/` | Composition (what makes a set look designed), store size tables, copywriting rules |

Outside the skill: `scripts/lib/shots.mjs` names the marks (`marks` on each
store screen) and `npm run screenshots` measures them.

## Adding a slide

1. Add to `slides` in `config/screenshots.config.json`:
   ```json
   { "id": "basket", "raw": "10-basket.png", "layout": "bottom", "device": "iphone", "background": "peach",
     "callouts": [ { "mark": "basket", "scale": 1.14 } ] }
   ```
2. Name the mark on that screen in `scripts/lib/shots.mjs`
   (`marks: w => ({ basket: '#in-basket' })`) and capture it:
   `npm run screenshots -- --only 10-basket`.
3. Add `"basket": { "headline": "…", "subline": "…" }` to **every**
   `config/copy.<locale>.json`.
4. Move the stickers on its seams (`stickers`), rerun, look at both contact
   sheets. Array order is store order and sets the filename index.

Missing copy, a missing raw file, an unknown background, a mark the capture
does not have, a sticker that is not in `assets/stickers/` — each stops the run
with a message naming the slide. Nothing is skipped silently.

## Adding a language

Add `config/copy.<locale>.json` and the code to `locales`, and capture the
language (`variants` in `scripts/screenshots.mjs`). `"dir": "rtl"` turns the
set round — the copy and the ribbon by logical properties, the phones' lean,
a call-out's shift and the strip of stickers in the renderer — so there is no
mirrored sheet to maintain.

RTL was verified by rendering a throwaway Arabic locale, not just asserted. To
repeat it: copy `copy.en.json` to `copy.ar.json`, set `"dir": "rtl"`, translate one
slide, copy `screenshots/de/` to `screenshots/ar/`, add `ar` to `locales` and run
`render.mjs --locale ar`. Arabic headlines are set in Baloo Bhaijaan 2 (bundled);
the points fall through to the system's Arabic font, as in the app.

## Dependencies

Only Playwright, which this repo already had for capturing the raw screenshots.
Deliberately **not** added:

- **Pillow** — the validator needs image *dimensions*, which is a fixed-offset read
  in a PNG header and one marker scan in a JPEG. Roughly 25 lines of stdlib.
- **An image-generation API** — it would break determinism and would repaint the app
  UI it was supposed to preserve.
- **fastlane / frameit** — needs Ruby and ImageMagick, and this project does not use
  fastlane.
- **A web font at render time** — the fonts are files in this repo (the app's own),
  so a render works offline and cannot change when Google Fonts ships a new version.
- **Emoji or stock art for decoration** — Apple's and Google's emoji are not ours to
  put on artwork, and they differ per machine. The stickers are SVG drawn for this set.

## Prior art

Architecture ideas (not code) taken from:
`gitethanwoo/app-store-screenshot-studio` (MIT) — reference docs split out from the
skill, validation as a hard gate. `adamlyttleapps/claude-skill-aso-appstore-screenshots`
(MIT) — deterministic scaffold first, contact sheet. `ranahaani/claude-playstore-screenshots-generator`
(MIT) — derive brand colours from the app rather than inventing them.
`hypersocialinc/shots` (no licence declared — ideas only, nothing copied) — panoramic
background spanning a set. `anthropics/skills` (Apache 2.0) — SKILL.md frontmatter.

Composition ideas (not assets) from the listings that do well in this category,
Bring!'s above all: one flat brand colour, a headline sized for a thumbnail, UI
lifted out of the phone, drawings across the seams. What was taken and why is in
`reference/composition.md`.
