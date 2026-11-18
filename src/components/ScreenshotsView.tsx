import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Archive } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { isOldShot } from '../logic/screenshots';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { SelectBar } from '../ui/SelectBar';
import { PhotoGrid } from '../ui/Photo';
import { ZoomView } from '../ui/Zoom';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/**
 * The screenshots, newest first unless sorted otherwise; by default only the
 * old ones (the ones the clean-up card counts). A tap opens one large; its
 * circle picks it, and the picked ones go to "Zum Löschen vorgemerkt" at once.
 */
export function ScreenshotsView({ t, photos, now, sort, onSort, onBack, onReview, onAside }: {
  t: Strings;
  photos: Photo[];
  now: number;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
  /** The picked screenshots into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
}) {
  const [filter, setFilter] = useState<'old' | 'all'>('old');
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setPicked(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const list = sortPhotos(filter === 'all' ? photos : photos.filter(p => isOldShot(p, now)), sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const chosen = list.filter(p => picked.has(p.id));
  const chosenBytes = chosen.reduce((s, p) => s + p.bytes, 0);
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen title={t.screenshotsTitle} subtitle={`${plural(t, 'photos', list.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.screenshotsIntro }} docked={list.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      <Segmented
        label={t.screenshotsTitle} value={filter} onChange={setFilter}
        options={[{ value: 'old', label: t.filterOld }, { value: 'all', label: t.filterAll }]}
      />
      {list.length === 0 ? <Empty title={t.noScreenshots} body={t.noScreenshotsBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
        <SelectBar
          text={chosen.length ? plural(t, 'binPicked', chosen.length) : t.selectHint}
          all={chosen.length === list.length} none={chosen.length === 0}
          onAll={() => setPicked(old => new Set([...old, ...list.map(p => p.id)]))}
          onNone={() => setPicked(new Set())}
          labels={{ all: t.pickAll, none: t.pickNone }}
        />
        <PhotoGrid
          ids={list.map(p => p.id)}
          columns={4}
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
            <>{/* Into "Zum Löschen vorgemerkt": nothing is deleted here, so teal and the archive, never red. */}
              <Button full size="lg" icon={Archive} onClick={() => { onAside(chosen); setPicked(new Set()); }}>
                {`${t.aside} · ${plural(t, 'photos', chosen.length)} · ${bytes(t, chosenBytes)}`}
              </Button>
            </>
          ) : (
            <Button full size="lg" onClick={() => onReview(list)}>{`${t.reviewScreenshots} · ${plural(t, 'photos', list.length)} · ${bytes(t, total)}`}</Button>
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
