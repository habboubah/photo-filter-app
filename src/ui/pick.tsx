import { useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { Archive } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes } from '../translations';
import { LARGE } from '../thumbs';
import { AGES, type Age } from '../logic/age';
import { FilterMenu } from './Controls';
import { Button } from './Button';
import { Thumb } from './Photo';
import { PlayOver } from './play';
import { SelectToggle } from './SelectBar';
import { tapLight } from './haptics';
import { Sheet } from './Sheet';
import { ZoomView } from './Zoom';

/**
 * Picking from a grid, the same on every screen that shows many photos (as in
 * Photos): *Auswählen* in the bar turns select mode on. Off, a tap opens a
 * photo large or a video in a sheet, where it can be marked for deletion on
 * its own; on, a tap picks it, the SelectBar shows, and the Dock's red
 * *Löschen vormerken* takes the picked ones (MarkButton). Leaving select mode
 * forgets the picks.
 */
export interface Pick {
  selecting: boolean;
  picked: ReadonlySet<string>;
  /** The picked photos still on the list, in its order. */
  chosen: Photo[];
  chosenBytes: number;
  toggle: (id: string) => void;
  /** These picked, the others not. */
  set: (ids: string[]) => void;
  select: (on: boolean) => void;
}

export function usePick(list: Photo[], start = false): Pick {
  const [selecting, setSelecting] = useState(start);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setPicked(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const select = (on: boolean) => { setSelecting(on); setPicked(new Set()); };
  // A photo that left the list (marked, kept, deleted) leaves the selection too.
  const chosen = selecting ? list.filter(p => picked.has(p.id)) : [];
  return { selecting, picked, chosen, chosenBytes: chosen.reduce((s, p) => s + p.bytes, 0), toggle, set: ids => setPicked(new Set(ids)), select };
}

/**
 * The row above a grid, under its filter (Ahmad, 19 November 2026: not in the
 * bar): the order (`sort`) and *Auswählen* on the end; while selecting, how
 * many are picked, *Alle auswählen* / *Alle abwählen* and *Fertig*.
 */
export function PickBar({ t, pick, list, hint, count, sort, filter, tip, canSelect = true }: {
  t: Strings;
  pick: Pick;
  list: Photo[];
  /** While nothing is picked (default: *Tippe Fotos an, um sie auszuwählen.*). */
  hint?: string;
  count: (n: number) => string;
  /** The sort menu (SortButton inline), shown while not selecting. */
  sort?: ReactNode;
  /** A filter pill (FilterMenu, AgeFilter) at the row's start, shown while not selecting — also when it leaves nothing. */
  filter?: ReactNode;
  /** A first-run tip on *Auswählen* (`data-tip`). */
  tip?: string;
  /** False where nothing can be done with picked photos (a category while albums are not offered): the order only. */
  canSelect?: boolean;
}) {
  if (!list.length && !filter) return null;
  const n = pick.chosen.length;
  const link = 'shrink-0 min-h-tap px-1 text-label font-bold text-accent focus-visible:ring-focus rounded-full press';
  return (
    <div className="flex items-center gap-x-3 gap-y-1 flex-wrap px-1 pb-1">
      {pick.selecting
        ? <p className="min-w-0 flex-1 basis-[6rem] text-label text-fg-mute wrap-prose" aria-live="polite">{n ? count(n) : hint ?? t.selectHint}</p>
        : filter}
      <div className="flex items-center gap-3 ms-auto">
        {pick.selecting && n > 0 && <button type="button" onClick={() => { tapLight(); pick.set([]); }} className={link}>{t.pickNone}</button>}
        {pick.selecting && n < list.length && <button type="button" onClick={() => { tapLight(); pick.set(list.map(p => p.id)); }} className={link}>{t.pickAll}</button>}
        {!pick.selecting && sort}
        {canSelect && list.length > 0 && <SelectToggle tip={tip} on={pick.selecting} onChange={pick.select} labels={{ select: t.selectMode, done: t.done }} />}
      </div>
    </div>
  );
}

/** What a PhotoGrid gets: selecting, a tap picks (the circle shows); otherwise a tap opens. */
export function gridPick(pick: Pick, open: (id: string) => void, selectLabel: (id: string) => string) {
  return pick.selecting
    ? { onOpen: pick.toggle, selected: pick.picked, onSelect: pick.toggle, selectLabel }
    : { onOpen: open };
}

/**
 * The red *Löschen vormerken* [Mark for deletion] (Ahmad's choice, 19 November
 * 2026: red like deleting, but the archive, never the trash — the photos only
 * go to "Zum Löschen vorgemerkt"). Grey while nothing is picked.
 */
export function MarkButton({ t, photos, count, label, onClick, approx }: {
  t: Strings;
  photos: Photo[];
  count: (list: Photo[]) => string;
  label?: string;
  onClick: () => void;
  approx?: boolean;
}) {
  const size = photos.reduce((s, p) => s + p.bytes, 0);
  const text = label ?? t.aside;
  return (
    <Button full size="lg" variant="destructive" icon={Archive} disabled={!photos.length} onClick={onClick}>
      {photos.length ? `${text} · ${count(photos)} · ${approx ? '≈ ' : ''}${bytes(t, size)}` : text}
    </Button>
  );
}

/**
 * A photo or video opened from a grid outside select mode: a photo large
 * (ZoomView), a video in a sheet where it plays in place. With `onAside` both
 * carry the red *Löschen vormerken* for this one file.
 */
export function Opened({ t, photo, alt, onClose, onAside, onLike }: {
  t: Strings;
  photo: Photo | null;
  alt: string;
  onClose: () => void;
  onAside?: (photo: Photo) => void;
  /** *Ähnliche Fotos zeigen* for this photo (search, Ähnliche Fotos). */
  onLike?: (photo: Photo) => void;
}) {
  const video = !!photo?.video;
  return (
    <>
      <AnimatePresence>
        {photo && !video && (
          <ZoomView
            key="zoom" id={photo.id} alt={alt} windowed
            labels={{ close: t.close, zoomIn: t.zoomIn, zoomOut: t.zoomOut, hint: t.zoomHint, like: t.likeOpen }}
            onLike={onLike ? () => { const p = photo; onClose(); onLike(p); } : undefined}
            action={onAside ? { label: t.aside, onClick: () => { const p = photo; onClose(); onAside(p); } } : undefined}
            onClose={onClose}
          />
        )}
      </AnimatePresence>
      <Sheet open={!!photo && video} title={t.videoBadge} closeLabel={t.close} onClose={onClose}>
        {photo && video && (
          <div className="space-y-4">
            <div className="relative aspect-video rounded-md overflow-hidden bg-surface-2">
              <Thumb id={photo.id} size={LARGE} alt={alt} className="!rounded-none !object-contain" />
              <PlayOver id={photo.id} />
            </div>
            <p className="text-label text-fg-mute num">{alt}</p>
            {onAside && (
              <>
                <MarkButton t={t} photos={[photo]} count={() => t.videoBadge} onClick={() => { const p = photo; onClose(); onAside(p); }} />
                <p className="text-caption text-fg-mute text-center wrap-prose -mt-2">{t.asideHint}</p>
              </>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}

/** *Alle* · *> 1 Monat* · *> 3 Monate* · *> 6 Monate* (src/logic/age.ts), a pill for PickBar's `filter`. */
export function AgeFilter({ t, value, onChange, label }: { t: Strings; value: Age; onChange: (age: Age) => void; label: string }) {
  const words: Record<Age, string> = { all: t.filterAll, 1: t.age1, 3: t.age3, 6: t.age6 };
  return <FilterMenu label={label} value={value} onChange={onChange} options={AGES.map(a => ({ value: a, label: words[a] }))} />;
}
