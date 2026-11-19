# Changelog

What changed and what left, newest first — so `docs/features.md` can say
only how the app is now. (Started 18 November 2026; older history is in git.)

## 19 November 2026, afternoon — picking like Photos

- **Every grid of photos picks the same way** (`src/ui/pick.tsx`): large
  files, videos, screenshots, failed shots, unimportant photos, Live Photos,
  an album, a chat app, a month, a trip, a category, search, *Ähnliche Fotos*
  and the bin. *Auswählen* / *Fertig* and the order (*Neueste zuerst*, now
  a pill with its name) sit in a row above the photos, not in the bar; the
  select circles show only while picking. Not picking, a tap opens the
  photo — a window of clear glass over the page (blurred on the iPhone), a
  tap beside it closes it — with a red *Löschen vormerken*; a video opens in
  a sheet and plays there. *Ähnliche Fotos zeigen* moved into that window on
  search and *Ähnliche Fotos* (a tap on a photo opened the look-alikes).
- **Marking for deletion is red** with the archive icon in the Dock, the
  opened photo and the large file's sheet (Ahmad's choice; it was teal).
- **Filters are pills** beside the order: large files *Alle / Videos /
  Fotos*, failed shots *Sicher / Alle*, and screenshots by age — *Alle* (the
  new default), *> 1 Monat*, *> 3 Monate*, *> 6 Monate* (was *Älter als 30
  Tage* first, then *Alle*).
- **Zum Löschen vorgemerkt**: a tap opens a photo; *Auswählen* picks. The
  Dock says *Alle löschen* (red) and *Fotos durchgehen*, or while picking
  *Ausgewählte löschen* (red) and *Zurücklegen* (was *Auswahl prüfen*,
  *Diese löschen*, *Noch einmal durchgehen*). Both red buttons still open
  the sheet first. A card says how to get a deleted photo back, worded for
  the iPhone and for Android.
- **Chats & soziale Medien**: two rows of photos per app; a tap opens the
  app's photos as a grid (it started the review), *Durchgehen* there; the
  order sits above the cards. No grid starts in select mode.
- **Monat für Monat**: one card per row like the chats (was two tiles to a
  row); a tap opens the month's photos to pick from (it started the
  review), *Durchgehen* there goes on where the month was left.
- **Albums, chat apps, months**: picked photos go into another album
  (Android: are moved into another folder).
- **Near-identical and duplicates**: a red *Alle ohne Stern vormerken* in
  the Dock does *Ohne Stern vormerken* for every group at once.
- **Live Photos**: *In normale Fotos umwandeln* is for the picked photos,
  under the red *Löschen vormerken*, and shows only while picking (one
  button converted all); the (i) explains what stays and what goes.
- **The order pill** keeps only its icon under 360 px, so the row above a
  grid stays one line.
- **Fotos verkleinern and Videos verkleinern** are rows on home's *Mehr
  Platz* (photos were at the top of *Große Dateien*, a video was made smaller
  from its sheet, one at a time). Both pick like every grid, several videos
  in a row; the originals go into *Zum Löschen vorgemerkt* with undo instead
  of a sheet asking to delete them at once. Their (i) says so.
- **Home**: *Duplikate* always right before *Fast gleiche*.
- **Ordnen**: *Neu durchsuchen* and the magnifier in the bar, as on
  *Aufräumen*.
- **Suchen** offers only words that find a photo — alone, or together with
  the words chosen — so no chip, suggestion or word in the sheet gives an
  empty result.

## 19 November 2026 — the store texts

- **German store name** *Bildklar KI: Fotos aufräumen* (was *Bildklar KI:
  Foto Reiniger*); "reiniger" is a German keyword now. The English name stays.
- **One store description** per language for the App Store and Google Play,
  privacy first (we never see your photos, offline, free for now, no ads),
  naming neither iPhone nor Android; deleted photos wait in the phone's own
  bin, not in the app. The "made by a father" line is gone.

## 18 November 2026, last — ready for production

- **The dry run is gone**: the *Probelauf* switch (Einstellungen › Nur in der
  Debug-Version), the amber banner, its toasts and `DRY_RUN_IN_RELEASE`;
  `dryRun` left every native write (iPhone, Android, the demo library). Every
  build writes for real. The suggestion ledger in Settings shows in debug
  builds only.
- **Behalten on the lists**: *Unwichtige Fotos*, *Bildschirmfotos* and
  *Missglückt* offer *Behalten* under *Zum Löschen vormerken* for the picked
  photos — kept, off the list, never suggested again (undo in the toast).
- **The group card's buttons** sit side by side under the date, words only
  (no background): *Alle behalten* green, *Ohne Stern vormerken* red (Ahmad's choice).

## 18 November 2026, late night — never wider than a phone

- The wide layout of an hour before is gone: on a laptop it looked strange.
  The page column now stops at a large phone's width (28 rem, 448 px; it was
  36 rem before the adaptive layout), and grids never add columns. Sheets
  stay bottom sheets at that width (they became centred dialogs from 640 px),
  *Nebeneinander* and *Groß ansehen* keep it too. The narrow-phone and
  short-screen changes stay.

## 18 November 2026, night — the layout adapts to the screen

- **Narrow phones** (under 360 px: the first iPhone SE, small Android phones,
  split screen): page margins 12 px, the large titles a step smaller, the
  trips and albums three to a row (four cut names in two), the first scan's
  four counts two by two, the review's end tiles as rows (*Behal-ten* was
  broken in two), the review's header keeps *Rückgängig* on its line.
- **Short screens** (under 640 px tall): the review's photo shrinks to a floor
  and its buttons are a step smaller — at 320 × 568 *Behalten* and *Später*
  were below the screen; a group's viewer leaves room for the series above
  the dock; the welcome's illustration is smaller.
- **Foldables and tablets** (700 px and up; Android 16 ignores the portrait
  lock there): the page column grows from 36 to 44 rem (50 from 1000 px),
  photo grids, tiles, categories, word cards and months add columns
  (container queries on the page; `gridColumns` for `PhotoGrid`).
- New tokens and utilities: `px-page` / `px-title` / `px-step`,
  `max-w-column`, the `narrow:` and `short:` variants; `npm run ui-review`
  adds 320 × 568 and 840 × 1000.

## 18 November 2026, evening — the review and improvement plan

Project doc *Bildklar – review and improvement plan* (claude.ai artifact) and
`claude/app-review-plan.md`.

- **Fewer paths.** *Jetzt aufräumen* opens quick clean; the clean-up screen
  that listed the kinds a second time (`CleanupView`) is gone, its *Alle
  durchgehen* moved into quick clean. *Missglückt* is one grid with a reason
  chip instead of three tabs. *Ähnliche Videos* is a *Fotos · Videos* switch
  on *Fast gleiche Fotos*, no longer a row and a screen of its own.
  *Fotos verkleinern* opens from *Große Dateien*, not from home.
- **Two gestures.** The swipe up to decide later is gone; *Später* is a
  button. The guided review teaches two gestures; the hint line under the
  buttons shows only while they are learned. *Ähnliche Fotos zeigen* moved
  from the review card into *Groß ansehen*.
- **Honest numbers.** *357 MB könnten weg* (was *können frei werden*); on the
  iPhone a line that iCloud-only originals free iCloud; the delete sheet and
  home say the space comes back once *Zuletzt gelöscht* / the Trash is emptied.
- **Marking is never red.** The group card's *Ohne Stern vormerken* is teal
  with the archive (red from that afternoon until the evening); *Rest
  vormerken* instead of *Die anderen zum Löschen vormerken*.
- **Coming back.** The *Seit …* card, the new-trip card, the reminder offered
  once, the rating after two real deletes (iPhone: StoreKit's prompt through a
  new native `requestReview`).
- **Gone:** the streak's state (`AppState.days`, `src/logic/streak.ts`): nothing
  had shown it since the afternoon. Old decision files still load (the field
  is ignored).
- `DRY_RUN_IN_RELEASE` is `false` again.
- `App.tsx` lost the albums, the photo and video tools and the widget to
  `src/useAlbums.ts`, `src/useMediaTools.ts`, `src/useWidget.ts`.
- Store texts lead with trust; an Arabic listing; release notes in
  `release-notes/2.0.16/`.

## 18 November 2026 — moved out of features.md

- (*The one next step* — a large photo card such as *Ein guter Anfang ·
  Unwichtige Fotos · Ansehen* — left home on 18 November 2026: the same
  categories are rows in *Vorschläge*. The reveal after the first scan still
  recommends one step.)
- **One next step**, a card made of its photos with one button; why it is
  the step (*Ein guter Anfang*, *Weiter, wo du warst* …) is a small label on
  its photo:
  - progress exists (a month gone through) → the next month not gone through,
    newest first: *Weiter, wo du warst · Oktober 2026 · 148 Fotos · 12 %
    deiner Mediathek durchgesehen* → **Weiter mit Oktober 2026** (and *Alle
    Monate*);
  - else photos wait on the decide-later pile → *Noch offen · Später
    entscheiden* → **Jetzt entscheiden**;
  - else the category that frees the most → *Ein guter Anfang · Fast gleiche ·
    11 Fotos · bis zu 32 MB* → **Ansehen**;
  - else month by month from the newest month → **Mit November 2026
    anfangen**; with nothing at all, *Alles aufgeräumt*.

- (*Weitermachen* [Carry on] is gone since 18 November 2026: its two rows
  moved into *Mehr Platz*.)

- (*Aus deiner Mediathek* — On this day and the latest trip as small tiles —
  left *Aufräumen* on 18 November 2026: both live on *Ordnen*.)
