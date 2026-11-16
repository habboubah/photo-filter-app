import type { Confidence, Group, Photo } from '../types';
import { blurLevel } from './blur';

/*
 * A review: photos shown one by one, each with the app's suggestion, swiped
 * to keep or to delete. Nothing happens to a photo during a review; only
 * "Delete N photos" at the end, confirmed in the system's own dialog, moves
 * the ones marked to Recently Deleted / the Trash.
 */
export type Decision = 'keep' | 'delete';
export type Reason = 'best' | 'similar' | 'blurry' | 'trip';

export interface ReviewItem {
  id: string;
  suggest: Decision;
  reason: Reason;
  level?: Confidence;
}

/** A similar group: the best one (keep), then the others (delete), in time order. */
export function reviewGroup(group: Group, kept: Set<string>, byId: Map<string, Photo>): ReviewItem[] {
  return group.ids.map(id => ({
    id,
    suggest: id === group.best || kept.has(id) || byId.get(id)?.fav ? 'keep' : 'delete',
    reason: id === group.best ? 'best' : 'similar',
  }));
}

/** Blurry photos: all suggested for deleting. */
export function reviewBlurry(photos: Photo[]): ReviewItem[] {
  return photos.map(p => ({ id: p.id, suggest: 'delete', reason: 'blurry', level: blurLevel(p) ?? undefined }));
}

/** Everything the clean-up card counts: the extra shots of each group, then the blurry ones. */
export function reviewCleanup(groups: Group[], blurry: Photo[], kept: Set<string>, byId: Map<string, Photo>): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const g of groups) {
    for (const id of g.ids) {
      if (id === g.best || kept.has(id) || byId.get(id)?.fav) continue;
      items.push({ id, suggest: 'delete', reason: 'similar' });
    }
  }
  return [...items, ...reviewBlurry(blurry)];
}

/** A whole trip, in time order: extra shots and blurry photos suggested for deleting, the rest kept. */
export function reviewTrip(ids: string[], groups: Group[], byId: Map<string, Photo>, kept: Set<string>): ReviewItem[] {
  const extra = new Set<string>();
  for (const g of groups) for (const id of g.ids) if (id !== g.best) extra.add(id);
  return ids.map(id => {
    const p = byId.get(id);
    const level = p ? blurLevel(p) : null;
    const protectedPhoto = kept.has(id) || p?.fav;
    if (!protectedPhoto && extra.has(id)) return { id, suggest: 'delete', reason: 'similar' };
    if (!protectedPhoto && (level === 'high' || level === 'medium')) return { id, suggest: 'delete', reason: 'blurry', level };
    return { id, suggest: 'keep', reason: 'trip' };
  });
}

/* ------------------------------------------------------ the session itself */

export interface Session {
  items: ReviewItem[];
  index: number;
  decisions: Record<string, Decision>;
  /** For undo: the indexes decided, newest last. */
  history: number[];
}

export const startSession = (items: ReviewItem[]): Session => ({ items, index: 0, decisions: {}, history: [] });

export function decide(s: Session, decision: Decision): Session {
  const item = s.items[s.index];
  if (!item) return s;
  return {
    ...s,
    index: s.index + 1,
    decisions: { ...s.decisions, [item.id]: decision },
    history: [...s.history, s.index],
  };
}

export function undo(s: Session): Session {
  const last = s.history[s.history.length - 1];
  if (last === undefined) return s;
  const { [s.items[last].id]: _gone, ...decisions } = s.decisions;
  return { ...s, index: last, decisions, history: s.history.slice(0, -1) };
}

/** The photos marked for deleting. Undecided ones are kept. */
export const toDelete = (s: Session) => s.items.filter(i => s.decisions[i.id] === 'delete').map(i => i.id);
/** The photos the app suggested deleting that the user kept: remembered, so they are not suggested again. */
export const keptAgainstSuggestion = (s: Session) =>
  s.items.filter(i => i.suggest === 'delete' && s.decisions[i.id] === 'keep').map(i => i.id);
export const isDone = (s: Session) => s.index >= s.items.length;
