# The welcome's photos

Three small WebPs for the welcome screen (`src/components/WelcomeView.tsx`),
made from photos of the test library (`scripts/test-photos.json`): all
**CC0 1.0** (public domain dedication), none with identifiable people. They
are the only photos the app ships; the user's own are never shown before
access is granted, and the demo library never reaches a native build.

| File | Source id | From |
|---|---|---|
| `dog-1.webp`, `dog-2.webp`, `dog-3.webp` | `pe23` (three crops of one photo, as the demo's burst) | see `scripts/test-photos.json` |

Made with Pillow from `src/native/demo/photos/` (240 px wide, WebP
quality 58): about 15 kB in all, loaded with the welcome's own chunk.

The welcome had four pages and eight photos until 18 November 2026; the
five no longer shown were removed with it.
