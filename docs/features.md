# Fotonest – features

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
- Looks at every photo once: when and where it was taken, how sharp, how
  bright, and a fingerprint to spot near-identical shots. Progress on home
  (*12.340 von 48.210 Fotos angesehen*); the first time takes a few minutes and
  keeps the screen on.
- **Resumable and incremental**: an interrupted scan continues; later scans
  only look at new and changed photos (a quiet *wird aktualisiert …*), and drop
  deleted ones. It runs at every start, when coming back to the app after a
  while, and when photos change while the app is open.
- *Neu durchsuchen* [Scan again] on home and in Settings.
- iCloud-only originals are never downloaded.

## Home
- *Deine Fotos* [Your photos] with the number of photos and trips.
- **The clean-up card**: the space that could be freed (one big number), how
  many near-identical and blurry photos, *Aufräumen* [Clean up].
- Two tiles: *Fast gleiche* [Near-identical] (groups) and *Unscharfe* [Blurry] (photos).
- **Trips**: the newest four as cards (a mosaic of their photos, the name,
  photos and size, *Album erstellt* once made); *Alle Reisen* [All trips].

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
  folder] (Android): the photos move into `Pictures/Fotonest/<trip>/` after
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

## Blurry photos
- Every photo's sharpness, as three levels: *Sehr wahrscheinlich*,
  *Wahrscheinlich*, *Vielleicht unscharf* [Very likely / Probably / Maybe
  blurry]. Photos with little to see (fog, a dark room) are judged more gently.
- *Sicher* [Sure] shows the first two levels, *Alle* [All] all three, as a grid
  with a coloured dot each. *Durchgehen* reviews them.

## Clean-up
- *Aufräumen* lists what the card counts (near-identical, blurry) with sizes,
  and *Alle durchgehen* [Go through all].
- Favourites are never suggested, nor a photo you kept in a review before.

## Review
- One photo at a time, large, with the suggestion (*Vorschlag: löschen —
  fast gleich wie ein anderes Foto*). Swipe left to delete, right to keep — or
  the two buttons, or the arrow keys. Undo at the top; *Beenden* [Finish] any time.
- At the end: *Zum Löschen markiert: 4 Fotos (13 MB)* with thumbnails and
  **4 Fotos löschen** [Delete 4 photos] → the system's dialog → Recently
  Deleted (iPhone) / the Trash (Android). Nothing is deleted before that.
  Needs the unlock.
- Photos you kept against the suggestion are remembered and not suggested again.

## The unlock
- Scanning, trips, groups, the blurry list and reviews are free. Making an
  album/folder and deleting need **one one-time purchase** (4,99 €, no
  subscription). The paywall appears when needed, and from Settings.
- *Käufe wiederherstellen* [Restore purchases] on the paywall and in Settings.
- Family Sharing (iPhone); the purchase follows the Google account (Android).

## Settings
- **Fotos**: the access (all / selected / none), *Fotos auswählen*, *Zugriff
  in den Einstellungen ändern*, *Neu durchsuchen*.
- **Vollversion**: unlock or *Freigeschaltet*, restore.
- **Darstellung**: language (Deutsch, English), appearance (system, light, dark).
- **Nur in der Debug-Version**: *Probelauf* [Dry run] — on by default in debug
  builds: nothing in the photo library changes, the app says what it would have done.
- **Über die App**: rate (once the App Store id is set), feedback by mail,
  privacy policy, licences (GeoNames, fonts, icons).
- *Meine Entscheidungen zurücksetzen* [Reset my decisions] (with undo): trip
  edits, best-shot picks, kept photos.

## Everywhere
- Dark mode, Larger Text (iPhone Dynamic Type; Android's font scale), VoiceOver
  / TalkBack labels on every photo and button, reduced motion.
- Android words it Android's way (folders, the Trash, Google Play).
