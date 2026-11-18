import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { keeperWhy } from './explain';

const photo = (id: string, extra: Partial<Photo> = {}): Photo => ({ id, t: 0, bytes: 1000, w: 4000, h: 3000, ...extra });

describe('keeperWhy', () => {
  it('names a favourite or a protected photo first', () => {
    const a = photo('a', { fav: true, sharp: 1 });
    expect(keeperWhy('similar', a, [a, photo('b', { sharp: 9 })])).toBe('favourite');
    const b = photo('b', { sharp: 1 });
    expect(keeperWhy('similar', b, [b, photo('c', { sharp: 9 })], true)).toBe('protected');
  });

  it('says what decided between copies', () => {
    const edited = photo('a', { edited: true });
    expect(keeperWhy('duplicate', edited, [edited, photo('b')])).toBe('edited');
    const placed = photo('a', { lat: 50, lon: 9 });
    expect(keeperWhy('duplicate', placed, [placed, photo('b')])).toBe('place');
    const big = photo('a');
    expect(keeperWhy('duplicate', big, [big, photo('b', { w: 1600, h: 1200 })])).toBe('largest');
    const same = photo('a');
    expect(keeperWhy('duplicate', same, [same, photo('b')])).toBe('original');
  });

  it('calls a similar shot the sharpest only when it is', () => {
    const a = photo('a', { sharp: 300 });
    expect(keeperWhy('similar', a, [a, photo('b', { sharp: 120 }), photo('c', { sharp: 200 })])).toBe('sharpest');
    // Not the sharpest (light or faces decided): no single reason is claimed.
    const b = photo('b', { sharp: 200 });
    expect(keeperWhy('similar', b, [b, photo('a', { sharp: 300 })])).toBe('balance');
    // Unknown sharpness: no claim either.
    const c = photo('c');
    expect(keeperWhy('similar', c, [c, photo('d', { sharp: 10 })])).toBe('balance');
  });

  it('names a burst’s chosen frame and leaves lookalike videos general', () => {
    const pick = photo('a', { burst: 'x', pick: true, sharp: 1 });
    expect(keeperWhy('similar', pick, [pick, photo('b', { burst: 'x', sharp: 5 })])).toBe('burstPick');
    const v = photo('v', { video: true });
    expect(keeperWhy('lookalike', v, [v, photo('w', { video: true })])).toBe('bestTake');
  });
});
