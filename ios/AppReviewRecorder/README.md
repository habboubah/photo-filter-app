# App Review recorder

Records the screen recording App Review asks for (Guideline 2.1: "captured
on a physical device … beginning with launching the app"): a UI test taps
through Bildklar installed on your iPhone while iOS records the screen. About
2 minutes; the video ends up in Photos (a video, so Bildklar itself ignores it).

It is Spartopf's recorder (`../budget-app/ios/AppReviewRecorder`, first
copied via the shopping list on 16 November 2026): the runner, the test and
the scripts are kept in step with Spartopf's (checked 19 November 2026 —
the same reset before every recording, update from TestFlight, stop when the
app leaves the screen, `record:watch`). Only what names the app differs:
`scenes.json`, the bundle ids in `make-project.rb`, the demo library in the
rehearsal, and `app.iconName` may list one name per iPhone language.
Bildklar's recording is the **typical flow** (Ahmad, 19 November 2026), not a
tour of every feature, and it starts **from a fresh install** (Ahmad, 20
November 2026): before every full run the script deletes Bildklar from the
iPhone and installs it again from TestFlight, because only an install's first
launch shows the welcome, the photo access and the first scan. Nine scenes,
about 4½ minutes (Ahmad, 20 November 2026: more of the app, the focus on what
*Clean up* does, and Search; up to 5 minutes):

| Scene | Shows |
|---|---|
| 1 Launch, the welcome and the photo access | The home screen, Bildklar opening in English (`app.launchArguments`), *Get started*, *Allow access to photos*, iOS's dialog → *Allow Full Access* |
| 2 The first scan | The scan's screen and its hint cards, then the reveal, *Just look around* / *Go to the overview* |
| 3 Trips, found by themselves | *Organise*, *Paris* and its photos — first, because trips need no AI while it still works |
| 4 More space | *Large files*: a video plays in place; *Month by month*: a month |
| 5 Suggestions, by category | Waits for the AI (its progress card moves), then *Duplicates* with its (i) sheet and *Mark unstarred*, *Near-identical*: a group, photo 2, *Side by side*; *Failed shots*: a blurry photo; *Unimportant photos* (when the AI has made it) |
| 6 Clean up now | *Quick clean*'s switches, *Go through all*: mark, keep, later, undo, mark, *Finish*, *Mark for deletion · n* |
| 7 Marked for deletion | *Delete all* › *Three safety nets* › the sheet that shows what goes › *Delete n photos* → iOS's own dialog, answered **Don't Allow**: nothing is deleted, so the test photos stay for the next recording |
| 8 Search | *What is in the photo?*: *dog*, then *beach* |
| 9 Settings and the end | The settings down to *Privacy*, back home |

The review notes (`store/listing.md`, 2.5) describe what the video leaves out.

| File | What it is |
|---|---|
| `scenes.json` | The recording, one step per line — the only file to change when the app changes |
| `RecorderUITests/SceneRunner.swift` | Plays a scene file on the iPhone (knows nothing about the app) |
| `RecorderUITests/AppReviewRecordingTests.swift` | The test: preflight, scenes, stop the recording |
| `RecorderHost/` | An empty app the UI test belongs to (a UI test needs one) |
| `make-project.rb` | Generates the Xcode project (`gem install xcodeproj`, only to change its structure) |
| `../../scripts/rehearse-app-review.mjs` | Plays `scenes.json` against the web app (the demo library) first |
| `../../scripts/record-app-review.sh` | Runs the UI test on the connected iPhone |
| `../../scripts/record-watch.sh` | Waits for run requests, so Claude can start runs |

## Once

1. **iPhone:** Settings › Privacy & Security › **Developer Mode** on (restarts
   the phone). Then Settings › Developer › **Enable UI Automation** on.
2. **Control Center:** long-press an empty spot › Add a Control › **Screen
   Recording**. Microphone off.
3. Put **Bildklar's icon on the first home screen page**. No other app called
   Bildklar on the home screen's pages.
4. iPhone language **English or German** — the system buttons the recorder
   taps (Screen Recording, Delete, Update …) are listed in those two in
   `scenes.json` › `system` and in the steps.
5. **Mac:** Xcode signed in with the developer account. The first run creates
   the signing for the recorder's two bundle ids
   (`com.habboubah.bildklar.recorder`, `….recorder.uitests`) by itself.

If the shopping list's or Spartopf's recorder has run on this iPhone, 1, 2
and 5 are done.

## Preparation (once per iPhone, before the first recording)

The video must not show your own photos, and the app gets **Full Access** on
film: the iPhone holds **only the test photos** while you record.

1. **Your own photos off the iPhone, safely.** If *iCloud Photos* is on
   (Settings › your name › iCloud › Photos), deleting a photo on the iPhone
   deletes it in iCloud and on every device — so don't delete: turn *iCloud
   Photos* off on the iPhone and choose **Remove from iPhone**; your photos
   stay in iCloud and come back when you turn it on again. If iCloud Photos is
   off: copy everything to the Mac first (Image Capture or Photos › Import,
   check the count), then delete on the iPhone and empty Recently Deleted.
2. **The test photos** (`test-photos/`, 563 public-domain photos and videos —
   made by `npm run test-photos`): trips with dates and places (Paris, Vienna,
   Barcelona …), bursts of near-identical shots, blurry ones, an exact
   duplicate, WhatsApp copies, screenshots, receipts and letters, videos. On
   the Mac, Finder › the `test-photos` folder › select all but `credits.csv` ›
   Share › AirDrop › your iPhone; they land in Photos with their dates and
   places. (Not Finder's photo sync: synced photos can't be deleted on the
   iPhone, and scene 4 deletes.) Keep iCloud Photos off while they are there.
3. **Nothing to buy while the app is free** (`UNLOCK_ON_SALE` is false in
   `src/logic/allowance.ts`): a trip shows *Create album* for everyone — the
   scenes don't tap it.
4. **TestFlight** on the iPhone with Bildklar in its list (signed in as a
   tester). The run installs the newest build that TestFlight offers.

Afterwards: delete the test photos (Photos › Select › all), empty Recently
Deleted, turn iCloud Photos on again (or import your photos back from the
Mac).

## Every recording

1. `npm run rehearse:app-review` — checks every step against the current
   code in about a minute.
2. The build you submit has to be the newest one in **TestFlight** for
   your tester account. Every full run **deletes Bildklar and installs it
   again from TestFlight** before the screen recording starts, without
   asking (`xcrun devicectl device uninstall`; if that fails, the test
   deletes it on the home screen). Its decisions go; the photos stay.
   `REINSTALL=0` skips that — then the app must be fresh (showing
   *Get started*).
3. Connect the iPhone by cable, unlock it, **Do Not Disturb** on.
4. **Dry run:** `DRY_RUN=1 npm run record:app-review` — everything except the
   screen recording. Nothing is deleted: scene 7 answers iOS's delete dialog
   with *Don't Allow*.
5. Nothing to tidy up between runs: each full run reinstalls the app.
6. **Record:** `npm run record:app-review`. Keep the phone unlocked and
   don't touch it.
7. **Afterwards:** the video is in Photos. Trim it, AirDrop it to the Mac,
   upload it in App Store Connect › App Review Information › Attachment (or
   attach it to the reply in the Resolution Center). 
   If the file is too large to attach, make it smaller first:

   ```bash
   ffmpeg -i "ScreenRecording.MP4" -vf "scale=-2:1280,fps=30" -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -an -movflags +faststart app-review-small.mp4
   ```

Options: `PACE` scales every pause (0.65 unless set; `PACE=1` slower,
`PACE=0.5` faster); `FROM=3 TO=4` only those scenes (no preflight, for trying
a fix — the app must be in the state the scene before leaves it);
`DEVICE=<udid>` with several iPhones.

`npm run record:watch`, left open in a Terminal window, lets Claude start
runs while the iPhone stays on its stand: a run is asked for by writing its
settings (`DRY_RUN=1`, `FROM=n`, `TO=n`, `PACE=x`) to `build/record-request`;
its output is in `build/record-last.log`, its state in `build/record-status`.

Xcode films every test run on its own, into the `.xcresult` (a video of
several hundred MB for a full run): handy for looking at a dry run frame by
frame, but `build/` fills up — delete old `app-review-recording-*.xcresult`
now and then.

**The first fresh-install run on the iPhone will need fixes.** The scenes pass against the
web build with the drawn demo library; the real photos, the scan's speed and
system UI (the permission and delete dialogs) only show on the phone. Start
with the dry run and expect a round or two. Likely spots: iOS's photo dialog (scene 1:
*Allow Full Access*; iOS 18 may ask a second time), the app opening in
German (then `-AppleLanguages` didn't reach the web view: set the iPhone to
English for the recording), TestFlight's *Install* button, the first scan's
timeout (scene 2 waits 300 s for the reveal) and the delete count (*Delete 4
photos*, with *Delete* as the fallback).

## When it stops

The terminal names the scene, the step and what was missing; the
`.xcresult` in `build/` (open it in Xcode) has a screenshot of the moment.
The recording is stopped, so what was filmed so far is in Photos.

- **"not found: …"** — a label changed in the app, or your photos differ
  from the demo library (the trip's name, the number of photos). Run the
  rehearsal: if it passes, look at the screenshot and change the step in
  `scenes.json` to what your photos show.
- **Scene 2 times out** — the first scan took longer than 300 s, or found no
  group (then the reveal has no *Compare your first group*). Give the step a
  longer `timeout`, or check the test photos are all on the iPhone.
- **TestFlight** — "isn't in TestFlight's list" or "no Install button": open
  TestFlight by hand once, sign in, accept the invitation; the
  `app-review-install-*.xcresult` in `build/` has the screenshot.
- **Scene 4: iOS's *Delete* dialog isn't tapped** — the dialog's button is
  named differently in your language: add it to the `systemAlert` list.
- **It works in the rehearsal but not on the iPhone** — system UI or a
  difference in WebKit: the select menus in the preflight (`select`), the
  swipe card in the review. Fix it in `SceneRunner.swift` or in the step,
  then `FROM=n DRY_RUN=1`.
- **"can't reach … on screen"** — the page didn't scroll to it. If the
  rehearsal fails with "the page no longer scrolls", a sheet left the page's
  scroll lock on (`src/ui/useDialog.ts`); if it passes, look at the
  screenshot for what covers the row.
- **The app left the screen** — a notification banner took a tap and opened
  another app. Do Not Disturb on, record again; don't upload that video.
- **Signing errors** — open `AppReviewRecorder.xcodeproj` in Xcode once,
  pick your team for both targets, run the test from there (⌘U).

## Steps

Each step is one JSON object. Labels are accessibility labels (what
VoiceOver reads); a list means "the first of these that exists". Matching:
exact, then starts with, then contains; buttons and fields before text; `nth`
counts from 0 in screen order. While a sheet is open, only it can be reached.

| Step | Does |
|---|---|
| `{"tap": "Save"}` | Taps it (scrolls to it first). `nth`, `role` (`button`, `switch`, `textbox`), `timeout` |
| `{"tap": "More", "near": "Quantity"}` | Two with one name on screen: taps the exact match closest (up and down) to the `near` text |
| `{"tap": "Import backup", "pickFile": "x.json"}` | Taps, then picks the file in the Files picker (searches its name; the rehearsal takes it from `demo-files/`) |
| `{"fill": "Name", "text": "Saturday market"}` | Replaces a field's text, typed in one go |
| `{"amount": "12.50", "into": "Quantity"}` | A number, typed with the iPhone's decimal separator |
| `{"select": "English", "in": "Language"}` | Opens a `<select>` and taps the option |
| `{"swipe": "left", "on": "Tick off Tomatoes"}` | Swipes across that row |
| `{"drag": "…", "to": "…", "hold": 0.8}` | Long-press and drag |
| `{"see": "Up next", "timeout": 10}` | Waits until the text is on screen |
| `{"scrollTo": "…"}`, `{"scroll": "down"}` | Scrolls |
| `{"key": "Enter"}`, `{"type": "…"}` | Types into the field that has the caret |
| `{"pause": 1.5}` | Waits (times `PACE`) |
| `{"systemAlert": ["Allow", "Erlauben"], "timeout": 3}` | Taps a button in a permission alert; waits `timeout` seconds for it (4). iOS asks once per install: make it `soft` |
| `{"systemTap": ["Close", "Schließen"]}` | Taps a button in system UI over the app (the share sheet) |
| `{"startRecording": true}`, `{"stopRecording": true}` | Control Center's Screen Recording |
| `{"launch": true}`, `{"home": true}`, `{"terminate": true}`, `{"appSwitcher": true}` | Home screen and app life cycle. `launch` with `app.launchArguments` in `scenes.json` shows the home screen, then opens the app with them (XCUIApplication.launch) |
| `{"optional": [ … ]}` | Runs the steps only if the first one works |

Any step with `"soft": true` may fail without stopping the recording.
`pickDay`, `pickYearAhead`, `placeholderMinus` and `faceID` are Spartopf's
(date fields, amounts, the lock); this app has no use for them.

## What the video doesn't show

**Left out, because they leave the app or need another device:** Recently
Deleted (in the Photos app), *Send feedback* and *Privacy* (mail and the
browser), *Rate Bildklar* (not shown before the app is in the store), *Select
photos* (iOS's picker), Android.

**Won't appear during a run, though the app has them** (`src/useNudges.ts`):
the rating prompt after a delete (iOS shows nothing in a TestFlight build),
the weekly-reminder offer (only after a month is gone through, which the
scenes don't do), the *Since …* card (only for five or more photos newer
than the last visit — the test photos are older) and the new-trip card (the
trips count as seen once the first scan settles). If one ever shows on the
iPhone, it is a sheet or card over the flow: close it with an `optional`
step rather than leaving it in the video.

**Left out to keep it short (about 3 minutes plus the first scan):** renaming, merging, splitting
and hiding a trip, the list of all trips, the blurry list on its own
(the review in scene 4 goes through blurry and near-identical photos
together), undo in the review, *Start over*, dark mode, German. A scene
for any of them comes back only when Ahmad asks.
