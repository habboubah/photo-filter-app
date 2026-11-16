import type { Photo } from '../types';

/*
 * Screenshots (iPhone: PHAssetMediaSubtype.photoScreenshot; Android: a file in
 * a Screenshots folder — the native scan sets `shot`). They are left out of
 * trips, similar groups and the blurry list; here they are a list of their
 * own. The clean-up card counts the ones older than OLD_SHOT_DAYS: a fresh
 * screenshot is usually still needed (a ticket, a code, a route), an old one
 * rarely is. Never a favourite, never one the user kept in a review.
 */
export const OLD_SHOT_DAYS = 30;
const DAY = 24 * 3600_000;

export const isOldShot = (p: Photo, now: number) => now - p.t > OLD_SHOT_DAYS * DAY;

/** Every screenshot that could go, newest first. */
export function findScreenshots(photos: Photo[], kept: Set<string>): Photo[] {
  return photos.filter(p => p.shot && !p.fav && !kept.has(p.id)).sort((a, b) => b.t - a.t);
}

/** The ones the clean-up card counts. */
export const oldShots = (shots: Photo[], now: number) => shots.filter(p => isOldShot(p, now));
