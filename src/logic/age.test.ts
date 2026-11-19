import { describe, expect, it } from 'vitest';
import { ageCut, olderThan } from './age';

describe('the age filter', () => {
  const now = new Date(2026, 10, 19, 12).getTime();
  const at = (y: number, m: number, d: number) => ({ t: new Date(y, m, d, 12).getTime() });
  const photos = [at(2026, 10, 1), at(2026, 9, 1), at(2026, 6, 1), at(2026, 3, 1)];

  it('keeps everything for Alle', () => {
    expect(ageCut('all', now)).toBeNull();
    expect(olderThan(photos, 'all', now)).toEqual(photos);
  });

  it('counts calendar months back from today', () => {
    expect(new Date(ageCut('1', now)!).getMonth()).toBe(9);
    expect(olderThan(photos, '1', now)).toEqual(photos.slice(1));
    expect(olderThan(photos, '3', now)).toEqual(photos.slice(2));
    expect(olderThan(photos, '6', now)).toEqual(photos.slice(3));
  });
});
