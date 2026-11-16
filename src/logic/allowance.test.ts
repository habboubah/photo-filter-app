import { describe, expect, it } from 'vitest';
import { FREE_DELETES, freeDelete, freeLeft } from './allowance';
import { normalizeState } from './state';

describe('free deletes', () => {
  it('counts down from FREE_DELETES and stops at 0', () => {
    expect(FREE_DELETES).toBe(50);
    expect(freeLeft(0)).toBe(50);
    expect(freeLeft(47)).toBe(3);
    expect(freeLeft(80)).toBe(0);
  });
  it('lets a delete through only when all of it fits', () => {
    expect(freeDelete(0, 50)).toEqual({ all: true, left: 50 });
    expect(freeDelete(10, 41)).toEqual({ all: false, left: 40 });
    expect(freeDelete(50, 1)).toEqual({ all: false, left: 0 });
    expect(freeDelete(0, 0).all).toBe(false);
  });
  it('keeps the count in the saved state', () => {
    expect(normalizeState({}).freeUsed).toBe(0);
    expect(normalizeState({ freeUsed: 12 }).freeUsed).toBe(12);
    expect(normalizeState({ freeUsed: -3 }).freeUsed).toBe(0);
    expect(normalizeState({ freeUsed: 'x' }).freeUsed).toBe(0);
  });
});
