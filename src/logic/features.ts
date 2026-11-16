/*
 * The per-photo features, as a specification every implementation follows to
 * the bit: this file (the web demo and the tests), FeatureMath.swift
 * (ios/PhotoFeatures) and FeatureMath.kt (android). All three are checked
 * against the same fixtures and expected values (fixtures/features/), so a
 * score means the same on the iPhone and on Android.
 *
 * Input: the photo scaled to fit 512 × 512 (aspect kept) and turned grey with
 * integer weights: g = (77·R + 150·G + 29·B + 128) >> 8.
 *
 * - hash: a 64-bit difference hash. The grey image is averaged into 9 × 8
 *   cells (cell c of n spans floor(c·w/n) … floor((c+1)·w/n), at least one
 *   pixel); bit (row, col) is 1 when cell (row, col) is darker than cell
 *   (row, col + 1). Row-major, the first bit is the top bit of the first hex
 *   digit: 16 lowercase hex digits.
 * - sharp: the variance of the 4-neighbour Laplacian over the inner pixels
 *   (sums kept as exact integers, then mean of squares minus squared mean in
 *   double precision), rounded to 2 decimals.
 * - contrast: the grey values' standard deviation; expo: their mean / 255;
 *   clip: the share of pixels ≤ 4 or ≥ 251. Rounded to 4 decimals (contrast 2).
 */

/** Bump when anything above changes: every photo is analysed again. Kept in step with the native FEATURE_VERSION. */
export const FEATURE_VERSION = 1;
/** The long side of the grey image the features are computed on. */
export const LONG_SIDE = 512;

export interface Features {
  hash: string;
  sharp: number;
  contrast: number;
  expo: number;
  clip: number;
}

const round = (x: number, places: number) => {
  const f = 10 ** places;
  return Math.round(x * f) / f;
};

/** The grey value of one RGB pixel, as every decoder computes it. */
export const grey = (r: number, g: number, b: number) => (77 * r + 150 * g + 29 * b + 128) >> 8;

/** Size of the grey image for a picture of w × h: fits LONG_SIDE, never enlarged, at least 1. */
export function fitSize(w: number, h: number, long = LONG_SIDE): { w: number; h: number } {
  const scale = Math.min(1, long / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

function cellBounds(i: number, n: number, size: number): [number, number] {
  const a = Math.floor((i * size) / n);
  const b = Math.max(a + 1, Math.floor(((i + 1) * size) / n));
  return [Math.min(a, size - 1), Math.min(b, size)];
}

export function dHash(g: Uint8Array, w: number, h: number): string {
  const sums: number[] = [];
  const counts: number[] = [];
  for (let r = 0; r < 8; r++) {
    const [y0, y1] = cellBounds(r, 8, h);
    for (let c = 0; c < 9; c++) {
      const [x0, x1] = cellBounds(c, 9, w);
      let sum = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) sum += g[y * w + x];
      sums.push(sum);
      counts.push((x1 - x0) * (y1 - y0));
    }
  }
  let hex = '';
  for (let r = 0; r < 8; r++) {
    let byte = 0;
    for (let c = 0; c < 8; c++) {
      const a = r * 9 + c;
      // left < right without dividing: sumL / cntL < sumR / cntR
      const bit = sums[a] * counts[a + 1] < sums[a + 1] * counts[a] ? 1 : 0;
      byte = (byte << 1) | bit;
    }
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export function sharpness(g: Uint8Array, w: number, h: number): number {
  if (w < 3 || h < 3) return 0;
  let s = 0;
  let q = 0;
  for (let y = 1; y < h - 1; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = row + x;
      const l = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i];
      s += l;
      q += l * l;
    }
  }
  const n = (w - 2) * (h - 2);
  const mean = s / n;
  return round(Math.max(0, q / n - mean * mean), 2);
}

export function stats(g: Uint8Array): { contrast: number; expo: number; clip: number } {
  let s = 0;
  let q = 0;
  let clipped = 0;
  for (let i = 0; i < g.length; i++) {
    const v = g[i];
    s += v;
    q += v * v;
    if (v <= 4 || v >= 251) clipped++;
  }
  const n = g.length || 1;
  const mean = s / n;
  return {
    contrast: round(Math.sqrt(Math.max(0, q / n - mean * mean)), 2),
    expo: round(mean / 255, 4),
    clip: round(clipped / n, 4),
  };
}

export function features(g: Uint8Array, w: number, h: number): Features {
  return { hash: dHash(g, w, h), sharp: sharpness(g, w, h), ...stats(g) };
}

/* ------------------------------------------------------------- comparing */

/** A hash as two 32-bit halves, for fast distance. */
export function hashParts(hex: string): [number, number] {
  return [parseInt(hex.slice(0, 8), 16) >>> 0, parseInt(hex.slice(8, 16), 16) >>> 0];
}

function popcount(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return Math.imul(x, 0x01010101) >>> 24;
}

/** How many of the 64 bits differ (0 = the same picture, ≤ 10 = near-identical). */
export function hamming(a: [number, number], b: [number, number]): number {
  return popcount((a[0] ^ b[0]) >>> 0) + popcount((a[1] ^ b[1]) >>> 0);
}
