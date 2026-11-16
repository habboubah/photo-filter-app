import citiesUrl from './data/cities.tsv?url';
import { CityIndex, parseCities } from './logic/geo';

/*
 * The offline city table (src/data/cities.tsv, from GeoNames — see
 * docs/CITIES.md) is a file of the app's own bundle, about 1 MB, fetched from
 * the app's own origin the first time a trip needs a name. No server is
 * asked: on the phones the "fetch" reads a file inside the app.
 */
let pending: Promise<CityIndex | null> | null = null;

export function loadCities(): Promise<CityIndex | null> {
  pending ??= fetch(citiesUrl)
    .then(r => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
    .then(text => new CityIndex(parseCities(text)))
    .catch(() => { pending = null; return null; });
  return pending;
}
