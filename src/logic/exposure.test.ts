import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { buildGroups, findBlurry, makeLibrary, summarize } from './analyze';
import { LABELS } from './ai';
import { exposureLevel, findExposure } from './exposure';
import { reviewCleanup, reviewTrip } from './review';
import { cleanParts } from './smartClean';
import { emptyState } from './state';

let n = 0;
const photo = (extra: Partial<Photo> = {}): Photo => ({
  id: `e${++n}`, t: 1_780_000_000_000 + n * 60_000, bytes: 2_000_000, w: 4000, h: 3000,
  hash: (n * 2654435761 >>> 0).toString(16).padStart(16, 'f'), sharp: 300, contrast: 40, expo: 0.5, clip: 0, ...extra,
});
/** AI scores that file the photo as `accidental` (a utility label well ahead of every memory label). */
const accidentalScores = () => LABELS.map(l => (l.id === 'accidental' ? -20 : l.kind === 'utility' ? -90 : -120));

describe('too dark and too bright photos', () => {
  it('finds the three levels', () => {
    expect(exposureLevel(photo({ expo: 0.02, contrast: 4, sharp: 3 }))).toBe('dark');
    expect(exposureLevel(photo({ expo: 0.97, contrast: 3 }))).toBe('bright');
    expect(exposureLevel(photo({ expo: 0.7, clip: 0.7 }))).toBe('bright');
    expect(exposureLevel(photo())).toBeNull();
  });

  it('leaves night photos with lights out, and a black frame that clips is dark, not bright', () => {
    expect(exposureLevel(photo({ expo: 0.05, contrast: 35 }))).toBeNull();
    expect(exposureLevel(photo({ expo: 0.03, contrast: 5, clip: 0.9 }))).toBe('dark');
  });

  it('lets a borderline photo in only with the AI label accidental', () => {
    const border = { expo: 0.08, contrast: 15 };
    expect(exposureLevel(photo(border))).toBeNull();
    expect(exposureLevel(photo({ ...border, ai: accidentalScores() }))).toBe('dark');
    expect(exposureLevel(photo({ expo: 0.92, ai: accidentalScores() }))).toBe('bright');
  });

  it('never takes favourites, faces, kept photos, screenshots or videos', () => {
    const dark = { expo: 0.02, contrast: 3 };
    const kept = photo(dark);
    expect(exposureLevel(photo({ ...dark, fav: true }))).toBeNull();
    expect(exposureLevel(photo({ ...dark, faces: 1 }))).toBeNull();
    expect(exposureLevel(photo({ ...dark, shot: true }))).toBeNull();
    expect(exposureLevel(photo({ ...dark, video: true }))).toBeNull();
    expect(exposureLevel(kept, new Set([kept.id]))).toBeNull();
    expect(exposureLevel(photo({ expo: undefined }))).toBeNull();
  });

  it('counts a dark, blurry photo once: under exposure, not blurry', () => {
    const dark = photo({ expo: 0.02, contrast: 3, sharp: 2 });
    const blur = photo({ sharp: 4 });
    const fine = photo();
    const lib = makeLibrary([dark, blur, fine]);
    const groups = buildGroups(lib, [], emptyState());
    const blurry = findBlurry(lib, groups);
    const exp = findExposure(lib.photos, new Set(), new Set());
    expect(blurry.map(p => p.id)).toEqual([blur.id]);
    expect(exp.dark.map(p => p.id)).toEqual([dark.id]);
    const s = summarize(lib, groups, blurry, new Set(), [], [], [...exp.dark, ...exp.bright]);
    expect(s.exposure).toEqual({ count: 1, bytes: dark.bytes });
    expect(s.blurry.count).toBe(1);
    expect(s.total.count).toBe(2);
    const items = reviewCleanup(groups, blurry, new Set(), lib.byId, [], [], exp.dark);
    expect(items.map(i => [i.id, i.reason])).toEqual([[blur.id, 'blurry'], [dark.id, 'dark']]);
    expect(cleanParts(groups, blurry, [], new Set(), lib.byId, exp.dark).find(p => p.kind === 'exposure')?.ids).toEqual([dark.id]);
  });

  it('suggests deleting them in a month or a trip', () => {
    const bright = photo({ expo: 0.98 });
    const fine = photo();
    const lib = makeLibrary([bright, fine]);
    expect(reviewTrip([bright.id, fine.id], [], lib.byId, new Set()).map(i => [i.suggest, i.reason]))
      .toEqual([['delete', 'bright'], ['keep', 'trip']]);
  });
});
