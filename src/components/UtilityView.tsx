import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Archive, Check } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { groupUtility, type UtilityLabel } from '../logic/ai';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { SelectBar } from '../ui/SelectBar';
import { ZoomView } from '../ui/Zoom';
import { tapLight } from '../ui/haptics';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/**
 * The utility photos the on-device AI found (src/logic/ai.ts): receipts,
 * documents, QR codes, photos of screens … newest first, filtered by what the
 * AI took them for, and "Go through" into the review. A tap opens a photo
 * large; its circle picks it, and the picked ones go to "Zum Löschen
 * vorgemerkt" at once. The AI only suggests: nothing is deleted without the
 * bin's sheet and the system's own dialog.
 */
export function UtilityView({ t, photos, progress, sort, onSort, onBack, onReview, onAside, onKeep }: {
  t: Strings;
  /** Already without kept photos and favourites, newest first (findUtility). */
  photos: Photo[];
  /** How far the AI's pass got, for the hint while it runs. */
  progress: { seen: number; total: number };
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
  /** The picked photos into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
  /** The picked photos kept: off this list, never suggested again (undo in the toast). */
  onKeep: (photos: Photo[]) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setPicked(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const groups = groupUtility(photos);
  const [filter, setFilter] = useState<UtilityLabel | 'all'>('all');
  const shown = sortPhotos(filter === 'all' ? photos : groups.find(g => g.label === filter)?.photos ?? [], sort);
  const byId = new Map(shown.map(p => [p.id, p]));
  const total = shown.reduce((s, p) => s + p.bytes, 0);
  const checking = progress.total > 0 && progress.seen < progress.total;
  const chosen = shown.filter(p => picked.has(p.id));
  const chosenBytes = chosen.reduce((s, p) => s + p.bytes, 0);
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen title={t.utilityTitle} subtitle={`${plural(t, 'photos', shown.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.utilityIntro }} docked={shown.length > 0}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}>
      {checking && (
        <p className="text-caption text-fg-mute px-1 num" aria-live="polite">
          {fmt(t.utilityChecking, { seen: num(t, progress.seen), total: num(t, progress.total) })}
        </p>
      )}
      {groups.length > 1 && (
        <div role="radiogroup" aria-label={t.utilityTitle} className="flex gap-2 overflow-x-auto -mx-[16px] px-[16px] pb-1">
          {[{ label: 'all' as const, count: photos.length }, ...groups.map(g => ({ label: g.label, count: g.photos.length }))].map(o => (
            <button
              key={o.label} type="button" role="radio" aria-checked={o.label === filter}
              onClick={() => { tapLight(); setFilter(o.label); }}
              className={`shrink-0 min-h-[44px] px-4 rounded-full text-label font-bold num transition-colors focus-visible:ring-focus ${
                o.label === filter ? 'bg-accent-fill text-accent-fill-ink' : 'bg-surface-2 text-fg'}`}
            >
              {`${o.label === 'all' ? t.filterAll : t[`aiLabel_${o.label}`]} · ${num(t, o.count)}`}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? <Empty title={t.noUtility} body={t.noUtilityBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
          <SelectBar
            text={chosen.length ? plural(t, 'binPicked', chosen.length) : t.selectHint}
            all={chosen.length === shown.length} none={chosen.length === 0}
            onAll={() => setPicked(old => new Set([...old, ...shown.map(p => p.id)]))} onNone={() => setPicked(new Set())}
            labels={{ all: t.pickAll, none: t.pickNone }}
          />
          <PhotoGrid
            ids={shown.map(p => p.id)}
            columns={4}
            label={when}
            onOpen={setOpen}
            selected={picked} onSelect={toggle}
            selectLabel={id => fmt(t.selectTile, { item: when(id) })}
          />
        </>
      )}
      {shown.length > 0 && (
        <Dock>
          {chosen.length > 0 ? (
            // Into "Zum Löschen vorgemerkt": nothing is deleted here, so teal and the archive, never red.
            <div className="grid gap-1">
              <Button full size="lg" icon={Archive} onClick={() => { onAside(chosen); setPicked(new Set()); }}>
                {`${t.aside} · ${plural(t, 'photos', chosen.length)} · ${bytes(t, chosenBytes)}`}
              </Button>
              {/* Not junk after all: off the list for good, like "Alle behalten" on the groups. */}
              <Button full variant="ghost" icon={Check} onClick={() => { onKeep(chosen); setPicked(new Set()); }}>
                {`${t.keep} · ${plural(t, 'photos', chosen.length)}`}
              </Button>
            </div>
          ) : (
            <Button full size="lg" onClick={() => onReview(shown)}>{`${t.reviewUtility} · ${plural(t, 'photos', shown.length)} · ${bytes(t, total)}`}</Button>
          )}
        </Dock>
      )}
      <AnimatePresence>
        {open && byId.has(open) && (
          <ZoomView
            key="zoom" id={open} alt={when(open)}
            labels={{ close: t.close, zoomIn: t.zoomIn, zoomOut: t.zoomOut, hint: t.zoomHint }}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </Screen>
  );
}
