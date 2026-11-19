import type { Photo } from '../types';

/*
 * The order of a list screen (screenshots, large files, Live Photos, failed
 * shots, unimportant photos, a category, photos from apps): chosen in the
 * sort menu at the top right, remembered per screen (AppState.sort). A review
 * started from the list goes through it in the same order.
 */
export type SortKey = 'newest' | 'oldest' | 'largest';
export const SORT_KEYS: SortKey[] = ['newest', 'oldest', 'largest'];
export const isSortKey = (v: unknown): v is SortKey => typeof v === 'string' && (SORT_KEYS as string[]).includes(v);

/** The screens with a sort menu (keys of AppState.sort) and the order each starts with. */
export const SORT_DEFAULT = {
  screenshots: 'newest',
  large: 'largest',
  live: 'newest',
  failed: 'newest',
  utility: 'newest',
  category: 'newest',
  album: 'newest',
  apps: 'newest',
  month: 'oldest',
} as const satisfies Record<string, SortKey>;
export type SortScreen = keyof typeof SORT_DEFAULT;

/** A sorted copy; ties go by time (newest first), then id, so the order is stable. */
export function sortPhotos(list: Photo[], key: SortKey): Photo[] {
  const byTime = (a: Photo, b: Photo) => b.t - a.t || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const cmp = key === 'oldest' ? (a: Photo, b: Photo) => -byTime(a, b)
    : key === 'largest' ? (a: Photo, b: Photo) => b.bytes - a.bytes || byTime(a, b)
      : byTime;
  return [...list].sort(cmp);
}

/** The screen's order: the user's choice, else its default. */
export const sortFor = (chosen: Partial<Record<string, SortKey>>, screen: SortScreen): SortKey => chosen[screen] ?? SORT_DEFAULT[screen];
