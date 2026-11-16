# Releasing Shoppinglist for Android

The Android app is the same web app in a Capacitor shell (`android/`), set up
the way budget-app (Spartopf) has it. This is what it takes to get it onto a
phone and into Google Play.

**Where it stands (November 2026):** the project compiles — a debug APK and a
release bundle build from it (version 1.0.0, version code 1000000, package
`com.habboubah.korb`). **It has not run on a phone or an emulator yet**, and
there is no Play Console app yet. What to try first is in [TODO.md](TODO.md).

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
with your own **upload key**. Shoppinglist gets its own — make it once:

```
npm run android:key
```

`keytool` asks for a password and your name. The key goes to
`~/.android-keys/korb-upload.jks`; its path and alias are written into
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
2. *Create app*: name *Einkaufsliste – ganz einfach*, default language German, App,
   Free. The package name `com.habboubah.korb` is fixed by the first upload.
3. Fill in *Store listing*, *Data safety* and *App content* from
   `store/listing.md` (section 3, Google Play).
4. Screenshots: `npm run screenshots && npm run store-screenshots`, then upload
   `screenshots/store/play-phone/<de|en>/` (eight phone screenshots, 1080 ×
   1920) and `screenshots/store/play-feature/<de|en>/feature-graphic.jpg`
   (1024 × 500). The app icon for the listing (512 × 512) is
   `public/icon-512.png`.

## Once: the service account (so the upload needs no Play Console)

`npm run release:android` uploads through the Play Developer API as a
**service account**. A service account belongs to the developer account, not
to one app — the one that ships Spartopf ships Shoppinglist too:

1. *Play Console › Users and permissions*: open the service account (its
   address ends in `.iam.gserviceaccount.com`), *App permissions › Add app ›
   Shoppinglist*, and tick *Release apps to testing tracks*.
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
  `en-GB`, `en-US`, `ar`); only the languages the store listing has are sent.
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

- **The same lists, the same screens.** Nothing is left out on Android.
- **Wording.** The strings that name iOS or iCloud have an Android twin
  (`androidStrings` in `src/translations.ts`); a test fails when a new one is
  missing.
- **Rating.** *App bewerten* opens the Play page (no Google Play library, so
  no in-app review prompt).
- **Shared lists.** `shoppinglist://share#…` (and the older `korb://share#…`) opens the app through the intent filter
  in `AndroidManifest.xml`, as the URL scheme does on the iPhone.
- **Edge to edge.** Android draws behind the system bars; the safe area comes
  from Capacitor's `--safe-area-inset-*` variables (`src/index.css`).
- **Backup.** The lists live in the web view's storage. As on the iPhone, they
  may be part of the phone's own backup (Google's) when the user has it on;
  the privacy policy says so. Nothing goes to the developer.
- **No Google services.** No Firebase, no Play Services library, no
  analytics. The only permissions are `INTERNET` (the web view loads the app
  from a local address; the app makes no request) and `VIBRATE` (haptics).
- **Portrait only**, as on the iPhone.

## Keep in step

`@capacitor/android` must be on exactly the same version as `@capacitor/core`
and `@capacitor/ios`. After adding or updating a plugin: `npx cap sync`. The
launcher icon and the splash screens come from the icon picture (`assets/icon-source.png`):
`node scripts/icon-assets.mjs && npm run assets:generate`.
