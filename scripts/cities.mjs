// Builds the offline city table trips are named from: src/data/cities.tsv.
//
// Source: GeoNames (https://www.geonames.org), "cities15000" (every place
// with at least 15,000 people) and "alternateNamesV2" (the German and English
// names), licensed CC BY 4.0 — commercial use allowed with attribution. The
// attribution is in docs/CITIES.md and in the app (Einstellungen › Über die
// App › Lizenzen). The app never asks a server: this file ships inside it.
//
// The downloads (about 210 MB) are kept in .cache/geonames/ (gitignored).
// Run it again to refresh the table: `npm run cities`.
//
// One line per city, by population, tab-separated:
//   lat  lon  country  population(thousands)  name  [de name]  [en name]
// with lat/lon at 3 decimals (≈ 100 m) and the de/en names left empty when
// they equal the GeoNames name.
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execFileSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, '.cache', 'geonames');
const out = path.join(root, 'src', 'data', 'cities.tsv');
const BASE = 'https://download.geonames.org/export/dump/';

fs.mkdirSync(cache, { recursive: true });
for (const file of ['cities15000.zip', 'alternateNamesV2.zip']) {
  const target = path.join(cache, file);
  if (fs.existsSync(target)) continue;
  console.log(`Downloading ${file}…`);
  execFileSync('curl', ['-sSfL', '-o', target, BASE + file], { stdio: 'inherit' });
}

/** Lines of a file inside a zip, streamed (unzip is on every Mac and Linux). */
function lines(zip, member) {
  const child = spawn('unzip', ['-p', path.join(cache, zip), member]);
  return readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
}

const cities = new Map();
for await (const line of lines('cities15000.zip', 'cities15000.txt')) {
  const c = line.split('\t');
  // P = populated place; leave out sections of a city (PPLX) and places that are gone (PPLH, PPLQ, PPLW).
  if (c[6] !== 'P' || /^(PPLX|PPLH|PPLQ|PPLW|PPLCH)$/.test(c[7])) continue;
  cities.set(c[0], {
    lat: Number(c[4]), lon: Number(c[5]), cc: c[8], pop: Number(c[14]) || 0, name: c[1],
    de: null, en: null,
  });
}
console.log(`${cities.size} places`);

// A preferred name wins over the first one seen; colloquial and historic ones never count.
for await (const line of lines('alternateNamesV2.zip', 'alternateNamesV2.txt')) {
  const tab = line.indexOf('\t');
  const tab2 = line.indexOf('\t', tab + 1);
  const id = line.slice(tab + 1, tab2);
  const city = cities.get(id);
  if (!city) continue;
  const c = line.split('\t');
  const lang = c[2];
  if (lang !== 'de' && lang !== 'en') continue;
  if (c[6] === '1' || c[7] === '1') continue;
  const preferred = c[4] === '1';
  const slot = city[lang];
  if (!slot || (preferred && !slot.preferred)) city[lang] = { name: c[3], preferred };
}

const rows = [...cities.values()].sort((a, b) => b.pop - a.pop).map(c => {
  const de = c.de?.name && c.de.name !== c.name ? c.de.name : '';
  const en = c.en?.name && c.en.name !== c.name ? c.en.name : '';
  return [c.lat.toFixed(3), c.lon.toFixed(3), c.cc, Math.max(15, Math.round(c.pop / 1000)), c.name, de, en]
    .join('\t').replace(/\t+$/, '');
});
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, rows.join('\n') + '\n');
console.log(`Wrote ${path.relative(root, out)}: ${rows.length} cities, ${(fs.statSync(out).size / 1024).toFixed(0)} kB`);
