import type { Photo } from '../types';
import type { Session } from './review';

/*
 * "Zum Löschen" [To delete]: what the user chose to delete waits here first.
 * Nothing is deleted when a photo is chosen in a review, a group, quick clean
 * or a list: it is put aside (AppState.bin, the decisions file) and leaves
 * every finder, group, trip and count as if it were gone. On the bin's own
 * screen the user puts photos back, goes through them once more, or deletes
 * them — only then through the system's own dialog, into Recently Deleted /
 * the Trash. A photo gone from the library (deleted elsewhere) leaves the bin.
 *
 * The bin is kept newest first: what was put aside last is on top.
 */

/** The photos put aside, joined to the bin (newest first). Returns the same array when nothing changes. */
export function addToBin(bin: string[], ids: string[]): string[] {
  if (!ids.length) return bin;
  const fresh = [...new Set(ids)];
  const added = new Set(fresh);
  const next = [...fresh, ...bin.filter(id => !added.has(id))];
  return next.length === bin.length && next.every((id, i) => id === bin[i]) ? bin : next;
}

/** Photos put back (or deleted for good): they leave the bin. Returns the same array when none was in it. */
export function removeFromBin(bin: string[], ids: string[]): string[] {
  if (!ids.length || !bin.length) return bin;
  const gone = new Set(ids);
  const next = bin.filter(id => !gone.has(id));
  return next.length === bin.length ? bin : next;
}

/** The library without the photos in the bin: what every finder sees. The same array when the bin is empty. */
export function withoutBin(photos: Photo[], bin: string[]): Photo[] {
  if (!bin.length) return photos;
  const aside = new Set(bin);
  return photos.filter(p => !aside.has(p.id));
}

/** The bin's photos as they are in the library, in the bin's order (gone ones left out). */
export function binPhotos(bin: string[], byId: Map<string, Photo>): Photo[] {
  return bin.map(id => byId.get(id)).filter((p): p is Photo => !!p);
}

/**
 * Going through the bin once more: swiped right (or filed into an album) is
 * put back, swiped left is deleted at the end, anything else stays in the bin.
 */
export function binOutcome(s: Session): { restore: string[]; remove: string[] } {
  const restore: string[] = [];
  const remove: string[] = [];
  for (const i of s.items) {
    const d = s.decisions[i.id];
    if (d === 'keep') restore.push(i.id);
    else if (d === 'delete') remove.push(i.id);
  }
  return { restore, remove };
}
