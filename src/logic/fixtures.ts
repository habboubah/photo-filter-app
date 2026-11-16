import type { Photo } from '../types';

/*
 * A made-up photo library for the tests and the performance budget: a family
 * living near Hanau, three years of everyday photos, trips abroad, bursts of
 * near-identical shots, some blurry ones, screenshots and favourites. Seeded,
 * so every run builds the same library.
 */

export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const HOME = { lat: 50.132, lon: 8.917 };
export const PLACES = {
  paris: { lat: 48.857, lon: 2.352 },
  amsterdam: { lat: 52.372, lon: 4.9 },
  rome: { lat: 41.893, lon: 12.483 },
  vienna: { lat: 48.208, lon: 16.373 },
  garda: { lat: 45.886, lon: 10.842 },
  copenhagen: { lat: 55.676, lon: 12.568 },
  barcelona: { lat: 41.389, lon: 2.159 },
  sylt: { lat: 54.906, lon: 8.31 },
};

const DAY = 24 * 3600_000;

export interface FakeLibrary {
  photos: Photo[];
  trips: { place: keyof typeof PLACES; start: number; end: number }[];
}

function randomHash(r: () => number): string {
  let s = '';
  for (let i = 0; i < 16; i++) s += Math.floor(r() * 16).toString(16);
  return s;
}

/** A hash with `flips` of its 64 bits changed. */
export function nearHash(hash: string, flips: number, r: () => number): string {
  const bits = hash.split('').flatMap(h => parseInt(h, 16).toString(2).padStart(4, '0').split('').map(Number));
  const used = new Set<number>();
  while (used.size < flips) used.add(Math.floor(r() * 64));
  for (const i of used) bits[i] ^= 1;
  let s = '';
  for (let i = 0; i < 64; i += 4) s += parseInt(bits.slice(i, i + 4).join(''), 2).toString(16);
  return s;
}

/** About `n` photos over three years before `end`. */
export function fakeLibrary(n: number, seed = 1, end = Date.UTC(2026, 10, 1)): FakeLibrary {
  const r = prng(seed);
  const start = end - 3 * 365 * DAY;
  const photos: Photo[] = [];
  let id = 0;
  const jitter = (km: number) => (r() - 0.5) * (km / 55);
  const sharp = () => {
    const x = r();
    if (x < 0.03) return 2 + r() * 9;          // clearly blurry
    if (x < 0.06) return 13 + r() * 15;        // probably blurry
    return 70 + Math.exp(r() * 6.5);           // sharp
  };

  const add = (t: number, where: { lat: number; lon: number } | null, km: number) => {
    const base: Photo = {
      id: `p${++id}`, t, bytes: Math.round(1_400_000 + r() * 2_800_000), exact: true, w: 4032, h: 3024,
      hash: randomHash(r), sharp: Math.round(sharp() * 100) / 100, contrast: 30 + r() * 40,
      expo: 0.25 + r() * 0.5, clip: r() * 0.03,
    };
    if (where && r() < 0.88) { base.lat = where.lat + jitter(km); base.lon = where.lon + jitter(km); }
    if (r() < 0.02) base.fav = true;
    photos.push(base);
    // A burst of near-identical shots now and then.
    if (r() < 0.06) {
      const extra = 1 + Math.floor(r() * 5);
      for (let k = 1; k <= extra; k++) {
        photos.push({
          ...base, id: `p${++id}`, t: t + k * (2000 + r() * 8000), fav: undefined,
          hash: nearHash(base.hash!, Math.floor(r() * 7), r), sharp: Math.round(sharp() * 100) / 100,
        });
      }
    }
    if (r() < 0.05) {
      photos.push({ id: `p${++id}`, t: t + 60_000, bytes: 900_000, exact: true, w: 1179, h: 2556, shot: true, hash: randomHash(r), sharp: 400, contrast: 60, expo: 0.8, clip: 0.2 });
    }
  };

  // Trips: about one every two months, 2–12 days.
  const trips: FakeLibrary['trips'] = [];
  const names = Object.keys(PLACES) as (keyof typeof PLACES)[];
  for (let t = start + 20 * DAY; t < end - 15 * DAY; t += (40 + r() * 50) * DAY) {
    const place = names[Math.floor(r() * names.length)];
    const len = (2 + Math.floor(r() * 10)) * DAY;
    trips.push({ place, start: t, end: t + len });
  }

  const tripAt = (t: number) => trips.find(x => t >= x.start - DAY / 2 && t <= x.end + DAY / 2);
  const perDay = Math.max(1, n / (3 * 365));
  for (let day = start; day < end; day += DAY) {
    const trip = tripAt(day + DAY / 2);
    const count = Math.round(perDay * (trip ? 2.5 : 0.8) * (0.4 + r() * 1.2));
    for (let i = 0; i < count; i++) {
      const t = day + 8 * 3600_000 + r() * 13 * 3600_000;
      const inTrip = trips.find(x => t >= x.start && t <= x.end);
      if (inTrip) add(t, PLACES[inTrip.place], 8);
      else add(t, HOME, 12);
    }
  }
  photos.sort((a, b) => a.t - b.t);
  return { photos, trips };
}
