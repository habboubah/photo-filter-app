import { describe, expect, it } from 'vitest';
import type { Group, Photo, Trip } from '../types';
import { RATE_EMPTY, newTrip, parseList, parseRate, shouldAsk, sinceLast, sinceWords, withAsk, withWin } from './nudges';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 18, 18);
const photo = (id: string, t: number, bytes = 1000): Photo => ({ id, t, bytes, w: 100, h: 100 } as Photo);
const group = (key: string, ids: string[]): Group => ({ key, kind: 'similar', ids, best: ids[0], suggested: ids[0] } as Group);
const trip = (key: string, start: number, end: number, over: Partial<Trip> = {}): Trip =>
  ({ key, start, end, ids: ['a'], place: 'Paris', dates: '', title: key, autoTitle: key, ignored: false, bytes: 1, ...over });

describe('the rating prompt', () => {
  it('asks after two clean-ups that freed space, once per version, at most three times', () => {
    let s = RATE_EMPTY;
    expect(shouldAsk(s, NOW, '2.1.0')).toBe(false);
    s = withWin(withWin(s));
    expect(shouldAsk(s, NOW, '2.1.0')).toBe(true);
    s = withAsk(s, NOW, '2.1.0');
    expect(shouldAsk(s, NOW + 200 * DAY, '2.1.0')).toBe(false);
    expect(shouldAsk(s, NOW + 30 * DAY, '2.2.0')).toBe(false);
    expect(shouldAsk(s, NOW + 130 * DAY, '2.2.0')).toBe(true);
    s = withAsk(withAsk(s, NOW + 130 * DAY, '2.2.0'), NOW + 300 * DAY, '2.3.0');
    expect(shouldAsk(s, NOW + 600 * DAY, '2.4.0')).toBe(false);
  });

  it('reads what it saved, and nothing broken', () => {
    expect(parseRate(JSON.stringify({ wins: 2, asks: 1, lastAsk: 5, version: '2.0.0' }))).toEqual({ wins: 2, asks: 1, lastAsk: 5, version: '2.0.0' });
    expect(parseRate('{"wins":-3,"asks":"x"}')).toEqual(RATE_EMPTY);
    expect(parseRate('nonsense')).toEqual(RATE_EMPTY);
    expect(parseRate(null)).toEqual(RATE_EMPTY);
  });
});

describe('since last time', () => {
  const photos = [photo('old', NOW - 5 * DAY), ...Array.from({ length: 6 }, (_, i) => photo(`n${i}`, NOW - 3 * DAY + i * 3_600_000))];

  it('counts what was taken since the last visit, newest first, and the groups it is in', () => {
    const s = sinceLast(photos, [group('g', ['n0', 'n1']), group('h', ['old', 'x'])], NOW - 4 * DAY, NOW);
    expect(s?.ids).toEqual(['n5', 'n4', 'n3', 'n2', 'n1', 'n0']);
    expect(s?.bytes).toBe(6000);
    expect(s?.groups).toBe(1);
  });

  it('says nothing on a first start, a quick return, or with little new', () => {
    expect(sinceLast(photos, [], null, NOW)).toBeNull();
    expect(sinceLast(photos, [], NOW - 3_600_000, NOW)).toBeNull();
    expect(sinceLast(photos, [], NOW - 3 * DAY + 2 * 3_600_000, NOW)).toBeNull();
  });

  it('names the day within a week, else the date', () => {
    expect(sinceWords(Date.UTC(2026, 10, 15, 12), NOW, 'de')).toBe('Sonntag');
    expect(sinceWords(Date.UTC(2026, 10, 3, 12), NOW, 'en')).toBe('November 3');
  });
});

describe('a new trip', () => {
  it('is the newest trip not shown yet, without an album, ended lately', () => {
    const trips = [trip('a', NOW - 90 * DAY, NOW - 85 * DAY), trip('b', NOW - 20 * DAY, NOW - 15 * DAY)];
    expect(newTrip(trips, new Set(), NOW)?.key).toBe('b');
    expect(newTrip(trips, new Set(['b']), NOW)).toBeNull();
    expect(newTrip([trips[0]], new Set(), NOW)).toBeNull();
    expect(newTrip([trip('c', NOW - 5 * DAY, NOW - 2 * DAY, { album: { title: 'c', count: 1, at: 0 } })], new Set(), NOW)).toBeNull();
    expect(newTrip([trip('d', NOW - 5 * DAY, NOW - 2 * DAY, { ignored: true })], new Set(), NOW)).toBeNull();
  });

  it('reads its list', () => {
    expect(parseList('["a","b",3]')).toEqual(['a', 'b']);
    expect(parseList('{')).toEqual([]);
  });
});
