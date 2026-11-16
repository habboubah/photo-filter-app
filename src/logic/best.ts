import type { Photo } from '../types';

/*
 * The best shot of a similar group: the sharpest, well exposed one, with the
 * best face and open eyes where the iPhone could tell (Android scores
 * sharpness and exposure only). A favourite always wins — the user already
 * said which one they like.
 *
 * score = 0.55 · sharpness + 0.20 · exposure [+ 0.15 · face + 0.10 · eyes],
 * each 0–1 within the group, weights taken over the parts every member has.
 * Ties go to more pixels, then to the later shot.
 */
const W = { sharp: 0.55, expo: 0.2, face: 0.15, eyes: 0.1 };

/** 1 for mid-grey, falling to 0 towards black or white, minus clipped highlights and shadows. */
export function exposureScore(p: Photo): number {
  if (p.expo === undefined) return 0.5;
  const off = Math.min(1, Math.abs(p.expo - 0.48) / 0.48);
  return Math.max(0, Math.min(1, 1 - off - 2 * (p.clip ?? 0)));
}

export function rankGroup(photos: Photo[]): Photo[] {
  if (photos.length < 2) return [...photos];
  const fav = photos.find(p => p.fav);
  const maxSharp = Math.max(...photos.map(p => Math.log1p(p.sharp ?? 0)), 1e-9);
  const hasFace = photos.every(p => p.faceQ !== undefined) && photos.some(p => (p.faces ?? 0) > 0);
  const hasEyes = photos.every(p => p.eyes !== undefined) && photos.some(p => (p.faces ?? 0) > 0);
  const total = W.sharp + W.expo + (hasFace ? W.face : 0) + (hasEyes ? W.eyes : 0);
  const score = (p: Photo) => (
    W.sharp * (Math.log1p(p.sharp ?? 0) / maxSharp)
    + W.expo * exposureScore(p)
    + (hasFace ? W.face * (p.faceQ ?? 0) : 0)
    + (hasEyes ? W.eyes * (p.eyes ?? 0) : 0)
  ) / total;
  const ranked = [...photos].sort((a, b) => {
    const d = score(b) - score(a);
    if (Math.abs(d) > 1e-9) return d;
    const px = b.w * b.h - a.w * a.h;
    return px !== 0 ? px : b.t - a.t;
  });
  if (fav) return [fav, ...ranked.filter(p => p !== fav)];
  return ranked;
}

/**
 * The copy to keep of a duplicate group: a favourite, else the one with the
 * most pixels (a messenger copy is smaller than the original), else the
 * sharpest, else the oldest — the original came first.
 */
export function rankDuplicates(photos: Photo[]): Photo[] {
  const ranked = [...photos].sort((a, b) => {
    const px = b.w * b.h - a.w * a.h;
    if (px !== 0) return px;
    const sharp = (b.sharp ?? 0) - (a.sharp ?? 0);
    if (Math.abs(sharp) > 1e-9) return sharp;
    return a.t - b.t;
  });
  const fav = photos.find(p => p.fav);
  return fav ? [fav, ...ranked.filter(p => p !== fav)] : ranked;
}
