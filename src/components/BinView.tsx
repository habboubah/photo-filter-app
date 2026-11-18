import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Trash2, Undo2 } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, num, plural } from '../translations';
import { duration } from '../logic/large';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid, Thumb } from '../ui/Photo';
import { Sheet } from '../ui/Sheet';
import { SafetyNets } from './SafetyNets';

/** How many photos the delete sheet draws; the last tile counts the rest. */
const SHEET_TILES = 48;

/**
 * "Zum Löschen vorgemerkt" [Marked for deletion] (src/logic/bin.ts): what the user marked,
 * waiting — nothing of it is deleted yet. The last put aside first. A tap
 * selects a photo to put back (it returns to its group and every count);
 * with nothing selected, the Dock deletes them all, or goes through them once
 * more. Deleting is the one red action of the app: it first shows exactly
 * what goes and how much space it frees (a sheet that cancels with one tap),
 * then the system's own dialog moves it to the Trash / Recently Deleted.
 */
export function BinView({ t, photos, safetySeen, onSafetySeen, onBack, onRestore, onDelete, onReview }: {
  t: Strings;
  photos: Photo[];
  /** The three safety nets were explained (once, before the first real delete: docs/DESIGN.md, "The first run"). */
  safetySeen: boolean;
  onSafetySeen: () => void;
  onBack: () => void;
  /** Put back: out of the bin, into their groups again. */
  onRestore: (ids: string[]) => void;
  /** Deleted for real (the system's dialog). */
  onDelete: (ids: string[]) => void;
  /** Gone through one by one: swiped right goes back, swiped left is deleted at the end. */
  onReview: (ids: string[]) => void;
}) {
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = useState<Photo[] | null>(null);
  const byId = useMemo(() => new Map(photos.map(p => [p.id, p])), [photos]);
  // A photo that left the bin (deleted, put back elsewhere) leaves the selection too.
  const picked = photos.filter(p => chosen.has(p.id));
  const total = photos.reduce((s, p) => s + p.bytes, 0);
  const pickedBytes = picked.reduce((s, p) => s + p.bytes, 0);
  const toggle = (id: string) => setChosen(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const count = (list: Photo[]) => (list.some(p => p.video) ? plural(t, 'files', list.length) : plural(t, 'photos', list.length));
  const deleteLabel = (list: Photo[]) => (list.some(p => p.video) ? plural(t, 'deleteFilesN', list.length) : plural(t, 'deleteN', list.length));
  const ids = (list: Photo[]) => list.map(p => p.id);
  const sheetBytes = confirm?.reduce((s, p) => s + p.bytes, 0) ?? 0;

  return (
    <Screen
      title={t.binTitle} subtitle={photos.length ? `${count(photos)} · ${bytes(t, total)}` : undefined}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.binIntro }} docked={photos.length > 0}
    >
      {photos.length === 0 ? <Empty emoji="📦" title={t.binEmpty} body={t.binEmptyBody} /> : (
        <>
          <p data-tip="tip.binScreen" className="px-1 pb-3 text-label text-fg-mute wrap-prose" aria-live="polite">{picked.length ? plural(t, 'binPicked', picked.length) : t.binTapHint}</p>
          <PhotoGrid
            ids={ids(photos)}
            label={id => { const p = byId.get(id)!; return `${when(p)}, ${bytes(t, p.bytes)}, ${chosen.has(id) ? t.selected : t.notSelected}`; }}
            onOpen={toggle}
            overlay={id => {
              const on = chosen.has(id);
              const p = byId.get(id)!;
              return (
                <>
                  {on && <span aria-hidden="true" className="absolute inset-0 rounded-[8px] ring-[3px] ring-inset ring-accent" />}
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
              <Button full variant="ghost" className="mt-1 !text-neg" onClick={() => setConfirm(picked)}>
                {`${t.binDeleteOnly} · ${bytes(t, pickedBytes)}`}
              </Button>
            </>
          ) : (
            <>
              <Button full size="lg" variant="destructive" icon={Trash2} onClick={() => setConfirm(photos)}>
                {`${deleteLabel(photos)} · ${bytes(t, total)}`}
              </Button>
              <Button full variant="ghost" className="mt-1" onClick={() => onReview(ids(photos))}>{t.binReview}</Button>
            </>
          )}
        </Dock>
      )}

      {/* Before the system's dialog: exactly what goes, and how much space it frees. Cancel is one tap (or a swipe down). */}
      <Sheet open={!!confirm} title={confirm ? (safetySeen ? deleteLabel(confirm) : t.safetyTitle) : ''} closeLabel={t.cancel} onClose={() => setConfirm(null)}>
        {/* The first time, before anything red: what stands between a mark and a photo that is really gone. */}
        {confirm && !safetySeen && <SafetyNets t={t} onContinue={onSafetySeen} />}
        {confirm && safetySeen && (
          <div className="space-y-4 pb-1">
            <p className="text-body text-fg num wrap-prose">{`${count(confirm)} · ${bytes(t, sheetBytes)}`}</p>
            <div className="grid grid-cols-6 gap-[3px]" role="list" aria-label={count(confirm)}>
              {confirm.slice(0, SHEET_TILES).map((p, i) => (
                <div key={p.id} role="listitem" aria-label={`${when(p)}, ${bytes(t, p.bytes)}`} className="relative aspect-square rounded-[6px] overflow-hidden">
                  <Thumb id={p.id} className="!rounded-none" />
                  {i === SHEET_TILES - 1 && confirm.length > SHEET_TILES && (
                    <span className="absolute inset-0 bg-veil text-on-color text-caption font-bold num inline-flex items-center justify-center">+{num(t, confirm.length - SHEET_TILES + 1)}</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-label text-fg-mute wrap-prose">{`${t.deleteHint} ${t.deleteSystemNext}`}</p>
            <div className="grid gap-2 pt-1">
              <Button full size="lg" variant="destructive" icon={Trash2} onClick={() => { const list = confirm; setConfirm(null); setChosen(new Set()); onDelete(ids(list)); }}>
                {`${deleteLabel(confirm)} · ${bytes(t, sheetBytes)}`}
              </Button>
              <Button full size="lg" variant="secondary" className="!shadow-none glass-flat !text-fg" onClick={() => setConfirm(null)}>{t.cancel}</Button>
            </div>
          </div>
        )}
      </Sheet>
    </Screen>
  );
}
