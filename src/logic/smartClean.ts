import type { Group, Photo } from '../types';
import { blurLevel } from './blur';

/*
 * Smart Clean: everything the clean-up card counts, by kind, each kind on or
 * off, then one system dialog for all of it. The same rules as the card
 * (src/logic/analyze.ts summarize): never a group's best shot, never a
 * favourite, never a photo the user kept; blurry only when the app is fairly
 * sure (high, medium); screenshots only the old ones (already filtered).
 * Nothing is deleted here — this only lists what the dialog will be asked for.
 */
export type CleanKind = 'similar' | 'duplicates' | 'blurry' | 'screenshots';
export const CLEAN_KINDS: CleanKind[] = ['duplicates', 'similar', 'blurry', 'screenshots'];

export interface CleanPart { kind: CleanKind; ids: string[]; bytes: number }

export function cleanParts(groups: Group[], blurry: Photo[], oldShots: Photo[], kept: Set<string>, byId: Map<string, Photo>): CleanPart[] {
  const parts: Record<CleanKind, CleanPart> = {
    duplicates: { kind: 'duplicates', ids: [], bytes: 0 },
    similar: { kind: 'similar', ids: [], bytes: 0 },
    blurry: { kind: 'blurry', ids: [], bytes: 0 },
    screenshots: { kind: 'screenshots', ids: [], bytes: 0 },
  };
  const seen = new Set<string>();
  const add = (kind: CleanKind, p: Photo | undefined) => {
    if (!p || p.fav || kept.has(p.id) || seen.has(p.id)) return;
    seen.add(p.id);
    parts[kind].ids.push(p.id);
    parts[kind].bytes += p.bytes;
  };
  for (const g of groups) {
    for (const id of g.ids) if (id !== g.best) add(g.kind === 'duplicate' ? 'duplicates' : 'similar', byId.get(id));
  }
  for (const p of blurry) {
    const level = blurLevel(p);
    if (level === 'high' || level === 'medium') add('blurry', p);
  }
  for (const p of oldShots) add('screenshots', p);
  return CLEAN_KINDS.map(k => parts[k]);
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
