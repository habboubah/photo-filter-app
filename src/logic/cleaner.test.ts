import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { buildGroups, findBlurry, isVideoGroup, makeLibrary, mediaTotals, summarize } from './analyze';
import { rankDuplicates } from './best';
import { nearHash, prng } from './fixtures';
import { buildMonths, monthKey, onThisDay, progress } from './months';
import { reviewCleanup, reviewGroup, reviewScreenshots, reviewTrip } from './review';
import { findScreenshots, isOldShot, oldShots } from './screenshots';
import { findGroups } from './similar';
import { cleanParts, selection } from './smartClean';
import { emptyState, normalizeState } from './state';

const DAY = 24 * 3600_000;
const T = new Date(2026, 4, 2, 15).getTime();
let n = 0;
const photo = (extra: Partial<Photo> = {}): Photo => ({
  id: `c${++n}`, t: T, bytes: 3_000_000, w: 4000, h: 3000, hash: '0f0f0f0f0f0f0f0f', sharp: 300, contrast: 50, expo: 0.5, clip: 0, ...extra,
});

describe('duplicates', () => {
  const r = prng(11);
  const base = 'a5a5a5a5c3c3c3c3';

  it('finds a copy saved weeks later, smaller, with the same picture', () => {
    const original = photo({ t: T, hash: base });
    const copy = photo({ t: T + 40 * DAY, hash: nearHash(base, 2, r), w: 1600, h: 1200, bytes: 300_000 });
    const other = photo({ t: T + 20 * DAY, hash: '5a5a5a5a3c3c3c3c' });
    const groups = findGroups(makeLibrary([original, copy, other]).photos);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('duplicate');
    expect(groups[0].ids).toEqual([original.id, copy.id]);
    expect(groups[0].key).toBe(`d:${original.id}`);
  });

  it('keeps similar groups as they were (kind and key)', () => {
    const a = photo({ t: T, hash: base });
    const b = photo({ t: T + 4_000, hash: nearHash(base, 6, r) });
    const [g] = findGroups(makeLibrary([a, b]).photos);
    expect(g.kind).toBe('similar');
    expect(g.key).toBe(`g:${a.id}`);
  });

  it('does not call a picture of another shape or light, a far hash, a flat picture or a screenshot a duplicate', () => {
    const a = photo({ t: T, hash: base });
    const portrait = photo({ t: T + 30 * DAY, hash: base, w: 3000, h: 4000 });
    const far = photo({ t: T + 31 * DAY, hash: nearHash(base, 3, r) });
    const brighter = photo({ t: T + 32 * DAY, hash: base, expo: 0.6 });
    const flatter = photo({ t: T + 33 * DAY, hash: base, contrast: 40 });
    const dark1 = photo({ t: T + 2 * DAY, hash: '0000000000000001' });
    const dark2 = photo({ t: T + 9 * DAY, hash: '0000000000000001' });
    const shot = photo({ t: T + 50 * DAY, hash: base, shot: true });
    expect(findGroups(makeLibrary([a, portrait, far, brighter, flatter, dark1, dark2, shot]).photos)).toHaveLength(0);
  });

  it('joins a burst and its later copy into one duplicate group', () => {
    const a = photo({ t: T, hash: base });
    const b = photo({ t: T + 3_000, hash: nearHash(base, 7, r) });
    const copy = photo({ t: T + 60 * DAY, hash: base, w: 2000, h: 1500 });
    const groups = findGroups(makeLibrary([a, b, copy]).photos);
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('duplicate');
    expect(groups[0].ids).toHaveLength(3);
  });

  it('keeps the original: a favourite, else the most pixels, else the oldest', () => {
    const original = photo({ t: T });
    const copy = photo({ t: T + DAY, w: 1600, h: 1200 });
    expect(rankDuplicates([copy, original])[0].id).toBe(original.id);
    const twin = photo({ t: T + 2 * DAY });
    expect(rankDuplicates([twin, original])[0].id).toBe(original.id);
    const fav = photo({ t: T + 3 * DAY, w: 800, h: 600, fav: true });
    expect(rankDuplicates([original, fav])[0].id).toBe(fav.id);
  });

  it('builds duplicate groups with the original as best and counts them apart from similar ones', () => {
    const original = photo({ t: T, hash: base });
    const copy = photo({ t: T + 40 * DAY, hash: base, w: 1600, h: 1200, bytes: 400_000 });
    const s1 = photo({ t: T + 10 * DAY, hash: '5a5a5a5a3c3c3c3c' });
    const s2 = photo({ t: T + 10 * DAY + 2_000, hash: '5a5a5a5a3c3c3c3d', sharp: 50 });
    const lib = makeLibrary([original, copy, s1, s2]);
    const groups = buildGroups(lib, findGroups(lib.photos), emptyState());
    const dup = groups.find(g => g.kind === 'duplicate')!;
    expect(dup.best).toBe(original.id);
    const sum = summarize(lib, groups, findBlurry(lib, groups), new Set());
    expect(sum.duplicates).toEqual({ count: 1, bytes: 400_000, groups: 1 });
    expect(sum.similar.count).toBe(1);
    expect(sum.total.count).toBe(2);
    expect(reviewGroup(dup, new Set(), lib.byId).map(i => i.reason)).toEqual(['original', 'duplicate']);
  });
});

describe('screenshots', () => {
  const now = T + 100 * DAY;
  const old = photo({ t: T, shot: true, bytes: 900_000 });
  const fresh = photo({ t: now - 2 * DAY, shot: true, bytes: 800_000 });
  const fav = photo({ t: T, shot: true, fav: true });
  const keptShot = photo({ t: T, shot: true });
  const normal = photo({ t: T });

  it('lists screenshots newest first, without favourites or kept ones', () => {
    const list = findScreenshots([old, fresh, fav, keptShot, normal], new Set([keptShot.id]));
    expect(list.map(p => p.id)).toEqual([fresh.id, old.id]);
  });

  it('counts only the old ones on the clean-up card', () => {
    expect(isOldShot(old, now)).toBe(true);
    expect(isOldShot(fresh, now)).toBe(false);
    const shots = oldShots(findScreenshots([old, fresh], new Set()), now);
    const lib = makeLibrary([old, fresh]);
    const sum = summarize(lib, [], [], new Set(), shots);
    expect(sum.screenshots).toEqual({ count: 1, bytes: 900_000 });
    expect(sum.total.count).toBe(1);
    expect(reviewScreenshots(shots).map(i => [i.id, i.suggest, i.reason])).toEqual([[old.id, 'delete', 'screenshot']]);
    expect(reviewCleanup([], [], new Set(), lib.byId, shots).map(i => i.reason)).toEqual(['screenshot']);
  });

  it('suggests an old screenshot in a month review only when asked to', () => {
    const lib = makeLibrary([old, normal]);
    const ids = lib.photos.map(p => p.id);
    expect(reviewTrip(ids, [], lib.byId, new Set()).every(i => i.suggest === 'keep')).toBe(true);
    const items = reviewTrip(ids, [], lib.byId, new Set(), p => isOldShot(p, now));
    expect(items.find(i => i.id === old.id)?.suggest).toBe('delete');
  });
});

describe('smart clean', () => {
  const best = photo({ t: T });
  const extra = photo({ t: T + 1, bytes: 1_000 });
  const favExtra = photo({ t: T + 2, fav: true });
  const blurry = photo({ t: T + 3, sharp: 5, bytes: 2_000 });
  const maybe = photo({ t: T + 4, sharp: 50 });
  const shot = photo({ t: T + 5, shot: true, bytes: 4_000 });
  const copy = photo({ t: T + 6, bytes: 8_000 });
  const byId = new Map([best, extra, favExtra, blurry, maybe, shot, copy].map(p => [p.id, p]));
  const groups = [
    { key: 'g', kind: 'similar' as const, ids: [best.id, extra.id, favExtra.id], best: best.id, suggested: best.id },
    { key: 'd', kind: 'duplicate' as const, ids: [best.id, copy.id], best: best.id, suggested: best.id },
  ];

  it('lists each kind once, never a best shot, a favourite, a kept photo or an unsure blurry one', () => {
    const parts = cleanParts(groups, [blurry, maybe], [shot], new Set(), byId);
    const by = Object.fromEntries(parts.map(p => [p.kind, p.ids]));
    expect(by).toEqual({ duplicates: [copy.id], similar: [extra.id], videos: [], blurry: [blurry.id], exposure: [], screenshots: [shot.id] });
    expect(cleanParts(groups, [blurry], [shot], new Set([extra.id, shot.id]), byId).find(p => p.kind === 'similar')!.ids).toEqual([]);
  });

  it('adds up what is switched on', () => {
    const parts = cleanParts(groups, [blurry], [shot], new Set(), byId);
    expect(selection(parts, new Set(['similar', 'screenshots']))).toEqual({ ids: [extra.id, shot.id], bytes: 5_000 });
    expect(selection(parts, new Set())).toEqual({ ids: [], bytes: 0 });
  });
});

describe('month by month and on this day', () => {
  const jan = photo({ t: new Date(2026, 0, 10, 12).getTime(), bytes: 10 });
  const jan2 = photo({ t: new Date(2026, 0, 28, 12).getTime(), bytes: 5 });
  const mar = photo({ t: new Date(2026, 2, 1, 12).getTime(), bytes: 7 });

  it('cuts the library into months, newest first', () => {
    const months = buildMonths(makeLibrary([mar, jan, jan2]).photos);
    expect(months.map(m => [m.key, m.ids.length, m.bytes])).toEqual([['2026-03', 1, 7], ['2026-01', 2, 15]]);
    expect(monthKey(jan.t)).toBe('2026-01');
  });

  it('finds this day in earlier years, newest year first, without screenshots', () => {
    const now = new Date(2026, 10, 16, 9).getTime();
    const y2025 = photo({ t: new Date(2025, 10, 16, 18).getTime() });
    const y2024 = photo({ t: new Date(2024, 10, 16, 8).getTime() });
    const other = photo({ t: new Date(2025, 10, 17, 8).getTime() });
    const today = photo({ t: new Date(2026, 10, 16, 7).getTime() });
    const shot = photo({ t: new Date(2023, 10, 16, 8).getTime(), shot: true });
    const r = onThisDay(makeLibrary([y2024, y2025, other, today, shot]).photos, now);
    expect(r.years).toEqual([2025, 2024]);
    expect(r.ids).toEqual([y2025.id, y2024.id]);
  });
});

describe('stored decisions, new fields', () => {
  it('reads months and the freed count, and drops what is malformed', () => {
    const s = normalizeState({ months: ['2026-03', '2026-03', 'x', 5], freed: { count: 12, bytes: 3e9 } });
    expect(s.months).toEqual(['2026-03']);
    expect(s.freed).toEqual({ count: 12, bytes: 3e9 });
    expect(normalizeState({ freed: { count: -1, bytes: 'a' } }).freed).toEqual({ count: 0, bytes: 0 });
    expect(normalizeState({}).months).toEqual([]);
  });
});

describe('the progress figure', () => {
  const m = (key: string, n: number) => ({ key, year: 2026, month: 0, ids: Array.from({ length: n }, (_, i) => `${key}-${i}`), bytes: 0 });

  it('is 0 for an empty library and 100 once every month is done', () => {
    expect(progress([], new Set())).toBe(0);
    expect(progress([m('2026-01', 3), m('2026-02', 5)], new Set(['2026-01', '2026-02']))).toBe(100);
  });

  it('counts photos, not months, and rounds down', () => {
    // 38 of 100 photos: 38 %; 2 of 3 photos: 66 %, never 67 % before it is reached.
    expect(progress([m('2026-01', 38), m('2026-02', 62)], new Set(['2026-01']))).toBe(38);
    expect(progress([m('2026-01', 2), m('2026-02', 1)], new Set(['2026-01']))).toBe(66);
    expect(progress([m('2026-01', 999), m('2026-02', 1)], new Set(['2026-01']))).toBe(99);
  });
});

describe('photos apart from videos', () => {
  it('counts and cleans copies of a video with the similar videos, not with the duplicates', () => {
    const v1: Photo = { id: 'v1', t: 1, bytes: 9_000, w: 1920, h: 1080, video: true, dur: 5000 };
    const v2: Photo = { ...v1, id: 'v2', t: 2 };
    const p1: Photo = { id: 'p1', t: 3, bytes: 2_000, w: 4000, h: 3000 };
    const p2: Photo = { ...p1, id: 'p2', t: 4 };
    const lib = makeLibrary([v1, v2, p1, p2]);
    const groups = [
      { key: 'dv', kind: 'duplicate' as const, ids: ['v1', 'v2'], best: 'v1', suggested: 'v1' },
      { key: 'dp', kind: 'duplicate' as const, ids: ['p1', 'p2'], best: 'p1', suggested: 'p1' },
    ];
    expect(isVideoGroup(groups[0], lib.byId)).toBe(true);
    expect(isVideoGroup(groups[1], lib.byId)).toBe(false);
    const s = summarize(lib, groups, [], new Set());
    expect(s.duplicates).toEqual({ count: 1, bytes: 2_000, groups: 1 });
    expect(s.lookalike).toEqual({ count: 1, bytes: 9_000, groups: 1 });
    expect(s.media).toEqual({ photos: { count: 1, bytes: 2_000 }, videos: { count: 1, bytes: 9_000 } });
    const by = Object.fromEntries(cleanParts(groups, [], [], new Set(), lib.byId).map(p => [p.kind, p.ids]));
    expect(by.duplicates).toEqual(['p2']);
    expect(by.videos).toEqual(['v2']);
    expect(mediaTotals(lib.photos)).toEqual({ photos: { count: 2, bytes: 4_000 }, videos: { count: 2, bytes: 18_000 } });
  });
});
