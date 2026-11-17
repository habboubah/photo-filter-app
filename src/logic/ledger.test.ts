import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { MIN_SEEN, adjustItems, doubted, keepRate, normalizeLedger, record, strictUtility, STRICT_LOGITS, type Ledger } from './ledger';
import { MIN_PICKS, NO_PICKS, W, learnPick, rankGroup, weightsFor } from './best';
import { decide, startSession, type ReviewItem } from './review';
import { normalizeState } from './state';

const item = (id: string, extra: Partial<ReviewItem> = {}): ReviewItem => ({ id, suggest: 'delete', reason: 'similar', trust: 'likely', ...extra });

describe('the local accuracy ledger', () => {
  it('counts what the user deleted and kept of each kind, not what they put off', () => {
    let s = startSession([item('a'), item('b'), item('c', { reason: 'utility', label: 'receipt' }), item('d'), item('e', { suggest: 'keep', reason: 'best' })]);
    s = decide(decide(decide(decide(decide(s, 'delete'), 'keep'), 'delete'), 'later'), 'keep');
    expect(record({}, s)).toEqual({ similar: { del: 1, keep: 1 }, 'utility:receipt': { del: 1, keep: 0 } });
    expect(record({ similar: { del: 4, keep: 0 } }, s).similar).toEqual({ del: 5, keep: 1 });
    const none = startSession([item('x')]);
    const ledger: Ledger = {};
    expect(record(ledger, none)).toBe(ledger);
  });

  it('changes nothing until there are enough decisions, then trusts a kind kept often less', () => {
    expect(keepRate({ del: 3, keep: 3 })).toBeNull();
    const ledger: Ledger = { similar: { del: 6, keep: 4 }, blurry: { del: 9, keep: 1 } };
    expect(MIN_SEEN).toBe(10);
    expect(doubted(ledger, 'similar')).toBe(true);
    expect(doubted(ledger, 'blurry')).toBe(false);
    const items = adjustItems([item('a'), item('b', { reason: 'blurry' }), item('c', { suggest: 'keep', reason: 'best', trust: undefined })], ledger);
    expect(items.map(i => i.trust)).toEqual(['check', 'likely', undefined]);
  });

  it('asks more of a utility label the user keeps', () => {
    expect(strictUtility({ 'utility:receipt': { del: 7, keep: 3 }, 'utility:meme': { del: 2, keep: 8 }, 'utility:code': { del: 10, keep: 0 } }))
      .toEqual({ receipt: STRICT_LOGITS, meme: 2 * STRICT_LOGITS });
  });

  it('reads back only well-formed tallies, and older state files without a ledger', () => {
    expect(normalizeLedger({ a: { del: 2, keep: 1 }, b: { del: -1, keep: 1 }, c: 'x', d: { del: 1 } })).toEqual({ a: { del: 2, keep: 1 } });
    expect(normalizeState({}).ledger).toEqual({});
  });
});

describe('learning the best shot from the user\'s picks', () => {
  const photo = (id: string, extra: Partial<Photo>): Photo => ({ id, t: 0, bytes: 1, w: 100, h: 100, expo: 0.5, clip: 0, ...extra });

  it('notes what the user\'s pick was better on', () => {
    const p = learnPick(NO_PICKS, photo('a', { sharp: 100, eyes: 0.9 }), photo('b', { sharp: 300, eyes: 0.2 }));
    expect(p).toEqual({ n: 1, wins: { eyes: 1 } });
  });

  it('keeps the default weights until enough picks, then leans within 0.6× to 1.4×', () => {
    expect(weightsFor(undefined)).toBe(W);
    expect(weightsFor({ n: MIN_PICKS - 1, wins: { eyes: 9 } })).toBe(W);
    const w = weightsFor({ n: 10, wins: { eyes: 10 } });
    expect(w.eyes).toBeCloseTo(W.eyes * 1.4);
    expect(w.sharp).toBeCloseTo(W.sharp * 0.6);
  });

  it('ranks by the learned weights: open eyes over more sharpness, once the user showed it', () => {
    const sharp = photo('sharp', { sharp: 400, faceQ: 0.5, eyes: 0.3, faces: 1 });
    const open = photo('open', { sharp: 100, faceQ: 0.5, eyes: 0.95, faces: 1 });
    expect(rankGroup([sharp, open])[0].id).toBe('sharp');
    expect(rankGroup([sharp, open], weightsFor({ n: 10, wins: { eyes: 10 } }))[0].id).toBe('open');
  });

  it('reads the picks back from the state file', () => {
    expect(normalizeState({ picks: { n: 3, wins: { eyes: 2, nonsense: 5 } } }).picks).toEqual({ n: 3, wins: { eyes: 2 } });
    expect(normalizeState({}).picks).toEqual(NO_PICKS);
  });
});
