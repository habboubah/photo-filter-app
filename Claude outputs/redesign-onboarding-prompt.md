# Bildklar: redesign prompt — clear first 5 minutes, calm and modern

Paste everything below the line into Claude Code, opened in `photo-filter-app`.
It is written for the app as it is on 18 November 2026 (after the "Glass" and
"Album" redesigns, v2.0.13). It stops once, after the first-run flow, so you
can approve it before the rest of the app is touched.

---

You are redesigning the frontend of **Bildklar**, my private, on-device photo
organizer for parents with huge libraries (React 19 + TypeScript, Tailwind 4,
`motion`, Capacitor 8 — one codebase for iPhone and Android). It finds trips,
near-identical shots, duplicates, failed shots, screenshots, large files,
videos and photos from chat apps. No account, no cloud, no ads; everything is
free for now (`UNLOCK_ON_SALE = false`).

## Goal

Bildklar should feel like a **calm, premium photo app, not an aggressive
"cleaner"**. Photos are the hero. On every screen the user knows three things:

1. **what this screen is**,
2. **what to do next**,
3. **that nothing is deleted without their confirmation.**

The **first 5 minutes must teach the app's value and how to use it** — today
there is no onboarding at all: the app opens on a permission screen and then
on home. Add explanations where people need them, tasteful animation that
explains (not decorates), and a clean, organized, modern look.

This is an **evolution, not a rebuild**. The two tabs (*Aufräumen* /
*Ordnen*), the "one next step" card, the uncropped group viewer, the
*Zum Löschen vorgemerkt* bin and the "Glass" (iPhone) / "Album" (Android)
materials from `docs/REDESIGN.md` stay unless you find a real problem with
them — then say so and why.

## Phase 0 — Set up (no UI changes yet)

1. **Read first**: `CLAUDE.md` (every rule still applies: architecture,
   safety, privacy, i18n, accessibility, performance budget, commits),
   `docs/REDESIGN.md`, the *Design* section of `docs/PLAN.md`,
   `docs/features.md`, `src/index.css` (the tokens) and `src/ui/`.
2. **Use the design skills already in `.claude/skills/`** — nothing to
   install. They target the web, which is exactly our stack, so apply them
   directly in React + Tailwind + `motion`:
   - `frontend-design` and `design-taste-frontend` — commit to one clear
     aesthetic direction, audit before redesigning, avoid templated defaults.
   - `apple-design` and `emil-design-eng` — springs, gestures, sheets,
     interruptible motion, the small details that make it feel premium.
   - `impeccable` and `ui-ux-pro-max` — hierarchy, onboarding, empty states,
     UX copy, the design system.
   - `find-animation-opportunities`, then `review-animations` /
     `fixing-motion-performance` on what you add.
   - `web-interface-guidelines` — the review before calling a screen done.
3. **Design memory: write `docs/DESIGN.md`** (docs live in `docs/`, per
   `CLAUDE.md`). It describes Bildklar's design system as it is *and* as this
   redesign makes it: tone (calm, photo-first, private, never pushy), colour
   tokens (light/dark, iPhone "Glass" and Android "Album"), typography roles,
   the spacing scale, radii, elevation/glass, motion rules (durations,
   springs, reduced motion), and the component states — **selected,
   suggested, your choice, protected, marked for deletion, destructive**.
   Consolidate what is now spread over `CLAUDE.md` *Styling*,
   `docs/REDESIGN.md` and `src/index.css`; point `CLAUDE.md` at it with one
   line: *read `docs/DESIGN.md` before any UI change and keep it updated*.
   Follow that rule yourself for the rest of this job.
4. **Baseline screenshots**: `npm run ui-review`, then copy
   `screenshots/review/` to `screenshots/review-before/` (overwrite the old
   one). If `docs/design-refs/` contains screenshots of apps I like, study
   them — screenshots beat adjectives.
5. **Close the feedback loop** so you can see what you build: `npm run dev`
   (the demo library, http://localhost:3001) at 375 and 430 px; the built-in
   browser if you have it; `npm run ui-review` (day, night, iPhone SE, small
   Android phone); and with an emulator running, `npm run android:debug` plus
   `adb exec-out screencap -p > shot.png`. Look at every screen you change —
   don't trust the code alone.

## Phase 1 — Research (short; summarize before coding)

Research from 17 November is in `docs/REDESIGN.md`: don't repeat it, extend
it with what it didn't cover — **onboarding, first-run, tutorials, coach marks
and empty states**. Use web search if you have it. Look at least at:
Swipewipe (monthly chunks, progress rings, summary before delete, "On this
day"), Swipe Photo Cleaner (monthly chapters), Wipix (swipe deck), ByteBroom
(on-device clustering), Files by Google (simple, trustworthy cleanup),
CleanMyPhone / Gemini Photos (similar-photo comparison), Google Photos
(grids, memories, motion, onboarding), Slidebox (gesture sorting).

For each: onboarding flow, home layout, review/swipe interaction, duplicate
comparison, delete confirmation, empty states, progress feedback.

Write one short **Adopt / Adapt / Avoid** table into `docs/REDESIGN.md`.
**Avoid**: paywall nags, ads, guilt-driven storage alarms ("Your phone is
almost full!"), streaks and leaderboards, anything that pushes deletion.
→ Bildklar shows a **day streak** on the clean-up card (`HomeView`
`CleanupCard`, `src/logic/streak.ts`): remove it from the UI; delete
`streak.ts` and its test only if nothing else uses them.

Then write the plan, mapped onto real files, in `docs/REDESIGN.md` (a new
top section, dated), and list the **biggest UX problems you see today**
(from the screenshots, not from memory).

## Phase 2 — The first 5 minutes (highest priority)

### 2.1 Welcome (new, first start only)
3–4 short, **skippable** pages (*Überspringen* on every page, a page
indicator, swipe or *Weiter*), each with a real-looking photo illustration
and one line of text:

| DE | EN |
|---|---|
| Ordnung in Zehntausenden Fotos | Order in tens of thousands of photos |
| Reisen – für dich gefunden | Trips, found for you |
| Das beste Foto vorgeschlagen. Du entscheidest. | Best shot suggested. You decide. |
| Privat: Alles bleibt auf deinem Handy | Private: everything stays on your phone |

(Arabic too — see *Must stay true*.)

- **No user photos before access is granted.** The demo photos must never
  reach a native build (`perf-check` fails), so ship a few small, licence-clean
  images (e.g. 4–8 CC0 photos from the test library, WebP, a few KB each) in
  `src/assets/welcome/`, or compose illustrations from shapes and photo
  frames. Keep the main bundle within budget: the welcome is lazy.
- Each page animates what it says: photos settling into a grid; a stack
  of photos becoming a trip card; a series where one photo gets the
  *Vorschlag* badge and a finger taps another; a lock / phone outline with
  "no cloud". Short, soft, and static under reduced motion.
- Whether the welcome was seen: a `bildklar-*` localStorage key (a view
  preference, like the theme — if iOS clears it, the welcome showing again
  is harmless). *Von vorn anfangen* does not reset it.

### 2.2 Photo access (rework `PermissionView`)
Explain in plain words **why** access is needed (to find trips and similar
photos *on the phone*; nothing is uploaded; nothing changes without you).
Offer both paths and handle both gracefully:
- **All photos** — the full experience.
- **Selected photos** (iPhone *Limit Access*, Android 14+ *Select photos*) —
  say honestly what it means (Bildklar only sees what you pick, so trips and
  duplicates may be incomplete) and keep *Fotos auswählen* reachable on home.
- **Denied** — no dead end: why, and *Einstellungen öffnen*.

### 2.3 The first scan (a moment, not a wall)
The scan must keep not blocking the app (`docs/REDESIGN.md`: home fills in
while it runs). For the **first** scan only, show a calm scanning screen:
- live progress and **results counting up** — trips, similar groups,
  duplicates, screenshots — from the facts `store.ts` already re-reads, plus
  the ETA from `src/logic/eta.ts`;
- the wait used to explain the features: a few cards rotating (trips,
  similar groups, months, the bin, privacy), each one sentence + a small
  animation;
- *Schon mal umsehen* / *Look around meanwhile* → home, where the slim scan
  card carries on. Later scans stay as they are (the slim card).

### 2.4 First result reveal
When the first scan is done (or enough is found), one overview: what was
found per category with its potential space, in the same calm units as home
(no red, no alarm), and **one recommended first action**, e.g.
*12 Gruppen ähnlicher Fotos durchsehen* / *Review 12 groups of similar
photos* — chosen by the same logic as the `NextStep` card, not a new rule.
A quiet second option: *Erst mal umsehen* / *Just look around*.

### 2.5 Guided first review
On the **first real cards** of the first review, an interactive tutorial
(`ReviewView`):
- the gestures as they really are: **right = keep**, **left = mark for
  deletion** (*Löschen vormerken* — never "delete"), **up = decide later**;
  a hand/arrow hint that the user performs, one gesture per card, each
  confirmed with a short haptic and a word;
- point out the buttons beside the swipe and **undo** (*Rückgängig*);
- explain the **suggested best** badge (*Vorschlag der App*) vs **your
  choice** in a group;
- end with a **celebratory, calm summary**: what was marked, the space it
  will free, *and* the next step: "they wait in *Zum Löschen vorgemerkt* until
  you confirm". A soft check animation and number count-up, no confetti
  rain, no streak.

### 2.6 Safety moments
- **Before the first real deletion** (the bin's sheet in `BinView`), once:
  three safety nets explained in one small illustration — *1. You mark →
  2. You confirm here → 3. Android/iPhone asks again*, then the photos sit in
  the system's **Trash / Recently Deleted for 30 days**. Use `androidStrings`
  for the Android wording.
- **Protection**, once, the first time it matters (e.g. after the first
  review or on the first group): favourites are never suggested; how to
  protect a photo, a trip or a folder/album (`src/logic/protect.ts` —
  nothing new, just shown).

### 2.7 Contextual tips (coach marks)
One-time tips the first time a feature is opened: trips, months, the bin,
quick clean, search, a group comparison, the widget, the weekly reminder.
- **Never more than one tip at a time** (a small queue in one place, not
  per screen); a tip points at the real control, is dismissible with one
  tap, never blocks the screen, and is read by TalkBack/VoiceOver.
- One shared primitive in `src/ui/` (e.g. `Tip`) plus a list of tips in one
  module — no screen builds its own.
- **Settings → *So funktioniert Bildklar* / *How Bildklar works***: replay
  the welcome, the review tutorial and every tip.

### ⏸ Checkpoint
Commit, then **stop and send me** before/after screenshots of: welcome (all
pages), permission, first scan, result reveal, the guided review and its
summary, the first-delete explanation — in German, day and night, iPhone SE
and a 430 px phone, plus one at large font size. Wait for my OK.

## Phase 3 — App-wide polish

**Home (*Aufräumen*)** — keep its structure, make it clearer: a short
greeting by time of day (no name — there is no account); the storage
overview; **one clear "continue" card** (the existing `NextStep`, made the
obvious first thing to do); categories with photo, count and size; *An
diesem Tag* and month progress where they help; trips stay on *Ordnen* as a
carousel or tiles — decide and justify.

**Review** — full-bleed photos; similar shots side by side or stacked
(`GroupView`'s uncropped viewer); **pinch/zoom to check sharpness**, if not
there yet; *Vorschlag der App* and *Deine Wahl* clearly distinct in shape
*and* colour (not colour alone); labelled buttons beside every swipe; a
**persistent undo snackbar** (`Toast`) after each decision.

**Confirmation** (`BinView` and every sheet that confirms) — a bottom sheet
with thumbnails, the count and the total size; calm wording; the
destructive colour **only on the final action**.

**Trips** — photo-cover cards with place and date; rename, hide and every
trip action that exists today reachable from one clear menu or sheet. If
merge or split need logic `src/logic/trips.ts` doesn't have, don't invent
it — list it under open issues.

**Empty states** — every list, category and the bin: a friendly
illustration, one line of explanation, and the next action (`Empty`).

**Motion and modern details**, translated to our stack:
- shared-element transition from a grid tile to the viewer (`motion`
  `layoutId`);
- springs on the swipe card with tilt and colour/stamp hints (refine what
  `ReviewView` has); haptics on decisions (`src/ui/haptics`);
- animated progress rings for months and the scan; numbers that count up;
- skeleton loaders instead of blank space while facts or thumbnails load;
- edge-to-edge with safe areas; the collapsing large title (`Screen`);
- the system back gesture consistent everywhere (Android back button →
  the `pushed` stack). Predictive back's preview animation only if it needs
  no new dependency; otherwise an open issue;
- **no Material dynamic colour** (the WebView can't follow the wallpaper
  without native work): the warm "Album" palette is the palette;
- transform and opacity only; everything collapses under reduced motion
  (`MotionConfig`); no motion on list scrolling.

**Design system** — the components, spacing scale, typography roles and the
states above live in `src/ui/` and `docs/DESIGN.md`; selection, protected,
suggested, your-choice and marked-for-deletion look the same on every
screen.

## Must stay true (from `CLAUDE.md`)

- **Don't change** detection logic, deletion safety, the bin/trash
  behaviour or the privacy guarantees. Marking for deletion is never red and
  never a trash icon; red is only for what really deletes. Every delete =
  the user's tap **and** the system dialog; protected photos are never
  suggested; dry run stays on in debug.
- No network, analytics, ads, accounts or fonts from the network
  (`check:privacy`). No heavy new dependency without justification — use
  `motion`, Tailwind and `lucide-react`, which are already here.
- No router (`pushed` in `App.tsx`), no global store library; new screens
  are `XxxView.tsx`, lazy unless home needs them at once; shared pieces in
  `src/ui/`; grids stay virtualised (`PhotoGrid`), thumbnails via `fileUrl()`.
- Colours, radii, shadows, easings only as tokens in `src/index.css`; no
  `backdrop-filter`, no `filter: blur`, no `hover:`; `npm run audit:contrast`
  after every colour change.
- **Every new string in `de`, `en` and `ar`** (`src/translations.ts` /
  `translations.ar.ts`, same `{placeholders}`); counts with `plural()`,
  sizes with `bytes()`; Arabic `_two`/`_few` in `EXTRA_PLURALS`; strings
  naming the iPhone, Photos, albums or *Zuletzt gelöscht* get their
  `androidStrings` twin. Logical spacing for RTL; the swipe's buttons and
  stamps stay physical.
- Light and dark; labels for TalkBack/VoiceOver on every photo and icon
  button; touch targets ≥ 44 px (48 px for anything new); type in rem so
  large fonts work (`dynamicType.ts`); German strings are long — let them
  wrap, never truncate a button.
- The screenshot, App Review and privacy scripts must get past the new
  first-run flow (e.g. they mark the welcome and tips as seen) — fix
  `scripts/lib/shots.mjs`, `scripts/privacy-check.mjs` and
  `ios/AppReviewRecorder/scenes.json` as needed.

## How to work

Branch `redesign-first-run` off `main`, **one commit per finished step**
(commit style from `CLAUDE.md`). Small, reviewable steps: Phase 0 → research
& plan → welcome → permission → first scan → reveal → guided review →
safety moments → tips & *So funktioniert Bildklar* → ⏸ → home → review &
groups → confirmation → trips → empty states → motion pass.

After **every** step: `npm run check` (lint, tests, build, privacy,
performance, contrast, store texts), and look at the result (Phase 0.5).
Native code changed → `npm run test:android` / `npm run test:ios`.

**Walk through** in both themes, in German, at large font size (plus one
pass in Arabic for RTL), on the Android emulator if available, otherwise
the dev server at phone width:
- fresh install → welcome → access → first scan → reveal → guided review →
  bin → delete (dry run);
- home → trips → a trip;
- months.

At the end: `npm run ui-review`, `npm run screenshots` (and `-- --android`),
`npm run rehearse:app-review`; update `docs/features.md`, `docs/DESIGN.md`,
`docs/REDESIGN.md`, `CLAUDE.md` (*Styling*), the What's New in
`store/listing.md`, and `docs/TODO.md` for anything only I can do. Merge into
`main` with `git merge --no-ff` once everything passes; **never push**.

## Report

1. The research table (Adopt / Adapt / Avoid).
2. What changed and the key files.
3. What you verified (commands, flows, themes, languages, font sizes) with
   before/after screenshots.
4. Open issues and decisions left for me.
