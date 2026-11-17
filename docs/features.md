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
  only look at new and changed photos (a quiet *wird aktualisiert …*), and drop
  deleted ones. It runs at every start, when coming back to the app after a
  while, and when photos change while the app is open.
- *Neu durchsuchen* [Scan again] in Settings.
- iCloud-only originals are never downloaded.
- **The on-device AI** (docs/AI.md) looks at each photo after that: the
  subtitle on *Aufräumen* counts along (*KI: 1.234 von 5.000 Fotos*), results show up
  every 480 photos, the app stays usable. It pauses when the phone runs hot
  and continues with the next scan. Nothing leaves the phone.

## Home: two tabs
The root has two tabs in a floating bar at the bottom: **Aufräumen** [Clean up]
and **Ordnen** [Organise]. Each keeps its scroll position; tapping the current
tab again scrolls to its top; Android's back button goes from *Ordnen* to
*Aufräumen* first. Settings is the round button at the top right of both.

### Aufräumen [Clean up]
- The number of photos under the title.
- **The clean-up card**: the space that could be freed (one big number), a
  bar split into one segment per category (sized by the space it frees, in
  the category's colour), the free space on the device (*2,4 GB von 128 GB
  auf dem Gerät frei*), what Bildklar has freed so far (*Bisher freigegeben:
  1,2 GB*), *Jetzt aufräumen* [Clean up now].
- *3 Tage in Folge aufgeräumt* [3 days in a row of cleaning up] on the card
  once the streak is two days or more.
- **Vorschläge** [Suggestions]: *Duplikate* [Duplicates], *Fast gleiche*
  [Near-identical], *Missglückt* [Failed shots: blurry, too dark, too
  bright], *Screenshots* and (once the AI has seen photos) *Unwichtige Fotos*
  as cards, each with up to four of its own photos, its colour dot and the
  space it would free (*222 MB · 9 Fotos*); the most space first. An odd last
  card takes the whole row. Categories with nothing left are listed in one
  line: *Erledigt: Duplikate, Screenshots* [Done: …].
- **Mehr Platz** [More space]: *Große Dateien* [Large files] (size and count),
  *Fotos verkleinern* [Smaller photos] (*bis zu 115 MB*), on the iPhone
  *Live Photos*, on Android *Aus Apps* [From apps] — rows with a photo.
- **Weitermachen** [Carry on]: *Später entscheiden* [Decide later] with the
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
- Photos taken within three minutes that look almost the same form a group.
  The list shows each group's photos with the suggested best one starred and
  how many could go.
- **A group**: the best one large, the series under it. A tap on another photo
  keeps that one instead (the app remembers). *Die anderen löschen* [Delete the
  others] (with their size) goes straight to the system's dialog;
  *Durchgehen* reviews them one by one.
- **The best shot**: the sharpest, well exposed one; on the iPhone also the
  best face and open eyes. A favourite always wins.

## Duplicates
- The same picture again, however much later: a photo saved again from a
  messenger, an imported copy. Same fingerprint (at most 2 of 64 bits apart),
  same shape and the same light (brightness and contrast); flat pictures
  (sky, a wall, a dark pocket shot) never count. A burst and its later copy
  form one group.
- Listed like the near-identical groups, with the copy to keep marked
  *Original*: a favourite, else the one with the most pixels, else the
  sharpest, else the oldest. A tap keeps another one; *Die anderen löschen*
  and *Durchgehen* as for near-identical photos.

## Similar videos (*Ähnliche Videos*)
- The same scene filmed twice within two hours — two takes, a clip and its
  longer retry — found by the on-device AI's picture of each video's poster
  frame (not only exact copies). Listed at the end of *Duplikate* under
  *Ähnliche Videos* and on the clean-up card; the best take is the longest
  sharp one, then the larger file. The threshold is provisional
  (`src/logic/lookalike.ts`).

## Large files and videos
- Photos and videos of 10 MB or more, biggest first (at most 300); *Alle*,
  *Videos*, *Fotos*. Each tile shows its size (≈ where the iPhone can only
  estimate) and a video's length. Nothing is suggested for deleting;
  *Durchgehen* reviews them with every suggestion on keep.
- A tap opens the file: date, size, length, **Video verkleinern** [Make video
  smaller] for videos of 30 MB or more, and *Video/Foto löschen*.
- **Making a video smaller** (needs the unlock): a copy at about a third of the
  bitrate (iPhone: HEVC at most 1080p; Android: HEVC where the phone can, 2–8
  Mbit/s) is saved next to the original with its date and place, with progress
  while it runs. Not saved when it would not be at least 20 % smaller. Then
  *Original löschen?* → the system's dialog, or keep both.
- **Duplicate videos**: the same length (± 0.5 s), shape and poster frame,
  listed under *Duplikate*.
- Videos are not part of trips, near-identical groups or the blurry list.

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
- Never among them: favourites, screenshots (they have their own list),
  videos, photos with a face (iPhone), photos kept in a review. The clean-up
  card counts them once (*Unwichtige Fotos (KI)*), after duplicates,
  near-identical and blurry photos.
- *Auf deinen Fotos* [On your photos]: a row of categories (kids, people,
  pets, food, landscapes) with a cover and a count; a tap shows the photos.

## Month by month
- The header shows the same figure: *38 % durchgesehen · 7 von 18 Monaten* and the bar.
- Every month of the library, newest first, with a photo, the number of photos
  and the size; a month gone through to its end is marked *Durchgesehen* [Done].
- A tap reviews the month: extra shots, blurry photos and old screenshots are
  suggested for deleting, the rest for keeping.
- **Videos** join the month (and *An diesem Tag*) in time order: a copy of
  another video → delete; a screen recording older than 30 days → delete;
  every other video → keep, with its length and size (*2:14 · 480 MB*). A
  video shows its poster frame with a play button: a tap plays it in the
  system's player (iPhone: over the app; never downloaded from iCloud).
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
  free space, then *35 Fotos löschen · 91 MB* → the system's dialog — or
  *Durchgehen* [Review] for the same photos first. Needs the unlock.
- Favourites are never suggested, nor a photo you kept in a review before.

## Review
- One photo at a time, large, with the suggestion (*Vorschlag: löschen —
  fast gleich wie ein anderes Foto*). Swipe left to delete, right to keep, up
  for **Später** [Later] — or the three buttons, or the arrow keys (← → ↑).
  Undo at the top; *Beenden* [Finish] any time.
- At the end: *Zum Löschen markiert: 4 Fotos (13 MB)* with thumbnails and
  **4 Fotos löschen** [Delete 4 photos] → the system's dialog → Recently
  Deleted (iPhone) / the Trash (Android). Nothing is deleted before that.
  Needs the unlock.
- Photos you kept against the suggestion are remembered and not suggested again.
- **Into albums while swiping** (needs the unlock): a row of album chips
  under the photo (the last used first) and *+ Neues Album* [New album]. A tap
  keeps the photo, files it into that album and moves on; undo takes it out
  again. Nothing is written during the review: the end screen lists
  *3 Fotos löschen · 5 Fotos in 2 Alben* with each album, then does it all in
  one go — iPhone: the photos are added to the albums (nothing moves);
  Android: an album is a folder, so the photos move there after one system
  dialog (*Die Fotos werden in den Ordner verschoben*). Albums made here show
  up in Settings › Geschützt.
- **Decide later**: photos swiped up land on a pile; the end screen says
  *3 für später gemerkt* [3 saved for later]. Home shows *Später entscheiden (3)*
  [Decide later] while the pile isn't empty; it goes through the pile with no
  suggestion. A photo leaves the pile once it is kept or deleted, or when it
  is gone from the library.

## The unlock
- Scanning, trips, groups, the blurry list and reviews are free. Making an
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
- **Fotos**: the access (all / selected / none), *Fotos auswählen*, *Zugriff
  in den Einstellungen ändern*, *Neu durchsuchen*, the storage on the device
  (free of total) and what Bildklar has freed so far (photos and size).
- **Vollversion**: unlock or *Freigeschaltet*, restore.
- **Darstellung**: language (Deutsch, English), appearance (system, light, dark).
- **Nur in der Debug-Version**: *Probelauf* [Dry run] — on by default in debug
  builds: nothing in the photo library changes, the app says what it would have done.
- **Über die App**: rate (once the App Store id is set), feedback by mail,
  privacy policy, licences (GeoNames, fonts, icons).
- *Meine Entscheidungen zurücksetzen* [Reset my decisions] (with undo): trip
  edits, best-shot picks, kept photos, the months marked as done (the
  "freed so far" count stays).

## Photos from apps (*Aus Apps*, Android)
- Photos and videos saved by messengers and other apps, told apart by their
  folder: WhatsApp, Telegram, Signal, Instagram, Messenger / Facebook,
  Snapchat, Downloads, and *Andere Apps* [Other apps] for any other folder
  outside DCIM (not the screenshots, not Bildklar's own folders).
- One card per app with the count and size; the sort menu sets the order
  (newest or largest first) of the review a tap starts. Only memes, receipts,
  documents and photos of screens (the AI's labels) are suggested for deleting;
  everything else comes with no suggestion — a photo of the grandchildren sent
  by the family is precious.
- Home tile *Aus Apps · 1,8 GB* once those photos hold at least 100 MB.
- **iPhone: not yet** — Photos doesn't record which app saved a photo; a test
  decides whether the iPhone can tell well enough (docs/AI.md).

## Protected photos
- **Geschützt** [Protected]: a protected photo is never suggested for
  deleting, by anything — duplicates, near-identical, failed shots, screenshots,
  unimportant photos, quick clean, every review. Protected are:
  favourites; photos kept in a review; photos protected by hand (the shield
  *Schützen* [Protect] in the review: kept and protected for good); every photo
  of a trip marked *⋯ › Nie vorschlagen* [Never suggest]; and every photo of the
  albums (iPhone) / folders (Android) switched on in *Einstellungen › Geschützt*.
- Settings › Geschützt lists the albums / folders with a switch each, the
  protected trips and the photos protected by hand; each protection is lifted
  with a tap.
- In a duplicate or near-identical group a protected photo stays and ranks
  like a favourite, so it becomes the best shot.

## Everywhere
- Dark mode, Larger Text (iPhone Dynamic Type; Android's font scale), VoiceOver
  / TalkBack labels on every photo and button, reduced motion.
- Android words it Android's way (folders, the Trash, Google Play).
- **Sorting lists**: Screenshots, Large files, Live Photos, Failed shots,
  Unimportant photos and a category have a sort menu at the top right —
  *Neueste zuerst · Älteste zuerst · Größte zuerst* [Newest · Oldest · Largest
  first]. The choice is remembered per screen; a review started from the list
  follows its order. Large files start with the largest, the rest with the newest.
