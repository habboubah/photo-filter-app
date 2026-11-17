import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import {
  LABELS, MEMORY_MIN, UTILITY_MARGIN, UTILITY_MIN, aiProgress, categories, findUtility, groupUtility, logits, memoryLabel, utilityLabel,
} from './ai';
import { summarize, makeLibrary } from './analyze';
import { reviewCleanup, reviewUtility } from './review';

const at = (id: string) => LABELS.findIndex(l => l.id === id);

/** A photo the AI has seen: every label far below, the given ones at the given logits. */
function seen(id: string, scores: Record<string, number>, extra: Partial<Photo> = {}): Photo {
  const ai = LABELS.map(() => -150);
  for (const [label, z] of Object.entries(scores)) ai[at(label)] = Math.round(z * 10);
  return { id, t: Number(id.replace(/\D/g, '')) * 1000, bytes: 1000, w: 4000, h: 3000, hash: '0123456789abcdef', ai, ...extra };
}

describe('the AI labels', () => {
  it('reads the stored tenths back as logits', () => {
    const z = logits(seen('p1', { receipt: -3.4 }))!;
    expect(z[at('receipt')]).toBeCloseTo(-3.4);
    expect(logits({ ...seen('p1', {}), ai: [1, 2, 3] })).toBeNull();
    expect(logits({ id: 'x', t: 0, bytes: 0, w: 1, h: 1 })).toBeNull();
  });

  it('files a clear receipt as a utility photo', () => {
    expect(utilityLabel(seen('p1', { receipt: UTILITY_MIN + 2, people: UTILITY_MIN - 3 }))).toBe('receipt');
  });

  it('needs the bar and the margin over every memory label', () => {
    expect(utilityLabel(seen('p1', { receipt: UTILITY_MIN - 0.5 }))).toBeNull();
    expect(utilityLabel(seen('p2', { receipt: -2, kids: -2 - UTILITY_MARGIN / 2 }))).toBeNull();
    expect(utilityLabel(seen('p3', { receipt: -2, kids: -2 - UTILITY_MARGIN - 0.1 }))).toBe('receipt');
  });

  it("lowers the bar when the iPhone's Vision calls it a utility photo", () => {
    const p = seen('p1', { document: UTILITY_MIN - 0.5 });
    expect(utilityLabel(p)).toBeNull();
    expect(utilityLabel({ ...p, util: true })).toBe('document');
  });

  it('never files a favourite, a screenshot, a video or a photo with a face', () => {
    const scores = { receipt: 0 };
    expect(utilityLabel(seen('p1', scores, { fav: true }))).toBeNull();
    expect(utilityLabel(seen('p2', scores, { shot: true }))).toBeNull();
    expect(utilityLabel(seen('p3', scores, { video: true }))).toBeNull();
    expect(utilityLabel(seen('p4', scores, { faces: 1 }))).toBeNull();
    expect(utilityLabel(seen('p5', scores, { faces: 0 }))).toBe('receipt');
  });

  it("gives a photo its best memory label as its category — not a utility photo's", () => {
    expect(memoryLabel(seen('p1', { pet: MEMORY_MIN + 3, kids: MEMORY_MIN + 1 }))).toBe('pet');
    expect(memoryLabel(seen('p2', { pet: MEMORY_MIN - 1 }))).toBeNull();
    expect(memoryLabel(seen('p3', { receipt: 0, pet: -9 }))).toBeNull();
  });
});

describe('utility photos and categories', () => {
  const photos = [
    seen('p1', { receipt: -1 }),
    seen('p2', { code: -2 }),
    seen('p3', { receipt: -1.5 }),
    seen('p4', { kids: -8 }),
    seen('p5', { kids: -9 }),
    seen('p6', { pet: -8 }),
  ];

  it('lists the utility photos newest first, without kept ones', () => {
    expect(findUtility(photos, new Set()).map(p => p.id)).toEqual(['p3', 'p2', 'p1']);
    expect(findUtility(photos, new Set(['p3'])).map(p => p.id)).toEqual(['p2', 'p1']);
  });

  it('groups them by label in label order', () => {
    expect(groupUtility(photos).map(g => [g.label, g.photos.length, g.bytes])).toEqual([['receipt', 2, 2000], ['code', 1, 1000]]);
  });

  it('counts the categories, the biggest first, newest photo first', () => {
    const c = categories(photos);
    expect(c.map(x => [x.label, x.photos.length])).toEqual([['kids', 2], ['pet', 1]]);
    expect(c[0].photos[0].id).toBe('p5');
  });

  it('knows how far the AI got: photos with a local copy, no videos or screenshots', () => {
    const list = [...photos, { id: 'v1', t: 1, bytes: 1, w: 1, h: 1, video: true }, { id: 'n1', t: 2, bytes: 1, w: 1, h: 1, hash: 'ab' }];
    expect(aiProgress(list)).toEqual({ seen: 6, total: 7 });
  });
});

describe('the clean-up card and the review', () => {
  it('counts utility photos once, after the groups and the blurry ones', () => {
    const a = seen('p1', { receipt: -1 });
    const b = seen('p2', { document: -1 }, { sharp: 1 });
    const lib = makeLibrary([a, b]);
    const s = summarize(lib, [], [b], new Set(), [], [a, b]);
    expect(s.utility).toEqual({ count: 1, bytes: 1000 });
    expect(s.total.count).toBe(s.blurry.count + 1);
  });

  it('suggests each utility photo for deleting, with its label, and never twice', () => {
    const a = seen('p1', { receipt: -1 });
    expect(reviewUtility([a])).toEqual([{ id: 'p1', suggest: 'delete', reason: 'utility', label: 'receipt', trust: 'likely' }]);
    const items = reviewCleanup([], [], new Set(), new Map([[a.id, a]]), [], [a, a]);
    expect(items.map(i => i.id)).toEqual(['p1']);
  });
});
