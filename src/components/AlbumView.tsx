import { useState } from 'react';
import { FolderInput } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { MarkButton, Opened, PickBar, gridPick, usePick } from '../ui/pick';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/**
 * One album of the phone (Android: one folder), from *Ordnen › Alben*: its
 * photos and videos, newest first unless sorted otherwise. A tap opens one
 * large (a video in a sheet); *Auswählen* picks, and the picked ones go to
 * "Zum Löschen vorgemerkt" at once (src/ui/pick.tsx). *Durchgehen* reviews the album one by one. Nothing in
 * the album itself changes here; picked photos can go into another album
 * (Android: be moved into another folder, after the system's dialog). *Chats & soziale Medien* opens one app's
 * photos in it too, so every grid you pick from works the same.
 */
export function AlbumView({ t, title, intro, photos: all, loading, sort, onSort, onBack, onReview, onAside, onAlbum }: {
  t: Strings;
  title: string;
  /** The (i) sheet's text, when the grid is not an album (*Chats & soziale Medien › one app*). */
  intro?: string;
  photos: Photo[];
  /** Its photos are still being asked for. */
  loading: boolean;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
  onAside: (photos: Photo[]) => void;
  /** The picked photos into another album (Android: moved into another folder) — the album sheet in App.tsx, then on Android the system's dialog. Absent while albums are not offered. */
  onAlbum?: (photos: Photo[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const list = sortPhotos(all, sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const pick = usePick(list);
  const chosen = pick.chosen;
  const count = (l: Photo[]) => (l.some(p => p.video) ? plural(t, 'files', l.length) : plural(t, 'photos', l.length));
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen title={title} subtitle={loading ? t.loading : `${count(list)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back}
      info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: intro ?? t.albumIntro }} docked={list.length > 0}>
      {!loading && list.length === 0 ? <Empty title={t.noPhotosHere} body={t.noPhotosHereBody} back={{ label: t.emptyBack, onClick: onBack }} /> : list.length > 0 && (
        <>
          <PickBar t={t} pick={pick} list={list} count={n => plural(t, 'binPicked', n)} sort={<SortButton inline t={t} value={sort} onChange={onSort} />} />
          <PhotoGrid
            ids={list.map(p => p.id)}
            label={when}
            {...gridPick(pick, setOpen, id => fmt(t.selectTile, { item: when(id) }))}
          />
        </>
      )}
      {list.length > 0 && (
        <Dock>
          {pick.selecting ? (
            <div className="grid gap-1">
              <MarkButton t={t} photos={chosen} count={count} onClick={() => { onAside(chosen); pick.select(false); }} />
              {onAlbum && chosen.length > 0 && (
                <Button full variant="ghost" icon={FolderInput} onClick={() => { onAlbum(chosen); pick.select(false); }}>
                  {`${t.addToAlbum} · ${count(chosen)}`}
                </Button>
              )}
            </div>
          ) : (
            <Button full size="lg" onClick={() => onReview(list)}>{`${t.reviewGroup} · ${count(list)} · ${bytes(t, total)}`}</Button>
          )}
        </Dock>
      )}
      <Opened t={t} photo={open ? byId.get(open) ?? null : null} alt={open && byId.has(open) ? when(open) : ''} onClose={() => setOpen(null)} onAside={p => onAside([p])} />
    </Screen>
  );
}
