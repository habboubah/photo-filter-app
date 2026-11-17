import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { batches, canCompress, COMPRESS_MIN_BYTES, estimatedSaving, findCompressible, tally } from './compress';

let n = 0;
const photo = (extra: Partial<Photo> = {}): Photo => ({ id: `c${++n}`, t: n, bytes: 4_000_000, w: 4032, h: 3024, fmt: 'jpeg', ...extra });
const none = new Set<string>();

describe('smaller photos', () => {
  it('takes camera JPEGs and PNGs of at least 1 MB', () => {
    expect(canCompress(photo(), none)).toBe(true);
    expect(canCompress(photo({ fmt: 'png' }), none)).toBe(true);
    expect(canCompress(photo({ bytes: COMPRESS_MIN_BYTES - 1 }), none)).toBe(false);
  });

  it('leaves HEIC, RAW, unknown formats, edited photos, Live Photos, videos and protected photos alone', () => {
    for (const extra of [{ fmt: 'heic' }, { fmt: 'raw' }, { fmt: undefined }, { fmt: 'other' }, { edited: true }, { live: true }, { video: true }, { fav: true }] as Partial<Photo>[]) {
      expect(canCompress(photo(extra), none), JSON.stringify(extra)).toBe(false);
    }
    const kept = photo();
    expect(canCompress(kept, new Set([kept.id]))).toBe(false);
  });

  it('estimates half a JPEG and 70 % of a PNG, and lists the largest saving first', () => {
    const jpeg = photo({ bytes: 4_000_000 });
    const png = photo({ fmt: 'png', bytes: 3_000_000 });
    const shot = photo({ fmt: 'png', shot: true, bytes: 1_500_000 });
    expect(estimatedSaving(jpeg)).toBe(2_000_000);
    expect(estimatedSaving(png)).toBe(2_100_000);
    const c = findCompressible([jpeg, png, shot, photo({ fmt: 'heic' })], none);
    expect(c.photos.map(p => p.id)).toEqual([png.id, jpeg.id]);
    expect(c.screenshots.map(p => p.id)).toEqual([shot.id]);
    expect(c.saving).toBe(2_000_000 + 2_100_000 + 1_050_000);
  });

  it('works in batches of 20 and adds up what was saved', () => {
    expect(batches(Array.from({ length: 45 }, (_, i) => i)).map(b => b.length)).toEqual([20, 20, 5]);
    expect(tally([{ before: 10, after: 4 }, { before: 8, after: 9 }])).toEqual({ count: 2, saved: 6 });
  });
});
