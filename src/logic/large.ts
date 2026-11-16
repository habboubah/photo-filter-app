import type { Photo } from '../types';

/*
 * The largest files: photos and videos of at least LARGE_MIN bytes, biggest
 * first, at most LARGE_MAX of them. Nothing here is suggested for deleting —
 * a big file is often a precious one (a birthday video). The list helps to
 * decide, and a video can be made smaller instead (src/native PhotoLibrary
 * compressVideo).
 */
export const LARGE_MIN = 10_000_000;
export const LARGE_MAX = 300;
/** A video worth offering to make smaller: at least this big. */
export const COMPRESS_MIN = 30_000_000;

export type LargeFilter = 'all' | 'videos' | 'photos';

export function findLarge(photos: Photo[], filter: LargeFilter = 'all'): Photo[] {
  return photos
    .filter(p => p.bytes >= LARGE_MIN && (filter === 'all' || (filter === 'videos' ? p.video : !p.video)))
    .sort((a, b) => b.bytes - a.bytes || b.t - a.t)
    .slice(0, LARGE_MAX);
}

/** "1:05", "12:30", "1:02:03". */
export function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** iPhone: the Live Photos, newest first — each can become a plain photo, saving its video part. */
export const LIVE_VIDEO_BYTES = 3_000_000;
export function findLive(photos: Photo[]): Photo[] {
  return photos.filter(p => p.live && !p.video).sort((a, b) => b.t - a.t);
}
