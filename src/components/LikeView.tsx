import { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { likeThis } from '../logic/search';
import type { Vectors } from '../logic/vectors';
import { LARGE } from '../thumbs';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid, Thumb } from '../ui/Photo';
import { MarkButton, Opened, PickBar, gridPick, usePick } from '../ui/pick';

/**
 * Ähnliche Fotos: the photos most like one photo, from every year
 * (src/logic/search.ts likeThis, the AI's vectors) — the same document
 * photographed five times, the same view every summer. A tap opens one large,
 * with *Ähnliche Fotos zeigen* for the photos like that one; *Auswählen* picks
 * (src/ui/pick.tsx); "Durchgehen" reviews them.
 */
export function LikeView({ t, id, vectors, byId, onBack, onOpen, onReview, onAside }: {
  t: Strings;
  id: string;
  vectors: Vectors;
  byId: Map<string, Photo>;
  onBack: () => void;
  onOpen: (id: string) => void;
  onReview: (ids: string[]) => void;
  /** Into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
}) {
  // No screenshots or screen recordings: they have their own list.
  const ids = useMemo(
    () => likeThis(vectors, id, other => { const p = byId.get(other); return !!p && !p.shot && !p.rec; }).map(h => h.id),
    [vectors, id, byId],
  );
  const photos = useMemo(() => ids.flatMap(x => byId.get(x) ?? []), [ids, byId]);
  const pick = usePick(photos);
  const [open, setOpen] = useState<string | null>(null);
  const size = ids.reduce((s, x) => s + (byId.get(x)?.bytes ?? 0), 0);
  const date = (x: string) => new Date(byId.get(x)?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen
      title={t.likeTitle} subtitle={ids.length ? `${plural(t, 'photos', ids.length)} · ${bytes(t, size)}` : undefined}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.likeIntro }} docked={ids.length > 0}
    >
      <figure className="relative rounded-lg overflow-hidden card">
        <div className="aspect-[4/3]"><Thumb id={id} size={LARGE} alt={date(id)} className="!rounded-none" /></div>
        <figcaption className="absolute bottom-3 start-3 px-2.5 py-1 rounded-full bg-veil text-on-color text-caption font-bold">
          {`${t.likeThis} · ${date(id)}`}
        </figcaption>
      </figure>
      {ids.length
        ? <><PickBar t={t} pick={pick} list={photos} count={n => plural(t, 'binPicked', n)} /><PhotoGrid ids={ids} columns={3} label={date} {...gridPick(pick, setOpen, x => fmt(t.selectTile, { item: date(x) }))} /></>
        : <Empty icon={Images} tone="accent" title={t.likeNone} body={t.likeNoneBody} back={{ label: t.back, onClick: onBack }} />}
      {ids.length > 0 && (
        <Dock>
          {pick.selecting
            ? <MarkButton t={t} photos={pick.chosen} count={l => plural(t, 'photos', l.length)} onClick={() => { onAside(pick.chosen); pick.select(false); }} />
            : <Button full size="lg" onClick={() => onReview(ids)}>{fmt(t.searchReview, { photos: plural(t, 'photos', ids.length) })}</Button>}
        </Dock>
      )}
      <Opened t={t} photo={open ? byId.get(open) ?? null : null} alt={open ? date(open) : ''} onClose={() => setOpen(null)} onAside={p => onAside([p])} onLike={p => onOpen(p.id)} />
    </Screen>
  );
}
