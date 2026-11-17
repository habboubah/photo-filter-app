import type { Album } from '../types';
import { NO_EDITS, TripEdits } from './trips';
import { isSortKey, type SortKey } from './sort';

/*
 * The user's own decisions — everything the app cannot work out again from
 * the photos: trip names, cuts, joins and hidden trips, the albums made, the
 * best shot picked by hand, the photos kept in a review. On the phones this
 * lives in the native SQLite database next to the scan cache (PhotoLibrary
 * getState / setState): a phone short of space — this app's users — may
 * clear a web view's localStorage. On the web (the demo) it is localStorage.
 *
 * Whatever is read goes through normalizeState() first. Add new fields as
 * optional; bump SCHEMA_VERSION and migrate here when a shape changes.
 */
export const SCHEMA_VERSION = 1;

export interface AppState {
  schemaVersion: number;
  trips: TripEdits & { albums: Record<string, Album> };
  /** Similar group key → the photo the user picked as the best. */
  best: Record<string, string>;
  /** Photos the user chose to keep in a review: never suggested again. */
  kept: string[];
  /** The unlock was bought (a hint for the first frame; the store's answer wins). */
  owned: boolean;
  /** Months ("2026-03") gone through to the end in "Month by month". */
  months: string[];
  /** What the app has moved to Recently Deleted / the Trash so far (not in a dry run). */
  freed: { count: number; bytes: number };
  /** Days ("2026-11-16") with a clean-up, for the streak (src/logic/streak.ts). */
  days: string[];
  /** Photos deleted without the unlock (src/logic/allowance.ts). */
  freeUsed: number;
  /** The decide-later pile: photos swiped up in a review, in the order they were put off (src/logic/review.ts). */
  later: string[];
  /** The order the user chose for each list screen (src/logic/sort.ts SORT_DEFAULT keys). */
  sort: Record<string, SortKey>;
}

export const emptyState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  trips: { ...NO_EDITS, albums: {} },
  best: {},
  kept: [],
  owned: false,
  months: [],
  freed: { count: 0, bytes: 0 },
  days: [],
  freeUsed: 0,
  later: [],
  sort: {},
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
function stringMap(v: unknown): Record<string, string> {
  if (!isObj(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(v)) if (typeof x === 'string') out[k] = x;
  return out;
}

/**
 * The pile without the photos that are gone from the library (deleted
 * elsewhere, or by Bildklar). Returns the same array when nothing is gone, so
 * the state is not written again for nothing.
 */
export function pruneLater(later: string[], exists: (id: string) => boolean): string[] {
  const left = later.filter(exists);
  return left.length === later.length ? later : left;
}

export function normalizeState(raw: unknown): AppState {
  const s = emptyState();
  if (!isObj(raw)) return s;
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > SCHEMA_VERSION) {
    // Written by a newer version: read what we know, never write back less.
  }
  const t = isObj(raw.trips) ? raw.trips : {};
  s.trips.names = stringMap(t.names);
  s.trips.ignored = strings(t.ignored);
  s.trips.merges = Array.isArray(t.merges) ? t.merges.map(strings).filter(g => g.length > 1) : [];
  if (isObj(t.splits)) {
    for (const [k, v] of Object.entries(t.splits)) {
      const cuts = Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)) : [];
      if (cuts.length) s.trips.splits[k] = cuts;
    }
  }
  if (isObj(t.albums)) {
    for (const [k, v] of Object.entries(t.albums)) {
      if (isObj(v) && typeof v.title === 'string' && typeof v.count === 'number' && typeof v.at === 'number') {
        s.trips.albums[k] = { title: v.title, count: v.count, at: v.at };
      }
    }
  }
  s.best = stringMap(raw.best);
  s.kept = [...new Set(strings(raw.kept))];
  s.later = [...new Set(strings(raw.later))];
  if (isObj(raw.sort)) for (const [k, v] of Object.entries(raw.sort)) if (isSortKey(v)) s.sort[k] = v;
  s.owned = raw.owned === true;
  s.months = [...new Set(strings(raw.months).filter(k => /^\d{4}-\d{2}$/.test(k)))];
  if (isObj(raw.freed)) {
    const count = raw.freed.count;
    const bytes = raw.freed.bytes;
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) s.freed.count = Math.round(count);
    if (typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0) s.freed.bytes = Math.round(bytes);
  }
  if (typeof raw.freeUsed === 'number' && Number.isFinite(raw.freeUsed) && raw.freeUsed > 0) s.freeUsed = Math.round(raw.freeUsed);
  s.days = [...new Set(strings(raw.days).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)))].sort().slice(-60);
  return s;
}
