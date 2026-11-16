# What is left – for Ahmad

What only you can do: a Mac with Xcode, your phones, the stores, the photos.
In order. (State: 16 November 2026, after the first build by Claude.)

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

## Known gaps (to decide later)

- Arabic: the structure is there (RTL rules, the translation layout), the texts are not.
- Videos (largest videos, duplicate videos, screen recordings) and the Android
  AI categories wait for your decisions in the plan (`claude/feature-gap-plan.md`
  in the project). Live Photo to still, video compression, widgets and
  reminders are next: native code that has to be built and tried on the phones.
- Shared iCloud libraries, who is in a photo: not planned.
- The rating row appears once `APP_STORE_ID` is set in `src/links.ts`.
