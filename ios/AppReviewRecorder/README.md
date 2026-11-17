# App Review recorder

Records the screen recording App Review asks for (Guideline 2.1: "captured
on a physical device … beginning with launching the app"): a UI test taps
through Bildklar installed on your iPhone while iOS records the screen. About
2 minutes; the video ends up in Photos (a video, so Bildklar itself ignores it).

It is the shopping list's recorder (originally Spartopf's,
`../budget-app/ios/AppReviewRecorder`), copied on 16 November 2026: the
runner, the test and the scripts are the same, only `scenes.json` is
Bildklar's. Five scenes, from the icon on the home screen to the settings:

| Scene | Shows |
|---|---|
| 1 Launch and the scan | The icon, the photo permission (*Limit Access…* if iOS asks), the *Clean up* tab filling up, the clean-up card |
| 2 A trip becomes an album | The *Organise* tab, *Paris*, *Create album* → (the paywall and *Restore purchases*, only if the unlock isn't owned yet) → the confirmation → *Album made on …* |
| 3 Near-identical photos and the best shot | A group, the suggested best photo, picking another one as the best |
| 4 A review that deletes | *Clean up now* › *Go through all*: delete, keep, delete, *Finish*, *Delete 2 photos* → iOS's own *Delete* dialog → *2 photos deleted* |
| 5 Settings and the end | The settings down to *Privacy*, back home |

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

1. **The demo photos.** About 60 licensed photos with GPS and dates
   (`docs/TODO.md`, step 5) — the scenes expect a trip called **Paris**, at
   least one group of near-identical photos and at least three photos the
   review offers. AirDrop them to the iPhone (or import them on the Mac with
   Photos and let iCloud sync — then check the dates and places survived).
2. **Limited Access to only those:** Settings › Apps › Bildklar › Photos ›
   **Limited Access** › select the demo photos. The video must not show your
   own photos. (If iOS asks during scene 1, the runner taps *Limit Access…*;
   then select the demo photos in the picker by hand once, and record again.)
3. **The unlock, bought once with the TestFlight build** (purchases in
   TestFlight are free and stay with your Apple Account). Scene 2 then makes
   the album straight away. The paywall itself is in the in-app purchase
   screenshot for review (`screenshots/en/09-paywall.png`).
4. **Debug only:** a debug build has the dry run on, so nothing would be
   deleted — record with the TestFlight build, as App Review sees it.

## Every recording

1. `npm run rehearse:app-review` — checks every step against the current
   code in about 2 minutes.
2. The build you submit has to be the one installed from **TestFlight**,
   and a build the scenes fit: `scenes.json` › `app.minVersion` (0.1.0). The
   run prints which build the iPhone has; an older one it **updates from
   TestFlight by itself** before anything is reset or filmed (`UPDATE=0` only
   says so and stops).
   Every full run **resets Bildklar's decisions before the screen recording
   starts**, without asking — Settings › Language › English, Appearance ›
   Like the system, *Reset my decisions*. Your photos and the purchase stay.
3. Connect the iPhone by cable, unlock it, **Do Not Disturb** on.
4. **Dry run:** `DRY_RUN=1 npm run record:app-review` — everything except the
   screen recording. **It does make the album and delete the two photos** (the
   app can't tell a dry run of the recorder from a real one).
5. **Tidy up after the dry run:** Photos › Albums › delete the album
   *Paris, …*; Photos › Recently Deleted › recover the two photos.
6. **Record:** `npm run record:app-review`. Keep the phone unlocked and
   don't touch it.
7. **Afterwards:** the video is in Photos. Trim it, AirDrop it to the Mac,
   upload it in App Store Connect › App Review Information › Attachment (or
   attach it to the reply in the Resolution Center). Then tidy up as in step 5.
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

**The first run on the iPhone will need fixes.** The scenes pass against the
web build with the drawn demo library; the real photos, the scan's speed and
system UI (the permission and delete dialogs) only show on the phone. Start
with the dry run and expect a round or two. Likely spots: the trip's name
(*Open Paris* — your photos may name it differently, e.g. a district), the
group's button (scene 3 taps the first "… photos" button) and the scan's
timeout (scene 1 waits 60 s for the clean-up card).

## When it stops

The terminal names the scene, the step and what was missing; the
`.xcresult` in `build/` (open it in Xcode) has a screenshot of the moment.
The recording is stopped, so what was filmed so far is in Photos.

- **"not found: …"** — a label changed in the app, or your photos differ
  from the demo library (the trip's name, the number of photos). Run the
  rehearsal: if it passes, look at the screenshot and change the step in
  `scenes.json` to what your photos show.
- **Scene 1 times out** — the scan took longer than 60 s, or no clean-up card
  appeared (no near-identical or blurry photos among the selected ones). Give
  the step a longer `timeout`, or add photos that make a group.
- **Scene 2: the paywall appears and *Restore purchases* finds nothing** —
  the unlock wasn't bought with this Apple Account (Preparation, 3).
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
| `{"launch": true}`, `{"home": true}`, `{"terminate": true}`, `{"appSwitcher": true}` | Home screen and app life cycle |
| `{"optional": [ … ]}` | Runs the steps only if the first one works |

Any step with `"soft": true` may fail without stopping the recording.
`pickDay`, `pickYearAhead`, `placeholderMinus` and `faceID` are Spartopf's
(date fields, amounts, the lock); this app has no use for them.

## What the video doesn't show

**Left out, because they leave the app or need another device:** Recently
Deleted (in the Photos app), *Send feedback* and *Privacy* (mail and the
browser), *Rate Bildklar* (not shown before the app is in the store), *Select
photos* (iOS's picker), Android.

**Left out to keep it short (about 2 minutes):** renaming, merging, splitting
and hiding a trip, the list of all trips, the blurry list on its own
(the review in scene 4 goes through blurry and near-identical photos
together), undo in the review, *Reset my decisions* itself (every recording
starts with it, before the screen recording does), dark mode, German. A scene
for any of them comes back only when Ahmad asks.
