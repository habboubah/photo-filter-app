import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { LIVE_VIDEO_BYTES } from '../logic/large';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/**
 * iPhone: the Live Photos. Each carries a short video next to the picture;
 * turned into a plain photo it keeps the picture (as edited), its date, place,
 * favourite flag and albums, and the Live Photo goes to Recently Deleted
 * through the system's dialog. The saving is an estimate (≈ 3 MB each).
 */
export function LiveView({ t, photos: all, sort, onSort, onBack, onConvert }: {
  t: Strings;
  photos: Photo[];
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onConvert: (photos: Photo[]) => void;
}) {
  const photos = sortPhotos(all, sort);
  const byId = new Map(photos.map(p => [p.id, p]));
  const saving = photos.length * LIVE_VIDEO_BYTES;
  return (
    <Screen title={t.liveTitle} subtitle={`${plural(t, 'photos', photos.length)} · ≈ ${bytes(t, saving)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.liveIntro }} docked={photos.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      {photos.length === 0 ? <Empty title={t.noLive} body={t.noLiveBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <PhotoGrid
          ids={photos.map(p => p.id)}
          label={id => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' })}
        />
      )}
      {photos.length > 0 && (
        <Dock><Button full size="lg" onClick={() => onConvert(photos)}>{fmt(t.liveConvert, { size: bytes(t, saving) })}</Button></Dock>
      )}
    </Screen>
  );
}
