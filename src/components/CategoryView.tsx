import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { FolderInput, FolderPlus, ImagePlus } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import type { MemoryLabel } from '../logic/ai';
import { Dock, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { SelectBar } from '../ui/SelectBar';
import { ZoomView } from '../ui/Zoom';
import { sortPhotos, type SortKey } from '../logic/sort';
import { isAndroid } from '../platform';
import { SortButton } from './SortButton';

/**
 * One category the on-device AI sorted photos into (kids, pets, food …),
 * newest first unless sorted otherwise. A tap opens a photo large; its circle
 * picks it. As with a trip, the category can become an album (Android: a
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
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setPicked(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const photos = sortPhotos(all, sort);
  const byId = new Map(photos.map(p => [p.id, p]));
  const total = photos.reduce((s, p) => s + p.bytes, 0);
  const chosen = photos.filter(p => picked.has(p.id));
  const name = t[`aiLabel_${label}`];
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const AlbumIcon = isAndroid() ? FolderPlus : ImagePlus;

  return (
    <Screen title={name} subtitle={`${plural(t, 'photos', photos.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.categoryIntro }}
      docked={!!onAlbum && photos.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      {onAlbum && photos.length > 0 && (
        <SelectBar
          text={chosen.length ? plural(t, 'binPicked', chosen.length) : t.selectHint}
          all={chosen.length === photos.length} none={chosen.length === 0}
          onAll={() => setPicked(new Set(photos.map(p => p.id)))} onNone={() => setPicked(new Set())}
          labels={{ all: t.pickAll, none: t.pickNone }}
        />
      )}
      <PhotoGrid
        ids={photos.map(p => p.id)}
        columns={3}
        label={when}
        onOpen={setOpen}
        selected={onAlbum ? picked : undefined} onSelect={onAlbum ? toggle : undefined}
        selectLabel={id => fmt(t.selectTile, { item: when(id) })}
      />
      {onAlbum && photos.length > 0 && (
        <Dock>
          {chosen.length > 0 ? (
            <Button full size="lg" icon={FolderInput} onClick={() => { onAlbum(chosen); setPicked(new Set()); }}>
              {`${t.addToAlbum} · ${plural(t, 'photos', chosen.length)}`}
            </Button>
          ) : (
            <Button full size="lg" icon={AlbumIcon} onClick={() => onAlbum(photos, name)}>
              {`${t.createAlbum} · ${plural(t, 'photos', photos.length)}`}
            </Button>
          )}
        </Dock>
      )}
      <AnimatePresence>
        {open && byId.has(open) && (
          <ZoomView
            key="zoom" id={open} alt={when(open)}
            labels={{ close: t.close, zoomIn: t.zoomIn, zoomOut: t.zoomOut, hint: t.zoomHint }}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </Screen>
  );
}
