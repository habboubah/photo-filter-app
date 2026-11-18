import { describe, expect, it } from 'vitest';
import { gridColumns } from './layout';

// Content widths: the page less its 2 × 16 px margins (2 × 12 px under 360 px).
const SMALL = 320 - 24;  // the narrowest phones, iPhone SE (1st gen.) and small Android phones
const ANDROID = 360 - 32;
const SE = 375 - 32;
const PRO_MAX = 430 - 32;
const COLUMN = 448 - 32; // the page column at its widest (28rem): a tablet, a laptop

describe('gridColumns', () => {
  it('keeps the phone counts on every phone from 360 to 430 px', () => {
    for (const w of [ANDROID, SE, PRO_MAX]) {
      expect(gridColumns(w, 3)).toBe(3);
      expect(gridColumns(w, 4)).toBe(4);
    }
  });

  it('drops a grid of four to three on the narrowest phones, never below three', () => {
    expect(gridColumns(SMALL, 4)).toBe(3);
    expect(gridColumns(SMALL, 3)).toBe(3);
    expect(gridColumns(200, 4)).toBe(3);
  });

  it('keeps a grid of two at two', () => {
    expect(gridColumns(SMALL, 2)).toBe(2);
    expect(gridColumns(ANDROID, 2)).toBe(2);
  });

  it('never shows more than the phone count, however wide', () => {
    expect(gridColumns(COLUMN, 3)).toBe(3);
    expect(gridColumns(COLUMN, 4)).toBe(4);
    expect(gridColumns(5000, 3)).toBe(3);
  });

  it('falls back to the phone count before the width is known', () => {
    expect(gridColumns(0, 3)).toBe(3);
    expect(gridColumns(NaN, 4)).toBe(4);
  });
});
