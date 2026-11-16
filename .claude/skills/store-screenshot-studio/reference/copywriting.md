# Headline rules

Assume the reader sees a thumbnail in a search result, at a glance, in a language
they may only half-read. Every rule below exists for that reader.

## Rules

1. **Max 5 words per headline.** `validate.py` fails the run past that. The
   type is big (`reference/composition.md`): five short words are three lines.
   A headline that does not fit three lines is stepped down in size — if the
   contact sheet shows one visibly smaller than its neighbours, shorten it.
2. **Name the benefit, not the feature.** "See what you actually earn" beats
   "Statistics screen with charts".
3. **Only claim what the screenshot shows.** If the slide does not show fuel
   tracking, the headline may not mention it. This is the rule that keeps the set
   honest, and the one no validator can check for you.
4. **No calls to action.** "Download now", "Get it today" — the user is already on
   the listing. `validate.py` bans them along with "best app", "#1", "must-have",
   "amazing", "revolutionary".
5. **No superlatives or unverifiable claims.** "The fastest logbook" invites a
   competitor complaint and a review flag.
6. **Slide 1 carries the single strongest value proposition.** Most people never
   swipe past it.
7. **The headline stands alone.** Sublines are off for the set (`style.sublines`
   in `config/screenshots.config.json`): nobody reads a second line on a
   thumbnail, and the slide's call-out says the rest. Keep a subline in the copy
   file all the same — one line, ~8 words, no full stop, qualifying the
   headline, never a new claim — for the feature graphic or a set that turns
   them on.
8. **Write each locale, do not translate word for word.** German compounds run
   long — a headline that fits in English can wrap to three lines in German. Check
   the contact sheet, not the JSON.

## Points

- **A point is a fact in two to four words** that fits one pill (28 characters):
  "Reisen sortiert", "Alles auf deinem Gerät". At most five on a slide.
- **Facts, not reassurance.** "Alles auf deinem Gerät" can be checked;
  "100 % sicher" cannot. The same rule 3 applies: the slide that carries the
  promise shows the screen that says so (the scan: "Bildklar sieht sich deine
  Fotos an", the settings' privacy row).
- **No price words** ("kostenlos", "free", "kein Abo") anywhere in the set:
  Bildklar sells an unlock, so they would mislead (`reference/store-specs.md`).
  The ribbon stays off.

## Good / bad

| ✅ | ❌ | why |
|---|---|---|
| Every trip, found for you | Trip detection screen | Names the outcome, not the UI |
| The best shot, suggested | The smartest AI photo picker ever | No superlative, no boast, no AI the app doesn't have |
| Swipe: keep or delete | Delete all your duplicates automatically! | Honest: the app never deletes by itself |
| Everything stays on your device | 100% secure and private | Claims exactly what is true: nothing leaves the phone |
| See the space you'd free | Download now and free up gigabytes | Benefit, not a call to action or a number it can't promise |

## Locale notes

Text lives in `config/copy.<locale>.json`, one file per language, with a `dir`
field. Setting `"dir": "rtl"` flips the layout — the template uses CSS logical
properties throughout, so no separate stylesheet is needed.

Adding a language means adding one `copy.<locale>.json` and one entry in
`locales` in `screenshots.config.json`. No script changes.
