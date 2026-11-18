import { useState } from 'react';
import { Archive, Minimize2, Play } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { COMPRESS_MIN, LargeFilter, duration } from '../logic/large';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { SelectBar } from '../ui/SelectBar';
import { PhotoGrid, Thumb } from '../ui/Photo';
import { Sheet } from '../ui/Sheet';
import { LARGE } from '../thumbs';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';
import { PlayOver } from '../ui/play';

/**
 * The largest photos and videos, biggest first. Nothing is suggested for
 * deleting here: a tap opens one file with what can be done with it — make a
 * video smaller (a copy, the original stays until it is deleted), or delete it.
 */
export function LargeView({ t, photos, videosOnly, canCompress, sort, onSort, onBack, onReview, onCompress, onDelete, onAside }: {
  t: Strings;
  photos: Photo[];
  /** Every video of the library (the analysis' "Videos"), not the large files: its own title, no filter. */
  videosOnly?: boolean;
  canCompress: boolean;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
  onCompress: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
  /** The selected files into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
}) {
  const [filter, setFilter] = useState<LargeFilter>('all');
  const [open, setOpen] = useState<Photo | null>(null);
  // Files picked by their circle, to mark for deletion in one go (a tap elsewhere on a tile still opens it).
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setPicked(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const list = sortPhotos(filter === 'all' ? photos : photos.filter(p => (filter === 'videos' ? p.video : !p.video)), sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const chosen = list.filter(p => picked.has(p.id));
  const chosenBytes = chosen.reduce((s, p) => s + p.bytes, 0);
  const approx = list.some(p => !p.exact);
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const size = (p: Photo) => `${p.exact ? '' : '≈ '}${bytes(t, p.bytes)}`;

  return (
    <Screen title={videosOnly ? t.videosTitle : t.largeTitle} subtitle={`${plural(t, 'files', list.length)} · ${approx ? '≈ ' : ''}${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: canCompress ? `${t.largeIntro} ${t.largeCompressNote}` : t.largeIntro }} docked={list.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      {!videosOnly && (
        <Segmented
          label={t.largeTitle} value={filter} onChange={setFilter}
          options={[{ value: 'all', label: t.filterAll }, { value: 'videos', label: t.filterVideos }, { value: 'photos', label: t.filterPhotos }]}
        />
      )}
      {list.length === 0 ? <Empty title={videosOnly ? t.noVideos : t.noLarge} body={videosOnly ? t.noVideosBody : t.noLargeBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
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
          label={id => { const p = byId.get(id)!; return `${when(p)}, ${size(p)}${p.video ? `, ${t.videoBadge} ${duration(p.dur ?? 0)}` : ''}`; }}
          onOpen={id => setOpen(byId.get(id) ?? null)}
          selected={picked} onSelect={toggle}
          selectLabel={id => { const p = byId.get(id)!; return fmt(t.selectTile, { item: `${when(p)}, ${size(p)}` }); }}
          overlay={id => {
            const p = byId.get(id)!;
            return (
              <>
                {p.video && (
                  <span aria-hidden="true" className="absolute top-1.5 end-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold num">
                    <Play className="w-3 h-3" fill="currentColor" strokeWidth={0} />{duration(p.dur ?? 0)}
                  </span>
                )}
                <span aria-hidden="true" className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold num">{size(p)}</span>
              </>
            );
          }}
        />
        </>
      )}
      {list.length > 0 && (
        <Dock>
          {chosen.length > 0 ? (
            <>{/* Into "Zum Löschen vorgemerkt": nothing is deleted here, so teal and the archive, never red. */}
              <Button full size="lg" icon={Archive} onClick={() => { onAside(chosen); setPicked(new Set()); }}>
                {`${t.aside} · ${plural(t, 'files', chosen.length)} · ${bytes(t, chosenBytes)}`}
              </Button>
            </>
          ) : (
            <Button full size="lg" onClick={() => onReview(list)}>{`${t.reviewGroup} · ${plural(t, 'files', list.length)} · ${approx ? '≈ ' : ''}${bytes(t, total)}`}</Button>
          )}
        </Dock>
      )}

      <Sheet open={!!open} title={open?.video ? t.videoBadge : t.photoBadge} closeLabel={t.close} onClose={() => setOpen(null)}>
        {open && (
          <div className="space-y-4">
            <div className="relative aspect-video rounded-md overflow-hidden bg-surface-2">
              <Thumb id={open.id} size={LARGE} alt={when(open)} className="!rounded-none !object-contain" />
              <PlayOver id={open.id} />
            </div>
            <p className="text-label text-fg-mute num">
              {[when(open), size(open), open.video ? duration(open.dur ?? 0) : null].filter(Boolean).join(' · ')}
            </p>
            {open.video && canCompress && open.bytes >= COMPRESS_MIN && (
              <Button full size="lg" icon={Minimize2} onClick={() => { const p = open; setOpen(null); onCompress(p); }}>
                {t.compressVideo}
              </Button>
            )}
            {open.video && canCompress && open.bytes >= COMPRESS_MIN && (
              <p className="text-caption text-fg-mute wrap-prose -mt-2">{fmt(t.compressHint, { size: bytes(t, Math.round(open.bytes * 0.4)) })}</p>
            )}
            {/* Into "Zum Löschen vorgemerkt" (src/logic/bin.ts): nothing is deleted here, so no red. */}
            <Button full size="lg" variant="secondary" icon={Archive} onClick={() => { const p = open; setOpen(null); onDelete(p); }}>
              {t.aside}
            </Button>
            <p className="text-caption text-fg-mute text-center wrap-prose -mt-2">{t.asideHint}</p>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
