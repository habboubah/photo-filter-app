import { describe, expect, it } from 'vitest';
import { ETA_MIN_DONE, ETA_MIN_MS, etaWords, secondsLeft } from './eta';

describe('secondsLeft', () => {
  const start = { at: 0, done: 0 };

  it('says nothing while the phase is young', () => {
    expect(secondsLeft(start, { at: ETA_MIN_MS - 1, done: 100 }, 1000)).toBeNull();
    expect(secondsLeft(start, { at: 60_000, done: ETA_MIN_DONE - 1 }, 1000)).toBeNull();
    expect(secondsLeft(start, { at: 60_000, done: 100 }, 0)).toBeNull();
  });

  it('applies the speed so far to what is left', () => {
    // 100 photos in 10 s, 400 left: 40 s.
    expect(secondsLeft(start, { at: 10_000, done: 100 }, 500)).toBeCloseTo(40);
    // A phase that began part way (a scan that continues): only what moved since counts.
    expect(secondsLeft({ at: 1000, done: 200 }, { at: 11_000, done: 300 }, 500)).toBeCloseTo(20);
  });

  it('is zero at the end', () => {
    expect(secondsLeft(start, { at: 10_000, done: 500 }, 500)).toBe(0);
  });
});

describe('etaWords', () => {
  it('rounds the way people say it', () => {
    expect(etaWords(0)).toEqual({ kind: 'soon' });
    expect(etaWords(59)).toEqual({ kind: 'soon' });
    expect(etaWords(61)).toEqual({ kind: 'minutes', minutes: 2 });
    expect(etaWords(14 * 60)).toEqual({ kind: 'minutes', minutes: 14 });
    expect(etaWords(67 * 60)).toEqual({ kind: 'hours', hours: 1, minutes: 5 });
    expect(etaWords(119 * 60)).toEqual({ kind: 'hours', hours: 2, minutes: 0 });
  });
});
