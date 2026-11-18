# What is left – for Ahmad

What only you can do: a Mac with Xcode, your phones, the stores, the photos.
In order. (State: 16 November 2026, after the first build by Claude.)

## 000. The layout adapts to the screen (18 November 2026, night): check it

Built on the branch `adaptive-layout` and merged; what changed is in
`docs/CHANGELOG.md` and `docs/DESIGN.md` (*Adaptive layout*). Checked here:
type check, the tests, the build, the privacy, performance and contrast
checks, and screenshots at 320 × 568, 375 × 667, 820 × 1180 and 932 × 430 in
the demo. Not run on a phone — please:

- [ ] **The smallest phone you have** (or the Android emulator at 320 dp, or
      split screen): a review shows *Behalten*, *Später* and *Beenden*
      without scrolling; the trips sit three to a row; nothing is cut.
- [ ] **An Android foldable or tablet** (or the *Resizable* emulator): the
      app opens wide and in landscape (Android 16 ignores the portrait lock
      there); the page is wider, grids have more photos per row, the dock and
      the tab bar stay centred.
- [ ] **Release notes**: the next version's notes could add a line such as
      *Passt sich jedem Bildschirm an – vom kleinsten Handy bis zum Tablet*
      (2.4.0's German notes are at 457 of 500 characters).

## 00. The review and improvement plan (18 November 2026, evening): check it

Built on the branch `app-review-plan` and merged; what changed is in
`docs/CHANGELOG.md`. Checked here: type check, 234 tests, the build, the
privacy, performance, contrast, listing and AI checks, and screenshots of
every changed screen in the demo. Not run on a phone — please:

- [ ] **iPhone: build in Xcode** (`npm run build:ios`): `requestReview` in
      `PhotoLibraryPlugin.swift` (StoreKit's `AppStore.requestReview`) is new
      Swift that couldn't be compiled here.
- [ ] **On both phones**: home → *Jetzt aufräumen* opens quick clean (and
      *Alle durchgehen* is at its foot); *Missglückt* is one grid with a chip
      per photo; *Fast gleiche* has *Fotos · Videos*; a review has no swipe up
      any more (*Später* is the button), and the hint line under the buttons
      is gone once the two gestures are learned; *Groß ansehen* has *Ähnliche
      Fotos zeigen*; *Große Dateien* has *Fotos verkleinern* at its top.
- [ ] **Coming back**: leave the app for more than 12 hours, take a few
      photos, open it — the *Seit …* card. Finish a month — the reminder is
      offered once. The rating never shows in a debug build: try it in a
      release build after two real deletes (iOS shows its prompt in a
      release build on your phone, never in TestFlight).
- [ ] **Read the Arabic store texts** in `store/listing.md` (2.1, 2.2, 2.3,
      3.1, 3.2) and `release-notes/2.0.16/ar.txt`, then add Arabic in both
      consoles if you want the Arabic listing.
- [ ] **The new subtitle** *Doppelte & Reisen · privat* (was *Reisen &
      Doppelte finden*) — keep it or say which you prefer.
- [ ] Once the app is live on the App Store: `APP_STORE_ID` in
      `src/links.ts` (the Settings row *Bildklar bewerten* appears then).
- [ ] The App Review recording (`npm run rehearse:app-review`): scene 1 now
      waits for *could go*; the rehearsal passed here in the browser.

## 0. Temporary: the dry run in release builds

- [x] **Turned off again** on 18 November 2026 (`DRY_RUN_IN_RELEASE = false`).
- [ ] ~~Turn it off again after testing.~~ Release builds show the dry run
      switch (Einstellungen → *Nur in der Debug-Version*) too, starting **on**,
      so a TestFlight / Play build can be tried on the phone without touching
      the photos. Done testing? Set `DRY_RUN_IN_RELEASE` in `src/store.ts` to
      `false` (or ask Claude to remove it). **Never send a build to review
      while it is `true`.**

## 0a. The calm redesign (18 November 2026): check it on your phones

docs/REDESIGN.md, "Album". Checked in a browser (the demo library, Android
wording, both themes, German at 200 % text) — not yet on a phone.

- [ ] **On the Android phone** (`npm run android:debug`): home → a group →
      *Die anderen zum Löschen vormerken* → *Zum Löschen vorgemerkt* → *Löschen* (the sheet, then
      Android's own dialog); a first scan on a big library (home fills in, the
      time left is sensible); TalkBack over the group's strip and the review's
      buttons; system font at the largest size.
- [ ] **On the iPhone**: the same flow — the structure changed there too,
      only the warm colours are Android's. Say if the iPhone should take the
      warm look as well.
- [ ] Redo the screenshots, the preview video and the App Review recording
      (they show the old home): `npm run ui-review`, `npm run screenshots`
      (`-- --android`), `npm run app-preview` (its storyboard still clicks
      *Jetzt aufräumen*), `npm run rehearse:app-review`.
- [ ] The release notes for it are in `release-notes/2.3.0/`.

## 0a2. The first run (18 November 2026): walk it on your phones

Built in the cloud against the demo library; nothing native changed. On a
real iPhone and a real Android phone, please check:

- [ ] **A fresh install** (delete the app first): welcome → *Fotos freigeben*
      → the system's dialog → the first scan's screen → *Das hat Bildklar
      gefunden* → *Jetzt durchsehen* → the hand over the first cards → the
      summary → *Zum Löschen vorgemerkt* → the three safety nets → the
      system's dialog (dry run on).
- [ ] **A real library's first scan**: the ring, the time left and *Schon
      gefunden* move; the reveal comes when the photos are analysed (the AI's
      pass may still run: the reveal says so). With 50,000 photos: is the
      screen calm for the whole wait, does *Schon mal umsehen* feel right?
- [ ] **Selected photos** (iPhone *Limit Access*, Android 14+): the flow is
      the same, home shows the *Fotos auswählen* card.
- [ ] **Denied**: *Einstellungen öffnen* opens the right place on both phones.
- [ ] **The swipe hint on a phone**: the hand should not get in the thumb's
      way; say if it should be smaller or sit lower.
- [ ] **Large text** (iPhone: Settings › Display & Brightness › Text Size, far
      right) on the welcome, the first scan and the review.
- [ ] **TalkBack / VoiceOver**: a tip is read when it appears; the welcome's
      pages are announced; the gesture hint's words are read.
- [ ] **Arabic**: the first-run texts are my translation — please read them
      once as a native speaker (`src/translations.ar.ts`, from *Welcome* down).
- [ ] **Updating** from 2.0.13 with a scanned library: no welcome, no first
      scan screen; each tip shows once. If that is too much for people who
      know the app, say so: one line hides all hints for existing installs.

## 0a3. The polish (18 November 2026): check it on your phones

- [ ] **Home**: the greeting, the next step first — does the storage card
      further down still feel reachable?
- [ ] **Review**: the full-bleed card, the named decision with *Rückgängig*
      (is it in the way of the photo?), the spring when the card leaves.
- [ ] **Groß ansehen**: on a real photo the larger picture (2048 px) should
      look sharper than the review's; tap to zoom, drag to move. Android's
      thumbnail loader may cap the size — say if it stays soft there.
- [ ] **After a smaller copy** (video or photos): the question about the
      original is a sheet with the photos now.
- [ ] **Store set and preview video** show the old home until you run
      `npm run store-screenshots` and `npm run app-preview` on the Mac.
- [ ] **The App Review recording**: scenes 3 and 4 were rewritten for the
      new labels and pass the rehearsal; run `npm run record:app-review` on
      the iPhone before the next submission.

## 0a4. The first task (18 November 2026, evening): check it on your phones

Built in the cloud against the demo library (docs/REDESIGN.md, top; research
in docs/ux-research.md). Nothing native changed, but nothing ran on a phone.

- [ ] **A fresh install on Android**: one welcome screen → photo access →
      the first scan (do the first group's photos appear while it runs?) →
      *Deine erste Gruppe vergleichen* → *Nebeneinander* → *Die anderen zum
      Löschen vormerken* → the sheet *Erledigt – nichts gelöscht* → *Nächste
      Gruppe vergleichen*. Dry run on.
- [ ] **Nebeneinander on a real photo of the boys**: does one tap land both
      photos on the same face? Is the larger picture sharp enough on Android
      (the thumbnail loader may cap its size)?
- [ ] **A month left part-way**: swipe a few photos of a month, ✕, open
      *Monat für Monat* — the tile shows the share and *Weitermachen*, and the
      month goes on where you stopped. What you marked before ✕ is now in
      *Zum Löschen vorgemerkt* (a toast says so, with undo) — say if that
      surprises you.
- [ ] **The bin**: the dock now says *Auswahl prüfen*; the red button is
      only in the sheet. Does that read clearly?
- [ ] **Large German text and TalkBack** on the welcome, the reveal's first
      group, *Nebeneinander* and the sheet.
- [ ] **Arabic**: the new strings are my translation (`src/translations.ar.ts`:
      `welcome*`, `revealFirst*`, `task*`, `compare*`, `month*`, `binReview*`).
- [ ] **Store set and preview video**: `npm run screenshots`,
      `npm run store-screenshots`, `npm run app-preview` on the Mac (the
      welcome and the reveal changed); `npm run rehearse:app-review` (the bin's
      dock is *Review selection* now — scene 4 was updated).

## 0a6. Albums on Ordnen, the scan's counts (18 November 2026, late evening)

- [ ] **iPhone: build in Xcode** — `ScanStore.pendingVideoCount` /
      `aiPendingVideoCount` and the `videos` / `videosDone` in the scan's
      progress are new Swift. Then scan again: the card shows *Fotos x von y ·
      Videos x von y*, the percent and the time left.
- [ ] **Ordnen › Alben** on both phones: covers appear, an album opens with
      its photos; on Android the folders (Camera, WhatsApp Images, …).
- [ ] **A category into an album**: *Album erstellen* and *Zum Album
      hinzufügen* — iPhone adds to the album (nothing moves); Android moves the
      files after its own dialog.

## 0a5. The video player as a window (18 November 2026, evening)

- [ ] **iPhone: build in Xcode** (`npm run build:ios`) — `VideoWindowController`
      in `PhotoLibraryPlugin.swift` is new Swift that could not be compiled in
      the cloud. Then play a video: it should open as a window over the dimmed
      app; AVKit's full-screen button makes it bigger and smaller; a tap beside
      the window or ✕ closes it.
- [ ] **Playing in place** (`videoFile`, new Swift too): on a large file's
      sheet, in a group of similar videos and on a review card ▶ plays the
      video inside that picture's box, ✕ goes back. iPhone: an iCloud-only
      video says it is in the cloud; a long video takes a moment (it is
      copied into the temporary folder first). Android: plays at once.
- [ ] **Android**: play a video from a grid tile — a window with the controls, *Größer* fills
      the screen, *Kleiner* brings the window back, Back closes. Portrait and
      landscape videos, light and dark, TalkBack names the three buttons.

## 0b. The launch phase: free first, sell later

Since 17 November 2026 nothing is for sale (`UNLOCK_ON_SALE = false` in
`src/logic/allowance.ts`; docs/PLAN.md, *Pricing*). Since 18 November 2026
every feature is free for everyone — albums and folders, smaller videos and
photos, Live Photos — and deleting has no limit.

- [ ] **Don't put the in-app purchase into a version** while this lasts: you
      may create it in App Store Connect and the Play Console, but don't add
      it to the App Store version, and leave the Play product inactive. Play's
      content rating: *Digital purchases: No* for now.
- [ ] The store texts and screenshots don't show albums yet: run
      `npm run screenshots` (the album slide is back in the set) and ask
      Claude to add albums and folders to the store texts, if you want them
      in the listing.
- [ ] **The day you start selling** (after about 5,000 downloads and good
      ratings) — ask Claude for "the sale": `UNLOCK_ON_SALE = true`, the store
      texts with the purchase (`store/listing.md`, git history before
      17 Nov 2026), the album slide in the store screenshots, the album scene
      in the App Review recording, the in-app purchase submitted **with** that
      version, Play's content rating answered again. Users from the free
      phase keep deleting without a limit and keep the extras; nobody loses
      anything.

## 0c. Videos play inside the app (18 November 2026)

Videos now play in the app wherever their picture is shown (docs/features.md,
*Playing videos*). Android's player is new native code that only a phone can
try (`npm run android:debug`):

- [ ] **Android**: play a video from a review card, a large file's sheet, a
      series of similar videos and the screenshots (a screen recording). It
      opens full screen inside Bildklar (not in another app), a tap shows the
      controls, Back and the round ✕ close it, the screen stays on. (The app
      is portrait-only, so a landscape video plays letterboxed.)
- [ ] **iPhone**: the same places; the system's player opens over the app. A
      video that is only in iCloud says so instead of downloading it.

## 1. Before anything else

- [ ] **Reserve the name.** The app is now **Bildklar** (store name *Bildklar KI:
      Foto Reiniger* / *Bildklar AI: Photo Cleaner*, bundle id
      `com.habboubah.bildklar`, purchase `com.habboubah.bildklar.unlock`).
      Register the new bundle id under Certificates, Identifiers & Profiles,
      then App Store Connect → Apps → + → New App with that name, and *Create
      app* in the Play Console. If you already registered
      `com.habboubah.fotonest` or created a "Fotonest" app record, leave it
      unused — it does no harm. Name taken after all? Tell Claude.
- [x] **Icon.** New Bildklar icon (broom sweeping photos, `assets/icon-master.png`),
      17 Nov 2026. Upload `store/play-icon-512.png` as the Play listing icon.
- [ ] `npm install` in `~/repos/photo-filter-app` (the repository came without
      `node_modules`), then `npm run check` — it should pass as it did in the cloud.

## 2. iPhone — the first build (milestone 1)

The Swift code was written and its feature part tested (`swift test`), but
**it has never been compiled in Xcode** — expect a few compile errors to fix
(Claude can fix them from the error messages).

- [ ] `npm run build:ios` → Xcode → ▶ on your iPhone (a **debug** build: the
      dry run is on).
- [ ] The permission dialog: try *Limit Access…* once (the banner, *Fotos
      auswählen*), then *Allow Full Access* in Settings.
- [ ] The scan: progress on home, then trips, groups, blurry photos. How long
      did it take for your library? Leave the app and come back: does it continue?
- [ ] Open a trip, a group, the blurry list, a review — thumbnails load, the
      grid scrolls smoothly with a big trip.
- [ ] *Album erstellen* and *Löschen* in the dry run: the toast says what would
      have happened, nothing changes in Photos.
- [ ] Settings › Probelauf **off**, then once for real: an album appears in
      Photos; deleted photos are in *Zuletzt gelöscht*. Restore them from there.
- [ ] Tell Claude the blurry and near-identical results: too many / too few?
      Debug builds show each photo's sharpness in the review and the group
      view — the thresholds (`src/logic/blur.ts`, `similar.ts`) are first guesses.

### New since the cleaner features (16 November 2026)

- [ ] The new native method `getStorage` (Swift and Kotlin) has not been
      compiled: build once in Xcode and with `npm run android:debug`. Home
      should show *… von … auf dem Gerät frei* — compare it with Settings ›
      General › iPhone Storage (and Android's storage settings).
- [ ] `PrivacyInfo.xcprivacy` now declares the disk-space API (reason
      85F4.1, shown to the user). Nothing to change in App Privacy.
- [ ] Try *Duplikate*: save a photo from WhatsApp (or AirDrop it to yourself)
      and scan again — the copy should appear with the original marked
      *Original*. Tell Claude if two **different** moments show up as
      duplicates (the thresholds are in `src/logic/similar.ts`).
- [ ] *Schnell aufräumen* (Aufräumen › Schnell aufräumen) with the dry run on,
      then once for real: one system dialog for all the switched-on kinds.
- [ ] *Monat für Monat*: go through one month to the end — it is marked
      *Durchgesehen*.

### New since the rest of the plan (16 November 2026, late)

Everything below is native code that has **not been compiled** (the cloud has
no Xcode and no Android SDK). Expect compile errors; send them to Claude.

- [ ] `npm install` (new: `@capacitor/local-notifications`), then `npx cap sync`.
- [ ] **Widget, iPhone:** Xcode › the project now has a second target,
      *BildklarWidget* (added by `ios/scripts/add-widget.rb`). Under Signing &
      Capabilities, check both targets show your team and the App Group
      `group.com.habboubah.bildklar` (Xcode registers it with automatic
      signing; if it complains, add the App Group in the developer portal for
      `com.habboubah.bildklar` and `com.habboubah.bildklar.widget`). Then add
      the widget to the home screen.
- [ ] **Videos:** after the first scan, *Große Dateien* shows your biggest
      videos; screen recordings appear under *Screenshots*. Try *Video
      verkleinern* on a 1–2 minute video with the dry run **off**: a smaller
      copy appears next to it in Photos / Gallery, then the app asks whether
      the original may go.
- [ ] **Live Photos** (iPhone): convert two, check the stills in Photos (date,
      place, album), then the Live Photos in *Zuletzt gelöscht*.
- [ ] **Bursts** (iPhone): a burst's hidden frames now show up in *Fast
      gleiche*; the frame you picked in Photos is kept.
- [ ] **Reminder:** Settings › Wöchentliche Erinnerung on → the system asks →
      a notification on Sunday at 18:00.
- [ ] **Android:** `npm run android:debug` — new: Media3 (smaller videos), the
      app widget, `READ_MEDIA_VIDEO` (the permission dialog now says *Photos
      and videos*). In the Play Console, answer the Photo and video permissions
      declaration for **both** permissions (text in `store/listing.md` 3.5).

## 3. Android — the first run

The Kotlin compiles, a debug APK and an R8 release build come out, the feature
tests pass — **but it has not run on a phone.**

- [ ] `npm run android:debug`, then `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
      (or `npm run build:android` → Android Studio → Run).
- [ ] Permission: *Allow all* and, on Android 14+, *Select photos* (then *Fotos
      auswählen* in the app shows the reselection).
- [ ] Do trips appear? (They need GPS in the photos: if none, the permission
      `ACCESS_MEDIA_LOCATION` may not have been granted — check *App info ›
      Permissions*.)
- [ ] *Ordner erstellen* with the dry run off: Android's dialog, then the photos
      in `Pictures/Bildklar/<trip>/` (Files app, Google Photos › Library). Does
      **Google Photos** back up that folder, or does it need *Back up device
      folders*? Write it down for the store text.
- [ ] Deleting: Android's dialog → the photos in the Trash (Google Photos › Library › Trash).
- [ ] Optional experiment — **removing INTERNET**: see ANDROID_RELEASE.md,
      "The INTERNET permission". Only if purchases and the app still work.

## 4. The stores (milestone 5)

- [ ] App Store Connect: create the app (APP_STORE_RELEASE.md step 4). The
      in-app purchase `com.habboubah.bildklar.unlock` at 4,99 € (step 8g) and a
      sandbox tester only when the unlock goes on sale (0b).
- [ ] Play Console: create the app (ANDROID_RELEASE.md). The in-app product
      and a licence tester only when the unlock goes on sale (0b).
- [ ] When selling: buy once in each (sandbox / licence tester), then *Käufe
      wiederherstellen* after reinstalling.
- [ ] Publish the privacy pages: copy `store/privacy/` to
      `../privacy-policy/bildklar/` and push (APP_STORE_RELEASE.md step 5).
- [ ] First uploads: `npm run release:first` (iOS); Android's first bundle by
      hand (`npm run release:android -- --no-upload`, then the Play Console).
      You will need an upload key first: `npm run android:key`.

## 4b. Arabic (added 17 November 2026)

- [ ] **Read the Arabic texts** in the app (Settings › Sprache › العربية) and
      tell Claude what sounds wrong — they are Claude's translation
      (`src/translations.ar.ts`).
- [ ] Open the project in Xcode once (`npm run build:ios`): the widget's new
      `ar.lproj/Localizable.strings` is in the project file; check it shows under
      the widget's Localizable.strings.
- [ ] Decide whether the stores get an Arabic listing (`store/listing.md` has
      de / en only) and whether trip names should use Arabic city names (then
      `npm run cities` with the Arabic GeoNames names — the table grows).

## 5. Store assets (milestone 7)

- [ ] **After the iOS 27 redesign ("Glass", 17 November 2026, docs/REDESIGN.md)**:
      everything below shows the old look until it is made again. On the Mac:
      `npm run check`, then look at the app on a real iPhone and Android phone
      (the glass, the floating sheets, the scroll edge under the bars);
      `npm run assets:generate` for the new splash colours; then the
      screenshots, the preview video and the App Review rehearsal below. Tell
      Claude if the store studio's headlines should drop Fraunces too.
- [ ] **Test with real photos** (docs/DEVELOPMENT.md, *The test library*):
      on the Mac `npm run test-photos` (run it again if Wikimedia's videos
      were still missing), boot a simulator, `npm run test-photos:sim`, then go
      through every screen: trips, *An diesem Tag*, similar and blurry photos,
      duplicates, screenshots, videos, the AI's categories. Android:
      `npm run test-photos:android`. **Never on your own phone.**
- [x] **Demo photos for the store** (17 November 2026): the web demo shows
      real CC0 photos now (`npm run demo-photos`; no identifiable people).
      Make the screenshots, the preview video and the App Review rehearsal
      again on the Mac (below) — they still show the drawn ones.
- [ ] `npm run screenshots && npm run store-screenshots` on the Mac; look at the
      contact sheets. While nothing is for sale the set has seven screens (no
      album, no paywall) and shows the app as a new user sees it. The studio's headlines are in
      `.claude/skills/store-screenshot-studio/config/copy.<de|en>.json`.
- [ ] `npm run app-preview` (needs `brew install ffmpeg`).
- [ ] **App Review recording** (`ios/AppReviewRecorder/README.md`): put the
      demo photos on the iPhone, give Bildklar **Limited Access to only
      those** (Settings › Apps › Bildklar › Photos › Limited Access), install
      the TestFlight build (nothing to buy while the app is free), then
      `npm run rehearse:app-review`, `DRY_RUN=1 npm run record:app-review`,
      `npm run record:app-review`. After each run recover the two deleted
      photos from *Zuletzt gelöscht*.
- [ ] Play: the **Photo and video permissions** declaration (text in
      `store/listing.md` 3.5); if Play asks for a video, record the same flow
      on the Android phone: `adb shell screenrecord /sdcard/bildklar.mp4`
      (3 minutes at most), then `adb pull /sdcard/bildklar.mp4`.
- [ ] Data safety: read section 3.4 of `store/listing.md` (the Play Billing
      Library's own logging) before answering.

## 6. A real 50,000-photo library (milestone 6)

- [ ] On your own phones: how long the first scan takes, whether the app stays
      smooth while it runs, how big the thumbnail cache gets (≤ 200 MB by design).
- [ ] iPhone with *Optimise iPhone Storage*: photos whose original is only in
      iCloud get thumbnails from the local preview; do they also get
      features (sharpness, hash)? If many don't, tell Claude.

## 7. The on-device AI (docs/AI.md)

Built and tested in the cloud: the model export, the Android build (debug +
R8 release), Android's golden-fixture test, all of `npm run check`. **The
Swift side has not been compiled** (no Xcode in the cloud).

- [ ] Xcode: open the project once so it fetches ONNX Runtime 1.24.2 (File ›
      Packages › Resolve if it doesn't). `npm run build:ios`, ▶ on the iPhone.
      Compile errors in `ImageEmbedder.swift` / the AI parts of
      `PhotoLibraryPlugin.swift` → send them to Claude.
- [ ] `npm run test:ios:ai` on the Mac: the iPhone's embedder against the
      Python reference (golden fixtures).
- [ ] On the iPhone: after the scan the subtitle says *KI: … von … Fotos*.
      How long does the AI take for your library (minutes per 1,000 photos)?
      Does the phone get warm? Write the numbers into docs/AI.md.
- [ ] Android: `npm run android:debug` + install; the same check. The APK
      now carries the model (76 MB) and ONNX Runtime (about 26 MB per phone
      type, arm64); Play delivers only the phone's own type.
- [ ] Look at *Unwichtige Fotos* and the categories on your own library:
      any photo that should not be there? Any receipt or document missing?
- [ ] **Label about 400 real photos** (docs/AI.md, "Test set") and run
      `npm run ai:eval -- --set ml/testset/real --models int8` — the thresholds are
      provisional until then.
- [ ] Later steps of the plan, not built yet: Android's eyes-open face
      models, trip highlights, the AI pass in the background while charging,
      the store texts and screenshots for the AI.

### 7b. More reliable, and search (17 November 2026, AI version 2)

What changed: the phones store a compact vector per photo (no label scores);
the app scores 33 labels from it, confirms similar groups and copies with it,
says how sure each suggestion is, searches by words, shows look-alikes, learns
from your reviews, and Android finds faces (YuNet). Every photo gets its AI
pass again after the update (that is expected). Android's unit tests pass;
**the Swift side has not been compiled.**

- [ ] Xcode: `npm run build:ios`; compile errors in `ImageEmbedder.swift`,
      `ScanStore.swift` (schema 5, `vectors`) or `PhotoLibraryPlugin.swift`
      (`getVectors`) → send them to Claude. Then `npm run test:ios:ai`.
- [ ] On both phones: after the AI pass, *Suchen* finds *Hund*, *Strand*,
      *Kassenzettel* in your library? *Ähnliche Fotos zeigen* in a review?
- [ ] *Suchen* with your own photos: do the *In deinen Fotos* cards show
      words you really have (*Baby*, *Kind* …), each with a fitting photo?
      Any card with a wrong photo, or a word you miss → tell Claude (the
      mark is `EXAMPLE_SURE` in `src/logic/search.ts`). Try the parent words:
      *Baden*, *Schlafen*, *Schnuller*, *Fläschchen*, *Ultraschall*.
- [ ] Near-identical groups: any group that is not one moment, or a series
      split in two? Duplicates: an edited copy found (*Bitte prüfen*)?
- [ ] *Schnell aufräumen*: does it hold back the unsure photos (*Unsichere
      durchgehen*)? Is anything *Sicher* that you would keep?
- [ ] Android: the best shot in a group of people photos — does it pick the
      one with the faces sharp?
- [ ] Python for `ml/`, once: `python3 -m venv ml/.venv && ml/.venv/bin/pip install -r ml/requirements-light.txt`.
- [ ] **The group test set** (docs/AI.md, "Test set", 2): about 50 pairs of
      two shots of one moment, 30 copies (edited, cropped, sent through
      WhatsApp), 50 pairs of different photos taken close together, 10
      series with the best marked. `npm run ai:eval-groups` → send Claude the
      numbers: it sets `SIM_COS`, `DUP_COS` and the hash limits.
- [ ] The label test set now has 33 labels: add folders for the new ones
      (ticket, product, parking, map, idcard, bankcard, baby, selfie, …).
- [ ] Decide: **who is in a photo** (people recognition, opt-in, on the
      phone — Apple Photos' and Google Photos' faces are not readable by
      apps), and whether a larger model may come as a download from the
      store (Play Asset Delivery / On-Demand Resources). Both are in the
      enhancement plan (project doc `claude/ai-enhancement-plan.md`).

## 8. The next ten features (plan of 17 November 2026, version 2.1.0)

Built step by step from the plan *Bildklar — plan for the next 10 features*.
Everything in TypeScript is tested by `npm run check`; what needs a phone:

- [ ] **Decide later**: swipe up in a review on both phones (the card follows
      the finger upwards too; the photo grid behind must not scroll).
- [ ] **Too dark / too bright**: look at *Missglückt › Zu dunkel / Zu hell*
      on your own library. Any night photo that shouldn't be there? Any pocket
      shot missing? Tune `DARK_*` / `BRIGHT_*` in `src/logic/exposure.ts`
      (provisional, like the AI thresholds) and write what you chose in docs/AI.md.

- [ ] **Protected albums** — new native methods `listAlbums` and
      `albumMembers` (Swift and Kotlin, not compiled in the cloud): Xcode build,
      then Aufräumen › Geschützt on the iPhone lists your own albums with the
      right counts; switch one on and check its photos vanish from the
      suggestions. Android: the list shows your folders (Camera, WhatsApp
      Images, …).

- [ ] **Lock Screen widget** (Swift, not compiled in the cloud): build the
      app and the widget in Xcode; long-press the Lock Screen › Customize ›
      add Bildklar (the line, the gauge, the inline text). Check the numbers
      match home, then add a screenshot of it to docs/features.md.

- [ ] **Scan schema 4** (Swift and Kotlin, not compiled in the cloud): on
      both phones, update over the 2.0.x build (don't reinstall) and check the
      rescan doesn't analyse every photo again — only a short pass, then the
      AI looks at the videos' poster frames. Note how long it took for your
      library. Then: does a JPEG show as `fmt: jpeg`, an edited iPhone photo
      as `edited`? (debug build: the facts are in the review's debug badge only
      for sharpness — check via Safari's Web Inspector, `PhotoLibrary.getFacts`).

- [ ] **Fotos verkleinern** (Swift `compressPhotos`, Kotlin `compressPhotos`
      + `androidx.heifwriter:heifwriter:1.1.0`, not compiled in the cloud):
      on each phone make 100 photos smaller, then check in Photos / the
      Gallery that date, place, favourite and albums (iPhone) / folder
      (Android) are kept, the copies look right (rotation!), and the originals
      land in Recently Deleted / the Trash only after the dialog. The plan's
      Swift test (a JPEG fixture → HEIC with the same date and GPS) and the
      Android instrumented check are still to write.

- [ ] **Videos in the review** (new native `preview`, not compiled in the
      cloud): in a month with a video tap ▶ — iPhone plays it over the app
      (close with ✕), Android opens the system player; back lands in the review.

- [ ] **Lookalike videos**: once the AI has looked at your videos (schema 4),
      check *Duplikate › Ähnliche Videos*. Then calibrate `LOOKALIKE_COSINE`
      (0.92, provisional) on 50 of your real video pairs like the AI
      thresholds: AUC and a precision of at least 95 % before 2.1.0 ships
      (docs/AI.md).

- [ ] **Albums while swiping** (new native `addToAlbums`, not compiled in the
      cloud): a dry run and one real run on each phone. iPhone: the photos
      appear in the album and stay in Recents. Android: one dialog for all the
      photos, then they are in Pictures/<name>/ (or the chosen folder).

- [ ] **Chats & soziale Medien (Android)**: with WhatsApp / Telegram photos on
      the phone, the row appears and the cards match the folders.
- [ ] **Chats & soziale Medien (iPhone)**: with "Save to Photos" on in
      WhatsApp (and Instagram / Snapchat), the albums of those names appear as
      groups. Photos saved without the app's album are not found: the one-day
      test (docs/AI.md) can still add file-name and metadata signals for them.

## Known gaps (to decide later)

- Arabic: the structure is there (RTL rules, the translation layout), the texts are not.
- On-device AI: the core and the reliability/search step are built (sections 7, 7b); people recognition and a downloadable model wait for a decision.
- Videos are not part of trips or trip albums yet (Android's folders for videos
  differ from photos'); Android's motion photos are not converted.
- Shared iCloud libraries, who is in a photo: not planned.
- The rating row appears once `APP_STORE_ID` is set in `src/links.ts`.
