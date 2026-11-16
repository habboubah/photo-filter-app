import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import type { Photo } from '../types';

/*
 * The bridge to our own native plugin PhotoLibrary (PhotoLibraryPlugin.swift
 * in ios/App/App, PhotoLibraryPlugin.kt in android/…/bildklar): permission,
 * the scan and its SQLite cache, thumbnails, albums / folders and moving
 * photos to the trash. The native side does the heavy work off the main
 * thread and only ever hands over facts (src/types.ts Photo) — never image
 * data — in pages of PAGE rows.
 *
 * In a browser the plugin is the demo library (src/native/demo/), built from
 * fixture photos; native builds (`--mode native`) leave it out.
 */

export type Access = 'notDetermined' | 'denied' | 'restricted' | 'limited' | 'full';

export interface ScanProgress {
  /** "list": reading what the library holds; "analyse": looking at each new or changed photo. */
  phase: 'list' | 'analyse';
  done: number;
  total: number;
}

export interface ScanState {
  running: boolean;
  /** Photos in the cache. */
  count: number;
  /** Photos still waiting for their analysis. */
  pending: number;
  /** When the last scan finished, ms, or 0. */
  lastScanAt: number;
}

export interface PhotoLibraryPlugin {
  getAccess(): Promise<{ access: Access }>;
  /** Shows the system's permission dialog (only when not asked yet). */
  requestAccess(): Promise<{ access: Access }>;
  /** The system's picker to change which photos the app may see (limited access). */
  addMorePhotos(): Promise<{ access: Access }>;
  /** The app's page in the system settings. */
  openSettings(): Promise<void>;

  /** Starts (or continues) a scan in the background; resolves at once. Progress comes as `scanProgress` events, the end as `scanDone`. */
  startScan(): Promise<void>;
  cancelScan(): Promise<void>;
  getScanState(): Promise<ScanState>;
  /** The cached facts, PAGE rows at a time, oldest first. */
  getFacts(options: { offset: number; limit: number }): Promise<{ rows: Photo[]; total: number }>;
  /** iPhone only: faces and open eyes for a few photos (a similar group), cached. Android answers with no rows. */
  scoreFaces(options: { ids: string[] }): Promise<{ rows: Pick<Photo, 'id' | 'faces' | 'faceQ' | 'eyes'>[] }>;

  /** A JPEG of the photo, at most `size` px on its long side, in the app's cache folder (made on demand). */
  thumbnail(options: { id: string; size: number }): Promise<{ path: string }>;

  /**
   * iPhone: a new album in Photos holding these photos. Android: these photos
   * moved into Pictures/Bildklar/<title>/ after the system asked the user.
   * With `dryRun` nothing is written; the answer says what would have happened.
   */
  createAlbum(options: { title: string; ids: string[]; dryRun: boolean }): Promise<{ done: number; cancelled: boolean; dryRun: boolean }>;
  /** Moves photos to Recently Deleted (iPhone) / the Trash (Android) after the system's own dialog. Never deletes for good. */
  trash(options: { ids: string[]; dryRun: boolean }): Promise<{ trashed: string[]; cancelled: boolean; dryRun: boolean }>;

  /** The user's decisions (src/logic/state.ts) as JSON, kept in the native database. */
  getState(): Promise<{ json: string | null }>;
  setState(options: { json: string }): Promise<void>;
  /** Removes the scan cache and the thumbnails (Settings › reset). */
  clearCache(): Promise<void>;
  /** True in a debug build: the dry run is on by default there. */
  isDebug(): Promise<{ debug: boolean }>;

  addListener(event: 'scanProgress', fn: (p: ScanProgress) => void): Promise<PluginListenerHandle>;
  addListener(event: 'scanDone', fn: (s: ScanState) => void): Promise<PluginListenerHandle>;
  /** The library changed while the app was open (a photo taken, one deleted elsewhere). */
  addListener(event: 'libraryChanged', fn: () => void): Promise<PluginListenerHandle>;
}

/** Rows per getFacts call: small enough for the bridge, few enough calls for 50,000 photos. */
export const PAGE = 2000;

// One instance, however many calls race for it: Capacitor runs an async web
// loader once per call until the first resolves, which would split listeners
// and calls across several demo libraries.
let demo: Promise<PhotoLibraryPlugin> | null = null;
export const PhotoLibrary = registerPlugin<PhotoLibraryPlugin>('PhotoLibrary', {
  web: () => (__DEMO__
    ? (demo ??= import('./demo/library').then(m => new m.DemoLibrary()))
    : Promise.reject(new Error('No photo library on the web'))),
});

/** Every cached photo, page by page. */
export async function loadAllFacts(onPage?: (done: number, total: number) => void): Promise<Photo[]> {
  const all: Photo[] = [];
  let total = Infinity;
  for (let offset = 0; offset < total; offset += PAGE) {
    const page = await PhotoLibrary.getFacts({ offset, limit: PAGE });
    total = page.total;
    all.push(...page.rows);
    onPage?.(all.length, total);
    if (!page.rows.length) break;
  }
  return all;
}

/** A path from `thumbnail` as something an <img> can load. */
export const fileUrl = (path: string) => (Capacitor.isNativePlatform() ? Capacitor.convertFileSrc(path) : path);
