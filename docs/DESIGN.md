# Bildklar – the design system

Read this before any UI change, and keep it true. It describes the system as
it is in the code: the tokens live in `src/index.css`, the components in
`src/ui/`. The history of how it got here is `docs/REDESIGN.md`; the rules
that are not about looks (architecture, safety, i18n) are `CLAUDE.md`.

## Tone

Calm, photo-first, private, never pushy.

- **Photos are the hero.** Colour comes from the photos; the interface around
  them is neutral, with one teal for what you tap.
- **Every screen answers three questions**: what is this, what do I do next,
  and is anything deleted without me (never).
- **Bildklar suggests, the user decides.** A suggestion is always worded and
  drawn as a suggestion (*Vorschlag der App*), never as a verdict.
- **No pressure.** No storage alarms, no red counts, no streaks, no
  leaderboards, no confetti, no "only today". Space is stated in the same
  quiet units everywhere (`bytes()`).
- **Marking is not deleting.** *Löschen vormerken* is teal or quiet glass with
  an archive icon. Two exceptions by Ahmad's call (18 November 2026): a group
  card's *Ohne Stern zum Löschen vormerken* is red words with the trash icon
  (no fill; *Alle behalten* beside it is green words with a check), and the bin's *Diese löschen* is red text — it leads to
  the delete sheet. Red and the trash icon appear only where a tap really
  deletes: the delete sheet's one button. The bin's dock reviews the
  selection (*Auswahl prüfen*), it never deletes by itself.
- Sentence case in every language. German strings are long: they wrap, a
  button is never truncated.

## Two materials, one layout

| | iPhone — "Glass" | Android — "Album" |
|---|---|---|
| Page (`bg`) | cool grouped grey `#F2F2F7` / black | warm paper `#F5F3EF` / `#12110F` |
| Card, sheet (`surface`) | white / `#1C1C1E` | warm white `#FFFDFA` / `#1E1C19` |
| Fill on either (`surface-2`) | translucent cool grey | translucent warm grey |
| Text (`fg`, `fg-mute`, `fg-faint`) | near-black, cool greys | warm near-black, warm greys |
| What floats (`glass`) | translucent fill, sheen, specular line, darkened edge, shadow | solid fill, hairline edge, soft shadow — no sheen |
| Icon tile | white glyph on the hue's solid squircle | neutral squircle, ink glyph |

Android's set is laid over the same tokens by `[data-platform="android"]`.
There is never an Android-only fork of a component, and no Material dynamic
colour: the warm palette is the palette.

## Adaptive layout

One layout on every screen size, from a 320 px phone to a foldable open or a
tablet (Android 16 runs the app there at any size and either way round, even
though it asks for portrait). It adapts through tokens and container
queries, never through a fork of a screen (`src/index.css`, *Adaptive layout*).

| Width | Who | What changes |
|---|---|---|
| **narrow**, < 360 px | iPhone SE (1st gen.), small Android phones, split screen | page margin 12 px (16 beside a large title, 20 on a first-run step); `title` 28, `title1` 24, `title2` 20 px; grids of four show three; two-by-two where four stats sat in a row; the review's end tiles become rows |
| **phone**, 360–699 px | every current iPhone and most Android phones | the design as drawn; the page column at most 36 rem |
| **wide**, ≥ 700 px | a foldable open, a tablet, a wide window | the page column grows to 44 rem (50 rem from 1000 px); grids add columns, photos keep their phone size |

- **The page column** is `max-w-column` (`--container-column`); the page's
  margins are `px-page` / `px-title` / `px-step` (`--spacing-*`). Never a
  literal `max-w-xl` or `px-[16px]` on a screen's shell.
- **Grids count their columns by their own width**, not the screen's: the
  page's `<main>` is `@container/page` (`ui/Screen`), so a tile grid is
  `grid-cols-3 @xs/page:grid-cols-4 @lg/page:grid-cols-5 @2xl/page:grid-cols-6`
  (the trips, the albums), the categories and the word cards add one or two
  from `@lg` / `@md`, the months go to three. The container sizes are rem, so
  with Larger Text a grid shows fewer, larger tiles. A `PhotoGrid` takes its
  phone count as `columns` and fits as many photos of that size as its width
  holds (`gridColumns`, `src/logic/layout.ts`: never fewer than three, at
  most twice the phone count).
- **Heights**: `short:` (< 640 px tall — the first SE, split screen) for a
  screen that is one fixed picture: the review's photo takes what is left
  down to a floor (`clamp(150px, 36vh, 300px)`) and its round buttons are a
  step smaller, so they stay on screen; a group's viewer is at most 36 vh;
  the welcome's illustration is smaller. Everything else scrolls.
- `narrow:` and `short:` are for the rare component that changes shape
  there; everything else follows the tokens.
- `npm run ui-review` shows every screen at 320 × 568 (`de-light-320`) and
  840 × 1000 (`en-android-wide`) too.

## Colour tokens

Only tokens, never a literal colour in a component. After any change:
`npm run audit:contrast` (both themes, both platforms, every hue, the inks on
glass and on a photo's shade).

| Token | Use |
|---|---|
| `bg`, `surface`, `surface-2`, `hairline` | the layers and their divider |
| `fg`, `fg-mute`, `fg-faint` | text; `fg-faint` only for placeholders and decoration |
| `accent` | teal as text (links, ghost buttons, a tip's action) |
| `accent-fill` + `accent-fill-ink` | teal as a fill: the one prominent button, a selected chip, progress |
| `accent-dim` | a teal tint behind an icon or a pressed ghost button |
| `keep` (+ `-dim`, `-ink`) | green: keep, the photo that stays, done |
| `neg` (+ `-dim`, `-ink`) | red: only what really deletes |
| `warn` (+ `-dim`) | amber: blurry, "check this one", the dry run banner |
| `on-color`, `veil`, `shade` | white ink on a photo, the dark chip under it, the shade at a photo card's foot |
| `data-hue` → `hue-bg`, `hue-ink`, `hue-solid` | a category's colour: its icon tile, its dot, its segment of the storage bar (sky, sand, mint, rose, lilac, stone, cyan, pink) |

## Type

Figtree for everything (bundled; Arabic falls back to the system face). Sizes
are rem, so they follow the system's text size (`dynamicType.ts`).

| Role | Class | Size | Used for |
|---|---|---|---|
| Display | `text-display display` via `<BigNumber>` | 48–68 px | one figure per screen (space to free, a review's result) |
| Title | `text-title title-face font-bold` | 34 | a screen's large title |
| Title 1 | `text-title1 title-face font-bold` | 28 | a first-run headline (welcome, first scan, reveal) |
| Title 2 | `text-title2 title-face font-bold` | 22 | section headings, a card's name |
| Heading | `text-heading title-face font-bold` | 20 | a dialog's or empty state's title |
| Body | `text-body` | 17 | rows, paragraphs, buttons |
| Label | `text-label` | 15 | secondary lines, chips, a tip |
| Caption | `text-caption` | 13 | meta lines, badges |
| Micro | `text-micro` | 11 | a badge on a thumbnail |

Numbers that are read at a glance take `num` (tabular). `wrap-compound` on
titles and labels, `wrap-prose` on sentences. Titles drop their tracking in
Arabic.

## Spacing

A 4 px base. The steps in use: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48.

- Page margin 16 px (20 px beside a large title, 24 px on a first-run step):
  `px-page`, `px-title`, `px-step`, 4 px less on a narrow screen (*Adaptive
  layout*); margins are px so they hold when text grows.
- Between sections 24 px (`space-y-6`); inside a card 16–24 px; between a
  label and its sub line 2–4 px; between tiles 2–4 px (photos sit close).
- Touch targets ≥ 44 px, **48 px for anything new** (`min-h-control`).
- Logical spacing only (`ps-`/`pe-`/`start-`/`end-`); what follows the finger
  (the review's swipe, its buttons and stamps, a gesture hint) stays physical.

## Radii and elevation

`xs` 10 · `sm` 14 · `md` 24 (a card) · `lg` 32 (a hero card) · `xl` 38 (a
sheet). Corners are concentric: a photo inside a card takes the card's radius
minus its inset. A photo tile is 6–10 px.

Three levels, no more: the page; a card (no border, no shadow); what floats
(`glass` with `shadow-e2`; a sheet with `shadow-e3`). `glass-flat` is the
same material inside a card or sheet. Where content meets a floating bar it
fades into the page (`edge-fade-top`, `dock-fade`), never a line. No
`backdrop-filter`, no `filter: blur`, no `hover:`.

## Motion

Motion explains — where something came from, what changed, what a gesture
will do. It never decorates and never delays a tap.

| Kind | Value |
|---|---|
| Press feedback | `press`: scale 0.97, 100 ms in, 220 ms out |
| Small state change (a chip, a badge, a tip) | 160–220 ms, `ease-out-soft` |
| A screen's push / pop | 350 ms, `cubic-bezier(0.32, 0.72, 0, 1)` |
| A sheet | spring, stiffness 400, damping 40 (no bounce) |
| What the finger moves (the review card, a sheet, the welcome's pages) | follows 1:1; released with a spring that takes the finger's velocity; bounce ≤ 0.2 and only after a flick |
| An illustration that explains (welcome, the first scan's cards, a safety moment) | springs with bounce 0, 0.5–0.7 s per move, 60–90 ms stagger, 1.2–2 s in all, then it rests — it never loops |
| A number counting up (`<CountUp>`) | 0.6–0.9 s, ease-out; the final value is in the DOM for screen readers at once |
| A shared element (a photo into the zoom viewer and back) | motion `layoutId`, spring, bounce 0, 0.4 s |
| A gesture hint (the guided review's hand) | one slow pass in the gesture's direction, a pause, again; it stops the moment the card is touched |

Rules: transform and opacity only (the one exception is a progress ring's
stroke: a small SVG, never over a scrolling list). Everything collapses under
reduced motion (`<MotionConfig reducedMotion="user">` and the media query in
`index.css`): illustrations show their end state, hints become a still arrow
with the words, auto-advancing cards stop advancing. No motion on list
scrolling. Haptics (`src/ui/haptics`) accompany a decision, not a navigation.

## Component states

One look per state, on every screen:

| State | Shape | Colour | Icon | Words |
|---|---|---|---|---|
| **Selected** (a tile picked in a grid) | 3 px inset ring + a filled check disc top-end | `accent` | `CheckCircle2` (unselected: `Circle`, `fg-faint`) | *Ausgewählt* in the tile's label |
| **Suggested by the app** | a pill badge (large viewer) or a 24 px disc top-end (thumbnail) | `glass`, ink `fg` — neutral, never green | `Sparkles` | *Vorschlag der App* |
| **Stays / your choice** | a pill badge or a 24 px disc top-start with a white ring | `keep` fill | `Check` | *Bleibt* / *Deine Wahl* |
| **Protected** | a pill badge or disc, as "stays" but glass | `glass`, ink `fg`; as an action: `accent` text | `Shield` | *Geschützt* / *Schützen* |
| **Marked for deletion** | quiet glass (button, stamp, chip); the bin's card on home | `glass` / `surface-2`, ink `fg`; a prominent "mark" button is teal | `Archive` | *Löschen vormerken* / *Zum Löschen vorgemerkt* |
| **Destructive** (really deletes) | the one red button of a screen, after a sheet that shows exactly what goes | `neg` fill | `Trash2` | *N Fotos löschen* |
| **Blurry / check** | a small dot or a `warn-dim` chip | `warn` | – | *Unscharf*, *Bitte prüfen* |

Suggested and your choice differ in **shape, position, icon and colour** — a
neutral sparkle at the end, a green check at the start — never by colour
alone.

## Components (`src/ui/`)

`Screen` (large title, floating bar, `info` sheet, `docked` / `tabbed`),
`SectionHead`, `Group`, `Row`, `MenuRow`, `ActionRow`, `IconTile`, `Next`,
`Away`, `Empty`, `Dock`, `TabBar`, `Sheet`, `Confirm`, `Button`, `IconButton`,
`Field`, `Toast`, `Progress`, `SwitchRow`, `Segmented`, `Badge`, `BigNumber`,
`SortMenu`, `StorageBar`, `Thumb`, `PhotoGrid`, `Mosaic`, `PlayOver`,
`CompareView` (`ui/Compare.tsx`), and for
the first run `TipHost` (`ui/Tip.tsx`) and, in `ui/FirstRun.tsx`, `Dots`,
`CountUp`, `Ring`, `PhotoFrame`, `Foot` (a first-run screen's action, stuck
to the bottom with a fade above it).

- **One prominent button per screen** (`Button` primary, in the `Dock` or at
  the foot). A second action goes under it as `variant="ghost"`.
- **A screen says what it is for** behind an (i) in its bar, not in a
  paragraph; its subtitle carries the count and the size.
- **Sheets** float inset from the edges; the confirm button is teal with
  `sheen`, red only when it deletes.
- **Empty states** (`Empty`): two photo frames and a mark on the one in
  front (green check: nothing to do; teal icon: nothing here yet), one line,
  and the way on — an action or `back`. Never an emoji.
- **Before a real delete** (`components/DeleteSheet`): one sheet for every
  place that deletes — thumbnails, count, size, where it lands — and the one
  red button. A new delete goes through it.
- **A photo large** (`ui/Zoom`): opened from the magnifier on a photo; the
  picture is a shared element (`zoomLayoutId`) that grows out of its tile.
  Tap zooms on the spot, drag pans.
- **Two photos side by side** (`ui/Compare`, *Nebeneinander* in a group): the
  photo that stays and another of the group, the same size and aligned —
  upright ones next to each other, wide ones one above the other. **One zoom
  for both**: a tap on a spot of either zooms both to it, a drag moves both
  (shared motion values). The one that stays wears the green check, the
  app's pick the sparkle; a strip picks the other photo; *Dieses behalten*
  switches. Made so a parent can compare a child's face across two frames.
- **A month** (`MonthTile` in `components/MonthsView`): a photo tile, two to
  a row — the cover with the month's name on its shade, photos and size, and
  how far in: *Noch offen*, a thin bar with *16 % durchgesehen* and a glass
  *Weitermachen* chip, or the green *Durchgesehen*. In words as well as in
  the bar.
- **The review tray** (`BinView`): every staged photo in view, a tap selects
  what goes back (*Zurücklegen*); the dock's *Auswahl prüfen* opens the
  delete sheet — the only red button. Reviewing and deleting are two steps.
- **Loading**: the shape of what comes, breathing softly (`skeleton`), never
  a spinner on a blank page.
- **Home's order**: greeting, *Vorschläge* first (Ahmad: the space you could
  free up on top), then what is marked for deletion — a `data-hue="sand"`
  card (`bg-hue-bg`, ink `text-hue-ink`, the archive on `bg-hue-solid`): its
  own colour, so waiting reads apart from everything else, and never red.
  No next-step card on home since 18 November 2026 (the reveal keeps one).
  *Vorschläge* is ONE card: the space, the library's bar, the
  photos / videos cells and the free space, then the categories as rows,
  and *Jetzt aufräumen* at its foot. Its bar has two parts only — *Kann weg*
  (sand) and *Bleibt* (grey) — both named with their size under it: a colour
  nobody can name is not shown —
  then more space (month by month and the later pile first), protected. On this day and the trips are
  *Ordnen*'s, not home's.
- **Ordnen's order**: search as a field (`card`, rounded-full, 56 px), On
  this day as a large photo, the trips as tiles four to a row (name, dates,
  count under the photo), the AI's categories as photo cards three to a row
  (name and count on the photo's shade, 16 px corners).

## The first run

The first five minutes teach the value and the three gestures by doing
(docs/REDESIGN.md, "The first five minutes").

- **Welcome** (`WelcomeView`, lazy): one screen — the benefit as the
  headline (*Finde die Fotos, die du behalten willst*), a series of three
  where the sparkle (the app) and then the green check (you) appear, three
  lines with a hue tile each (similar shots compared, trips sorted, only on
  the phone) and one button. No tour: the gestures are taught on the first
  real card. Its photos are three small licence-clean WebPs in
  `src/assets/welcome/` — never the user's, never the demo library's.
- **Photo access** (`PermissionView`): why, in three plain lines; both paths
  named honestly (all photos, selected photos); denied is no dead end.
- **First scan** (`FirstScanView`, lazy): a ring, what was found so far
  counting up, how long it still takes, five rotating cards that explain the
  features — replaced by the first group's real photos (*Schon entdeckt*) as
  soon as one exists — and *Schon mal umsehen*. Later scans are the slim card
  on home. Nothing on it is invented: no group, no photos.
- **Reveal** (`RevealView`, lazy): leads with one task, never with a storage
  figure — the first group of near-identical photos (`firstGroup` in
  `src/logic/nextStep.ts`), its photos side by side with the sparkle on the
  app's pick, and *Deine erste Gruppe vergleichen*; without a group, home's
  next step. Then what was found per category with its space in home's units.
- **The first task** (`GroupView` opened from the reveal, then
  `components/FirstTaskSheet`): after the first group, once, a sheet says
  what happened — the photo that stays with its check, the others moving into
  the *Zum Löschen vorgemerkt* tray, *nothing deleted* in its title — and
  offers one next step and *Rückgängig*. Every later group is a toast.
- **Guided review** (`ReviewGuide.tsx`): the hand shows one gesture per card
  until the user has done it (right, left, up — by swipe, button or key),
  each decision named in a word with its haptic; then the buttons and undo,
  and what a suggestion is, as tips. The summary counts up and says where
  the marked photos wait.
- **Safety moments** (`SafetyNets.tsx`): before the first real delete, the
  three safety nets in one small illustration; protection explained once, on
  the first summary (`ProtectInfo`).
- **Tips** (`src/ui/Tip.tsx`, the list in `src/tips.ts`): one at a time from
  one queue, pointing at the real control (`data-tip`), dismissed with one
  tap, never blocking, read by TalkBack / VoiceOver. No screen builds its
  own. *Einstellungen › So funktioniert Bildklar* replays all of it.

What was seen is a view preference (`bildklar-welcome`, `bildklar-seen` in
localStorage, `src/logic/firstRun.ts`): losing it only shows a hint again.
An install that was scanned, has reviewed or has deleted before this version
skips the first scan's screen, the gesture hints and the safety nets.

The first run's German and English strings are a chunk of their own
(`src/translations.firstRun.ts`), loaded together with each screen that
shows them (`withFirstRun` in `App.tsx`) — a new first-run string goes
there, and a screen that uses one is loaded through `withFirstRun`.
