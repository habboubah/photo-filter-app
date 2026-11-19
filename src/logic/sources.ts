import type { Photo } from '../types';
import { utilityLabel } from './ai';
import type { ReviewItem } from './review';

/*
 * "Chats & soziale Medien" [Chats & social media]: photos and videos saved by
 * messengers and social apps, one group per app.
 *
 * Android tells them apart by the folder they lie in (scan schema 4's `dir`,
 * MediaStore RELATIVE_PATH). The iPhone records no source app, but these
 * apps save into an album of their own name in Photos (WhatsApp, Telegram,
 * Instagram, Snapchat …): there the photos of those albums are the app's
 * (`sourceOfAlbum`, store.ts asks for their members). Matched
 * case-insensitively:
 *
 *   whatsapp   WhatsApp Images, WhatsApp Video, com.whatsapp
 *   telegram   Telegram          signal     Signal
 *   instagram  Instagram         facebook   Messenger, Facebook
 *   snapchat   Snapchat          tiktok     TikTok
 *   download   Download (Android)
 *   other      Android: any folder outside DCIM/ that isn't one of the
 *              above, the screenshots, screen recordings or Bildklar's own
 */
export const SOURCES = ['whatsapp', 'telegram', 'signal', 'instagram', 'facebook', 'snapchat', 'tiktok', 'download', 'other'] as const;
export type Source = (typeof SOURCES)[number];

const MATCH: [Source, RegExp][] = [
  ['whatsapp', /whatsapp/],
  ['telegram', /telegram/],
  ['signal', /signal/],
  ['instagram', /instagram/],
  ['facebook', /messenger|facebook/],
  ['snapchat', /snapchat/],
  ['tiktok', /tiktok/],
  ['download', /download/],
];

/** The chat and social apps (the sources an iPhone album can stand for). */
const APP_SOURCES = new Set<Source>(['whatsapp', 'telegram', 'signal', 'instagram', 'facebook', 'snapchat', 'tiktok']);

/** iPhone: the app an album of the user's stands for, by its name ("WhatsApp", "Snapchat"), or null. */
export function sourceOfAlbum(title: string): Source | null {
  const n = title.toLowerCase();
  for (const [source, re] of MATCH) if (APP_SOURCES.has(source) && re.test(n)) return source;
  return null;
}

/** Where a photo came from, or null for the camera's own (and for photos without a folder: the iPhone). */
export function sourceOf(p: Pick<Photo, 'dir' | 'shot' | 'rec'>): Source | null {
  if (!p.dir) return null;
  const d = p.dir.toLowerCase();
  for (const [source, re] of MATCH) if (re.test(d)) return source;
  if (p.shot || p.rec || d.startsWith('dcim/') || /screenshot|screen ?record/.test(d) || d.startsWith('pictures/bildklar/')) return null;
  return 'other';
}

/** The name shown for a source: the apps by their own names, the two catch-alls in the user's language. */
export function sourceName(source: Source, words: { download: string; other: string }): string {
  const names: Record<Source, string> = {
    whatsapp: 'WhatsApp', telegram: 'Telegram', signal: 'Signal', instagram: 'Instagram', facebook: 'Messenger',
    snapchat: 'Snapchat', tiktok: 'TikTok', download: words.download, other: words.other,
  };
  return names[source];
}

export interface SourceGroup { source: Source; photos: Photo[]; bytes: number }

/**
 * The photos from each app, in SOURCES order (empty ones left out), newest
 * first in each. `fromAlbums` (iPhone): photo id → the app whose album holds it.
 */
export function groupBySource(photos: Photo[], fromAlbums?: Map<string, Source>): SourceGroup[] {
  const by = new Map<Source, Photo[]>();
  for (const p of photos) {
    const s = fromAlbums?.get(p.id) ?? sourceOf(p);
    if (!s) continue;
    const list = by.get(s);
    if (list) list.push(p); else by.set(s, [p]);
  }
  return SOURCES.flatMap(source => {
    const list = by.get(source);
    return list ? [{ source, photos: [...list].sort((a, b) => b.t - a.t), bytes: list.reduce((s, p) => s + p.bytes, 0) }] : [];
  });
}

/** Home shows the row once there is anything from a chat or social app. */
export const APPS_TILE_MIN = 1;

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
