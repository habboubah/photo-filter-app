import { useMemo, useState } from 'react';
import { Archive, CheckCircle2, Circle, ListChecks, Trash2, Undo2 } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, plural } from '../translations';
import { duration } from '../logic/large';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid } from '../ui/Photo';
import { SelectBar } from '../ui/SelectBar';
import { DeleteSheet } from './DeleteSheet';
import { SafetyNets } from './SafetyNets';

/**
 * "Zum Löschen vorgemerkt" [Marked for deletion] (src/logic/bin.ts): a review
 * tray (docs/ux-research.md, idea C) — what the user marked, waiting, nothing
 * of it deleted yet. The last put aside first, every photo in view. A tap
 * selects a photo to put back (it returns to its group and every count). The
 * Dock never deletes: *Auswahl prüfen* opens the one sheet that shows exactly
 * what goes and how much space it frees (DeleteSheet), and only that sheet's
 * red button deletes — then the system's own dialog moves it to the Trash /
 * Recently Deleted. *Noch einmal durchgehen* reviews them one by one.
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
  const ids = (list: Photo[]) => list.map(p => p.id);

  return (
    <Screen
      title={t.binTitle} subtitle={photos.length ? `${count(photos)} · ${bytes(t, total)}` : undefined}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.binIntro }} docked={photos.length > 0}
    >
      {photos.length === 0 ? <Empty icon={Archive} tone="accent" title={t.binEmpty} body={t.binEmptyBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
          <SelectBar
            tip="tip.binScreen" text={picked.length ? plural(t, 'binPicked', picked.length) : t.binTapHint}
            all={picked.length === photos.length} none={picked.length === 0}
            onAll={() => setChosen(new Set(ids(photos)))} onNone={() => setChosen(new Set())}
            labels={{ all: t.pickAll, none: t.pickNone }}
          />
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
              {/* Red: this way leads to deleting them (after the sheet that shows exactly what goes, and the system's dialog). */}
              <Button full variant="ghost" className="mt-1 !text-neg" icon={Trash2} onClick={() => setConfirm(picked)}>
                {`${t.binDeleteThese} · ${bytes(t, pickedBytes)}`}
              </Button>
            </>
          ) : (
            <>
              <Button full size="lg" icon={ListChecks} onClick={() => setConfirm(photos)}>
                {`${t.binReviewSelection} · ${count(photos)} · ${bytes(t, total)}`}
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
        onConfirm={list => { setConfirm(null); setChosen(new Set()); onDelete(ids(list)); }}
        onCancel={() => setConfirm(null)}
      />
    </Screen>
  );
}
