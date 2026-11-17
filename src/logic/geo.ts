import type { Point } from '../types';

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function distanceKm(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export interface City {
  lat: number;
  lon: number;
  /** ISO country code, "DE". */
  cc: string;
  /** Population in thousands (at least 15). */
  pop: number;
  name: string;
  de?: string;
  en?: string;
}

/** A city's name in the app's language: its German or English name, else the local one. */
/** The city's name in the app's language: German or English from the table; Arabic uses the English one (the table has no Arabic names yet). */
export const cityName = (c: City, lang: string) => (lang === 'de' ? c.de : lang === 'en' || lang === 'ar' ? c.en : undefined) ?? c.name;

/** Parses src/data/cities.tsv (scripts/cities.mjs writes it). */
export function parseCities(tsv: string): City[] {
  const out: City[] = [];
  for (const line of tsv.split('\n')) {
    if (!line) continue;
    const [lat, lon, cc, pop, name, de, en] = line.split('\t');
    out.push({ lat: Number(lat), lon: Number(lon), cc, pop: Number(pop), name, de: de || undefined, en: en || undefined });
  }
  return out;
}

/** How far a photo may be from a city to be named after it. */
export const CITY_RADIUS_KM = 60;
/** How far to look for the country when no city is near (out at sea, in the mountains). */
const COUNTRY_RADIUS_KM = 400;

/**
 * The cities on a grid of 1° cells, so a lookup only reads the cells around
 * the point. "Nearest" leans towards bigger places — a photo 30 km outside
 * Paris is named after Paris, not after the small town next to it: the
 * score is the distance divided by the fourth root of the population.
 */
export class CityIndex {
  private cells = new Map<string, number[]>();

  constructor(readonly cities: City[]) {
    cities.forEach((c, i) => {
      const k = CityIndex.key(Math.floor(c.lat), Math.floor(c.lon));
      const list = this.cells.get(k);
      if (list) list.push(i); else this.cells.set(k, [i]);
    });
  }

  private static key(lat: number, lon: number) { return `${lat}:${lon}`; }

  private around(p: Point, reach: number): number[] {
    const out: number[] = [];
    const la = Math.floor(p.lat);
    const lo = Math.floor(p.lon);
    // Longitude degrees shrink towards the poles: look further east and west there.
    const lonReach = Math.min(180, Math.ceil(reach / Math.max(0.2, Math.cos(rad(p.lat)))));
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -lonReach; dx <= lonReach; dx++) {
        let lon = lo + dx;
        if (lon < -180) lon += 360; else if (lon >= 180) lon -= 360;
        const list = this.cells.get(CityIndex.key(la + dy, lon));
        if (list) for (const i of list) out.push(i);
      }
    }
    return out;
  }

  /** The city a photo taken at `p` is named after, or null when none is within CITY_RADIUS_KM. */
  nearest(p: Point): City | null {
    let best: City | null = null;
    let bestScore = Infinity;
    for (const i of this.around(p, 1)) {
      const c = this.cities[i];
      const d = distanceKm(p, c);
      if (d > CITY_RADIUS_KM) continue;
      const score = (d + 1) / Math.pow(c.pop, 0.25);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    return best;
  }

  /** The country of the closest city within COUNTRY_RADIUS_KM, or null. */
  country(p: Point): string | null {
    let best: string | null = null;
    let bestD = COUNTRY_RADIUS_KM;
    for (const i of this.around(p, 4)) {
      const c = this.cities[i];
      const d = distanceKm(p, c);
      if (d < bestD) { bestD = d; best = c.cc; }
    }
    return best;
  }
}
