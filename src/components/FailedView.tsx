import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Archive } from 'lucide-react';
import type { Confidence, Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { blurLevel } from '../logic/blur';
import type { ExposureLevel } from '../logic/exposure';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { SelectBar } from '../ui/SelectBar';
import { PhotoGrid } from '../ui/Photo';
import { ZoomView } from '../ui/Zoom';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

export type FailedTab = 'blurry' | ExposureLevel;

/**
 * Missglückt [Failed shots]: the blurry photos (most certain first, each with
 * how sure the app is), the too dark and the too bright ones — one tab each.
 * A tap opens one large; its circle picks it, and the picked ones go to
 * "Zum Löschen vorgemerkt" at once.
 */
export function FailedView({ t, blurry, dark, bright, tab: initialTab = 'blurry', sort, onSort, onBack, onReviewBlurry, onReviewExposure, onAside }: {
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
  /** The picked photos into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
}) {
  const [tab, setTab] = useState<FailedTab>(initialTab);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setPicked(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const [filter, setFilter] = useState<'sure' | 'all'>('sure');
  const list = sortPhotos(tab === 'dark' ? dark : tab === 'bright' ? bright
    : filter === 'all' ? blurry : blurry.filter(p => { const l = blurLevel(p); return l === 'high' || l === 'medium'; }), sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const levelText: Record<Confidence, string> = { high: t.levelHigh, medium: t.levelMedium, low: t.levelLow };
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const chosen = list.filter(p => picked.has(p.id));
  const chosenBytes = chosen.reduce((s, p) => s + p.bytes, 0);
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const intro = tab === 'blurry' ? t.blurryIntro : t.exposureIntro;
  const empty = tab === 'blurry'
    ? { title: t.noBlurry, body: t.noBlurryBody }
    : { title: tab === 'dark' ? t.noDark : t.noBright, body: t.noExposureBody };
  const review = () => (tab === 'blurry' ? onReviewBlurry(list) : onReviewExposure(list, tab));

  return (
    <Screen title={t.failedTitle} subtitle={`${plural(t, 'photos', list.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: intro }} docked={list.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      <Segmented
        label={t.failedTitle} value={tab} onChange={setTab}
        options={[
          { value: 'blurry', label: t.failedBlurry },
          { value: 'dark', label: t.failedDark },
          { value: 'bright', label: t.failedBright },
        ]}
      />
      {tab === 'blurry' && (
        <Segmented
          label={t.blurryTitle} value={filter} onChange={setFilter}
          options={[{ value: 'sure', label: t.filterSure }, { value: 'all', label: t.filterAll }]}
        />
      )}
      {list.length === 0 ? <Empty title={empty.title} body={empty.body} back={{ label: t.emptyBack, onClick: onBack }} /> : (
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
          label={id => {
            const p = byId.get(id)!;
            return tab === 'blurry' ? `${when(p)}, ${levelText[blurLevel(p) ?? 'low']}` : when(p);
          }}
          onOpen={setOpen}
          selected={picked} onSelect={toggle}
          selectLabel={id => fmt(t.selectTile, { item: when(byId.get(id)!) })}
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
        </>
      )}
      {tab === 'blurry' && list.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-caption text-fg-mute" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-neg" />{t.levelHigh}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warn" />{t.levelMedium}</span>
          {filter === 'all' && <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-fg-faint" />{t.levelLow}</span>}
        </div>
      )}
      {list.length > 0 && (
        <Dock>
          {chosen.length > 0 ? (
            <>{/* Into "Zum Löschen vorgemerkt": nothing is deleted here, so teal and the archive, never red. */}
              <Button full size="lg" icon={Archive} onClick={() => { onAside(chosen); setPicked(new Set()); }}>
                {`${t.aside} · ${plural(t, 'photos', chosen.length)} · ${bytes(t, chosenBytes)}`}
              </Button>
            </>
          ) : (
            <Button full size="lg" onClick={review}>{`${t.reviewBlurry} · ${plural(t, 'photos', list.length)} · ${bytes(t, total)}`}</Button>
          )}
        </Dock>
      )}
      <AnimatePresence>
        {open && byId.has(open) && (
          <ZoomView
            key="zoom" id={open} alt={when(byId.get(open)!)}
            labels={{ close: t.close, zoomIn: t.zoomIn, zoomOut: t.zoomOut, hint: t.zoomHint }}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </Screen>
  );
}
