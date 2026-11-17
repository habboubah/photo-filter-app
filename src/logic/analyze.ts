import type { CleanupSummary, Confidence, Group, Photo, Trip } from '../types';
import { rankDuplicates, rankGroup, weightsFor } from './best';
import { blurLevel, sortBlurry } from './blur';
import { exposureLevel } from './exposure';
import { isProtected } from './protect';
import { CityIndex } from './geo';
import { findHomes, Homes } from './home';
import { tripDates, tripPlace } from './naming';
import { findGroups, findVideoDuplicates, RawGroup } from './similar';
import { AppState } from './state';
import { applyEdits, detectTrips, RawTrip } from './trips';
import { findLookalikeVideos, rankLookalike } from './lookalike';
import type { Vectors } from './vectors';

/*
 * Everything the screens show, from the photos and the user's decisions.
 * `detect` is the heavy part (homes, trips, similar groups) and runs once per
 * set of photos; the rest is cheap and runs again on every edit. The budget
 * for `detect` on 50,000 photos is in scripts/perf-check.mjs.
 */

export interface Library {
  /** By time, oldest first. */
  photos: Photo[];
  byId: Map<string, Photo>;
}

export function makeLibrary(rows: Photo[]): Library {
  const photos = [...rows].sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
  return { photos, byId: new Map(photos.map(p => [p.id, p])) };
}

export interface Detection {
  homes: Homes;
  trips: RawTrip[];
  groups: RawGroup[];
}

/** `vectors`: the AI's compact vectors (src/logic/vectors.ts) — similar groups and copies are confirmed with them. */
export function detect(lib: Library, vectors?: Vectors): Detection {
  const homes = findHomes(lib.photos);
  const copies = findVideoDuplicates(lib.photos);
  const lookalike = findLookalikeVideos(lib.photos, new Set(copies.flatMap(g => g.ids)));
  return { homes, trips: detectTrips(lib.photos, homes), groups: [...findGroups(lib.photos, undefined, undefined, vectors), ...copies, ...lookalike] };
}

const sumBytes = (ids: string[], byId: Map<string, Photo>) => ids.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);

export function buildTrips(lib: Library, raw: RawTrip[], state: AppState, index: CityIndex | null, lang: string, locale: string): Trip[] {
  const timeOf = (id: string) => lib.byId.get(id)?.t ?? 0;
  return applyEdits(raw, state.trips, timeOf).map(t => {
    const photos = t.ids.map(id => lib.byId.get(id)).filter((p): p is Photo => !!p);
    const place = tripPlace(photos, index, lang) ?? '';
    const dates = tripDates(t.start, t.end, locale);
    // Arabic writes its own comma (،); everything else the Latin one.
    const autoTitle = place ? `${place}${lang === 'ar' ? '، ' : ', '}${dates}` : dates;
    return {
      key: t.key, start: t.start, end: t.end, ids: t.ids,
      place, dates, autoTitle, title: t.name ?? autoTitle,
      ignored: t.ignored,
      album: state.trips.albums[t.key],
      bytes: sumBytes(t.ids, lib.byId),
    };
  });
}

/**
 * `faces`: face scores the iPhone worked out after the scan (PhotoLibrary.scoreFaces), laid over the photos for ranking.
 * `guard`: the protected photos (src/logic/protect.ts) — they rank like a favourite, so one can become the best shot.
 */
export function buildGroups(lib: Library, raw: RawGroup[], state: AppState, faces?: Map<string, Partial<Photo>>, guard?: Set<string>): Group[] {
  return raw.map(g => {
    const photos = g.ids.map(id => {
      const p = lib.byId.get(id);
      const f = faces?.get(id);
      const ranked = p && f ? { ...p, ...f } : p;
      return ranked && !ranked.fav && guard?.has(id) ? { ...ranked, fav: true } : ranked;
    }).filter((p): p is Photo => !!p);
    const ranked = g.kind === 'duplicate' ? rankDuplicates(photos) : g.kind === 'lookalike' ? rankLookalike(photos) : rankGroup(photos, weightsFor(state.picks));
    const suggested = ranked[0]?.id ?? g.ids[0];
    const picked = state.best[g.key];
    return { key: g.key, kind: g.kind, ids: g.ids, suggested, best: picked && g.ids.includes(picked) ? picked : suggested, ...(g.weak ? { weak: true } : {}) };
  }).sort((a, b) => (lib.byId.get(b.ids[0])?.t ?? 0) - (lib.byId.get(a.ids[0])?.t ?? 0));
}

/**
 * The groups with something left to suggest: a group whose every photo but
 * the one to keep is kept (all kept with "Alle behalten", in a review, or
 * protected) is settled and not shown again. A new copy joining it later
 * opens it again — that one is not kept.
 */
/** A group of videos: lookalike takes, or copies of a video. They are listed apart from the photos ("Ähnliche Videos"). */
export function isVideoGroup(g: Group, byId: Map<string, Photo>): boolean {
  return g.kind === 'lookalike' || (g.kind === 'duplicate' && !!byId.get(g.ids[0])?.video);
}

/** All photos and all videos of the library, counted and sized (the analysis on Aufräumen). */
export function mediaTotals(photos: Photo[]): { photos: { count: number; bytes: number }; videos: { count: number; bytes: number } } {
  const out = { photos: { count: 0, bytes: 0 }, videos: { count: 0, bytes: 0 } };
  for (const p of photos) { const into = p.video ? out.videos : out.photos; into.count++; into.bytes += p.bytes; }
  return out;
}

export function openGroups(groups: Group[], kept: Set<string>): Group[] {
  return groups.filter(g => g.ids.some(id => id !== g.best && !kept.has(id)));
}

/**
 * The blurry photos worth listing, most certain first: not in a similar group
 * (the group handles those), no favourites, and none that is too dark or too
 * bright (src/logic/exposure.ts lists those; the sharpness of a black frame
 * means little).
 */
export function findBlurry(lib: Library, groups: Group[], levels: Confidence[] = ['high', 'medium', 'low']): Photo[] {
  const grouped = new Set(groups.flatMap(g => g.ids));
  const wanted = new Set(levels);
  return sortBlurry(lib.photos.filter(p => {
    if (p.fav || grouped.has(p.id) || exposureLevel(p)) return false;
    const level = blurLevel(p);
    return level !== null && wanted.has(level);
  }));
}

/**
 * What could go: each similar or duplicate group's extra shots, the blurry
 * photos the app is fairly sure about (high and medium), the too dark and too
 * bright ones (`exposure`: src/logic/exposure.ts), the old screenshots
 * (`shots`, already filtered: src/logic/screenshots.ts) and the utility
 * photos the on-device AI found (`utility`: src/logic/ai.ts) — each photo
 * counted once, never a favourite and never a photo the user already chose to keep.
 */
export function summarize(
  lib: Library, groups: Group[], blurry: Photo[], kept: Set<string>, shots: Photo[] = [], utility: Photo[] = [], exposure: Photo[] = [],
): CleanupSummary {
  const counted = new Set<string>();
  const tally = { similar: { count: 0, bytes: 0, groups: 0 }, duplicate: { count: 0, bytes: 0, groups: 0 }, lookalike: { count: 0, bytes: 0, groups: 0 } };
  for (const g of groups) {
    // Videos apart from photos: a copy of a video counts with the lookalike takes ("Ähnliche Videos").
    const into = tally[isVideoGroup(g, lib.byId) ? 'lookalike' : g.kind];
    let any = false;
    for (const id of g.ids) {
      const p = lib.byId.get(id);
      if (!p || id === g.best || isProtected(p, kept)) continue;
      into.count++; into.bytes += p.bytes; any = true;
      counted.add(id);
    }
    if (any) into.groups++;
  }
  let bc = 0; let bb = 0;
  for (const p of blurry) {
    const level = blurLevel(p);
    if (isProtected(p, kept) || (level !== 'high' && level !== 'medium')) continue;
    bc++; bb += p.bytes;
    counted.add(p.id);
  }
  let ec = 0; let eb = 0;
  for (const p of exposure) {
    if (isProtected(p, kept) || counted.has(p.id)) continue;
    ec++; eb += p.bytes;
    counted.add(p.id);
  }
  let sc = 0; let sb = 0;
  for (const p of shots) {
    if (isProtected(p, kept)) continue;
    sc++; sb += p.bytes;
  }
  let uc = 0; let ub = 0;
  for (const p of utility) {
    if (isProtected(p, kept) || counted.has(p.id)) continue;
    uc++; ub += p.bytes;
  }
  const count = tally.similar.count + tally.duplicate.count + tally.lookalike.count + bc + ec + sc + uc;
  const bytes = tally.similar.bytes + tally.duplicate.bytes + tally.lookalike.bytes + bb + eb + sb + ub;
  return {
    similar: tally.similar,
    duplicates: tally.duplicate,
    lookalike: tally.lookalike,
    blurry: { count: bc, bytes: bb },
    exposure: { count: ec, bytes: eb },
    screenshots: { count: sc, bytes: sb },
    utility: { count: uc, bytes: ub },
    total: { count, bytes },
  };
}

/** The blurry photos the clean-up card counts (high and medium, not kept). */
export const cleanupBlurry = (blurry: Photo[], kept: Set<string>) =>
  blurry.filter(p => !kept.has(p.id) && (blurLevel(p) === 'high' || blurLevel(p) === 'medium'));
