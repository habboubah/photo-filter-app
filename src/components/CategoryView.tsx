import { useState } from 'react';
import { FolderInput, FolderPlus, ImagePlus } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import type { MemoryLabel } from '../logic/ai';
import { Dock, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { Opened, PickBar, gridPick, usePick } from '../ui/pick';
import { sortPhotos, type SortKey } from '../logic/sort';
import { isAndroid } from '../platform';
import { SortButton } from './SortButton';

/**
 * One category the on-device AI sorted photos into (kids, pets, food …),
 * newest first unless sorted otherwise. A tap opens a photo large;
 * *Auswählen* picks (src/ui/pick.tsx). As with a trip, the category can become an album (Android: a
 * folder) — *Album erstellen* takes all of it, named after the category — and
 * picked photos go into an album the user has or a new one (`onAlbum`: the
 * album sheet in App.tsx, then the system's own dialog on Android).
 */
export function CategoryView({ t, label, photos: all, sort, onSort, onBack, onAlbum }: {
  t: Strings;
  label: MemoryLabel;
  photos: Photo[];
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  /** Absent while albums are not offered. `name`: a new album for all of them, this name filled in. */
  onAlbum?: (photos: Photo[], name?: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const photos = sortPhotos(all, sort);
  const byId = new Map(photos.map(p => [p.id, p]));
  const total = photos.reduce((s, p) => s + p.bytes, 0);
  const pick = usePick(photos);
  const chosen = pick.chosen;
  const name = t[`aiLabel_${label}`];
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const AlbumIcon = isAndroid() ? FolderPlus : ImagePlus;

  return (
    <Screen title={name} subtitle={`${plural(t, 'photos', photos.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.categoryIntro }}
      docked={!!onAlbum && photos.length > 0}>
      <PickBar t={t} pick={pick} list={photos} canSelect={!!onAlbum} count={n => plural(t, 'binPicked', n)} sort={<SortButton inline t={t} value={sort} onChange={onSort} />} />
      <PhotoGrid
        ids={photos.map(p => p.id)}
        columns={3}
        label={when}
        {...gridPick(pick, setOpen, id => fmt(t.selectTile, { item: when(id) }))}
      />
      {onAlbum && photos.length > 0 && (
        <Dock>
          {pick.selecting ? (
            <Button full size="lg" icon={FolderInput} disabled={!chosen.length} onClick={() => { onAlbum(chosen); pick.select(false); }}>
              {chosen.length ? `${t.addToAlbum} · ${plural(t, 'photos', chosen.length)}` : t.addToAlbum}
            </Button>
          ) : (
            <Button full size="lg" icon={AlbumIcon} onClick={() => onAlbum(photos, name)}>
              {`${t.createAlbum} · ${plural(t, 'photos', photos.length)}`}
            </Button>
          )}
        </Dock>
      )}
      <Opened t={t} photo={open ? byId.get(open) ?? null : null} alt={open && byId.has(open) ? when(open) : ''} onClose={() => setOpen(null)} />
    </Screen>
  );
}
