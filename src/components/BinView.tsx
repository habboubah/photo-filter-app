import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Trash2, Undo2 } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, plural } from '../translations';
import { duration } from '../logic/large';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';

/**
 * "Zum Löschen" [To delete] (src/logic/bin.ts): what the user chose to delete,
 * waiting — nothing of it is deleted yet. The last put aside first. A tap
 * selects a photo to put back (it returns to its group and every count);
 * with nothing selected, the Dock deletes them all, through the system's
 * dialog, into Recently Deleted / the Trash, or goes through them once more.
 */
export function BinView({ t, photos, onBack, onRestore, onDelete, onReview }: {
  t: Strings;
  photos: Photo[];
  onBack: () => void;
  /** Put back: out of the bin, into their groups again. */
  onRestore: (ids: string[]) => void;
  /** Deleted for real (the system's dialog). */
  onDelete: (ids: string[]) => void;
  /** Gone through one by one: swiped right goes back, swiped left is deleted at the end. */
  onReview: (ids: string[]) => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  const byId = useMemo(() => new Map(photos.map(p => [p.id, p])), [photos]);
  // A photo that left the bin (deleted, put back elsewhere) leaves the selection too.
  const picked = photos.filter(p => chosen.has(p.id));
  const total = photos.reduce((s, p) => s + p.bytes, 0);
  const pickedBytes = picked.reduce((s, p) => s + p.bytes, 0);
  const videos = photos.some(p => p.video);
  const toggle = (id: string) => setChosen(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const count = (list: Photo[]) => (list.some(p => p.video) ? plural(t, 'files', list.length) : plural(t, 'photos', list.length));
  const ids = (list: Photo[]) => list.map(p => p.id);

  return (
    <Screen
      title={t.binTitle} subtitle={photos.length ? `${count(photos)} · ${bytes(t, total)}` : undefined}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.binIntro }} docked={photos.length > 0}
    >
      {photos.length === 0 ? <Empty emoji="🗑️" title={t.binEmpty} body={t.binEmptyBody} /> : (
        <>
          <p className="px-1 pb-3 text-label text-fg-mute wrap-prose">{picked.length ? plural(t, 'binPicked', picked.length) : t.binTapHint}</p>
          <PhotoGrid
            ids={ids(photos)}
            label={id => { const p = byId.get(id)!; return `${when(p)}, ${bytes(t, p.bytes)}, ${chosen.has(id) ? t.selected : t.notSelected}`; }}
            onOpen={toggle}
            overlay={id => {
              const on = chosen.has(id);
              const p = byId.get(id)!;
              return (
                <>
                  {!on && <span aria-hidden="true" className="absolute inset-0 bg-veil opacity-40" />}
                  <span aria-hidden="true" className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-surface inline-flex items-center justify-center">
                    {on ? <CheckCircle2 className="w-6 h-6 text-accent" /> : <Circle className="w-6 h-6 text-fg-faint" />}
                  </span>
                  <span aria-hidden="true" className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold num">
                    {p.video ? `${duration(p.dur ?? 0)} · ${bytes(t, p.bytes)}` : bytes(t, p.bytes)}
                  </span>
                </>
              );
            }}
          />
        </>
      )}
      {photos.length > 0 && (
        <Dock>
          {picked.length ? (
            <>
              <Button full size="lg" icon={Undo2} onClick={() => { onRestore(ids(picked)); setChosen(new Set()); }}>
                {`${t.binRestore} · ${count(picked)}`}
              </Button>
              <Button full variant="ghost" className="mt-1 !text-neg" onClick={() => { onDelete(ids(picked)); setChosen(new Set()); }}>
                {`${t.binDeleteOnly} · ${bytes(t, pickedBytes)}`}
              </Button>
            </>
          ) : (
            <>
              <Button full size="lg" variant="destructive" icon={Trash2} onClick={() => onDelete(ids(photos))}>
                {`${videos ? plural(t, 'deleteFilesN', photos.length) : plural(t, 'deleteN', photos.length)} · ${bytes(t, total)}`}
              </Button>
              <Button full variant="ghost" className="mt-1" onClick={() => onReview(ids(photos))}>{t.binReview}</Button>
            </>
          )}
        </Dock>
      )}
    </Screen>
  );
}
