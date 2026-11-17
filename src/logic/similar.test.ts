import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { makeLibrary } from './analyze';
import { rankDuplicates } from './best';
import { nearHash, prng } from './fixtures';
import { DUP_COS, MEDOID_COS, SCENE_COS, SIM_COS, findGroups } from './similar';
import { VEC_DIM, Vectors, pack } from './vectors';

const MIN = 60_000;
const DAY = 24 * 3600_000;
const T = Date.UTC(2026, 4, 2, 15);
const base = 'a5a5a5a5c3c3c3c3';
let n = 0;
const photo = (extra: Partial<Photo> = {}): Photo => ({
  id: `s${++n}`, t: T, bytes: 3_000_000, w: 4000, h: 3000, hash: base, sharp: 300, contrast: 50, expo: 0.5, clip: 0, ...extra,
});

/**
 * Vectors at a chosen cosine to a common reference: `along(c)` is cos c to
 * along(1) (the reference axis plus a private axis per call, so two of them
 * are about c² alike).
 */
let axis = 1;
const along = (c: number) => {
  const v = new Array(VEC_DIM).fill(0);
  v[0] = c;
  v[axis++] = Math.sqrt(Math.max(0, 1 - c * c));
  return pack(v);
};
const vectorsFor = (pairs: [Photo, string][]) => Vectors.of(pairs.map(([p, v]) => ({ id: p.id, v })));
const groupsOf = (photos: Photo[], vectors?: Vectors) => findGroups(makeLibrary(photos).photos, undefined, undefined, vectors);

describe('similar groups with the AI\'s vectors', () => {
  const r = prng(5);

  it('needs both signals: close hashes and alike vectors', () => {
    const a = photo();
    const b = photo({ t: T + 20_000, hash: nearHash(base, 6, r) });
    // The same coarse picture (hash), but the AI sees a different shot.
    expect(groupsOf([a, b], vectorsFor([[a, along(1)], [b, along(SIM_COS - 0.1)]]))).toHaveLength(0);
    expect(groupsOf([a, b], vectorsFor([[a, along(1)], [b, along(SIM_COS + 0.05)]]))).toHaveLength(1);
  });

  it('decides by the hash alone while the vectors are missing (before the AI\'s pass)', () => {
    const a = photo();
    const b = photo({ t: T + 20_000, hash: nearHash(base, 6, r) });
    expect(groupsOf([a, b])).toHaveLength(1);
    expect(groupsOf([a, b], vectorsFor([[a, along(1)]]))).toHaveLength(1);
  });

  it('joins the same scene a little later when the vectors are very alike', () => {
    const a = photo();
    const b = photo({ t: T + 20 * MIN, hash: nearHash(base, 12, r) });
    expect(groupsOf([a, b], vectorsFor([[a, along(1)], [b, along(SCENE_COS + 0.02)]]))).toHaveLength(1);
    expect(groupsOf([a, b], vectorsFor([[a, along(1)], [b, along(SCENE_COS - 0.05)]]))).toHaveLength(0);
    // Without vectors, 20 minutes is too far.
    expect(groupsOf([a, b])).toHaveLength(0);
  });

  it('drops a member a chain dragged in that is unlike the group\'s middle', () => {
    // a — b — c — d: each neighbour alike enough, but d far from the others.
    const v = new Array(VEC_DIM).fill(0);
    const at = (deg: number) => { const w = [...v]; w[0] = Math.cos(deg * Math.PI / 180); w[1] = Math.sin(deg * Math.PI / 180); return pack(w); };
    const ps = [0, 1, 2, 3].map(i => photo({ t: T + i * 10_000, hash: nearHash(base, 2, r) }));
    // 0°, 25°, 50°, 75°: each neighbour cos 25° = 0.91 alike (a link); the medoid is one of the middle two,
    // and the end on the far side of it, 50° away, leaves.
    const vs = vectorsFor([[ps[0], at(0)], [ps[1], at(25)], [ps[2], at(50)], [ps[3], at(75)]]);
    expect(Math.cos(25 * Math.PI / 180)).toBeGreaterThan(SIM_COS);
    expect(Math.cos(50 * Math.PI / 180)).toBeLessThan(MEDOID_COS);
    const groups = groupsOf(ps, vs);
    expect(groups).toHaveLength(1);
    expect(groups[0].ids).toHaveLength(3);
    expect(groups[0].ids).toEqual(expect.arrayContaining([ps[1].id, ps[2].id]));
  });
});

describe('duplicates with the AI\'s vectors', () => {
  const r = prng(9);

  it('finds an edited copy weeks later that the hash alone would miss, and marks it weak', () => {
    const original = photo({ t: T });
    const edited = photo({ t: T + 30 * DAY, hash: nearHash(base, 4, r), expo: 0.62, contrast: 70 });
    expect(groupsOf([original, edited])).toHaveLength(0);
    const [g] = groupsOf([original, edited], vectorsFor([[original, along(1)], [edited, along(DUP_COS + 0.02)]]));
    expect(g.kind).toBe('duplicate');
    expect(g.weak).toBe(true);
    expect(groupsOf([original, edited], vectorsFor([[original, along(1)], [edited, along(DUP_COS - 0.05)]]))).toHaveLength(0);
  });

  it('does not call two different moments copies just because their coarse hashes match', () => {
    const a = photo({ t: T });
    const b = photo({ t: T + 10 * DAY, hash: nearHash(base, 1, r) });
    expect(groupsOf([a, b])[0]?.kind).toBe('duplicate');
    expect(groupsOf([a, b], vectorsFor([[a, along(1)], [b, along(SIM_COS - 0.2)]]))).toHaveLength(0);
  });

  it('keeps a plain copy (close hashes, alike vectors) a strong duplicate', () => {
    const a = photo({ t: T });
    const b = photo({ t: T + 10 * DAY, hash: nearHash(base, 1, r), w: 1600, h: 1200 });
    const [g] = groupsOf([a, b], vectorsFor([[a, along(1)], [b, along(0.99)]]));
    expect(g.kind).toBe('duplicate');
    expect(g.weak).toBeUndefined();
  });
});

describe('the copy to keep', () => {
  it('a favourite, then the edited one, then the one that knows its place, then the most pixels', () => {
    const big = photo({ w: 4000, h: 3000 });
    const small = photo({ w: 1600, h: 1200 });
    const placed = photo({ w: 1600, h: 1200, lat: 50.1, lon: 8.9 });
    const edited = photo({ w: 1600, h: 1200, edited: true });
    const fav = photo({ w: 800, h: 600, fav: true });
    expect(rankDuplicates([small, big])[0]).toBe(big);
    expect(rankDuplicates([big, placed])[0]).toBe(placed);
    expect(rankDuplicates([placed, edited, big])[0]).toBe(edited);
    expect(rankDuplicates([edited, fav])[0]).toBe(fav);
  });
});
