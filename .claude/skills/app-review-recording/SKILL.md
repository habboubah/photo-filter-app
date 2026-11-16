---
name: app-review-recording
description: Rehearse, run or change the automated App Review screen recording of Bildklar (an iPhone UI test that plays ios/AppReviewRecorder/scenes.json while iOS records the screen; npm run rehearse:app-review, npm run record:app-review). Use when asked for the screen recording or video for App Review, after a Guideline 2.1 "Information Needed" request, when a recording run stops on the iPhone, or when a screen, label or flow the recording passes through has changed.
---

# App Review recording

App Review (Guideline 2.1, "Information Needed") asks for a screen recording
"captured on a physical device", starting with launching the app and showing
the typical flow. Bildklar is a React + Capacitor app in a WKWebView, so
it uses the shopping list's recorder (originally Spartopf's,
`../budget-app/ios/AppReviewRecorder`; copied on 16 November 2026): a scene file played by an iPhone UI test while iOS records
the screen, and the same scene file rehearsed against the web build first.

| File | What it is |
|---|---|
| `ios/AppReviewRecorder/scenes.json` | The recording, one step per line — this app's only file |
| `ios/AppReviewRecorder/README.md` | The guide for Ahmad: once, every recording, when it stops, the step keys, what the video leaves out |
| `ios/AppReviewRecorder/RecorderUITests/` | `SceneRunner.swift` and the test — the same as the shopping list's |
| `scripts/rehearse-app-review.mjs` | Plays the scenes in Chromium (`npm run rehearse:app-review`) |
| `scripts/record-app-review.sh`, `scripts/record-watch.sh` | The iPhone run (`npm run record:app-review`), and the watcher that lets Claude start runs |

## Ground rules

- **A real iPhone.** Apple asked for a physical device. Never present a
  Simulator or a browser recording as one.
- **No real photos on film.** Bildklar shows the photo library, so the iPhone
  gives it **Limited Access to the demo photos only** (README, *Preparation*).
  Every full run resets Bildklar's decisions first (Settings › Language ›
  English, Appearance › Like the system, *Reset my decisions* —
  `preflight.reset`, not in the video).
- **The run changes the photo library for real**: scene 2 makes an album
  *Paris, …*, scene 4 deletes two photos (Recently Deleted) — the dry run too.
  Afterwards Ahmad deletes the album and recovers the two photos.
- **The unlock is owned** (bought once in TestFlight, free there): scene 2
  makes the album without the paywall. The paywall is shown to review by the
  in-app purchase screenshot (`screenshots/en/09-paywall.png`). In the
  rehearsal the paywall appears and *Restore purchases* unlocks it.
- **The submitted build.** The UI test drives the installed TestFlight app by
  bundle id (`com.habboubah.bildklar`); it never installs a build. An iPhone
  build older than `app.minVersion` is updated through TestFlight by a
  separate test, before anything is reset or filmed.
- **Where it runs.** Writing and rehearsing work anywhere; the iPhone run
  needs the Mac with Xcode and the iPhone on the cable. A cloud session
  can't run it: Ahmad runs one npm command, or leaves `npm run record:watch`
  open.
- **Submitting for review** only with Ahmad's explicit go.

## Run it

Before editing, `git status` and `git log -5`: other sessions work in the
same folder.

1. `npm run rehearse:app-review` (about 2 minutes). It fails at the first
   step whose label changed and prints what is on screen; fix `scenes.json`
   until it passes. It ends with the preflight reset. The rehearsal plays
   the demo library (`scenes.json` › `rehearsal.localStorage`). `SNAP=1` prints the ARIA tree at the end — role and
   name are what the iPhone sees too. In a Linux container use a Playwright
   whose Chromium is installed (`REHEARSAL_PLAYWRIGHT`), keep the repo's
   `.gitignore` next to the copy (without it Tailwind watches the
   rehearsal's browser profile in `build/` and the page never settles), and
   expect emoji as boxes.
2. Give Ahmad the README's *Preparation* (once) and *Every recording* list:
   the demo photos with Limited Access, the unlock, the build from
   TestFlight (the scenes are written for `app.minVersion`), cable, unlocked,
   Do Not Disturb, `DRY_RUN=1 npm run record:app-review`, then
   `npm run record:app-review`, and tidying up after each run.
3. With `npm run record:watch` open on the Mac, start a run by writing its
   settings (`DRY_RUN=1`, `FROM=n`, `TO=n`, `PACE=x`) to
   `build/record-request`; read `build/record-last.log` and
   `build/record-status` ("running" / "done <exit code>" — go by the file's
   time, a Ctrl-C leaves "running" behind).
4. When the iPhone run stops: the terminal names scene, step and what was
   missing; the `.xcresult` in `build/` has the screenshot (and, for a failed
   run, a video: the largest file in its `Data/` is a plain MP4). A label →
   fix `scenes.json` (or the trip's name, if Ahmad's demo photos name it
   differently); system UI or WebKit → fix `SceneRunner.swift`, and make the
   same fix in the shopping list and `../budget-app`; retry with `FROM=n DRY_RUN=1`.
5. Afterwards the video goes into App Store Connect › App Review Information
   › Attachment, and the notes answer Apple's questions (`store/listing.md`,
   2.5). Resubmit only when Ahmad says so.

## What the recording shows

Five scenes, about 2 minutes, in English: launch and the scan (the photo
permission if iOS asks: *Limit Access…*) · Paris → *Create album* → the
confirmation → *Album made on …* · a group of near-identical photos, the best
one, picking another · *Clean up* › *Go through all*: delete, keep, delete,
*Finish*, *Delete 2 photos* and iOS's own *Delete* · the settings down to
*Privacy*. The README's last section lists what is left out; the Review Notes
(`store/listing.md`, 2.5) describe the rest — the paywall, Recently Deleted,
Limited Access.

Keep it short: a feature gets a step only when a reviewer can't judge the app
without it, and when a step goes in, another one comes out. Rough length:
about 2.5 s per action on the iPhone plus the pauses × `PACE` (0.65).

## Writing steps for this app

- Labels are the app's **English** strings, written out (`src/translations.ts`,
  the `en` block). Match exact, then prefix, then contains; use the shortest
  unique prefix and avoid commas ("Open Paris", not "Open Paris, May 2026").
- A trip card's label is *Open {title}*; the title comes from the photos
  (place and month), so it depends on the demo photos on the iPhone.
- Sheets and confirmations are `aria-modal`: while one is open only it can be
  reached. A confirmation's button has the action's name (*Create album*,
  *Reset my decisions* twice).
- `<select>` rows (Language, Appearance) open a system menu → `select`. The
  label of the row changes with the language: `"in": "Sprache"` in German.
- iOS's alerts (the photo permission, *Delete*, the App Store's *Sign In*)
  are `systemAlert` steps with the button in English and German; keep the
  permission one inside `optional` (iOS asks once per install).
- Paywall steps sit inside `optional`, starting with `{"see": "Unlock
  Bildklar", "timeout": 3}`: on the iPhone the unlock is owned and they are
  skipped; in the rehearsal they run.
- Nothing may depend on the iPhone's language except `app.iconName`
  (*Bildklar* in every language), `preflight` (labels in English and German)
  and `system`.

## Not yet tried on an iPhone (16 November 2026)

The scenes pass the rehearsal against the drawn demo library; the first
iPhone run, with real demo photos, will need a round of fixes — say so, and
start with `DRY_RUN=1`. The likeliest stops: the trip's name (*Open Paris*),
the scan's timeout in scene 1, the delete alert's button. When it has passed,
replace this section with the date and the build it passed on.
