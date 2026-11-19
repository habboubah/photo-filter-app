import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Archive, CheckCircle2, Circle, History, Trash2, Undo2 } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, plural } from '../translations';
import { duration } from '../logic/large';
import { Dock, Empty, IconTile, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { PickBar, usePick } from '../ui/pick';
import { ZoomView } from '../ui/Zoom';
import { usePlayer } from '../ui/play';
import { DeleteSheet } from './DeleteSheet';
import { SafetyNets } from './SafetyNets';

/**
 * "Zum Löschen vorgemerkt" [Marked for deletion] (src/logic/bin.ts): a review
 * tray (docs/ux-research.md, idea C) — what the user marked, waiting, nothing
 * of it deleted yet. The last put aside first, every photo in view.
 *
 * As in Photos, *Auswählen* in the bar switches what a tap does: off, it opens
 * the photo large (a video plays); on, it picks it. Off, the Dock offers
 * *Alle löschen* (red) and *Fotos durchgehen* (one by one); on, *Ausgewählte
 * löschen* (red) and *Zurücklegen* (back into their groups and every count).
 * The Dock never deletes by itself: both red buttons open the one sheet that
 * shows exactly what goes and how much space it frees (DeleteSheet), and only
 * that sheet's button deletes — then the system's own dialog moves it to the
 * Trash / Recently Deleted. Under the grid (and on the empty screen) a quiet
 * card says how to get a deleted photo back there — the iPhone's and
 * Android's own way (`binRestoreHelp` has an Android twin).
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
  const pick = usePick(photos);
  const selecting = pick.selecting;
  const [open, setOpen] = useState<string | null>(null);
  const player = usePlayer();
  const [confirm, setConfirm] = useState<Photo[] | null>(null);
  const byId = useMemo(() => new Map(photos.map(p => [p.id, p])), [photos]);
  // A photo that left the bin (deleted, put back elsewhere) leaves the selection too.
  const picked = pick.chosen;
  const total = photos.reduce((s, p) => s + p.bytes, 0);
  const pickedBytes = pick.chosenBytes;
  const toggle = pick.toggle;
  const chosen = pick.picked;
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const count = (list: Photo[]) => (list.some(p => p.video) ? plural(t, 'files', list.length) : plural(t, 'photos', list.length));
  const ids = (list: Photo[]) => list.map(p => p.id);
  const select = pick.select;
  // Out of select mode a tap looks: a photo opens large, a video plays in the app's window.
  const look = (id: string) => { if (byId.get(id)?.video && player) player.play(id); else setOpen(id); };

  return (
    <Screen
      title={t.binTitle} subtitle={photos.length ? `${count(photos)} · ${bytes(t, total)}` : undefined}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.binIntro }} docked={photos.length > 0}
    >
      {photos.length === 0 ? <Empty icon={Archive} tone="accent" title={t.binEmpty} body={t.binEmptyBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
          <PickBar t={t} pick={pick} list={photos} hint={t.binTapHint} count={n => plural(t, 'binPicked', n)} tip="tip.binScreen" />
          <PhotoGrid
            ids={ids(photos)}
            label={id => { const p = byId.get(id)!; return `${when(p)}, ${bytes(t, p.bytes)}${selecting ? `, ${chosen.has(id) ? t.selected : t.notSelected}` : ''}`; }}
            onOpen={selecting ? toggle : look}
            overlay={id => {
              const on = chosen.has(id);
              const p = byId.get(id)!;
              return (
                <>
                  {selecting && on && <span aria-hidden="true" className="absolute inset-0 rounded-[8px] ring-[3px] ring-inset ring-accent" />}
                  {selecting && (
                    <span aria-hidden="true" className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-surface inline-flex items-center justify-center">
                      {on ? <CheckCircle2 className="w-6 h-6 text-accent" /> : <Circle className="w-6 h-6 text-fg-faint" />}
                    </span>
                  )}
                  <span aria-hidden="true" className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold num">
                    {p.video ? `${duration(p.dur ?? 0)} · ${bytes(t, p.bytes)}` : bytes(t, p.bytes)}
                  </span>
                </>
              );
            }}
          />
        </>
      )}
      {/* How a photo deleted from here comes back: Recently Deleted (iPhone) / the Trash (Android), 30 days. */}
      <div className="rounded-md card p-4 flex items-start gap-3">
        <IconTile icon={History} hue="mint" />
        <div className="min-w-0 flex-1">
          <p className="text-label font-bold text-fg">{t.binRestoreTitle}</p>
          <p className="text-caption text-fg-mute wrap-prose">{t.binRestoreHelp}</p>
        </div>
      </div>
      {photos.length > 0 && (
        <Dock>
          {/* Red: both lead to deleting (after the sheet that shows exactly what goes, and the system's dialog). */}
          {selecting ? (
            <>
              <Button full size="lg" variant="destructive" icon={Trash2} disabled={!picked.length} onClick={() => setConfirm(picked)}>
                {picked.length ? `${t.binDeleteSelected} · ${count(picked)} · ${bytes(t, pickedBytes)}` : t.binDeleteSelected}
              </Button>
              {picked.length > 0 && (
                <Button full variant="ghost" className="mt-1" icon={Undo2} onClick={() => { onRestore(ids(picked)); select(false); }}>
                  {`${t.binRestore} · ${count(picked)}`}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button full size="lg" variant="destructive" icon={Trash2} onClick={() => setConfirm(photos)}>
                {`${t.binDeleteAll} · ${count(photos)} · ${bytes(t, total)}`}
              </Button>
              <Button full variant="ghost" className="mt-1" onClick={() => onReview(ids(photos))}>{t.binReview}</Button>
            </>
          )}
        </Dock>
      )}

      {/* Before the system's dialog: exactly what goes, and how much space it frees (DeleteSheet). The first time,
          before anything red: what stands between a mark and a photo that is really gone. */}
      <DeleteSheet
        t={t} photos={confirm}
        before={safetySeen ? undefined : { title: t.safetyTitle, body: <SafetyNets t={t} onContinue={onSafetySeen} /> }}
        onConfirm={list => { setConfirm(null); select(false); onDelete(ids(list)); }}
        onCancel={() => setConfirm(null)}
      />
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
