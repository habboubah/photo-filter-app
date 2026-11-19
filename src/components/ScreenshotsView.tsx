import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { olderThan, type Age } from '../logic/age';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { AgeFilter, MarkButton, Opened, PickBar, gridPick, usePick } from '../ui/pick';
import { PhotoGrid } from '../ui/Photo';
import { sortPhotos, type SortKey } from '../logic/sort';
import { SortButton } from './SortButton';

/**
 * The screenshots, newest first unless sorted otherwise; all of them by
 * default, or only those older than one, three or six months (AgeFilter,
 * 19 November 2026; before, *Älter als 30 Tage* first). A tap opens one large;
 * *Auswählen* picks (src/ui/pick.tsx), and the picked ones go to "Zum Löschen vorgemerkt" at once.
 */
export function ScreenshotsView({ t, photos, now, sort, onSort, onBack, onReview, onAside, onKeep }: {
  t: Strings;
  photos: Photo[];
  now: number;
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
  /** The picked screenshots into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
  /** The picked photos kept: off this list, never suggested again (undo in the toast). */
  onKeep: (photos: Photo[]) => void;
}) {
  const [age, setAge] = useState<Age>('all');
  const [open, setOpen] = useState<string | null>(null);
  const list = sortPhotos(olderThan(photos, age, now), sort);
  const byId = new Map(list.map(p => [p.id, p]));
  const total = list.reduce((s, p) => s + p.bytes, 0);
  const pick = usePick(list);
  const chosen = pick.chosen;
  const when = (id: string) => new Date(byId.get(id)!.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen title={t.screenshotsTitle} subtitle={`${plural(t, 'photos', list.length)} · ${bytes(t, total)}`} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.screenshotsIntro }} docked={list.length > 0}>
      {photos.length > 0 && <PickBar t={t} pick={pick} list={list} count={n => plural(t, 'binPicked', n)} sort={<SortButton inline t={t} value={sort} onChange={onSort} />} filter={<AgeFilter t={t} label={t.screenshotsTitle} value={age} onChange={setAge} />} />}
      {list.length === 0 ? <Empty title={t.noScreenshots} body={t.noScreenshotsBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
        <PhotoGrid
          ids={list.map(p => p.id)}
          columns={4}
          label={when}
          {...gridPick(pick, setOpen, id => fmt(t.selectTile, { item: when(id) }))}
        />
        </>
      )}
      {list.length > 0 && (
        <Dock>
          {pick.selecting ? (
            <>{/* Into "Zum Löschen vorgemerkt": red by Ahmad's choice, but the archive: nothing is deleted here (src/ui/pick.tsx). */}
              <div className="grid gap-1">
                <MarkButton t={t} photos={chosen} count={l => plural(t, 'photos', l.length)} onClick={() => { onAside(chosen); pick.select(false); }} />
                {/* Not junk after all: off the list for good, like "Alle behalten" on the groups. */}
                {chosen.length > 0 && (
                  <Button full variant="ghost" icon={Check} onClick={() => { onKeep(chosen); pick.select(false); }}>
                    {`${t.keep} · ${plural(t, 'photos', chosen.length)}`}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Button full size="lg" onClick={() => onReview(list)}>{`${t.reviewScreenshots} · ${plural(t, 'photos', list.length)} · ${bytes(t, total)}`}</Button>
          )}
        </Dock>
      )}
      <Opened t={t} photo={open ? byId.get(open) ?? null : null} alt={open && byId.has(open) ? when(open) : ''} onClose={() => setOpen(null)} onAside={p => onAside([p])} />
    </Screen>
  );
}
