import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { sortFor, sortPhotos } from './sort';
import { normalizeState } from './state';

const p = (id: string, t: number, bytes: number): Photo => ({ id, t, bytes, w: 1, h: 1 });
const a = p('a', 3, 10);
const b = p('b', 1, 30);
const c = p('c', 2, 30);

describe('sorting lists', () => {
  it('sorts by newest, oldest and largest without changing the input', () => {
    const list = [a, b, c];
    expect(sortPhotos(list, 'newest').map(x => x.id)).toEqual(['a', 'c', 'b']);
    expect(sortPhotos(list, 'oldest').map(x => x.id)).toEqual(['b', 'c', 'a']);
    // Same size: the newer one first.
    expect(sortPhotos(list, 'largest').map(x => x.id)).toEqual(['c', 'b', 'a']);
    expect(list.map(x => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('remembers the choice per screen and falls back to the screen default', () => {
    expect(sortFor({}, 'large')).toBe('largest');
    expect(sortFor({}, 'screenshots')).toBe('newest');
    expect(sortFor({ screenshots: 'oldest' }, 'screenshots')).toBe('oldest');
  });

  it('stores only known orders', () => {
    expect(normalizeState({ sort: { large: 'oldest', live: 'sideways', x: 3 } }).sort).toEqual({ large: 'oldest' });
    expect(normalizeState({}).sort).toEqual({});
  });
});
