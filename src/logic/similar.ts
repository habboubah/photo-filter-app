import type { GroupKind, Photo } from '../types';
import { hamming, hashParts } from './features';
import type { Vectors } from './vectors';

/*
 * Groups of photos that show the same picture, of two kinds:
 *
 * - similar: near-identical shots taken within a short time — their hashes
 *   differ in at most MAX_DISTANCE of 64 bits and they were taken at most
 *   WINDOW_MS apart (a burst, a series of the same pose); or the same scene
 *   taken up to SCENE_WINDOW_MS apart, when the AI's vectors are very alike
 *   (SCENE_COS) and the hashes not far (SCENE_DISTANCE);
 * - duplicate: the same picture again, however far apart in time — hashes at
 *   most DUP_DISTANCE apart, the same shape (aspect ratio within DUP_ASPECT)
 *   and the same light: mean brightness within DUP_EXPO and contrast within
 *   DUP_CONTRAST (a copy keeps both; the same view shot another day rarely
 *   does). A photo saved again from a messenger weeks later, an imported
 *   copy, a re-download. With the AI's vectors also a copy that was edited or
 *   filtered: hashes at most DUP_EMB_DISTANCE apart, the same shape and
 *   vectors at least DUP_COS alike (`weak`: the app is less sure, the user
 *   checks it).
 *
 * Two signals, since AI version 2 (docs/AI.md, "Groups"): where both photos
 * have a compact vector (src/logic/vectors.ts), a similar link also needs
 * them at least SIM_COS alike — the hash alone joins two different shots
 * taken a moment apart at the same swing, the #1 complaint about photo
 * cleaners. And a group of three or more is checked against its medoid (the
 * member most like the others): a photo less than MEDOID_COS like it leaves,
 * so a chain of links cannot drag in a different scene. Without vectors (the
 * AI's pass hasn't reached the photos yet) the hash decides, as before.
 *
 * All links go into one union–find, so a photo is in one group at most. A
 * group is a duplicate group when at least one of its links spans more than
 * the time window; otherwise it is a similar group. Screenshots and photos
 * without a hash are left out. Hashes with almost no bits set (or almost all)
 * come from flat pictures — a black pocket shot, a white wall — and match
 * each other without being the same picture, so they never link as duplicates.
 *
 * Finding duplicates in 50,000 photos without comparing every pair: the
 * 64-bit hash is cut into five blocks (13, 13, 13, 13 and 12 bits); two hashes at most
 * DUP_EMB_DISTANCE bits apart agree completely on at least one block
 * (pigeonhole: 5 > DUP_EMB_DISTANCE), so only photos sharing a block are
 * compared — each pair once, in the first block they share.
 *
 * PROVISIONAL cosines (17 November 2026, ml/: 800 held-out COCO photos with
 * made copies and neighbouring frames): copies and same-shot pairs mostly
 * above 0.88, different photos of a similar scene around 0.78 (95 % below
 * 0.89), unrelated photos below 0.73. Tune on Ahmad's pairs (docs/AI.md).
 */
export const WINDOW_MS = 3 * 60_000;
export const MAX_DISTANCE = 10;
export const DUP_DISTANCE = 2;
export const DUP_ASPECT = 0.01;
export const DUP_EXPO = 0.03;
export const DUP_CONTRAST = 0.08;
export const SIM_COS = 0.87;
export const SCENE_WINDOW_MS = 30 * 60_000;
export const SCENE_DISTANCE = 16;
export const SCENE_COS = 0.95;
export const DUP_EMB_DISTANCE = 4;
export const DUP_COS = 0.95;
export const MEDOID_COS = 0.84;
/** A bucket this full is a flat or repetitive picture shared by many photos: skipped rather than compared pair by pair. */
const MAX_BUCKET = 400;
/** Fewer set bits than this (or more than 64 minus this) is a flat picture: sky, a wall, a dark room. */
const MIN_BITS = 12;

export interface RawGroup {
  key: string;
  ids: string[];
  kind: GroupKind;
  /** A duplicate group held together by at least one copy only the AI's vectors confirmed (an edited or filtered copy). */
  weak?: boolean;
}

/*
 * Duplicate videos: the same length (within VIDEO_DUR_MS or 1 %), the same
 * shape and poster frames at most VIDEO_DISTANCE bits apart. Videos are few
 * next to photos, so they are compared within runs of similar length.
 */
export const VIDEO_DUR_MS = 500;
export const VIDEO_DISTANCE = 4;

export function findVideoDuplicates(photos: Photo[]): RawGroup[] {
  const list = photos.filter(p => p.video && p.hash && (p.dur ?? 0) > 0).sort((a, b) => a.dur! - b.dur! || a.t - b.t);
  const parts = list.map(p => hashParts(p.hash!));
  const parent = list.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  for (let i = 0; i < list.length; i++) {
    const slack = Math.max(VIDEO_DUR_MS, list[i].dur! * 0.01);
    for (let j = i + 1; j < list.length && list[j].dur! - list[i].dur! <= slack; j++) {
      if (hamming(parts[i], parts[j]) > VIDEO_DISTANCE || !sameShape(list[i], list[j])) continue;
      const a = find(i);
      const b = find(j);
      if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
    }
  }
  const groups = new Map<number, Photo[]>();
  for (let i = 0; i < list.length; i++) {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(list[i]); else groups.set(r, [list[i]]);
  }
  return [...groups.values()]
    .filter(members => members.length > 1)
    .map(members => {
      const ids = members.sort((a, b) => a.t - b.t).map(p => p.id);
      return { key: `v:${ids[0]}`, ids, kind: 'duplicate' as const };
    });
}

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

/** The hash's five blocks for the duplicate index (13, 13, 13, 13, 12 bits, high bits first) from its two 32-bit halves. */
function blocks(hi: number, lo: number): number[] {
  return [hi >>> 19, (hi >>> 6) & 0x1fff, ((hi & 0x3f) << 7) | (lo >>> 25), (lo >>> 12) & 0x1fff, lo & 0xfff];
}

/**
 * `photos` must be sorted by time. `vectors`: the AI's compact vectors, where
 * the phone has them — a link between two photos that both have one also needs
 * their cosine (see above).
 */
export function findGroups(photos: Photo[], windowMs = WINDOW_MS, maxDistance = MAX_DISTANCE, vectors?: Vectors): RawGroup[] {
  const list = photos.filter(p => p.hash && !p.shot && !p.video);
  const parts = list.map(p => hashParts(p.hash!));
  const slots = list.map(p => vectors?.slot(p.id) ?? -1);
  /** The cosine of two photos, or null when either has no vector. */
  const cos = (i: number, j: number): number | null => (slots[i] < 0 || slots[j] < 0 ? null : vectors!.cosAt(slots[i], slots[j]));
  const parent = list.map((_, i) => i);
  /** Per root: whether the group holds a link across more than the time window, and one only the vectors confirmed. */
  const far = new Uint8Array(list.length);
  const weak = new Uint8Array(list.length);
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  const link = (i: number, j: number, isFar: boolean, isWeak = false) => {
    const a = find(i);
    const b = find(j);
    const root = Math.min(a, b);
    if (a !== b) parent[Math.max(a, b)] = root;
    far[root] = far[a] | far[b] | (isFar ? 1 : 0);
    weak[root] = weak[a] | weak[b] | (isWeak ? 1 : 0);
  };

  // Similar: close in time — and, with vectors, alike enough; the same scene a little later when very alike
  // (that needs vectors: without any, the time window is all there is to look at).
  const reach = vectors?.size ? SCENE_WINDOW_MS : windowMs;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length && list[j].t - list[i].t <= reach; j++) {
      const d = hamming(parts[i], parts[j]);
      if (list[j].t - list[i].t <= windowMs) {
        if (d > maxDistance) continue;
        const c = cos(i, j);
        if (c === null || c >= SIM_COS) link(i, j, false);
      } else if (d <= SCENE_DISTANCE) {
        const c = cos(i, j);
        if (c !== null && c >= SCENE_COS) link(i, j, false);
      }
    }
  }

  // Duplicates: anywhere in time, through the block index.
  const buckets = new Map<number, number[]>();
  const blockOf: number[][] = [];
  for (let i = 0; i < list.length; i++) {
    const [hi, lo] = parts[i];
    const bits = popcount(hi) + popcount(lo);
    if (bits < MIN_BITS || bits > 64 - MIN_BITS) continue;
    const bl = blocks(hi, lo);
    blockOf[i] = bl;
    for (let b = 0; b < bl.length; b++) {
      const key = b * 0x10000 + bl[b]; // a block has at most 13 bits
      const bucket = buckets.get(key);
      if (bucket) bucket.push(i); else buckets.set(key, [i]);
    }
  }
  for (const [key, bucket] of buckets) {
    if (bucket.length < 2 || bucket.length > MAX_BUCKET) continue;
    const b = Math.floor(key / 0x10000);
    for (let x = 0; x < bucket.length; x++) {
      const i = bucket[x];
      for (let y = x + 1; y < bucket.length; y++) {
        const j = bucket[y];
        const d = hamming(parts[i], parts[j]);
        if (d > DUP_EMB_DISTANCE) continue;
        // Each pair once: in the first block the two share.
        let earlier = false;
        for (let e = 0; e < b && !earlier; e++) earlier = blockOf[i][e] === blockOf[j][e];
        if (earlier || !sameShape(list[i], list[j])) continue;
        const c = cos(i, j);
        const isFar = Math.abs(list[j].t - list[i].t) > windowMs;
        if (d <= DUP_DISTANCE && sameLight(list[i], list[j])) {
          // Two different moments with the same coarse hash but unlike vectors are no copies.
          if (c !== null && c < SIM_COS) continue;
          if (isFar || find(i) !== find(j)) link(i, j, isFar);
        } else if (c !== null && c >= DUP_COS && isFar) {
          link(i, j, true, true);
        }
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < list.length; i++) {
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(i); else groups.set(r, [i]);
  }
  const out: RawGroup[] = [];
  for (const [root, all] of groups) {
    // Similar groups of three or more: every member must be like the group's medoid.
    const members = !far[root] && all.length > 2 ? aroundMedoid(all, cos) : all;
    if (members.length < 2) continue;
    const ids = members.map(i => list[i].id);
    const kind: GroupKind = far[root] ? 'duplicate' : 'similar';
    out.push({ key: `${kind === 'duplicate' ? 'd' : 'g'}:${ids[0]}`, ids, kind, ...(weak[root] && far[root] ? { weak: true } : {}) });
  }
  return out;
}

/** The members at least MEDOID_COS like the group's medoid (the one most like the others); all of them when the vectors are missing. */
function aroundMedoid(members: number[], cos: (i: number, j: number) => number | null): number[] {
  if (members.some(i => cos(i, i) === null)) return members;
  let medoid = members[0];
  let bestSum = -Infinity;
  for (const i of members) {
    let sum = 0;
    for (const j of members) if (j !== i) sum += cos(i, j)!;
    if (sum > bestSum) { bestSum = sum; medoid = i; }
  }
  return members.filter(i => i === medoid || cos(i, medoid)! >= MEDOID_COS);
}
