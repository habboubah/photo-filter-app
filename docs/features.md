# Bildklar – features

Every feature, as the user sees it (German labels, English in brackets).

## First start and photo access
- **Permission screen**: what the app does in three lines, *Fotos freigeben*
  [Allow access to photos] → the system's dialog. "Selected photos" works too.
- **Selected photos only** (iPhone *Limit Access*, Android 14+ *Select photos*):
  a card on home says so, with *Fotos auswählen* [Select photos] → the
  system's picker; the app rescans afterwards.
- **No access** (denied, or restricted by Screen Time): the screen explains it
  and offers *Einstellungen öffnen* [Open Settings].

## The scan
- Looks at every photo and video once: when and where it was taken, how sharp,
  how bright, and a fingerprint to spot near-identical shots (a video's poster
  frame). On the iPhone every frame of a burst is seen, not just the one Photos
  shows; videos, screen recordings and Live Photos are marked as such. Progress on home
  (*12.340 von 48.210 Fotos angesehen*); the first time takes a few minutes and
  keeps the screen on.
- **Resumable and incremental**: an interrupted scan continues; later scans
  only look at new and changed photos (the rescan button spins), and drop
  deleted ones. It runs at every start, when coming back to the app after a
  while, and when photos change while the app is open.
- *Neu durchsuchen* [Scan again]: the round button at the top of *Aufräumen*,
  beside search and settings; it spins while a scan runs, and its label says
  when the last scan ran (*Durchsucht vor 5 Minuten*). A tap asks first
  (*Alle Fotos neu durchsuchen?*), then looks at **every** photo again from
  the start, the AI's pass too: the scan cache and the thumbnails are emptied
  and the app shows a first scan. What you kept, protected or renamed stays
  (it is a file of its own). The automatic scans stay incremental.
- iCloud-only originals are never downloaded.
- **The on-device AI** (docs/AI.md) looks at each photo after that: the
  line above the card on *Aufräumen* counts along (*KI: 1.234 von 5.000 Fotos*), results show up
  every 480 photos, the app stays usable. It pauses when the phone runs hot
  and continues with the next scan. Nothing leaves the phone.

## Home: two tabs
The root has two tabs in a floating bar at the bottom: **Aufräumen** [Clean up]
and **Ordnen** [Organise]. Each keeps its scroll position; tapping the current
tab again scrolls to its top; Android's back button goes from *Ordnen* to
*Aufräumen* first. Settings is the round button at the top right of both;
**Suchen** [Search], the magnifier beside it; on *Aufräumen*, *Neu durchsuchen*
[Scan again] beside that.

### Aufräumen [Clean up]
- No large title: the clean-up card comes first. The AI's pass counts along
  in one quiet line above it (*KI: 1.234 von 5.000 Fotos*).
- **The clean-up card**: the space that could be freed (one big number) and
  how much of it is photos and how much videos (*Fotos: 176 MB von 1,9 GB*,
  *Videos: 2,2 MB von 169 MB*); a bar of the whole library — one segment per
  category that could go (sized by the space it frees, in the category's
  colour), then *Gute Fotos* and *Gute Videos*, paler — with its legend.
- **The table** under the bar: a row for *Fotos* and one for *Videos*, each
  with how many were scanned (*Gescannt*), how many are fine (*Gut*: not
  marked for deleting) and how many could go (*Kann weg*). *Fotos* opens
  *Monat für Monat*, *Videos* all videos, largest first.
- Then the free space on the device (*2,4 GB von 128 GB auf dem Gerät frei*),
  what Bildklar has freed so far (*Bisher freigegeben: 1,2 GB*), *Jetzt
  aufräumen* [Clean up now].
- *3 Tage in Folge aufgeräumt* [3 days in a row of cleaning up] on the card
  once the streak is two days or more.
- **Vorschläge** [Suggestions]: photos and videos apart — *Duplikate*
  [Duplicates] (copies of photos), *Fast gleiche* [Near-identical],
  *Ähnliche Videos* [Similar videos], *Missglückt* [Failed shots: blurry, too dark, too
  bright], *Screenshots* and (once the AI has seen photos) *Unwichtige Fotos*
  as cards, each with up to four of its own photos, its colour dot and the
  space it would free (*222 MB · 9 Fotos*); the most space first. An odd last
  card takes the whole row. Categories with nothing left are listed in one
  line: *Erledigt: Duplikate, Screenshots* [Done: …].
- **Mehr Platz** [More space]: *Große Dateien* [Large files] (size and count),
  *Fotos verkleinern* [Smaller photos] (*bis zu 115 MB*), on the iPhone
  *Live Photos*, *Chats & soziale Medien* [Chats & social media] — rows with a photo.
- **Weitermachen** [Carry on]: *Zum Löschen* [To delete] while anything waits
  there (its size, *Noch nicht gelöscht*, the count; see *To delete*),
  *Später entscheiden* [Decide later] with the
  number on the pile (see *Review*), and *Monat für Monat* [Month by month]
  with *38 % durchgesehen* [38 % gone through] and a thin bar — the photos in
  months gone through, as a share of all photos (rounded down, so 100 % only
  once every month is done).

### Ordnen [Organise]
- The number of trips and photos under the title.
- **An diesem Tag** [On this day]: when photos were taken on today's date in
  earlier years, one of them as a large photo with the years; *Ansehen* [Look
  back] reviews them (extra shots and blurry ones suggested for deleting).
- **Reisen** [Trips]: the newest three as large cards (a photo from the
  middle of the trip as the cover, the name, photos and size, *Album
  erstellt* once made); *Alle Reisen (4)* [All trips] opens the full list.
- **Auf deinen Fotos** [On your photos]: the on-device AI's categories
  (landscape, food, …), each with a photo and its count.

## Trips
- Found by themselves: photos taken more than 50 km from home over at least
  six hours; photos without a location taken in between join. Home is where
  most photo-days were — and it follows a move, not a holiday.
- Named **"City, Month Year"** from an offline city list (*Paris, Mai 2026*,
  *Wien, Dezember 2025 – Januar 2026*), in German or English.
- **A trip** shows all its photos (a grid that copes with thousands) and its size.
- *⋯ › Umbenennen* [Rename] (the automatic name stays visible under it),
  *In zwei Reisen teilen* [Split] at a day, *Mit einer anderen Reise
  zusammenführen* [Join], *Ausblenden* [Hide] (with undo; hidden trips sit at
  the end of *Alle Reisen*), and undoing a split or a join.
- **Album erstellen** [Create album] (iPhone): a real album in Apple Photos with
  the trip's name; the photos stay where they are. **Ordner erstellen** [Create
  folder] (Android): the photos move into `Pictures/Bildklar/<trip>/` after
  Android asks; nothing is copied. Needs the unlock.
- *Durchgehen* [Go through]: a review of the whole trip (see Review).

## Near-identical photos
- Photos taken within three minutes that look almost the same form a group:
  their fingerprints are close (at most 10 of 64 bits apart) **and** the
  on-device AI sees the same picture (their vectors alike, docs/AI.md). A
  photo of the same scene up to 30 minutes later joins when it is very
  alike. In a group of three or more, a photo far from the group's middle
  leaves it — so a series that drifts doesn't become one group. Without the
  AI's vectors yet (the first scan) the fingerprints alone decide.
  The list shows each group's photos with the suggested best one starred and
  how many could go.
- **A group**: the best one large, the series under it. A tap on another photo
  keeps that one instead (the app remembers). *Die anderen löschen* [Delete the
  others] (with their size) goes straight to the system's dialog;
  *Durchgehen* reviews them one by one; *Alle behalten* [Keep all] keeps
  every photo of the group and the group is not suggested again (with undo;
  a new copy joining it later opens it again; *Von vorn anfangen* brings it
  back).
- **The best shot**: the sharpest, well exposed one; on the iPhone also the
  best face and open eyes, on Android the best faces (the YuNet face
  detector, on the phone). A favourite always wins. **It learns**: after ten
  times you picked another best shot, the app weighs what your picks were
  better at (sharpness, light, faces, eyes) more — stored on the phone only.
- Each photo that could go carries a small chip with its reason
  (*Unschärfer* [Blurrier], *Kopie* [Copy], *Serie* [Burst]) — see *How sure*.

## Duplicates
- The same picture again, however much later: a photo saved again from a
  messenger, an imported copy. Same fingerprint (at most 2 of 64 bits apart),
  same shape and the same light (brightness and contrast); flat pictures
  (sky, a wall, a dark pocket shot) never count. A burst and its later copy
  form one group.
- **Edited copies**: a copy that was cropped a little, filtered or brightened
  (at most 4 bits apart, the same shape) counts when the AI's vectors say it
  is the same picture — always marked *Bitte prüfen* [Please check]. A
  strongly cropped copy is not found yet.
- Listed like the near-identical groups, with the copy to keep marked
  *Original*: a favourite, else the edited one (iPhone: edits made in
  Photos), else the one with a place, else the one with the most pixels, else
  the sharpest, else the oldest. A tap keeps another one; *Die anderen löschen*,
  *Durchgehen* and *Alle behalten* as for near-identical photos.

## Similar videos (*Ähnliche Videos*)
- The same scene filmed twice within two hours — two takes, a clip and its
  longer retry — found by the on-device AI's picture of each video's poster
  frame (not only exact copies). With the copies of a video they have their
  own card and screen, *Ähnliche Videos*, apart from the photos (also in the
  clean-up list and in *Schnell aufräumen*); the best take is the longest
  sharp one, then the larger file. The threshold is provisional
  (`src/logic/lookalike.ts`).

## Large files and videos
- Photos and videos of 10 MB or more, biggest first (at most 300); *Alle*,
  *Videos*, *Fotos*. Each tile shows its size (≈ where the iPhone can only
  estimate) and a video's length. Nothing is suggested for deleting;
  *Durchgehen* reviews them with every suggestion on keep.
- A tap opens the file: date, size, length, a play button on a video's
  picture, **Video verkleinern** [Make video smaller] for videos of 30 MB or
  more, and *Video/Foto löschen*.
- **Making a video smaller** (needs the unlock): a copy at about a third of the
  bitrate (iPhone: HEVC at most 1080p; Android: HEVC where the phone can, 2–8
  Mbit/s) is saved next to the original with its date and place, with progress
  while it runs. Not saved when it would not be at least 20 % smaller. Then
  *Original löschen?* → the system's dialog, or keep both.
- **Duplicate videos**: the same length (± 0.5 s), shape and poster frame,
  listed under *Duplikate*.
- Videos are not part of trips, near-identical groups or the blurry list.

## Playing videos
- A video plays **inside the app**, wherever its picture is shown: the play
  button on a review card, on a large file's sheet, on the one to keep of
  similar videos and on each of its series (picking the one to keep stays the
  tile's tap), and any video tile in a grid that opens nothing else (a
  category, screen recordings, …) — those tiles carry ▶ and the length.
- iPhone: the system's player over the app (AVPlayerViewController), from the
  phone only — a video that is only in iCloud is never downloaded: *Das Video
  ist nicht auf diesem Gerät – es liegt nur in der Cloud.*
- Android: a full-screen player of the app's own (the platform's VideoView and
  its controls: a tap shows play / pause and the timeline), closed with Back or
  its round close button; the screen stays on while it plays. Never handed to
  another app. A file the phone can't play: *Dieses Video lässt sich hier nicht
  abspielen.*
- In the browser (`npm run dev`) the test library's videos play full screen
  over the app with the browser's controls; the curated demo has pictures
  only, so its videos say *Dieses Video lässt sich hier nicht abspielen.*

## Smaller photos (*Fotos verkleinern*, needs the unlock)
- Home tile *Fotos verkleinern · bis zu 3,1 GB* [Smaller photos · up to …]
  when there is something to gain (estimate: half of a camera JPEG, 70 % of a PNG).
- Which photos: JPEG or PNG, at least 1 MB, not RAW/ProRAW, not edited (re-saving
  would bake the edit in), not a Live Photo, not protected. PNG screenshots are
  their own tab.
- A grid, the largest saving first, all selected (a tap leaves one out; *Alle* /
  *Keine*), then **42 Fotos verkleinern** → a progress sheet → *1,2 GB gespart —
  Originale löschen?* [… saved — delete the originals?] → the system's dialog.
- iPhone: re-saved as HEIC (quality 0.8) with all metadata (EXIF, GPS,
  orientation, date), as a new photo with the same date, place, favourite flag,
  in the same albums. Android: HEIC through HeifWriter where the phone has an
  HEVC encoder, else JPEG at quality 82; EXIF, date taken and folder kept.
- A copy is kept only when it is at least 30 % smaller. Works in batches of 20
  and stops cleanly when the app goes to the background. The dry run encodes
  but writes nothing.

## Live Photos (iPhone)
- Every Live Photo, newest first, with the estimated saving (≈ 3 MB each).
  **In Fotos umwandeln** [Make plain photos] (needs the unlock) → a
  confirmation → each becomes a plain photo (the picture as edited, date,
  place, favourite flag, albums) → the system's dialog moves the Live Photos to
  Recently Deleted. Declined: both stay.

## Screenshots
- Every screenshot and screen recording, newest first; *Älter als 30 Tage* [Older than 30 days]
  (the ones the clean-up card counts) or *Alle* [All]. *Durchgehen* reviews
  them, all suggested for deleting. Favourites and kept ones are left out.

## Unimportant photos (on-device AI)
- *Unwichtige Fotos* [Unimportant photos] on home: receipts, documents,
  whiteboards and notes, photos of a screen, saved screenshots, memes, QR
  codes and accidental shots, found by the AI on the phone (SigLIP 2, docs/AI.md).
  Chips filter by kind (*Kassenzettel · 2*); *Durchgehen* reviews them, each
  suggested for deleting with its reason (*KI: Kassenzettel*).
- What the AI looks for (33 labels, docs/AI.md): receipts, documents,
  whiteboards, photos of a screen, saved chats, memes, QR and barcodes,
  accidental shots, tickets, product photos (taken while shopping), parking
  signs and maps are *unwichtig*; kids, babies, people, selfies, groups,
  pets, food, birthdays, playgrounds, school, beach, snow, landscapes,
  cities, flowers, home, Christmas, Ramadan and sports are memories and keep
  a photo out.
- Never among them: favourites, screenshots (they have their own list),
  videos, photos with a face (iPhone), photos kept in a review, and **photos
  of an ID or a bank card** (the AI's *sensitive* labels) — those are
  protected: people need them. The clean-up
  card counts them once (*Unwichtige Fotos (KI)*), after duplicates,
  near-identical and blurry photos.
- *Auf deinen Fotos* [On your photos]: the memory categories, four to a
  row, each a photo with its name and count under it; a tap shows the photos.

## Search (*Suchen*)
- The magnifier on both tabs opens **Suchen** [Search]: *Was ist auf dem
  Foto?* [What is in the photo?]. As you type, it suggests words it knows —
  247 concepts in German, English and Arabic (*Hund*, *Strand*, *Kassenzettel*,
  *Geburtstag*, and for parents *Baby*, *Baden*, *Schlafen*, *erste Schritte*,
  *Schnuller*, *Laternenumzug* …); tap one. Several words find photos that
  show all of them.
- *In deinen Fotos* [In your photos]: before anything is typed, up to 16
  cards (three to a row, four on a wider screen) with words your library really has (of about 60), each with its best
  photo: first up to six family words (*Baby*, *Kind*, *Familie*, *Zwillinge*,
  *Geburtstag* …), then the others with most photos (*Kassenzettel*, *Stadt*,
  *Zoo* …); no two cards with mostly the same photos. A tap searches for it. A word the library hasn't got is not offered, and a photo of an ID
  or a bank card is never a cover. Until the AI has seen the photos, plain
  examples instead (*Zum Beispiel*).
- Found by the on-device AI from each photo's vector, best match first (at
  most 500); a grid, and *Durchgehen · 24 Fotos* [Go through] reviews them
  with no suggestion.
- Ready once the AI has seen the photos (*42 % sind schon fertig*). An
  unknown word says so. Nothing is sent anywhere.

## Similar photos of one photo (*Ähnliche Fotos*)
- In a review, the button *Ähnliche Fotos zeigen* [Show similar photos] opens
  every photo like this one, from any year: the same document photographed
  twice, the same view on every holiday. *Durchgehen* reviews them.

## How sure (*Sicher, wahrscheinlich, prüfen*)
- Every photo suggested for deleting says how sure Bildklar is, on the photo
  in the review and on a group's tiles, with one reason:
  - **Sicher** [Sure]: an exact copy, a smaller copy of a photo that stays, a
    burst frame nobody picked.
  - **Wahrscheinlich** [Likely]: near-identical to the best shot and blurrier
    (*Unschärfer als das beste*), eyes closed (*Augen zu*), worse light
    (*Schlechteres Licht*) or nearly the same (*Fast gleich wie das beste*); a
    clearly blurry photo; an old screenshot; a clear utility photo.
  - **Bitte prüfen** [Please check]: everything less sure — an edited copy,
    similar videos, a photo just over a bar.
- **Schnell aufräumen** takes only *Sicher* and *Wahrscheinlich* photos;
  the rest are offered as their own review: *Dazu 6 Fotos, bei denen Bildklar
  nicht sicher ist* … *Unsichere durchgehen* [Go through the unsure ones].
- **It learns** what you keep: per kind of suggestion (near-identical,
  blurry, each AI label …) the phone counts what you deleted and kept in
  reviews. After ten, when you kept 30 % or more, that kind becomes one level
  less sure (50 %: two), and an AI label needs a higher score. Testers see
  the table in Settings (*Treffsicherheit auf diesem Handy*). Stays on the
  phone; *Von vorn anfangen* forgets it.

## Month by month
- The header shows the same figure: *38 % durchgesehen · 7 von 18 Monaten* and the bar.
- Every month of the library, newest first, with a photo, the number of photos
  and the size; a month gone through to its end is marked *Durchgesehen* [Done].
- A tap reviews the month: extra shots, blurry photos and old screenshots are
  suggested for deleting, the rest for keeping.
- **Videos** join the month (and *An diesem Tag*) in time order: a copy of
  another video → delete; a screen recording older than 30 days → delete;
  every other video → keep, with its length and size (*2:14 · 480 MB*). A
  video shows its poster frame with a play button: a tap plays it inside the
  app (see *Playing videos*).
  The end screen counts videos apart (*Dazu 2 Videos, 1,1 GB*). Trips stay
  photos only.

## Failed shots (*Missglückt*)
- The home tile *Missglückt* [Failed shots] opens one screen with three tabs:
  *Unscharf · Zu dunkel · Zu hell* [Blurry · Too dark · Too bright].
- **Blurry**: every photo's sharpness, as three levels: *Sehr wahrscheinlich*,
  *Wahrscheinlich*, *Vielleicht unscharf* [Very likely / Probably / Maybe
  blurry]. Photos with little to see (fog, a dark room) are judged more gently.
  *Sicher* [Sure] shows the first two levels, *Alle* [All] all three, as a grid
  with a coloured dot each. *Durchgehen* reviews them.
- **Too dark / too bright**: photos with almost nothing to see — a pocket shot,
  the lens cap, a picture washed out by the sun — from the brightness and
  contrast the scan already measures. Night photos with lights stay out. The
  on-device AI's *accidental* label lets a borderline photo in. Favourites,
  photos with faces and photos you kept never come in. A photo counts once:
  a black, blurry frame is listed as too dark, not as blurry.
- They are part of the clean-up card (*Zu dunkel oder zu hell*), the quick
  clean, *Alle durchgehen* and the reviews of a month, a trip and *An diesem Tag*.
- The thresholds are provisional (`src/logic/exposure.ts`).

## Clean-up
- *Aufräumen* lists what the card counts (duplicates, near-identical, blurry,
  too dark or too bright, old screenshots, unimportant photos) with sizes, *Alle durchgehen* [Go through all] and
  **Schnell aufräumen** [Quick clean]: a switch per kind (all on), the
  free space, then *35 Fotos löschen · 91 MB* → into *Zum Löschen* — or
  *Durchgehen* [Review] for the same photos first. Needs the unlock.
- Favourites are never suggested, nor a photo you kept in a review before.

## Review
- One photo at a time, large, with the suggestion (*Vorschlag: löschen —
  fast gleich wie ein anderes Foto*). Swipe left to delete, right to keep, up
  for **Später** [Later] — or the three buttons, or the arrow keys (← → ↑).
  Undo at the top; *Beenden* [Finish] any time. Under *12 von 40* [12 of
  40] the space marked so far counts up in red (*− 48 MB*).
- At the end: the space it would free as one big number (*13 MB — kannst du
  jetzt freigeben* [you can free up now]), *Zum Löschen markiert: 4 Fotos
  (13 MB)* with thumbnails and
  **In „Zum Löschen“ legen · 4 Fotos** [Put in “To delete”] — nothing is
  deleted yet (*Noch wird nichts gelöscht …*); see *To delete*.
- Photos you kept against the suggestion are remembered and not suggested again.
- **Into albums while swiping** (needs the unlock): a row of album chips
  under the photo (the last used first) and *+ Neues Album* [New album]. A tap
  keeps the photo, files it into that album and moves on; undo takes it out
  again. Nothing is written during the review: the end screen lists
  *In „Zum Löschen“ legen · 3 Fotos · 5 Fotos in 2 Alben* with each album, then does it all in
  one go — iPhone: the photos are added to the albums (nothing moves);
  Android: an album is a folder, so the photos move there after one system
  dialog (*Die Fotos werden in den Ordner verschoben*). Albums made here show
  up in *Aufräumen* › Geschützt.
- **Decide later**: photos swiped up land on a pile; the end screen says
  *3 für später gemerkt* [3 saved for later]. *Aufräumen* › *Weitermachen* shows *Später entscheiden (3)*
  [Decide later] while the pile isn't empty; it goes through the pile with no
  suggestion. A photo leaves the pile once it is kept or deleted, or when it
  is gone from the library.

## To delete (*Zum Löschen*)
- **Nothing is deleted the moment you choose it.** Whatever you pick to
  delete — the end of a review, *Die anderen löschen* in a group, quick
  clean, *Video/Foto löschen* in the large files — goes into *Zum Löschen*
  first. It leaves the group, list, trip and count it was in at once, as if
  it were gone; a toast says *4 Fotos in „Zum Löschen“* with **Rückgängig**
  [Undo].
- *Aufräumen* › *Weitermachen* › **Zum Löschen** opens it: the photos, the
  last put aside first, each with its size (a video with its length). A tap
  selects one; **Zurücklegen · 2 Fotos** [Put back] returns them to where
  they were (with undo), *Nur diese löschen* [Delete only these] deletes just
  them.
- With nothing selected: **12 Fotos löschen · 340 MB** → the system's dialog
  → Recently Deleted (iPhone) / the Trash (Android) — the only place that
  deletes — and *Noch einmal durchgehen* [Go through them again]: a review
  without a suggestion, swiped right goes back, swiped left is deleted at the
  end (*1 Foto löschen*), up stays in the list.
- Free deletes (before the unlock) are counted here, when the photos really
  go. It is kept with the decisions (it survives a restart and *Entscheidungen
  zurücksetzen*); a photo deleted elsewhere leaves it by itself.
- Making a video or photos smaller and turning Live Photos into stills still
  ask about the originals right away: the copy is already saved.

## The unlock
- **Not for sale yet — the launch phase** (`UNLOCK_ON_SALE` is `false` in
  `src/logic/allowance.ts`, since 17 November 2026). Everything below is
  built, but what the unlock pays for is **hidden**, not shown locked: no
  *Album erstellen* on a trip, no album chips in a review, no *Fotos
  verkleinern* and *Live Photos* tiles, no *Video verkleinern* in the large
  files, no *Vollversion* section in Settings, never the paywall. Deleting has
  **no limit** and nothing is counted. The permission screen promises the
  trips instead of an album per trip. Someone who owns the unlock anyway (a
  TestFlight purchase, the demo's `owned`) sees the extras.
- **Every start in the launch phase marks the install as early**
  (`AppState.early`, kept by *Von vorn anfangen*). When the
  unlock goes on sale, early installs keep deleting without a limit; only the
  extras need the purchase. New installs from then on get the 50 free deletes.
- Once on sale: scanning, trips, groups, the blurry list and reviews are free. Making an
  album/folder, smaller videos, Live Photo conversion and deleting need
  **one one-time purchase** (4,99 €, no subscription). The paywall appears
  when needed, and from Settings.
- **50 deletes without buying** (`FREE_DELETES` in `src/logic/allowance.ts`):
  a lifetime count, not per day, kept with the decisions (a reset keeps it, a
  reinstall starts over). The toast after a delete shows what is left
  (*Noch 47 Fotos ohne Kauf löschbar*), so does the unlock row in Settings. A
  selection larger than what is left opens the paywall, which says so (*Du
  hast 3 Fotos ausgewählt – ohne Kauf gehen noch 2.*) and also offers
  *2 Fotos löschen* for the first ones selected. Albums, compression and Live
  Photo conversion get no free tries.
- The paywall lists what the unlock adds, then the price on its own
  (*4,99 € — Einmal zahlen – kein Abo — Alles bleibt auf deinem Gerät*),
  then *Für 4,99 € freischalten*. No countdown, no discount.
- *Käufe wiederherstellen* [Restore purchases] on the paywall and in Settings.
- Family Sharing (iPhone); the purchase follows the Google account (Android).

## Widget and reminder
- **Widget** (iPhone home screen, small and medium; Android app widget): *An
  diesem Tag* with a photo from an earlier year, else the space that could be
  freed and the free space — or, with nothing to clean up, *38 % deiner Fotos
  durchgesehen* [38 % of your photos gone through]. The app updates it whenever that changes; a tap
  opens the app.
- **Lock Screen widget** (iPhone, iOS 16+): three shapes — a line
  *Bildklar · 2,4 GB frei machbar · 38 % durchgesehen*, a round gauge of the
  progress figure, and one line beside the clock. Monochrome, so never a
  photo; a tap opens the app on home. Android phones have no Lock Screen
  widgets: the home-screen widget stays the only one there.
- **Wöchentliche Erinnerung** [Weekly reminder] in Settings (off by default):
  the system asks once for notifications, then one notification every Sunday
  at 18:00, scheduled on the phone — no server.

## Settings
- **Fotos** (only with limited access): *Zugriff auf alle Fotos erlauben*
  [Allow access to all photos] opens the system's settings, the only place
  where iOS (and Android, once decided) lets the access change. With full
  access there is nothing to do; with none the app shows its permission
  screen instead. Settings holds only what can be changed: the storage, what was freed and *Fotos auswählen* are on
  *Aufräumen*, so are *Geschützt* (its last row) and *Neu durchsuchen* (at its top).
- **Vollversion**: unlock or *Freigeschaltet*, restore.
- **Darstellung**: language (Deutsch, English, العربية — right to left), appearance (system, light, dark).
- **Nur in der Debug-Version**: *Probelauf* [Dry run] — on by default in debug
  builds: nothing in the photo library changes, the app says what it would have done.
- **Über die App**: rate (once the App Store id is set), feedback by mail,
  privacy policy, *Lizenzen*: every open-source part the app ships (npm
  packages, ONNX Runtime, the SigLIP 2 model, the fonts, GeoNames; on Android
  also AndroidX, Media3, Kotlin), a tap shows its full licence text.
- *Von vorn anfangen* [Start over] (*Deine Fotos bleiben, wie sie sind*; with
  undo): Bildklar forgets every decision — kept, protected and decide-later
  photos, best-shot picks and what it learnt from them and from your reviews, trip edits, the months marked as done, the sort
  orders — so everything is suggested again. The photos and albums, the
  purchase and the "freed so far" count stay.

## Chats & social media (*Chats & soziale Medien*)
- Photos and videos from WhatsApp, Telegram, Signal, Instagram, Messenger /
  Facebook, Snapchat and TikTok, one group per app.
- **Android** tells them apart by their folder, and also lists Downloads and
  *Andere Apps* [Other apps] for any other folder outside DCIM (not the
  screenshots, not Bildklar's own folders).
- **iPhone**: Photos records no source app, but these apps save into an album
  of their own name (*WhatsApp*, *Telegram*, *Instagram*, *Snapchat* …); the
  photos in those albums are the app's. A photo saved from a chat without
  that album (the app's "save to Photos" off) is not found.
- One card per app with the count and size; the sort menu sets the order
  (newest or largest first) of the review a tap starts. Only memes, receipts,
  documents and photos of screens (the AI's labels) are suggested for deleting;
  everything else comes with no suggestion — a photo of the grandchildren sent
  by the family is precious.
- Home row *Chats & soziale Medien · 1,8 GB* under *Mehr Platz* as soon as
  there is anything.

## Protected photos
- **Geschützt** [Protected]: a protected photo is never suggested for
  deleting, by anything — duplicates, near-identical, failed shots, screenshots,
  unimportant photos, quick clean, every review. Protected are:
  favourites; photos kept in a review; photos protected by hand (the shield
  *Schützen* [Protect] in the review: kept and protected for good); every photo
  of a trip marked *⋯ › Nie vorschlagen* [Never suggest]; and every photo of the
  albums (iPhone) / folders (Android) switched on in *Aufräumen › Geschützt*.
- **Ähnliche Fotos mitschützen** [Protect similar photos too] (on unless
  switched off): a photo very like a protected one — the same document, the
  same scene at another time, at least an hour apart — is not suggested
  either (*Schützt gerade 12 Fotos*). The other shots of the same series
  still are, so a protected photo doesn't block its own near-identical group.
- *Aufräumen* › Geschützt (its last rows) lists the albums / folders with a switch each, the
  protected trips and the photos protected by hand; each protection is lifted
  with a tap.
- In a duplicate or near-identical group a protected photo stays and ranks
  like a favourite, so it becomes the best shot.

## Everywhere
- Each list screen explains itself behind the (i) in its bar (*Worum geht’s?*
  [What is this?]); its button at the bottom says what you get
  (*Durchgehen · 7 Fotos · 20 MB* [Go through · 7 photos · 20 MB]).
- Dark mode, Larger Text (iPhone Dynamic Type; Android's font scale), VoiceOver
  / TalkBack labels on every photo and button, reduced motion.
- Android words it Android's way (folders, the Trash, Google Play).
- **Sorting lists**: Screenshots, Large files, Live Photos, Failed shots,
  Unimportant photos and a category have a sort menu at the top right —
  *Neueste zuerst · Älteste zuerst · Größte zuerst* [Newest · Oldest · Largest
  first]. The choice is remembered per screen; a review started from the list
  follows its order. Large files start with the largest, the rest with the newest.
