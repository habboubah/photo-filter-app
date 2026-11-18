# Changelog

What changed and what left, newest first — so `docs/features.md` can say
only how the app is now. (Started 18 November 2026; older history is in git.)

## 18 November 2026, evening — the review and improvement plan

Project doc *Bildklar – review and improvement plan* (claude.ai artifact) and
`claude/app-review-plan.md`.

- **Fewer paths.** *Jetzt aufräumen* opens quick clean; the clean-up screen
  that listed the kinds a second time (`CleanupView`) is gone, its *Alle
  durchgehen* moved into quick clean. *Missglückt* is one grid with a reason
  chip instead of three tabs. *Ähnliche Videos* is a *Fotos · Videos* switch
  on *Fast gleiche Fotos*, no longer a row and a screen of its own.
  *Fotos verkleinern* opens from *Große Dateien*, not from home.
- **Two gestures.** The swipe up to decide later is gone; *Später* is a
  button. The guided review teaches two gestures; the hint line under the
  buttons shows only while they are learned. *Ähnliche Fotos zeigen* moved
  from the review card into *Groß ansehen*.
- **Honest numbers.** *357 MB könnten weg* (was *können frei werden*); on the
  iPhone a line that iCloud-only originals free iCloud; the delete sheet and
  home say the space comes back once *Zuletzt gelöscht* / the Trash is emptied.
- **Marking is never red.** The group card's *Ohne Stern vormerken* is teal
  with the archive (red from that afternoon until the evening); *Rest
  vormerken* instead of *Die anderen zum Löschen vormerken*.
- **Coming back.** The *Seit …* card, the new-trip card, the reminder offered
  once, the rating after two real deletes (iPhone: StoreKit's prompt through a
  new native `requestReview`).
- **Gone:** the streak's state (`AppState.days`, `src/logic/streak.ts`): nothing
  had shown it since the afternoon. Old decision files still load (the field
  is ignored).
- `DRY_RUN_IN_RELEASE` is `false` again.
- `App.tsx` lost the albums, the photo and video tools and the widget to
  `src/useAlbums.ts`, `src/useMediaTools.ts`, `src/useWidget.ts`.
- Store texts lead with trust; an Arabic listing; release notes in
  `release-notes/2.0.16/`.

## 18 November 2026 — moved out of features.md

- (*The one next step* — a large photo card such as *Ein guter Anfang ·
  Unwichtige Fotos · Ansehen* — left home on 18 November 2026: the same
  categories are rows in *Vorschläge*. The reveal after the first scan still
  recommends one step.)
- **One next step**, a card made of its photos with one button; why it is
  the step (*Ein guter Anfang*, *Weiter, wo du warst* …) is a small label on
  its photo:
  - progress exists (a month gone through) → the next month not gone through,
    newest first: *Weiter, wo du warst · Oktober 2026 · 148 Fotos · 12 %
    deiner Mediathek durchgesehen* → **Weiter mit Oktober 2026** (and *Alle
    Monate*);
  - else photos wait on the decide-later pile → *Noch offen · Später
    entscheiden* → **Jetzt entscheiden**;
  - else the category that frees the most → *Ein guter Anfang · Fast gleiche ·
    11 Fotos · bis zu 32 MB* → **Ansehen**;
  - else month by month from the newest month → **Mit November 2026
    anfangen**; with nothing at all, *Alles aufgeräumt*.

- (*Weitermachen* [Carry on] is gone since 18 November 2026: its two rows
  moved into *Mehr Platz*.)

- (*Aus deiner Mediathek* — On this day and the latest trip as small tiles —
  left *Aufräumen* on 18 November 2026: both live on *Ordnen*.)
