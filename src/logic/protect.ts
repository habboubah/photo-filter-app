import type { Photo } from '../types';

/*
 * Protected photos: never suggested for deleting, by any finder (similar and
 * duplicate groups, blurry, too dark / too bright, screenshots, the AI's
 * utility photos, the quick clean, every review). One rule instead of the
 * scattered "favourite or kept" checks. A photo is protected when it is
 *   - a favourite in Photos / the Gallery,
 *   - kept in a review against the app's suggestion (AppState.kept),
 *   - protected by hand (the shield in the review),
 *   - in a trip marked "Nie vorschlagen" [Never suggest],
 *   - in an album (iPhone) / folder (Android) chosen in Settings › Geschützt.
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
}

export const NO_PROTECTION: Protection = { ids: [], trips: [], albums: [] };

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
