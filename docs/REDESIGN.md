# Redesign — "Album" on Android, calm and photo-led (18 November 2026)

Ahmad asked for an Android frontend that feels like a calm, modern photo
library rather than a storage cleaner. Android keeps the shared layout and
gets its own material (`[data-platform="android"]` in `src/index.css`); the
structural changes below apply on both platforms, since the screens are one.
No detection logic, privacy guarantee or native code changes.

## The three problems and what changed

| Problem | Change | Where |
|---|---|---|
| Home opened on a storage dashboard: a big "357 MB", a nine-colour bar, a table with red "could go" counts, *Jetzt aufräumen*; six equal photo cards; month by month buried; trips and *An diesem Tag* absent | The clean-up card stays on top (calmer: the could-go counts in plain ink, *Jetzt aufräumen* a quiet button); under it **one next step** (the next month when there is progress, else the decide-later pile, else the category that frees the most, else month by month); *Zum Löschen vorgemerkt* as a section of its own; the categories as rows (photo, count, MB); *Aus deiner Mediathek* (on this day, latest trip) | `HomeView.tsx`, `App.tsx` |
| A group could not be compared: the keeper cropped, the others small and cropped; "suggested" and "your choice" one badge; the review's reason cut off | A large **uncropped viewer** in the photo's shape, the series as a strip; swipe / arrows / ← → only look; **Vorschlag der App** and **Bleibt / Deine Wahl** apart; why in plain words only where the facts carry it (`src/logic/explain.ts`); *Dieses behalten*, *Zurück zum Vorschlag*; the review's reason wraps, **Rückgängig** in words | `GroupView.tsx`, `ReviewView.tsx` |
| Marking for deletion looked like deleting (red, trash icon), and the real delete went straight to the system | **Marking for deletion** is teal or quiet glass with an archive icon everywhere; *Zum Löschen* renamed **Zum Löschen vorgemerkt / Marked for deletion / محددة للحذف** (the action: *Löschen vormerken*); red only for the real delete, which first shows **exactly what goes and its size** in a sheet (cancel is one tap), then Android's dialog | `ReviewView`, `GroupView`, `QuickCleanView`, `LargeView`, `BinView` |

Also, from Ahmad's notes the same night:
- **The scan no longer takes over home**: the facts are read again once the
  photos are listed and every few seconds while they are analysed
  (`store.ts`), so home, the categories and the clean-up screen fill in while
  it runs; a slim card shows the progress and **how long it still takes**
  (`src/logic/eta.ts`).
- **Search shows its words**: a few to try under the cards and *Alle 247
  Wörter* in a sheet, by theme, with a filter (`wordSections`, `SearchView`).

## The visual system ("Album", Android)
- Warm neutral surfaces (`#F5F3EF` page, `#FFFDFA` cards; `#12110F` /
  `#1E1C19` at night), warm greys for text, one teal for what you tap, green
  for what stays, red only for deleting.
- Flat glass (no sheen), neutral icon tiles; photos carry the colour.
- Hierarchy by type and whitespace: section headings, grouped rows, one
  prominent button per screen; no gradients, no nested cards.
- Contrast: `npm run audit:contrast` audits both Android themes as well.

## Left for later
- Store screenshots, the preview video and the App Review recording show the
  old screens until they are made again (`npm run ui-review`,
  `npm run screenshots -- --android`, `npm run rehearse:app-review`).
- The iPhone keeps the "Glass" material; whether it should take the warm
  palette too is Ahmad's call.

---

# Redesign — "Glass", the iOS 27 look (17 November 2026)

The second redesign of the day. The first ("Album, modernised", below) fixed
the structure: two tabs, photo cards, one unit (MB), the paragraphs behind an
(i). This one changes the look: Ahmad asked for an app that looks "like iOS
27". No feature goes, no logic in `src/logic/` or native code changes.

## What iOS 27 looks like (research, 17 November 2026)

- Liquid Glass (iOS 26) stays; iOS 27 refines it: **a darkened edge** on glass
  elements for depth and separation, **brighter specular highlights**, better
  diffusion of what is behind, a **uniform toolbar** where content scrolls
  under floating bars (the scroll edge effect), and a Settings slider from
  "ultra clear" to "fully tinted" (MacRumors, Cult of Mac, June 2026).
- Tab bars float as capsules; search goes back into the tab bar (9to5Mac,
  May 2026).
- The best photo cleaners (Clever Cleaner, CleanMy Phone, Slidebox) win on a
  clean, uncluttered interface and lose on pushy paywalls.

## What Bildklar takes from it

| Part | Before ("Album") | After ("Glass") | Where |
|---|---|---|---|
| Page | Warm paper `#F7F3EC` / slate | Grouped background `#F2F2F7` / black | `src/index.css` |
| Floating controls | Opaque discs and pills | Drawn glass: translucent fill, sheen, specular line, darkened edge, shadow (`glass`, `glass-flat`, `sheen`) | `index.css`, `Button`, `TabBar`, `Screen`, `Sheet`, `Toast` |
| Top bar | Solid page colour | Content passes under it; the scroll edge fade appears once scrolled | `ui/Screen.tsx` |
| Tab bar | Opaque pill, teal tint | Glass capsule, the current tab in a glass lens; a fade under it | `ui/TabBar.tsx` |
| Big numbers, trip names | Fraunces | Figtree 800, tight; the unit small and quiet (`BigNumber`) | `ui/Controls.tsx` |
| Category cards | Mosaic on top, name below | The photos fill the card, the name and MB lie white on a shade | `HomeView.tsx` |
| Trips, *An diesem Tag*, AI categories | Cover with text below | Photo cards, text on the shade, glass chips | `OrganizeView.tsx` |
| Clean-up card | Number, bar | Number with a small unit, an iPhone-Storage bar (one track) with a legend, chips for "freed" and the streak | `HomeView.tsx`, `ui/StorageBar.tsx` |
| Settings rows | Pastel tiles, coloured symbol | White symbol on a solid squircle (iOS Settings) | `IconTile`, `--hue-solid` |
| Two actions in the dock | Side by side (wrapped on small phones) | The prominent one on top, the other as a text button under it | Cleanup, Group, Quick clean, Trip |
| Sheets | Bottom-attached | Float inset from the edges, 38 px corners | `ui/Sheet.tsx` |
| Switch | 51 × 31 | iOS 26's wider track with a pill knob | `ui/Controls.tsx` |
| Review | Solid round buttons | Prominent glass (sheen) keep / delete, glass "later", glass album chips | `ReviewView.tsx` |

Contrast: `npm run audit:contrast` now also checks the inks on glass (over the
page and over a dark and a light photo), white on a photo card's shade, and
the white glyph on every hue's squircle.

## Left for later

- The store screenshots, the preview video and the App Review recording show
  the old look until they are made again (`npm run ui-review`,
  `npm run screenshots`, `npm run store-screenshots`, `npm run app-preview`,
  `npm run rehearse:app-review`). The studio's theme
  (`.claude/skills/store-screenshot-studio/config/theme.json`) and the preview
  video's (`.claude/skills/app-preview-video/config/theme.json`) still use the
  paper colour and Fraunces — restyle them to match when the set is redone.
- The splash screens: `npm run assets:generate` (its colours are updated in
  `package.json`).

---

# Before: "Album, modernised" (17 November 2026, morning)

What changed then: two tabs (*Aufräumen*, *Ordnen*); the clean-up card's dot
list became a storage bar; the category tiles became photo cards ranked by
the MB they free; tools and "continue" became rows; trips, *An diesem Tag*
and the AI categories moved to *Ordnen*; every list screen's paragraph moved
behind an (i); the Dock buttons say count and size; Figtree for titles,
Fraunces only for the big numbers and trip names. Research then: Gemini
Photos' cards with photo grids, Slidebox's album chips, the swipe cleaners'
simplicity, CleanMyPhone / Clever Cleaner ranking by size, iOS 26's two-tab
Photos, Material 3 Expressive.
