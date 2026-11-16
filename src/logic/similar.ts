import type { Photo } from '../types';
import { hamming, hashParts } from './features';

/*
 * Similar photos: near-identical shots taken within a short time. Two photos
 * are near-identical when their hashes differ in at most MAX_DISTANCE of 64
 * bits and they were taken at most WINDOW_MS apart; a group is everything
 * linked that way (union–find), at least two photos. Screenshots and photos
 * without a hash are left out.
 */
export const WINDOW_MS = 3 * 60_000;
export const MAX_DISTANCE = 10;

export interface RawGroup { key: string; ids: string[] }

/** `photos` must be sorted by time. */
export function findGroups(photos: Photo[], windowMs = WINDOW_MS, maxDistance = MAX_DISTANCE): RawGroup[] {
  const list = photos.filter(p => p.hash && !p.shot);
  const parts = list.map(p => hashParts(p.hash!));
  const parent = list.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length && list[j].t - list[i].t <= windowMs; j++) {
      if (hamming(parts[i], parts[j]) > maxDistance) continue;
      const a = find(i);
      const b = find(j);
      if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
    }
  }
  const groups = new Map<number, string[]>();
  for (let i = 0; i < list.length; i++) {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(list[i].id); else groups.set(r, [list[i].id]);
  }
  return [...groups.values()]
    .filter(ids => ids.length > 1)
    .map(ids => ({ key: `g:${ids[0]}`, ids }));
}
