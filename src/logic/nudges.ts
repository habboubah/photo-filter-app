/*
 * The few moments Bildklar speaks up by itself (docs/features.md, "Coming
 * back"): what is new since the last visit, a trip found since, the weekly
 * reminder offered once, and a rating asked for after a clean-up that freed
 * space. Pure; App.tsx (src/useNudges.ts) keeps their state in `bildklar-*`
 * localStorage keys — losing them only means a card shows once more.
 */
import type { Group, Photo, Trip } from '../types';

const DAY = 86_400_000;

/* ---------------------------------------------------------------- rating */

/** What the rating prompt remembers: clean-ups that freed space, and when it last asked (for which app version). */
export interface RateState { wins: number; asks: number; lastAsk: number; version: string }
export const RATE_EMPTY: RateState = { wins: 0, asks: 0, lastAsk: 0, version: '' };
/** At most this many asks, ever (Apple shows its prompt at most three times a year anyway). */
export const RATE_MAX_ASKS = 3;
/** Clean-ups that freed space before the first ask: the app has helped twice. */
export const RATE_MIN_WINS = 2;
/** Days between two asks. */
export const RATE_GAP_DAYS = 120;

export function parseRate(raw: string | null): RateState {
  try {
    const v = JSON.parse(raw ?? '');
    if (!v || typeof v !== 'object') return RATE_EMPTY;
    const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);
    return { wins: n(v.wins), asks: n(v.asks), lastAsk: n(v.lastAsk), version: typeof v.version === 'string' ? v.version : '' };
  } catch {
    return RATE_EMPTY;
  }
}

/** A real delete freed space. */
export const withWin = (s: RateState): RateState => ({ ...s, wins: s.wins + 1 });

/** Whether to ask now: after two wins, at most three times, never twice for one version, four months apart. */
export function shouldAsk(s: RateState, now: number, version: string): boolean {
  return s.wins >= RATE_MIN_WINS && s.asks < RATE_MAX_ASKS && s.version !== version && now - s.lastAsk >= RATE_GAP_DAYS * DAY;
}

export const withAsk = (s: RateState, now: number, version: string): RateState => ({ ...s, asks: s.asks + 1, lastAsk: now, version });

/* ------------------------------------------------------ since last time */

/** A visit this long after the last one counts as coming back. */
export const SINCE_MIN_GAP = 12 * 3_600_000;
/** Fewer new photos than this are not worth a card. */
export const SINCE_MIN_PHOTOS = 5;

export interface Since {
  /** The new photos and videos, newest first. */
  ids: string[];
  bytes: number;
  /** Groups of near-identical photos (or similar videos) with a new photo in them. */
  groups: number;
}

/**
 * What came in since the last visit (`prev`): photos and videos taken after
 * it, and the groups they started or joined. Null when the visit is too
 * soon after the last one, or too little is new.
 */
export function sinceLast(photos: readonly Photo[], groups: readonly Group[], prev: number | null, now: number): Since | null {
  if (!prev || now - prev < SINCE_MIN_GAP) return null;
  const fresh = photos.filter(p => p.t > prev && p.t <= now).sort((a, b) => b.t - a.t);
  if (fresh.length < SINCE_MIN_PHOTOS) return null;
  const ids = new Set(fresh.map(p => p.id));
  return {
    ids: fresh.map(p => p.id),
    bytes: fresh.reduce((s, p) => s + p.bytes, 0),
    groups: groups.filter(g => g.ids.some(id => ids.has(id))).length,
  };
}

/** "Sonntag" within the last six days, else "3. November" — the words after *Seit*. */
export function sinceWords(prev: number, now: number, locale: string): string {
  const d = new Date(prev);
  return now - prev < 6 * DAY
    ? d.toLocaleDateString(locale, { weekday: 'long' })
    : d.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

/* ------------------------------------------------------------- new trip */

/** A trip found since: only one that ended at most this long ago is news. */
export const TRIP_NEWS_DAYS = 60;

/**
 * The newest trip the user hasn't been shown yet: not hidden, without an
 * album, ended within the last 60 days, not in `seen`. Null otherwise.
 */
export function newTrip(trips: readonly Trip[], seen: ReadonlySet<string>, now: number): Trip | null {
  const latest = trips.filter(x => !x.ignored).reduce<Trip | null>((a, x) => (!a || x.start > a.start ? x : a), null);
  if (!latest || latest.album || seen.has(latest.key) || now - latest.end > TRIP_NEWS_DAYS * DAY) return null;
  return latest;
}

export function parseList(raw: string | null): string[] {
  try {
    const v = JSON.parse(raw ?? '');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
