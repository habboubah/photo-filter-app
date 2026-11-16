# App Review recorder

Records the screen recording App Review asks for (Guideline 2.1: "captured
on a physical device … beginning with launching the app"): a UI test taps
through the shopping list app installed on your iPhone while iOS records the
screen. About 2–3 minutes; the video ends up in Photos.

It is Spartopf's recorder (`../budget-app/ios/AppReviewRecorder`), copied on
15 November 2026: the runner, the test and the scripts are the same, only
`scenes.json` is this app's. It films a first shopping trip, from the icon on
the home screen to the settings — only what a user needs, about 2–3 minutes
(Ahmad, 15 November 2026: the first version ran 6 minutes) — in six scenes:

| Scene | Shows |
|---|---|
| 1 Launch and the first list | The icon, *Your lists* with the three starter lists, the Supermarket list: three suggestions, typing "2 kg apples" and "Milk 3x" |
| 2 Editing and deleting | A note on an item (the pencil), the bin → Undo |
| 3 Ticking off and the basket | Two items hop into the bag, a tap on the bag shows *In the basket* |
| 4 Shopping mode | *Up next* with *Into the basket* and *Later*, to *All in the basket!* |
| 5 A list of your own | *New list*: its type and name; a suggestion of that type |
| 6 Settings | Deutsch and back to English; dark and automatic; a list type of your own with a suggestion |

Sharing a list and the backup (export and import) are not in the video, on
purpose — don't put them back unasked. What it leaves out is listed at the end, for the Review Notes.

| File | What it is |
|---|---|
| `scenes.json` | The recording, one step per line — the only file to change when the app changes |
| `RecorderUITests/SceneRunner.swift` | Plays a scene file on the iPhone (knows nothing about the app) |
| `RecorderUITests/AppReviewRecordingTests.swift` | The test: preflight, scenes, stop the recording |
| `RecorderHost/` | An empty app the UI test belongs to (a UI test needs one) |
| `make-project.rb` | Generates the Xcode project (`gem install xcodeproj`, only to change its structure) |
| `../../scripts/rehearse-app-review.mjs` | Plays `scenes.json` against the web app first |
| `../../scripts/record-app-review.sh` | Runs the UI test on the connected iPhone |
| `../../scripts/record-watch.sh` | Waits for run requests, so Claude can start runs |

## Once

1. **iPhone:** Settings › Privacy & Security › **Developer Mode** on (restarts
   the phone). Then Settings › Developer › **Enable UI Automation** on.
2. **Control Center:** long-press an empty spot › Add a Control › **Screen
   Recording**. Microphone off.
3. Put the **app's icon on the first home screen page** (*Einkaufsliste* on a
   German iPhone, *Shopping List* on an English one). No other app with that
   name on the home screen's pages.
4. iPhone language **English or German** — the system buttons the recorder
   taps (Screen Recording, Close, Update …) are listed in those two in
   `scenes.json` › `system` and in the steps; add your language there to use
   another.
5. **Keyboard:** Settings › General › Keyboard › **Auto-Correction** and
   **Predictive Text** off, so a German keyboard doesn't "correct" the
   English demo words (later steps look for those words); without the
   suggestions bar the video is cleaner too.
6. **Mac:** Xcode signed in with the developer account (it already is, you
   archive from it). The first run creates the signing for the recorder's
   two bundle ids (`com.habboubah.korb.recorder`, `….recorder.uitests`) by
   itself.

If Spartopf's recorder has run on this iPhone, 1, 2, 5 and 6 are done.

## Every recording

1. **Save your own lists:** Settings › Backup › Export backup, to iCloud
   Drive. The run erases everything in the app.
2. `npm run rehearse:app-review` — checks every step against the current
   code in about 3 minutes.
3. **No demo files to AirDrop:** nothing is imported in the video.
4. The build you submit has to be the one installed from **TestFlight**,
   and a build the scenes fit: `scenes.json` › `app.minVersion` (1.0.5, the
   first with the "Tüte" look: the add field at the top, the pencil and the
   bin on every row). The run prints which build the iPhone has; an older
   one it **updates from TestFlight by itself** (it opens TestFlight and taps
   Update in the app's row) before anything is reset or filmed. `UPDATE=0`
   only says so and stops. A newer build than `minVersion` you install
   yourself.
   No need to delete the app before each run: every full run **resets it in
   the app before the screen recording starts**, without asking — Settings ›
   Language › English, Appearance › Automatic, Reset app. The video then
   starts with the three starter lists, named in English. If the reset can't
   be played the run stops there and records nothing (`RESET=0` skips the
   reset and stops if the app isn't empty).
5. Connect the iPhone by cable, unlock it, **Do Not Disturb** on.
6. **Dry run:** `DRY_RUN=1 npm run record:app-review` — everything except the
   screen recording. The real run resets what the dry run filled.
7. **Record:** `npm run record:app-review`. Keep the phone unlocked and
   don't touch it.
8. **Afterwards:** the video is in Photos. Trim it, AirDrop it to the Mac,
   upload it in App Store Connect › App Review Information › Attachment (or
   attach it to the reply in the Resolution Center). Then Settings › Backup ›
   Import backup with your own file, and your language again.
   If the file is too large to attach, make it smaller first:

   ```bash
   ffmpeg -i "ScreenRecording.MP4" -vf "scale=-2:1280,fps=30" -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -an -movflags +faststart app-review-small.mp4
   ```

Options: `PACE` scales every pause (0.65 unless set; `PACE=1` slower,
`PACE=0.5` faster); `FROM=5 TO=7` only those scenes (no preflight, for trying
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
web build; system UI (the select menus, the keyboard) only
shows on the phone. Start with the dry run and expect a round or two.

## When it stops

The terminal names the scene, the step and what was missing; the
`.xcresult` in `build/` (open it in Xcode) has a screenshot of the moment.
The recording is stopped, so what was filmed so far is in Photos.

- **"not found: …"** — a label changed in the app. Run the rehearsal: it fails
  at the same step and prints what is on screen. Fix the label in
  `scenes.json`.
- **A suggestion chip isn't found** (scene 1, scene 5) — the chips are
  buttons with `role="listitem"` (`src/components/AddBar.tsx`), which the
  iPhone may not read as "Add “Bananas”". Their steps therefore carry the
  chip's text as a second label (`["Add “Bananas”", "Bananas"]`); keep that
  for every chip.
- **It works in the rehearsal but not on the iPhone** — system UI or a
  difference in WebKit. The usual suspects, in order: the select menus
  (`select`, scene 6), an element under the keyboard (after typing into the
  add field, scene 1). Fix it in `SceneRunner.swift` or in the step,
  then `FROM=n DRY_RUN=1`.
- **"can't reach … on screen"** — the page didn't scroll to it. If the
  rehearsal fails with "the page no longer scrolls", a sheet left the page's
  scroll lock on (`src/ui/useDialog.ts`); if it passes, look at the
  screenshot for what covers the row.
- **"Done" does the wrong thing** (iPhone in English): the bar above the
  keyboard has a button with the same name. The page's own comes first in
  the tree; if a run shows otherwise, give that step `"role": "button"` and
  say so.
- **"… is greyed out"** — an earlier step didn't do what it should (*Add* in
  *New list type* stays disabled without a name). Look at the screenshot for
  what went in.
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

**Left out on purpose** (Ahmad, 15 November 2026): sharing — *Share list*,
*Paste shared list*, a shared list arriving (the Review Notes in
`store/listing.md`, 2.5, describe it) — and the backup, *Export backup* and
*Import backup*.

**Left out, because they need the camera or another app.** A photo for an
item or a list (the camera and the photo library — the only permissions the
app asks for; the Review Notes describe it), *Send feedback* and *Privacy
policy* (they leave the app), *Rate the app* (not shown before the app is in
the store).

**Left out to keep it short (2–3 minutes):** *All suggestions*, the live
search, an item's quantity and unit, the swipe that deletes, sorting
(*Newest first*), putting an item back from the basket, *Untick all*, a
list's picture and colour, deleting a list → Undo, Arabic (right to left), adding a
suggestion to a built-in type, a long press on a row (edits, like the
pencil), editing and deleting a suggestion, *Often bought* and forgetting an
entry, *Restore defaults*, *Remove ticked items*, *Empty list*, editing a
list, adding the same item twice (the quantity goes up), Arabic search, and
*Reset app* itself — every recording starts with it, before the screen
recording does. A scene for any of them comes back only when Ahmad asks.

**If App Review asks for the camera permission on video:** add a scene that
taps *Photo* in *Edit item*; iOS then shows its own menu (Photo Library, Take
Photo, Choose File), the permission alert (`systemAlert`, soft) and the
camera, which the runner has no step for yet.
