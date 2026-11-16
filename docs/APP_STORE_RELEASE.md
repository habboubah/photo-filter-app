# Publishing Fotonest on the App Store – step by step

Fotonest ships exactly like Spartopf (budget-app) and Fahrtwerk
(pizza-driver-log): **one command** builds the iOS app and uploads it straight
to App Store Connect, where it lands in TestFlight. The parts Apple only allows in the browser – creating the app,
texts, screenshots, "Submit for Review" – you do by hand once. This file walks
through all of it.

> Work on the Mac, in `~/repos/photo-filter-app`. Steps 1–9 are for the **first**
> release only. For later updates, see step 10.
> App Store Connect labels are given in English with the German name in
> [brackets], in case your account shows German.
>
> Google Play is [ANDROID_RELEASE.md](ANDROID_RELEASE.md); what is still open
> for either store is in [TODO.md](TODO.md).

**Overview**

| # | Step | Where | Time |
|---|---|---|---|
| 1 | Check prerequisites | Mac | 5 min |
| 2 | Reuse the API key from Fahrtwerk | Terminal | 2 min |
| 3 | Open the project once in Xcode (signing) | Xcode | 5 min |
| 4 | Create the app in App Store Connect | Browser | 5 min |
| 5 | Publish the privacy policy | Terminal | 5 min |
| 6 | Upload the first build | Terminal | 10 min |
| 7 | Test on your iPhone with TestFlight | iPhone | 10 min |
| 8 | Fill in the store listing + screenshots | Browser | 30 min |
| 9 | Submit for review | Browser | 2 min (+ 1–2 days Apple) |
| 10 | Later updates | Terminal + browser | 5 min |

---

## 1. Prerequisites

You have most of this already, because that's how Fahrtwerk gets to TestFlight:

- [ ] **Apple Developer Program** (99 €/year) – the same account as Fahrtwerk,
      team **Ahmad Habboubah (HZVBBHBAJN)**.
- [ ] **Xcode** from the Mac App Store, opened once (licence accepted).
      Check: `xcodebuild -version`
- [ ] Signed in to Xcode: *Xcode → Settings → Accounts* shows your Apple ID.
- [ ] Dependencies installed:

```bash
cd ~/repos/photo-filter-app
npm install
npm run lint && npm test      # must be green
```

## 2. Reuse the API key

The App Store Connect API key belongs to your whole team, not to one app, so the
key that uploads Fahrtwerk uploads Fotonest too.

```bash
cd ~/repos/photo-filter-app
cp ../pizza-driver-log/.env.release .env.release
```

Check that the key file is there (its name contains your `ASC_KEY_ID`):

```bash
ls ~/.appstoreconnect/private_keys/
```

If you see `AuthKey_XXXXXXXXXX.p8`, you're set. `.env.release` and the `.p8`
are git-ignored – they never get committed.

<details>
<summary>If you can't find a key</summary>

1. https://appstoreconnect.apple.com → *Users and Access* [Benutzer und Zugriff]
   → *Integrations* → *App Store Connect API* → *Team Keys* → **+**
2. Name "Release", access **App Manager** (or Admin) → *Generate*.
3. **Download** it (only possible once!) and move it into place:
   `mkdir -p ~/.appstoreconnect/private_keys && mv ~/Downloads/AuthKey_*.p8 ~/.appstoreconnect/private_keys/`
4. `cp .env.release.example .env.release` and fill in `ASC_KEY_ID` (Key ID) and
   `ASC_ISSUER_ID` (Issuer ID, shown at the top of the same page).
</details>

## 3. Open the project once in Xcode

The first time, Xcode downloads the Swift packages. It registers the bundle id
`com.habboubah.fotonest` for your team **only when you build for a real iPhone**
(point 3 below) — a build for the Simulator registers nothing, and then App
Store Connect has no bundle id to offer in step 4.

```bash
npm run build:ios
```

In Xcode:
1. Left sidebar: **App** (blue icon) → target **App** → tab **Signing & Capabilities**.
2. ✅ *Automatically manage signing*, Team: **Ahmad Habboubah (HZVBBHBAJN)**
   (already set). There must be no red error.
3. **Plug in your iPhone, pick it as the destination at the top, press ▶** –
   Fotonest runs on your phone and the bundle id is registered. (Without an
   iPhone at hand: register it by hand, see *Bundle ID missing* below step 4.)
4. Quit Xcode.

## 4. Create the app in App Store Connect

https://appstoreconnect.apple.com → **Apps** → **+** → **New App** [Neue App]

| Field | Value |
|---|---|
| Platforms | ✅ iOS |
| Name | `Fotonest – Fotos aufräumen` (the English name: `store/listing.md`). Taken? See Troubleshooting. |
| Primary language | German [Deutsch] |
| Bundle ID | `com.habboubah.fotonest` (pick it from the menu; missing → see below) |
| SKU | `fotonest-001` |
| User access | Full access |

<details>
<summary>Bundle ID missing from the menu</summary>

The menu lists only the App IDs registered in the developer account, and
Xcode registers one only for a build on a real iPhone. Register it by hand:

1. https://developer.apple.com/account/resources/identifiers/list (top right:
   the team **Ahmad Habboubah**, the same as in App Store Connect).
2. **+** next to *Identifiers* → **App IDs** → Continue → **App** → Continue.
3. Description `Fotonest`, Bundle ID **Explicit** `com.habboubah.fotonest`.
   Capabilities: none to tick (In-App Purchase is always on). Continue → **Register**.
4. Close the *New App* dialog in App Store Connect, reload the page, open it
   again: the bundle id is in the menu (sometimes after a few minutes).
</details>

→ **Create**.

## 5. Publish the privacy policy

Apple requires a privacy policy URL. The pages (English + German) are ready in
`store/privacy/` and go into your `privacy-policy` repo, next to Fahrtwerk's:

```bash
cd ~/repos/privacy-policy
mkdir -p fotonest
cp -R ../photo-filter-app/store/privacy/. fotonest/
```

Add this line to `index.html`, under the Pizza Driver Log entry:

```html
  <li><a href="fotonest/">Fotonest – Fotos aufräumen</a></li>
```

and this to `README.md`:

```markdown
- Fotonest – Fotos aufräumen / Fotonest – Photo Cleanup (code name fotonest)
  - English: https://habboubah.github.io/privacy-policy/fotonest/
  - Deutsch: https://habboubah.github.io/privacy-policy/fotonest/de/
```

```bash
git add fotonest index.html README.md
git commit -m "Add the privacy policy for Fotonest"
git push
```

After a minute or two, check https://habboubah.github.io/privacy-policy/fotonest/de/

## 6. Upload the first build

```bash
cd ~/repos/photo-filter-app
npm run release:dry -- --ios major   # shows only: version 0.1.0 -> 1.0.0, build 1 -> 2
npm run release:first                 # builds and uploads 1.0.0 (build 2)
```

The repository is on **0.1.0** while nothing is in a store; `release:first`
takes it to **1.0.0** for the first upload (`release.js --ios major`). The command:
1. runs `npm run check`,
2. sets the version to 1.0.0 and raises the build number,
3. builds the web app and syncs it into the iOS project,
4. archives with `xcodebuild` and uploads to App Store Connect,
5. commits "Prepare release v1.0.0 (build 2)" and tags `v1.0.0`.

It ends with `Done: Fotonest v1.0.0 (build 2) uploaded to App Store Connect.`
Apple then needs 5–30 minutes to process it (you get an email).

An error? → see [Troubleshooting](#troubleshooting) below.

## 7. Test on your iPhone with TestFlight

1. App Store Connect → **Fotonest** → **TestFlight** tab.
2. Under *Internal Testing* [Interne Tests] → **+** → group "Me" → add yourself.
3. On the iPhone, install the **TestFlight** app, open it with the same Apple ID
   → **Fotonest** → *Install*.
4. Try everything once: the permission dialog (try *Limit Access…* once,
   then *Allow Full Access*), the scan, a trip and its album, a similar group,
   the blurry list, a review that deletes (check Photos › Recently Deleted),
   the paywall with a sandbox account (step 8g), Restore Purchases.

TestFlight builds are release builds: **the dry run is off there** — deleting
really moves photos to Recently Deleted. Debug builds from Xcode run dry until
you switch it off (Einstellungen › Nur in der Debug-Version › Probelauf).

You won't be asked about encryption (export compliance): the app already
answers it (`ITSAppUsesNonExemptEncryption = NO`).

## 8. Fill in the store listing

Every text to copy is in **`store/listing.md`** (German and English,
checked against Apple's character limits; section 2 is the App Store).

### 8a. Make the screenshots

```bash
npx playwright install chromium      # once per Mac
npm run screenshots                  # raw app captures and their marks → screenshots/de, screenshots/en
npm run store-screenshots            # composed, captioned set → screenshots/store/iphone-6.3/
```

Upload `screenshots/store/iphone-6.3/de/` and `…/en/`: 9 images each at
**1206 × 2622**, the size of the required *iPhone with Dynamic Island (medium
display)* slot (6.1″/6.3″) – scan · home and the clean-up card · trips · a
trip · album made · a similar group · blurry photos · the review · the
paywall. Swap the drawn demo photos for licensed ones first (docs/TODO.md).
**No "free" ribbon or price words**: the unlock costs money. Look at
`screenshots/store/contact-sheet.png` first. The raw captures (1290 × 2796)
don't fit that slot. The headlines are in
`.claude/skills/store-screenshot-studio/config/copy.<de|en>.json`.

### 8b. Version 1.0 (German)

App Store Connect → Fotonest → left: **iOS App 1.0 – Prepare for Submission**
[Vorbereitung für Einreichung]:

- [ ] **Screenshots** → *iPhone with Dynamic Island (medium display)* → drag in the 9 images from `screenshots/store/iphone-6.3/de/`.
- [ ] **Promotional Text** [Werbetext], **Description** [Beschreibung],
      **Keywords** → from `store/listing.md` (DE).
- [ ] **Support URL** → `https://habboubah.github.io/privacy-policy/fotonest/de/`
- [ ] **Copyright** → `2026 Ahmad Habboubah`
- [ ] **Build** → *Add Build* → pick 1.0.0 (2) (visible after step 6 finished processing).
- [ ] **App Review Information** [App-Prüfungsinformationen] → Sign-in required:
      **No**, your contact details, the note from `store/listing.md` (it explains
      the paywall, the dry run of debug builds and where deleted photos go), and
      the App Review screen recording (`npm run record:app-review`).
- [ ] **In-App Purchases** [In-App-Käufe] → *+* → pick **Fotonest freischalten**
      (made in step 8g) — the first purchase must be submitted with the version.
- [ ] **Version Release** → *Automatically release this version* (or manually).

### 8c. Add English (optional, recommended)

Language menu at the top right (*German*) → add **English (U.K.)** → fill the same
fields with the English texts and the images from `screenshots/store/iphone-6.3/en/`.

### 8d. App Information (left menu) [App-Informationen]

- [ ] **Subtitle** [Untertitel]: from `store/listing.md` (`Reisen als Alben, ohne Doppelte`)
- [ ] **Category**: primary **Photo & Video**, secondary **Utilities**
- [ ] **Age Rating** [Altersfreigabe] → *Edit* → "None" / "No" everywhere → **4+**
- [ ] **Privacy Policy URL**: `https://habboubah.github.io/privacy-policy/fotonest/de/`

### 8e. App Privacy (left menu) [App-Datenschutz]

*Get Started* → "Do you or your third-party partners collect data from this app?"
→ **No, we do not collect data from this app** → *Publish*.
(True: Fotonest has no server, no analytics and no tracking; photos never
leave the device. The purchase goes through Apple's StoreKit, which Apple
does not count as the app collecting data.)

### 8f. Pricing and Availability [Preise und Verfügbarkeit]

- [ ] Price: **Free (0.00 €)** — the app is free to download; the unlock is an in-app purchase (8g)
- [ ] Availability: all countries (or just Germany / Austria / Switzerland)

### 8g. The in-app purchase [In-App-Käufe]

Left menu → *Monetization* › **In-App Purchases** → *+*:

| Field | Value |
|---|---|
| Type | **Non-Consumable** [Nicht-Verbrauchsartikel] |
| Reference Name | `Fotonest Unlock` |
| Product ID | `com.habboubah.fotonest.unlock` (must match `PRODUCT_ID` in `src/native/purchases.ts`) |
| Price | **4,99 €** (tier picker; the same as on Google Play) |
| Family Sharing | on (one purchase for the family — parents share phones) |
| Display name / description (DE) | `Fotonest freischalten` / `Alben für Reisen und Aufräumen – einmal zahlen, kein Abo.` |
| Display name / description (EN) | `Unlock Fotonest` / `Albums for trips and clean-up – pay once, no subscription.` |
| Review screenshot | `screenshots/de/09-paywall.png` |

Then *Users and Access* › **Sandbox** › *Test Accounts* → **+** → a sandbox
Apple Account (a new e-mail address). On the iPhone: Settings › App Store ›
*Sandbox Account* → sign in. Buy the unlock once in the TestFlight build — the
App Review recording restores that purchase (ios/AppReviewRecorder/README.md).

## 9. Submit for review

Back on **iOS App 1.0** → top right **Add for Review** [Zur Prüfung hinzufügen]
→ **Submit to App Review** [An App-Prüfung senden].

Apple usually reviews within 24–48 hours and emails you the status. At
*Ready for Distribution* [Bereit zum Verkauf], Fotonest is on the App Store. 🎉

If Apple rejects it: read the message in the *Resolution Center*, fix the code,
run `npm run release:ios -- --keep-version` (same version, new build), pick the
new build in the version and submit again.

If Apple asks for a screen recording (Guideline 2.1, "Information Needed" —
Spartopf got that request): the recorder in `ios/AppReviewRecorder/` films
one on your iPhone, from the TestFlight build. Its
[README](../ios/AppReviewRecorder/README.md) has the steps; in short
`npm run rehearse:app-review`, `DRY_RUN=1 npm run record:app-review`, then
`npm run record:app-review`. Attach the video under *App Review Information*
or to your reply, and answer Apple's questions in the notes.

## 10. Later updates

```bash
cd ~/repos/photo-filter-app
git status                       # everything committed?
npm run release                  # bug fix:     1.0.0 -> 1.0.1, App Store and Google Play
npm run release -- minor         # new feature: 1.0.x -> 1.1.0
npm run release:ios              # the App Store only
```

`npm run release` ships **both stores on the same version** (Google Play:
[ANDROID_RELEASE.md](ANDROID_RELEASE.md)); until the Play app exists, use
`npm run release:ios`. After `npm run release:ios` alone,
`npm run release:android` puts that same version on Google Play. Every release
first runs `npm run check` (lint, tests, the privacy check, the contrast
audit) and stops if anything fails.

Then in App Store Connect:
1. Left, **+** next to *iOS App* → **New Version**, e.g. `1.0.1` (same as the terminal showed).
2. Fill in **What's New** [Neue Funktionen] – examples in `store/listing.md`.
3. Pick the **Build** → **Add for Review** → submit.

Only redo screenshots/texts when something visible changed
(`npm run screenshots && npm run store-screenshots`).

You can also just tell Claude in this project "upload Fotonest to the App Store" –
the skill `.claude/skills/app-store-release` knows these steps.

---

## Troubleshooting

| Message | Fix |
|---|---|
| `ASC_KEY_ID / ASC_ISSUER_ID not set` | Step 2 – `.env.release` is missing. |
| `App Store Connect API key not found at …` | The `.p8` file isn't in `~/.appstoreconnect/private_keys/`. |
| `No suitable application records were found` | Step 4 – the app doesn't exist in App Store Connect yet. |
| `No profiles for 'com.habboubah.fotonest' were found` / signing errors | Redo step 3; the API key needs the *App Manager* or *Admin* role. |
| `The bundle version must be higher than the previously uploaded version` | The script starts from the highest build App Store Connect, the `v*` tags and the project know, so this shouldn't come back. If it does, run `npm run release:dry` to see the numbers and run the release again. |
| `Missing package product 'CapApp-SPM'` or similar | Open the project once in Xcode (step 3), or `xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj`. |
| `xcode-select: error: tool 'xcodebuild' requires Xcode` | Install Xcode in `/Applications`, or `sudo xcode-select -s /Applications/Xcode.app`. |
| `npm run screenshots`: *Executable doesn't exist* | `npx playwright install chromium` |
| The name is taken | Nobody has checked "Fotonest" in App Store Connect yet: try it in step 4 first. Taken → pick another and change `appName`/`storeName` in `src/translations.ts`, `store/listing.md` and the privacy pages (the bundle id can stay). |

## Where things live

| File | Purpose |
|---|---|
| `scripts/release.js` | One version for both stores: check, bump, build, upload (`--ios`: the App Store only), commit |
| `scripts/release-android.js` | Its Android half: the signed bundle and the upload to Google Play |
| `ios/App/ExportOptions.plist` | Tells `xcodebuild` to upload straight to App Store Connect |
| `.env.release` (not in git) | `ASC_KEY_ID`, `ASC_ISSUER_ID` |
| `scripts/screenshots.mjs` | Raw screenshots (DE + EN); `npm run store-screenshots` frames them |
| `ios/AppReviewRecorder/` | Records the screen video App Review asks for (Guideline 2.1) |
| `store/listing.md` | All store texts, ready to copy (App Store and Google Play) |
| `store/privacy/` | Privacy policy (EN + DE) for GitHub Pages |
| `.claude/skills/app-store-release/` | Skill so Claude can run the release for you |
