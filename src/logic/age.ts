/**
 * How old a photo is, for the age filter above a list (Bildschirmfotos and
 * the like, 19 November 2026): *Alle* (the default), or older than one, three
 * or six calendar months.
 */
export const AGES = ['all', '1', '3', '6'] as const;
export type Age = (typeof AGES)[number];

/** The moment a photo must be older than for `age` (null for *Alle*). */
export function ageCut(age: Age, now: number): number | null {
  if (age === 'all') return null;
  const d = new Date(now);
  d.setMonth(d.getMonth() - Number(age));
  return d.getTime();
}

/** The photos older than `age` (all of them for *Alle*), in their order. */
export function olderThan<P extends { t: number }>(photos: P[], age: Age, now: number): P[] {
  const cut = ageCut(age, now);
  return cut === null ? photos : photos.filter(p => p.t < cut);
}
