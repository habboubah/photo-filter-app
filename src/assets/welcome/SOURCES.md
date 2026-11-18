# The welcome's photos

Eight small WebPs for the welcome pages (`src/components/WelcomeView.tsx`),
made from photos of the test library (`scripts/test-photos.json`): all
**CC0 1.0** (public domain dedication), none with identifiable people. They
are the only photos the app ships; the user's own are never shown before
access is granted, and the demo library never reaches a native build.

| File | Source id | From |
|---|---|---|
| `cake.webp` | `ho16` | flickr, willis0664 |
| `dog-1.webp`, `dog-2.webp`, `dog-3.webp` | `pe23` (three crops of one photo, as the demo's burst) | see `scripts/test-photos.json` |
| `flower.webp` | `xho60` | flickr, cogdogblog |
| `harbour.webp` | `ga2` | see `scripts/test-photos.json` |
| `lake.webp` | `ga10` | see `scripts/test-photos.json` |
| `castle.webp` | `ga24` | see `scripts/test-photos.json` |

Made with Pillow from `src/native/demo/photos/` (240–420 px wide, WebP
quality 58): about 60 kB in all, loaded with the welcome's own chunk.
