# Shoppinglist – build plan

A simple, private shopping list for iPhone, Android and the browser. No
account, no server: everything lives on the device. Same stack and conventions
as `budget-app` (Spartopf) and `pizza-driver-log` (React 19 + TypeScript,
Vite 6, Tailwind 4, `motion`, `lucide-react`, Capacitor 8 for the iOS and
Android shells, `vite-plugin-pwa` for the installable web app, vitest for the
pure logic) — and since November 2026 Spartopf's settings and
release tooling too; the look is Shoppinglist's own, "Tüte" (CLAUDE.md).

## Concepts

| Concept | What it is | Example |
|---|---|---|
| **List type** (`ListType`) | A template: name, picture (emoji or photo), colour and a catalogue of **suggestions**. Editable in Settings. | Supermarket 🛒, Clothing 👕 |
| **List** (`ShoppingList`) | What the user shops from. Created from a type, can be renamed, recoloured, given its own picture. One per shop or purpose. | "Lidl" (type Supermarket), "Kids' clothes" (type Clothing) |
| **Item** (`Item`) | One line on a list: name, picture, optional quantity + unit and note, done or not. | 🥛 Milk · 2 l |
| **Suggestion** (`Suggestion`) | A catalogue entry of a type, in DE + EN, with an emoji and an aisle section. | 🍌 Banane / Banana |

## Screens (no router — a `pushed` stack in `App.tsx`, as in pizza-driver-log)

1. **Home** – greeting, three tiles with what is still to buy, the lists as
   a stack of passes in their own colour (picture, name, "5 open"), a floating
   bar with "new list" and the settings; a pass's "⋯" shares / edits / empties
   / deletes it.
2. **List** – header in the list's colour, an add field with live suggestions,
   a rail of suggestion chips (used-before first, then the type's catalogue),
   open items (optionally grouped by aisle), done items folded at the bottom.
   *Shopping mode* button: bigger rows, progress bar, screen kept awake, add
   bar hidden, a small celebration when everything is ticked.
3. **Item sheet** – name, picture (emoji picker or photo), quantity stepper +
   unit chips, note, delete.
4. **List sheet** – name, type, picture, colour; delete.
5. **Settings** – the app card, *Darstellung* (language DE/EN/AR, theme, the
   accent colour), *List types & suggestions* (pushed screens: type list →
   type detail with its suggestions: add / edit / delete / reset), backup
   export / import, *Über die App* (rating, feedback, privacy policy), restore
   defaults and delete all data.

## Data & storage

- `useAppStore()` in `src/store.ts`, mirrored to `localStorage` under
  `shoppinglist-*` keys, one `useState` + `useEffect` per key.
- Stored payloads carry `schemaVersion`; everything read from storage or a
  backup goes through `normalize*()` in `src/logic.ts` first.
- Photos are resized on device to small JPEG data URLs before storing.
- Usage history per type ("used before") powers the first suggestion chips.
- Export / import a JSON backup (share sheet on iPhone, download on desktop).

## Pure logic (unit-tested in `src/logic.test.ts`)

Name normalisation (case/diacritics), add-or-merge (duplicate → quantity up,
done → reopened), suggestion ranking + search, aisle sorting, progress,
backup validation and migration.

## Steps (one commit each)

1. Project setup, skills copied from pizza-driver-log, README, PLAN
2. Data model, local storage, default list types & suggestions
3. Home screen: show, add, edit and delete lists
4. List screen: add items, suggestion chips, quantities
5. Shopping mode: tick off, progress, clear / reset, keep awake
6. Settings: list types & suggestions, language, theme
7. Backup export / import, offline + installable, iOS project
8. Design polish, animations, empty states, accessibility
9. Final check on iPhone width + desktop, fixes, README
