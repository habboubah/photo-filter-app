# Redesign — the first five minutes, calm and clear (18 November 2026, afternoon)

Ahmad's brief: Bildklar should feel like a calm, premium photo app, not a
"cleaner"; on every screen the user knows what it is, what to do next, and
that nothing is deleted without them. Until today there was **no onboarding
at all**: the app opened on a permission screen, then on home. This redesign
is an evolution — the two tabs, the next-step card, the uncropped group
viewer, *Zum Löschen vorgemerkt* and both materials stay. The design system
is now written down in `docs/DESIGN.md`. No detection logic, deletion
safety, bin behaviour, privacy guarantee or native code changes.

It runs in two parts with a stop between them: **the first run** (this
section, Phase 2 of the brief), then, after Ahmad's OK, **the app-wide
polish** (Phase 3: home, review and groups, confirmation, trips, empty
states, a motion pass).

## Research: onboarding, first run, tips, empty states

The research of 17 November (below) covered the look and the structure. This
adds what it left out. Sources: the apps' store pages and reviews, press
reviews, Google's help pages, and onboarding write-ups (NN/g via Uxcel,
Shopify, Appcues), read 18 November 2026. *Wipix* and *ByteBroom* did not
turn up under those names; the closest of their kind stand in (swipe decks:
Swipedeck, Swipe44, Swipe To Wipe; on-device clustering: Cluster Cleanup,
ShotSift, Clean Kit).

| App | What it does in the first minutes and around deleting | Adopt | Adapt | Avoid |
|---|---|---|---|---|
| **Swipewipe** | Four onboarding steps, then a trial paywall; the library in monthly chunks; *On this day* as the daily way in; a review of everything marked before it is deleted; stats and a yearly "Wrapped" | Month by month as bites; the summary before anything goes; *On this day* as a gentle way back | Progress per month as a ring, not a score | The paywall inside onboarding, weekly subscriptions, the eight-hour wait between months, stats as a game |
| **Swipe Photo Cleaner, Swipe To Wipe, Swipe44, Swipedeck** (swipe decks) | Right keeps, left marks; a pending pile ("review bin") to look through and restore from before one confirmation; undo; the photo's size on the card; decks by month and week | "Marked, not deleted" said in the first seconds; undo always in the same place | The pending pile is our *Zum Löschen vorgemerkt* — explain it once, at the moment of the first mark | Daily reminders "to build a habit", timers and 60-second races, "fear" copy |
| **Slidebox** | The gestures are shown on the first screen, over the real photo; up = trash (not deleted yet), a tap files into an album, back and forth compares | Teach the gestures on the real card, where they happen | One gesture per card that the user performs, instead of all at once | A gesture legend that covers the photo and has to be read first |
| **Files by Google** | A *Clean* tab of plain suggestion cards per category, *Select files*, then one button that says exactly what happens (*Move 12 files to Trash*); Trash keeps 30 days | A button that states count and destination; the 30 days said plainly | Categories with photo, count and size (home has them) | "Junk" language; one card that deletes for good without the Trash |
| **CleanMyPhone / Gemini Photos** | Similar shots as sets with a "best" mark the user can change; side by side with size and date; reviewers say the best pick is not always right | The best shot as a *suggestion* the user overrides; the group viewer's uncropped comparison | Say out loud that the app can be wrong: "Vorschlag – du entscheidest" | A paywall before the first result; unrelated tools (speed tests) |
| **On-device cleaners** (Cluster Cleanup, ShotSift, Clean Kit) | "No account, no cloud, on your device" as the first promise; review first, delete after | Privacy as one of the four welcome pages and a card during the scan | — | Promising "minutes, not hours": a first scan of 50,000 photos takes what it takes — we show the time left instead |
| **Google Photos** | Asks for access with its reason; fills the grid while it backs up; memories as cards; shared-element motion from tile to photo | Home fills in while the scan runs; results counting up | The scan's wait as the place to explain features | Nudges to buy storage |
| **Onboarding practice** | A screen of our own before the system's permission dialog ("priming"); short, skippable intros (flows past five screens lose people); contextual tips beat front-loaded tours; one coach mark at a time, never a chain; an empty state names one action; short looping demos beat walls of text | All of it | Tips come from one queue with a pause between them; an illustration plays once and rests | A screen full of coach marks; a tour that blocks the app; tips nobody can replay |

**Avoid, everywhere:** paywall nags, ads, guilt-driven storage alarms ("Your
phone is almost full!"), streaks and leaderboards, anything that pushes
deleting. → The **day streak** on home's clean-up card is gone from the UI
(`HomeView` `CleanupCard`). `src/logic/streak.ts` stays: its `addDay` keeps
`AppState.days` (set by `markDay`), which nothing shows any more.

## The biggest UX problems today (from `screenshots/review-before/`)

1. **No welcome.** A new user's first screen asks for the whole photo library
   with three icon bullets and no photo in sight (`10-permission`). What
   "selected photos" would mean is a grey caption under the button.
2. **The first scan is an empty room.** A slim card with a sweeping bar on a
   blank page, two tabs that lead to nothing yet (`01-scan`). Nothing says
   what is being found, nothing uses the wait.
3. **Home leads with a dashboard, not with the next step.** A 357-MB figure,
   an eight-colour bar with eight legend entries and a table come first; the
   one next step starts at the fold, under the tab bar (`02-home`).
4. **The review explains itself in one grey line at the very bottom**
   (`08-review`): which way is keep, what "vormerken" means and that nothing
   is deleted have to be found out by trying. The chip says *Vorschlag:
   löschen* where every other word says *vormerken*.
5. **The first real delete arrives unexplained.** The sheet shows what goes,
   but not that there are three safety nets and 30 days after them.
6. **Protection is invisible** until someone taps the small *Schützen* in a
   review; that favourites are never suggested is said nowhere.
7. **Features are found by accident**: months, quick clean, search, the
   widget and the reminder have no first-time hint; empty lists show the app
   icon and a sentence.

## The plan, on real files

**Part 1 — the first run**

| Step | What | Where |
|---|---|---|
| Flags | What was seen: `bildklar-welcome`, `bildklar-seen` (view preferences; *Von vorn anfangen* leaves them) | `src/logic/firstRun.ts` (+ test), `src/store.ts` |
| Welcome | Four skippable pages, each an illustration of photo frames that animates its line; lazy; eight small WebPs | `src/components/WelcomeView.tsx`, `src/assets/welcome/`, `src/ui/FirstRun.tsx` (`PhotoFrame`, `Dots`, `CountUp`, `Ring`) |
| Photo access | Why, both paths, denied without a dead end | `src/components/PermissionView.tsx` |
| First scan | Ring, counts, time left, five rotating cards, *Schon mal umsehen* | `src/components/FirstScanView.tsx`, `App.tsx` |
| Reveal | What was found, one recommended step from home's own choice | `src/components/RevealView.tsx`, `src/logic/nextStep.ts` (the choice moves out of `HomeView`, tested) |
| Guided review | One performed gesture per card, then tips; a summary that counts up | `src/components/ReviewView.tsx`, `src/components/ReviewGuide.tsx` |
| Safety moments | Three safety nets before the first delete; protection once | `src/components/SafetyNets.tsx`, `BinView.tsx`, `ReviewView.tsx` |
| Tips | One primitive, one list, one queue; replay in Settings | `src/ui/Tip.tsx`, `src/tips.ts`, `src/components/HowView.tsx`, `SettingsView.tsx` |
| Scripts | The captures and checks start past the first run unless they ask for it; new ui-review screens for it | `scripts/lib/shots.mjs`, `scripts/privacy-check.mjs`, `ios/AppReviewRecorder/scenes.json` |

**Part 2 — after the checkpoint** (Phase 3 of the brief): home (greeting,
the next step first), review and groups (full-bleed, zoom, undo snackbar),
confirmation sheets, trips (one menu), empty states, the motion pass
(shared-element tile → viewer, rings, skeletons, the system back gesture).

---

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
