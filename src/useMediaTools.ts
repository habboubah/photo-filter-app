import { useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { Photo } from './types';
import type { useAppStore } from './store';
import { PhotoLibrary } from './native/photoLibrary';
import { type Strings, fmt, plural } from './translations';
import { batches, tally } from './logic/compress';

/*
 * The tools that make room without deleting (split out of App.tsx on
 * 18 November 2026): a video made smaller, photos made smaller in batches,
 * Live Photos turned into stills. Each makes a copy first; the original goes
 * only through the system's dialog afterwards (CLAUDE.md, Safety rules) —
 * `trash` is App.tsx's, the one way to delete. The originals of smaller
 * copies go into *Zum Löschen vorgemerkt* (`aside`, 19 November 2026; before,
 * a sheet asked at once), and from there through the system's dialog.
 */
export function useMediaTools({ t, store, show, trash, aside, onPhotosDone, onVideosDone, onLiveDone }: {
  t: Strings;
  store: ReturnType<typeof useAppStore>;
  show: (label: string) => void;
  trash: (ids: string[]) => Promise<boolean>;
  /** The originals of the smaller copies into *Zum Löschen vorgemerkt*; `saved` is what the copies saved. */
  aside: (ids: string[], saved: number) => void;
  /** Photos were made smaller: their screen can close. */
  onPhotosDone: () => void;
  /** Videos were made smaller: their screen can close. */
  onVideosDone: () => void;
  /** Live Photos became stills and the originals went: their screen can close. */
  onLiveDone: () => void;
}) {
  // Making videos smaller, one after the other: which one, and how far it is.
  const [compressing, setCompressing] = useState<{ id: string; progress: number; done: number; total: number } | null>(null);
  // Photos made smaller, in batches: where the run is (the progress events count within one batch).
  const [photoRun, setPhotoRun] = useState<{ total: number; progress: number } | null>(null);
  const run = useRef({ batch: 0, batches: 1, stop: false });
  useEffect(() => {
    const handle = PhotoLibrary.addListener('compressProgress', e => {
      if (e.id === 'photos') {
        const r = run.current;
        setPhotoRun(p => (p ? { ...p, progress: Math.min(1, (r.batch + e.progress) / r.batches) } : p));
        return;
      }
      setCompressing(c => (c && c.id === e.id ? { ...c, progress: e.progress } : c));
    });
    // Into the background: the run stops after the batch it is in (iOS would pause it anyway).
    const away = CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (!isActive) run.current.stop = true; });
    return () => { for (const h of [handle, away]) void h.then(x => x.remove()).catch(() => {}); };
  }, []);
  const compressPhotos = async (list: Photo[]) => {
    const parts = batches(list.map(p => p.id));
    run.current = { batch: 0, batches: parts.length, stop: false };
    setPhotoRun({ total: list.length, progress: 0 });
    const results: { from: string; to: string; before: number; after: number }[] = [];
    let failed = false;
    try {
      for (const [i, part] of parts.entries()) {
        if (run.current.stop) break;
        run.current.batch = i;
        const r = await PhotoLibrary.compressPhotos({ ids: part });
        results.push(...r.results);
        setPhotoRun(p => (p ? { ...p, progress: (i + 1) / parts.length } : p));
      }
    } catch {
      failed = true;
    } finally {
      setPhotoRun(null);
    }
    const { count, saved } = tally(results);
    if (!count) { show(failed ? t.compressFailed : t.compressPhotosNone); return; }
    store.startScan();
    if (run.current.stop) show(fmt(t.compressPhotosStopped, { photos: plural(t, 'photos', count) }));
    onPhotosDone();
    aside(results.map(r => r.from), saved);
  };
  /** The picked videos made smaller one by one (each a copy next to its original); then the originals into the bin. */
  const compressVideos = async (list: Photo[]) => {
    const from: string[] = [];
    let saved = 0;
    let failed = false;
    for (const [i, p] of list.entries()) {
      setCompressing({ id: p.id, progress: 0, done: i, total: list.length });
      try {
        const r = await PhotoLibrary.compressVideo({ id: p.id });
        if (r.created) { from.push(p.id); saved += Math.max(0, r.before - r.after); }
      } catch {
        failed = true;
      }
    }
    setCompressing(null);
    if (!from.length) { show(failed ? t.compressFailed : t.compressNoGain); return; }
    store.startScan();
    onVideosDone();
    aside(from, saved);
  };

  const [liveConfirm, setLiveConfirm] = useState<Photo[] | null>(null);
  const convertLive = async (list: Photo[]) => {
    setLiveConfirm(null);
    try {
      const r = await PhotoLibrary.convertLive({ ids: list.map(p => p.id) });
      if (!r.converted.length) { show(t.liveFailed); return; }
      store.startScan();
      const ok = await trash(r.converted.map(c => c.from));
      if (!ok) show(t.liveKeptBoth);
      else onLiveDone();
    } catch {
      show(t.liveFailed);
    }
  };

  return { compressing, photoRun, compressPhotos, compressVideos, liveConfirm, setLiveConfirm, convertLive };
}
