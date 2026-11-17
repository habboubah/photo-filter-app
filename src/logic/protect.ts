import type { Photo } from '../types';
import type { Vectors } from './vectors';

/*
 * Protected photos: never suggested for deleting, by any finder (similar and
 * duplicate groups, blurry, too dark / too bright, screenshots, the AI's
 * utility photos, the quick clean, every review). One rule instead of the
 * scattered "favourite or kept" checks. A photo is protected when it is
 *   - a favourite in Photos / the Gallery,
 *   - kept in a review against the app's suggestion (AppState.kept),
 *   - protected by hand (the shield in the review),
 *   - in a trip marked "Nie vorschlagen" [Never suggest],
 *   - in an album (iPhone) / folder (Android) chosen in Settings › Geschützt,
 *   - very like a photo protected by hand, taken at another time ("Ähnliche
 *     mitschützen", on unless switched off: the same document, the same
 *     scene photographed again — likeProtected below),
 *   - an identity document or a bank card (src/logic/ai.ts sensitiveLabel).
 * Inside a similar or duplicate group a protected photo stays and ranks like
 * a favourite, so it can become the best shot.
 */
export interface Protection {
  /** Photos protected by hand. */
  ids: string[];
  /** Trip keys (src/logic/trips.ts) whose photos are never suggested. */
  trips: string[];
  /** Album ids (iPhone: PHAssetCollection.localIdentifier; Android: the folder's RELATIVE_PATH). */
  albums: string[];
  /** Photos very like one protected by hand are protected too (likeProtected); on unless switched off. */
  similar: boolean;
}

export const NO_PROTECTION: Protection = { ids: [], trips: [], albums: [], similar: true };

/** "Very like": at least this alike (the AI's vectors' cosine). */
export const PROTECT_COS = 0.92;
/** …and taken at least this far apart: the rest of a burst stays a burst to clean up. */
export const PROTECT_APART_MS = 3600_000;

/**
 * The photos very like one protected by hand (src/logic/vectors.ts): at least
 * PROTECT_COS alike and taken PROTECT_APART_MS or more apart from it — the
 * same document or scene photographed again, not the other frames of the
 * same moment (those stay in their similar group, the protected one ranks
 * first there).
 */
export function likeProtected(vectors: Vectors, ids: string[], timeOf: (id: string) => number | undefined): Set<string> {
  const out = new Set<string>();
  for (const id of ids) {
    const t = timeOf(id);
    if (t === undefined) continue;
    for (const n of vectors.nearest(id, PROTECT_COS, 500)) {
      const tn = timeOf(n.id);
      if (tn !== undefined && Math.abs(tn - t) >= PROTECT_APART_MS) out.add(n.id);
    }
  }
  return out;
}

/**
 * Every protected photo id but the favourites (those carry `fav`). `tripIds`
 * gives a trip's photos; `albumMembers` are the photos of the protected albums
 * (PhotoLibrary.albumMembers, asked once per load).
 */
export function protectedIds(
  kept: string[], protection: Protection, tripIds: (key: string) => string[] | undefined, albumMembers: Iterable<string> = [],
): Set<string> {
  const out = new Set<string>(kept);
  for (const id of protection.ids) out.add(id);
  for (const key of protection.trips) for (const id of tripIds(key) ?? []) out.add(id);
  for (const id of albumMembers) out.add(id);
  return out;
}

/** The one rule every finder asks. `guard`: protectedIds(). */
export const isProtected = (p: Pick<Photo, 'id' | 'fav'> | undefined, guard: Set<string>): boolean =>
  !!p && (!!p.fav || guard.has(p.id));

/** Adds or removes ids in a list, keeping its order and never doubling. */
export function toggled(list: string[], ids: string[], on: boolean): string[] {
  if (on) { const add = ids.filter(id => !list.includes(id)); return add.length ? [...list, ...add] : list; }
  const gone = new Set(ids);
  const left = list.filter(id => !gone.has(id));
  return left.length === list.length ? list : left;
}
