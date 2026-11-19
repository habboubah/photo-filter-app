import { useState } from 'react';
import { Minimize2, Play } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { COMPRESS_MIN, LargeFilter, duration } from '../logic/large';
import { Dock, Empty, Group, IconTile, Next, Row, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { FilterMenu } from '../ui/Controls';
import { MarkButton, PickBar, gridPick, usePick } from '../ui/pick';
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
 * *Fotos verkleinern* opens from a row at its top (on home until 18 November 2026).
 */
export function LargeView({ t, photos, videosOnly, canCompress, sort, onSort, onBack, onReview, onCompress, onDelete, onAside, smaller }: {
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
  /** *Fotos verkleinern* (src/logic/compress.ts), when there is something to gain: what it could save, and the way there. */
  smaller?: { saving: number; onOpen: () => void } | null;
}) {
  const [filter, setFilter] = useState<LargeFilter>('all');
  const [open, setOpen] = useState<Photo | null>(null);
  const list = sortPhotos(filter === 'all' ? photos : photos.filter(p => (filter === 'videos' ? p.video : !p.video)), sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const pick = usePick(list);
  const chosen = pick.chosen;
  const approx = list.some(p => !p.exact);
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const size = (p: Photo) => `${p.exact ? '' : '≈ '}${bytes(t, p.bytes)}`;

  return (
    <Screen title={videosOnly ? t.videosTitle : t.largeTitle} subtitle={`${plural(t, 'files', list.length)} · ${approx ? '≈ ' : ''}${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: canCompress ? `${t.largeIntro}\n${t.largeCompressNote}` : t.largeIntro }} docked={list.length > 0}>
      {smaller && (
        <Group>
          <Row
            label={t.compressPhotosTile} sub={fmt(t.upTo, { size: bytes(t, smaller.saving) })}
            leading={<IconTile icon={Minimize2} hue="sky" />} trailing={<Next />} onClick={smaller.onOpen}
          />
        </Group>
      )}
      {photos.length > 0 && <PickBar t={t} pick={pick} list={list} count={n => plural(t, 'binPicked', n)} sort={<SortButton inline t={t} value={sort} onChange={onSort} />} filter={!videosOnly && <FilterMenu label={t.largeTitle} value={filter} onChange={setFilter} options={[{ value: 'all', label: t.filterAll }, { value: 'videos', label: t.filterVideos }, { value: 'photos', label: t.filterPhotos }]} />} />}
      {list.length === 0 ? <Empty title={videosOnly ? t.noVideos : t.noLarge} body={videosOnly ? t.noVideosBody : t.noLargeBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
        <PhotoGrid
          ids={list.map(p => p.id)}
          label={id => { const p = byId.get(id)!; return `${when(p)}, ${size(p)}${p.video ? `, ${t.videoBadge} ${duration(p.dur ?? 0)}` : ''}`; }}
          {...gridPick(pick, id => setOpen(byId.get(id) ?? null), id => { const p = byId.get(id)!; return fmt(t.selectTile, { item: `${when(p)}, ${size(p)}` }); })}
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
          {pick.selecting ? (
            <MarkButton t={t} photos={chosen} count={l => plural(t, 'files', l.length)} approx={chosen.some(p => !p.exact)} onClick={() => { onAside(chosen); pick.select(false); }} />
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
            {/* Into "Zum Löschen vorgemerkt" (src/logic/bin.ts): red by Ahmad's choice, the archive — nothing is deleted here. */}
            <MarkButton t={t} photos={[open]} count={l => plural(t, 'files', l.length)} approx={!open.exact} onClick={() => { const p = open; setOpen(null); onDelete(p); }} />
            <p className="text-caption text-fg-mute text-center wrap-prose -mt-2">{t.asideHint}</p>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
