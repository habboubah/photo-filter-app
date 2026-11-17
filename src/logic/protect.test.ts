import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { buildGroups, findBlurry, makeLibrary, summarize } from './analyze';
import { findUtility, LABELS } from './ai';
import { exposureLevel } from './exposure';
import { isProtected, protectedIds, toggled } from './protect';
import { reviewCleanup, reviewGroup, reviewTrip } from './review';
import { findScreenshots } from './screenshots';
import { cleanParts } from './smartClean';
import { emptyState, normalizeState } from './state';

let n = 0;
const photo = (extra: Partial<Photo> = {}): Photo => ({
  id: `g${++n}`, t: 1_780_000_000_000 + n * 1000, bytes: 3_000_000, w: 4000, h: 3000,
  hash: 'a5a5a5a5c3c3c3c3', sharp: 300, contrast: 40, expo: 0.5, clip: 0, ...extra,
});

describe('protected photos', () => {
  it('protects by each source', () => {
    const guard = protectedIds(['kept'], { ids: ['hand'], trips: ['trip-1'], albums: ['album-1'] },
      key => (key === 'trip-1' ? ['in-trip'] : undefined), ['in-album']);
    for (const id of ['kept', 'hand', 'in-trip', 'in-album']) expect(isProtected({ id }, guard), id).toBe(true);
    expect(isProtected({ id: 'fav', fav: true }, guard)).toBe(true);
    expect(isProtected({ id: 'other' }, guard)).toBe(false);
    expect(isProtected(undefined, guard)).toBe(false);
  });

  it('keeps a protected photo out of every finder', () => {
    const blurry = photo({ sharp: 4 });
    const dark = photo({ expo: 0.02, contrast: 3 });
    const shot = photo({ shot: true, t: 1_700_000_000_000 });
    const receipt = photo({ ai: LABELS.map(l => (l.id === 'receipt' ? 0 : -120)) });
    const guard = new Set([blurry.id, dark.id, shot.id, receipt.id]);
    const lib = makeLibrary([blurry, dark, shot, receipt]);
    expect(findBlurry(lib, []).filter(p => !isProtected(p, guard))).toEqual([]);
    expect(exposureLevel(dark, guard)).toBeNull();
    expect(findScreenshots(lib.photos, guard)).toEqual([]);
    expect(findUtility(lib.photos, guard)).toEqual([]);
    expect(reviewTrip(lib.photos.map(p => p.id), [], lib.byId, guard, () => true).every(i => i.suggest === 'keep')).toBe(true);
    expect(summarize(lib, [], [blurry], guard, [shot], [receipt], [dark]).total.count).toBe(0);
    expect(cleanParts([], [blurry], [shot], guard, lib.byId, [dark]).every(p => p.ids.length === 0)).toBe(true);
    expect(reviewCleanup([], [blurry], guard, lib.byId, [shot], [receipt], [dark])).toEqual([]);
  });

  it('keeps a protected photo in a duplicate group, where it can become the best shot', () => {
    // The sharper one would win; the protected one is chosen instead, like a favourite.
    const sharp = photo({ sharp: 900 });
    const soft = photo({ sharp: 120 });
    const lib = makeLibrary([sharp, soft]);
    const raw = [{ key: 'grp', kind: 'similar' as const, ids: [sharp.id, soft.id] }];
    const unguarded = buildGroups(lib, raw, emptyState());
    expect(unguarded[0].best).toBe(sharp.id);
    const guard = new Set([soft.id]);
    const [g] = buildGroups(lib, raw, emptyState(), undefined, guard);
    expect(g.best).toBe(soft.id);
    expect(reviewGroup(g, guard, lib.byId).map(i => i.suggest)).toEqual(['delete', 'keep']);
  });

  it('stores what is protected, and toggles without doubles', () => {
    expect(normalizeState({ protect: { ids: ['a', 'a'], trips: ['t'], albums: [1, 'x'] } }).protect).toEqual({ ids: ['a'], trips: ['t'], albums: ['x'] });
    expect(normalizeState({}).protect).toEqual({ ids: [], trips: [], albums: [] });
    const list = ['a'];
    expect(toggled(list, ['a'], true)).toBe(list);
    expect(toggled(list, ['b'], true)).toEqual(['a', 'b']);
    expect(toggled(['a', 'b'], ['a'], false)).toEqual(['b']);
  });
});
