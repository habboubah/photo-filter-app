import type { Photo } from '../types';

/*
 * The best shot of a similar group: the sharpest, well exposed one, with the
 * best face and open eyes where the iPhone could tell, and — on iOS 18+ —
 * the one Vision finds best composed (its aesthetics score, stored by the
 * scan's AI pass: docs/AI.md). Android scores sharpness and exposure only.
 * A favourite always wins — the user already said which one they like.
 *
 * score = 0.55 · sharpness + 0.20 · exposure [+ 0.15 · face + 0.10 · eyes] [+ 0.20 · aesthetics],
 * each 0–1 within the group, weights taken over the parts every member has.
 * Ties go to more pixels, then to the later shot.
 *
 * The weights learn from the user (learnPick, weightsFor): each time they pick
 * another best shot, the app notes what their pick beat its own on. After
 * MIN_PICKS picks the weights lean that way on this phone — each between
 * 0.6× and 1.4× of its default, so one signal never takes over.
 */
export type Signal = 'sharp' | 'expo' | 'face' | 'eyes' | 'aes';
export type Weights = Record<Signal, number>;
export const W: Weights = { sharp: 0.55, expo: 0.2, face: 0.15, eyes: 0.1, aes: 0.2 };
export const SIGNALS: Signal[] = ['sharp', 'expo', 'face', 'eyes', 'aes'];

/** What the user's own picks of a best shot taught the app (AppState.picks). */
export interface Picks { n: number; wins: Partial<Record<Signal, number>> }
export const NO_PICKS: Picks = { n: 0, wins: {} };
/** Picks before the weights move. */
export const MIN_PICKS = 10;

/** The signal values compared for learning: each 0–1 where the photo has it. */
function signals(p: Photo): Partial<Record<Signal, number>> {
  return {
    sharp: p.sharp !== undefined ? Math.log1p(p.sharp) : undefined,
    expo: p.expo !== undefined ? exposureScore(p) : undefined,
    face: p.faceQ, eyes: p.eyes,
    aes: p.aes,
  };
}

/** The picks after the user chose `chosen` over the app's `suggested`: a win for each signal their pick is clearly better on. */
export function learnPick(picks: Picks, chosen: Photo, suggested: Photo): Picks {
  const a = signals(chosen);
  const b = signals(suggested);
  const wins = { ...picks.wins };
  for (const k of SIGNALS) {
    const x = a[k];
    const y = b[k];
    if (x !== undefined && y !== undefined && x > y + 0.02) wins[k] = (wins[k] ?? 0) + 1;
  }
  return { n: picks.n + 1, wins };
}

/** The weights on this phone: the defaults until MIN_PICKS picks, then each leaning 0.6× to 1.4× by how often the user's picks won on it. */
export function weightsFor(picks: Picks | undefined): Weights {
  if (!picks || picks.n < MIN_PICKS) return W;
  const out = { ...W };
  for (const k of SIGNALS) out[k] = W[k] * (0.6 + 0.8 * Math.min(1, (picks.wins[k] ?? 0) / picks.n));
  return out;
}
/** Aesthetics scores closer than this within a group say nothing (Vision's −1 … 1 scale). */
const AES_SPREAD = 0.05;

/** 1 for mid-grey, falling to 0 towards black or white, minus clipped highlights and shadows. */
export function exposureScore(p: Photo): number {
  if (p.expo === undefined) return 0.5;
  const off = Math.min(1, Math.abs(p.expo - 0.48) / 0.48);
  return Math.max(0, Math.min(1, 1 - off - 2 * (p.clip ?? 0)));
}

export function rankGroup(photos: Photo[], weights: Weights = W): Photo[] {
  if (photos.length < 2) return [...photos];
  const fav = photos.find(p => p.fav);
  const maxSharp = Math.max(...photos.map(p => Math.log1p(p.sharp ?? 0)), 1e-9);
  const hasFace = photos.every(p => p.faceQ !== undefined) && photos.some(p => (p.faces ?? 0) > 0);
  const hasEyes = photos.every(p => p.eyes !== undefined) && photos.some(p => (p.faces ?? 0) > 0);
  const aes = photos.map(p => p.aes).filter((a): a is number => a !== undefined);
  const aesMin = Math.min(...aes);
  const aesMax = Math.max(...aes);
  const hasAes = aes.length === photos.length && aesMax - aesMin >= AES_SPREAD;
  const w = weights;
  const total = w.sharp + w.expo + (hasFace ? w.face : 0) + (hasEyes ? w.eyes : 0) + (hasAes ? w.aes : 0);
  const score = (p: Photo) => (
    w.sharp * (Math.log1p(p.sharp ?? 0) / maxSharp)
    + w.expo * exposureScore(p)
    + (hasFace ? w.face * (p.faceQ ?? 0) : 0)
    + (hasEyes ? w.eyes * (p.eyes ?? 0) : 0)
    + (hasAes ? w.aes * ((p.aes! - aesMin) / (aesMax - aesMin)) : 0)
  ) / total;
  const ranked = [...photos].sort((a, b) => {
    const d = score(b) - score(a);
    if (Math.abs(d) > 1e-9) return d;
    const px = b.w * b.h - a.w * a.h;
    return px !== 0 ? px : b.t - a.t;
  });
  if (fav) return [fav, ...ranked.filter(p => p !== fav)];
  // A burst's pick (made by the user, or suggested by Photos) comes next to a favourite.
  const pick = ranked.find(p => p.pick);
  if (pick) return [pick, ...ranked.filter(p => p !== pick)];
  return ranked;
}

/**
 * The copy to keep of a duplicate group: a favourite (or a protected photo,
 * src/logic/analyze.ts buildGroups), else the one the user edited (they put
 * work into it — deleting the edited copy is the regret photo cleaners are
 * known for), else one that knows where it was taken (a messenger copy loses
 * the place), else the one with the most pixels (a messenger copy is smaller
 * than the original), else the sharpest, else the oldest — the original came first.
 */
export function rankDuplicates(photos: Photo[]): Photo[] {
  const ranked = [...photos].sort((a, b) => {
    if (!!a.edited !== !!b.edited) return a.edited ? -1 : 1;
    const placed = (p: Photo) => p.lat !== undefined;
    if (placed(a) !== placed(b)) return placed(a) ? -1 : 1;
    const px = b.w * b.h - a.w * a.h;
    if (px !== 0) return px;
    const sharp = (b.sharp ?? 0) - (a.sharp ?? 0);
    if (Math.abs(sharp) > 1e-9) return sharp;
    return a.t - b.t;
  });
  const fav = photos.find(p => p.fav);
  return fav ? [fav, ...ranked.filter(p => p !== fav)] : ranked;
}
