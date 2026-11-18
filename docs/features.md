# Bildklar – features

Every feature, as the user sees it (German labels, English in brackets).

## First start and photo access
- **Welcome** (the first start only; again from *Einstellungen › So
  funktioniert Bildklar*): one screen. *Finde die Fotos, die du behalten
  willst* [Find the photos worth keeping] over a series of three photos — the
  app's sparkle, then a finger picks another: the green check — and three
  lines: *Ähnliche Aufnahmen im Vergleich*, *Deine Reisen, schon sortiert*,
  *Nur auf deinem Handy* (no account, no cloud, nothing deleted without you).
  One button, *Los geht's* [Get started]. Its photos are the app's own three;
  under reduced motion the illustration shows its end state. (Until 18
  November 2026: four pages.)
- **Photo access**: *Darf Bildklar deine Fotos sehen?* — why (to find trips
  and similar photos on the phone), *Nichts wird hochgeladen*, *Nichts ändert
  sich ohne dich*, and both ways to answer under *Du hast die Wahl*: *Alle
  Fotos* (recommended) or *Ausgewählte Fotos* (Bildklar then only sees what
  was picked; trips and duplicates may be incomplete). *Fotos freigeben*
  [Allow access to photos] → the system's dialog, which offers both.
- **Selected photos only** (iPhone *Limit Access*, Android 14+ *Select photos*):
  a card on home says so, with *Fotos auswählen* [Select photos] → the
  system's picker; the app rescans afterwards.
- **No access** (denied, or restricted by Screen Time): the screen explains it
  and offers *Einstellungen öffnen* [Open Settings].
- **The first scan** has a screen of its own: a ring with the share done, how
  long it still takes, *Schon gefunden* (trips, near-identical, duplicates,
  screenshots, counting up as they are found) and five cards that explain the
  app while it works (trips, the best shot, month by month, marking before
  deleting, privacy; they turn by themselves or on a tap). As soon as the
  scan has found a group of near-identical photos, its real photos take the
  cards' place: *Schon entdeckt* [Found already] — *3 Fotos, fast gleich* —
  *Gleich vergleichst du sie*. *Schon mal umsehen* [Look around meanwhile]
  goes to home, where the slim card carries on. Every later scan is only the
  slim card.
- **What it found** (once, when the first scan has analysed every photo): it
  leads with one task, not with a storage figure. When a group of
  near-identical photos exists (the newest of two to six, src/logic/nextStep.ts
  `firstGroup`): its photos side by side, the app's pick with the sparkle,
  *Dein erster Schritt · 3 Fotos, fast gleich · Bildklar schlägt eines vor –
  du wählst, welches bleibt*, and **Deine erste Gruppe vergleichen** [Compare
  your first group]. Without one: home's next step (the category that frees
  the most, or a month) with *Jetzt durchsehen*. Under it everything found per
  category with count and size, the trips, and the quiet second way *Erst mal
  umsehen*.
- **The first group**: the group's screen (see *Similar photos*), its tip
  explaining the sparkle and *Dieses behalten*. After *Die anderen zum
  Löschen vormerken* or *Alle behalten*, once, a sheet says what happened:
  **Erledigt – nichts gelöscht** [Done – nothing deleted], the photo that
  stays with its green check, what was put aside moving into *Zum Löschen
  vorgemerkt* (a tap opens it), that nothing is deleted until it is confirmed
  there; **one next step** (*Nächste Gruppe vergleichen* — or home's next
  step when no group is left) and *Rückgängig* [Undo].
- **One-time tips**: the first time a feature is on screen, one short hint
  points at its control — the review's buttons and undo, what a suggestion
  is, where the marked photos wait, the bin, a group's sparkle, quick clean,
  months, trips, the widget, search, the weekly reminder. One at a time, a
  tap sends it away, nothing is blocked (src/tips.ts).

## The scan
- Looks at every photo and video once: when and where it was taken, how sharp,
  how bright, and a fingerprint to spot near-identical shots (a video's poster
  frame). On the iPhone every frame of a burst is seen, not just the one Photos
  shows; videos, screen recordings and Live Photos are marked as such. Progress on home
  as a slim card with a bar and **how long it still takes** (*12.340 von 48.210
  Fotos angesehen · noch etwa 4 Min.*: the speed so far in this phase applied to
  what is left, said after a few seconds; src/logic/eta.ts); the first time
  takes a few minutes and keeps the screen on. Since 18 November 2026 the card
  (and the first scan's screen) also shows the **percent**, the time left down
  to seconds (*noch etwa 40 Sek.*, *gleich fertig*; *Restzeit wird berechnet …*
  until it can say) and **photos and videos apart**, each *done of total*
  (*Fotos 1.234 von 5.000 · Videos 20 von 80*; the native scan counts the
  videos of each phase).
- **The app stays usable while it scans.** Once the photos are counted, home
  fills in: the library's photos, months, trips and the categories appear and
  grow every few seconds as photos are analysed (*Vorläufig – Bildklar sieht
  sich noch Fotos an* under the suggestions until it is done). The clean-up
  overview, search and every list can be opened meanwhile.
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
  scan card on *Aufräumen* counts along (*KI: 1.234 von 5.000 Fotos · noch etwa 12 Min.*), results show up
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
Calm and photo-led (docs/REDESIGN.md): a greeting, *Vorschläge* (the space
that could be freed and the library's figures), what is marked for deletion,
then *Mehr Platz* and *Geschützt*.
- **A greeting** by the time of day as the screen's title (*Guten Morgen* ·
  *Guten Tag* · *Guten Abend* — no name: there is no account), and under it how many photos and videos there are and that
  they stay on the device. While the facts load, the page shows its shape as
  soft placeholders instead of blank space.
- **The order**: what is new since the last visit and a new trip (see
  *Coming back*) when there is any, then **Vorschläge** — the space you could
  free up — then *Zum Löschen vorgemerkt* when something waits there, then
  *Mehr Platz*.
- **Zum Löschen vorgemerkt** [Marked for deletion], a section of its own while anything waits there,
  **in its own colour** — a warm sand card with the archive's tile (never
  red: nothing is deleted yet): a strip of its photos (the last tile counts
  the rest), *72 Fotos · 173 MB*, *Noch nicht gelöscht*; a tap opens it (see
  *Marked for deletion*).
- **Vorschläge** [Suggestions], one card: **357 MB könnten weg** [357 MB
  could go] — *Von 873 MB in deiner Mediathek – was genau, steht unten*; on
  the iPhone a quiet line that iCloud-only originals free iCloud, not the
  phone (*Liegen Originale nur in iCloud, wird der Platz dort frei*); a bar of the whole library in **two parts only**, each
  named with its size under it: *Kann weg · 357 MB* (sand) and *Bleibt · 516
  MB* (grey); then the library's
  figures — two cells, *Fotos 95 · 31 können weg* and *Videos 6 · 3 können
  weg* (*Fotos* opens *Monat für Monat*, *Videos* all videos), the free space
  on the device, *Bisher freigegeben* with a line that the space comes back
  once *Zuletzt gelöscht* / the Trash is emptied; then one row per category —
  *Duplikate*, *Fast gleiche* (with the similar videos), *Missglückt*,
  *Screenshots*, *Unwichtige Fotos* (once the AI has seen photos) — with two
  of its photos, how many could go and, on the right, the space, the most
  space first. At its foot
  **Jetzt aufräumen** [Clean up now]
  (quick clean, see *Clean-up*). Categories with nothing left in one line under it:
  *Erledigt: Duplikate, Screenshots*.
- **Mehr Platz** [More space]: *Monat für Monat* with *38 % durchgesehen* and
  a thin bar — the photos in months gone through, as a share of all photos
  (rounded down, so 100 % only once every month is done) — and *Später
  entscheiden* with the number on the pile (see *Review*); then *Große Dateien* [Large files]
  (*Fotos verkleinern* opens from there), on the iPhone *Live Photos*, *Chats &
  soziale Medien* (only when such photos exist) — rows with a photo.
- *Geschützt* [Protected] at the end.

### Ordnen [Organise]
- The number of trips and photos under the title; while the facts load, the
  page's shape as soft placeholders.
- **Suchen** [Search] as a field at the top (*Was ist auf dem Foto? · Hund,
  Strand, Kassenzettel …*) once the AI has vectors to search; a tap opens
  *Suchen*. (Until 18 November 2026 a magnifier in the bar.)
- **An diesem Tag** [On this day]: when photos were taken on today's date in
  earlier years, one of them as a large photo with the years; *Ansehen* [Look
  back] reviews them (extra shots and blurry ones suggested for deleting).
- **Reisen** [Trips]: every trip as a tile, four to a row, newest first (a
  photo from the middle of the trip, a check once its album is made; under it
  the place, the dates and the photo count — a renamed trip shows its name;
  long dates wrap instead of being cut);
  *Alle Reisen (12)* [All trips] only when trips are hidden (they sit at the
  end of that list).
- **Alben** [Albums] (Android: **Ordner** [Folders], since 18 November 2026):
  the albums the phone already has, four to a row like the trips — the newest
  photo of each, its name and count under it; the last used first, then the
  largest; *Alle zeigen (n)* past eight. A tap opens the album: its photos
  (sortable), a tap opens one large, the circle picks (*Alle auswählen* /
  *Alle abwählen*), *Löschen vormerken* for the picked ones, *Durchgehen* to
  review the album. Nothing in the album itself changes there.
- **Auf deinen Fotos** [On your photos]: the on-device AI's categories
  (landscape, food, …) as photo cards, three to a row, the name and the count
  white on the photo's shade. A category opens like an album: a tap opens a
  photo large, the circle picks; as with a trip, **Album erstellen · 41 Fotos**
  makes an album (Android: a folder, the photos move there after Android's
  dialog) of all of it, named after the category (the name can be changed),
  and with photos picked **Zum Album hinzufügen** [Add to album] opens a sheet
  of the phone's albums (a filter past eight) and *Neues Album*.

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
  Android asks; nothing is copied. Free for now (later the unlock).
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
- **A group**, built for comparing: the photo you look at large and uncropped
  (the viewer takes its shape), the series as a strip under it; a tap on a
  tile, a swipe on the photo, the arrow buttons or ← → only **look** at a photo.
  Badges keep two things apart: **Vorschlag der App** [App suggests] (✦) and
  **Bleibt** [Stays] — **Deine Wahl** [Your choice] once you picked another;
  a protected photo says *Bleibt auch*. Under the photo its date and size and,
  in plain words, why: for the app's pick *Vorgeschlagen: das schärfste Foto
  der Serie* — only what the facts carry (src/logic/explain.ts: favourite,
  protected, a burst's pick, the only edited copy, the only copy with a place,
  the largest copy, the sharpest, else *insgesamt am besten*), for another
  what is worse about it (*Unschärfer als das beste*). **Dieses behalten**
  [Keep this one] makes the photo looked at the one to keep (the app
  remembers and learns); *Zurück zum Vorschlag* undoes it.
  **Nebeneinander** [Side by side] puts the photo that stays next to another
  one of the group, the same size: a tap on a spot zooms **both** to it, a
  drag moves both (to compare a face across two frames); the strip at its
  foot picks what it is compared with, *Dieses behalten* switches.
  **Die anderen
  zum Löschen vormerken · 1 Foto · 2,8 MB** [Mark the others for deletion]
  puts them into *Zum Löschen vorgemerkt* (nothing is deleted);
  *Durchgehen* reviews them one by one; *Alle behalten* [Keep all] keeps
  every photo of the group and the group is not suggested again (with undo;
  a new copy joining it later opens it again; *Von vorn anfangen* brings it
  back).
- **Settled from the list** (since 18 November 2026): on every group card of
  *Fast gleiche Fotos*, *Duplikate* and *Ähnliche Videos* the **green star**
  is what stays — the app's pick, a favourite, a photo kept before. Every
  other photo carries a **grey star**: tap it to keep that one too (several
  can be starred). Under the photos, as words without a fill: **Alle behalten**
  in green with a check (the group leaves the list) and, in teal with the
  archive icon, **Ohne Stern vormerken** [Mark unstarred] — every photo without a star goes to *Zum Löschen vorgemerkt*
  (nothing is deleted yet), the starred ones are kept from now on — each with
  undo, without opening the group. A tap on the photos still opens it.
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
  frame (not only exact copies). With the copies of a video they are the
  **Videos** side of a *Fotos · Videos* switch on *Fast gleiche Fotos* (home
  counts them in that one row; quick clean still has its own switch for
  them); the best take is the longest
  sharp one, then the larger file. The threshold is provisional
  (`src/logic/lookalike.ts`).

## Large files and videos
- Photos and videos of 10 MB or more, biggest first (at most 300); *Alle*,
  *Videos*, *Fotos*. Each tile shows its size (≈ where the iPhone can only
  estimate) and a video's length. Nothing is suggested for deleting;
  *Durchgehen* reviews them with every suggestion on keep.
- **Choose several to mark** (since 18 November 2026): every tile has a
  circle at its top corner; tap it to select the file. With any selected the
  button reads **Löschen vormerken · 2 Dateien · 265 MB** [Mark for deletion]
  (into *Zum Löschen vorgemerkt*, nothing is deleted) with *Auswahl aufheben*
  under it.
- A tap elsewhere on a tile opens the file: date, size, length, a play button
  on a video's picture, **Video verkleinern** [Make video smaller] for videos
  of 30 MB or more, and *Löschen vormerken*.
- **Making a video smaller** (free for now, later the unlock): a copy at about a third of the
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
- **On a big picture it plays right there** (since 18 November 2026, evening):
  the review card, a large file's sheet and a group's viewer turn into the
  player in the same box — the system's controls in the WebView (play /
  pause, the timeline, volume, full screen), ✕ goes back to the picture. The
  card doesn't swipe while you touch the player.
- **A grid tile starts a window**, not full screen (since 18 November 2026): over the
  dimmed app, about the size of a large photo and in the video's own shape,
  with a round close button; a tap beside it closes it too. **Größer**
  [Bigger] lets it fill the screen, **Kleiner** [Smaller] brings the window
  back.
- iPhone: the system's player inline in that window (AVPlayerViewController)
  with all of AVKit's controls — play / pause, the scrubber and time, volume,
  the playback speed, picture in picture and its own full-screen button (that
  is Größer / Kleiner there). From the phone only — a video that is only in
  iCloud is never downloaded: *Das Video ist nicht auf diesem Gerät – es liegt
  nur in der Cloud.*
- Android: the platform's VideoView in the window with its controls (a tap
  shows play / pause, rewind / forward and the timeline) and the app's
  *Größer* / *Kleiner* button; Back or the close button ends it; the screen
  stays on while it plays. Never handed to another app. A file the phone
  can't play: *Dieses Video lässt sich hier nicht abspielen.*
- In the browser (`npm run dev`) the test library's videos play the same way,
  with the browser's controls (play, time, volume, full screen, speed); the
  curated demo has pictures only, so its videos say *Dieses Video lässt sich
  hier nicht abspielen.*

## Smaller photos (*Fotos verkleinern*, free for now, later the unlock)
- A row at the top of *Große Dateien*, *Fotos verkleinern · bis zu 3,1 GB*
  [Smaller photos · up to …], when there is something to gain (estimate: half of a camera JPEG, 70 % of a PNG).
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
  and stops cleanly when the app goes to the background.

## Live Photos (iPhone)
- Every Live Photo, newest first, with the estimated saving (≈ 3 MB each).
  **In Fotos umwandeln** [Make plain photos] (free for now, later the unlock) → a
  confirmation → each becomes a plain photo (the picture as edited, date,
  place, favourite flag, albums) → the system's dialog moves the Live Photos to
  Recently Deleted. Declined: both stay.

## Screenshots
- Every screenshot and screen recording, newest first; *Älter als 30 Tage* [Older than 30 days]
  (the ones the clean-up card counts) or *Alle* [All]. *Durchgehen* reviews
  them, all suggested for deleting. Favourites and kept ones are left out.
- A tap on a screenshot opens it large (zoom in, drag). Its circle picks it;
  with some picked the button becomes *Löschen vormerken · 3 Fotos · 4 MB*
  [Mark for deletion] (into *Zum Löschen vorgemerkt*, nothing is deleted) and
  *Auswahl aufheben* [Clear selection] goes under it.

## Unimportant photos (on-device AI)
- *Unwichtige Fotos* [Unimportant photos] on home: receipts, documents,
  whiteboards and notes, photos of a screen, saved screenshots, memes, QR
  codes and accidental shots, found by the AI on the phone (SigLIP 2, docs/AI.md).
  Chips filter by kind (*Kassenzettel · 2*); *Durchgehen* reviews them, each
  suggested for deleting with its reason (*KI: Kassenzettel*). A tap opens a
  photo large; the circle picks it and *Löschen vormerken* marks the picked ones.
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
- **Wonach du suchen kannst** [What you can search for], first on the screen
  (above *In deinen Fotos*, since 18 November 2026) and still there while a
  search is shown (without the words already chosen; a tap adds one): a few
  words to try, and **Alle 247 Wörter** [All words]: a sheet with every
  word by theme (*Familie und Menschen*, *Feste*, *Baby-Momente*, *Tiere*,
  *Essen und Trinken*, *Orte und Natur*, *Dokumente und Belege* … — the
  sections of ml/words.yaml) and a field that narrows it by any form of a
  word (*Kuchen* finds *Geburtstag*). A tap searches for it.
- Found by the on-device AI from each photo's vector, best match first (at
  most 500); a grid, and *Durchgehen · 24 Fotos* [Go through] reviews them
  with no suggestion.
- Ready once the AI has seen the photos (*42 % sind schon fertig*). An
  unknown word says so. Nothing is sent anywhere.

## Similar photos of one photo (*Ähnliche Fotos*)
- In a review's *Groß ansehen* (the magnifier on the photo), the button
  *Ähnliche Fotos zeigen* [Show similar photos] at its foot opens
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
- The header shows the same figure: *38 % durchgesehen · 7 von 18 Monaten*, and a ring beside the title that fills with it.
- Every month of the library, newest first, as a **photo tile**, two to a row:
  its cover with the month's name on it, the number of photos and the size,
  and how far into it you are — *Noch offen* [Not started], a bar with
  *16 % durchgesehen* and *Weitermachen* [Continue] on the cover, or
  *Durchgesehen* [Done] with a check.
- A tap reviews the month: extra shots, blurry photos and old screenshots are
  suggested for deleting, the rest for keeping. **Left part-way, a month
  remembers its place** (the last photo decided; src/logic/months.ts) and
  goes on there next time; the next step after the first group offers *Weiter mit Juli 2026*
  with the month's own bar. (Since 18 November 2026.)
- **Videos** join the month (and *An diesem Tag*) in time order: a copy of
  another video → delete; a screen recording older than 30 days → delete;
  every other video → keep, with its length and size (*2:14 · 480 MB*). A
  video shows its poster frame with a play button: a tap plays it inside the
  app (see *Playing videos*).
  The end screen counts videos apart (*Dazu 2 Videos, 1,1 GB*). Trips stay
  photos only.

## Failed shots (*Missglückt*)
- The home row *Missglückt* [Failed shots] opens one grid of every photo that
  didn't come out, each with a small chip that says why: *Unscharf*, *Zu
  dunkel*, *Zu hell* [Blurry, Too dark, Too bright] (a blurry one with its
  level's dot). *Durchgehen* reviews all of them, each with its own reason.
- **Blurry**: every photo's sharpness, as three levels: *Sehr wahrscheinlich*,
  *Wahrscheinlich*, *Vielleicht unscharf* [Very likely / Probably / Maybe
  blurry]. Photos with little to see (fog, a dark room) are judged more gently.
  *Sicher* [Sure] shows the first two levels, *Alle* [All] all three.
- **Too dark / too bright**: photos with almost nothing to see — a pocket shot,
  the lens cap, a picture washed out by the sun — from the brightness and
  contrast the scan already measures. Night photos with lights stay out. The
  on-device AI's *accidental* label lets a borderline photo in. Favourites,
  photos with faces and photos you kept never come in. A photo counts once:
  a black, blurry frame is listed as too dark, not as blurry.
- They are part of the clean-up card (*Zu dunkel oder zu hell*), the quick
  clean, *Alle durchgehen* and the reviews of a month, a trip and *An diesem Tag*.
- The thresholds are provisional (`src/logic/exposure.ts`).
- A tap opens a photo large (zoom in, drag); its circle picks it,
  and the picked ones go to *Zum Löschen vorgemerkt* with *Löschen vormerken ·
  n Fotos · size* (*Auswahl aufheben* under it).

## Clean-up
- Home's *Jetzt aufräumen* opens **Schnell aufräumen** [Quick clean] (the
  clean-up screen that listed the kinds again is gone): a switch per kind
  (all on), the free space, *Unsichere durchgehen* for what Bildklar isn't
  sure about, **Alle durchgehen** [Go through all] — every photo home counts,
  one by one, the unimportant and the unsure ones too — then *Löschen
  vormerken · 35 Fotos · 91 MB* → into *Zum Löschen vorgemerkt*, or
  *Durchgehen* [Review] for the same photos first. Free for now (later the unlock).
- Favourites are never suggested, nor a photo you kept in a review before.

## Review
- One photo at a time, with all the room left, and the suggestion with its
  reason in words that wrap (*Vorschlag: vormerken · Unschärfer als das
  beste*). Swipe left to **mark for deletion**, right to keep — or the three
  labelled buttons (*Löschen vormerken*, **Später** [Later], *Behalten*), or
  the arrow keys (← → ↑). Deciding later is a button only (a swipe up until
  18 November 2026: two gestures are easier to learn than three). Marking is quiet (no red:
  nothing is deleted). **Rückgängig** [Undo] in words at the top right;
  *Beenden* [Finish] any time. Under *12 von 40* the space marked so far
  (*48 MB zum Löschen vorgemerkt*).
- **Full-bleed**: the photo takes the whole width of the screen. The card
  follows the finger, tilts, shows its stamp, and leaves on a spring that
  takes over the finger's speed.
- **Every decision is named** right after it, on top of the next card
  (*Behalten* · *Vorgemerkt* · *Später*), with **Rückgängig** beside it; it
  stays until the next decision or a few seconds. The undo at the top right
  stays where it is.
- **Groß ansehen** [View large] (the magnifier on the photo, in a review and
  in a group): the photo over the whole screen, growing out of its place. A
  tap zooms in on the spot tapped (and out again), a drag moves the zoomed
  photo — to check sharpness and faces. It asks for a larger picture than
  the review shows. In a review it also has *Ähnliche Fotos zeigen* at its foot.
- **The swipe in words** (*Links: zum Löschen vormerken · rechts: behalten.*)
  stands under the buttons only while the guided review still teaches it, and
  in the bin; after that the labelled buttons say it.
- **The guided first review**: on the first real cards a hand makes one
  gesture and says it in words (*Nach rechts wischen: behalten* · *Nach links
  wischen: zum Löschen vormerken*, *Probier's aus · 1 von 2*), one gesture
  per card until it was done once — by a swipe, its button or its arrow key;
  whichever of the two is done counts. Each decision is named right after it (*Vorgemerkt – noch nicht
  gelöscht*). The hint leaves the moment the card is touched, ✕ hides the
  hints for good, and under reduced motion it is a still arrow with the same
  words. Then two tips: the buttons and *Rückgängig*, and what a suggestion is.
- **The summary** opens with a soft check, the space counting up, and
  *Behalten · Vorgemerkt · Später* as three figures. The first one also says
  *Favoriten schlägt Bildklar nie vor* → *So schützt du mehr*: a sheet with
  the four ways to protect (favourites, one photo, a trip, an album / folder).
- At the end: the space as one big number (*13 MB — zum Löschen vorgemerkt, noch
  nicht gelöscht*), *Ausgewählt: 4 Fotos (13 MB)* with exactly those photos and
  **Löschen vormerken · 4 Fotos** — nothing is deleted yet (*Noch wird nichts
  gelöscht …*); see *Marked for deletion*.
- Photos you kept against the suggestion are remembered and not suggested again.
- **Closed before the end** (✕): what was marked by then is put into *Zum
  Löschen vorgemerkt* — it said *Löschen vormerken*, so it is not forgotten —
  with a toast and *Rückgängig*; nothing is deleted. (On the summary, *Fertig* instead of *Löschen
  vormerken* still leaves them unmarked: that is the summary's own choice.) A month remembers where it was left (see *Month
  by month*).
- **Into albums while swiping** (free for now, later the unlock): under the
  photo only the albums you chose — not every album of the phone (since 18
  November 2026). *In ein Album legen* [Put into an album] (then *Alben*)
  opens a sheet, *Alben in der Durchsicht*, with every album as a toggle (a
  search field once there are more than eight) and *+ Neues Album* [New
  album]; the choice is remembered for the next review. The album the photo
  is already in, and albums made in this review, always show. A tap
  keeps the photo, files it into that album and moves on; undo takes it out
  again. Nothing is written during the review: the end screen lists
  *Löschen vormerken · 3 Fotos · 5 Fotos in 2 Alben* with each album, then does it all in
  one go — iPhone: the photos are added to the albums (nothing moves);
  Android: an album is a folder, so the photos move there after one system
  dialog (*Die Fotos werden in den Ordner verschoben*). Albums made here show
  up in *Aufräumen* › Geschützt.
- **Decide later**: photos put off with *Später* land on a pile; the end screen says
  *3 für später gemerkt* [3 saved for later]. *Aufräumen* › *Mehr Platz* shows *Später entscheiden (3)*
  [Decide later] while the pile isn't empty; it goes through the pile with no
  suggestion. A photo leaves the pile once it is kept or deleted, or when it
  is gone from the library.

## Marked for deletion (*Zum Löschen vorgemerkt*, formerly *Zum Löschen*)
- **Nothing is deleted the moment you choose it.** Whatever you mark for deletion —
  the end of a review, *Die anderen zum Löschen vormerken* in a group, quick
  clean, *Löschen vormerken* in the large files — goes into *Zum Löschen
  vorgemerkt* first. It leaves
  the group, list, trip and count it was in at once, as if it were gone; a
  toast says *4 Fotos zum Löschen vorgemerkt* with **Rückgängig** [Undo].
- **Before the first real delete**, once, the sheet first shows the **three
  safety nets** in one small illustration: 1. *Du merkst vor* → 2. *Du
  bestätigst hier* → 3. *Dein iPhone fragt noch einmal* (Android: *Android
  fragt noch einmal*), then the photos stay 30 days in *Zuletzt gelöscht* /
  the Trash. *Verstanden – weiter* leads to the usual sheet with the red button.
- Its own section on *Aufräumen* opens it — a **review tray**: the photos, the
  last put aside first, each with its size (a video with its length). A tap
  selects one; **Zurücklegen · 2 Fotos** [Put back] returns them to where
  they were (with undo); **Diese löschen · 19 MB** [Delete these], in red,
  opens the delete sheet for just them (then the system's dialog).
- With nothing selected: **Auswahl prüfen · 12 Fotos · 340 MB** [Review
  selection] — the screen's button never deletes itself (since 18 November
  2026; before, it was the red *12 Fotos löschen*). It opens a sheet with
  **exactly what goes** (the photos,
  their count and size; *Sie kommen in den Papierkorb … Den Platz bekommst du zurück, sobald du den Papierkorb leerst … Danach fragt Android
  noch einmal nach*) and the one red button of the app, **12 Fotos löschen**,
  or **Abbrechen** (or a swipe down); then
  the system's dialog → Recently Deleted (iPhone) / the Trash (Android) — the
  only place that deletes. *Noch einmal durchgehen* [Go through them again]:
  a review without a suggestion, swiped left is deleted at the end (red
  here), right goes back, *Später* stays in the list.
- Free deletes (before the unlock) are counted here, when the photos really
  go. It is kept with the decisions (it survives a restart); *Von vorn
  anfangen* [Start over] in Settings empties it too — the photos come back —
  with undo; a photo deleted elsewhere leaves it by itself.
- Making a video or photos smaller and turning Live Photos into stills still
  ask about the originals right away: the copy is already saved.

## The unlock
- **Not for sale yet — the launch phase, everything free** (`UNLOCK_ON_SALE`
  is `false` in `src/logic/allowance.ts`; everything free since 18 November
  2026). Every feature works for everyone: *Album erstellen* / *Ordner
  erstellen* on a trip, the album chips in a review, *Fotos verkleinern*,
  *Live Photos*, *Video verkleinern*. Deleting has **no limit** and nothing is
  counted. No *Vollversion* section in Settings, never the paywall.
- **Every start in the launch phase marks the install as early**
  (`AppState.early`, kept by *Von vorn anfangen*). When the
  unlock goes on sale, early installs keep everything they had: deleting
  without a limit and the extras. New installs from then on get the 50 free
  deletes and buy the extras.
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
  at 18:00, scheduled on the phone — no server. Offered once by itself, after
  the first month gone through (see *Coming back*).

## Coming back (since 18 November 2026; src/useNudges.ts, src/logic/nudges.ts)
- **Seit Sonntag** [Since Sunday]: coming back at least 12 hours after the
  last visit, with at least five photos or videos taken since, home opens
  with a card — four of the new photos, *Seit Sonntag* (a weekday within the
  week, else the date), *84 Fotos neu · 412 MB*, *3 Gruppen fast gleich*
  when new photos are in groups, and **Neue Fotos durchgehen** (a review of
  them with suggestions, like a month). ✕ closes it until the next return.
- **Neue Reise gefunden** [New trip found]: a trip that ended in the last 60
  days, without an album and not shown before, gets a card with its photo,
  name and count, and **Reise ansehen**. On the first settled library every
  trip found counts as shown (the reveal shows them).
- **The weekly reminder, offered once**: after the first month gone through,
  *Jeden Sonntag kurz erinnern?* — *Ja, erinnern* / *Nein danke*. Never again.
- **The rating**: after two real deletes that freed space, on home a moment
  later — iPhone: iOS's own rating prompt (StoreKit; iOS decides whether it
  shows, at most three times a year, never in TestFlight); Android: *Gefällt
  dir Bildklar?* → *Bewerten* opens Google Play. At most three asks, never
  twice for one version, four months apart. Debug builds and the browser
  never ask.
- All of it is view state in `bildklar-*` keys: losing it shows a card once
  more, nothing else.

## Settings
- **Fotos** (only with limited access): *Zugriff auf alle Fotos erlauben*
  [Allow access to all photos] opens the system's settings, the only place
  where iOS (and Android, once decided) lets the access change. With full
  access there is nothing to do; with none the app shows its permission
  screen instead. Settings holds only what can be changed: the storage, what was freed and *Fotos auswählen* are on
  *Aufräumen*, so are *Geschützt* (its last row) and *Neu durchsuchen* (at its top).
- **Vollversion**: unlock or *Freigeschaltet*, restore.
- **So funktioniert Bildklar** [How Bildklar works]: *Die Einführung* (the
  welcome again), *Wischen üben* (the swipe hints again, in a review of what
  is suggested), *Alle Tipps wieder zeigen*; *Drei Sicherheitsnetze* and
  *Fotos schützen* to read at any time; *Alle Hinweise ausblenden*.
- **Darstellung**: language (Deutsch, English, العربية — right to left), appearance (system, light, dark).
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
- **Picking from a grid** (Large files, Screenshots, Failed shots, Unimportant
  photos, an album, a category, *Zum Löschen vorgemerkt*, Smaller photos): a
  line above the grid says how many are picked (or how it works) with
  **Alle auswählen** [Select all] while not all are and **Alle abwählen**
  [Deselect all] while any is (`SelectBar`).
- **Every screen's (i)** says in one line what the screen is for, then
  **So geht's** [How it works] with numbered steps — which tap does what,
  and that marking deletes nothing yet.
- **Before a real delete, one sheet** (`DeleteSheet`): the photos themselves,
  their number and size, where they land and that the phone asks once more;
  the only red button is its last one. The bin uses it, and so does the
  question after a smaller copy of a video or of photos was saved (*Original
  löschen* / *Beide behalten*).
- **Empty lists** show a small illustration (two photo frames and a mark),
  one line of what is not there, and the way on (*Zurück zur Übersicht*, or
  the action that fixes it: *Fotos auswählen* on an empty library with
  limited access).
- Each list screen explains itself behind the (i) in its bar (*Worum geht’s?*
  [What is this?]); its button at the bottom says what you get
  (*Durchgehen · 7 Fotos · 20 MB* [Go through · 7 photos · 20 MB]).
- Dark mode, Larger Text (iPhone Dynamic Type; Android's font scale), VoiceOver
  / TalkBack labels on every photo and button, reduced motion.
- **Every screen size**: on the smallest phones (320 px wide, or a short
  screen in split screen) the margins and the large titles are a little
  smaller, tiles sit three to a row so names stay whole, and the review's
  photo makes room so its buttons stay on screen. On anything wider than a
  phone — a tablet, a foldable, a laptop's browser — the app keeps its phone
  width, centred.
- Android words it Android's way (folders, the Trash, Google Play).
- **Sorting lists**: Screenshots, Large files, Live Photos, Failed shots,
  Unimportant photos and a category have a sort menu at the top right —
  *Neueste zuerst · Älteste zuerst · Größte zuerst* [Newest · Oldest · Largest
  first]. The choice is remembered per screen; a review started from the list
  follows its order. Large files start with the largest, the rest with the newest.
