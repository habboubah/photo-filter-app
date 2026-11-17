import type { Photo } from '../types';
import { utilityLabel } from './ai';
import { isProtected } from './protect';

const NONE = new Set<string>();

/*
 * Too dark and too bright photos, from what the scan already measures on the
 * grey copy (src/logic/features.ts): mean brightness (`expo`, 0–1), the share
 * of pure black or white pixels (`clip`) and the contrast (standard deviation).
 *
 *   dark:   expo < DARK_EXPO and contrast < DARK_CONTRAST — a pocket shot, the
 *           lens cap. A night photo with lights in it has far more contrast
 *           and stays out.
 *   bright: expo > BRIGHT_EXPO, or more than BRIGHT_CLIP of the pixels pure
 *           black/white while the picture is light (expo > 0.5: a dark photo
 *           clips to black, which is "dark", not "bright").
 *
 * A photo just outside those lines (the BORDER_* values) comes in only when
 * the on-device AI files it as `accidental`. Favourites, photos with faces
 * (iPhone's face scores), screenshots, videos and photos the user kept never
 * come in.
 *
 * PROVISIONAL thresholds (plan of 17 November 2026): tune them on the demo
 * set and Ahmad's test photos, like the AI thresholds (docs/AI.md).
 */
export type ExposureLevel = 'dark' | 'bright';

export const DARK_EXPO = 0.06;
export const DARK_CONTRAST = 12;
export const BRIGHT_EXPO = 0.94;
export const BRIGHT_CLIP = 0.6;
/** Borderline: in only with the AI's `accidental` label. */
export const BORDER_DARK_EXPO = 0.1;
export const BORDER_DARK_CONTRAST = 18;
export const BORDER_BRIGHT_EXPO = 0.9;
export const BORDER_BRIGHT_CLIP = 0.45;

/** How the photo's exposure failed, or null. `kept`: photos the user chose to keep in a review. */
export function exposureLevel(p: Photo, kept?: Set<string>): ExposureLevel | null {
  if (p.expo === undefined || p.shot || p.rec || p.video || (p.faces ?? 0) > 0 || isProtected(p, kept ?? NONE)) return null;
  const contrast = p.contrast ?? 99;
  const clip = p.clip ?? 0;
  if (p.expo < DARK_EXPO && contrast < DARK_CONTRAST) return 'dark';
  if (p.expo > BRIGHT_EXPO || (clip > BRIGHT_CLIP && p.expo > 0.5)) return 'bright';
  const accidental = utilityLabel(p) === 'accidental';
  if (!accidental) return null;
  if (p.expo < BORDER_DARK_EXPO && contrast < BORDER_DARK_CONTRAST) return 'dark';
  if (p.expo > BORDER_BRIGHT_EXPO || (clip > BORDER_BRIGHT_CLIP && p.expo > 0.5)) return 'bright';
  return null;
}

/** The failed exposures worth listing: not in a similar or duplicate group (the group handles those), darkest / brightest first. */
export function findExposure(photos: Photo[], grouped: Set<string>, kept: Set<string>): { dark: Photo[]; bright: Photo[] } {
  const dark: Photo[] = [];
  const bright: Photo[] = [];
  for (const p of photos) {
    if (grouped.has(p.id)) continue;
    const level = exposureLevel(p, kept);
    if (level === 'dark') dark.push(p);
    else if (level === 'bright') bright.push(p);
  }
  dark.sort((a, b) => (a.expo ?? 0) - (b.expo ?? 0));
  bright.sort((a, b) => (b.expo ?? 0) - (a.expo ?? 0));
  return { dark, bright };
}
