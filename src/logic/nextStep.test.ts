import { describe, expect, it } from 'vitest';
import type { CleanupSummary } from '../types';
import { firstGroup, gainOf, nextStepKind, rankCategories } from './nextStep';

const stat = (count = 0, bytes = 0) => ({ count, bytes });
const summary = (over: Partial<CleanupSummary> = {}): CleanupSummary => ({
  similar: { ...stat(), groups: 0 }, duplicates: { ...stat(), groups: 0 }, lookalike: { ...stat(), groups: 0 },
  blurry: stat(), exposure: stat(), screenshots: stat(), utility: stat(), total: stat(),
  media: { photos: stat(), videos: stat() }, ...over,
});

describe('the one next step', () => {
  const base = { monthsDone: 0, hasNextMonth: true, later: 0, categories: 0, scanning: false };

  it('goes on month by month once there is progress', () => {
    expect(nextStepKind({ ...base, monthsDone: 2, later: 5, categories: 3 })).toBe('month');
    expect(nextStepKind({ ...base, monthsDone: 2, hasNextMonth: false, later: 5 })).toBe('later');
    // A month left part-way is progress too.
    expect(nextStepKind({ ...base, monthStarted: true, later: 5, categories: 3 })).toBe('month');
  });

  it('then what waits, then what frees the most, then the newest month', () => {
    expect(nextStepKind({ ...base, later: 1, categories: 3 })).toBe('later');
    expect(nextStepKind({ ...base, categories: 3 })).toBe('category');
    expect(nextStepKind(base)).toBe('start');
  });

  it('offers nothing while an empty library is still being scanned', () => {
    expect(nextStepKind({ ...base, scanning: true })).toBeNull();
    expect(nextStepKind({ ...base, hasNextMonth: false })).toBeNull();
  });
});

describe('the categories, the one that frees the most first', () => {
  it('ranks by space, then by items, and leaves empty ones out', () => {
    const s = summary({ similar: { count: 12, bytes: 300, groups: 4 }, screenshots: stat(9, 900), blurry: stat(2, 50), exposure: stat(1, 25) });
    const ranked = rankCategories({
      similar: { items: 4, covers: ['a'] }, screenshots: { items: 9, covers: ['b'] }, failed: { items: 3, covers: [] },
      duplicates: { items: 0, covers: [] }, utility: { items: 5, covers: [] },
    }, s);
    expect(ranked.map(c => c.key)).toEqual(['screenshots', 'similar', 'failed', 'utility']);
    expect(ranked[2].gain).toEqual({ count: 3, bytes: 75 });
  });

  it('puts the duplicates right before the near-identical photos, whatever they free', () => {
    const s = summary({ similar: { count: 2, bytes: 7700, groups: 1 }, blurry: stat(2, 5800), duplicates: { count: 2, bytes: 223, groups: 1 } });
    const ranked = rankCategories({
      similar: { items: 1, covers: [] }, failed: { items: 2, covers: [] }, duplicates: { items: 1, covers: [] },
    }, s);
    expect(ranked.map(c => c.key)).toEqual(['duplicates', 'similar', 'failed']);
  });

  it('knows no gain without a summary', () => {
    expect(gainOf(null, 'similar')).toEqual({ count: 0, bytes: 0 });
    expect(rankCategories({ similar: { items: 2, covers: [] } }, null)[0].gain.bytes).toBe(0);
  });
});

describe('the first group to compare', () => {
  const g = (key: string, n: number, best: string, kind = 'similar') => ({ key, kind, ids: Array.from({ length: n }, (_, i) => `${key}${i}`), best });
  const times: Record<string, number> = { a0: 10, b0: 30, c0: 20, d0: 40 };
  const time = (id: string) => times[id];

  it('takes the newest small group of near-identical photos', () => {
    expect(firstGroup([g('a', 3, 'a0'), g('b', 4, 'b0'), g('c', 2, 'c0')], time)?.key).toBe('b');
  });

  it('prefers a group of two to six over a long burst, even an older one', () => {
    expect(firstGroup([g('d', 14, 'd0'), g('a', 3, 'a0')], time)?.key).toBe('a');
    expect(firstGroup([g('d', 14, 'd0')], time)?.key).toBe('d');
  });

  it('leaves out copies and offers nothing without a similar group', () => {
    expect(firstGroup([g('b', 2, 'b0', 'duplicate')], time)).toBeNull();
    expect(firstGroup([], time)).toBeNull();
  });
});

describe('the similar videos', () => {
  it('count with the near-identical photos (one row, a switch on its screen)', () => {
    const s = summary({ similar: { count: 4, bytes: 100, groups: 2 }, lookalike: { count: 1, bytes: 400, groups: 1 } });
    expect(gainOf(s, 'similar')).toEqual({ count: 5, bytes: 500 });
  });
});
