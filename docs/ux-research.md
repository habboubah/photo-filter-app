# UX research — six comparable apps (18 November 2026)

What this is for: the Android brief of 18 November 2026 ("a beautiful private
photo library, not a utility pressuring people to delete things"; the test:
within five minutes a first-time user understands what Bildklar offers,
completes one useful task and knows exactly whether anything was deleted).
The earlier research (onboarding, tips, empty states, the look) is in
`docs/REDESIGN.md`; this file looks at **one concrete interaction per app**
and what it means for Bildklar.

**How it was done.** Web research only, on 18 November 2026: official help
pages and store listings first, press walkthroughs where those were thin. None
of the apps was installed or run for this — so "documented" below means
*described by the vendor's help page or store listing, or by a press
walkthrough with screenshots*, and "inference" means *my reading of what that
does to a user*. Nothing is borrowed except principles: no names, assets,
icons or whole screens.

## The six interactions

### 1. Google Photos — a photo stack's "top pick", and "Keep this, delete rest"

- **Documented** ([Google Photos Help: Organize your Photos view](https://support.google.com/photos/answer/14169846); [Google blog, Nov 2023](https://blog.google/products/photos/google-photos-organization-updates-november-2023/); [Android Central walkthrough](https://www.androidcentral.com/apps-software/how-use-photo-stacks-google-photos)):
  similar shots taken close together are grouped into one stack; the app
  picks a cover, the **top pick**, which the user can change. Opening a stack
  shows the top pick large with a **filmstrip** of the others at the foot.
  From the strip's menu: *Set as top pick*, *Remove from stack*, and **Keep
  this, delete rest** → *Move to trash*. The help page states that stacking
  alone does not change storage.
- **What the user sees / what is obvious / what next:** one large photo, the
  rest small underneath; the obvious action is to scroll the strip. Choosing
  a different favourite and clearing the rest is one menu away, not on screen.
- **Inference:** the model (the app proposes, the user overrides) is right for
  Bildklar, and so is the large-photo-plus-strip layout — Bildklar's group
  viewer already has it. What does **not** carry over is hiding "choose a
  different favourite" in an overflow menu, and comparing only by flipping
  one large photo at a time: to judge a child's expression across two
  frames, both need to be on screen at once.
- **Fit for Bildklar:** yes, adapted → the group viewer keeps the strip and
  gets a **side-by-side comparison with a shared zoom** (idea A below).

### 2. Apple Photos — Duplicates and *Merge*

- **Documented** ([Apple Support: Merge duplicate photos and videos on iPhone](https://support.apple.com/guide/iphone/merge-duplicate-photos-and-videos-iph1978d9c23/ios); [Apple Support: Delete photos on your iPhone or iPad](https://support.apple.com/en-us/104967)):
  *Collections › Utilities › Duplicates* lists each set with its copies next
  to each other and a **Merge** button per set; *Merge [n] Items* confirms.
  Merging keeps the highest-quality version with the combined metadata and
  moves the rest to *Recently Deleted*. The collection only appears when
  duplicates were found.
- **What is obvious / what next:** one button per row; after it, the row is
  gone and the extras sit in Recently Deleted.
- **Inference:** fast and safe for exact copies (the system chooses; the
  30-day folder is the net). For *similar* shots the same one-tap pattern
  would take the decision away from the user. The good part is the
  **wording that states the count and the destination** on the confirm.
- **Fit for Bildklar:** partly. Exact copies can stay one tap; similar shots
  stay a comparison. Bildklar already names count and size on every button
  that puts photos aside.

### 3. Files by Google — the *Clean* cards and "Move x files to Trash"

- **Documented** ([Files by Google Help: Delete duplicate files](https://support.google.com/files/answer/9764075); [Files by Google Help: Move files to Trash & restore](https://support.google.com/files/answer/10607740)):
  the *Clean* screen shows one card per suggestion (duplicate files, old
  screenshots, …), each with *Select files*. In a duplicate set the original
  carries an **Original** badge and the help page recommends keeping it.
  The bottom button reads **Move x file(s) to Trash**; a confirmation dialog
  repeats it. Trash can be restored from and is emptied separately.
- **What is obvious / what next:** a card → a selection grid → one button
  whose label says exactly what will happen.
- **Inference:** the badge on the one to keep and the button that counts are
  the two things that make a cleaner feel trustworthy. The "junk" vocabulary
  and dashboard of equal cards are what Bildklar avoids.
- **Fit for Bildklar:** yes for the labels (already in place: *Vorschlag der
  App* / *Deine Wahl*, buttons with count and size); no for the card wall
  (home stays one next step, then compact rows).

### 4. Slidebox — swipe up to trash, and an in-app trash emptied later

- **Documented** ([Slidebox on the App Store](https://apps.apple.com/us/app/-/id984305203); [TechCrunch on the Android launch](https://techcrunch.com/2016/04/11/slidebox-brings-its-tinder-like-photo-management-app-to-android)):
  full-screen photos; swipe up to trash, tap an album to file, swipe between
  similar photos to compare, undo. TechCrunch: the photo is only *marked* as
  trash inside the app; nothing happens outside it until the user **empties
  the trash in the app**, so accidental swipes can be recovered. A store
  review notes that favourites cannot be swiped to trash.
- **What is obvious / what next:** the gesture; the consequence (a pile that
  waits) is only learned later.
- **Inference:** the two-step model — mark now, empty later — is the right
  safety model, but it must be *said* at the first swipe, and the pile must
  let the user restore any single item, not only "all or nothing".
- **Fit for Bildklar:** yes — this is *Zum Löschen vorgemerkt*. What it adds
  here is idea C: the pile as a **review tray** whose first action is
  restoring, with the real delete a separate, later step.

### 5. Swipewipe — month by month, with a progress wheel per month

- **Documented** ([Swipewipe on the App Store](https://apps.apple.com/sa/app/id1583884012); [NowSecure's app report, with the developer's description](https://www.nowsecure.com/?p=28079); [AlternativeTo summary](https://alternativeto.net/software/swipewipe/about)):
  the library is cut into months; swipe right keeps, left deletes. Quitting
  part-way leaves **a progress wheel next to that month** on the main screen;
  a finished month is crossed out and can be revisited. At the end of a month
  the user looks once more at what was kept and what goes, then confirms.
- **Also documented (store reviews):** a wait between months and weekly
  subscriptions — both things Bildklar does not copy.
- **Inference:** a month is a bite that feels finishable, and *seeing* where
  you stopped is what makes people come back. A plain list of month names
  with a single "done" mark (Bildklar's month screen until today) hides that.
- **Fit for Bildklar:** yes → **resumable month tiles** with the cover, the
  month and the real share gone through (idea B).

### 6. CleanMy®Phone (MacPaw) — similar sets with a "best" pick

- **Documented** ([CleanMy®Phone on the App Store](https://apps.apple.com/au/app/id1277110040); [macpaw.com/cleanmyphone](https://macpaw.com/cleanmyphone)):
  scans on the device ("doesn't upload or store your photos"), groups
  duplicates and similar shots and suggests the best picture to keep; the
  user decides what goes; deleted photos can be recovered from Recently
  Deleted. Store reviews: grouping is praised, the best-shot pick is "not so
  good" for some, so they still compare by hand.
- **Inference:** an automatic best pick is only as useful as the comparison
  that lets the user disagree quickly — and the reason for the pick should be
  visible. The storage-health dashboard and speed tests are what makes it
  feel like a utility rather than a library.
- **Fit for Bildklar:** the on-device promise and "you decide" yes (both are
  Bildklar's already); the dashboard no.

## The three ideas Bildklar adapts, and where they go

| | Idea | From | Where in Bildklar |
|---|---|---|---|
| **A** | **Compare the first group as the first task**, with the app's pick and the user's choice drawn apart, the reason in words, and a **side-by-side view with one shared zoom** — tap a spot and both photos zoom to it, so a parent can compare a child's face across two frames | Google Photos' top pick + filmstrip; CleanMy®Phone's best pick (and its reviews) | The reveal after the first scan offers *Deine erste Gruppe vergleichen* when a group of similar photos exists (else the step home would choose, such as a month); `GroupView` gets *Nebeneinander* (`src/ui/Compare.tsx`); after the first group, one sheet says what happened (nothing deleted, where the photos wait, undo) and offers one next step |
| **B** | **A month as a resumable bite**: cover, month, how much of it is gone through, continue where you stopped | Swipewipe's progress wheel | Month tiles on *Monat für Monat* and home's next step; leaving a month part-way remembers the place (`AppState.monthAt`), and what was marked by then is put aside instead of being forgotten |
| **C** | **Mark now, delete later — the pile as a review tray**: every staged photo visible, any one restorable, *review the selection* separate from the final delete | Slidebox's in-app trash; Files by Google's "Move x files to Trash" | `BinView`: a tray that leads with what is in it and how to put any of it back; the real delete is the last, separate step behind its sheet |

## What was not adopted, and why

- A **multi-page tour** before the app (the welcome had four pages): one
  screen with the benefit, then the reason for the photo access, then the
  real thing. The gestures are taught on the first real card.
- **Storage alarms, a space figure as the headline, streaks, a wait between
  months, paywalls during onboarding**: they make a library feel like a chore.
  The reveal no longer leads with "357 MB"; the space stays a quiet figure.
- **Hiding the choice in a menu** (Google Photos' *Set as top pick*): in
  Bildklar *Dieses behalten* is a button under the photo.
