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
- **No real photos on film.** The iPhone holds **only the test photos**
  (`test-photos/`, `npm run test-photos`: 563 CC0 photos and videos) while
  recording, and the app gets **Full Access** on film (README,
  *Preparation*: Ahmad takes his own photos off first — with iCloud Photos on,
  by turning it off with *Remove from iPhone*, never by deleting).
- **A fresh install every full run** (Ahmad, 20 November 2026): the script
  deletes the app (`xcrun devicectl device uninstall app`; the test deletes it
  on the home screen if that fails) and `testInstallFromTestFlight` taps
  *Install* in TestFlight's row. The recording test then runs with
  `RECORDER_FRESH=1` (no preflight launch), and `launch` opens the app with
  `app.launchArguments` (`-AppleLanguages (en)`) so the first run is English
  whatever the iPhone's language. `REINSTALL=0` skips all that.
- **The run changes the photo library for real**: scene 4 deletes four photos
  (Recently Deleted) — the dry run too.
- **Nothing is for sale** (`UNLOCK_ON_SALE` false): no paywall, no album tapped.
- **The submitted build.** TestFlight installs the newest build this tester
  has; if it is older than `app.minVersion` the script stops.
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
   until it passes. It starts like a fresh install (empty
   `rehearsal.localStorage`) and plays the **test library**
   (`rehearsal.library: "test"`, the web copy in
   `src/native/demo/test-library/` from `npm run demo-library`, gitignored —
   copy it along to a container), so trip names and groups match the phone;
   the web's first scan is instant, so *Found so far* is a soft step. `SNAP=1` prints the ARIA tree at the end — role and
   name are what the iPhone sees too. In a Linux container use a Playwright
   whose Chromium is installed (`REHEARSAL_PLAYWRIGHT`), keep the repo's
   `.gitignore` next to the copy (without it Tailwind watches the
   rehearsal's browser profile in `build/` and the page never settles), and
   expect emoji as boxes.
2. Give Ahmad the README's *Preparation* (once) and *Every recording* list:
   only the test photos on the iPhone, TestFlight signed in, cable, unlocked,
   Do Not Disturb, `DRY_RUN=1 npm run record:app-review`, then
   `npm run record:app-review`, and tidying up after each run.
3. With `npm run record:watch` open on the Mac, start a run by writing its
   settings (`DRY_RUN=1`, `REINSTALL=0`, `FROM=n`, `TO=n`, `PACE=x`) to
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

Five scenes from a fresh install, in English (README's table): the home
screen and the welcome, *Allow access to photos* → iOS's *Allow Full Access*
· the first scan, the reveal, *Compare your first group*, *Mark the rest* →
*Done – nothing deleted* · *Paris* on *Organise* · *Clean up now* › *Go through
all*: mark, keep, mark, *Finish*; *Marked for deletion* › *Delete all* › *Three
safety nets* › *Delete 4 photos* and iOS's own *Delete* · the settings down to
*Privacy*. The README's last section lists what is left out; the Review Notes
(`store/listing.md`, 2.5) describe the rest.

Keep it short: a feature gets a step only when a reviewer can't judge the app
without it, and when a step goes in, another one comes out. Rough length:
about 2.5 s per action on the iPhone plus the pauses × `PACE` (0.65), plus
the first scan of 563 files.

## Writing steps for this app

- Labels are the app's **English** strings, written out (`src/translations.ts`,
  the `en` block). Match exact, then prefix, then contains; use the shortest
  unique prefix and avoid commas ("Open Paris", not "Open Paris, May 2026").
- A trip card's label is *Open {title}*; the title comes from the photos
  (place and month): the test photos make *Paris*.
- The bin's count carries over: the first group's *Mark the rest* (2) plus
  the review's two make *Delete 4 photos*; recheck it when a scene changes.
- Sheets and confirmations are `aria-modal`: while one is open only it can be
  reached. A confirmation's button has the action's name (*Create album*,
  *Start over* twice).
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
  and `system` (TestFlight's *Install*, the home screen's *Remove App* /
  *Delete App*, the photo dialog).

## Status (20 November 2026)

The fresh-install scenes pass the rehearsal against the test library. The
old scenes' dry run on the iPhone (13:40, with Ahmad's own photos) stopped at
*Open Paris* — expected, his library had no Paris. The fresh-install path
(delete, TestFlight *Install*, `-AppleLanguages`, *Allow Full Access*) has
not run on the iPhone yet: expect a round of fixes, start with `DRY_RUN=1`.
When it has passed, replace this section with the date and the build.
