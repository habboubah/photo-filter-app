# Releasing Fotonest for Android

The Android app is the same web app in a Capacitor shell (`android/`), set up
the way budget-app (Spartopf) has it. This is what it takes to get it onto a
phone and into Google Play.

**Where it stands (16 November 2026):** the project compiles — a debug APK and
an R8 release build come out of it (version 0.1.0, version code 10000, package
`com.habboubah.fotonest`, minSdk 30), and the feature tests pass
(`npm run test:android`). **It has not run on a phone yet**, and there is no
Play Console app yet. What to try first is in [TODO.md](TODO.md).

## Once per machine

1. **Android Studio** (it brings the SDK and a JDK). Open it once and let it
   install *Android SDK Platform 36* and *Build-Tools*.
2. `npm install` in the repository.

## Run it on a phone or the emulator

```
npm run build:android     # web build, sync, opens Android Studio — press Run
npm run android:debug     # or: just build android/app/build/outputs/apk/debug/app-debug.apk
```

On the phone: *Settings › About phone › tap "Build number" seven times*, then
*Developer options › USB debugging*, plug it in, and pick it in Android Studio.

## Once: the upload key

Google signs the app for users (Play App Signing); you sign what you upload
with your own **upload key**. Fotonest gets its own — make it once:

```
npm run android:key
```

`keytool` asks for a password and your name. The key goes to
`~/.android-keys/fotonest-upload.jks`; its path and alias are written into
`.env.release` (gitignored). Keep a copy of the file and the password
somewhere safe outside the computer — lose them and Google has to reset the
key. Never commit the keystore, the password or `.env.release`.

The first `npm run release:android` asks for the password **once**, checks
that it opens the keystore, and writes it into `.env.release`
(`ANDROID_KEYSTORE_PASSWORD=…`, the file is readable by you only). No later
release asks. Delete that line to be asked again.

## Once: the Play Console

1. The Google Play developer account that ships Fahrtwerk and Spartopf. (A
   personal account created after November 2023 must run a **closed test with
   12 testers for 14 days** before a new app may go to production.)
2. *Create app*: name *Fotonest – Fotos aufräumen*, default language German, App,
   Free (free to download — the unlock is an in-app product). The package name
   `com.habboubah.fotonest` is fixed by the first upload.
3. Fill in *Store listing*, *Data safety* and *App content* from
   `store/listing.md` (section 3, Google Play) — including the **Photo and
   video permissions** declaration (3.5): a photo manager whose core use is
   reading the whole library.
4. *Monetize › Products › In-app products* → **Create product**: product ID
   `com.habboubah.fotonest.unlock` (the same as the App Store's, `PRODUCT_ID` in
   `src/native/purchases.ts`), name *Fotonest freischalten*, price **4,99 €**,
   *Activate*. A one-time product; the app acknowledges each purchase.
   *Setup › License testing* → add your Google account: its purchases are free
   test purchases.
5. Screenshots: `npm run screenshots && npm run store-screenshots`, then upload
   `screenshots/store/play-phone/<de|en>/` and
   `screenshots/store/play-feature/<de|en>/feature-graphic.jpg` (1024 × 500).
   The app icon for the listing (512 × 512) is `store/play-icon-512.png`.

## Once: the service account (so the upload needs no Play Console)

`npm run release:android` uploads through the Play Developer API as a
**service account**. A service account belongs to the developer account, not
to one app — the one that ships Spartopf ships Fotonest too:

1. *Play Console › Users and permissions*: open the service account (its
   address ends in `.iam.gserviceaccount.com`), *App permissions › Add app ›
   Fotonest*, and tick *Release apps to testing tracks*.
2. In `.env.release`, `PLAY_SERVICE_ACCOUNT_JSON` is the path of that JSON
   key — the same line as in budget-app's `.env.release`. The key stays
   outside the repository.
3. The **first** bundle of a new app has to be uploaded in the Play Console by
   hand (*Testing › Internal testing › Create new release*); the API only
   knows the app after that. Build it with
   `npm run release:android -- --no-upload` and upload
   `android/app/build/outputs/bundle/release/app-release.aab`.

## Every release

```
npm run release                           # both stores on one version (App Store + Google Play)
npm run release:android                   # Google Play only: check, build, sign, upload -> internal test track
npm run release:android -- --dry-run      # what would happen; nothing built or sent
npm run release:android -- --no-upload    # only the signed app-release.aab
npm run release:android -- --track alpha  # the closed test instead (beta: the open test)
```

Both are `scripts/release.js` (`release:android` is `--android`);
`scripts/release-android.js` is its Android half.

One command, nothing to click: it asks Play what it already has, runs the
checks (`npm run check`), builds and signs the bundle, uploads it, puts it on
the **internal test track** as a finished release and attaches the release
notes. Testers get it as an update a few minutes later.

- **Version.** The same as the iPhone's, always. `npm run release` takes a
  new version for both stores. `npm run release:android` ships the current
  version when Google Play does not have it yet (the iPhone went first), and
  takes a new one otherwise — `npm run release:ios` then brings the App Store
  up to it. The version code follows from the version (1.2.7 → 1020700).
  `--keep-version` ships the same version again under the next free code
  (1020701, …); `--build N` forces the number.
- **Release notes.** `release-notes/<version>/<language>.txt`, else
  `release-notes/default/`. The file name is Play's language code (`de-DE`,
  `en-GB`, `en-US`); only the languages the store listing has are sent.
  500 characters at most.
- **Track.** `internal` unless `--track` or `PLAY_TRACK` in `.env.release`
  says `alpha` or `beta`. **Production is never touched** — promote a release
  there by hand in the Play Console.
- **An app that was never published** only takes a *draft* from the API. The
  script then uploads the release as a draft and says so; roll it out once in
  the Play Console. After the app is live the command does that too.
- **When Play refuses** (no permission, the app not there yet), the script
  stops *before* building and says what to check.

## What is different from the iPhone

- **Albums are folders.** Android has no albums shared by every gallery app,
  so *Ordner erstellen* moves a trip's photos into `Pictures/Fotonest/<trip>/`
  — after Android's own consent dialog (`MediaStore.createWriteRequest`).
  The files are moved, never copied, and their contents never change. Gallery
  apps show the folder as an album. **Check on your phone** whether Google
  Photos backs up the new folder (*Google Photos › Settings › Backup › Back up
  device folders*); the photos were already backed up from the camera folder.
- **Deleting** goes through `MediaStore.createTrashRequest` → Android's dialog
  → the Trash. Never the permanent delete request; that's why minSdk is 30.
- **No eyes-open score.** Vision does that on the iPhone; on Android the best
  shot is the sharpest, best exposed one. ML Kit could detect eyes, but its
  terms say it sends usage metrics to Google — so no ML Kit.
- **Sizes are exact** (MediaStore knows them); the iPhone estimates them.
- **Wording.** Strings that name the iPhone, Apple Photos or "Zuletzt
  gelöscht" have an Android twin (`androidStrings` in `src/translations.ts`);
  a test fails when a new one is missing.
- **Edge to edge.** Android draws behind the system bars; the safe area comes
  from Capacitor's `--safe-area-inset-*` variables (`src/index.css`).
- **Backup.** The scan cache stays out of the phone's backup
  (`res/xml/backup_rules.xml`, `data_extraction_rules.xml`); the decisions
  (`files/state.json`) may be in it when the user has Google's backup on.
- **No Google services of our own**: no Firebase, no Play Services, no
  analytics, no ML Kit. Permissions: the photo permissions,
  `ACCESS_MEDIA_LOCATION`, `INTERNET`, `VIBRATE` (haptics), and from the Play
  Billing Library `BILLING` and `ACCESS_NETWORK_STATE`.
- **Portrait only**, as on the iPhone.

## The INTERNET permission

The question was whether it can go — "no internet permission" would be a
selling point. What was found (16 November 2026, from the merged manifest of
the release build):

- The **Play Billing Library** (9.1.0) brings Google's `datatransport`
  libraries, which declare `INTERNET` and `ACCESS_NETWORK_STATE` themselves.
  Since Play Billing Library 6 it logs "API usage (such as success and
  failure) and service connection issues" to Google (its release notes). So
  removing the line from our manifest would change nothing: the merged
  manifest gets it from the library.
- Removing it for real means `tools:node="remove"` on the permission *and*
  excluding `com.google.android.datatransport` from the billing dependency —
  untested: the library may then crash or fail to buy. And the web view may
  need the permission to load the app from `https://localhost` at all.
- So it **stays**, and the store texts don't promise "no internet". Our own
  code makes no request (`npm run check:privacy` greps the Kotlin and Swift
  for network calls). Test once on a phone if you want to try the removal
  (TODO.md).

## Data safety and the Billing Library

Our code collects nothing. The Play SDK Index lists no data-safety guidance
for the Play Billing Library ("Not provided", November 2026), but it does send
Google its own usage logs. Answer the Data safety form for what *the app*
collects (nothing) and read Google's current guidance on SDK data before
submitting — section 3.4 of `store/listing.md` has the answers and the
caveat.

## Keep in step

`@capacitor/android` must be on exactly the same version as `@capacitor/core`
and `@capacitor/ios`. After adding or updating a plugin: `npx cap sync`. The
launcher icon and the splash screens come from `assets/icon.svg`:
`node scripts/icon-assets.mjs && npm run assets:generate`. The Play Billing
Library must stay on a version Play still accepts for uploads (8 or newer
since August 2026; the current line is 9 — `billingVersion` in
`android/variables.gradle`).
