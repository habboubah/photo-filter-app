---
name: app-review-recording
description: Rehearse, run or change the automated App Review screen recording of Shoppinglist (an iPhone UI test that plays ios/AppReviewRecorder/scenes.json while iOS records the screen; npm run rehearse:app-review, npm run record:app-review). Use when asked for the screen recording or video for App Review, after a Guideline 2.1 "Information Needed" request, when a recording run stops on the iPhone, or when a screen, label or flow the recording passes through has changed.
---

# App Review recording

App Review (Guideline 2.1, "Information Needed") asks for a screen recording
"captured on a physical device", starting with launching the app and showing
the typical flow. Shoppinglist is a React + Capacitor app in a WKWebView, so
it uses Spartopf's recorder (`../budget-app/ios/AppReviewRecorder`, copied on
15 November 2026): a scene file played by an iPhone UI test while iOS records
the screen, and the same scene file rehearsed against the web build first.

| File | What it is |
|---|---|
| `ios/AppReviewRecorder/scenes.json` | The recording, one step per line — this app's only file |
| `ios/AppReviewRecorder/README.md` | The guide for Ahmad: once, every recording, when it stops, the step keys, what the video leaves out |
| `ios/AppReviewRecorder/RecorderUITests/` | `SceneRunner.swift` and the test — the same as budget-app's, apart from `app.iconName` taking a list |
| `scripts/rehearse-app-review.mjs` | Plays the scenes in Chromium (`npm run rehearse:app-review`) |
| `scripts/record-app-review.sh`, `scripts/record-watch.sh` | The iPhone run (`npm run record:app-review`), and the watcher that lets Claude start runs |

## Ground rules

- **A real iPhone.** Apple asked for a physical device. Never present a
  Simulator or a browser recording as one.
- **No real data on film.** Every full run resets the app first (Settings ›
  Language › English, Appearance › Automatic, Reset app — `preflight.reset`,
  not in the video). Ahmad exports a backup of his own lists before and
  imports it afterwards.
- **The submitted build.** The UI test drives the installed TestFlight app by
  bundle id (`com.habboubah.korb`); it never installs a build. An iPhone
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

1. `npm run rehearse:app-review` (about 3 minutes). It fails at the first
   step whose label changed and prints what is on screen; fix `scenes.json`
   until it passes. It ends with the preflight reset, from a filled app and
   from an empty one. `SNAP=1` prints the ARIA tree at the end — role and
   name are what the iPhone sees too. In a Linux container use a Playwright
   whose Chromium is installed (`REHEARSAL_PLAYWRIGHT`), keep the repo's
   `.gitignore` next to the copy (without it Tailwind watches the
   rehearsal's browser profile in `build/` and the page never settles), and
   expect emoji as boxes.
2. Give Ahmad the README's *Every recording* list: backup, the build from
   TestFlight (the scenes are written for `app.minVersion`), cable, unlocked,
   Do Not Disturb, `DRY_RUN=1 npm run record:app-review`, then
   `npm run record:app-review`.
3. With `npm run record:watch` open on the Mac, start a run by writing its
   settings (`DRY_RUN=1`, `FROM=n`, `TO=n`, `PACE=x`) to
   `build/record-request`; read `build/record-last.log` and
   `build/record-status` ("running" / "done <exit code>" — go by the file's
   time, a Ctrl-C leaves "running" behind).
4. When the iPhone run stops: the terminal names scene, step and what was
   missing; the `.xcresult` in `build/` has the screenshot (and, for a failed
   run, a video: the largest file in its `Data/` is a plain MP4). A label →
   fix `scenes.json`; system UI or WebKit → fix `SceneRunner.swift`, and
   make the same fix in `../budget-app`; retry with `FROM=n DRY_RUN=1`.
5. Afterwards the video goes into App Store Connect › App Review Information
   › Attachment, and the notes answer Apple's questions (`store/listing.md`,
   2.5). Resubmit only when Ahmad says so.

## What the recording shows

**Since 15 November 2026 the short one:** six scenes, about 2–3 minutes
(the first version ran 6), a first shopping trip in English with only what a
user needs: launch and the first list (three suggestions, "2 kg apples",
"Milk 3x") · a note on an item, the bin → Undo · ticking off into the bag,
the basket · shopping mode to *All in the basket!* · a list of your own with
a suggestion · settings (Deutsch and back, dark and automatic, a list type
of your own). Ahmad took out **sharing** (*Share list*, *Paste shared list*)
and the **backup** (export and import) — don't put them back unasked. The
README's last section lists what is left out; sharing and the photo are
described in the Review Notes.

Keep it short: a new feature gets a step only when a new user can't do
without it on a first shopping trip, and when a step goes in, another one
comes out. Rough length: about 2.5 s per action on the iPhone plus the
pauses × `PACE` (0.65) — 53 actions and 61 s of pauses ≈ 2:55.

## Writing steps for this app

- Labels are the app's **English** strings, written out (`src/translations.ts`,
  the `en` block). Match exact, then prefix, then contains; use the shortest
  unique prefix and avoid commas ("Open Supermarket", not "Open Supermarket,
  Empty").
- **Suggestion chips** are buttons with `role="listitem"`: give their taps
  the chip's text as a second label — `{"tap": ["Add “Bananas”", "Bananas"]}`
  — and only tap chips of things that are not on the list yet.
- **Adding by typing**: `fill` the field ("Add an item"), then tap the pill's
  own button, named after what was typed without its quantity
  (`{"tap": "Add “apples”", "role": "button"}` for "2 kg apples"). Write the
  text the way the iPhone would capitalise it ("Milk 3x").
- Sheets are `aria-modal`: while one is open only it can be reached. Their
  close button is *Done* or *Cancel*; a confirmation's button has the row's
  name (*Reset app* twice).
- `<select>` rows (Language, Appearance) open a system menu → `select`. The
  label of the row changes with the language: `"in": "Sprache"` after
  switching to Deutsch.
- The emoji of a picture and the colour names (`berry`, `tomato` …) are
  labels too; keep emoji taps `soft`.
- Counts matter: scene 4 taps *Into the basket* once per open item (three:
  Tomatoes, apples, Milk), with one optional tap more. After adding or
  removing an item in scenes 1–3, recount.
- Only the first six suggestions show as chips (`SUGGESTION_LIMIT`); in the
  Supermarket list they start with produce (Apples, Cucumber, Carrots …).
- Toasts with *Undo* stay 5 seconds: tap Undo within two short pauses.
- Nothing may depend on the iPhone's language except `app.iconName` (the
  name under the icon: *Shopping List*, *Einkaufsliste*, *قائمة التسوق*),
  `preflight` (labels in all three languages) and `system`.

## Not yet tried on an iPhone (15 November 2026)

The scenes pass the rehearsal; the first iPhone run will need a round of
fixes — say so, and start with `DRY_RUN=1`. The likeliest stops: a chip not
found by either label, a tap behind the keyboard after typing into the add
field, a select menu in the settings. When it has passed,
replace this section with the date and the build it passed on.
