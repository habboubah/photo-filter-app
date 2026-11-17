import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { LABELS } from './ai';
import { groupBySource, reviewSource, sourceOf } from './sources';

let n = 0;
const at = (dir: string | undefined, extra: Partial<Photo> = {}): Photo => ({ id: `s${++n}`, t: n, bytes: 1_000_000, w: 1, h: 1, dir, ...extra });

describe('photos from apps', () => {
  it('tells the apps apart by their folder, case-insensitively', () => {
    const cases: [string, string | null][] = [
      ['Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images/', 'whatsapp'],
      ['Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video/', 'whatsapp'],
      ['Pictures/Telegram/', 'telegram'],
      ['Pictures/Signal/', 'signal'],
      ['Pictures/Instagram/', 'instagram'],
      ['Pictures/Messenger/', 'facebook'],
      ['Pictures/Facebook/', 'facebook'],
      ['DCIM/Snapchat/', 'snapchat'],
      ['Download/', 'download'],
      ['Pictures/SomeEditor/', 'other'],
      ['DCIM/Camera/', null],
      ['Pictures/Screenshots/', null],
      ['DCIM/Screenshots/', null],
      ['Movies/Screen recordings/', null],
      ['Pictures/Bildklar/Paris, Mai 2026/', null],
    ];
    for (const [dir, want] of cases) expect(sourceOf({ dir }), dir).toBe(want);
    expect(sourceOf({ dir: undefined })).toBeNull();
    expect(sourceOf({ dir: 'Pictures/Foo/', shot: true })).toBeNull();
  });

  it('groups by app in a fixed order, newest first, with sizes', () => {
    const a = at('Download/');
    const b = at('Pictures/Telegram/');
    const c = at('Pictures/Telegram/');
    const groups = groupBySource([a, b, c, at('DCIM/Camera/')]);
    expect(groups.map(g => [g.source, g.photos.map(p => p.id), g.bytes])).toEqual([
      ['telegram', [c.id, b.id], 2_000_000],
      ['download', [a.id], 1_000_000],
    ]);
  });

  it('suggests deleting only memes, receipts and documents — never a protected one; the rest without a suggestion', () => {
    const scores = (id: string) => LABELS.map(l => (l.id === id ? 0 : -120));
    const meme = at('Pictures/Telegram/', { ai: scores('meme') });
    const receipt = at('Download/', { ai: scores('receipt') });
    const kids = at('Pictures/Telegram/', { ai: scores('kids') });
    const fav = at('Download/', { ai: scores('document'), fav: true });
    const items = reviewSource([meme, receipt, kids, fav], new Set());
    expect(items.map(i => i.suggest)).toEqual(['delete', 'delete', 'none', 'none']);
    expect(reviewSource([meme], new Set([meme.id]))[0].suggest).toBe('none');
  });
});
