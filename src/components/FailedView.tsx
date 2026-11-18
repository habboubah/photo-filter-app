import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Archive, Check } from 'lucide-react';
import type { Confidence, Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { blurLevel } from '../logic/blur';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { SelectBar } from '../ui/SelectBar';
import { PhotoGrid } from '../ui/Photo';
import { ZoomView } from '../ui/Zoom';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/** Why a photo is on the screen: blurry, too dark or too bright (a photo counts once: src/logic/exposure.ts). */
export type FailedReason = 'blurry' | 'dark' | 'bright';

/**
 * Missglückt [Failed shots]: one grid of every photo that didn't come out —
 * blurry, too dark, too bright — each with a small chip that says which
 * (since 18 November 2026; before, one tab each). *Sicher* leaves out the
 * photos that are only maybe blurry. A tap opens one large; its circle picks
 * it, and the picked ones go to "Zum Löschen vorgemerkt" at once.
 */
export function FailedView({ t, blurry, dark, bright, sort, onSort, onBack, onReview, onAside, onKeep }: {
  t: Strings;
  blurry: Photo[];
  dark: Photo[];
  bright: Photo[];
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  /** A review of the photos shown, in their order. */
  onReview: (photos: Photo[]) => void;
  /** The picked photos into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
  /** The picked photos kept: off this list, never suggested again (undo in the toast). */
  onKeep: (photos: Photo[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setPicked(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const [filter, setFilter] = useState<'sure' | 'all'>('sure');
  const reason = new Map<string, FailedReason>([
    ...blurry.map(p => [p.id, 'blurry'] as const),
    ...dark.map(p => [p.id, 'dark'] as const),
    ...bright.map(p => [p.id, 'bright'] as const),
  ]);
  const shownBlurry = filter === 'all' ? blurry : blurry.filter(p => { const l = blurLevel(p); return l === 'high' || l === 'medium'; });
  const list = sortPhotos([...shownBlurry, ...dark, ...bright], sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const levelText: Record<Confidence, string> = { high: t.levelHigh, medium: t.levelMedium, low: t.levelLow };
  const reasonText: Record<FailedReason, string> = { blurry: t.failedBlurry, dark: t.failedDark, bright: t.failedBright };
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const chosen = list.filter(p => picked.has(p.id));
  const chosenBytes = chosen.reduce((s, p) => s + p.bytes, 0);
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const why = (p: Photo) => {
    const r = reason.get(p.id) ?? 'blurry';
    return r === 'blurry' ? levelText[blurLevel(p) ?? 'low'] : reasonText[r];
  };

  return (
    <Screen title={t.failedTitle} subtitle={`${plural(t, 'photos', list.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.failedIntro }} docked={list.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      {blurry.length > 0 && (
        <Segmented
          label={t.blurryTitle} value={filter} onChange={setFilter}
          options={[{ value: 'sure', label: t.filterSure }, { value: 'all', label: t.filterAll }]}
        />
      )}
      {list.length === 0 ? <Empty title={t.noFailed} body={t.noFailedBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
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
          label={id => { const p = byId.get(id)!; return `${when(p)}, ${why(p)}`; }}
          onOpen={setOpen}
          selected={picked} onSelect={toggle}
          selectLabel={id => fmt(t.selectTile, { item: when(byId.get(id)!) })}
          overlay={id => {
            const p = byId.get(id)!;
            const r = reason.get(id) ?? 'blurry';
            const level = r === 'blurry' ? blurLevel(p) : null;
            return (
              <span aria-hidden="true" className="absolute bottom-1.5 start-1.5 max-w-[calc(100%-12px)] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold">
                {r === 'blurry' && <span className={`w-2 h-2 shrink-0 rounded-full ${level === 'high' ? 'bg-neg' : level === 'medium' ? 'bg-warn' : 'bg-fg-faint'}`} />}
                <span className="truncate">{reasonText[r]}</span>
              </span>
            );
          }}
        />
        </>
      )}
      {shownBlurry.length > 0 && (
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
              <div className="grid gap-1">
                <Button full size="lg" icon={Archive} onClick={() => { onAside(chosen); setPicked(new Set()); }}>
                  {`${t.aside} · ${plural(t, 'photos', chosen.length)} · ${bytes(t, chosenBytes)}`}
                </Button>
                {/* Not junk after all: off the list for good, like "Alle behalten" on the groups. */}
                <Button full variant="ghost" icon={Check} onClick={() => { onKeep(chosen); setPicked(new Set()); }}>
                  {`${t.keep} · ${plural(t, 'photos', chosen.length)}`}
                </Button>
              </div>
            </>
          ) : (
            <Button full size="lg" onClick={() => onReview(list)}>{`${t.reviewBlurry} · ${plural(t, 'photos', list.length)} · ${bytes(t, total)}`}</Button>
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
