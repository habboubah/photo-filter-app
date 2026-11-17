---
name: app-preview-video
description: Make, change or re-export the App Store app preview video of Bildklar (npm run app-preview) — the running app is filmed from a storyboard, then captions, a light on a part of the screen, touch dots and an end card with the icon are laid over it, and an 886 × 1920 MP4 per language comes out, checked against App Store Connect's specification. Use when asked for an app preview, a preview / promo / marketing video or trailer, "a video of the app" for the App Store or Google Play listing, a video like another app's listing has, to change the video's captions, chapters, length, music or poster frame, or after a screen or flow the video passes through has changed. Not the App Review screen recording on a real iPhone (app-review-recording) and not the store screenshots (store-screenshot-studio).
---

# App preview video

The app preview is the short video that plays, muted, in front of the
screenshots on the App Store listing and in search results. Bildklar's is
built like the shopping list's (after Bring!'s, which Ahmad pointed at): a
line of text on the dimmed screen, then the app doing what the line says —
four times — and the icon at the end. About 24 seconds, German and English,
in the app's own colours and type, so it sits next to the store screenshots
as one set. It runs on the **demo library**: real CC0 photos (public domain,
`scripts/demo-photos.py`), fine for the upload.

It is made in three steps, by one command:

| Step | Script | What it does | Writes |
|---|---|---|---|
| film | `scripts/film.mjs` | Builds the app (with the demo library), plays the storyboard's chapters with real taps while Chromium hands over every frame it draws | `build/app-preview/<lang>/`: the frames and `footage.json` (when each was drawn, where the taps landed, where the lit parts are) |
| compose | `scripts/compose.mjs` | Lays the chapters on one timeline, draws every frame on a stage (`templates/stage.*`) — footage, veil and caption, light, touch dots, status bar, end card — and encodes it with ffmpeg | `screenshots/store/app-preview/app-preview-<lang>.mp4`, `poster-<lang>.png`; `plan.json` and a still every half second in `build/` |
| validate | `scripts/validate.mjs` | Asks ffprobe what is really in the file and compares it with Apple's specification | a table; the run fails when a file would be refused at upload |

and `scripts/sheet.mjs` lays the stills out as
`screenshots/store/app-preview/contact-sheet-<lang>.png` — the way to look at
a video without playing it.

| File | What it is |
|---|---|
| `config/storyboard.mjs` | The film: the video's size, the demo's state at the start, the chapters (caption, how long it stands, what is tapped). The one file about this app's flow |
| `config/copy.<lang>.json` | The words: one caption per chapter, the name and the points on the end card |
| `config/theme.json` | The dress: veil, caption type, light, touch dot, end card — the app's colours |
| `scripts/`, `templates/`, `assets/fonts.css` | The machine. Knows nothing about this app |
| `reference/app-preview-specs.md` | What Apple takes (the file, the sizes, what a preview may show), how it is uploaded, and Google Play |
| `reference/storytelling.md` | What makes a preview work, the pace in numbers, the checklist for the contact sheet |

## Ground rules

- **Every frame is the running app.** The film is taken from the app while it
  is really used; nothing in it is drawn, edited or generated, and no screen
  is shown that the app does not have. Only what explains goes on top:
  captions, the light, the touch dots, the status bar, the end card. That is
  Apple's rule for previews and the reason the video can be trusted.
- **No price, no call to action, no superlative** in a caption or on the end
  card — compose refuses them. "Kostenlos" on App Store artwork gets a
  version rejected.
- **The upload is filmed on the Mac**: Apple's emoji and system font, and a
  smooth film. A run in a Linux container is a proof to look at; say so
  whenever you show one, and never hand it over as the upload.
- **Uploading and submitting are Ahmad's** (`docs/TODO.md`), in App Store
  Connect, with the version — only with his explicit go.
- Before editing, `git status` and `git log -5`: other sessions work in the
  same folder.

## What the film is and is not

It is the app's web build at an iPhone Pro Max's size (443 × 960 pt, two
pixels a point) — the same code the iPhone runs in its web view, filmed the
way `npm run screenshots` photographs it. It is not a recording of an iPhone:

- the **status bar and the home indicator are drawn** by the stage (9:41,
  full signal), in the room the app keeps for them;
- **no keyboard** comes up while the film types, as in the store screenshot
  of the add field;
- haptics, the share sheet, the camera and system alerts do not exist here —
  keep chapters to what happens inside the app's own screens.

Never call it a device recording. When Apple asks for one (Guideline 2.1),
that is the `app-review-recording` skill.

## Run it

```bash
npx playwright install chromium     # once per Mac
brew install ffmpeg                 # once per Mac (ffmpeg and ffprobe)

npm run app-preview                 # film → compose → contact sheet → validate, DE and EN
npm run app-preview -- --lang de    # one language
npm run app-preview -- --compose    # keep the footage, make the video again
```

`--compose` is the quick one (about a minute a language): use it after
changing a caption, a `hold`, the theme or the end card. Anything that changes
what happens on screen — a step, a pause, the demo photos, the app itself —
needs the film again.

Out, in `screenshots/store/app-preview/` (gitignored, like all of
`screenshots/`): `app-preview-de.mp4`, `app-preview-en.mp4`, a
`poster-<lang>.png` each, a `contact-sheet-<lang>.png` each. The run ends with
the validator's table and each video's poster-frame time.

## Workflow (follow this, in order)

### 1. Look, then plan the story

Read `config/storyboard.mjs` and both copy files, and look at the last
contact sheet if there is one. Read `reference/storytelling.md` before
changing what the video tells. For each chapter decide: the one thing it
shows, the line that says so, and the taps that prove it — and what comes out
if something goes in (30 seconds is a hard limit).

### 2. Propose it — approval gate

Show Ahmad the plan as a table before filming anything new: chapter, caption
in German and English, what happens on screen, seconds. **Wait for his yes or
his edits.** A changed caption alone needs no gate beyond showing him the
result.

### 3. Film one language and look

```bash
npm run app-preview -- --lang de
```

Then open `screenshots/store/app-preview/contact-sheet-de.png` and go through
the checklist at the end of `reference/storytelling.md`. Fix and rerun
(`--compose` when only words, holds or the dress changed) until it holds.

### 4. Show it — approval gate

Send Ahmad the video and the contact sheet, with the validator's line for it.
If it was filmed in a container, say that it is a proof (other emoji, less
smooth). **Wait for his approval** before treating the storyboard as settled.

### 5. Every language, then report

```bash
npm run app-preview
```

Look at every language's contact sheet — a caption that fits in English may
not in German. Report the validator's table with its warnings, each poster
frame's time, and what is left for Ahmad: on the Mac, `npm run app-preview`,
then the upload steps in `reference/app-preview-specs.md` › *Uploading*. Never
report a video that did not pass.

## The storyboard

`config/storyboard.mjs` exports the video's settings (`video`), the languages
(`locales`), the demo's state when the film starts (`prefs` and `prepare`:
scanned, unlocked, no dry run — the screenshots' `prefs()`), the parts a
chapter can point at (`marks`) and the chapters:

```js
{
  id: 'trips',
  caption: 'trips',        // copy.<lang>.json › captions.trips
  hold: 2.0,               // seconds the caption stands on the frozen screen
  run: async a => {        // what is filmed after it
    await a.scrollTo('paris');
    await a.tap('paris');
    await a.tap('create-album');
    await a.tap('confirm-album');
    await a.pause(1.3);    // the toast
  },
},
```

The four chapters: *intro* (the clean-up card lit), *trips* (Paris → *Album
erstellen* → the confirmation → the toast), *best* (a group, the best photo
lit), *review* (delete, keep, delete — the poster frame is the review's
first card), then the end card.

- A chapter starts where the last one ended. One that has to be somewhere
  else gets a `setup: async (a, w) => { … }` — it runs off camera, and the
  video dissolves to where it leaves the app.
- `{ id: 'end', card: true, seconds: 2.5 }` is the end card.
- `w` is the language being filmed: `w.t` the app's strings, `w.f` its
  `fmt`, `w.p` its `plural` (`scripts/lib/shots.mjs` › `words`). **Every label a tap needs is built from these**, never written
  out — one storyboard films every language, and a renamed button stops the
  run instead of filming the wrong thing.

What `a` can do (`scripts/film.mjs` › `Actor`). A target is a mark's name, a
selector or a Playwright locator:

| Verb | What it does |
|---|---|
| `a.tap(target, { at })` | A tap, with a touch dot a quarter second before the finger. Scrolls to a target that is off screen first. `at: [0.2, 0.5]` taps off-centre |
| `a.type(target, text)` | Taps the field and types letter by letter |
| `a.blur()` | Puts the "keyboard" away (takes the focus, and the focus ring, off the field) |
| `a.pause(seconds)` | Lets the film run |
| `a.see(target)` | Waits until something is on screen, however long that takes |
| `a.scrollTo(target, { block })` / `a.scrollBy(dy)` | Scrolls like a thumb, eased |
| `a.spotlight(targets, seconds)` | Dims everything but these parts. `seconds` may be a function: the light stays on while its taps run |
| `a.zoom(target, scale, seconds)` | Moves in on a part and back out. Keep it at 1.1–1.25, and rare: Apple asks for the app at its own size. The storyboard uses none |
| `a.poster()` | Marks this moment as the poster frame |
| `a.page` | The Playwright page, for what no verb covers |

**Marks** are names for parts of a screen. All the store screenshots' marks
work (`cleanup`, `trip-1`, `tiles`, `album`, `best`, `card` … — the table in
the `app-store-screenshots` skill), plus the film's own: `paris`,
`create-album`, `confirm-album`, `similar`, `first-group`, `cleanup-button`,
`review-all`, `keep`, `delete`, `back`. A part the film needs and no mark names:
add it to `marks` in the storyboard, built from `w` like the others.

Things this app does that a chapter has to allow for:

- The trip's bottom bar (*Durchgehen*, *Album erstellen*) is outside `main`:
  select its buttons by text, not under `main`.
- After *Album erstellen* the confirmation is an `alertdialog` with a button of
  the same name (`confirm-album`); the toast stays a few seconds — the next
  chapter's `setup` dissolves away from it.
- Home keeps its scroll position: a `setup` that comes back to home scrolls to
  the top (`a.page.evaluate(() => window.scrollTo(0, 0))`) before tapping a tile.
- The review's card can be swiped, but the film taps the round buttons
  (`delete`, `keep`): a tap reads better in a muted video than a drag.

## The words

`config/copy.<lang>.json`. Rules (compose enforces the first three):

- **Five words at most**, and long enough on screen: half a second to find a
  caption, a fifth of a second a word, plus its fades. A caption that is too
  short on screen stops the run and names the `hold` it needs — the holds
  are per chapter, so they have to fit the longer language.
- **No price words, calls to action or superlatives.**
- The type is fitted: as large as fits three lines; shorten a caption that
  comes out visibly smaller than the others on the contact sheet.
- Take the store screenshots' headlines where a chapter shows the same thing
  (`store-screenshot-studio/config/copy.<lang>.json`), and write each
  language rather than translating it.
- A dash never starts a line (the stage keeps " – " with the word before it).

## The dress

`config/theme.json`, every value explained in the file: the veil (the app's
ink over the screen, which goes soft under it), the caption's size range, the
light, the touch dot, the status bar's ink by theme, the end card (the icon's
teal). Captions and the name are Fraunces at 650 (`templates/stage.css`). The type is the app's own, loaded from `src/assets/fonts/`. Change
the dress for the whole video, never for one chapter — and after changing a
colour, look at a caption over the brightest screen of the film.

## Length

The storyboard's `video.maxSeconds` is 29.5 (Apple: 30). Captions and the end
card keep their length; when the whole comes out longer, the filmed parts are
played up to 15 % faster and the run says so; past that it stops with each
chapter's seconds. Then take a step out or shorten pauses — do not shorten a
caption's `hold` below what compose asks for.

## Adding things

- **A chapter** — an entry in `chapters`, a caption in every copy file, and
  another chapter out or shorter.
- **A language** — its code in `locales`, a `config/copy.<lang>.json` (`"dir":
  "rtl"` turns the captions and the end card round; the status bar stays as
  iOS keeps it). The app is filmed in that language by itself. Arabic falls
  back to the English preview until it has one.
- **Music** — `video.music`, a path from the repo's root, faded in and out.
  Only a track Ahmad may use for advertising in every country; ask him, never
  pick one. `null` gives the silent stereo track Apple needs anyway.
- **Without the status bar or the dots** — `video.statusBar: false`,
  `video.touchDots: false`.
- **Another size, or Google Play** — `reference/app-preview-specs.md`. Play
  takes a YouTube link and wants landscape; that composition is not built.

## When it stops

| What the run says | What to do |
|---|---|
| `ffmpeg is not installed` | `brew install ffmpeg` on the Mac (Ahmad) |
| `Chromium did not start` | `npx playwright install chromium`; in a container `CHROME_PATH=/usr/bin/google-chrome` |
| `✗ de, chapter "add": tap: "…" is not on the screen` | The flow or a label changed. `build/app-preview/fail-de.png` is the screen at that moment, the lines under the message what is on it. Mend the chapter (or the mark's selector) |
| `spotlight: "…" is not on the screen` | `a.scrollTo` it first, or light something that is there |
| `"…" stands 1.5 s — too short to read` | Raise that chapter's `hold` to the number given |
| `the film is 31.2 s … too much to play faster` | Take a step out, shorten pauses, film again |
| `! the screencast delivers 443 × 960 …: filming with screenshots` | This Chromium ignores `--force-device-scale-factor`. The film is right but slower to take and choppier; note it in `docs/TODO.md` |
| `! this machine films it choppily` | Expected in a container. On the Mac: close what else is running, film again |
| `The built app could not be served on port 4318` | A screenshot run or another film is going in this folder; wait for it |

**In a Linux container** (a cloud session cannot use the Mac's
`node_modules`): work in a copy with its own `npm ci`, keep the repo's
`.gitignore` next to the copy, set `CHROME_PATH` to a Chrome that is
installed. Emoji are Noto's instead of Apple's and the status bar's type is
not San Francisco — a proof, not an upload. Then give Ahmad the one command
for the Mac.

## Keep in step

- A screen, a label or a flow the video passes through changed →
  `npm run app-preview` and look at the contact sheets (labels follow by
  themselves; a changed flow stops the film).
- A store headline changed and a caption says the same → both copy files.
- The scripts, the templates and `assets/` know nothing about this app. When
  Spartopf (`../budget-app`) gets a preview, it gets this skill with its own
  `config/`; change the machine in step in both, never for one app's film.

## Not yet run on the Mac (16 November 2026)

Bildklar's storyboard was filmed end to end in a Linux container on 16
November 2026 (both languages pass the validator, 23.6 s); the first Mac run,
with real photos, is still to come — say so. What to look at
then: that the film says `by screencast` and 50 or more frames a second (not
the screenshot fallback), Apple's emoji and San Francisco in the status bar, the
contact sheets, and one video played on the iPhone it will be seen on. When
it has passed, replace this section with the date.
