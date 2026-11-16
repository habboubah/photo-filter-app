import { WebPlugin } from '@capacitor/core';
import type { Photo } from '../../types';
import type { Access, PhotoLibraryPlugin, ScanState } from '../photoLibrary';
import facts from './facts.json';

/*
 * The demo library: the PhotoLibrary plugin in a browser. 88 drawn photos
 * (scripts/demo-photos.py) with the facts the native scan would report
 * (scripts/demo-facts.mjs) — a home near Hanau and trips to Amsterdam,
 * Vienna, Paris and Lake Garda, with bursts, blurry shots, screenshots and
 * three copies "saved again from a messenger" (the duplicates). It drives
 * `npm run dev`, the privacy check, the screenshots, the preview video and
 * the App Review rehearsal; native builds never contain it (vite.config.ts).
 *
 * What a real phone would ask is settled here without a dialog: access is
 * granted on request (or set by `?access=limited|denied|full` for a capture),
 * and "deleted" photos are remembered in localStorage until the demo is reset.
 */

const urls = import.meta.glob('./photos/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const urlOf = (id: string) => urls[`./photos/${id}.jpg`] ?? '';

const K = {
  access: 'bildklar-demo-access',
  scanned: 'bildklar-demo-scanned',
  trashed: 'bildklar-demo-trashed',
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
      if (forced === 'notDetermined') { set(K.scanned, null); set(K.trashed, null); }
    }
  }

  private access(): Access {
    const a = get(K.access);
    return (ACCESS as readonly string[]).includes(a ?? '') ? (a as Access) : 'notDetermined';
  }

  private photos(): Photo[] {
    const gone = new Set<string>(JSON.parse(get(K.trashed) ?? '[]'));
    const limited = this.access() === 'limited';
    return (facts as Photo[]).filter(p => !gone.has(p.id) && (!limited || p.t >= LIMITED_FROM));
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

  async trash({ ids, dryRun }: { ids: string[]; dryRun: boolean }) {
    await wait(400);
    if (!dryRun) {
      const gone = new Set<string>(JSON.parse(get(K.trashed) ?? '[]'));
      ids.forEach(id => gone.add(id));
      set(K.trashed, JSON.stringify([...gone]));
    }
    return { trashed: ids, cancelled: false, dryRun };
  }

  async getState() { return { json: get(K.state) }; }
  async setState({ json }: { json: string }) { set(K.state, json); }

  async clearCache() {
    set(K.scanned, null);
    set(K.trashed, null);
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
