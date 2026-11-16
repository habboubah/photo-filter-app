import { useState } from 'react';
import type { Confidence, Photo } from '../types';
import { Strings, bytes, plural } from '../translations';
import { blurLevel } from '../logic/blur';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { PhotoGrid } from '../ui/Photo';

/** The blurry photos, most certain first, each with how sure the app is. */
export function BlurryView({ t, photos, onBack, onReview }: {
  t: Strings;
  photos: Photo[];
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
}) {
  const [filter, setFilter] = useState<'sure' | 'all'>('sure');
  const list = filter === 'all' ? photos : photos.filter(p => { const l = blurLevel(p); return l === 'high' || l === 'medium'; });
  const byId = new Map(list.map(p => [p.id, p]));
  const levelText: Record<Confidence, string> = { high: t.levelHigh, medium: t.levelMedium, low: t.levelLow };
  const total = list.reduce((s, p) => s + p.bytes, 0);

  return (
    <Screen title={t.blurryTitle} subtitle={`${plural(t, 'photos', list.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} docked={list.length > 0}>
      <p className="text-label text-fg-mute px-1 -mt-2 wrap-prose">{t.blurryIntro}</p>
      <Segmented
        label={t.blurryTitle} value={filter} onChange={setFilter}
        options={[{ value: 'sure', label: t.filterSure }, { value: 'all', label: t.filterAll }]}
      />
      {list.length === 0 ? <Empty title={t.noBlurry} body={t.noBlurryBody} /> : (
        <PhotoGrid
          ids={list.map(p => p.id)}
          label={id => {
            const p = byId.get(id)!;
            return `${new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' })}, ${levelText[blurLevel(p) ?? 'low']}`;
          }}
          overlay={id => {
            const level = blurLevel(byId.get(id)!);
            return (
              <span
                aria-hidden="true"
                className={`absolute bottom-1.5 start-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-surface ${level === 'high' ? 'bg-neg' : level === 'medium' ? 'bg-warn' : 'bg-fg-faint'}`}
              />
            );
          }}
        />
      )}
      {list.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-caption text-fg-mute" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neg" />{t.levelHigh}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warn" />{t.levelMedium}</span>
          {filter === 'all' && <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-fg-faint" />{t.levelLow}</span>}
        </div>
      )}
      {list.length > 0 && (
        <Dock><Button full size="lg" onClick={() => onReview(list)}>{t.reviewBlurry}</Button></Dock>
      )}
    </Screen>
  );
}
