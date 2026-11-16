# Einkaufsliste – ganz einfach 🧺

A simple, private shopping list for iPhone, Android and the browser.
English: *Shopping List – Nice & Easy*, Arabic: *قائمة مشتريات التسوق البسيطة*; code
name shoppinglist ("Korb" until November 2026). Bundle id `com.habboubah.korb`.

## Setup

Needs Node.js 22, Xcode (iPhone) and Android Studio (Android).

```bash
npm install
npx playwright install chromium   # once per Mac, for the checks and screenshots
```

## Run

```bash
npm run dev              # http://localhost:3001 — also from your phone on the same Wi-Fi
```

## Build

```bash
npm run build:ios        # web build → sync into ios/ → opens Xcode, then ▶ Run
npm run build:android    # web build → sync into android/ → opens Android Studio, then ▶ Run
npm run android:debug    # debug APK → android/app/build/outputs/apk/debug/app-debug.apk
npm run build:web        # production web build → dist/
npm run preview          # serves dist/ on http://localhost:3001
```

## Check

```bash
npm run check            # lint, tests, privacy, bundle budget, contrast — before a release
```

## Screenshots

```bash
npm run screenshots                                  # raw captures → screenshots/de, screenshots/en
npm run screenshots -- --only 02-list,08-settings    # only some screens
npm run store-screenshots                            # framed store sets → screenshots/store/
npm run ui-review                                    # every screen → screenshots/review/
```

## App preview video

```bash
brew install ffmpeg                  # once per Mac
npm run app-preview                  # films the app, DE + EN → screenshots/store/app-preview/
npm run app-preview -- --lang de     # one language
npm run app-preview -- --compose     # the same film again, after changing a caption or its timing
```

## App Review recording

iPhone on the cable, unlocked, Do Not Disturb on.

```bash
npm run rehearse:app-review                        # checks every step against the code (3 min)
DRY_RUN=1 npm run record:app-review                # full run on the iPhone, without recording
npm run record:app-review                          # the real recording → video in Photos
FROM=5 TO=7 DRY_RUN=1 npm run record:app-review    # only scenes 5–7
npm run record:watch                               # lets Claude start the runs
```

Preparation and troubleshooting: [ios/AppReviewRecorder/README.md](ios/AppReviewRecorder/README.md).

## Release

```bash
npm run release:dry      # what would happen; nothing built or sent
npm run release          # both stores on one version
npm run release:ios      # the App Store only
npm run release:android  # Google Play only
```

- App Store Connect: https://appstoreconnect.apple.com/apps
- Google Play Console: https://play.google.com/console

## More

Everything else is in [docs/](docs/): [features](docs/features.md) ·
[development](docs/DEVELOPMENT.md) (layout, single checks, icons, the share
page, adding a language) · [App Store release](docs/APP_STORE_RELEASE.md) ·
[Android release](docs/ANDROID_RELEASE.md) · [what is left to do](docs/TODO.md).

# Play Store internal testing: https://play.google.com/apps/internaltest/4701127246496820658

# Play Store 
Internal testing: https://play.google.com/apps/internaltest/4701127246496820658
Closed testing: https://play.google.com/store/apps/details?id=com.habboubah.korb

# Apps Store online Link
https://apps.apple.com/de/app/einkaufsliste-ganz-einfach/id6829094492
