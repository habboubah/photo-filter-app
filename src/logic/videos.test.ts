import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { makeLibrary, detect, findBlurry, buildGroups } from './analyze';
import { rankGroup } from './best';
import { duration, findLarge, findLive, LARGE_MIN } from './large';
import { reviewLarge } from './review';
import { findScreenshots } from './screenshots';
import { findGroups, findVideoDuplicates } from './similar';
import { emptyState } from './state';
import { detectTrips } from './trips';
import { findHomes } from './home';

const T = new Date(2026, 4, 2, 15).getTime();
let n = 0;
const photo = (extra: Partial<Photo> = {}): Photo => ({
  id: `v${++n}`, t: T, bytes: 3_000_000, w: 4000, h: 3000, hash: 'a5a5a5a5c3c3c3c3', sharp: 300, contrast: 50, expo: 0.5, clip: 0, ...extra,
});
const video = (extra: Partial<Photo> = {}) => photo({ video: true, dur: 60_000, w: 1920, h: 1080, bytes: 80_000_000, ...extra });

describe('videos', () => {
  it('finds the same video saved twice, whatever the gap', () => {
    const a = video({ t: T });
    const b = video({ t: T + 6 * 86400_000, dur: 60_200 });
    const other = video({ t: T + 1000, dur: 120_000 });
    const groups = findVideoDuplicates(makeLibrary([a, b, other]).photos);
    expect(groups).toEqual([{ key: `v:${a.id}`, ids: [a.id, b.id], kind: 'duplicate' }]);
  });

  it('does not call videos of another length, shape or picture duplicates', () => {
    const a = video();
    expect(findVideoDuplicates([a, video({ dur: 62_000 })])).toHaveLength(0);
    expect(findVideoDuplicates([a, video({ w: 1080, h: 1920 })])).toHaveLength(0);
    expect(findVideoDuplicates([a, video({ hash: '5a5a5a5a3c3c3c3c' })])).toHaveLength(0);
  });

  it('keeps videos out of photo groups, the blurry list, trips and home', () => {
    const p = photo({ t: T });
    const v = video({ t: T + 1000, w: 4000, h: 3000, sharp: 1 });
    expect(findGroups(makeLibrary([p, v]).photos)).toHaveLength(0);
    const lib = makeLibrary([p, v]);
    expect(findBlurry(lib, [])).toHaveLength(0);
    const far = [video({ t: T, lat: 48.85, lon: 2.35 }), video({ t: T + 8 * 3600_000, lat: 48.85, lon: 2.35 })];
    const homes = findHomes(far);
    expect(homes.home).toBeNull();
    expect(detectTrips(far, homes)).toHaveLength(0);
  });

  it('puts duplicate videos among the duplicate groups', () => {
    const a = video({ t: T });
    const b = video({ t: T + 86400_000 });
    const lib = makeLibrary([a, b]);
    const groups = buildGroups(lib, detect(lib).groups, emptyState());
    expect(groups).toHaveLength(1);
    expect(groups[0].kind).toBe('duplicate');
  });

  it('lists screen recordings with the screenshots', () => {
    const rec = video({ rec: true, t: T + 5 });
    const shot = photo({ shot: true, t: T + 1 });
    expect(findScreenshots([rec, shot, video()], new Set()).map(p => p.id)).toEqual([rec.id, shot.id]);
  });
});

describe('large files and Live Photos', () => {
  it('lists the biggest first, videos or photos on their own', () => {
    const big = video({ bytes: 500_000_000 });
    const mid = photo({ bytes: 40_000_000 });
    const small = photo({ bytes: LARGE_MIN - 1 });
    expect(findLarge([small, mid, big]).map(p => p.id)).toEqual([big.id, mid.id]);
    expect(findLarge([small, mid, big], 'videos').map(p => p.id)).toEqual([big.id]);
    expect(findLarge([small, mid, big], 'photos').map(p => p.id)).toEqual([mid.id]);
    expect(reviewLarge([big]).map(i => [i.suggest, i.reason])).toEqual([['keep', 'large']]);
  });

  it('writes durations the way players do', () => {
    expect(duration(65_000)).toBe('1:05');
    expect(duration(750_000)).toBe('12:30');
    expect(duration(3_723_000)).toBe('1:02:03');
  });

  it('lists Live Photos newest first', () => {
    const old = photo({ live: true, t: T });
    const fresh = photo({ live: true, t: T + 1 });
    expect(findLive([old, photo(), fresh]).map(p => p.id)).toEqual([fresh.id, old.id]);
  });
});

describe('bursts', () => {
  it('keeps the burst pick unless a favourite says otherwise', () => {
    const sharp = photo({ sharp: 900 });
    const pick = photo({ sharp: 200, burst: 'b', pick: true });
    expect(rankGroup([sharp, pick])[0].id).toBe(pick.id);
    const fav = photo({ sharp: 100, fav: true });
    expect(rankGroup([sharp, pick, fav])[0].id).toBe(fav.id);
  });
});
