import type { Group, Photo } from '../types';
import { hamming, hashParts } from './features';
import { exposureScore } from './best';
import { blurLevel } from './blur';
import { UTILITY_SURE_MARGIN, utilityLabel, utilityMargin, type UtilityLabel } from './ai';
import { DUP_DISTANCE } from './similar';

/*
 * How sure the app is about each suggestion, and the one reason it shows for
 * it (docs/features.md, "Sicher, wahrscheinlich, prüfen"). Photo cleaners are
 * judged on two things: whether a "similar" group really is one shot, and
 * whether the photo they would delete really is the worse one — and their
 * users complain they can't see why something was suggested. So:
 *
 * - sure: the app would bet on it — an exact copy, a smaller copy of a photo
 *   that is still there, the frames of a burst the user (or Photos) did not
 *   pick. Quick clean deletes only sure and likely photos in one go;
 * - likely: good reasons — near-identical to the best shot (the AI's vectors
 *   agree) and worse on something the app measures, a clearly blurry photo,
 *   an old screenshot, a clear utility photo;
 * - check: the app is unsure — the user should look (lookalike videos, an
 *   edited copy only the vectors found, a photo just over a bar). Never in
 *   quick clean; only in a review.
 *
 * The thresholds here sit on top of the finders' own (src/logic/similar.ts,
 * blur.ts, exposure.ts, ai.ts); like those they are provisional.
 */
export type Trust = 'sure' | 'likely' | 'check';
export const TRUSTS: Trust[] = ['sure', 'likely', 'check'];

/** The one reason shown for a photo of a group that the app would delete. */
export type Detail = 'exactCopy' | 'smallerCopy' | 'alteredCopy' | 'burstExtra' | 'blurrier' | 'eyesClosed' | 'worseLight' | 'nearlySame';

export interface Verdict { trust: Trust; detail?: Detail }

/** Two photos' vectors' cosine, when both have one (src/logic/vectors.ts Vectors.cos). */
export type Cos = (a: string, b: string) => number | undefined;

/** A similar photo this alike to the best shot (the vectors' cosine) is "likely" on its own. */
export const LIKELY_COS = 0.95;
/** …or, when it is worse on something measured (blurrier, eyes closed), this alike. */
export const WORSE_COS = 0.9;
/** "Nearly the same" when this alike and worse on nothing measured. */
export const SAME_COS = 0.97;
/** Without vectors: hashes this close make a similar photo "likely". */
export const LIKELY_DISTANCE = 4;
/** Blurrier: less than this share of the best shot's sharpness. */
export const BLURRIER = 0.5;
/** Worse light: the exposure score (src/logic/best.ts) this much below the best shot's. */
export const WORSE_LIGHT = 0.25;

const px = (p: Photo) => p.w * p.h;
const distance = (a: Photo, b: Photo) => (a.hash && b.hash ? hamming(hashParts(a.hash), hashParts(b.hash)) : 64);

/**
 * The verdict on one photo of a group that is not the one to keep. `cos`:
 * the two photos' vectors' cosine, when both have one (src/logic/vectors.ts).
 */
export function groupVerdict(g: Pick<Group, 'kind' | 'weak'>, p: Photo, best: Photo, cos?: number): Verdict {
  if (g.kind === 'lookalike') return { trust: 'check' };
  const d = distance(p, best);
  if (g.kind === 'duplicate') {
    if (d <= 1 && p.w === best.w && p.h === best.h) return { trust: 'sure', detail: 'exactCopy' };
    if (d <= DUP_DISTANCE && px(p) < px(best)) return { trust: 'sure', detail: 'smallerCopy' };
    if (g.weak && d > DUP_DISTANCE) return { trust: 'check', detail: 'alteredCopy' };
    return { trust: 'likely', detail: px(p) < px(best) ? 'smallerCopy' : 'exactCopy' };
  }
  if (p.burst && p.burst === best.burst && best.pick && !p.pick) return { trust: 'sure', detail: 'burstExtra' };
  let detail: Detail | undefined;
  if (p.eyes !== undefined && best.eyes !== undefined && p.eyes < 0.35 && best.eyes >= 0.6) detail = 'eyesClosed';
  else if (p.sharp !== undefined && best.sharp !== undefined && p.sharp < BLURRIER * best.sharp) detail = 'blurrier';
  else if (exposureScore(best) - exposureScore(p) > WORSE_LIGHT) detail = 'worseLight';
  else if (cos !== undefined && cos >= SAME_COS) detail = 'nearlySame';
  const worse = detail === 'eyesClosed' || detail === 'blurrier';
  const trust: Trust = cos !== undefined
    ? (cos >= LIKELY_COS || (worse && cos >= WORSE_COS) ? 'likely' : 'check')
    : (d <= LIKELY_DISTANCE ? 'likely' : 'check');
  return { trust, detail };
}

/** A blurry photo: likely when the app is very sure it is blurry, else one to check. */
export const blurryTrust = (p: Photo): Trust => (blurLevel(p) === 'high' ? 'likely' : 'check');

/** A too dark or too bright photo: likely when the AI also calls it an accidental shot, else one to check. */
export const exposureTrust = (p: Photo): Trust => (utilityLabel(p) === 'accidental' ? 'likely' : 'check');

/** An old screenshot: likely (it was kept for a while and never favourited). */
export const screenshotTrust = (): Trust => 'likely';

/** A utility photo: likely when its label clears the bar well, else one to check. */
export function utilityTrust(p: Photo, strict?: Partial<Record<UtilityLabel, number>>): Trust {
  const m = utilityMargin(p, strict);
  return m && m.over >= UTILITY_SURE_MARGIN ? 'likely' : 'check';
}

/** One level less sure (the user kept many of this kind of suggestion on this phone: src/logic/ledger.ts). */
export const lessSure = (t: Trust): Trust => (t === 'sure' ? 'likely' : 'check');

/** Quick clean takes these in one go; the rest only in a review. */
export const oneTap = (t: Trust | undefined): boolean => t === 'sure' || t === 'likely';
