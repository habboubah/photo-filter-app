import type { Album } from '../types';
import { NO_EDITS, TripEdits } from './trips';
import { isSortKey, type SortKey } from './sort';
import type { Protection } from './protect';
import { type Picks, NO_PICKS, SIGNALS } from './best';
import { type Ledger, normalizeLedger } from './ledger';

/*
 * The user's own decisions — everything the app cannot work out again from
 * the photos: trip names, cuts, joins and hidden trips, the albums made, the
 * best shot picked by hand, the photos kept in a review, the photos waiting
 * in "Zum Löschen". On the phones this
 * lives in the native SQLite database next to the scan cache (PhotoLibrary
 * getState / setState): a phone short of space — this app's users — may
 * clear a web view's localStorage. On the web (the demo) it is localStorage.
 *
 * Whatever is read goes through normalizeState() first. Add new fields as
 * optional; bump SCHEMA_VERSION and migrate here when a shape changes.
 */
export const SCHEMA_VERSION = 1;
/** How many recently used albums are remembered for the chips. */
export const RECENT_ALBUMS = 12;

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
  /**
   * Months left part-way (docs/ux-research.md, idea B): month → the time of the
   * last photo decided in it. A month resumes after that photo; its progress is
   * the share of its photos up to it. Cleared when the month is done. Added
   * 18 November 2026 (older files have none).
   */
  monthAt: Record<string, number>;
  /** What the app has moved to Recently Deleted / the Trash so far (not in a dry run). */
  freed: { count: number; bytes: number };
  /** Photos deleted without the unlock (src/logic/allowance.ts). */
  freeUsed: number;
  /** Bildklar ran on this phone while nothing was for sale: deleting stays unlimited (src/logic/allowance.ts). */
  early: boolean;
  /** The decide-later pile: photos swiped up in a review, in the order they were put off (src/logic/review.ts). */
  later: string[];
  /** "Zum Löschen": photos the user chose to delete, waiting for the real delete, newest first (src/logic/bin.ts). */
  bin: string[];
  /** The order the user chose for each list screen (src/logic/sort.ts SORT_DEFAULT keys). */
  sort: Record<string, SortKey>;
  /** Photos, trips and albums never suggested for deleting (src/logic/protect.ts). */
  protect: Protection;
  /** Albums used while swiping, the last used first (ids from PhotoLibrary.listAlbums), for the chips' order. */
  recentAlbums: string[];
  /** How often each kind of suggestion was deleted or kept, on this phone only (src/logic/ledger.ts). */
  ledger: Ledger;
  /** What the user's own picks of a best shot taught the ranking (src/logic/best.ts learnPick). */
  picks: Picks;
}

export const emptyState = (): AppState => ({
  schemaVersion: SCHEMA_VERSION,
  trips: { ...NO_EDITS, albums: {} },
  best: {},
  kept: [],
  owned: false,
  months: [],
  monthAt: {},
  freed: { count: 0, bytes: 0 },
  freeUsed: 0,
  early: false,
  later: [],
  bin: [],
  sort: {},
  protect: { ids: [], trips: [], albums: [], similar: true },
  recentAlbums: [],
  ledger: {},
  picks: NO_PICKS,
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
  // Added 17 November 2026: older state files have no bin.
  s.bin = [...new Set(strings(raw.bin))];
  if (isObj(raw.protect)) {
    s.protect = {
      ids: [...new Set(strings(raw.protect.ids))],
      trips: [...new Set(strings(raw.protect.trips))],
      albums: [...new Set(strings(raw.protect.albums))],
      // Added 17 November 2026: on unless switched off (older state files have no such field).
      similar: raw.protect.similar !== false,
    };
  }
  s.recentAlbums = [...new Set(strings(raw.recentAlbums))].slice(0, RECENT_ALBUMS);
  s.ledger = normalizeLedger(raw.ledger);
  if (isObj(raw.picks) && typeof raw.picks.n === 'number' && raw.picks.n > 0 && isObj(raw.picks.wins)) {
    const wins: Picks['wins'] = {};
    for (const k of SIGNALS) {
      const v = raw.picks.wins[k];
      if (typeof v === 'number' && v > 0) wins[k] = Math.round(v);
    }
    s.picks = { n: Math.round(raw.picks.n), wins };
  }
  if (isObj(raw.sort)) for (const [k, v] of Object.entries(raw.sort)) if (isSortKey(v)) s.sort[k] = v;
  s.owned = raw.owned === true;
  s.months = [...new Set(strings(raw.months).filter(k => /^\d{4}-\d{2}$/.test(k)))];
  if (isObj(raw.monthAt)) {
    for (const [k, v] of Object.entries(raw.monthAt)) {
      if (/^\d{4}-\d{2}$/.test(k) && typeof v === 'number' && Number.isFinite(v) && !s.months.includes(k)) s.monthAt[k] = v;
    }
  }
  if (isObj(raw.freed)) {
    const count = raw.freed.count;
    const bytes = raw.freed.bytes;
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) s.freed.count = Math.round(count);
    if (typeof bytes === 'number' && Number.isFinite(bytes) && bytes > 0) s.freed.bytes = Math.round(bytes);
  }
  if (typeof raw.freeUsed === 'number' && Number.isFinite(raw.freeUsed) && raw.freeUsed > 0) s.freeUsed = Math.round(raw.freeUsed);
  s.early = raw.early === true;
  return s;
}
