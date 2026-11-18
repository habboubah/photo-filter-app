import { describe, expect, it } from 'vitest';
import type { CleanupSummary } from '../types';
import { gainOf, nextStepKind, rankCategories } from './nextStep';

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

  it('knows no gain without a summary', () => {
    expect(gainOf(null, 'similar')).toEqual({ count: 0, bytes: 0 });
    expect(rankCategories({ similar: { items: 2, covers: [] } }, null)[0].gain.bytes).toBe(0);
  });
});
