import type { Group, Photo } from '../types';
import { blurLevel } from './blur';
import { isProtected } from './protect';
import { type Cos, type Trust, blurryTrust, exposureTrust, groupVerdict, oneTap, screenshotTrust } from './confidence';

/*
 * Smart Clean: everything the clean-up card counts, by kind, each kind on or
 * off, then one system dialog for all of it. The same rules as the card
 * (src/logic/analyze.ts summarize): never a group's best shot, never a
 * favourite, never a photo the user kept; blurry only when the app is fairly
 * sure (high, medium); screenshots only the old ones (already filtered).
 * Nothing is deleted here — this only lists what the dialog will be asked for.
 *
 * Only what the app is sure about goes in one tap (src/logic/confidence.ts:
 * sure and likely). The photos to check — an edited copy only the AI found, a
 * similar shot the vectors are not sure of, a borderline blurry or dark one —
 * are kept apart (`check`): the screen offers them as a review.
 */
export type CleanKind = 'similar' | 'duplicates' | 'blurry' | 'exposure' | 'screenshots';
export const CLEAN_KINDS: CleanKind[] = ['duplicates', 'similar', 'blurry', 'exposure', 'screenshots'];

export interface CleanPart {
  kind: CleanKind;
  /** The photos one tap may delete. */
  ids: string[];
  bytes: number;
  /** The ones to check first (only in a review). */
  check: string[];
}

/** `exposure`: the too dark and too bright photos (src/logic/exposure.ts). `cos`: the vectors' cosine (src/logic/vectors.ts). */
export function cleanParts(
  groups: Group[], blurry: Photo[], oldShots: Photo[], kept: Set<string>, byId: Map<string, Photo>, exposure: Photo[] = [], cos?: Cos,
): CleanPart[] {
  const empty = (kind: CleanKind): CleanPart => ({ kind, ids: [], bytes: 0, check: [] });
  const parts: Record<CleanKind, CleanPart> = {
    duplicates: empty('duplicates'), similar: empty('similar'), blurry: empty('blurry'), exposure: empty('exposure'), screenshots: empty('screenshots'),
  };
  const seen = new Set<string>();
  const add = (kind: CleanKind, p: Photo | undefined, trust: Trust) => {
    if (!p || isProtected(p, kept) || seen.has(p.id)) return;
    seen.add(p.id);
    if (!oneTap(trust)) { parts[kind].check.push(p.id); return; }
    parts[kind].ids.push(p.id);
    parts[kind].bytes += p.bytes;
  };
  for (const g of groups) {
    const best = byId.get(g.best);
    for (const id of g.ids) {
      const p = byId.get(id);
      if (id === g.best || !p || !best) continue;
      add(g.kind === 'similar' ? 'similar' : 'duplicates', p, groupVerdict(g, p, best, cos?.(id, g.best)).trust);
    }
  }
  for (const p of blurry) {
    const level = blurLevel(p);
    if (level === 'high' || level === 'medium') add('blurry', p, blurryTrust(p));
  }
  for (const p of exposure) add('exposure', p, exposureTrust(p));
  for (const p of oldShots) add('screenshots', p, screenshotTrust());
  return CLEAN_KINDS.map(k => parts[k]);
}

/** The photos to check first, of the kinds switched on. */
export function toCheck(parts: CleanPart[], on: Set<CleanKind>): string[] {
  return parts.filter(p => on.has(p.kind)).flatMap(p => p.check);
}

/** The photos of the kinds switched on, and their size. */
export function selection(parts: CleanPart[], on: Set<CleanKind>): { ids: string[]; bytes: number } {
  const ids: string[] = [];
  let bytes = 0;
  for (const part of parts) {
    if (!on.has(part.kind)) continue;
    ids.push(...part.ids);
    bytes += part.bytes;
  }
  return { ids, bytes };
}
