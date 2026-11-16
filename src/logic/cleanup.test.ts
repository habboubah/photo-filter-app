import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { buildGroups, cleanupBlurry, findBlurry, makeLibrary, summarize } from './analyze';
import { exposureScore, rankGroup } from './best';
import { blurLevel } from './blur';
import { findGroups } from './similar';
import { emptyState, normalizeState, SCHEMA_VERSION } from './state';
import {
  decide, isDone, keptAgainstSuggestion, reviewCleanup, reviewGroup, reviewTrip, startSession, toDelete, undo,
} from './review';
import { nearHash, prng } from './fixtures';

const T = new Date(2026, 4, 2, 15).getTime();
let n = 0;
const photo = (extra: Partial<Photo> = {}): Photo => ({
  id: `s${++n}`, t: T, bytes: 3_000_000, w: 4000, h: 3000, hash: '0f0f0f0f0f0f0f0f', sharp: 300, contrast: 50, expo: 0.5, clip: 0, ...extra,
});

describe('similar groups', () => {
  const r = prng(7);
  const base = 'a5a5a5a5c3c3c3c3';

  it('groups near-identical shots taken close together', () => {
    const a = photo({ t: T, hash: base });
    const b = photo({ t: T + 5_000, hash: nearHash(base, 4, r) });
    const c = photo({ t: T + 9_000, hash: nearHash(base, 8, r) });
    const other = photo({ t: T + 7_000, hash: '5a5a5a5a3c3c3c3c' });
    const groups = findGroups(makeLibrary([a, b, c, other]).photos);
    expect(groups).toHaveLength(1);
    expect(groups[0].ids).toEqual([a.id, b.id, c.id]);
  });

  it('does not group the same scene shot an hour later, screenshots or unanalysed photos', () => {
    const a = photo({ t: T, hash: base });
    const later = photo({ t: T + 3600_000, hash: base });
    const shot = photo({ t: T + 1_000, hash: base, shot: true });
    const none = photo({ t: T + 2_000, hash: undefined });
    expect(findGroups(makeLibrary([a, later, shot, none]).photos)).toHaveLength(0);
  });

  it('links a sequence through its neighbours', () => {
    const a = photo({ t: T, hash: base });
    const b = photo({ t: T + 120_000, hash: nearHash(base, 3, r) });
    const c = photo({ t: T + 240_000, hash: b.hash }); // 4 min after a: linked through b
    expect(findGroups(makeLibrary([a, b, c]).photos)[0].ids).toHaveLength(3);
  });
});

describe('best shot', () => {
  it('picks the sharpest, well exposed photo', () => {
    const soft = photo({ sharp: 40 });
    const crisp = photo({ sharp: 900 });
    const dark = photo({ sharp: 950, expo: 0.05, clip: 0.3 });
    expect(rankGroup([soft, crisp, dark])[0].id).toBe(crisp.id);
  });

  it('lets a favourite win', () => {
    const fav = photo({ sharp: 40, fav: true });
    expect(rankGroup([photo({ sharp: 900 }), fav])[0].id).toBe(fav.id);
  });

  it('uses faces and open eyes when every photo has them (iPhone)', () => {
    const blink = photo({ sharp: 500, faces: 2, faceQ: 0.7, eyes: 0.1 });
    const open = photo({ sharp: 450, faces: 2, faceQ: 0.8, eyes: 0.95 });
    expect(rankGroup([blink, open])[0].id).toBe(open.id);
    // Without face scores (Android) the sharper one wins.
    expect(rankGroup([photo({ sharp: 500 }), photo({ sharp: 450 })])[0].sharp).toBe(500);
  });

  it('scores exposure from mid-grey', () => {
    expect(exposureScore(photo({ expo: 0.48, clip: 0 }))).toBeCloseTo(1);
    expect(exposureScore(photo({ expo: 0.02, clip: 0.4 }))).toBe(0);
  });

  it('takes the user’s pick over the suggestion', () => {
    const a = photo({ t: T, hash: 'ffff0000ffff0000', sharp: 900 });
    const b = photo({ t: T + 1000, hash: 'ffff0000ffff0001', sharp: 100 });
    const lib = makeLibrary([a, b]);
    const raw = findGroups(lib.photos);
    const state = emptyState();
    expect(buildGroups(lib, raw, state)[0].best).toBe(a.id);
    state.best[raw[0].key] = b.id;
    const [g] = buildGroups(lib, raw, state);
    expect(g.best).toBe(b.id);
    expect(g.suggested).toBe(a.id);
  });
});

describe('blurry photos', () => {
  it('has three confidence levels', () => {
    expect(blurLevel(photo({ sharp: 5 }))).toBe('high');
    expect(blurLevel(photo({ sharp: 20 }))).toBe('medium');
    expect(blurLevel(photo({ sharp: 45 }))).toBe('low');
    expect(blurLevel(photo({ sharp: 200 }))).toBeNull();
  });
  it('is less sure about photos with little to see', () => {
    expect(blurLevel(photo({ sharp: 5, contrast: 10 }))).toBe('medium');
    expect(blurLevel(photo({ sharp: 45, contrast: 10 }))).toBeNull();
  });
  it('leaves out screenshots, unanalysed photos and favourites', () => {
    expect(blurLevel(photo({ sharp: 5, shot: true }))).toBeNull();
    expect(blurLevel(photo({ sharp: undefined }))).toBeNull();
    const lib = makeLibrary([photo({ sharp: 5, fav: true }), photo({ sharp: 5 })]);
    expect(findBlurry(lib, [])).toHaveLength(1);
  });
});

describe('clean-up card', () => {
  it('counts the extra shots and the fairly sure blurry photos, with their size', () => {
    const a = photo({ t: T, hash: 'ffff0000ffff0000', sharp: 900 });
    const b = photo({ t: T + 1000, hash: 'ffff0000ffff0001', sharp: 100, bytes: 1_000_000 });
    const c = photo({ t: T + 2000, hash: 'ffff0000ffff0003', sharp: 120, bytes: 1_000_000, fav: true });
    const blurry = photo({ t: T + 9e6, hash: '1234123412341234', sharp: 4, bytes: 2_000_000 });
    const maybe = photo({ t: T + 9.5e6, hash: '4321432143214321', sharp: 45 });
    const lib = makeLibrary([a, b, c, blurry, maybe]);
    const groups = buildGroups(lib, findGroups(lib.photos), emptyState());
    const blurList = findBlurry(lib, groups);
    expect(blurList.map(p => p.id)).toEqual([blurry.id, maybe.id]);
    const sum = summarize(lib, groups, blurList, new Set());
    // The favourite is the one to keep; the other two are extra shots.
    expect(groups[0].best).toBe(c.id);
    expect(sum.similar).toEqual({ count: 2, bytes: 4_000_000, groups: 1 });
    expect(sum.blurry).toEqual({ count: 1, bytes: 2_000_000 }); // "maybe" is not counted
    expect(sum.total.bytes).toBe(6_000_000);
    // Photos the user kept are not counted again.
    expect(summarize(lib, groups, blurList, new Set([a.id, b.id, blurry.id])).total.count).toBe(0);
    expect(cleanupBlurry(blurList, new Set())).toHaveLength(1);
  });
});

describe('review', () => {
  const a = photo({ t: T });
  const b = photo({ t: T + 1 });
  const c = photo({ t: T + 2, sharp: 5 });
  const byId = new Map([a, b, c].map(p => [p.id, p]));
  const group = { key: 'g', ids: [a.id, b.id], best: a.id, suggested: a.id };

  it('suggests keeping the best and deleting the rest of a group', () => {
    expect(reviewGroup(group, new Set(), byId).map(i => i.suggest)).toEqual(['keep', 'delete']);
    expect(reviewGroup(group, new Set([b.id]), byId).map(i => i.suggest)).toEqual(['keep', 'keep']);
  });

  it('collects the clean-up candidates', () => {
    const items = reviewCleanup([group], [c], new Set(), byId);
    expect(items.map(i => [i.id, i.reason])).toEqual([[b.id, 'similar'], [c.id, 'blurry']]);
  });

  it('reviews a whole trip with suggestions', () => {
    const items = reviewTrip([a.id, b.id, c.id], [group], byId, new Set());
    expect(items.map(i => i.suggest)).toEqual(['keep', 'delete', 'delete']);
  });

  it('decides, undoes and collects what to delete', () => {
    let s = startSession(reviewCleanup([group], [c], new Set(), byId));
    s = decide(s, 'keep');
    s = decide(s, 'delete');
    expect(isDone(s)).toBe(true);
    expect(toDelete(s)).toEqual([c.id]);
    expect(keptAgainstSuggestion(s)).toEqual([b.id]);
    s = undo(s);
    expect(isDone(s)).toBe(false);
    expect(toDelete(s)).toEqual([]);
    expect(undo(startSession([]))).toEqual(startSession([]));
  });
});

describe('stored decisions', () => {
  it('turns anything into a valid state', () => {
    expect(normalizeState(null)).toEqual(emptyState());
    expect(normalizeState('x')).toEqual(emptyState());
    const s = normalizeState({
      schemaVersion: SCHEMA_VERSION,
      trips: {
        names: { a: 'Paris', b: 3 }, ignored: ['c', 4], merges: [['a', 'b'], ['x']],
        splits: { a: [1, 'x', 2], z: [] }, albums: { a: { title: 'Paris', count: 3, at: 1 }, b: { title: 1 } },
      },
      best: { g: 'p1' }, kept: ['p2', 'p2', 7], owned: true,
    });
    expect(s.trips.names).toEqual({ a: 'Paris' });
    expect(s.trips.ignored).toEqual(['c']);
    expect(s.trips.merges).toEqual([['a', 'b']]);
    expect(s.trips.splits).toEqual({ a: [1, 2] });
    expect(Object.keys(s.trips.albums)).toEqual(['a']);
    expect(s.kept).toEqual(['p2']);
    expect(s.owned).toBe(true);
  });
});
