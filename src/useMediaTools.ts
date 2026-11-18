import { useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { Photo } from './types';
import type { useAppStore } from './store';
import { PhotoLibrary } from './native/photoLibrary';
import { type Strings, bytes, fmt, plural } from './translations';
import { batches, tally } from './logic/compress';

/*
 * The tools that make room without deleting (split out of App.tsx on
 * 18 November 2026): a video made smaller, photos made smaller in batches,
 * Live Photos turned into stills. Each makes a copy first; the original goes
 * only through the system's dialog afterwards (CLAUDE.md, Safety rules) —
 * `trash` is App.tsx's, the one way to delete.
 */
export function useMediaTools({ t, store, show, trash, onPhotosDone, onLiveDone }: {
  t: Strings;
  store: ReturnType<typeof useAppStore>;
  show: (label: string) => void;
  trash: (ids: string[]) => Promise<boolean>;
  /** Photos were made smaller: their screen can close (the question about the originals follows). */
  onPhotosDone: () => void;
  /** Live Photos became stills and the originals went: their screen can close. */
  onLiveDone: () => void;
}) {
  // Making a video smaller: progress while it runs, then the question whether the original may go.
  const [compressing, setCompressing] = useState<{ id: string; progress: number } | null>(null);
  const [afterCompress, setAfterCompress] = useState<{ id: string; before: number; after: number } | null>(null);
  // Photos made smaller, in batches: where the run is (the progress events count within one batch).
  const [photoRun, setPhotoRun] = useState<{ total: number; progress: number } | null>(null);
  const [afterPhotos, setAfterPhotos] = useState<{ from: string[]; saved: number } | null>(null);
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
        const r = await PhotoLibrary.compressPhotos({ ids: part, dryRun: store.dryRun });
        results.push(...r.results);
        setPhotoRun(p => (p ? { ...p, progress: (i + 1) / parts.length } : p));
      }
    } catch {
      failed = true;
    } finally {
      setPhotoRun(null);
    }
    const { count, saved } = tally(results);
    if (store.dryRun) { show(fmt(t.dryRunCompressPhotos, { photos: plural(t, 'photos', count), size: bytes(t, saved) })); return; }
    if (!count) { show(failed ? t.compressFailed : t.compressPhotosNone); return; }
    store.startScan();
    if (run.current.stop) show(fmt(t.compressPhotosStopped, { photos: plural(t, 'photos', count) }));
    onPhotosDone();
    setAfterPhotos({ from: results.map(r => r.from), saved });
  };
  const compress = async (p: Photo) => {
    setCompressing({ id: p.id, progress: 0 });
    try {
      const r = await PhotoLibrary.compressVideo({ id: p.id, dryRun: store.dryRun });
      if (r.dryRun) { show(fmt(t.dryRunCompress, { before: bytes(t, r.before), after: bytes(t, r.after) })); return; }
      if (!r.created) { show(t.compressNoGain); return; }
      store.startScan();
      setAfterCompress({ id: p.id, before: r.before, after: r.after });
    } catch {
      show(t.compressFailed);
    } finally {
      setCompressing(null);
    }
  };

  const [liveConfirm, setLiveConfirm] = useState<Photo[] | null>(null);
  const convertLive = async (list: Photo[]) => {
    setLiveConfirm(null);
    try {
      const r = await PhotoLibrary.convertLive({ ids: list.map(p => p.id), dryRun: store.dryRun });
      if (r.dryRun) { show(fmt(t.dryRunLive, { photos: plural(t, 'photos', r.converted.length) })); return; }
      if (!r.converted.length) { show(t.liveFailed); return; }
      store.startScan();
      const ok = await trash(r.converted.map(c => c.from));
      if (!ok) show(t.liveKeptBoth);
      else onLiveDone();
    } catch {
      show(t.liveFailed);
    }
  };

  return { compressing, afterCompress, setAfterCompress, photoRun, afterPhotos, setAfterPhotos, compressPhotos, compress, liveConfirm, setLiveConfirm, convertLive };
}
