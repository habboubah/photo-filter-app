import type { Photo } from '../types';
import type { RawGroup } from './similar';

/*
 * Lookalike videos: the same scene filmed twice — two takes of the kids on
 * the swing, a clip and its longer retry — which the exact-copy check
 * (src/logic/similar.ts findVideoDuplicates: the same length, shape and
 * poster) misses. Two videos are lookalikes when their poster frames'
 * embeddings from the on-device AI (scan schema 4's `emb`) are at least
 * LOOKALIKE_COSINE alike and they were taken within LOOKALIKE_WINDOW_MS of
 * each other. Videos already in an exact-copy group stay there.
 *
 * PROVISIONAL threshold (plan of 17 November 2026): calibrate it on the demo
 * videos plus 50 of Ahmad's real video pairs like the AI thresholds
 * (docs/AI.md) — an AUC and a precision of at least 95 % before it ships.
 */
export const LOOKALIKE_COSINE = 0.92;
export const LOOKALIKE_WINDOW_MS = 2 * 3600_000;

/** A packed embedding (768 int8 in base64) as a unit vector, or null when it can't be read. */
export function unpack(emb: string | undefined): Float32Array | null {
  if (!emb) return null;
  let raw: string;
  try { raw = atob(emb); } catch { return null; }
  if (!raw.length) return null;
  const v = new Float32Array(raw.length);
  let norm = 0;
  for (let i = 0; i < raw.length; i++) {
    const b = raw.charCodeAt(i);
    v[i] = b > 127 ? b - 256 : b;
    norm += v[i] * v[i];
  }
  if (!norm) return null;
  const k = 1 / Math.sqrt(norm);
  for (let i = 0; i < v.length; i++) v[i] *= k;
  return v;
}

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/** Groups of lookalike videos (kind 'lookalike'), each in time order; `exclude`: videos already in an exact-copy group. */
export function findLookalikeVideos(photos: Photo[], exclude: Set<string> = new Set(), minCosine = LOOKALIKE_COSINE): RawGroup[] {
  const list = photos.filter(p => p.video && !p.rec && !exclude.has(p.id)).sort((a, b) => a.t - b.t);
  const vecs = list.map(p => unpack(p.emb));
  const parent = list.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
    return i;
  };
  for (let i = 0; i < list.length; i++) {
    const vi = vecs[i];
    if (!vi) continue;
    for (let j = i + 1; j < list.length && list[j].t - list[i].t <= LOOKALIKE_WINDOW_MS; j++) {
      const vj = vecs[j];
      if (!vj || cosine(vi, vj) < minCosine) continue;
      const a = find(i);
      const b = find(j);
      if (a !== b) parent[Math.max(a, b)] = Math.min(a, b);
    }
  }
  const groups = new Map<number, Photo[]>();
  for (let i = 0; i < list.length; i++) {
    if (!vecs[i]) continue;
    const r = find(i);
    const g = groups.get(r);
    if (g) g.push(list[i]); else groups.set(r, [list[i]]);
  }
  return [...groups.values()]
    .filter(members => members.length > 1)
    .map(members => {
      const ids = members.map(p => p.id);
      return { key: `l:${ids[0]}`, ids, kind: 'lookalike' as const };
    });
}

/** Below this the poster frame counts as blurry (the Laplacian's variance, as src/logic/blur.ts MEDIUM). */
const SHARP_POSTER = 30;

/** The take to keep: a favourite, else the longest sharp one, then the larger file, then the older. */
export function rankLookalike(photos: Photo[]): Photo[] {
  const sharp = (p: Photo) => (p.sharp ?? SHARP_POSTER) >= SHARP_POSTER;
  const ranked = [...photos].sort((a, b) =>
    Number(sharp(b)) - Number(sharp(a)) || (b.dur ?? 0) - (a.dur ?? 0) || b.bytes - a.bytes || a.t - b.t);
  const fav = photos.find(p => p.fav);
  return fav ? [fav, ...ranked.filter(p => p !== fav)] : ranked;
}
