import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { addToBin, binOutcome, binPhotos, removeFromBin, withoutBin } from './bin';
import { decide, reviewBin, startSession } from './review';
import { emptyState, normalizeState } from './state';

const photo = (id: string): Photo => ({
  id, t: 1_780_000_000_000, bytes: 1_000_000, w: 4000, h: 3000,
  hash: 'a5a5a5a5c3c3c3c3', sharp: 300, contrast: 40, expo: 0.5, clip: 0,
});

describe('the bin (Zum Löschen)', () => {
  it('puts the newest aside on top, each photo once', () => {
    const bin = addToBin(['a', 'b'], ['c', 'b', 'c']);
    expect(bin).toEqual(['c', 'b', 'a']);
  });

  it('returns the same array when nothing changes', () => {
    const bin = ['a', 'b'];
    expect(addToBin(bin, [])).toBe(bin);
    expect(addToBin(bin, ['a', 'b'])).toBe(bin);
    expect(removeFromBin(bin, ['x'])).toBe(bin);
    expect(removeFromBin(bin, [])).toBe(bin);
  });

  it('puts photos back', () => {
    expect(removeFromBin(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('hides the bin from every finder and keeps the library as it is when empty', () => {
    const lib = [photo('a'), photo('b'), photo('c')];
    expect(withoutBin(lib, ['b']).map(p => p.id)).toEqual(['a', 'c']);
    expect(withoutBin(lib, [])).toBe(lib);
  });

  it('shows the bin in its own order, without photos gone from the library', () => {
    const byId = new Map([photo('a'), photo('b')].map(p => [p.id, p]));
    expect(binPhotos(['b', 'gone', 'a'], byId).map(p => p.id)).toEqual(['b', 'a']);
  });

  it('going through it again: right puts back, left deletes, the rest stays', () => {
    let s = startSession(reviewBin(['a', 'b', 'c', 'd']));
    s = decide(s, 'keep');
    s = decide(s, 'delete');
    s = decide(s, 'later');
    expect(binOutcome(s)).toEqual({ restore: ['a'], remove: ['b'] });
  });

  it('suggests nothing in the second look: the user already chose once', () => {
    expect(reviewBin(['a']).every(i => i.suggest === 'none' && i.reason === 'bin')).toBe(true);
  });

  it('is kept in the decisions file; older files start empty', () => {
    expect(emptyState().bin).toEqual([]);
    expect(normalizeState({ schemaVersion: 1 }).bin).toEqual([]);
    expect(normalizeState({ bin: ['a', 'b', 'a', 3] }).bin).toEqual(['a', 'b']);
  });
});
