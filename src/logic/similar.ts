import type { GroupKind, Photo } from '../types';
import { hamming, hashParts } from './features';

/*
 * Groups of photos that show the same picture, of two kinds:
 *
 * - similar: near-identical shots taken within a short time — their hashes
 *   differ in at most MAX_DISTANCE of 64 bits and they were taken at most
 *   WINDOW_MS apart (a burst, a series of the same pose);
 * - duplicate: the same picture again, however far apart in time — hashes at
 *   most DUP_DISTANCE apart, the same shape (aspect ratio within DUP_ASPECT)
 *   and the same light: mean brightness within DUP_EXPO and contrast within
 *   DUP_CONTRAST (a copy keeps both; the same view shot another day rarely
 *   does). A photo saved again from a messenger weeks later, an imported
 *   copy, a re-download. The hash is coarse (9 × 8 cells), so these extra
 *   checks keep two moments at the same swing from counting as copies; the
 *   user still sees every group before anything goes.
 *
 * Both links go into one union–find, so a photo is in one group at most. A
 * group is a duplicate group when at least one of its links spans more than
 * the time window; otherwise it is a similar group. Screenshots and photos
 * without a hash are left out. Hashes with almost no bits set (or almost all)
 * come from flat pictures — a black pocket shot, a white wall — and match
 * each other without being the same picture, so they never link as duplicates.
 *
 * Finding duplicates in 50,000 photos without comparing every pair: the
 * 64-bit hash is cut into DUP_BLOCKS blocks; two hashes at most DUP_DISTANCE
 * bits apart agree completely on at least one block (pigeonhole: DUP_BLOCKS >
 * DUP_DISTANCE), so only photos sharing a block are compared.
 */
export const WINDOW_MS = 3 * 60_000;
export const MAX_DISTANCE = 10;
export const DUP_DISTANCE = 2;
export const DUP_ASPECT = 0.01;
export const DUP_EXPO = 0.03;
export const DUP_CONTRAST = 0.08;
const DUP_BLOCKS = 4; // 16 bits each; must stay above DUP_DISTANCE
/** A bucket this full is a flat or repetitive picture shared by many photos: skipped rather than compared pair by pair. */
const MAX_BUCKET = 400;
/** Fewer set bits than this (or more than 64 minus this) is a flat picture: sky, a wall, a dark room. */
const MIN_BITS = 12;

export interface RawGroup { key: string; ids: string[]; kind: GroupKind }

const popcount = (x: number) => {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

const sameShape = (a: Photo, b: Photo) => {
  if (!a.w || !a.h || !b.w || !b.h) return false;
  const ra = a.w / a.h;
  const rb = b.w / b.h;
  return Math.abs(ra - rb) <= DUP_ASPECT * Math.max(ra, rb);
};

const sameLight = (a: Photo, b: Photo) => {
  if (a.expo !== undefined && b.expo !== undefined && Math.abs(a.expo - b.expo) > DUP_EXPO) return false;
  if (a.contrast !== undefined && b.contrast !== undefined) {
    const top = Math.max(a.contrast, b.contrast);
    if (top > 0 && Math.abs(a.contrast - b.contrast) > DUP_CONTRAST * top) return false;
  }
  return true;
};

/** `photos` must be sorted by time. */
export function findGroups(photos: Photo[], windowMs = WINDOW_MS, maxDistance = MAX_DISTANCE): RawGroup[] {
  const list = photos.filter(p => p.hash && !p.shot);
  const parts = list.map(p => hashParts(p.hash!));
  const parent = list.map((_, i) => i);
  /** Per root: whether the group holds a link across more than the time window. */
  const far = new Uint8Array(list.length);
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  const link = (i: number, j: number, isFar: boolean) => {
    const a = find(i);
    const b = find(j);
    const root = Math.min(a, b);
    if (a !== b) parent[Math.max(a, b)] = root;
    far[root] = far[a] | far[b] | (isFar ? 1 : 0);
  };

  // Similar: close in time.
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length && list[j].t - list[i].t <= windowMs; j++) {
      if (hamming(parts[i], parts[j]) <= maxDistance) link(i, j, false);
    }
  }

  // Duplicates: anywhere in time, through the block index.
  const buckets = new Map<number, number[]>();
  for (let i = 0; i < list.length; i++) {
    const [hi, lo] = parts[i];
    const bits = popcount(hi) + popcount(lo);
    if (bits < MIN_BITS || bits > 64 - MIN_BITS) continue;
    const blocks = [hi >>> 16, hi & 0xffff, lo >>> 16, lo & 0xffff];
    for (let b = 0; b < DUP_BLOCKS; b++) {
      const key = b * 0x10000 + blocks[b];
      const bucket = buckets.get(key);
      if (bucket) bucket.push(i); else buckets.set(key, [i]);
    }
  }
  for (const bucket of buckets.values()) {
    if (bucket.length < 2 || bucket.length > MAX_BUCKET) continue;
    for (let x = 0; x < bucket.length; x++) {
      const i = bucket[x];
      for (let y = x + 1; y < bucket.length; y++) {
        const j = bucket[y];
        if (hamming(parts[i], parts[j]) > DUP_DISTANCE || !sameShape(list[i], list[j]) || !sameLight(list[i], list[j])) continue;
        const isFar = Math.abs(list[j].t - list[i].t) > windowMs;
        if (isFar || find(i) !== find(j)) link(i, j, isFar);
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < list.length; i++) {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(i); else groups.set(r, [i]);
  }
  return [...groups.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([root, members]) => {
      const ids = members.map(i => list[i].id);
      const kind: GroupKind = far[root] ? 'duplicate' : 'similar';
      return { key: `${kind === 'duplicate' ? 'd' : 'g'}:${ids[0]}`, ids, kind };
    });
}
