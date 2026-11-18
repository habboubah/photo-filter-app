import { describe, expect, it } from 'vitest';
import { monthRest, monthShare, type Month } from './months';
import { normalizeState } from './state';

const month: Month = { key: '2026-06', year: 2026, month: 5, ids: ['a', 'b', 'c', 'd'], bytes: 0 };
const times: Record<string, number> = { a: 10, b: 20, c: 30, d: 40 };
const time = (id: string) => times[id];

describe('a month left part-way', () => {
  it('goes on after the last photo decided', () => {
    expect(monthRest(month, undefined, time)).toEqual(['a', 'b', 'c', 'd']);
    expect(monthRest(month, 20, time)).toEqual(['c', 'd']);
  });

  it('starts again when nothing comes after that photo any more', () => {
    expect(monthRest(month, 40, time)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('shows the real share gone through', () => {
    expect(monthShare(month, false, undefined, time)).toBe(0);
    expect(monthShare(month, false, 20, time)).toBe(0.5);
    expect(monthShare(month, true, 20, time)).toBe(1);
    // Every photo up to the mark, but not marked done: it starts again, so nothing is shown as gone through.
    expect(monthShare(month, false, 40, time)).toBe(0);
  });

  it('keeps the place in the decisions file, and drops it for a month that is done', () => {
    const s = normalizeState({ months: ['2026-05'], monthAt: { '2026-06': 20, '2026-05': 5, bad: 1, '2026-07': 'x' } });
    expect(s.monthAt).toEqual({ '2026-06': 20 });
    expect(normalizeState({}).monthAt).toEqual({});
  });
});
