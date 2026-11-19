import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { groupUtility, type UtilityLabel } from '../logic/ai';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { FilterMenu } from '../ui/Controls';
import { MarkButton, Opened, PickBar, gridPick, usePick } from '../ui/pick';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/**
 * The utility photos the on-device AI found (src/logic/ai.ts): receipts,
 * documents, QR codes, photos of screens … newest first, filtered by what the
 * AI took them for (a pill beside the order, *Alle* first), and "Go
 * through" into the review. A tap opens a photo
 * large; *Auswählen* picks (src/ui/pick.tsx), and the picked ones go to "Zum Löschen
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
  const groups = groupUtility(photos);
  const [filter, setFilter] = useState<UtilityLabel | 'all'>('all');
  const shown = sortPhotos(filter === 'all' ? photos : groups.find(g => g.label === filter)?.photos ?? [], sort);
  const byId = new Map(shown.map(p => [p.id, p]));
  const total = shown.reduce((s, p) => s + p.bytes, 0);
  const checking = progress.total > 0 && progress.seen < progress.total;
  const pick = usePick(shown);
  const chosen = pick.chosen;
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen title={t.utilityTitle} subtitle={`${plural(t, 'photos', shown.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.utilityIntro }} docked={shown.length > 0}>
      {checking && (
        <p className="text-caption text-fg-mute px-1 num" aria-live="polite">
          {fmt(t.utilityChecking, { seen: num(t, progress.seen), total: num(t, progress.total) })}
        </p>
      )}
      {photos.length > 0 && <PickBar t={t} pick={pick} list={shown} count={n => plural(t, 'binPicked', n)} sort={<SortButton inline t={t} value={sort} onChange={onSort} />} filter={groups.length > 1 && <FilterMenu label={t.utilityTitle} value={filter} onChange={setFilter} options={[{ value: 'all' as const, label: `${t.filterAll} · ${num(t, photos.length)}` }, ...groups.map(g => ({ value: g.label, label: `${t[`aiLabel_${g.label}`]} · ${num(t, g.photos.length)}` }))]} />} />}
      {shown.length === 0 ? <Empty title={t.noUtility} body={t.noUtilityBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
          <PhotoGrid
            ids={shown.map(p => p.id)}
            columns={4}
            label={when}
            {...gridPick(pick, setOpen, id => fmt(t.selectTile, { item: when(id) }))}
          />
        </>
      )}
      {shown.length > 0 && (
        <Dock>
          {pick.selecting ? (
            // Into "Zum Löschen vorgemerkt": red by Ahmad's choice, but the archive: nothing is deleted here (src/ui/pick.tsx).
            <div className="grid gap-1">
              <MarkButton t={t} photos={chosen} count={l => plural(t, 'photos', l.length)} onClick={() => { onAside(chosen); pick.select(false); }} />
              {/* Not junk after all: off the list for good, like "Alle behalten" on the groups. */}
              {chosen.length > 0 && (
                <Button full variant="ghost" icon={Check} onClick={() => { onKeep(chosen); pick.select(false); }}>
                  {`${t.keep} · ${plural(t, 'photos', chosen.length)}`}
                </Button>
              )}
            </div>
          ) : (
            <Button full size="lg" onClick={() => onReview(shown)}>{`${t.reviewUtility} · ${plural(t, 'photos', shown.length)} · ${bytes(t, total)}`}</Button>
          )}
        </Dock>
      )}
      <Opened t={t} photo={open ? byId.get(open) ?? null : null} alt={open && byId.has(open) ? when(open) : ''} onClose={() => setOpen(null)} onAside={p => onAside([p])} />
    </Screen>
  );
}
