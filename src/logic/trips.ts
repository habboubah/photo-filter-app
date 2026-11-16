import type { Photo, Point } from '../types';
import { distanceKm } from './geo';
import { Homes, homeAt } from './home';

/*
 * A trip: photos taken more than AWAY_KM from home, over at least
 * MIN_SPAN_MS. Walking the located photos in time order, a run of photos
 * away from home is one trip; a photo at home ends it, and so does a gap of
 * more than MAX_GAP_MS without a photo. Photos without a location (and not
 * screenshots) taken inside a trip's time window join it.
 *
 * The user can then cut a trip in two (splits), join trips (merges), rename
 * or hide one; those edits are stored by the trip's key, which is the day it
 * began — so they survive a rescan that adds photos.
 */

export const AWAY_KM = 50;
export const MIN_SPAN_MS = 6 * 3600_000;
export const MAX_GAP_MS = 4 * 24 * 3600_000;

export interface RawTrip {
  key: string;
  start: number;
  end: number;
  ids: string[];
}

export interface TripEdits {
  names: Record<string, string>;
  ignored: string[];
  /** Groups of keys joined into one (the earliest key names the result). */
  merges: string[][];
  /** Where a trip is cut: the times at which a new part begins. Part n > 0 is "<key>+<n>". */
  splits: Record<string, number[]>;
}

export const NO_EDITS: TripEdits = { names: {}, ignored: [], merges: [], splits: {} };

const pad = (n: number) => String(n).padStart(2, '0');
/** "2026-03-14": the local day a trip began, its key. */
export function dayOf(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** First index in photos (sorted by t) taken at or after t. */
function lowerBound(photos: Photo[], t: number): number {
  let lo = 0;
  let hi = photos.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (photos[mid].t < t) lo = mid + 1; else hi = mid;
  }
  return lo;
}

/** The trips in a library. `photos` must be sorted by time. */
export function detectTrips(photos: Photo[], homes: Homes): RawTrip[] {
  const windows: [number, number][] = [];
  let first = -1;
  let last = -1;
  const close = () => {
    if (first !== -1 && last - first >= MIN_SPAN_MS) windows.push([first, last]);
    first = -1;
    last = -1;
  };
  for (const p of photos) {
    if (p.lat === undefined || p.lon === undefined || p.shot || p.video) continue;
    const home = homeAt(homes, p.t);
    if (!home) continue;
    const away = distanceKm(p as Point, home) > AWAY_KM;
    if (!away) { close(); continue; }
    if (first !== -1 && p.t - last > MAX_GAP_MS) close();
    if (first === -1) first = p.t;
    last = p.t;
  }
  close();

  const seen = new Map<string, number>();
  return windows.map(([start, end]) => {
    const ids: string[] = [];
    for (let i = lowerBound(photos, start); i < photos.length && photos[i].t <= end; i++) {
      const p = photos[i];
      if (p.shot || p.video) continue;
      // A located photo in the window is away from home by construction (one at home ends the run).
      ids.push(p.id);
    }
    const day = dayOf(start);
    const n = (seen.get(day) ?? 0) + 1;
    seen.set(day, n);
    return { key: n === 1 ? day : `${day}#${n}`, start, end, ids };
  });
}

export interface EditedTrip extends RawTrip {
  ignored: boolean;
  name?: string;
}

/** Applies the user's cuts, joins, names and hidden trips, in that order. */
export function applyEdits(trips: RawTrip[], edits: TripEdits, timeOf: (id: string) => number): EditedTrip[] {
  // 1. Cuts.
  let parts: RawTrip[] = [];
  for (const trip of trips) {
    const cuts = [...(edits.splits[trip.key] ?? [])].filter(c => c > trip.start && c <= trip.end).sort((a, b) => a - b);
    if (!cuts.length) { parts.push(trip); continue; }
    const bounds = [trip.start, ...cuts, Infinity];
    for (let n = 0; n < bounds.length - 1; n++) {
      const ids = trip.ids.filter(id => { const t = timeOf(id); return t >= bounds[n] && t < bounds[n + 1]; });
      if (!ids.length) continue;
      parts.push({ key: n === 0 ? trip.key : `${trip.key}+${n}`, start: timeOf(ids[0]), end: timeOf(ids[ids.length - 1]), ids });
    }
  }

  // 2. Joins: each group becomes one trip under its earliest member's key.
  for (const group of edits.merges) {
    const members = parts.filter(p => group.includes(p.key));
    if (members.length < 2) continue;
    members.sort((a, b) => a.start - b.start);
    const ids = [...new Set(members.flatMap(m => m.ids))].sort((a, b) => timeOf(a) - timeOf(b));
    const joined: RawTrip = { key: members[0].key, start: timeOf(ids[0]), end: timeOf(ids[ids.length - 1]), ids };
    parts = [...parts.filter(p => !members.includes(p)), joined];
  }

  // 3. Names and hidden trips.
  const ignored = new Set(edits.ignored);
  return parts
    .sort((a, b) => b.start - a.start)
    .map(p => ({ ...p, ignored: ignored.has(p.key), name: edits.names[p.key]?.trim() || undefined }));
}

/* ------------------------------------------------- edits, as pure updates */

/** Cut a trip at time t (a new part begins there). */
export function addSplit(edits: TripEdits, key: string, t: number): TripEdits {
  // A part's key is "<key>+n": the cut belongs to the trip it was detected as.
  const base = key.split('+')[0];
  const cuts = [...new Set([...(edits.splits[base] ?? []), t])].sort((a, b) => a - b);
  return { ...edits, splits: { ...edits.splits, [base]: cuts } };
}

/** Join trips: the keys given, plus every group any of them already belongs to. */
export function addMerge(edits: TripEdits, keys: string[]): TripEdits {
  const touching = edits.merges.filter(g => g.some(k => keys.includes(k)));
  const group = [...new Set([...touching.flat(), ...keys])];
  return { ...edits, merges: [...edits.merges.filter(g => !touching.includes(g)), group] };
}

/** Undo a join: the group the key heads (or is in) is dissolved. */
export function removeMerge(edits: TripEdits, key: string): TripEdits {
  return { ...edits, merges: edits.merges.filter(g => !g.includes(key)) };
}

/** Undo every cut of a trip. */
export function removeSplits(edits: TripEdits, key: string): TripEdits {
  const base = key.split('+')[0];
  const { [base]: _gone, ...rest } = edits.splits;
  return { ...edits, splits: rest };
}

export function setName(edits: TripEdits, key: string, name: string): TripEdits {
  const names = { ...edits.names };
  if (name.trim()) names[key] = name.trim(); else delete names[key];
  return { ...edits, names };
}

export function setIgnored(edits: TripEdits, key: string, ignored: boolean): TripEdits {
  const list = edits.ignored.filter(k => k !== key);
  return { ...edits, ignored: ignored ? [...list, key] : list };
}

/** The local days a trip covers, for the cut sheet: each day's first photo time and count. */
export function tripDays(ids: string[], timeOf: (id: string) => number): { day: string; first: number; count: number }[] {
  const days: { day: string; first: number; count: number }[] = [];
  for (const id of ids) {
    const t = timeOf(id);
    const day = dayOf(t);
    const last = days[days.length - 1];
    if (last && last.day === day) last.count++;
    else days.push({ day, first: t, count: 1 });
  }
  return days;
}
