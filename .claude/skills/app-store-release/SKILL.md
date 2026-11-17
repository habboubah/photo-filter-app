---
name: app-store-release
description: Build Bildklar and upload it to App Store Connect / TestFlight and Google Play's test track, regenerate the store screenshots, or prepare a new store version. Use when asked to release, ship, publish, upload to the App Store, TestFlight or Google Play, bump the version, or refresh store screenshots for this app.
---

# Releasing Bildklar to the App Store and Google Play

Bildklar ships exactly like the shopping list, budget-app (Spartopf) and
pizza-driver-log (Fahrtwerk): one command ships **both stores on one version** — a signed
bundle to Google Play's internal test track through the Play Developer API,
and an `xcodebuild` archive to App Store Connect with an App Store Connect API
key. Submitting for App Review and promoting to production on Google Play are
manual clicks in the consoles; the script never touches production. The full
human checklists are `docs/APP_STORE_RELEASE.md` and
`docs/ANDROID_RELEASE.md` — read them when anything below fails.

**Only release when explicitly asked.** A release uploads, commits and tags.

## Before running anything

Check, and stop with a clear message if one is missing:

1. Running on **macOS with Xcode** (`xcode-select -p`; the script falls back to
   `/Applications/Xcode.app` itself). Google Play alone
   (`npm run release:android`) also needs Android Studio's SDK and JDK.
2. `.env.release` exists with `ASC_KEY_ID` and `ASC_ISSUER_ID` (copy them
   from the shopping list's `.env.release` — the key is per team, not per app), and
   the key file `~/.appstoreconnect/private_keys/AuthKey_<ASC_KEY_ID>.p8`
   exists (or `ASC_KEY_PATH` points at it). For Google Play:
   `ANDROID_KEYSTORE_PATH` + `ANDROID_KEY_ALIAS` (Bildklar's own upload key,
   `bildklar-upload.jks`, made once with `npm run android:key` — never the
   shopping list's) and `PLAY_SERVICE_ACCOUNT_JSON`. Never print or commit any
   of them.
3. The app records exist: App Store Connect (bundle id `com.habboubah.bildklar`,
   with the in-app purchase `com.habboubah.bildklar.unlock`) and the Play
   Console (package `com.habboubah.bildklar`, the same product, a first bundle
   uploaded by hand — the API only knows the app after that). "No suitable
   application records were found" or Play refusing the service account is
   that missing step; the guides say what to do.
4. Working tree is clean enough to commit: the script commits `package.json`,
   `project.pbxproj` and `release-notes/`, and tags `vX.Y.Z`.
5. `docs/TODO.md` has nothing open that blocks a release.

## Commands

| Goal | Command |
|---|---|
| Preview the bump, change nothing | `npm run release:dry` |
| The very first App Store upload (2.0.1, the version Google Play already has — kept as it is) | `npm run release:first` (see the guide) |
| Bug-fix release (2.0.1 → 2.0.2), **both stores** on one version | `npm run release` |
| The App Store only / Google Play only | `npm run release:ios` / `npm run release:android` |
| Feature release (2.0.x → 2.1.0) | `npm run release -- minor` |
| Re-upload the same version (a rejected build) | `npm run release:ios -- --keep-version` |
| Only the signed Android bundle, nothing uploaded | `npm run release:android -- --no-upload` |
| Store screenshots: raw captures / the framed sets | `npm run screenshots && npm run screenshots -- --android` / `npm run store-screenshots` (once: `npx playwright install chromium`) |
| The App Store preview video (DE + EN) | `npm run app-preview` (once: `brew install ffmpeg`; the `app-preview-video` skill) |

The script gates on `npm run check` (lint, security, tests, build, the privacy
check, the bundle budget, the contrast audit, the store texts' lengths), decides the version, bumps
`package.json` and the Xcode project's `MARKETING_VERSION` together (the iOS
build number always +1; Android's version code follows from the version),
builds the web app once (`vite build --mode native`: without the demo library), ships Android, then iOS (`cap sync ios`, archive,
upload via `ios/App/ExportOptions.plist`), then commits
`Prepare release vX.Y.Z (build N)` and tags it.

**The version rule.** A run takes a new version unless none of the stores it
ships to has the current one yet — then it ships that one, so a store that was
left out catches up instead of opening a gap. `patch` / `minor` / `major`
named on the command line always bump.

## Before a release that changes what users see

- What's New: 1–3 lines in `store/listing.md`, and Google Play's release notes
  in `release-notes/<version>/<language>.txt` (`de-DE`, `en-GB`, `en-US`;
  without them `release-notes/default/` is sent). Words that differ between the
  platforms (Album / Ordner, Zuletzt gelöscht / Papierkorb): keep the notes
  neutral, they go to both stores. `npm run check:listing` counts them.
- A screen changed: `npm run screenshots && npm run screenshots -- --android
  && npm run store-screenshots`, look at both contact sheets, upload the new sets.
- A screen the preview video passes through changed (home, a trip, a group,
  the review): `npm run app-preview`, look at its contact sheets, upload the
  new videos with the version and set their poster frames.
- A screen the App Review recording passes through changed: update
  `ios/AppReviewRecorder/scenes.json` and run `npm run rehearse:app-review`.

## After a successful upload

Tell the user:
- the version, the iOS build number and the Android version code that went up,
- the iPhone build appears in TestFlight after Apple's processing (5–30 min);
  to submit: App Store Connect → Bildklar → the version → Build → pick it →
  (first version: also add the in-app purchase under *In-App Purchases*) →
  "Add for Review" (guide step 9),
- the Android build is on the internal test track; promoting it to production
  is a manual step in the Play Console (a never-published app only takes a
  draft: roll it out once by hand).

## Common failures

- **No profiles / signing errors** → open `ios/App/App.xcodeproj` once in
  Xcode, App target → Signing & Capabilities, team "Ahmad Habboubah
  (HZVBBHBAJN)", "Automatically manage signing". The API key needs the Admin or
  App Manager role for `-allowProvisioningUpdates`.
- **"The bundle version must be higher"** → the script starts from the highest
  build App Store Connect, the tags and the project know; `npm run release:dry`
  shows the numbers, then run it again.
- **Missing Swift packages** → open the project once in Xcode, or
  `xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj`.
- **Wrong DEVELOPER_DIR** → install Xcode in /Applications or
  `sudo xcode-select -s /Applications/Xcode.app`.
- **Google Play did not let the service account in** → Play Console › Users
  and permissions: the service account needs Bildklar with "Release apps to
  testing tracks"; the app needs its first release uploaded by hand.
- **No upload key** → `npm run android:key` (once; keep the keystore and its
  password safe outside the computer).
