import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { buildTrips, detect, makeLibrary } from './analyze';
import { CityIndex, distanceKm, parseCities } from './geo';
import { findHomes, homeAt } from './home';
import { folderName, tripDates, tripPlace } from './naming';
import { emptyState } from './state';
import {
  NO_EDITS, addMerge, addSplit, applyEdits, detectTrips, removeMerge, removeSplits, setIgnored, setName, tripDays,
} from './trips';
import { HOME, PLACES, fakeLibrary } from './fixtures';

const H = 3600_000;
const D = 24 * H;
const T0 = new Date(2026, 2, 1, 9).getTime(); // 1 March 2026, 09:00 local

let n = 0;
const photo = (t: number, where?: { lat: number; lon: number }, extra: Partial<Photo> = {}): Photo => ({
  id: `x${++n}`, t, bytes: 2_000_000, w: 4000, h: 3000, ...(where ?? {}), ...extra,
});
/** A photo a day at home for `days` days from `from`. */
const homeDays = (from: number, days: number, where = HOME) => Array.from({ length: days }, (_, i) => photo(from + i * D, where));

const CITIES = parseCities([
  '48.857\t2.352\tFR\t2140\tParis',
  '48.805\t2.120\tFR\t85\tVersailles',
  '48.137\t11.575\tDE\t1505\tMunich\tMünchen',
  '50.133\t8.917\tDE\t96\tHanau',
  '50.116\t8.684\tDE\t773\tFrankfurt am Main\tFrankfurt\tFrankfurt',
].join('\n'));
const index = new CityIndex(CITIES);

describe('geo', () => {
  it('measures distance', () => {
    expect(distanceKm(HOME, PLACES.paris)).toBeGreaterThan(450);
    expect(distanceKm(HOME, PLACES.paris)).toBeLessThan(500);
  });
  it('names a photo after the bigger place nearby', () => {
    // 15 km from Versailles' centre, 20 km from Paris': Paris wins.
    expect(index.nearest({ lat: 48.75, lon: 2.25 })?.name).toBe('Paris');
    expect(index.nearest({ lat: 30, lon: 0 })).toBeNull();
  });
});

describe('home', () => {
  it('is the place with the most photo-days', () => {
    const photos = [...homeDays(T0, 40), ...homeDays(T0 + 50 * D, 5, PLACES.paris)];
    const homes = findHomes(photos);
    expect(distanceKm(homes.home!, HOME)).toBeLessThan(5);
  });

  it('counts days, not photos: 300 photos on one holiday day do not make a home', () => {
    const holiday = Array.from({ length: 300 }, (_, i) => photo(T0 + 100 * D + i * 60_000, PLACES.paris));
    const homes = findHomes([...homeDays(T0, 20), ...holiday]);
    expect(distanceKm(homes.home!, HOME)).toBeLessThan(5);
  });

  it('follows a move, but not a long holiday', () => {
    const berlin = { lat: 52.52, lon: 13.405 };
    const y2024 = new Date(2024, 0, 10, 12).getTime();
    const y2025 = new Date(2025, 0, 10, 12).getTime();
    const photos = [
      // 2024 in Berlin, every other day all year: a home.
      ...Array.from({ length: 150 }, (_, i) => photo(y2024 + i * 2 * D, berlin)),
      // 2025 and 2026 near Hanau.
      ...Array.from({ length: 300 }, (_, i) => photo(y2025 + i * 2 * D, HOME)),
      // Three weeks in Paris in 2025: not a home.
      ...Array.from({ length: 21 }, (_, i) => photo(new Date(2025, 6, 1, 12).getTime() + i * D, PLACES.paris)),
    ];
    const homes = findHomes(photos);
    expect(distanceKm(homes.home!, HOME)).toBeLessThan(5);
    expect(distanceKm(homeAt(homes, y2024)!, berlin)).toBeLessThan(5);
    expect(distanceKm(homeAt(homes, y2025)!, HOME)).toBeLessThan(5);
  });

  it('is null without a single location', () => {
    expect(findHomes([photo(T0), photo(T0 + D)]).home).toBeNull();
  });
});

describe('trip detection', () => {
  const base = () => homeDays(T0 - 60 * D, 60);

  it('finds photos more than 50 km away over at least 6 hours', () => {
    const away = [photo(T0 + 10 * D, PLACES.paris), photo(T0 + 10 * D + 3 * H, PLACES.paris), photo(T0 + 11 * D, PLACES.paris)];
    const lib = makeLibrary([...base(), ...away]);
    const { trips } = detect(lib);
    expect(trips).toHaveLength(1);
    expect(trips[0].ids).toEqual(away.map(p => p.id));
    expect(trips[0].key).toBe('2026-03-11');
  });

  it('ignores a short outing and anything within 50 km', () => {
    const outing = [photo(T0 + 10 * D, PLACES.paris), photo(T0 + 10 * D + 4 * H, PLACES.paris)];
    const frankfurt = { lat: 50.11, lon: 8.68 }; // ~17 km
    const nearby = [photo(T0 + 12 * D, frankfurt), photo(T0 + 13 * D, frankfurt)];
    const { trips } = detect(makeLibrary([...base(), ...outing, ...nearby]));
    expect(trips).toHaveLength(0);
  });

  it('ends a trip at a photo taken at home, and after a long gap', () => {
    const a = [photo(T0 + 1 * D, PLACES.paris), photo(T0 + 2 * D, PLACES.paris)];
    const atHome = photo(T0 + 3 * D, HOME);
    const b = [photo(T0 + 4 * D, PLACES.rome), photo(T0 + 5 * D, PLACES.rome)];
    const c = [photo(T0 + 12 * D, PLACES.rome), photo(T0 + 13 * D, PLACES.rome)];
    const { trips } = detect(makeLibrary([...base(), ...a, atHome, ...b, ...c]));
    expect(trips.map(t => t.ids.length)).toEqual([2, 2, 2]);
  });

  it('lets photos without a location inside the window join, but not screenshots', () => {
    const away = [photo(T0 + 10 * D, PLACES.paris), photo(T0 + 12 * D, PLACES.paris)];
    const inside = photo(T0 + 11 * D);
    const shot = photo(T0 + 11 * D + H, undefined, { shot: true });
    const outside = photo(T0 + 13 * D);
    const { trips } = detect(makeLibrary([...base(), ...away, inside, shot, outside]));
    expect(trips[0].ids).toEqual([away[0].id, inside.id, away[1].id]);
  });

  it('gives two trips starting the same day different keys', () => {
    const homes = findHomes(base());
    const day = T0 + 20 * D;
    const photos = makeLibrary([
      ...base(),
      photo(day, PLACES.paris), photo(day + 7 * H, PLACES.paris),
      photo(day + 8 * H, HOME),
      photo(day + 9 * H, PLACES.rome), photo(day + 16 * H, PLACES.rome),
    ]).photos;
    const keys = detectTrips(photos, homes).map(t => t.key);
    expect(new Set(keys).size).toBe(2);
  });

  it('finds the trips of a whole made-up library', () => {
    const fake = fakeLibrary(6000, 3);
    const { trips } = detect(makeLibrary(fake.photos));
    // Every made-up trip (all ≥ 2 days, far from home) is found.
    for (const t of fake.trips) {
      const found = trips.some(x => x.start <= t.end && x.end >= t.start);
      expect(found).toBe(true);
    }
  });
});

describe('trip edits', () => {
  const timeOf = (id: string) => Number(id.slice(1));
  const raw = [
    { key: 'a', start: 100, end: 400, ids: ['t100', 't200', 't300', 't400'] },
    { key: 'b', start: 1000, end: 1100, ids: ['t1000', 't1100'] },
  ];

  it('cuts a trip into parts with their own keys', () => {
    const edits = addSplit(NO_EDITS, 'a', 250);
    const out = applyEdits(raw, edits, timeOf);
    expect(out.map(t => [t.key, t.ids])).toEqual([
      ['b', ['t1000', 't1100']],
      ['a+1', ['t300', 't400']],
      ['a', ['t100', 't200']],
    ]);
    expect(applyEdits(raw, removeSplits(edits, 'a+1'), timeOf)).toHaveLength(2);
  });

  it('joins trips under the earliest key, and can undo it', () => {
    const edits = addMerge(NO_EDITS, ['b', 'a']);
    const out = applyEdits(raw, edits, timeOf);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('a');
    expect(out[0].ids).toHaveLength(6);
    expect(applyEdits(raw, removeMerge(edits, 'a'), timeOf)).toHaveLength(2);
  });

  it('joins a part of a cut trip with another trip', () => {
    let edits = addSplit(NO_EDITS, 'a', 250);
    edits = addMerge(edits, ['a+1', 'b']);
    const out = applyEdits(raw, edits, timeOf);
    expect(out.map(t => t.key).sort()).toEqual(['a', 'a+1']);
    expect(out.find(t => t.key === 'a+1')!.ids).toEqual(['t300', 't400', 't1000', 't1100']);
  });

  it('extends an existing join instead of making a second one', () => {
    const edits = addMerge(addMerge(NO_EDITS, ['a', 'b']), ['b', 'c']);
    expect(edits.merges).toEqual([['a', 'b', 'c']]);
  });

  it('renames and hides trips by key', () => {
    let edits = setName(NO_EDITS, 'a', '  Oma in Paris ');
    edits = setIgnored(edits, 'b', true);
    const out = applyEdits(raw, edits, timeOf);
    expect(out.find(t => t.key === 'a')!.name).toBe('Oma in Paris');
    expect(out.find(t => t.key === 'b')!.ignored).toBe(true);
    expect(setName(edits, 'a', ' ').names).toEqual({});
    expect(setIgnored(edits, 'b', false).ignored).toEqual([]);
  });

  it('lists a trip by day for the cut sheet', () => {
    const t = new Date(2026, 4, 1, 10).getTime();
    const days = tripDays(['x', 'y', 'z'], id => ({ x: t, y: t + H, z: t + D }[id]!));
    expect(days.map(d => d.count)).toEqual([2, 1]);
  });
});

describe('trip names', () => {
  it('names a trip "City, Month Year" in the app language', () => {
    const munich = [photo(T0, PLACES.paris), photo(T0 + D, PLACES.paris)];
    expect(tripPlace(munich, index, 'de')).toBe('Paris');
    const m = [photo(T0, { lat: 48.14, lon: 11.58 }), photo(T0 + D, { lat: 48.13, lon: 11.56 })];
    expect(tripPlace(m, index, 'de')).toBe('München');
    expect(tripPlace(m, index, 'en')).toBe('Munich');
    expect(tripDates(T0, T0 + 2 * D, 'de-DE')).toBe('März 2026');
    expect(tripDates(T0, T0 + 40 * D, 'de-DE')).toBe('März – April 2026');
    expect(tripDates(new Date(2025, 11, 28).getTime(), new Date(2026, 0, 3).getTime(), 'en-GB')).toBe('December 2025 – January 2026');
  });

  it('falls back to the country when no city is near', () => {
    const sea = [photo(T0, { lat: 48.0, lon: 6.0 })]; // ~250 km from Paris and Munich, near no listed city
    const name = tripPlace(sea, index, 'de');
    expect(name === 'Frankreich' || name === 'Deutschland').toBe(true);
  });

  it('builds trips with titles, renamed ones keeping the automatic title', () => {
    const away = [photo(T0 + 10 * D, PLACES.paris), photo(T0 + 11 * D, PLACES.paris)];
    const lib = makeLibrary([...homeDays(T0 - 60 * D, 60), ...away]);
    const det = detect(lib);
    const state = emptyState();
    state.trips.names[det.trips[0].key] = 'Paris mit Oma';
    const [trip] = buildTrips(lib, det.trips, state, index, 'de', 'de-DE');
    expect(trip.title).toBe('Paris mit Oma');
    expect(trip.autoTitle).toBe('Paris, März 2026');
    expect(trip.bytes).toBe(4_000_000);
  });

  it('makes a safe folder name', () => {
    expect(folderName('Paris / Lyon: März 2026')).toBe('Paris Lyon März 2026');
    expect(folderName('...')).toBe('Bildklar');
  });
});
