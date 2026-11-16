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
- *Neu durchsuchen* [Scan again] on home and in Settings.
- iCloud-only originals are never downloaded.
- **The on-device AI** (docs/AI.md) looks at each photo after that: the
  home subtitle counts along (*KI: 1.234 von 5.000 Fotos*), results show up
  every 480 photos, the app stays usable. It pauses when the phone runs hot
  and continues with the next scan. Nothing leaves the phone.

## Home
- *Deine Fotos* [Your photos] with the number of photos and trips.
- **The clean-up card**: the space that could be freed (one big number), the
  free space on the device (*2,4 GB von 128 GB auf dem Gerät frei*), how many
  duplicates, near-identical and blurry photos and old screenshots, what
  Bildklar has freed so far (*Bisher freigegeben: 1,2 GB*), *Aufräumen* [Clean up].
- Tiles: *Duplikate* [Duplicates] and *Fast gleiche* [Near-identical]
  (groups), *Unscharfe* [Blurry], *Screenshots*, *Große Dateien* [Large files]
  (count and size) and, on the iPhone when there are any, *Live Photos*.
- *3 Tage in Folge aufgeräumt* [3 days in a row of cleaning up] on the card
  once the streak is two days or more.
- **An diesem Tag** [On this day]: when photos were taken on today's date in
  earlier years, a card with one of them and the years; *Ansehen* [Look back]
  reviews them (extra shots and blurry ones suggested for deleting).
- **Monat für Monat** [Month by month]: how many months are gone through.
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
- Every month of the library, newest first, with a photo, the number of photos
  and the size; a month gone through to its end is marked *Durchgesehen* [Done].
- A tap reviews the month: extra shots, blurry photos and old screenshots are
  suggested for deleting, the rest for keeping.

## Blurry photos
- Every photo's sharpness, as three levels: *Sehr wahrscheinlich*,
  *Wahrscheinlich*, *Vielleicht unscharf* [Very likely / Probably / Maybe
  blurry]. Photos with little to see (fog, a dark room) are judged more gently.
- *Sicher* [Sure] shows the first two levels, *Alle* [All] all three, as a grid
  with a coloured dot each. *Durchgehen* reviews them.

## Clean-up
- *Aufräumen* lists what the card counts (duplicates, near-identical, blurry,
  old screenshots, unimportant photos) with sizes, *Alle durchgehen* [Go through all] and
  **Schnell aufräumen** [Quick clean]: a switch per kind (all on), the
  free space, then *35 Fotos löschen · 91 MB* → the system's dialog — or
  *Durchgehen* [Review] for the same photos first. Needs the unlock.
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
  freed and the free space. The app updates it whenever that changes; a tap
  opens the app.
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

## Everywhere
- Dark mode, Larger Text (iPhone Dynamic Type; Android's font scale), VoiceOver
  / TalkBack labels on every photo and button, reduced motion.
- Android words it Android's way (folders, the Trash, Google Play).
