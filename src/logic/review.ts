import type { Confidence, Group, Photo } from '../types';
import { utilityLabel, type UtilityLabel } from './ai';
import { blurLevel } from './blur';
import { exposureLevel, type ExposureLevel } from './exposure';
import { isProtected } from './protect';
import { type Cos, type Detail, type Trust, blurryTrust, exposureTrust, groupVerdict, screenshotTrust, utilityTrust } from './confidence';

/*
 * A review: photos shown one by one, each with the app's suggestion, swiped
 * to keep, to delete or (swiped up) to decide later. Nothing happens to a
 * photo during a review; the end screen puts the ones marked into "Zum
 * Löschen" (src/logic/bin.ts), from where they are deleted later, through the
 * system's own dialog, into Recently Deleted / the Trash. Gone through from
 * the bin itself, the end screen deletes for real.
 * The ones put off land on the decide-later pile (AppState.later), which is
 * gone through again from home without a suggestion.
 */
export type Decision = 'keep' | 'delete' | 'later';
/** What the app suggests: `none` for the decide-later pile, where the user already hesitated. */
export type Suggestion = 'keep' | 'delete' | 'none';
export type Reason = 'best' | 'original' | 'similar' | 'duplicate' | 'blurry' | 'screenshot' | 'utility' | 'large' | 'trip' | 'later' | 'dark' | 'bright' | 'video' | 'lookalike' | 'bestTake' | 'app' | 'found' | 'bin';

export interface ReviewItem {
  id: string;
  suggest: Suggestion;
  reason: Reason;
  level?: Confidence;
  /** For `utility`: what the on-device AI took the photo for (src/logic/ai.ts). */
  label?: UtilityLabel;
  /** For a suggested delete: how sure the app is (src/logic/confidence.ts). */
  trust?: Trust;
  /** For a group's extra shot: the one reason shown (blurrier, eyes closed, a smaller copy …). */
  detail?: Detail;
}

const extraReason = (g: Group): Reason => (g.kind === 'duplicate' ? 'duplicate' : g.kind === 'lookalike' ? 'lookalike' : 'similar');

/** The verdict on a group's extra shot (src/logic/confidence.ts), or nothing when a photo is missing. */
function extraVerdict(group: Group, id: string, byId: Map<string, Photo>, cos?: Cos): Pick<ReviewItem, 'trust' | 'detail'> {
  const p = byId.get(id);
  const best = byId.get(group.best);
  if (!p || !best) return {};
  const v = groupVerdict(group, p, best, cos?.(id, best.id));
  return v.detail ? { trust: v.trust, detail: v.detail } : { trust: v.trust };
}

/** A similar or duplicate group: the best one (keep), then the others (delete), in time order. `cos`: the vectors' cosine. */
export function reviewGroup(group: Group, kept: Set<string>, byId: Map<string, Photo>, cos?: Cos): ReviewItem[] {
  return group.ids.map(id => {
    const keep = id === group.best || isProtected(byId.get(id) ?? { id }, kept);
    return {
      id,
      suggest: keep ? 'keep' : 'delete',
      reason: id === group.best ? (group.kind === 'similar' ? 'best' : group.kind === 'lookalike' ? 'bestTake' : 'original') : extraReason(group),
      ...(keep ? {} : extraVerdict(group, id, byId, cos)),
    };
  });
}

/** The largest files: nothing suggested — a big file is often a precious one; the reason shows its size. */
export function reviewLarge(photos: Photo[]): ReviewItem[] {
  return photos.map(p => ({ id: p.id, suggest: 'keep', reason: 'large' }));
}

/** Screenshots: all suggested for deleting (the list holds no favourites and none the user kept). */
export function reviewScreenshots(photos: Photo[]): ReviewItem[] {
  return photos.map(p => ({ id: p.id, suggest: 'delete', reason: 'screenshot', trust: screenshotTrust() }));
}

/** Utility photos the on-device AI found (receipts, documents, …): all suggested for deleting, each with its label. */
export function reviewUtility(photos: Photo[]): ReviewItem[] {
  return photos.map(p => ({ id: p.id, suggest: 'delete', reason: 'utility', label: utilityLabel(p) ?? undefined, trust: utilityTrust(p) }));
}

/** Too dark or too bright photos: all suggested for deleting, each with its reason. */
export function reviewExposure(photos: Photo[], level: ExposureLevel): ReviewItem[] {
  return photos.map(p => ({ id: p.id, suggest: 'delete', reason: level, trust: exposureTrust(p) }));
}

/** Blurry photos: all suggested for deleting. */
export function reviewBlurry(photos: Photo[]): ReviewItem[] {
  return photos.map(p => ({ id: p.id, suggest: 'delete', reason: 'blurry', level: blurLevel(p) ?? undefined, trust: blurryTrust(p) }));
}

/** Everything the clean-up card counts: the extra shots of each group, then the blurry ones, the too dark and too bright ones, the old screenshots, then the utility photos — each photo once. */
export function reviewCleanup(
  groups: Group[], blurry: Photo[], kept: Set<string>, byId: Map<string, Photo>, shots: Photo[] = [], utility: Photo[] = [],
  exposure: Photo[] = [], cos?: Cos,
): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const g of groups) {
    for (const id of g.ids) {
      if (id === g.best || isProtected(byId.get(id) ?? { id }, kept)) continue;
      items.push({ id, suggest: 'delete', reason: extraReason(g), ...extraVerdict(g, id, byId, cos) });
    }
  }
  const seen = new Set<string>();
  return [
    ...items, ...reviewBlurry(blurry.filter(p => !isProtected(p, kept))),
    ...exposure.filter(p => !isProtected(p, kept)).map(p => ({ id: p.id, suggest: 'delete' as const, reason: (exposureLevel(p) ?? 'dark') as Reason, trust: exposureTrust(p) })),
    ...reviewScreenshots(shots.filter(p => !isProtected(p, kept))),
    ...reviewUtility(utility.filter(p => !isProtected(p, kept))),
  ].filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/**
 * A run of photos in time order — a trip, a month, this day in earlier years:
 * extra shots, too dark or too bright photos, blurry photos and (when `oldShot` says so) old screenshots
 * and screen recordings suggested for deleting, the rest kept. Videos (months and "On this day"; trips
 * hold photos only): a copy or lookalike of another (its group) → delete, an old screen recording →
 * delete, every other video → keep, its length and size shown.
 */
export function reviewTrip(
  ids: string[], groups: Group[], byId: Map<string, Photo>, kept: Set<string>, oldShot?: (p: Photo) => boolean, cos?: Cos,
): ReviewItem[] {
  const extra = new Map<string, Group>();
  for (const g of groups) for (const id of g.ids) if (id !== g.best) extra.set(id, g);
  return ids.map(id => {
    const p = byId.get(id);
    const level = p ? blurLevel(p) : null;
    const protectedPhoto = isProtected(p ?? { id }, kept);
    const g = extra.get(id);
    if (!protectedPhoto && g) return { id, suggest: 'delete', reason: extraReason(g), ...extraVerdict(g, id, byId, cos) };
    if (!protectedPhoto && (p?.shot || p?.rec) && oldShot?.(p)) return { id, suggest: 'delete', reason: 'screenshot', trust: screenshotTrust() };
    if (p?.video) return { id, suggest: 'keep', reason: 'video' };
    const exposure = p && !protectedPhoto ? exposureLevel(p) : null;
    if (exposure) return { id, suggest: 'delete', reason: exposure, trust: exposureTrust(p!) };
    if (!protectedPhoto && (level === 'high' || level === 'medium')) return { id, suggest: 'delete', reason: 'blurry', level, trust: blurryTrust(p!) };
    return { id, suggest: 'keep', reason: 'trip' };
  });
}

/** Photos found by a search or as look-alikes of one photo: no suggestion — the user decides what they searched for. */
export function reviewFound(ids: string[]): ReviewItem[] {
  return ids.map(id => ({ id, suggest: 'none', reason: 'found' }));
}

/** "Zum Löschen" gone through again: no suggestion — the user already chose to delete each of them once (src/logic/bin.ts). */
export function reviewBin(ids: string[]): ReviewItem[] {
  return ids.map(id => ({ id, suggest: 'none', reason: 'bin' }));
}

/** The decide-later pile: no suggestion — the user already hesitated over each of them once. */
export function reviewLater(ids: string[]): ReviewItem[] {
  return ids.map(id => ({ id, suggest: 'none', reason: 'later' }));
}

/* ------------------------------------------------------ the session itself */

export interface Session {
  items: ReviewItem[];
  index: number;
  decisions: Record<string, Decision>;
  /** For undo: the indexes decided, newest last. */
  history: number[];
  /**
   * Photos filed into an album while swiping (paid): photo id → an album's id
   * (PhotoLibrary.listAlbums) or `new:<title>` for one made in this review.
   * Nothing is written during the review; the end screen does it in one go.
   */
  albums: Record<string, string>;
}

export const startSession = (items: ReviewItem[]): Session => ({ items, index: 0, decisions: {}, history: [], albums: {} });

/** A new album's key in Session.albums. */
export const newAlbumKey = (title: string) => `new:${title.trim()}`;
export const isNewAlbum = (key: string) => key.startsWith('new:');

/**
 * The shown photo filed into an album: kept, and on to the next one. Filed
 * into the album it is already in (after an undo, say), it leaves it and stays.
 */
export function fileTo(s: Session, album: string): Session {
  const item = s.items[s.index];
  if (!item) return s;
  if (s.albums[item.id] === album) {
    const { [item.id]: _gone, ...albums } = s.albums;
    return { ...s, albums };
  }
  return { ...decide(s, 'keep'), albums: { ...s.albums, [item.id]: album } };
}

/** What the end screen writes: each album with its photos (never one marked for deleting), in review order. */
export function albumPlan(s: Session): { album: string; ids: string[] }[] {
  const by = new Map<string, string[]>();
  for (const i of s.items) {
    const album = s.albums[i.id];
    if (!album || s.decisions[i.id] === 'delete' || s.decisions[i.id] === 'later') continue;
    const list = by.get(album);
    if (list) list.push(i.id); else by.set(album, [i.id]);
  }
  return [...by.entries()].map(([album, ids]) => ({ album, ids }));
}

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
  const id = s.items[last].id;
  const { [id]: _gone, ...decisions } = s.decisions;
  const { [id]: _filed, ...albums } = s.albums ?? {};
  return { ...s, index: last, decisions, albums, history: s.history.slice(0, -1) };
}

/** The photos put on the decide-later pile in this session. */
export const laterIds = (s: Session) => s.items.filter(i => s.decisions[i.id] === 'later').map(i => i.id);
/** The photos given a final answer in this session (kept or marked for deleting): they leave the pile. */
export const settledIds = (s: Session) =>
  s.items.filter(i => s.decisions[i.id] === 'keep' || s.decisions[i.id] === 'delete').map(i => i.id);

/** The marked ones, photos and videos apart (the end screen counts videos separately). */
export function deleteSplit(s: Session, byId: Map<string, Photo>): { photos: string[]; videos: string[] } {
  const ids = toDelete(s);
  return { photos: ids.filter(id => !byId.get(id)?.video), videos: ids.filter(id => byId.get(id)?.video) };
}

/** The photos marked for deleting. Undecided ones are kept. */
export const toDelete = (s: Session) => s.items.filter(i => s.decisions[i.id] === 'delete').map(i => i.id);
/** The photos the app suggested deleting that the user kept: remembered, so they are not suggested again. */
export const keptAgainstSuggestion = (s: Session) =>
  s.items.filter(i => i.suggest === 'delete' && s.decisions[i.id] === 'keep').map(i => i.id);
export const isDone = (s: Session) => s.index >= s.items.length;
