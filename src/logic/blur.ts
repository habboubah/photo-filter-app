import type { Confidence, Photo } from '../types';

/*
 * Blurry photos, by the sharpness score (the Laplacian's variance on the
 * 512-px grey image, src/logic/features.ts):
 *   below HIGH   → high confidence ("very likely blurry"),
 *   below MEDIUM → medium,
 *   below LOW    → low ("maybe").
 * A photo with little to see (low contrast: fog, a dark room, a white wall)
 * scores low even when it is sharp, so it is moved down one level.
 *
 * The thresholds are a first guess, to be tuned on real libraries: debug
 * builds show each photo's score in the review.
 */
export const HIGH = 12;
export const MEDIUM = 30;
export const LOW = 60;
export const LOW_CONTRAST = 18;

export function blurLevel(p: Photo): Confidence | null {
  if (p.sharp === undefined || p.shot || p.video) return null;
  let level = p.sharp < HIGH ? 2 : p.sharp < MEDIUM ? 1 : p.sharp < LOW ? 0 : -1;
  if ((p.contrast ?? 99) < LOW_CONTRAST) level -= 1;
  return level >= 2 ? 'high' : level === 1 ? 'medium' : level === 0 ? 'low' : null;
}

/** Most certain first, then the blurriest. */
export function sortBlurry(list: Photo[]): Photo[] {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...list].sort((a, b) => rank[blurLevel(a)!] - rank[blurLevel(b)!] || (a.sharp ?? 0) - (b.sharp ?? 0));
}
