import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Archive } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { SelectBar } from '../ui/SelectBar';
import { ZoomView } from '../ui/Zoom';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/**
 * One album of the phone (Android: one folder), from *Ordnen › Alben*: its
 * photos and videos, newest first unless sorted otherwise. A tap opens one
 * large; its circle picks it, and the picked ones go to "Zum Löschen
 * vorgemerkt" at once. *Durchgehen* reviews the album one by one. Nothing in
 * the album itself changes here.
 */
export function AlbumView({ t, title, photos: all, loading, sort, onSort, onBack, onReview, onAside }: {
  t: Strings;
  title: string;
  photos: Photo[];
  /** Its photos are still being asked for. */
  loading: boolean;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
  onAside: (photos: Photo[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setPicked(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const list = sortPhotos(all, sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const chosen = list.filter(p => picked.has(p.id));
  const chosenBytes = chosen.reduce((s, p) => s + p.bytes, 0);
  const count = (l: Photo[]) => (l.some(p => p.video) ? plural(t, 'files', l.length) : plural(t, 'photos', l.length));
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen title={title} subtitle={loading ? t.loading : `${count(list)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back}
      info={{ label: t.aboutScreen, close: t.close, body: t.albumIntro }} docked={list.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      {!loading && list.length === 0 ? <Empty title={t.noPhotosHere} body={t.noPhotosHereBody} back={{ label: t.emptyBack, onClick: onBack }} /> : list.length > 0 && (
        <>
          <SelectBar
            text={chosen.length ? plural(t, 'binPicked', chosen.length) : t.selectHint}
            all={chosen.length === list.length} none={chosen.length === 0}
            onAll={() => setPicked(new Set(list.map(p => p.id)))} onNone={() => setPicked(new Set())}
            labels={{ all: t.pickAll, none: t.pickNone }}
          />
          <PhotoGrid
            ids={list.map(p => p.id)}
            label={when}
            onOpen={setOpen}
            selected={picked} onSelect={toggle}
            selectLabel={id => fmt(t.selectTile, { item: when(id) })}
          />
        </>
      )}
      {list.length > 0 && (
        <Dock>
          {chosen.length > 0 ? (
            // Into "Zum Löschen vorgemerkt": nothing is deleted here, so teal and the archive, never red.
            <Button full size="lg" icon={Archive} onClick={() => { onAside(chosen); setPicked(new Set()); }}>
              {`${t.aside} · ${count(chosen)} · ${bytes(t, chosenBytes)}`}
            </Button>
          ) : (
            <Button full size="lg" onClick={() => onReview(list)}>{`${t.reviewGroup} · ${count(list)} · ${bytes(t, total)}`}</Button>
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
