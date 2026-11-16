import { useState } from 'react';
import type { Photo } from '../types';
import { Strings, bytes, plural } from '../translations';
import { isOldShot } from '../logic/screenshots';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { PhotoGrid } from '../ui/Photo';

/** The screenshots, newest first; by default only the old ones (the ones the clean-up card counts). */
export function ScreenshotsView({ t, photos, now, onBack, onReview }: {
  t: Strings;
  photos: Photo[];
  now: number;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
}) {
  const [filter, setFilter] = useState<'old' | 'all'>('old');
  const list = filter === 'all' ? photos : photos.filter(p => isOldShot(p, now));
  const byId = new Map(list.map(p => [p.id, p]));
  const total = list.reduce((s, p) => s + p.bytes, 0);

  return (
    <Screen title={t.screenshotsTitle} subtitle={`${plural(t, 'photos', list.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} docked={list.length > 0}>
      <p className="text-label text-fg-mute px-1 -mt-2 wrap-prose">{t.screenshotsIntro}</p>
      <Segmented
        label={t.screenshotsTitle} value={filter} onChange={setFilter}
        options={[{ value: 'old', label: t.filterOld }, { value: 'all', label: t.filterAll }]}
      />
      {list.length === 0 ? <Empty title={t.noScreenshots} body={t.noScreenshotsBody} /> : (
        <PhotoGrid
          ids={list.map(p => p.id)}
          columns={4}
          label={id => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' })}
        />
      )}
      {list.length > 0 && (
        <Dock><Button full size="lg" onClick={() => onReview(list)}>{`${t.reviewScreenshots} · ${plural(t, 'photos', list.length)}`}</Button></Dock>
      )}
    </Screen>
  );
}
