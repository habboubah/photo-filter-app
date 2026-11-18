import { useMemo } from 'react';
import { Images } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { likeThis } from '../logic/search';
import type { Vectors } from '../logic/vectors';
import { LARGE } from '../thumbs';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { PhotoGrid, Thumb } from '../ui/Photo';

/**
 * Ähnliche Fotos: the photos most like one photo, from every year
 * (src/logic/search.ts likeThis, the AI's vectors) — the same document
 * photographed five times, the same view every summer. A tap on one shows the
 * photos like that one; "Durchgehen" reviews them.
 */
export function LikeView({ t, id, vectors, byId, onBack, onOpen, onReview }: {
  t: Strings;
  id: string;
  vectors: Vectors;
  byId: Map<string, Photo>;
  onBack: () => void;
  onOpen: (id: string) => void;
  onReview: (ids: string[]) => void;
}) {
  // No screenshots or screen recordings: they have their own list.
  const ids = useMemo(
    () => likeThis(vectors, id, other => { const p = byId.get(other); return !!p && !p.shot && !p.rec; }).map(h => h.id),
    [vectors, id, byId],
  );
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
        ? <PhotoGrid ids={ids} columns={3} label={date} onOpen={onOpen} />
        : <Empty icon={Images} tone="accent" title={t.likeNone} body={t.likeNoneBody} back={{ label: t.back, onClick: onBack }} />}
      {ids.length > 0 && (
        <Dock>
          <Button full size="lg" onClick={() => onReview(ids)}>{fmt(t.searchReview, { photos: plural(t, 'photos', ids.length) })}</Button>
        </Dock>
      )}
    </Screen>
  );
}
