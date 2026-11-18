/*
 * The first run: what of it was seen. The welcome, the first scan's screen,
 * the reveal, the guided review's gestures, the safety moments and every tip
 * (src/tips.ts) show once; each has an id, and the ids seen are a set kept
 * as a view preference (`bildklar-seen` in localStorage, src/store.ts) —
 * losing it only shows a hint again. `ALL` stands for every id: the captures
 * and checks start with it (scripts/lib/shots.mjs), and Settings › So
 * funktioniert Bildklar sets it to hide every hint.
 */

export const ALL = '*';

/** The one-time moments that are not tips. */
export const MOMENTS = {
  /** The calm screen of the first scan (later scans are home's slim card). */
  firstScan: 'firstScan',
  /** The overview after the first scan. */
  reveal: 'reveal',
  /** The guided review's three gestures, each performed once. */
  swipeRight: 'swipeRight',
  swipeLeft: 'swipeLeft',
  swipeUp: 'swipeUp',
  /** The three safety nets, before the first real delete. */
  safety: 'safety',
  /** Protection, explained once after the first review. */
  protect: 'protect',
} as const;

/** The guided review's gestures, in the order they are taught. */
export const GESTURES = ['swipeRight', 'swipeLeft', 'swipeUp'] as const;
export type Gesture = (typeof GESTURES)[number];

export function parseSeen(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const list: unknown = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []);
  } catch { return new Set(); }
}

export const serializeSeen = (seen: ReadonlySet<string>) => JSON.stringify([...seen].sort());

export const hasSeen = (seen: ReadonlySet<string>, id: string) => seen.has(ALL) || seen.has(id);

/** The set with `ids` added — the same set when nothing is new, so a state setter can bail out. */
export function withSeen(seen: Set<string>, ids: readonly string[]): Set<string> {
  if (ids.every(id => seen.has(id))) return seen;
  return new Set([...seen, ...ids]);
}

/** The set without `ids` (and without `ALL`, which would hide them again); `null` forgets everything. */
export function withoutSeen(seen: Set<string>, ids: readonly string[] | null): Set<string> {
  if (ids === null) return seen.size ? new Set() : seen;
  if (!seen.has(ALL) && !ids.some(id => seen.has(id))) return seen;
  const gone = new Set<string>([ALL, ...ids]);
  return new Set([...seen].filter(id => !gone.has(id)));
}

/** The gesture the guided review teaches next, or null once all three were performed. */
export const nextGesture = (seen: ReadonlySet<string>): Gesture | null => GESTURES.find(g => !hasSeen(seen, g)) ?? null;

/** A tip: shown once, on one screen, pointing at the control marked `data-tip="<id>"`. */
export interface TipSpec {
  id: string;
  /** The screen it belongs to (App.tsx's `screen`: 'home-clean', 'home-organize', 'review', 'bin', …). */
  screen: string;
  /** Shown only while this flag is among the ready ones (a moment in a flow: "the gestures are learned"). */
  when?: string;
}

/**
 * The one tip to show now: the first in the list's order that belongs to this
 * screen, was not seen and whose moment has come. One at a time — the rest
 * wait their turn (src/ui/Tip.tsx adds a pause between two).
 */
export function nextTip<T extends TipSpec>(tips: readonly T[], seen: ReadonlySet<string>, screen: string, ready: ReadonlySet<string> = new Set()): T | null {
  if (seen.has(ALL)) return null;
  return tips.find(x => x.screen === screen && !seen.has(x.id) && (!x.when || ready.has(x.when))) ?? null;
}
