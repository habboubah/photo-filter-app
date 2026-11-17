import { WebPlugin } from '@capacitor/core';
import type { Photo } from '../../types';
import type { Access, PhotoLibraryPlugin, ScanState } from '../photoLibrary';
import facts from './facts.json';

/*
 * The demo library: the PhotoLibrary plugin in a browser. 101 photos and videos —
 * real CC0 photos (scripts/demo-real.py), drawn screenshots and notes (scripts/demo-photos.py) — with the facts the native scan would report
 * (scripts/demo-facts.mjs) — a home near Hanau and trips to Amsterdam,
 * Vienna, Paris and Lake Garda, with bursts, blurry shots, screenshots, three
 * copies "saved again from a messenger" (the duplicates), four videos (one
 * saved twice), a screen recording, Live Photos in Paris and two failed shots
 * (one too dark, one too bright). It drives
 * `npm run dev`, the privacy check, the screenshots, the preview video and
 * the App Review rehearsal; native builds never contain it (vite.config.ts).
 *
 * What a real phone would ask is settled here without a dialog: access is
 * granted on request (or set by `?access=limited|denied|full` for a capture),
 * and "deleted" photos are remembered in localStorage until the demo is reset.
 */

const urls = import.meta.glob('./photos/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
/** A copy the demo made (a still from a Live Photo, a smaller video) shows its original's picture. */
const urlOf = (id: string) => urls[`./photos/${id.split('-')[0]}.jpg`] ?? '';

const K = {
  access: 'bildklar-demo-access',
  scanned: 'bildklar-demo-scanned',
  trashed: 'bildklar-demo-trashed',
  /** Photos the demo made: stills from Live Photos, smaller videos. */
  made: 'bildklar-demo-made',
  owned: 'bildklar-demo-owned',
  state: 'bildklar-state',
  /** Milliseconds per step of a first scan (24 steps): screenshots slow it down to catch it. */
  scanStep: 'bildklar-demo-scan-step',
};
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => {
  try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* storage is unavailable */ }
};
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

const ACCESS = ['notDetermined', 'denied', 'restricted', 'limited', 'full'] as const;
/** In "limited" the demo sees only the photos of the last trip — as if just those were picked. */
const LIMITED_FROM = Date.UTC(2026, 6, 1);

export class DemoLibrary extends WebPlugin implements PhotoLibraryPlugin {
  private running = false;

  constructor() {
    super();
    const forced = new URLSearchParams(location.search).get('access');
    if (forced && (ACCESS as readonly string[]).includes(forced)) {
      set(K.access, forced);
      if (forced === 'notDetermined') { set(K.scanned, null); set(K.trashed, null); set(K.made, null); }
    }
  }

  private access(): Access {
    const a = get(K.access);
    return (ACCESS as readonly string[]).includes(a ?? '') ? (a as Access) : 'notDetermined';
  }

  private photos(): Photo[] {
    const gone = new Set<string>(JSON.parse(get(K.trashed) ?? '[]'));
    const limited = this.access() === 'limited';
    const made: Photo[] = JSON.parse(get(K.made) ?? '[]');
    return [...(facts as Photo[]), ...made]
      .filter(p => !gone.has(p.id) && (!limited || p.t >= LIMITED_FROM))
      .sort((a, b) => a.t - b.t || (a.id < b.id ? -1 : 1));
  }

  private remember(p: Photo) {
    const made: Photo[] = JSON.parse(get(K.made) ?? '[]');
    set(K.made, JSON.stringify([...made.filter(x => x.id !== p.id), p]));
  }

  async getAccess() { return { access: this.access() }; }

  async requestAccess() {
    if (this.access() === 'notDetermined') set(K.access, 'full');
    return { access: this.access() };
  }

  async addMorePhotos() {
    set(K.access, 'full');
    return { access: this.access() };
  }

  async openSettings() { /* nothing to open in a browser */ }

  async getScanState(): Promise<ScanState> {
    const scanned = get(K.scanned) === '1';
    return { running: this.running, count: scanned ? this.photos().length : 0, pending: 0, lastScanAt: scanned ? Date.now() - 3600_000 : 0 };
  }

  async startScan() {
    if (this.running) return;
    this.running = true;
    void (async () => {
      const total = (facts as Photo[]).length;
      const first = get(K.scanned) !== '1';
      // A first scan takes a moment, so its progress can be seen (and captured); a rescan is quick.
      const steps = first ? 24 : 4;
      const stepMs = first ? Number(get(K.scanStep)) || 110 : 60;
      for (let i = 1; i <= steps; i++) {
        await wait(stepMs);
        // Like the native scan: a rescan only lists the library (nothing new to analyse).
        const phase = first && i > steps / 4 ? 'analyse' : 'list';
        this.notifyListeners('scanProgress', { phase, done: Math.round((i / steps) * total), total });
      }
      set(K.scanned, '1');
      this.running = false;
      this.notifyListeners('scanDone', await this.getScanState());
    })();
  }

  async cancelScan() { this.running = false; }

  async getFacts({ offset, limit }: { offset: number; limit: number }) {
    const all = get(K.scanned) === '1' ? this.photos() : [];
    return { rows: all.slice(offset, offset + limit), total: all.length };
  }

  async scoreFaces() { return { rows: [] }; }

  async thumbnail({ id }: { id: string; size: number }) { return { path: urlOf(id) }; }

  async createAlbum({ ids, dryRun }: { title: string; ids: string[]; dryRun: boolean }) {
    await wait(400);
    return { done: ids.length, cancelled: false, dryRun };
  }

  /** No player in a browser: the demo remembers what it was asked to play (the checks look at it). */
  async preview({ id }: { id: string }) { set('bildklar-demo-preview', id); }

  /** Albums the demo made while swiping (remembered like the deleted photos). */
  private madeAlbums(): { id: string; title: string; members: string[] }[] {
    try { return JSON.parse(get('bildklar-demo-albums') ?? '[]'); } catch { return []; }
  }

  async addToAlbums({ groups, dryRun }: { groups: { albumId?: string; title?: string; ids: string[] }[]; dryRun: boolean }) {
    const done = groups.reduce((n, g) => n + g.ids.length, 0);
    if (dryRun) return { done, cancelled: false, dryRun };
    const made = this.madeAlbums();
    for (const g of groups) {
      const id = g.albumId ?? `demo-album-${(g.title ?? 'album').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const album = made.find(a => a.id === id) ?? (() => { const a = { id, title: g.title ?? id, members: [] as string[] }; made.push(a); return a; })();
      album.members = [...new Set([...album.members, ...g.ids])];
    }
    set('bildklar-demo-albums', JSON.stringify(made));
    return { done, cancelled: false, dryRun };
  }

  /** Made-up albums: the family photos at home, the Lake Garda summer, WhatsApp's and Snapchat's, and the ones made while swiping. */
  private albums(): { id: string; title: string; members: string[] }[] {
    const all = this.photos().filter(p => !p.shot && !p.video);
    const near = (p: Photo, lat: number, lon: number) => p.lat !== undefined && Math.abs(p.lat - lat) < 0.1 && Math.abs((p.lon ?? 0) - lon) < 0.1;
    return [
      { id: 'demo-album-family', title: 'Familie', members: all.filter(p => near(p, 50.132, 8.917) && p.expo !== undefined && (p.expo ?? 0) > 0.1 && (p.expo ?? 1) < 0.9).slice(0, 12).map(p => p.id) },
      { id: 'demo-album-garda', title: 'Gardasee 2026', members: all.filter(p => near(p, 45.886, 10.842)).map(p => p.id) },
      // What WhatsApp and Snapchat save into Photos: pictures without a location ("Chats & soziale Medien").
      { id: 'demo-album-whatsapp', title: 'WhatsApp', members: all.filter(p => p.lat === undefined).slice(0, 14).map(p => p.id) },
      { id: 'demo-album-snapchat', title: 'Snapchat', members: all.filter(p => p.lat === undefined).slice(14, 19).map(p => p.id) },
    ].map(a => {
      const extra = this.madeAlbums().find(m => m.id === a.id);
      return extra ? { ...a, members: [...new Set([...a.members, ...extra.members])] } : a;
    }).concat(this.madeAlbums().filter(m => !m.id.startsWith('demo-album-family') && !m.id.startsWith('demo-album-garda')));
  }

  async listAlbums() {
    return { albums: this.albums().map(a => ({ id: a.id, title: a.title, count: a.members.length })) };
  }

  async albumMembers({ ids }: { ids: string[] }) {
    const wanted = new Set(ids);
    return { ids: [...new Set(this.albums().filter(a => wanted.has(a.id)).flatMap(a => a.members))] };
  }

  async trash({ ids, dryRun }: { ids: string[]; dryRun: boolean }) {
    await wait(400);
    if (!dryRun) {
      const gone = new Set<string>(JSON.parse(get(K.trashed) ?? '[]'));
      ids.forEach(id => gone.add(id));
      set(K.trashed, JSON.stringify([...gone]));
    }
    return { trashed: ids, cancelled: false, dryRun };
  }

  async convertLive({ ids, dryRun }: { ids: string[]; dryRun: boolean }) {
    await wait(500);
    const all = new Map(this.photos().map(p => [p.id, p]));
    const converted: { from: string; to: string }[] = [];
    for (const id of ids) {
      const p = all.get(id);
      if (!p?.live) continue;
      const to = `${id}-still`;
      if (!dryRun) this.remember({ ...p, id: to, live: false, bytes: Math.max(500_000, p.bytes - 3_000_000) });
      converted.push({ from: id, to });
    }
    return { converted, skipped: ids.length - converted.length, dryRun };
  }

  async compressVideo({ id, dryRun }: { id: string; dryRun: boolean }) {
    const p = this.photos().find(x => x.id === id);
    if (!p?.video) throw new Error('No video');
    for (let i = 1; i <= 8; i++) {
      await wait(150);
      this.notifyListeners('compressProgress', { id, progress: i / 8 });
    }
    // A video the demo already made smaller would gain nothing.
    if (id.endsWith('-small')) return { created: null, before: p.bytes, after: p.bytes, dryRun };
    const after = Math.round(p.bytes * 0.35);
    const created = `${id}-small`;
    if (!dryRun) this.remember({ ...p, id: created, bytes: after, t: p.t + 1 });
    return { created: dryRun ? null : created, before: p.bytes, after, dryRun };
  }

  /** No home screen in a browser: the widget's content is only kept, for a look in the dev tools. */
  /** Photos made smaller: half a JPEG, 30 % of a PNG, a little wait per photo; the copies show their original's picture. */
  async compressPhotos({ ids, dryRun }: { ids: string[]; dryRun: boolean }) {
    const all = new Map(this.photos().map(p => [p.id, p]));
    const results: { from: string; to: string; before: number; after: number }[] = [];
    for (const [i, id] of ids.entries()) {
      await wait(60);
      this.notifyListeners('compressProgress', { id: 'photos', progress: (i + 1) / ids.length });
      const p = all.get(id);
      if (!p || p.video || p.fmt === 'heic' || id.endsWith('-heic')) continue;
      const after = Math.round(p.bytes * (p.fmt === 'png' ? 0.3 : 0.5));
      const to = `${id}-heic`;
      if (!dryRun) this.remember({ ...p, id: to, bytes: after, fmt: 'heic', t: p.t + 1 });
      results.push({ from: id, to: dryRun ? '' : to, before: p.bytes, after });
    }
    return { results, dryRun };
  }

  async setWidget(options: { title: string; line: string; photoId?: string; freeable?: number; pct?: number }) {
    set('bildklar-demo-widget', JSON.stringify(options));
  }

  async getState() { return { json: get(K.state) }; }
  async setState({ json }: { json: string }) { set(K.state, json); }

  async clearCache() {
    set(K.scanned, null);
    set(K.trashed, null);
    set(K.made, null);
  }

  /** A 128 GB phone that is nearly full; what the demo "deleted" comes back as free space. */
  async getStorage() {
    const gone = new Set<string>(JSON.parse(get(K.trashed) ?? '[]'));
    const freed = (facts as Photo[]).filter(p => gone.has(p.id)).reduce((s, p) => s + p.bytes, 0);
    return { free: 2_400_000_000 + freed, total: 128_000_000_000 };
  }

  async isDebug() { return { debug: import.meta.env.DEV }; }
}

/** The demo's purchase flag, shared with DemoPurchases. */
export const demoOwnedKey = K.owned;
