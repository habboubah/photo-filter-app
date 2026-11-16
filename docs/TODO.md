# What only Ahmad can do

Things that need the Mac, a phone, Xcode, Android Studio or the store
consoles. Everything else is in the repository and checked by `npm run check`.
Tick a line off by deleting it.

## First, on a phone (after the "Tüte" redesign, 14 November 2026)

- [ ] **Ticking an item** on the iPhone and on Android: the circle fills
      green, the picture hops into the bag in the dock, the bag squashes and
      its count goes up, with the light tap of the haptics. Tick five quickly
      and watch for dropped frames on an older Android phone. With *Reduce
      Motion* on nothing may fly.
- [ ] **The bag in the dock**: a tap scrolls to "Im Korb"; with VoiceOver it
      reads "Im Korb: 3".
- [ ] **Shopping mode**: the bag and "6 von 14" on the card in the list's
      colour, the *Als Nächstes* card (*In den Korb*, *Später*), and the
      screen staying on.
- [ ] **Home** with one list, with eight, and with a long list name at
      Larger Text: the first tile wide, the others in pairs, *Neue Liste* at
      the bottom.
- [ ] The pencil and the bin on every row, and the swipe and long press
      beside them — the swipe's red band must stay inside the row's corners
      on the first and last row of a card.
- [ ] **Arabic**: the titles are set in Baloo Bhaijaan 2 now (bundled); check
      a long list name and the large title for clipped marks.
- [ ] `npm install` is not needed (no dependency changed). The fonts — Baloo
      2 and Baloo Bhaijaan 2 for titles and numbers, Nunito for text — are
      files in `src/assets/fonts/`.
- [ ] The splash screens were regenerated in the new page colours (peach by
      day, dark plum at night): check them at launch.
- [ ] The store screenshots show the old look: `npm run screenshots &&
      npm run store-screenshots` on the Mac. Their colours
      (`.claude/skills/store-screenshot-studio/config/theme.json`) are
      already the new ones.

## After the rename to "shoppinglist" (14 November 2026)

- [ ] **Update an installed build** (TestFlight / Play's internal track) to
      the next one and check that the lists, the language and the theme are
      still there: the storage keys moved from `korb-…` to `shoppinglist-…`
      at the first start.
- [ ] Import a backup file exported by an earlier build (`korb-backup-….json`).
- [ ] Open a shared list from the share page: `shoppinglist://` on a new
      build, and an old `korb://` link too.

## Then, on the Mac (still open from the first November 2026 redesign)

- [ ] `npm install` — the dependencies changed (`@capacitor/android` is new,
      the Bricolage Grotesque font is gone, every version is pinned).
- [ ] `npm run build:ios`, run it on the iPhone and look at every screen by
      day and at night, in German and Arabic: the redesign has only been seen
      in Chromium, with Linux's fonts and emoji. Check especially the
      bar buttons, shopping mode, the sheets with the
      keyboard up, the splash screen (new background colours) and Larger Text.
- [ ] `npm run check` once on the Mac (it was run in a Linux container).
- [ ] `npm run screenshots && npm run store-screenshots` on the Mac, so the
      store set has Apple's font and emoji; look at
      `screenshots/store/contact-sheet.png` and
      `contact-sheet-play-phone.png`. Since 15 November 2026 the set is
      composed anew (peach, big headlines, parts of the screen lifted out of
      the phone, stickers across the slides — proofed in a Linux container
      only): say if you would rather have it on coral
      (`background` in `.claude/skills/store-screenshot-studio/config/screenshots.config.json`).
      The headlines are a proposal — edit
      `.claude/skills/store-screenshot-studio/config/copy.<de|en>.json`
      until they are yours.

## The new name (14 November 2026)

- [ ] Reserve the same names in the Play Console (*Einkaufsliste – ganz
      einfach* / *Shopping List – Nice & Easy* / *قائمة مشتريات التسوق
      البسيطة*). App Store Connect has them since 15 November 2026 (the
      first names were taken there).
- [ ] Optional: check the name in the German trademark register (DPMA).
- [ ] On the iPhone: the home-screen name in German, English and Arabic
      (*Einkaufsliste* / *Shopping List* / *قائمة التسوق* — new
      `InfoPlist.strings` files, added to the Xcode project by hand) and the
      camera / photo permission texts in each language.
- [ ] Re-publish the privacy pages and the share page (they now carry the new
      names; the folder is now `…/shopping-list/`). The share page's "In der
      App öffnen" now opens `shoppinglist://`; a copy published before that
      still opens `korb://`, which the apps keep taking.

## Before App Review (App Store Connect is filled in, 15 November 2026)

Done in App Store Connect: names and subtitles, promotional text,
description, keywords and support URL in German, English and Arabic;
copyright; categories (Shopping, Productivity); content rights; age rating
4+ (the 16+ override is gone); privacy policy URLs; "Data Not Collected";
price Free; all 175 countries; App Review contact and notes, no sign-in.

- [ ] **App Privacy → Publish**: one click, it confirms that "Data Not
      Collected" is accurate.
- [ ] **A new iPhone build** with the new names (`npm run release:ios`).
      Build 10 (1.0.4) on TestFlight still says "Die einfache Einkaufsliste"
      inside the app. Attach the new build on the version page and set the
      version there to the build's version.
- [ ] **Screenshots**: Media Manager → iPhone → German: remove the nine old
      ones (they show the old name and "Keine Werbung") and drag in
      `screenshots/store/iphone-6.3/de/`; English (U.S.): drag in
      `screenshots/store/iphone-6.3/en/`. Arabic falls back to them.
- [ ] Re-publish the privacy pages: the live ones still say "The Simple
      Shopping List" / "Die einfache Einkaufsliste".
- [ ] Then *Add for Review* → *Submit*. Release is set to "automatically
      after approval"; switch to manual if you want to pick the day.

## The App Review screen recording (15 November 2026)

Spartopf's recorder is in `ios/AppReviewRecorder/` now, with this app's
scenes (six, about 2–3 minutes: no sharing, no backup). They pass against the web build; **nothing
of it has run on an iPhone yet**. Its README has every step; in short:

- [ ] Once, on the iPhone (done already if Spartopf's recorder ran on it):
      Developer Mode and *Enable UI Automation*; Screen Recording in Control
      Center, microphone off; Auto-Correction and Predictive Text off. New
      for this app: its icon on the first home screen page.
- [ ] Install **1.0.5 (build 12) or later from TestFlight** — the scenes are
      written for it. An older build the run updates from TestFlight itself.
- [ ] Export a backup of your own lists (Settings › Backup): the run resets
      the app and sets it to English.
- [ ] iPhone on the cable, unlocked, Do Not Disturb on, then
      `DRY_RUN=1 npm run record:app-review`. The first run of a new recorder
      stops somewhere (a menu, the keyboard): send Claude
      the terminal's last lines, or leave `npm run record:watch` open so
      Claude can start the runs and read their output.
- [ ] When the dry run passes: `npm run record:app-review`. The video is in
      Photos; attach it in App Store Connect › App Review Information (or to
      the reply in the Resolution Center), then import your backup again.
- [ ] Google Play asks for no such video for this app (it requests no
      sensitive permission). If you want one of the Android app anyway, the
      recorder can't make it — it drives iPhones only.

## The app preview video (15 November 2026)

The video for the App Store listing is made by `npm run app-preview`
(`.claude/skills/app-preview-video/`; built like Bring!'s: a line of text,
then the app doing it). **It has only run in a Linux container so far**: both
languages pass the check, but with Linux's emoji and a film that is not
smooth enough to upload.

- [ ] Once: `brew install ffmpeg`. Then `npm run app-preview` on the Mac
      (a few minutes; close what else is running). The line after each
      language's film should say "by screencast" and 50 or more frames a
      second, and the table at the end "ok" for both files. If it says it
      films "with screenshots" or "choppily", send Claude the output.
- [ ] Look at `screenshots/store/app-preview/contact-sheet-de.png` and
      `-en.png`, play both videos, and AirDrop one to the iPhone to see it at
      its real size. The captions are in
      `.claude/skills/app-preview-video/config/copy.<de|en>.json`; after
      changing one, `npm run app-preview -- --compose`.
- [ ] Upload with the next version (a preview can only be added while the
      version is not in review): Media Manager → iPhone → German: drag
      `app-preview-de.mp4` into the app previews; English: `app-preview-en.mp4`.
      Arabic falls back to them. When Apple has processed a video, *Edit
      poster frame* and move to the time the run printed for it.
- [ ] Google Play takes a YouTube link instead of a file and wants a
      landscape video. That one is not made yet — ask Claude when you want it.

## App Store

- [ ] Fill in `APP_STORE_ID` in `src/links.ts` (App Store Connect → the app → App
      Information → Apple ID). Until then the iPhone app shows no *App
      bewerten* row.
- [ ] Publish the privacy pages and the share page: the copies in
      `../privacy-policy/shopping-list/` are older than `store/privacy/` (they lack
      *Sharing a List*, *On Android* and *Feedback and Links*), and
      `shopping-list/share/` is not there at all — shared links open a 404 until it
      is. The commands are in `docs/DEVELOPMENT.md`, *The share page*.
- [ ] Upload the new screenshot set (`screenshots/store/iphone-6.3/`) and the
      What's New text (`store/listing.md`) with the next version.
- [ ] Optional: an Arabic listing (the app speaks Arabic; the texts are not
      written yet).

## Google Play (`docs/ANDROID_RELEASE.md`)

- [ ] `npm run build:android` and run it on a phone or the emulator — **the
      Android app has never run on a device.** It compiles, and the APK's
      version, permissions and deep link were checked. To try: the status bar
      and the gesture bar (edge to edge) on Android 15 and on an older phone;
      the back gesture on every screen and sheet; adding a photo from the
      camera and the gallery; shopping mode keeping the screen on; exporting
      and importing a backup; sharing a list and opening a `shoppinglist://` link;
      *Feedback senden* and *Datenschutz*; the adaptive icon in a round and a
      squircle mask; the splash by day and at night.
- [ ] `npm run android:key` (Shoppinglist's own upload key; keep it safe).
- [ ] Create the app in the Play Console, fill in the listing, Data safety and
      App content from `store/listing.md` (section 3), upload the screenshots and the
      feature graphic, and upload the first bundle by hand.
- [ ] Give the Play service account Shoppinglist (*Release apps to testing tracks*) and
      put `PLAY_SERVICE_ACCOUNT_JSON` into `.env.release`.
- [ ] If the developer account needs it: the closed test with 12 testers for
      14 days before production.

## GitHub

- [ ] Push when you are ready (nothing here was pushed). CI then runs
      `npm run check` and builds a debug APK on every push to `main`.

## When ads come in

The store texts and the screenshots no longer promise "no ads" (15 November
2026). The release that adds them also has to change:

- [ ] Play Console: *App content › Ads* → **Yes**; the *Data safety* form.
- [ ] App Store Connect: *App Privacy* (no longer "Data Not Collected") and
      the advertising identifier (IDFA) answer in `store/listing.md` 2.8.
- [ ] The privacy pages (`store/privacy/`), which still say the app makes no
      network requests, and the "no tracking" / "no internet" lines in the
      descriptions.
- [ ] `scripts/privacy-check.mjs` and the Content-Security-Policy, which fail
      on any request to another origin.
