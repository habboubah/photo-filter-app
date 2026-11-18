import { useState } from 'react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { groupUtility, type UtilityLabel } from '../logic/ai';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { tapLight } from '../ui/haptics';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/**
 * The utility photos the on-device AI found (src/logic/ai.ts): receipts,
 * documents, QR codes, photos of screens … newest first, filtered by what the
 * AI took them for, and "Go through" into the review. The AI only suggests:
 * nothing goes without the review and the system's own dialog.
 */
export function UtilityView({ t, photos, progress, sort, onSort, onBack, onReview }: {
  t: Strings;
  /** Already without kept photos and favourites, newest first (findUtility). */
  photos: Photo[];
  /** How far the AI's pass got, for the hint while it runs. */
  progress: { seen: number; total: number };
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
}) {
  const groups = groupUtility(photos);
  const [filter, setFilter] = useState<UtilityLabel | 'all'>('all');
  const shown = sortPhotos(filter === 'all' ? photos : groups.find(g => g.label === filter)?.photos ?? [], sort);
  const byId = new Map(shown.map(p => [p.id, p]));
  const total = shown.reduce((s, p) => s + p.bytes, 0);
  const checking = progress.total > 0 && progress.seen < progress.total;

  return (
    <Screen title={t.utilityTitle} subtitle={`${plural(t, 'photos', shown.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.utilityIntro }} docked={shown.length > 0}
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
        <PhotoGrid
          ids={shown.map(p => p.id)}
          columns={4}
          label={id => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' })}
        />
      )}
      {shown.length > 0 && (
        <Dock><Button full size="lg" onClick={() => onReview(shown)}>{`${t.reviewUtility} · ${plural(t, 'photos', shown.length)} · ${bytes(t, total)}`}</Button></Dock>
      )}
    </Screen>
  );
}
