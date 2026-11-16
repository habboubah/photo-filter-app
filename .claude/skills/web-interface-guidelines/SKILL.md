---
name: web-interface-guidelines
description: Review UI code against Vercel's Web Interface Guidelines (accessibility, focus, forms, touch, safe areas, animation, typography, i18n), pinned locally and adjusted to Fotonest's native-iOS rules. Use when asked to review UI code, check accessibility or touch behaviour, audit a component or screen, or before calling a UI change done.
argument-hint: <file-or-pattern>
---

# Web Interface Guidelines (pinned, Fotonest edition)

The rules are in [reference/command.md](reference/command.md): Vercel's
guidelines, copied unchanged at a pinned commit (see SOURCE.md). Never fetch
them from the network; this copy is the one to use.

## How to review

1. Read `reference/command.md` in full.
2. Read the files named in the argument (or ask which files; for a whole
   screen, include its `src/ui/` primitives).
3. Check every rule, with the overrides below applied first.
4. Report in the `file:line` format `command.md` describes, grouped by file,
   terse. `✓ pass` for a clean file.

Precedence: **CLAUDE.md, then the overrides below, then `command.md`.**

## Overrides for this app

Fotonest is a client-only React app inside an iOS or Android web view
(Capacitor), with no router, no server and native-iOS styling rules. Its
photos come from the native plugin (`src/native/photoLibrary.ts`) as
`convertFileSrc` URLs, never as base64. These rules from
`command.md` change or don't apply:

| Rule in command.md | Here |
|---|---|
| Buttons/links need a `hover:` state | **No `hover:` styles** — they stick after a tap on touch (CLAUDE.md). Feedback comes from `active:` states, haptics and motion. Flag any `hover:` you find. |
| Title Case for headings/buttons | **Sentence case** in every language (iOS convention; German capitalises nouns by grammar anyway). |
| URL reflects state / deep-link all stateful UI / `<a>` for navigation | **Doesn't apply.** No router by design: `App.tsx` holds the `pushed` stack. Rows are `<button>`s. |
| Hydration safety | Doesn't apply (no server rendering). |
| `autoFocus` sparingly, avoid on mobile | **One deliberate exception:** the rename sheet of a trip focuses its name field (`ui/Field` focuses with `preventScroll`). Flag any other autofocus. |
| Preconnect for CDN domains, preload critical fonts | Doesn't apply: the bundle may load nothing from a third party (CI fails the build if it does). |
| Detect language via `Accept-Language` / `navigator.languages` | First run follows the device language; later it's the user's choice in Settings. Fine as is. |
| Curly quotes `“ ”` | Per language: German „…“, English “…” (Arabic «…» once it has texts). |
| `&` over "and" where space-constrained | English only; never in German copy. |
| Large lists (> 50 items): virtualize | **Applies with force**: a library has up to 50,000 photos. Photo grids go through `PhotoGrid` (`src/ui/Photo.tsx`, virtualized rows); lists of groups or trips are paged (`SimilarView` shows 40 at a time). Flag any `.map` over photos that renders them all, and any thumbnail loaded outside `useThumb` (`src/thumbs.ts` queues them, newest first). |

Everything else applies as written — especially focus states, form inputs
(`inputmode`, labels, `autocomplete="off"` on non-auth fields),
`overscroll-behavior: contain` in sheets, `touch-action: manipulation`,
safe-area insets, `prefers-reduced-motion`, `transform`/`opacity`-only
animation, `Intl.*` for numbers and dates, and gesture-only actions needing
a tap and keyboard alternative.

Also check, from CLAUDE.md: logical properties only (`ms-`/`me-`/`start-`/
`end-`, never `left`/`right`), `num` only on pure numbers, colours only from
tokens (the "Album" set in `src/index.css`), touch targets in px (`h-tap`,
`min-h-control`), every destructive action behind the system's own
confirmation (and, in debug builds, the dry run), and nothing that writes to
the photo library without the user's tap.
