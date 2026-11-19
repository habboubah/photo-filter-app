import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { LIVE_VIDEO_BYTES } from '../logic/large';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { sortPhotos, type SortKey } from '../logic/sort';
import { MarkButton, Opened, PickBar, gridPick, usePick } from '../ui/pick';
import { SortButton } from './SortButton';

/**
 * iPhone: the Live Photos. Each carries a short video next to the picture;
 * turned into a plain photo it keeps the picture (as edited), its date, place,
 * favourite flag and albums, and the Live Photo goes to Recently Deleted
 * through the system's dialog. The saving is an estimate (≈ 3 MB each).
 * A tap opens one large; *Auswählen* picks (src/ui/pick.tsx), and only
 * then the Dock appears: the red *Löschen vormerken* and, under it, *In
 * normale Fotos umwandeln* for the picked ones.
 */
export function LiveView({ t, photos: all, sort, onSort, onBack, onConvert, onAside }: {
  t: Strings;
  photos: Photo[];
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onConvert: (photos: Photo[]) => void;
  /** Into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
}) {
  const photos = sortPhotos(all, sort);
  const byId = new Map(photos.map(p => [p.id, p]));
  const saving = photos.length * LIVE_VIDEO_BYTES;
  const [open, setOpen] = useState<string | null>(null);
  const pick = usePick(photos);
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Screen title={t.liveTitle} subtitle={`${plural(t, 'photos', photos.length)} · ≈ ${bytes(t, saving)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.liveIntro }} docked={pick.selecting}>
      {photos.length === 0 ? <Empty title={t.noLive} body={t.noLiveBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
          <PickBar t={t} pick={pick} list={photos} count={n => plural(t, 'binPicked', n)} sort={<SortButton inline t={t} value={sort} onChange={onSort} />} />
          <PhotoGrid
            ids={photos.map(p => p.id)}
            label={when}
            {...gridPick(pick, setOpen, id => fmt(t.selectTile, { item: when(id) }))}
          />
        </>
      )}
      {pick.selecting && (
        <Dock>
          {/* Like every grid: picked first, then what to do with them (Ahmad, 19 November 2026; before, one button converted all). */}
          <div className="grid gap-1">
            <MarkButton t={t} photos={pick.chosen} count={l => plural(t, 'photos', l.length)} onClick={() => { onAside(pick.chosen); pick.select(false); }} />
            {pick.chosen.length > 0 && (
              <Button full variant="ghost" icon={ImageIcon} onClick={() => { onConvert(pick.chosen); pick.select(false); }}>
                {fmt(t.liveConvert, { photos: plural(t, 'photos', pick.chosen.length), size: bytes(t, pick.chosen.length * LIVE_VIDEO_BYTES) })}
              </Button>
            )}
          </div>
        </Dock>
      )}
      <Opened t={t} photo={open ? byId.get(open) ?? null : null} alt={open && byId.has(open) ? when(open) : ''} onClose={() => setOpen(null)} onAside={p => onAside([p])} />
    </Screen>
  );
}
