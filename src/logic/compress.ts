import type { Photo } from '../types';
import { isProtected } from './protect';

/*
 * "Fotos verkleinern" [Make photos smaller], paid: camera JPEGs and PNGs
 * re-saved as HEIC (iPhone: ImageIO; Android: HeifWriter where the phone has
 * an HEVC encoder, else JPEG at quality 82), typically about half the size,
 * with the same date, place, favourite flag and albums. The original goes to
 * Recently Deleted / the Trash only after the system's dialog.
 *
 * Which photos qualify: JPEG or PNG (scan schema 4's `fmt`), at least
 * COMPRESS_MIN_BYTES, not RAW/ProRAW (`fmt: raw`), not edited (re-saving would
 * bake the edit in), not a Live Photo (the Live Photos screen handles those),
 * not protected. PNG screenshots are their own group.
 *
 * The estimate (PROVISIONAL, like every threshold of the plan): HEIC saves
 * about half of a camera JPEG and 70 % of a PNG. The native side keeps a copy
 * only when it is at least KEEP_MIN_SAVING smaller (CompressPhotos in Swift
 * and Kotlin use the same number).
 */
export const COMPRESS_MIN_BYTES = 1_000_000;
export const SAVING_JPEG = 0.5;
export const SAVING_PNG = 0.7;
/** Provisional: a copy that saves less than this is thrown away (the native side). */
export const KEEP_MIN_SAVING = 0.3;
/** Photos per native call: the work stops cleanly between batches when the app goes to the background. */
export const COMPRESS_BATCH = 20;

export type CompressGroup = 'photos' | 'screenshots';

export function canCompress(p: Photo, guard: Set<string>): boolean {
  return !p.video && !p.live && !p.edited && (p.fmt === 'jpeg' || p.fmt === 'png') && p.bytes >= COMPRESS_MIN_BYTES && !isProtected(p, guard);
}

/** What the photo would save, estimated from its size and format. */
export const estimatedSaving = (p: Photo) => Math.round(p.bytes * (p.fmt === 'png' ? SAVING_PNG : SAVING_JPEG));

/** What a smaller video copy saves, roughly (the copy is about 40 % of the original; src/useMediaTools.ts compressVideos). */
export const SAVING_VIDEO = 0.6;
export const videoSaving = (p: Photo) => Math.round(p.bytes * SAVING_VIDEO);

export interface Compressible {
  photos: Photo[];
  screenshots: Photo[];
  /** "bis zu 3,1 GB": the estimate for all of them. */
  saving: number;
}

/** Every photo that qualifies, the largest saving first, camera photos and PNG screenshots apart. */
export function findCompressible(photos: Photo[], guard: Set<string>): Compressible {
  const list = photos.filter(p => canCompress(p, guard)).sort((a, b) => estimatedSaving(b) - estimatedSaving(a) || b.t - a.t);
  const shots = list.filter(p => p.shot);
  const rest = list.filter(p => !p.shot);
  return { photos: rest, screenshots: shots, saving: list.reduce((s, p) => s + estimatedSaving(p), 0) };
}

/** Ids in batches of COMPRESS_BATCH, in order. */
export function batches<T>(ids: T[], size = COMPRESS_BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/** What a run did: the copies made and the bytes saved (before − after of each kept copy). */
export function tally(results: { before: number; after: number }[]): { count: number; saved: number } {
  return { count: results.length, saved: results.reduce((s, r) => s + Math.max(0, r.before - r.after), 0) };
}
