# The city table

Trips are named after the city most of their photos were taken near
("Paris, Mai 2026"). The app finds that city **offline**, in a table that
ships inside it — no geocoding server is ever asked.

| | |
|---|---|
| File | `src/data/cities.tsv` (about 1 MB; loaded on demand from the app's own bundle) |
| Made by | `npm run cities` (`scripts/cities.mjs`) |
| Source | [GeoNames](https://www.geonames.org) — `cities15000` (every populated place with at least 15,000 people) and `alternateNamesV2` (the German and English names) |
| Licence | **Creative Commons Attribution 4.0** (CC BY 4.0) — commercial use allowed with attribution |
| Attribution | In the app: *Einstellungen › Über die App › Lizenzen* ("Ortsnamen: GeoNames (geonames.org), Lizenz CC BY 4.0"); here; and in the privacy pages |
| Built | 16 November 2026: 31,800 places |

## Format

One line per place, by population, tab-separated:

```
lat   lon   country   population (thousands)   name   [German name]   [English name]
48.137	11.575	DE	1505	Munich	München
```

Coordinates have three decimals (about 100 m). The German or English name is
left empty when it equals GeoNames' own name.

## How a place is picked

For each located photo of a trip (up to 240, evenly spread), the city within
60 km with the smallest `(distance + 1) / population^¼` — so a photo taken
30 km outside Paris is named after Paris, not after the small town next to
it. The trip takes the city most photos voted for. With no city within 60 km
(out at sea, in the mountains) it takes the country of the nearest city
within 400 km, named by the phone (`Intl.DisplayNames`).

## Refreshing it

Run `npm run cities` again (it keeps its downloads in `.cache/geonames/`;
delete them to fetch fresh ones). Commit the new `cities.tsv` and update the
"Built" line above.
