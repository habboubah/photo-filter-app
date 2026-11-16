# CLAUDE.md

Steering file for AI assistants working in this repository: where the code
lives, the rules it follows, and what to check before a change is done.

Shoppinglist is built the same way as its sibling Spartopf (`../budget-app`): the same
architecture, the same settings, the same release and screenshot tooling and
skills. When a convention is missing here, budget-app's `docs/CLAUDE.md` is the
reference — **except for the look**: since 14 November 2026 Shoppinglist has its own
design ("Tüte" since the night of 14 November 2026, before that "Knete" and "Glas"; see *Styling*), and a change to it is made here only. This file stays at the root so it is loaded by itself; every other
document lives in `docs/` (only `README.md` and this file stay at the root):

| File | What it is for |
|---|---|
| `README.md` | Only the commands: setup, run, build, check, screenshots, release. Keep it that short — anything to explain goes into `docs/` |
| `docs/DEVELOPMENT.md` | The project layout, the single checks, icons, the web app, the share page, adding a language |
| `docs/features.md` | Every feature, as the user sees it |
| `docs/PLAN.md` | The concept and the data model |
| `docs/TODO.md` | What only Ahmad can do: devices, Xcode, Android Studio, the stores |
| `docs/APP_STORE_RELEASE.md`, `docs/ANDROID_RELEASE.md` | The store releases step by step |
| `store/listing.md` | Every store listing text, App Store and Google Play, in one file |

## What this app is
**Einkaufsliste – ganz einfach** (English *Shopping List – Nice & Easy*, Arabic
*قائمة مشتريات التسوق البسيطة*; code name **Shoppinglist**): a client-only React + Capacitor shopping list. Lists per shop or purpose,
items with pictures, suggestions per list type, tick-off while shopping.
**No backend, no account — everything is `localStorage`.**

## Stack
- React 19 + TypeScript (strict), Vite 6, Tailwind CSS 4, `lucide-react`, `motion`.
- Capacitor 8 wraps `dist/` into the `ios/` and `android/` native projects.
  `vite-plugin-pwa` makes the web build installable and offline.
- npm only.
- **Dependencies are pinned to exact versions** (no `^`/`~`). `npm run check`
  runs `npm audit --omit=dev --audit-level=high`. Before adding one: prefer the
  platform and what's already here; read the package's recent releases, open
  issues and licence; pin the exact version.
- **Privacy and security.** The app talks to nobody: `scripts/privacy-check.mjs`
  drives the built app and fails on any request to another origin, and every
  URL in the bundle must be on its allowlist. Production builds carry a
  Content-Security-Policy (`vite.config.ts`). No `console.*` in app source
  (`check:security`) — user data must never land in a log. Opening the store,
  Mail or the privacy policy goes through `openExternal()` in `src/links.ts`,
  only on a tap.

## Architecture rules (mirrors budget-app and pizza-driver-log)
- **No router.** `App.tsx` holds one state per pushed screen. The `pushed`
  array is the nav's single source of truth (back gesture, scroll reset) and
  must match the render ternary.
- **No global store library.** All state lives in `useAppStore()` in
  `src/store.ts`, mirrored to `localStorage` (`shoppinglist-*` keys) via `useEffect`.
  Immutable updates only.
- **Screens** live in `src/components/XxxView.tsx`; forms shown in a bottom
  sheet are `XxxSheet.tsx`. Named exports, `Props` interface above.
- **Shared primitives** live in `src/ui/` (`Screen`, `Group`, `Row`, `MenuRow`,
  `IconTile`, `Next`, `Away`, `Dock`, `Sheet`, `Confirm`, `Button`,
  `IconButton`, `Field`, `Segmented`, `Picture`, `Bag`, `Toast`, `haptics`,
  `useKeyboardInset`…) — budget-app's kit in Shoppinglist's look. Compose them
  instead of hand-rolling markup; when one is missing, port budget-app's and
  restyle it rather than inventing it.
- **View preferences** (language, theme) are `shoppinglist-*` keys
  of their own in `store.ts`; they are not part of a backup.
- **Platform**: `src/platform.ts` (`isNative`, `isAndroid`, `isIos`) says which
  app we run in. Never sniff the user agent for behaviour.
- **Pure logic** goes in `src/logic.ts` and is tested in `src/logic.test.ts`.
- **Sharing** is `src/share.ts` (tested in `share.test.ts`): a list is encoded
  into the link's `#` part, decoded through `normalizeState` like a backup.
  Keep the format in step with `store/share/index.html`, which decodes it in
  the browser; bump the `1.` prefix if it ever changes shape.
- **Default catalogue** lives in `src/data/defaults.ts` (types, suggestions in
  every language, aisle sections). Add items there, not in components.
- Data from storage or a backup goes through `normalizeState()` first. Add new
  fields as optional; bump `SCHEMA_VERSION` and migrate in `normalizeState`
  when a shape changes.
- IDs are generated with `uid()` from `logic.ts` by callers, never by the store.

## The name (14–15 November 2026)
- **15 November 2026**: the first names, *Die einfache Einkaufsliste* and
  *The Simple Shopping List*, were refused by App Store Connect — another
  developer holds them without publishing an app, so no store search shows
  them. The names below are the ones Apple accepted. Only App Store Connect
  can say whether a name is free: try a new name there before it goes into
  the code.
- The store name and the name in the app follow the language: **Einkaufsliste –
  ganz einfach** (de), **Shopping List – Nice & Easy** (en), **قائمة مشتريات
  التسوق البسيطة** (ar) — `appName` in `translations.ts`, the store listings, the
  privacy pages and the share page. On the home screen it is short:
  Einkaufsliste / Shopping List / قائمة التسوق (`ios/App/App/<lang>.lproj/
  InfoPlist.strings`, `android/app/src/main/res/values*/strings.xml`).
- A sentence that would name the app says "die App" / "the app" / "التطبيق"
  instead — the long name does not decline in German.
- The code name is **shoppinglist** (Ahmad renamed it from "Korb" on 14
  November 2026, everything but the bundle ID): the package name, the
  `shoppinglist://` scheme, the `shoppinglist-*` storage keys and the
  backup's `app: 'shoppinglist'`. What an earlier version left behind still
  works and must keep working: `korb-*` keys move over at start
  (`migrateStorageKeys` in `logic.ts`, called in `store.ts`), a backup with
  `app: 'korb'` still imports, and both native apps still take `korb://`
  links.
- **"korb" stays** in the bundle ID and package `com.habboubah.korb` (the
  stores know the app by it) and in the Android upload key's file name and
  alias (`korb-upload.jks`, `korb` — the key Play has). "Im Korb" in the UI
  is the basket, not the name.
- The privacy and share pages live at `…/privacy-policy/shopping-list/`
  (renamed from `korb/` on 14 November 2026, with no redirects). Apps up to
  1.0.3 still link to `korb/`, which now returns 404.

## i18n
- `src/translations.ts`: one flat object per language (`de`, `en`, `ar`).
  Default `de`; first run follows the device language. Add every key to every
  block, with the same `{placeholders}` (a test checks both).
- Components get the strings as `t` (`stringsFor(language)` in `App.tsx`).
  Never inline `language === 'de' ? …`.
- **Android's wording**: a string that names iOS, iCloud or another Apple
  thing gets a twin in `androidStrings` (same file), laid over the language in
  the Android app. `links.test.ts` fails when one is missing.
- Default suggestions carry a name per language (`names`); user-added ones carry
  only the name typed, and `displayName()` falls back sensibly.
- Long German compounds get `wrap-compound`, never `truncate`.
- Arabic (`dir: 'rtl'`): use logical spacing (`ps-`/`pe-`/`start-`/`end-`),
  flip directional icons with `rtl:rotate-180`, and phrase counts as
  "label: {n}" so nothing has to agree with the number.
- Search goes through `searchForm()` / `searchNames()` in `logic.ts`, which fold
  Arabic spelling (marks, hamza, ة/ه, ى/ي, the article ال). A catalogue row's
  Arabic field may add search-only synonyms after `|`.
- Built-in types stored by an older version get new languages filled in by
  `fillBuiltinNames()` on load; never overwrite a name the user changed.

## Styling — "Tüte": the bag from the icon (Shoppinglist's own look)
- The look (14 November 2026, Ahmad picked it from three mockups — Zettel,
  Etikett, Tüte; it replaces "Knete") takes its colours from the app icon: a
  peach page, white cards, aubergine ink, coral for what you tap. Flat and
  soft: no bevels, no gradients on fills, no shadow on a card. The bag from
  the icon is the basket. Titles and numbers in Baloo 2 (Baloo Bhaijaan 2 in
  Arabic), text in Nunito. Read the `apple-design` skill before changing
  interaction or motion.
- Tailwind utilities inline. **All colours, radii, shadows, fonts and easings
  come from tokens in `src/index.css`** — never a literal hex in a component
  (`text-on-color` is the white ink on the swipe band).
- Text `text-fg` / `text-fg-mute` / `text-fg-faint`, action `text-accent` /
  `bg-accent-fill` + `text-accent-fill-ink` (coral with white by day; at
  night the icon's peach with aubergine ink). Layers: `bg-bg` the page (peach
  by day, dark plum at night); `bg-surface` a card, a sheet, a dialog, a
  round bar button; `bg-surface-2` a fill on either (an input, a chip, a
  quantity badge, a track). **A card on a page is `rounded-md card`** (or
  `rounded-lg`): never a border or a shadow on it. On a sheet (white itself)
  `card` turns to the page colour by itself (`--card`, set in `ui/Sheet`).
  Anything that takes a tap carries `press`.
- Beside the accent: `bg-ok` + `text-ok-ink` is "in the bag" (a ticked
  circle, the count on the bag); `bg-peach` + `text-peach-ink` is the icon's
  own peach for small marks (the plus of the add field); `border-rim` is the
  ring of an unticked circle.
- **Only what floats casts a shadow**: `shadow-e2` under a docked button and
  a toast, `shadow-e3` above a sheet. **No `backdrop-filter`, no `filter:
  blur` anywhere** (it keeps Android's WebView fast).
- **The accent is fixed**: coral, the icon's. Ahmad took the colour choice
  out of the settings on 14 November 2026; `store.ts` still drops the old
  `shoppinglist-accent` key and sets `data-accent`, which nothing in the CSS reads.
  After touching any colour, run `npm run audit:contrast` — it must pass.
- **The bag** (`ui/Bag`: `Bag` and `useBag`) is the app's icon standing in
  the app, and its signature: in a list's dock it carries the count of what
  is ticked (a tap scrolls to "Im Korb"), in shopping mode it sits in the
  head; **a ticked item's picture hops from its row into the bag**, which
  takes it with a small squash (`gulp`). With reduced motion nothing flies.
  The icon (`/icon.png`) is also the brand on home, the picture of an empty
  home (`Empty` without an emoji), the "all done" card and the crash screen —
  never draw another bag or basket glyph.
- **Type**: Baloo for titles and numbers — `display` (large title
  `text-title font-extrabold`, card headings `text-heading font-bold`),
  `rounded-num` (tabular, left to right) for a number read at a glance,
  `rounded-text` for a short sentence with numbers ("6 von 14" — it keeps the
  page's direction). Everything else is Nunito (`font-sans`); labels and
  buttons take `font-bold` / `font-extrabold`. All three fonts are
  **bundled** (`src/assets/fonts/`, Latin subsets and Baloo Bhaijaan 2's
  Arabic one, OFL): never load a font from the network. Arabic body text
  falls through to the system font. `eyebrow` is a sentence-case caption,
  not uppercase.
- A list's colour: put `data-hue={list.hue}` on an element, then paint with
  `bg-hue-bg` / `text-hue-ink` (`text-fg` also passes on `bg-hue-bg`). Its
  hue is identity, not decoration: its tile on home, its picture's tile, its
  progress track, shopping mode's head, a settings `IconTile`. Rows, chips
  and quantity badges are neutral (`bg-surface-2`), so a list reads calm.
- **Home** (Ahmad picked this layout): the app's icon, name and version small
  over the title *Deine Listen* and the two counts; the lists as flat pastel
  tiles, the first one wide, the others in pairs (one left over at the end
  takes the row); *Neue Liste* a coral capsule in `ui/Screen`'s `<Dock>`.
- Settings rows: `Row` / `MenuRow` in a `Group`, each with an `IconTile` in
  its own colour so a row is found by it; `Next` (a count, then ›) when it
  pushes a screen, `Away` (↗) when it leaves the app. Destructive rows last
  and on their own.
- **What a screen does floats at the bottom, in thumb reach**: home's
  *Neue Liste* (the settings are a round button in its top corner) and a
  list's bag and *Einkauf starten*, each in `ui/Screen`'s `<Dock>`. Pair it
  with `<Screen docked>`; the undo toast is raised above it.
- **A list's add field is at the top** (Ahmad, 14 November 2026): a white
  pill under the title (`AddBar`) with the plus on a peach disc, then a few
  suggestions (`SUGGESTION_LIMIT`, chips that wrap; never a rail to swipe)
  and *Alle Vorschläge*. Typing swaps the suggestions for a card of results.
- **Items are rows of their aisle's card** (`ItemRow`: no gap between them,
  the first and last carry the card's corners, a hairline from the picture
  on) and **each shows its edit (pencil) and delete (bin) buttons** at its
  end (Ahmad, 14 November 2026 — never hide them again); long press and
  swipe stay as shortcuts. Shopping mode leaves both buttons out.
- **"Im Korb" is the bag's contents** at the end of a list (`Basket` in
  `ListView`, `#in-basket`): ticked items as round tiles with their picture
  and name on a tinted panel; a tap puts one back, a long press edits it.
- **Shopping mode**: the head in the list's colour (the bag, "6 von 14", the
  track), the *Als Nächstes* card (*In den Korb* / *Später*; put-off items
  come back once every other item has had its turn), then the big rows.
- Motion: short and soft (`--ease-out-soft`, `--ease-spring`). A screen's
  cards rise a few pixels into place (`rise-children` on `Screen`'s
  `<main>`; home brings its tiles in itself, `<Screen still>`); a pushed
  screen slides; springs with little bounce, so a touch can take over
  mid-way; nothing loops. Transform, opacity and clip-path only. All of it
  collapses under reduced motion.
- Type scale in rem (follows Dynamic Type); touch targets in px
  (`min-h-control`, `h-tap`, `w-tap` — 44 px). Layout margins are physical
  (`px-[16px]`, `gap-[12px]` in `Screen`, `Row`): iOS keeps its margins when
  text grows.
- Emoji always through the `emoji` utility (or `ui/Picture`).
- No `hover:` styles (sticky on touch).
- Anything fixed to the bottom pads with `safe-bottom` / `pb-dock`. The safe
  area is always `var(--safe-area-inset-*, env(safe-area-inset-*))`: Capacitor
  sets the variable on Android, env() answers everywhere else.

## Native iOS
- The app uses the **UIScene lifecycle** (`ios/App/App/SceneDelegate.swift` +
  `UIApplicationSceneManifest` in `Info.plist` + the scene hook in
  `AppDelegate.swift`), per Capacitor's 8.5 migration guide. Built with the
  iOS 27 SDK, an app without it is killed at launch inside
  `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`. Never
  remove it; `scripts/release.js` refuses to ship without it.
- Keep `@capacitor/core`, `@capacitor/ios` and `@capacitor/cli` on the same
  version, ≥ 8.5 (that's where `SceneDelegateProxy` exists).
- URL opens / continue-activity belong in `SceneDelegate`, not `AppDelegate`.

## Native Android
- `android/` is Capacitor's project with budget-app's build setup: the version
  and version code come from `package.json` (1.2.7 → 1020700, plus
  `ANDROID_BUILD`), the upload key from the environment
  (`scripts/release-android.js`), R8 on for release builds
  (`proguard-rules.pro` keeps Capacitor and the plugins whole). No Google
  services, no Firebase.
- Keep `@capacitor/android` on exactly the same version as `@capacitor/core`
  and `@capacitor/ios`.
- `shoppinglist://` links (and the older `korb://` ones) arrive through the intent filter in `AndroidManifest.xml`
  (`src/ui/incoming.ts` handles both platforms). Portrait only.
- The icon, the adaptive icon and the splash screens are rendered from
  the icon picture `assets/icon-source.png` (Ahmad's shopping bag, 14 November 2026; `icon-source-android.png` is the same picture smaller, for Android's round mask): `node scripts/icon-assets.mjs && npm run assets:generate`. The app shows it as `public/icon.png`.
  Change the canvas colours there (and in `package.json`'s `assets:generate`)
  when `--t-bg` changes.
- It compiles (CI builds a debug APK), but anything that needs Android itself
  — insets, back, sharing, the camera — is on `docs/TODO.md` until it has been
  tried on a phone.

## Accessibility
- Text 4.5:1, icons 3:1 (`npm run audit:contrast` checks both themes and
  every list hue — on the page, on a card, on a fill and on a list's tile). `text-fg-faint` only for placeholders / done items.
- Every icon button has a label naming its row: `${t.deleteItem} — ${name}`.
- Pinch-zoom stays enabled. Motion respects reduced motion (`MotionConfig`).

## Commands
| Task | Command |
|---|---|
| Dev server | `npm run dev` → http://localhost:3001 |
| Type-check | `npm run lint` |
| Unit tests | `npm test` |
| **All the gates** (before a release, in CI) | `npm run check` |
| Privacy check / bundle budget / contrast / security alone | `npm run check:privacy` / `npm run check:perf` / `npm run audit:contrast` / `npm run check:security` |
| Web build | `npm run build:web` |
| Build + open Xcode | `npm run build:ios` |
| Build + open Android Studio / a debug APK | `npm run build:android` / `npm run android:debug` |
| Regenerate icons and splash screens from `assets/icon-source.png` | `node scripts/icon-assets.mjs && npm run assets:generate` |
| Screenshots of every screen before and after a UI change | `npm run ui-review` (German day and night on an iPhone Pro Max and an iPhone SE, Arabic day and night, a 360-wide Android phone → `screenshots/review/`) |
| Store screenshots: raw captures (DE + EN) / the framed App Store and Play sets | `npm run screenshots` / `npm run store-screenshots` |
| App Store preview video: film the app, lay the captions over it, export and check (DE + EN) / the video again from the same film | `npm run app-preview` / `npm run app-preview -- --compose` (once per Mac: `brew install ffmpeg`; → `screenshots/store/app-preview/`) |
| App Review screen recording: check the scenes against the code / record on the connected iPhone | `npm run rehearse:app-review` / `npm run record:app-review` (`ios/AppReviewRecorder/README.md`) |
| Release to both stores on one version (TestFlight + Play's internal test track) | `npm run release` (preview: `npm run release:dry`) |
| One store only | `npm run release:ios` (first upload: `npm run release:first`) / `npm run release:android` (once: `npm run android:key`; only the bundle: `-- --no-upload`) |

The screenshot scripts find their buttons by the app's own strings
(`scripts/lib/shots.mjs` loads `src/translations.ts`), so a renamed label
can't break them — but a changed flow can: after changing how a screen is
reached, run `npm run screenshots`.

**The app preview video** (`.claude/skills/app-preview-video/`, 15 November
2026, built the way Bring!'s is): `npm run app-preview` films the built app
from a storyboard — real taps, at 886 × 1920 — lays a caption per chapter, a
light on a part of the screen, touch dots and an end card over it, and checks
the file against App Store Connect's specification. The storyboard
(`config/storyboard.mjs` there) finds its buttons by the app's own strings,
like the screenshot scripts, so a renamed label can't break it — but a
changed flow stops the film: after changing a screen it passes through (home,
*Neue Liste*, adding, ticking, shopping mode), run it and look at the contact
sheet. Its words are in `config/copy.<de|en>.json`: no price, no call to
action. Film the upload on the Mac. It is not the App Review recording — that
one is a real iPhone.

**The App Review recording** (`ios/AppReviewRecorder/`, Spartopf's recorder,
copied on 15 November 2026): a UI test plays `scenes.json` on the iPhone
while iOS records the screen; `npm run rehearse:app-review` plays the same
file against the web build. Its steps are the app's **English labels written
out**, so a change to a screen, a label or a flow the recording passes
through means a change to `scenes.json` — run the rehearsal after it.
`SceneRunner.swift`, the test and the three scripts know nothing about this
app: change them in step with `../budget-app`, never for one app's flow. The
recorder's README lists the six scenes (about 2–3 minutes; sharing and the
backup are left out on purpose) and what the video leaves out; the
skill is `.claude/skills/app-review-recording`.

## Releasing (only when explicitly asked)
Same pipeline as budget-app: `scripts/release.js` ships **both stores on one
version** (`--ios` / `--android` for one; no flag = both). It gates on
`npm run check`, decides the version, bumps `package.json` and the Xcode
project's `MARKETING_VERSION` together (and `CURRENT_PROJECT_VERSION` when the
iPhone ships), builds the web app once, then Android
(`scripts/release-android.js`: signed bundle → Play's internal test track
through the Play Developer API, release notes from `release-notes/`) and iOS
(`cap sync ios`, archive, upload via `ios/App/ExportOptions.plist`), then
commits and tags.
- **The version rule.** A run takes a new version unless none of the stores
  it ships to has the current one yet — then it ships that one. `patch` /
  `minor` / `major` named on the command line always bump; `--keep-version`
  re-ships (new iOS build number, next free Android version code).
- Credentials live in the gitignored `.env.release` — never print or commit
  them. Submitting for App Review and promoting to production on Play are
  manual; the script never touches production.
- Full checklists: `docs/APP_STORE_RELEASE.md`, `docs/ANDROID_RELEASE.md`;
  skill: `.claude/skills/app-store-release`.

## Before calling a change done
1. `npm run check` — it runs, in order: `lint`; `check:security` (no
   `console.*` in app source, no known high vulnerability in a shipped
   dependency); `test`; `vite build`; `check:privacy` (drives the built app —
   first run, items, shopping mode, a new list, settings, list types, a
   backup, a shared list — and fails on any request to another origin; every
   URL in `dist/` must be on its allowlist, with the reason it is harmless);
   `check:perf` (the main bundle at most 10 % over its recorded gzip size, no
   long task while typing into the add field; raise the baseline only with a
   line there saying what grew it); `audit:contrast`.
2. `npm run dev` and exercise the change at iPhone width (375–430px) and on desktop.
3. If a screen changed: `npm run ui-review` before and after, and look at
   both — day, night, Arabic, the iPhone SE and the small Android phone.
4. If the data shape changed: old `localStorage` payloads still load.
5. Keep the docs true (all in `docs/`, never a new `.md` at the root):
   - a feature added, changed or removed → `docs/features.md`, and the What's
     New text in `store/listing.md`;
   - a rule or a convention → this file;
   - anything left for Ahmad (Xcode, a device, the stores) → `docs/TODO.md`;
   - a store screen changed → its slide in
     `.claude/skills/store-screenshot-studio/config/`, and its marks (the parts
     the slide lifts out of the phone) in `scripts/lib/shots.mjs`;
   - a label or a flow of the App Review recording changed →
     `ios/AppReviewRecorder/scenes.json`, then `npm run rehearse:app-review`;
   - a screen or a flow the app preview video passes through changed →
     `npm run app-preview` (its storyboard:
     `.claude/skills/app-preview-video/config/storyboard.mjs`), and look at
     `screenshots/store/app-preview/contact-sheet-<lang>.png`.

## Commit style
Short, imperative, feature-focused summaries, no conventional-commit prefixes
(same as budget-app and pizza-driver-log).

## Committing and merging (as in budget-app, Ahmad, 13 November 2026)
- **Commit without being asked.** Work happens on a branch off `main`, one
  commit per finished step; nobody has to ask for the commit.
- **Merge into `main` when the job is finished** (`git merge --no-ff`), once
  the checks in *Before calling a change done* pass.
- **Delete the branch once it is merged** (`git branch -d`): a merged branch
  is obsolete. Never delete one that isn't merged.
- **Never push** unless Ahmad asks for it.
- Commit only your own changes: files another session is still working on
  stay out of the commit, as they are.
