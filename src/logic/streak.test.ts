import { describe, expect, it } from 'vitest';
import { addDay, dayKey, KEEP_DAYS, streak } from './streak';
import { normalizeState } from './state';

const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

describe('streak', () => {
  it('counts days in a row up to today, or up to yesterday', () => {
    let days: string[] = [];
    for (const d of [10, 11, 12, 14, 15]) days = addDay(days, day(2026, 11, d));
    expect(streak(days, day(2026, 11, 15, 20))).toBe(2);
    expect(streak(days, day(2026, 11, 16, 9))).toBe(2); // today may still come
    expect(streak(days, day(2026, 11, 17, 9))).toBe(0);
    expect(streak(addDay(days, day(2026, 11, 13)), day(2026, 11, 15))).toBe(6);
  });

  it('keeps each day once and only the last days', () => {
    const once = addDay(addDay([], day(2026, 1, 1, 8)), day(2026, 1, 1, 22));
    expect(once).toEqual([dayKey(day(2026, 1, 1))]);
    let many: string[] = [];
    for (let i = 0; i < 100; i++) many = addDay(many, day(2026, 1, 1) + i * 86400_000);
    expect(many).toHaveLength(KEEP_DAYS);
  });

  it('reads stored days and drops what is malformed', () => {
    expect(normalizeState({ days: ['2026-11-16', 'x', '2026-11-15', '2026-11-16'] }).days).toEqual(['2026-11-15', '2026-11-16']);
  });
});
