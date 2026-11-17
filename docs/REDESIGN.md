# Redesign — "Album, modernised" (17 November 2026)

The plan behind the redesign of Bildklar's screens: what changes, where in the
code, and in which order. The look stays "Album" (warm paper, white cards,
slate ink, one teal; see `docs/PLAN.md`, *Design*). Structure, cards,
typography and chrome change. No feature goes, no logic in `src/logic/` or the
native code changes.

## Why

The home screen had grown into one long scroll where everything weighed the
same: the clean-up card listed four categories that the tiles right under it
listed again; the tiles were pastel text blocks without a single photo, each
counting in its own unit (groups, photos, files · MB); trips fell far below
the fold. Screens opened with paragraphs. Fraunces at three sizes plus round
floating bar buttons read more like a printed brochure than a current app.

What the best apps of the kind do (research, November 2026): Gemini Photos
shows each category as a card with a grid of the photos it found; Slidebox
files a photo into an album with one tap while swiping; the swipe cleaners win
on simplicity and lose on pushy paywalls; CleanMyPhone and Clever Cleaner rank
categories by the space they free; Apple's Photos went back to two tabs in
iOS 26; Material 3 Expressive asks for springy motion but little of it on
screens used quickly and often.

## What changes

| Part | Before | After | Where |
|---|---|---|---|
| Navigation | One home, everything on it | Two tabs on the root: **Aufräumen** and **Ordnen** (a floating pill, opaque, no blur) | `App.tsx` (`tab` beside `pushed`), `src/ui/TabBar.tsx` |
| Clean-up card | Number, dot list, button | Number, a **storage bar** (one segment per category, sized by MB), free space, button | `HomeView.tsx`, `src/ui/StorageBar.tsx` |
| Categories | Pastel text tiles | **Photo cards**: a 2 × 2 mosaic of the category's own photos, the MB to gain, the count; sorted by MB; empty ones collapse into one "Erledigt" line | `HomeView.tsx` (`PhotoCard`) |
| Tools | Tiles among the categories | Rows with a photo under **Mehr Platz** (large files, smaller photos, Live Photos, from apps) | `HomeView.tsx` |
| Later, months | Cards among the rest | Rows under **Weitermachen** | `HomeView.tsx` |
| On this day, trips, AI categories | On home | On **Ordnen**: a photo card for *An diesem Tag*, trips as big cover cards, the categories | `src/components/OrganizeView.tsx` (lazy) |
| Rescan | A bar button on home | Settings › Neu durchsuchen (and the automatic rescan on return) | — |
| Type | Fraunces for every title | Figtree for titles and the UI; Fraunces only for the big numbers and trip names | `src/index.css` (`title-face`), `Screen.tsx`, `Sheet.tsx` |

Later phases: the category and group screens (one-line subtitle, the
explanation behind an (i)), the review (thumb bar, MB counter), the end
screen, paywall, permission, settings; then the store screenshots, the App
Review recording and the docs.

## Order

0. Before: `npm run ui-review` → `screenshots/review-before/`; this file.
1. Tokens and type.
2. Tabs.
3. *Aufräumen* and *Ordnen* — then a look together before going on.
4. The list screens. 5. Review and end screen. 6. Paywall, permission,
   settings. 7. Store screenshots, App Review scenes, `CLAUDE.md`,
   `docs/PLAN.md`, `docs/features.md`, What's New.
