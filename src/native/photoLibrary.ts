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
  /** "list": reading what the library holds; "analyse": looking at each new or changed photo; "ai": the on-device AI's pass (docs/AI.md). */
  phase: 'list' | 'analyse' | 'ai';
  done: number;
  total: number;
  /** Of `total`, how many are videos, and how many of those are done (absent from an older native build). */
  videos?: number;
  videosDone?: number;
}

export interface ScanState {
  running: boolean;
  /** Photos in the cache. */
  count: number;
  /** Photos still waiting for their analysis. */
  pending: number;
  /** Photos still waiting for the AI's pass. */
  aiPending?: number;
  /** When the last scan finished, ms, or 0. */
  lastScanAt: number;
}

/** An album the user made (iPhone) or a folder that holds photos (Android), for Settings › Geschützt. */
export interface AlbumInfo {
  /** iPhone: PHAssetCollection.localIdentifier; Android: the folder's RELATIVE_PATH ("DCIM/Camera/"). */
  id: string;
  /** The album's name; on Android the folder's last part ("Camera"). */
  title: string;
  /** Photos and videos in it. */
  count: number;
}

export interface PhotoLibraryPlugin {
  getAccess(): Promise<{ access: Access }>;
  /** Shows the system's permission dialog (only when not asked yet). */
  requestAccess(): Promise<{ access: Access }>;
  /** The system's picker to change which photos the app may see (limited access). */
  addMorePhotos(): Promise<{ access: Access }>;
  /** The app's page in the system settings. */
  openSettings(): Promise<void>;
  /** iPhone only: asks iOS for its own rating prompt (iOS decides whether to show it; at most three times a year). Android has no such call here. */
  requestReview(): Promise<void>;

  /** Starts (or continues) a scan in the background; resolves at once. Progress comes as `scanProgress` events, the end as `scanDone`. */
  startScan(): Promise<void>;
  cancelScan(): Promise<void>;
  getScanState(): Promise<ScanState>;
  /** The cached facts, PAGE rows at a time, oldest first. */
  getFacts(options: { offset: number; limit: number }): Promise<{ rows: Photo[]; total: number }>;
  /**
   * The compact vectors of these photos (src/logic/vectors.ts): 256 int8 in
   * base64 each, for photos (and videos) whose facts carry `vv`. At most PAGE ids per call.
   */
  getVectors(options: { ids: string[] }): Promise<{ rows: { id: string; v: string }[] }>;
  /**
   * Faces for a few photos (a similar group), cached: the iPhone's Vision (faces, the best face's quality, open
   * eyes); Android's YuNet in ONNX Runtime (faces and the best face's sharpness, no eyes — FaceDetector.kt).
   */
  scoreFaces(options: { ids: string[] }): Promise<{ rows: Pick<Photo, 'id' | 'faces' | 'faceQ' | 'eyes'>[] }>;

  /** A JPEG of the photo, at most `size` px on its long side, in the app's cache folder (made on demand). */
  thumbnail(options: { id: string; size: number }): Promise<{ path: string }>;

  /**
   * iPhone: a new album in Photos holding these photos. Android: these photos
   * moved into Pictures/Bildklar/<title>/ after the system asked the user.
   */
  createAlbum(options: { title: string; ids: string[] }): Promise<{ done: number; cancelled: boolean }>;
  /**
   * Plays a video inside the app, over it — never in another app — as a
   * window over the dimmed app, about the size of a large photo, that the user
   * can make bigger (the whole screen) and smaller again (`biggerLabel` /
   * `smallerLabel` name that button): iPhone AVPlayerViewController inside the
   * window, with its own controls (from the phone only — an iCloud-only video
   * rejects with code `CLOUD`); Android a VideoView with the system's
   * controls, closed with Back, a tap beside it or its close button (`closeLabel` is that
   * button's label for TalkBack). Android resolves when the player closes and
   * rejects if the phone can't play the file.
   */
  preview(options: { id: string; closeLabel?: string; biggerLabel?: string; smallerLabel?: string }): Promise<void>;
  /**
   * Where a video can be played inside the page, in the place its picture is
   * shown (`<PlayOver>`): Android its content:// URI, iPhone a copy in the
   * app's temporary folder (the last one is cleared; from the phone only — an
   * iCloud-only video rejects with code `CLOUD`). Load it through `fileUrl()`.
   * Nothing is changed; when this fails the app falls back to `preview`.
   */
  videoFile(options: { id: string }): Promise<{ path: string }>;
  /** iPhone: the user's own albums (not smart albums, not shared ones). Android: every folder that holds photos or videos. */
  listAlbums(): Promise<{ albums: AlbumInfo[] }>;
  /** The photo ids in these albums / folders (asked once per load, for the protected albums only). */
  albumMembers(options: { ids: string[] }): Promise<{ ids: string[] }>;
  /**
   * Photos filed into albums while swiping, all in one go. iPhone: added to
   * the album (`albumId`) or a new one (`title`) — adding only links a photo,
   * nothing moves, and iOS asks nothing. Android: an album is a folder, so the
   * photos move there (`albumId` is its RELATIVE_PATH; a new one is
   * Pictures/<title>/) after one createWriteRequest dialog for all of them.
   */
  addToAlbums(options: { groups: { albumId?: string; title?: string; ids: string[] }[] }): Promise<{ done: number; cancelled: boolean }>;
  /** Moves photos to Recently Deleted (iPhone) / the Trash (Android) after the system's own dialog. Never deletes for good. */
  trash(options: { ids: string[] }): Promise<{ trashed: string[]; cancelled: boolean }>;

  /** The user's decisions (src/logic/state.ts) as JSON, kept in the native database. */
  getState(): Promise<{ json: string | null }>;
  setState(options: { json: string }): Promise<void>;
  /** Removes the scan cache and the thumbnails (Settings › reset). */
  clearCache(): Promise<void>;
  /**
   * Free and total space on the phone, in bytes. iPhone: the volume's
   * capacity for important use (what Settings › General › iPhone Storage
   * shows as free) and its total; Android: StorageStatsManager for the
   * internal storage. Answers total 0 when it cannot tell.
   */
  getStorage(): Promise<{ free: number; total: number }>;
  /**
   * iPhone: each Live Photo becomes a plain photo — a new asset with the same
   * picture (as edited), date, place and favourite flag, added to the same
   * albums. The Live Photos themselves stay until the app asks to move them to
   * Recently Deleted (`trash`, the system's dialog). iCloud-only originals are
   * skipped (never downloaded). Android has no Live Photos: it rejects.
   */
  convertLive(options: { ids: string[] }): Promise<{ converted: { from: string; to: string }[]; skipped: number }>;
  /**
   * A smaller copy of a video (HEVC, at most 1080p) saved next to it with the
   * same date and place; progress as `compressProgress` events. When the copy
   * would not be at least 20 % smaller nothing is saved (`created` null). The
   * original stays until the app asks to trash it.
   */
  compressVideo(options: { id: string }): Promise<{ created: string | null; before: number; after: number }>;
  /**
   * "Fotos verkleinern": each JPEG / PNG re-saved as HEIC (Android without an
   * HEVC encoder: JPEG at quality 82) with its metadata, kept only when at
   * least 30 % smaller, next to the original with the same date, place,
   * favourite flag (and, on the iPhone, albums). Progress as
   * `compressProgress` events with id "photos" (0–1 within the call). The
   * originals stay until the app asks to trash them. Call with at most
   * COMPRESS_BATCH (20) ids.
   */
  compressPhotos(options: { ids: string[] }): Promise<{ results: { from: string; to: string; before: number; after: number }[] }>;
  /**
   * What the home-screen widget shows (iPhone: WidgetKit, through the App
   * Group folder; Android: the app widget): a title and a line in the app's
   * language, and a photo for "On this day". The widget redraws at once.
   * The iPhone's Lock Screen widget also shows `freeable` (bytes that could be
   * freed) and `pct` (the share of the library gone through, 0–100); Android's
   * widget ignores them.
   */
  setWidget(options: { title: string; line: string; photoId?: string; freeable?: number; pct?: number }): Promise<void>;
  /** True in a debug build: the debug badges and the suggestion ledger show there. */
  isDebug(): Promise<{ debug: boolean }>;

  addListener(event: 'scanProgress', fn: (p: ScanProgress) => void): Promise<PluginListenerHandle>;
  addListener(event: 'scanDone', fn: (s: ScanState) => void): Promise<PluginListenerHandle>;
  addListener(event: 'compressProgress', fn: (p: { id: string; progress: number }) => void): Promise<PluginListenerHandle>;
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
