import { useMemo, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { estimatedSaving, videoSaving } from '../logic/compress';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { FilterMenu } from '../ui/Controls';
import { PhotoGrid } from '../ui/Photo';
import { Opened, PickBar, gridPick, usePick } from '../ui/pick';

/**
 * "Fotos verkleinern" / "Videos verkleinern" [Make photos / videos smaller],
 * from home's *Mehr Platz* (19 November 2026; before, photos only, from the
 * large files, and a video one at a time from its sheet): the files that
 * qualify (src/logic/compress.ts), the largest saving first, picked like
 * every grid (src/ui/pick.tsx). Only while picking does the Dock offer
 * *n verkleinern*: smaller copies next to the originals, then the originals
 * go into *Zum Löschen vorgemerkt* (App.tsx) — deleted only from there.
 */
export function CompressView({ t, kind, photos, screenshots = [], onBack, onRun, onAside }: {
  t: Strings;
  kind: 'photos' | 'videos';
  /** The camera photos (kind photos) or the large videos (kind videos). */
  photos: Photo[];
  /** Screenshots and other PNGs, behind the filter (kind photos). */
  screenshots?: Photo[];
  onBack: () => void;
  onRun: (photos: Photo[]) => void;
  /** One file opened large, marked for deletion instead. */
  onAside: (photos: Photo[]) => void;
}) {
  const videos = kind === 'videos';
  const [group, setGroup] = useState<'photos' | 'screenshots'>(photos.length || !screenshots.length ? 'photos' : 'screenshots');
  const list = !videos && group === 'screenshots' ? screenshots : photos;
  const pick = usePick(list);
  const [open, setOpen] = useState<string | null>(null);
  const byId = useMemo(() => new Map(list.map(p => [p.id, p])), [list]);
  const save = videos ? videoSaving : estimatedSaving;
  const total = list.reduce((s, p) => s + save(p), 0);
  const chosen = pick.chosen;
  const chosenSaving = chosen.reduce((s, p) => s + save(p), 0);
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const count = (n: number) => plural(t, videos ? 'videos' : 'photos', n);

  return (
    <Screen
      title={videos ? t.compressVideosTitle : t.compressPhotosTitle} subtitle={fmt(t.upTo, { size: bytes(t, total) })}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: videos ? t.compressVideosIntro : t.compressPhotosIntro }}
      docked={pick.selecting}
    >
      {(photos.length > 0 || screenshots.length > 0) && (
        <PickBar
          t={t} pick={pick} list={list} count={n => plural(t, 'binPicked', n)}
          filter={!videos && photos.length > 0 && screenshots.length > 0 && (
            <FilterMenu label={t.compressPhotosTitle} value={group} onChange={setGroup} options={[{ value: 'photos', label: t.filterPhotos }, { value: 'screenshots', label: t.screenshotsTile }]} />
          )}
        />
      )}
      {list.length === 0 ? <Empty title={videos ? t.compressVideosNone : t.compressNone} body={videos ? t.compressVideosNoneBody : t.compressNoneBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <PhotoGrid
          ids={list.map(p => p.id)}
          label={id => { const p = byId.get(id)!; return `${when(p)}, ${fmt(t.upTo, { size: bytes(t, save(p)) })}`; }}
          {...gridPick(pick, setOpen, id => fmt(t.selectTile, { item: when(byId.get(id)!) }))}
          overlay={id => (
            <span aria-hidden="true" className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold num">
              {`−${bytes(t, save(byId.get(id)!))}`}
            </span>
          )}
        />
      )}
      {pick.selecting && (
        <Dock>
          <Button full size="lg" icon={Minimize2} disabled={!chosen.length} onClick={() => { onRun(chosen); pick.select(false); }}>
            {chosen.length
              ? `${fmt(t.compressRun, { files: count(chosen.length) })} · ${fmt(t.upTo, { size: bytes(t, chosenSaving) })}`
              : fmt(t.compressRun, { files: count(0) })}
          </Button>
        </Dock>
      )}
      <Opened t={t} photo={open ? byId.get(open) ?? null : null} alt={open && byId.has(open) ? when(byId.get(open)!) : ''} onClose={() => setOpen(null)} onAside={p => onAside([p])} />
    </Screen>
  );
}
