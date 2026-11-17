import type { Photo } from '../types';
import { utilityLabel } from './ai';
import type { ReviewItem } from './review';

/*
 * "Aus Apps" [From apps], Android: photos and videos saved by messengers and
 * other apps, told apart by the folder they lie in (scan schema 4's `dir`,
 * MediaStore RELATIVE_PATH), matched case-insensitively. The iPhone can't
 * tell which app saved a photo (Photos doesn't record it): there this stays
 * off until the test in docs/TODO.md says signals are good enough.
 *
 *   whatsapp   WhatsApp Images, WhatsApp Video, com.whatsapp
 *   telegram   Telegram          signal     Signal
 *   instagram  Instagram         facebook   Messenger, Facebook
 *   snapchat   Snapchat          download   Download
 *   other      any folder outside DCIM/ that isn't one of the above, the
 *              screenshots, screen recordings or the folders Bildklar made
 */
export const SOURCES = ['whatsapp', 'telegram', 'signal', 'instagram', 'facebook', 'snapchat', 'download', 'other'] as const;
export type Source = (typeof SOURCES)[number];

const MATCH: [Source, RegExp][] = [
  ['whatsapp', /whatsapp/],
  ['telegram', /telegram/],
  ['signal', /signal/],
  ['instagram', /instagram/],
  ['facebook', /messenger|facebook/],
  ['snapchat', /snapchat/],
  ['download', /download/],
];

/** Where a photo came from, or null for the camera's own (and for photos without a folder: the iPhone). */
export function sourceOf(p: Pick<Photo, 'dir' | 'shot' | 'rec'>): Source | null {
  if (!p.dir) return null;
  const d = p.dir.toLowerCase();
  for (const [source, re] of MATCH) if (re.test(d)) return source;
  if (p.shot || p.rec || d.startsWith('dcim/') || /screenshot|screen ?record/.test(d) || d.startsWith('pictures/bildklar/')) return null;
  return 'other';
}

export interface SourceGroup { source: Source; photos: Photo[]; bytes: number }

/** The photos from each app, in SOURCES order (empty ones left out), newest first in each. */
export function groupBySource(photos: Photo[]): SourceGroup[] {
  const by = new Map<Source, Photo[]>();
  for (const p of photos) {
    const s = sourceOf(p);
    if (!s) continue;
    const list = by.get(s);
    if (list) list.push(p); else by.set(s, [p]);
  }
  return SOURCES.flatMap(source => {
    const list = by.get(source);
    return list ? [{ source, photos: [...list].sort((a, b) => b.t - a.t), bytes: list.reduce((s, p) => s + p.bytes, 0) }] : [];
  });
}

/** Home shows the tile once the apps' photos hold at least this much. */
export const APPS_TILE_MIN = 100_000_000;

/**
 * A review of an app's photos: memes, receipts, documents and screenshots
 * (the AI's utility labels; protected photos never) suggested for deleting,
 * everything else with no suggestion — a photo of the grandchildren sent by
 * the family is precious.
 */
export function reviewSource(photos: Photo[], guard: Set<string>): ReviewItem[] {
  const junk = new Set(['meme', 'receipt', 'document', 'screen', 'chat']);
  return photos.map(p => {
    const label = utilityLabel(p);
    const protectedPhoto = p.fav || guard.has(p.id);
    if (!protectedPhoto && label && junk.has(label)) return { id: p.id, suggest: 'delete', reason: 'utility', label };
    return { id: p.id, suggest: 'none', reason: 'app' };
  });
}
