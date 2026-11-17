import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { LIKELY_COS, WORSE_COS, blurryTrust, groupVerdict, lessSure, oneTap } from './confidence';
import { nearHash, prng } from './fixtures';
import { cleanParts } from './smartClean';
import { reviewGroup } from './review';

const base = 'a5a5a5a5c3c3c3c3';
let n = 0;
const photo = (extra: Partial<Photo> = {}): Photo => ({
  id: `v${++n}`, t: 0, bytes: 3_000_000, w: 4000, h: 3000, hash: base, sharp: 300, contrast: 50, expo: 0.5, clip: 0, ...extra,
});
const similar = { kind: 'similar' as const };
const duplicate = { kind: 'duplicate' as const };

describe('how sure the app is about a group\'s extra shot', () => {
  const r = prng(3);

  it('is sure about an exact copy and a smaller copy of a photo still there', () => {
    const best = photo();
    expect(groupVerdict(duplicate, photo(), best)).toEqual({ trust: 'sure', detail: 'exactCopy' });
    expect(groupVerdict(duplicate, photo({ w: 1600, h: 1200, hash: nearHash(base, 2, r) }), best)).toEqual({ trust: 'sure', detail: 'smallerCopy' });
  });

  it('wants an edited copy only the AI found checked', () => {
    const v = groupVerdict({ kind: 'duplicate', weak: true }, photo({ hash: nearHash(base, 4, r) }), photo());
    expect(v).toEqual({ trust: 'check', detail: 'alteredCopy' });
  });

  it('is sure about the frames of a burst nobody picked', () => {
    const best = photo({ burst: 'b1', pick: true });
    expect(groupVerdict(similar, photo({ burst: 'b1' }), best).trust).toBe('sure');
  });

  it('says what is worse: closed eyes, blur, light — and trusts it with the vectors\' word', () => {
    const best = photo({ eyes: 0.9, sharp: 400 });
    expect(groupVerdict(similar, photo({ eyes: 0.1, sharp: 400 }), best, WORSE_COS + 0.01)).toEqual({ trust: 'likely', detail: 'eyesClosed' });
    expect(groupVerdict(similar, photo({ sharp: 100 }), best, WORSE_COS + 0.01)).toEqual({ trust: 'likely', detail: 'blurrier' });
    expect(groupVerdict(similar, photo({ sharp: 380, expo: 0.95 }), best, LIKELY_COS - 0.02).trust).toBe('check');
    expect(groupVerdict(similar, photo({ sharp: 390 }), best, 0.99)).toEqual({ trust: 'likely', detail: 'nearlySame' });
    // Without vectors, close hashes stand in.
    expect(groupVerdict(similar, photo({ sharp: 390, hash: nearHash(base, 2, r) }), best).trust).toBe('likely');
    expect(groupVerdict(similar, photo({ sharp: 390, hash: nearHash(base, 9, r) }), best).trust).toBe('check');
  });

  it('never trusts a lookalike video blindly', () => {
    expect(groupVerdict({ kind: 'lookalike' }, photo(), photo()).trust).toBe('check');
  });

  it('is sure only about clearly blurry photos, and one level less where the user disagreed', () => {
    expect(blurryTrust(photo({ sharp: 2 }))).toBe('likely');
    expect(lessSure('sure')).toBe('likely');
    expect(lessSure('likely')).toBe('check');
    expect(oneTap('check')).toBe(false);
  });
});

describe('quick clean and the review', () => {
  it('deletes in one tap only what the app is sure about; the rest waits for a review', () => {
    const best = photo({ t: 0 });
    const copy = photo({ t: 1000 });
    const unsure = photo({ t: 2000, sharp: 290, hash: nearHash(base, 9, prng(1)) });
    const byId = new Map([best, copy, unsure].map(p => [p.id, p]));
    const groups = [{ key: 'g:x', kind: 'similar' as const, ids: [best.id, copy.id, unsure.id], best: best.id, suggested: best.id }];
    const part = cleanParts(groups, [], [], new Set(), byId).find(p => p.kind === 'similar')!;
    expect(part.ids).toEqual([copy.id]);
    expect(part.check).toEqual([unsure.id]);
    const items = reviewGroup(groups[0], new Set(), byId);
    expect(items.map(i => i.trust)).toEqual([undefined, 'likely', 'check']);
  });
});
