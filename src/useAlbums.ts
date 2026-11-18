import { useEffect, useMemo, useState } from 'react';
import type { Photo } from './types';
import type { useAppStore } from './store';
import { PhotoLibrary, type AlbumInfo } from './native/photoLibrary';
import type { AlbumTarget } from './components/AlbumPickSheet';
import type { ReviewOutcome } from './components/ReviewView';
import { type Strings, fmt, plural } from './translations';
import { folderName } from './logic/naming';
import { isNewAlbum } from './logic/review';
import { isAndroid } from './platform';
import { notifySuccess } from './ui/haptics';

/*
 * The phone's albums (Android: folders), split out of App.tsx on 18 November
 * 2026: the list, asked when a review opens or *Ordnen* shows them; the chips
 * under a review's photo; the end screen filing photos into albums in one go;
 * each album's members for its cover; and photos picked for an album.
 * Filing anything sets the list back to null, so it is asked again.
 */
export function useAlbums({ t, store, show, recent, byId, want }: {
  t: Strings;
  store: ReturnType<typeof useAppStore>;
  show: (label: string) => void;
  /** The albums used last (AppState.recentAlbums), first among the chips. */
  recent: string[];
  byId: Map<string, Photo>;
  /** *Ordnen* (or an album, a category) is open: the list and the members are wanted. */
  want: boolean;
}) {
  // The chips: the albums (iPhone) / folders (Android), the last used first, then by name. Asked when a review opens.
  const [albumList, setAlbumList] = useState<AlbumInfo[] | null>(null);
  const chips = useMemo(() => {
    
    const rank = (id: string) => { const i = recent.indexOf(id); return i === -1 ? Infinity : i; };
    return (albumList ?? []).slice().sort((a, b) => rank(a.id) - rank(b.id) || a.title.localeCompare(b.title, t.locale))
      .map(a => ({ id: a.id, title: a.title }));
  }, [albumList, recent, t.locale]);
  /** The end screen's albums: one native call for all of them (Android: one dialog). True when done (or nothing to do). */
  const fileAlbums = async (plan: ReviewOutcome['albums']): Promise<boolean> => {
    if (!plan.length) return true;
    try {
      const r = await PhotoLibrary.addToAlbums({
        groups: plan.map(a => (isNewAlbum(a.album) ? { title: a.album.slice(4), ids: a.ids } : { albumId: a.album, ids: a.ids })),
      });
      if (r.cancelled) { show(t.filedCancelled); return false; }
      store.useAlbums(plan.map(a => a.album).filter(a => !isNewAlbum(a)));
      setAlbumList(null);
      if (isAndroid()) store.startScan();
      notifySuccess();
      show(fmt(t.filedDone, { photos: plural(t, 'photos', r.done) }));
      return true;
    } catch {
      show(t.filedFailed);
      return false;
    }
  };

  // The albums of the phone for Ordnen, asked while it (or an album) is open; each album's members once, for
  // its cover and its screen. Filing anything sets the list back to null, so both are asked again.
  const [albumMembers, setAlbumMembers] = useState<Record<string, string[]> | null>(null);
  useEffect(() => {
    if (!want || albumList) return;
    void PhotoLibrary.listAlbums().then(r => setAlbumList(r.albums)).catch(() => setAlbumList([]));
  }, [want, albumList]);
  useEffect(() => {
    setAlbumMembers(null);
    if (!albumList?.length) return;
    let live = true;
    void (async () => {
      const out: Record<string, string[]> = {};
      for (const a of albumList.filter(x => x.count > 0)) {
        out[a.id] = await PhotoLibrary.albumMembers({ ids: [a.id] }).then(r => r.ids).catch(() => []);
        if (!live) return;
      }
      setAlbumMembers(out);
    })();
    return () => { live = false; };
  }, [albumList]);
  const organizeAlbums = useMemo(() => {
    if (!albumList) return null;
    
    const rank = (id: string) => { const i = recent.indexOf(id); return i === -1 ? Infinity : i; };
    const newest = (ids: string[] | undefined) => {
      let best: Photo | undefined;
      for (const id of ids ?? []) { const p = byId.get(id); if (p && (!best || p.t > best.t)) best = p; }
      return best?.id;
    };
    return albumList.filter(a => a.count > 0)
      .sort((a, b) => rank(a.id) - rank(b.id) || b.count - a.count || a.title.localeCompare(b.title, t.locale))
      .map(a => ({ id: a.id, title: a.title, count: a.count, cover: newest(albumMembers?.[a.id]) }));
  }, [albumList, albumMembers, recent, byId, t.locale]);

  // Photos picked for an album (a category's): the sheet that asks which one, then one native call.
  const [albumPick, setAlbumPick] = useState<{ ids: string[]; name?: string } | null>(null);
  const fileInto = async (ids: string[], target: AlbumTarget) => {
    setAlbumPick(null);
    const albumId = 'albumId' in target ? target.albumId : undefined;
    try {
      const r = await PhotoLibrary.addToAlbums({ groups: [albumId ? { albumId, ids } : { title: folderName(target.title), ids }] });
      if (r.cancelled) { show(t.filedCancelled); return; }
      if (albumId) store.useAlbums([albumId]);
      setAlbumList(null);
      if (isAndroid()) store.startScan();
      notifySuccess();
      show(albumId ? fmt(t.filedDone, { photos: plural(t, 'photos', r.done) }) : fmt(t.albumCreated, { name: folderName(target.title) }));
    } catch {
      show(t.filedFailed);
    }
  };

  return { albumList, setAlbumList, chips, fileAlbums, organizeAlbums, albumMembers, albumPick, setAlbumPick, fileInto };
}
