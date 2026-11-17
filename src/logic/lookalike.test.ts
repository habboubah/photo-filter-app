import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { buildGroups, makeLibrary, summarize } from './analyze';
import { cosine, findLookalikeVideos, LOOKALIKE_WINDOW_MS, rankLookalike, unpack } from './lookalike';
import { reviewGroup } from './review';
import { emptyState } from './state';

/** A packed embedding: a seeded direction, plus a little noise for a second take of the same scene. */
function emb(seed: number, noise = 0, noiseSeed = 1): string {
  let s = seed;
  let z = noiseSeed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2 ** 31; return s / 2 ** 31 - 0.5; };
  const jit = () => { z = (z * 69069 + 1) % 2 ** 31; return z / 2 ** 31 - 0.5; };
  const v = Array.from({ length: 768 }, () => rnd() + jit() * noise);
  const top = Math.max(...v.map(Math.abs));
  return btoa(String.fromCharCode(...v.map(x => (Math.round((x * 127) / top) + 256) % 256)));
}

const H = 3600_000;
let n = 0;
const video = (extra: Partial<Photo> = {}): Photo => ({ id: `l${++n}`, t: 1_780_000_000_000, bytes: 60_000_000, w: 1920, h: 1080, video: true, dur: 40_000, sharp: 200, ...extra });

describe('lookalike videos', () => {
  it('reads a packed embedding as a unit vector', () => {
    const v = unpack(emb(3))!;
    expect(v).toHaveLength(768);
    expect(cosine(v, v)).toBeCloseTo(1, 5);
    expect(unpack(undefined)).toBeNull();
    expect(unpack('%%%')).toBeNull();
  });

  it('groups two takes of the same scene, not other scenes', () => {
    const a = video({ emb: emb(7) });
    const b = video({ emb: emb(7, 0.35, 5), t: a.t + 40 * 60_000, dur: 61_000 });
    const other = video({ emb: emb(99), t: a.t + 10 * 60_000 });
    expect(cosine(unpack(a.emb)!, unpack(b.emb)!)).toBeGreaterThan(0.92);
    const groups = findLookalikeVideos([other, b, a]);
    expect(groups).toEqual([{ key: `l:${a.id}`, ids: [a.id, b.id], kind: 'lookalike' }]);
  });

  it('only within two hours, never a screen recording, never one already an exact copy', () => {
    const a = video({ emb: emb(11) });
    const late = video({ emb: emb(11, 0.2, 2), t: a.t + LOOKALIKE_WINDOW_MS + 1 });
    expect(findLookalikeVideos([a, late])).toEqual([]);
    const rec = video({ emb: emb(11, 0.2, 3), t: a.t + H, rec: true });
    expect(findLookalikeVideos([a, rec])).toEqual([]);
    const near = video({ emb: emb(11, 0.2, 4), t: a.t + H });
    expect(findLookalikeVideos([a, near], new Set([a.id]))).toEqual([]);
  });

  it('keeps the longest sharp take, then the larger file — a protected one wins', () => {
    const short = video({ dur: 20_000 });
    const long = video({ dur: 90_000 });
    const blurryLong = video({ dur: 120_000, sharp: 5 });
    expect(rankLookalike([short, blurryLong, long])[0].id).toBe(long.id);
    expect(rankLookalike([video({ bytes: 1 }), video({ bytes: 9 })])[0].bytes).toBe(9);
    const lib = makeLibrary([short, long]);
    const raw = [{ key: 'l:x', ids: [short.id, long.id], kind: 'lookalike' as const }];
    expect(buildGroups(lib, raw, emptyState())[0].best).toBe(long.id);
    const guard = new Set([short.id]);
    const [g] = buildGroups(lib, raw, emptyState(), undefined, guard);
    expect(g.best).toBe(short.id);
    expect(reviewGroup(g, guard, lib.byId).map(i => [i.suggest, i.reason])).toEqual([['keep', 'bestTake'], ['delete', 'lookalike']]);
    expect(summarize(lib, [buildGroups(lib, raw, emptyState())[0]], [], new Set()).lookalike).toEqual({ count: 1, bytes: short.bytes, groups: 1 });
  });
});
