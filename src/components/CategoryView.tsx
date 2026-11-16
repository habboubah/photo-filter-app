import type { Photo } from '../types';
import { Strings, bytes, plural } from '../translations';
import type { MemoryLabel } from '../logic/ai';
import { Screen } from '../ui/Screen';
import { PhotoGrid } from '../ui/Photo';

/** One category the on-device AI sorted photos into (kids, pets, food …), newest first. Only to look at. */
export function CategoryView({ t, label, photos, onBack }: {
  t: Strings;
  label: MemoryLabel;
  photos: Photo[];
  onBack: () => void;
}) {
  const byId = new Map(photos.map(p => [p.id, p]));
  const total = photos.reduce((s, p) => s + p.bytes, 0);
  return (
    <Screen title={t[`aiLabel_${label}`]} subtitle={`${plural(t, 'photos', photos.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back}>
      <p className="text-label text-fg-mute px-1 -mt-2 wrap-prose">{t.categoryIntro}</p>
      <PhotoGrid
        ids={photos.map(p => p.id)}
        columns={3}
        label={id => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' })}
      />
    </Screen>
  );
}
