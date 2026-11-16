import type { Photo, Point } from '../types';
import { CityIndex, cityName } from './geo';

/** How many of a trip's located photos are looked up (evenly spread): enough to find the main place. */
const SAMPLE = 240;

/**
 * The place a trip is named after: the city most of its located photos were
 * taken near; failing that, the country; failing that, null.
 */
export function tripPlace(photos: Photo[], index: CityIndex | null, lang: string): string | null {
  if (!index) return null;
  const located = photos.filter(p => p.lat !== undefined && p.lon !== undefined);
  if (!located.length) return null;
  const step = Math.max(1, Math.floor(located.length / SAMPLE));
  const votes = new Map<string, { name: string; n: number }>();
  let misses: Point | null = null;
  for (let i = 0; i < located.length; i += step) {
    const p = located[i] as Point;
    const city = index.nearest(p);
    if (!city) { misses ??= p; continue; }
    const k = `${city.lat},${city.lon}`;
    const v = votes.get(k);
    if (v) v.n++; else votes.set(k, { name: cityName(city, lang), n: 1 });
  }
  let best: { name: string; n: number } | null = null;
  for (const v of votes.values()) if (!best || v.n > best.n) best = v;
  if (best) return best.name;
  const cc = misses ? index.country(misses) : null;
  if (!cc) return null;
  try { return new Intl.DisplayNames([lang], { type: 'region' }).of(cc) ?? null; } catch { return null; }
}

/**
 * "März 2026", "März – April 2026", "Dezember 2025 – Januar 2026" (in the
 * app's locale), from the first and the last photo.
 */
const formats = new Map<string, Intl.DateTimeFormat>();
/** Intl formatters are slow to make: one per locale and style. */
function format(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const k = `${locale}|${JSON.stringify(opts)}`;
  let f = formats.get(k);
  if (!f) { f = new Intl.DateTimeFormat(locale, opts); formats.set(k, f); }
  return f;
}

export function tripDates(start: number, end: number, locale: string): string {
  const a = new Date(start);
  const b = new Date(end);
  const monthYear = format(locale, { month: 'long', year: 'numeric' });
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return monthYear.format(a);
  if (a.getFullYear() === b.getFullYear()) return `${format(locale, { month: 'long' }).format(a)} – ${monthYear.format(b)}`;
  return `${monthYear.format(a)} – ${monthYear.format(b)}`;
}

/** A safe folder name for Android (and a fine album title on the iPhone): no slashes or control characters, at most 80 characters. */
export function folderName(title: string): string {
  return title
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .slice(0, 80)
    .trim() || 'Fotonest';
}
