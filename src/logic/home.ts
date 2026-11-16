import type { Photo, Point } from '../types';

/*
 * Home: the place with the most photo-days — the days on which at least one
 * photo was taken there. Places are cells of a 0.25° grid (about 28 × 18 km
 * in Germany); a day counts once per cell. Home itself is the median of the
 * photos taken in the winning cell and the eight around it, so a home on a
 * cell's edge is not cut in half.
 *
 * People move. A year gets a home of its own only when it clearly looks like
 * one — at least MOVE_MIN_DAYS photo-days in its top place, spread over at
 * least MOVE_MIN_MONTHS months — and that place is not the overall home. A
 * long holiday is neither, so it never becomes "home".
 */

const CELL = 0.25;
export const MOVE_MIN_DAYS = 60;
export const MOVE_MIN_MONTHS = 4;

export interface Homes {
  /** The home of the whole library, or null when no photo has a location. */
  home: Point | null;
  /** Years that had a different home (a move). */
  byYear: Map<number, Point>;
}

const cellOf = (p: Point) => [Math.floor(p.lat / CELL), Math.floor(p.lon / CELL)] as const;
const cellKey = (a: number, b: number) => `${a}:${b}`;
const dayKey = (t: number) => {
  const d = new Date(t);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

interface Place { days: Set<number>; months: Set<number> }

function topPlace(photos: Photo[]): { key: string; place: Place } | null {
  const places = new Map<string, Place>();
  for (const p of photos) {
    const [a, b] = cellOf(p as Point);
    const k = cellKey(a, b);
    let place = places.get(k);
    if (!place) { place = { days: new Set(), months: new Set() }; places.set(k, place); }
    const day = dayKey(p.t);
    place.days.add(day);
    place.months.add(Math.floor(day / 100));
  }
  let best: { key: string; place: Place } | null = null;
  for (const [key, place] of places) {
    if (!best || place.days.size > best.place.days.size) best = { key, place };
  }
  return best;
}

function centre(photos: Photo[], key: string): Point {
  const [a, b] = key.split(':').map(Number);
  const near = photos.filter(p => {
    const [x, y] = cellOf(p as Point);
    return Math.abs(x - a) <= 1 && Math.abs(y - b) <= 1;
  });
  return { lat: median(near.map(p => p.lat!)), lon: median(near.map(p => p.lon!)) };
}

export function findHomes(photos: Photo[]): Homes {
  const located = photos.filter(p => p.lat !== undefined && p.lon !== undefined && !p.shot && !p.video);
  const top = topPlace(located);
  if (!top) return { home: null, byYear: new Map() };
  const home = centre(located, top.key);

  const byYear = new Map<number, Point>();
  const years = new Map<number, Photo[]>();
  for (const p of located) {
    const y = new Date(p.t).getFullYear();
    const list = years.get(y);
    if (list) list.push(p); else years.set(y, [p]);
  }
  for (const [year, list] of years) {
    const t = topPlace(list);
    if (!t || t.key === top.key) continue;
    if (t.place.days.size < MOVE_MIN_DAYS || t.place.months.size < MOVE_MIN_MONTHS) continue;
    byYear.set(year, centre(list, t.key));
  }
  return { home, byYear };
}

/** Where home was when a photo was taken. */
export function homeAt(homes: Homes, t: number): Point | null {
  return homes.byYear.get(new Date(t).getFullYear()) ?? homes.home;
}
