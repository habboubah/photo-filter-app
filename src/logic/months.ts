import type { Photo } from '../types';

/*
 * Month by month: the whole library cut into calendar months (the phone's
 * local time), newest first, so it can be gone through a bite at a time. A
 * month the user has gone through to the end is remembered (AppState.months)
 * and shown as done; new photos in it make it count as not done again only
 * when it is gone through once more (the mark is the month, not its photos).
 *
 * On this day: the photos taken on today's date in earlier years, newest year
 * first — a small daily review that looks back instead of only clearing out.
 */

export interface Month {
  /** "2026-03". */
  key: string;
  year: number;
  /** 0–11. */
  month: number;
  /** In time order. */
  ids: string[];
  bytes: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
export const monthKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** `photos` sorted by time (Library.photos); returns the months newest first. */
export function buildMonths(photos: Photo[]): Month[] {
  const out = new Map<string, Month>();
  for (const p of photos) {
    const key = monthKey(p.t);
    let m = out.get(key);
    if (!m) {
      const d = new Date(p.t);
      m = { key, year: d.getFullYear(), month: d.getMonth(), ids: [], bytes: 0 };
      out.set(key, m);
    }
    m.ids.push(p.id);
    m.bytes += p.bytes;
  }
  return [...out.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}

export interface OnThisDay {
  /** Photos in time order, newest year first. */
  ids: string[];
  /** The earlier years that have photos on this date, newest first. */
  years: number[];
}

/** Photos taken on `now`'s day and month in an earlier year (screenshots left out). */
export function onThisDay(photos: Photo[], now: number): OnThisDay {
  const today = new Date(now);
  const day = today.getDate();
  const month = today.getMonth();
  const year = today.getFullYear();
  const byYear = new Map<number, string[]>();
  for (const p of photos) {
    if (p.shot) continue;
    const d = new Date(p.t);
    if (d.getDate() !== day || d.getMonth() !== month || d.getFullYear() >= year) continue;
    const list = byYear.get(d.getFullYear());
    if (list) list.push(p.id); else byYear.set(d.getFullYear(), [p.id]);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return { years, ids: years.flatMap(y => byYear.get(y)!) };
}
