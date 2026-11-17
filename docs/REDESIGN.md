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
