# What is left – for Ahmad

What only you can do: a Mac with Xcode, your phones, the stores, the photos.
In order. (State: 16 November 2026, after the first build by Claude.)

## 0. Temporary: the dry run in release builds

- [ ] **Turn it off again after testing.** Release builds show the dry run
      switch (Einstellungen → *Nur in der Debug-Version*) too, starting **on**,
      so a TestFlight / Play build can be tried on the phone without touching
      the photos. Done testing? Set `DRY_RUN_IN_RELEASE` in `src/store.ts` to
      `false` (or ask Claude to remove it). **Never send a build to review
      while it is `true`.**

## 1. Before anything else

- [ ] **Reserve the name.** The app is now **Bildklar** (store name *Bildklar KI:
      Foto Reiniger* / *Bildklar AI: Photo Cleaner*, bundle id
      `com.habboubah.bildklar`, purchase `com.habboubah.bildklar.unlock`).
      Register the new bundle id under Certificates, Identifiers & Profiles,
      then App Store Connect → Apps → + → New App with that name, and *Create
      app* in the Play Console. If you already registered
      `com.habboubah.fotonest` or created a "Fotonest" app record, leave it
      unused — it does no harm. Name taken after all? Tell Claude.
- [ ] **Icon.** The icon still shows photos in a nest (`assets/icon.svg`) —
      the old name's picture. Ask Claude for a "Bildklar" icon if you want one.
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

- [ ] App Store Connect: create the app (APP_STORE_RELEASE.md step 4), the
      in-app purchase `com.habboubah.bildklar.unlock` at 4,99 € (step 8g), a
      sandbox tester; sign in with it on the iPhone (Settings › App Store).
- [ ] Play Console: create the app, the in-app product with the same id and
      price, your account as a licence tester (ANDROID_RELEASE.md).
- [ ] Buy once in each (sandbox / licence tester), then *Käufe
      wiederherstellen* after reinstalling.
- [ ] Publish the privacy pages: copy `store/privacy/` to
      `../privacy-policy/bildklar/` and push (APP_STORE_RELEASE.md step 5).
- [ ] First uploads: `npm run release:first` (iOS); Android's first bundle by
      hand (`npm run release:android -- --no-upload`, then the Play Console).
      You will need an upload key first: `npm run android:key`.

## 5. Store assets (milestone 7)

- [ ] **Demo photos**: about 60 photos licensed for commercial use (or your
      own), **with GPS and dates in their EXIF**, so they form trips — ideally
      Paris, Lake Garda, Amsterdam and Vienna like the drawn demo (then the
      App Review scenes match as they are). No recognisable children's faces
      unless you choose them. Note each licence in `store/demo-photos/LICENCES.md`.
      Then: Claude puts them into the web demo (replacing the drawn ones) for
      the screenshots and the preview video.
- [ ] `npm run screenshots && npm run store-screenshots` on the Mac; look at the
      contact sheets. The studio's headlines are in
      `.claude/skills/store-screenshot-studio/config/copy.<de|en>.json`.
- [ ] `npm run app-preview` (needs `brew install ffmpeg`).
- [ ] **App Review recording** (`ios/AppReviewRecorder/README.md`): put the
      demo photos on the iPhone, give Bildklar **Limited Access to only
      those** (Settings › Apps › Bildklar › Photos › Limited Access), install
      the TestFlight build and buy the unlock once there (free in TestFlight),
      then `npm run rehearse:app-review`, `DRY_RUN=1 npm run record:app-review`,
      `npm run record:app-review`. After each run delete the album *Paris, …*
      and recover the two deleted photos from *Zuletzt gelöscht*.
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
      `python ml/eval.py --set ml/testset/real` — the thresholds are
      provisional until then.
- [ ] Later steps of the plan, not built yet: Android's eyes-open face
      models, smart similar groups + trip highlights, search by things, the
      AI pass in the background while charging, the store texts and
      screenshots for the AI.

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
      then Settings › Geschützt on the iPhone lists your own albums with the
      right counts; switch one on and check its photos vanish from the
      suggestions. Android: the list shows your folders (Camera, WhatsApp
      Images, …).

## Known gaps (to decide later)

- Arabic: the structure is there (RTL rules, the translation layout), the texts are not.
- On-device AI: the core is built (section 7); the later steps of the plan are not.
- Videos are not part of trips or trip albums yet (Android's folders for videos
  differ from photos'); Android's motion photos are not converted.
- Shared iCloud libraries, who is in a photo: not planned.
- The rating row appears once `APP_STORE_ID` is set in `src/links.ts`.
