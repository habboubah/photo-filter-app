---
name: bildklar-full-release
description: Bildklar's whole release end to end, done by Claude — notes, checks, screenshots, preview video, both store uploads and the listings in App Store Connect and Google Play. Use for "/bildklar-full-release", "mach das Release", "release everything"; app-store-release is only the upload part.
---

# Bildklar — the full release, every step, done by Claude

Ahmad starts this with one request (`/bildklar-full-release`, „Mach das
komplette Release"). **That request is the go-ahead**: do every step below
yourself, in order, without asking for confirmation. Decide what the rules
below decide; ask only where a rule says *ask*. Show progress in short
messages (the version, the German release notes, what went up) — but keep
going. Ahmad's only clicks at the end: **Add for Review** on the App Store and
**promote** on Google Play.

The project's `CLAUDE.md`, `docs/APP_STORE_RELEASE.md` and
`docs/ANDROID_RELEASE.md` stay the reference; the repo skills
`app-store-release`, `app-store-screenshots`, `store-screenshot-studio`,
`app-preview-video` and `app-review-recording` have the details of each step —
read the one whose step fails, fix it and go on.

Ahmad's wishes in the request win over the defaults: „ohne neues Video", „nur Google Play" (→ `--android` on both release and
listing), „nur die Listings", „die Release Notes sind schon fertig".

## Where it runs

On **the Mac**, in a Claude Code session in `~/repos/photo-filter-app`
(`claude` in Terminal, or the desktop app's Code tab with this folder as a
local session). Xcode, the keys in `.env.release` and Apple's fonts for the
video are only there. In any other session (a cloud chat, a Linux shell),
don't half-run it: say in one line that it has to be started from Claude Code
on the Mac, and stop.

Long steps (screenshots, video, release) take minutes: run them with a long
timeout or in the background and wait for them to finish. Keep a task list
with the steps and tick them off.

## 0. Look first, then decide what this run is

1. `git status`: on `main`, nothing uncommitted except `Claude outputs/`.
   Uncommitted work: if it is finished and green, commit it on a branch and
   merge (as CLAUDE.md says); if it is half-done, **ask**.
2. `.env.release` has `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ANDROID_KEYSTORE_PATH`,
   `ANDROID_KEY_ALIAS`, `PLAY_SERVICE_ACCOUNT_JSON` (check the names with
   `grep -o '^[A-Z_]*=' .env.release`; never print the values); the files they
   point at exist. `xcode-select -p` and `ffmpeg -version` answer;
   `npx playwright install chromium` (quick when already installed).
3. `docs/TODO.md`: stop only for an explicit blocker („nicht veröffentlichen",
   a broken build). Unchecked phone checks are not blockers.
4. What is new since the last release:
   `git describe --tags --abbrev=0` → `vA.B.C`;
   `git log --oneline vA.B.C..HEAD --no-merges`.
   - **Commits that change the app** (anything beyond docs, README, skills,
     store texts) → a **release run**: all steps 1–9.
   - **Nothing, or only docs / store texts / screenshots** → a **listing
     run** for the current version A.B.C: skip steps 1, 3 and 7 (no new
     build), do 2, 4, 5, 8 and 9. Say so in your first message: „Seit
     vA.B.C gibt es keine App-Änderung — ich bringe nur die Store-Seiten
     (Texte, Screenshots, Video) für A.B.C auf den neuesten Stand."
5. The version of a release run: **always the patch** (A.B.C → A.B.C+1), the
   last number only, features included. Never minor or major — the script
   refuses them. `npm run release:dry` shows the version **X.Y.Z** and the iOS
   build; use exactly those.

## 1. What's New for X.Y.Z (release run)

The same notes go to both stores (Play through `npm run release`, the App
Store through `npm run store:listing`):

- `release-notes/X.Y.Z/de-DE.txt`, `en-GB.txt`, `en-US.txt` (and `ar.txt`
  once the Arabic listing exists). A folder under a newer, unreleased number
  meant for this release → rename it to X.Y.Z.
- Missing or out of date: write them from `docs/CHANGELOG.md` and the commits
  since `vA.B.C` — what users notice, one heading line and up to 6 `•`
  lines, **≤ 500 characters** per file, German first, English with the same
  meaning. Platform words (Album / Ordner, Zuletzt gelöscht / Papierkorb) stay
  neutral. Never „kostenlos/free" or a price. Never ship
  `release-notes/default/` for a release with real changes.
- Add the version's line to `store/listing.md` § 2.4.
- `npm run check:listing` passes. Post the German notes in a message
  (no waiting), commit („Release notes for X.Y.Z").

## 2. Store texts

`store/listing.md` is the single source for every store text. Change it only
when Ahmad asked or the release makes a line untrue (a feature the
description names left or arrived — then fix it and say so). Then
`npm run check:listing` and commit.

## 3. All the gates (release run)

`npm run check`. Red → fix it (it is usually a test or a lint error from the
last change) and run again; if the fix is not obvious or would change app
behaviour, stop and report — never release on red.
Native code changed since `vA.B.C` (`git diff --stat vA.B.C..HEAD -- ios
android`) → also `npm run test:ios` and `npm run test:android`.

## 4. Screenshots

```bash
npm run screenshots          # raw captures: iPhone words and Android words, de + en
npm run store-screenshots    # composed sets, feature graphic, contact sheets, validation
```

Open `screenshots/store/contact-sheet.png` and
`screenshots/store/contact-sheet-play-phone.png` with Read and check: every
slide shows the screen its headline promises, German slides are German, no
empty lists, no debug or demo banners, the Android set says *Ordner* /
*Papierkorb*, no price or „free". The validator must show no failure. A wrong
slide → fix it with `store-screenshot-studio` / `app-store-screenshots`, run
both again.

## 5. App Store preview video

```bash
npm run app-preview          # de + en, 886 × 1920, validated against Apple's spec
```

Read the validator table (no ✗) and look at
`screenshots/store/app-preview/contact-sheet-de.png` and `-en.png`. Problems
→ the `app-preview-video` skill. „Ohne neues Video" → skip, and pass
`--no-preview` in step 8.

## 6. App Review recording (only if a flow it passes through changed)

If the changes touch a screen in `ios/AppReviewRecorder/scenes.json`: update
the scenes, `npm run rehearse:app-review`. The real recording needs Ahmad's
iPhone on the cable — note it for step 9; never block the release on it.

## 7. Build and upload both apps (release run)

```bash
npm run release -- --skip-check      # step 3 just ran green; always patch, never minor
```

Bumps `package.json` + the Xcode project, builds the web app once, ships the
signed Android bundle to Play's internal track (with the notes), archives and
uploads the iPhone build, commits „Prepare release vX.Y.Z (build N)" and tags.
Note version, iOS build and Android version code. If it stops halfway, its
last lines name the command that finishes the job (e.g. `npm run
release:ios`) — fix the cause and run that, nothing else. Failures: the
`app-store-release` skill, *Common failures*.

## 8. Store listings into both consoles

```bash
npm run store:listing:dry
npm run store:listing -- --wait 30
```

In the dry run the version must be X.Y.Z (listing run: A.B.C) and each
language's What's New must come from `release-notes/<that version>/`, not
`default/`. Then the real run (`scripts/store-listing.mjs`) fills App Store
Connect (version, name, subtitle, keywords, promotional text, description,
What's New, screenshots, preview video with poster frame, App Review notes
and contact, the processed build) and Google Play (title, short and full
description, screenshots, feature graphic, icon). Unchanged files are
skipped, so running it again is safe.

- Only languages a console already has are touched. `--add-languages` (adds
  Arabic) only when Ahmad says the Arabic texts are approved.
- „Build: none … has finished processing yet" → wait and run
  `npm run store:listing -- --ios --texts-only --wait 30` again.
- A refused file or field: the message names it — fix the source (listing,
  notes, a screenshot's size, `--preview-type`) and run again. A poster
  frame the API refuses is only a warning: note the time it printed for
  Ahmad.
- The App Store version is in review or already live (the script stops with
  that message) → nothing to change there; report it and finish Google Play.

## 9. Finish

1. `git status` clean; `git log --oneline -3`. Push `main` to origin
   (`git push origin main`) — a release run pushes; a listing run pushes too.
2. A short dated section in `docs/TODO.md` with what is Ahmad's now:
   submit X.Y.Z for review, promote the Play release, the App Review recording
   if step 6 needed one, a poster frame or field the script could not set.
   Commit („Note the release steps left for X.Y.Z").
3. Tell Ahmad, in German if he wrote German, in a few lines: version, iOS
   build, Android version code (or „nur Store-Seiten"), what went up in which
   store, and what is left:
   - **App Store**: App Store Connect › Bildklar › X.Y.Z → kurz ansehen →
     **Add for Review** → **Submit to App Review**. While `UNLOCK_ON_SALE` is
     false, no in-app purchase on the version.
   - **Google Play**: Play Console › *Test and release* › the internal track
     › **Promote release** to production. The listing changes are already
     with Play's review.
4. **End every run with a colour-coded summary** (markdown, emoji as colour,
   in Ahmad's language). Use this shape, one line per item, no paragraphs:

   ```
   # 🚀 Release X.Y.Z — (release run | listing run)

   ## 🟢 Ran
   - ✅ Gates (`npm run check`) — passed
   - ✅ Screenshots + store set — 36 files valid
   - ✅ Preview videos — DE + EN valid
   - ✅ Store listings — App Store 2.0.20 · Google Play de-DE, en-GB
   - ⏭️ App Review recording — skipped (as asked)

   ## 🟢 Worked
   - 🎉 <what went up, with version, build, version code>

   ## 🟡 Did not work / needs a look
   - ⚠️ <step> — <error in one line> — <what was done about it>
   - ❌ <anything that stopped or was skipped without a reason>

   ## 🔵 What you need to do
   - 👉 <action> — <where in the console / file>

   ## 🟣 Notes
   - 💡 <decision Claude made, e.g. listing run instead of a new build>
   ```

   Rules: 🟢 is only for what is verified; a step that was skipped goes under
   🟡 or ⏭️, never ✅; a 409 or warning from a store is ⚠️ with the exact
   value to set by hand; keep each line under ~15 words.

## Never

- Never release on a red check, from a branch other than `main`, or with
  unfinished work mixed in.
- Never print or commit `.env.release`, the `.p8`, the keystore or the
  service-account JSON.
- Never submit for review or promote to production. Push only as step 9 says.
- Never add the Arabic listing or the in-app purchase on your own.
