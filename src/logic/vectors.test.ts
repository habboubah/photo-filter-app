import { describe, expect, it } from 'vitest';
import { VEC_DIM, Vectors, decode, pack } from './vectors';
import { LABELS, labelModel, scoreLabels, utilityLabel, withScores } from './ai';
import labelFile from './aiLabels.json';
import facts from '../native/demo/facts.json';
import type { Photo } from '../types';

/** A unit vector along a few axes (the rest 0), packed like the phone. */
const along = (weights: Record<number, number>) => {
  const v = new Array(VEC_DIM).fill(0);
  for (const [i, w] of Object.entries(weights)) v[Number(i)] = w;
  return pack(v);
};

describe('the compact vectors', () => {
  it('unpacks what the phones pack: int8, scaled by the largest value', () => {
    const v = decode(pack([0.5, -1, 0.25, ...new Array(VEC_DIM - 3).fill(0)]))!;
    expect([v[0], v[1], v[2]]).toEqual([64, -127, 32]);
    expect(decode('AAAA')).toBeNull();
    expect(decode('not base64!')).toBeNull();
  });

  it('measures cosines, whatever the int8 scaling', () => {
    const vs = Vectors.of([
      { id: 'a', v: along({ 0: 1 }) },
      { id: 'b', v: along({ 0: 0.2 }) },
      { id: 'c', v: along({ 0: 1, 1: 1 }) },
      { id: 'd', v: along({ 1: 1 }) },
    ]);
    expect(vs.cos('a', 'b')).toBeCloseTo(1);
    expect(vs.cos('a', 'c')).toBeCloseTo(Math.SQRT1_2, 2);
    expect(vs.cos('a', 'd')).toBeCloseTo(0);
    expect(vs.cos('a', 'zz')).toBeUndefined();
  });

  it('keeps every photo in its slot when more arrive', () => {
    const one = Vectors.of([{ id: 'a', v: along({ 0: 1 }) }]);
    const two = one.with([{ id: 'b', v: along({ 1: 1 }) }, { id: 'bad', v: 'AAAA' }]);
    expect(two.slot('a')).toBe(0);
    expect(two.slot('b')).toBe(1);
    expect(two.has('bad')).toBe(false);
    expect(one.size).toBe(1);
    expect(two.with([])).toBe(two);
  });

  it('finds a photo\'s nearest look-alikes, most alike first', () => {
    const vs = Vectors.of([
      { id: 'a', v: along({ 0: 1 }) },
      { id: 'b', v: along({ 0: 1, 1: 0.2 }) },
      { id: 'c', v: along({ 0: 1, 1: 0.6 }) },
      { id: 'd', v: along({ 1: 1 }) },
    ]);
    expect(vs.nearest('a', 0.8).map(n => n.id)).toEqual(['b', 'c']);
    expect(vs.nearest('a', 0.8, 10, id => id !== 'b').map(n => n.id)).toEqual(['c']);
  });
});

describe('the labels from the vectors', () => {
  const model = labelModel(labelFile)!;
  // The demo's photos with the vectors ml/demo_ai.py computed with the real model.
  const demo = (facts as (Photo & { vec?: string })[]).filter(p => p.vec);
  const vectors = Vectors.of(demo.map(p => ({ id: p.id, v: p.vec! })));
  const scores = scoreLabels(vectors, model);

  it('reads the label file that fits this build, and no other', () => {
    expect(model.rows.length).toBe(LABELS.length * VEC_DIM);
    expect(labelModel({ ...labelFile, labelsVersion: 0 })).toBeNull();
    expect(labelModel({ ...labelFile, labels: labelFile.labels.slice(1) })).toBeNull();
  });

  it('scores every photo for every label, and only the new ones when more arrive', () => {
    expect(scores.length).toBe(demo.length * LABELS.length);
    const first = Vectors.of(demo.slice(0, 10).map(p => ({ id: p.id, v: p.vec! })));
    const part = scoreLabels(first, model);
    const all = scoreLabels(vectors, model, part);
    expect(all).toEqual(scores);
  });

  it('lays the scores onto the photos: the demo\'s receipt and letter are utility photos, the family photos are not', () => {
    const scored = withScores(demo as Photo[], vectors, scores);
    const byId = new Map(scored.map(p => [p.id, p]));
    // p094: the receipt downloaded (scripts/demo-photos.py); p001: a family photo at home.
    expect(utilityLabel(byId.get('p094')!)).toBe('receipt');
    expect(utilityLabel(byId.get('p001')!)).toBeNull();
    const flagged = scored.filter(p => utilityLabel(p));
    expect(flagged.length).toBeLessThan(scored.length / 4);
  });
});
