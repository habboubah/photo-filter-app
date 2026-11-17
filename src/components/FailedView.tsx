import { useState } from 'react';
import type { Confidence, Photo } from '../types';
import { Strings, bytes, plural } from '../translations';
import { blurLevel } from '../logic/blur';
import type { ExposureLevel } from '../logic/exposure';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { PhotoGrid } from '../ui/Photo';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

export type FailedTab = 'blurry' | ExposureLevel;

/**
 * Missglückt [Failed shots]: the blurry photos (most certain first, each with
 * how sure the app is), the too dark and the too bright ones — one tab each.
 */
export function FailedView({ t, blurry, dark, bright, tab: initialTab = 'blurry', sort, onSort, onBack, onReviewBlurry, onReviewExposure }: {
  t: Strings;
  blurry: Photo[];
  dark: Photo[];
  bright: Photo[];
  tab?: FailedTab;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReviewBlurry: (photos: Photo[]) => void;
  onReviewExposure: (photos: Photo[], level: ExposureLevel) => void;
}) {
  const [tab, setTab] = useState<FailedTab>(initialTab);
  const [filter, setFilter] = useState<'sure' | 'all'>('sure');
  const list = sortPhotos(tab === 'dark' ? dark : tab === 'bright' ? bright
    : filter === 'all' ? blurry : blurry.filter(p => { const l = blurLevel(p); return l === 'high' || l === 'medium'; }), sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const levelText: Record<Confidence, string> = { high: t.levelHigh, medium: t.levelMedium, low: t.levelLow };
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const intro = tab === 'blurry' ? t.blurryIntro : t.exposureIntro;
  const empty = tab === 'blurry'
    ? { title: t.noBlurry, body: t.noBlurryBody }
    : { title: tab === 'dark' ? t.noDark : t.noBright, body: t.noExposureBody };
  const review = () => (tab === 'blurry' ? onReviewBlurry(list) : onReviewExposure(list, tab));

  return (
    <Screen title={t.failedTitle} subtitle={`${plural(t, 'photos', list.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} docked={list.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      <Segmented
        label={t.failedTitle} value={tab} onChange={setTab}
        options={[
          { value: 'blurry', label: t.failedBlurry },
          { value: 'dark', label: t.failedDark },
          { value: 'bright', label: t.failedBright },
        ]}
      />
      <p className="text-label text-fg-mute px-1 wrap-prose">{intro}</p>
      {tab === 'blurry' && (
        <Segmented
          label={t.blurryTitle} value={filter} onChange={setFilter}
          options={[{ value: 'sure', label: t.filterSure }, { value: 'all', label: t.filterAll }]}
        />
      )}
      {list.length === 0 ? <Empty title={empty.title} body={empty.body} /> : (
        <PhotoGrid
          ids={list.map(p => p.id)}
          label={id => {
            const p = byId.get(id)!;
            return tab === 'blurry' ? `${when(p)}, ${levelText[blurLevel(p) ?? 'low']}` : when(p);
          }}
          overlay={tab !== 'blurry' ? undefined : id => {
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
      {tab === 'blurry' && list.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-caption text-fg-mute" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neg" />{t.levelHigh}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warn" />{t.levelMedium}</span>
          {filter === 'all' && <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-fg-faint" />{t.levelLow}</span>}
        </div>
      )}
      {list.length > 0 && (
        <Dock><Button full size="lg" onClick={review}>{t.reviewBlurry}</Button></Dock>
      )}
    </Screen>
  );
}
