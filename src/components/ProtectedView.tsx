import { useEffect, useState } from 'react';
import { FolderLock, MapPin, ShieldOff } from 'lucide-react';
import type { AlbumInfo } from '../native/photoLibrary';
import { Strings, fmt, num, plural } from '../translations';
import { Empty, Group, IconTile, Row, Screen } from '../ui/Screen';
import { SwitchRow } from '../ui/Controls';
import { PhotoGrid } from '../ui/Photo';
import { Confirm } from '../ui/Sheet';
import { IconButton } from '../ui/Button';

/**
 * Settings › Geschützt [Protected]: the albums (iPhone) / folders (Android)
 * whose photos are never suggested, each with a switch; the trips marked
 * "Nie vorschlagen" and the photos protected by hand, each protection lifted
 * with a tap (src/logic/protect.ts).
 */
export function ProtectedView({ t, loadAlbums, albums: chosen, trips, photos, photoDate, onAlbum, onTrip, onPhoto, onBack }: {
  t: Strings;
  /** PhotoLibrary.listAlbums, asked when the screen opens. */
  loadAlbums: () => Promise<AlbumInfo[]>;
  /** The protected album ids. */
  albums: string[];
  /** The protected trips that still exist. */
  trips: { key: string; title: string; count: number }[];
  /** The photos protected by hand that are still in the library. */
  photos: string[];
  photoDate: (id: string) => string;
  onAlbum: (id: string, on: boolean) => void;
  onTrip: (key: string) => void;
  onPhoto: (id: string) => void;
  onBack: () => void;
}) {
  const [list, setList] = useState<AlbumInfo[] | null>(null);
  const [lift, setLift] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadAlbums().then(a => { if (alive) setList(a); }).catch(() => { if (alive) setList([]); });
    return () => { alive = false; };
  }, [loadAlbums]);
  const on = new Set(chosen);
  // Protected albums first, then by name.
  const sorted = (list ?? []).slice().sort((a, b) => Number(on.has(b.id)) - Number(on.has(a.id)) || a.title.localeCompare(b.title, t.locale));

  return (
    <Screen title={t.protectedTitle} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.protectedIntro }}>

      <Group title={t.protectedAlbums} footer={t.protectedAlbumsHint}>
        {list === null && <Row label={t.loading} leading={<IconTile icon={FolderLock} hue="mint" />} />}
        {list !== null && !sorted.length && <Row label={t.protectedNoAlbums} leading={<IconTile icon={FolderLock} hue="mint" />} />}
        {sorted.map(a => (
          <SwitchRow key={a.id} label={a.title || a.id} sub={plural(t, 'photos', a.count)} checked={on.has(a.id)} onChange={v => onAlbum(a.id, v)} />
        ))}
      </Group>

      {trips.length > 0 && (
        <Group title={t.protectedTrips}>
          {trips.map(x => (
            <Row
              key={x.key} label={x.title} sub={plural(t, 'photos', x.count)}
              leading={<IconTile icon={MapPin} hue="sky" />}
              trailing={<IconButton label={fmt(t.protectLiftNamed, { name: x.title })} icon={ShieldOff} tone="accent" onClick={() => onTrip(x.key)} />}
            />
          ))}
        </Group>
      )}

      <section aria-labelledby="protected-photos-h" className="space-y-2">
        <h2 id="protected-photos-h" className="eyebrow text-fg-mute px-[16px]">{`${t.protectedPhotos} · ${num(t, photos.length)}`}</h2>
        {photos.length === 0
          ? <Empty title={t.protectedNoPhotos} body={t.protectedNoPhotosBody} />
          : <PhotoGrid ids={photos} columns={4} label={id => `${photoDate(id)}, ${t.protectLift}`} onOpen={setLift} />}
      </section>

      <Confirm
        open={!!lift} title={t.protectLiftTitle} body={t.protectLiftBody} confirmLabel={t.protectLift} cancelLabel={t.cancel}
        onConfirm={() => { const id = lift; setLift(null); if (id) onPhoto(id); }} onCancel={() => setLift(null)}
      />
    </Screen>
  );
}
