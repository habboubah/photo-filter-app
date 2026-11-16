import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { Check, Trash2, Undo2, X } from 'lucide-react';
import type { Confidence, Photo } from '../types';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { Decision, ReviewItem, Session, toDelete } from '../logic/review';
import { Button, IconButton } from '../ui/Button';
import { Thumb } from '../ui/Photo';
import { LARGE, thumbUrl } from '../thumbs';
import { notifyWarning, tapLight, tapMedium } from '../ui/haptics';

/** How far a card is dragged before it counts as a decision. */
const THRESHOLD = 110;

/**
 * A review: one photo at a time, swiped left to delete or right to keep (or
 * the two buttons, or the arrow keys), with undo. Nothing is deleted here;
 * the summary at the end offers "Delete N photos", which goes through the
 * system's own dialog.
 */
export function ReviewView({ t, session, finished, byId, debug, onDecide, onUndo, onFinish, onDelete, onClose }: {
  t: Strings;
  session: Session;
  finished: boolean;
  byId: Map<string, Photo>;
  debug: boolean;
  onDecide: (d: Decision) => void;
  onUndo: () => void;
  onFinish: () => void;
  onDelete: (ids: string[]) => void;
  onClose: () => void;
}) {
  const item = session.items[session.index];
  const done = finished || !item;

  // The next two photos are fetched before they are needed.
  useEffect(() => {
    for (const next of session.items.slice(session.index + 1, session.index + 3)) void thumbUrl(next.id, LARGE).catch(() => {});
  }, [session.index, session.items]);

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onDecide('delete');
      else if (e.key === 'ArrowRight') onDecide('keep');
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z') onUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, onDecide, onUndo]);

  return (
    <div className="min-h-screen mx-auto max-w-xl flex flex-col safe-top">
      <header className="px-[16px] min-h-[54px] grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2 items-center">
        <IconButton label={t.close} icon={X} tone="bar" onClick={onClose} />
        <p className="text-center text-label font-bold text-fg num" aria-live="polite">
          {done ? t.reviewDoneTitle : fmt(t.reviewProgress, { i: num(t, session.index + 1), n: num(t, session.items.length) })}
        </p>
        <IconButton label={t.undo} icon={Undo2} tone="bar" onClick={onUndo} disabled={!session.history.length} className={session.history.length ? '' : 'opacity-40'} />
      </header>
      {done
        ? <Summary t={t} session={session} byId={byId} onDelete={onDelete} onClose={onClose} />
        : (
          <>
            <div className="px-[16px] pt-1">
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-accent-fill rounded-full transition-[width] duration-300" style={{ width: `${(session.index / session.items.length) * 100}%` }} />
              </div>
            </div>
            <Card key={item.id} t={t} item={item} photo={byId.get(item.id)} debug={debug} onDecide={onDecide} />
            <div className="px-6 pb-safe-8 pt-3">
              <div className="flex justify-center gap-6">
                <RoundButton label={t.delete} tone="neg" icon={Trash2} onClick={() => onDecide('delete')} />
                <RoundButton label={t.keep} tone="keep" icon={Check} onClick={() => onDecide('keep')} />
              </div>
              <div className="flex justify-between items-center mt-4">
                <p className="text-caption text-fg-mute wrap-prose flex-1">{t.swipeHint}</p>
                <Button variant="ghost" onClick={onFinish}>{t.finishReview}</Button>
              </div>
            </div>
          </>
        )}
    </div>
  );
}

function Card({ t, item, photo, debug, onDecide }: {
  t: Strings; item: ReviewItem; photo?: Photo; debug: boolean; onDecide: (d: Decision) => void;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-10, 0, 10]);
  const delOpacity = useTransform(x, [-THRESHOLD, -20, 0], [1, 0, 0]);
  const keepOpacity = useTransform(x, [0, 20, THRESHOLD], [0, 0, 1]);
  const levelText: Record<Confidence, string> = { high: t.levelHigh, medium: t.levelMedium, low: t.levelLow };
  const reason = item.reason === 'best' ? t.reasonBest
    : item.reason === 'similar' ? t.reasonSimilar
      : item.reason === 'blurry' ? levelText[item.level ?? 'medium'] : '';
  const when = photo ? new Date(photo.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  const fling = (d: Decision) => {
    tapMedium();
    if (d === 'delete') notifyWarning();
    if (reduce) { onDecide(d); return; }
    void animate(x, d === 'delete' ? -window.innerWidth : window.innerWidth, { duration: 0.22, ease: [0.32, 0.72, 0, 1] })
      .then(() => onDecide(d));
  };

  return (
    <div className="flex-1 flex flex-col px-[16px] pt-4 min-h-0">
      <div className="flex items-center gap-2 pb-3">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-caption font-extrabold ${item.suggest === 'delete' ? 'bg-neg-dim text-neg' : 'bg-keep-dim text-keep'}`}>
          {item.suggest === 'delete' ? t.suggestDelete : t.suggestKeep}
        </span>
        {reason && <span className="text-caption text-fg-mute truncate">{reason}</span>}
      </div>
      <motion.div
        drag="x"
        dragSnapToOrigin
        dragElastic={0.9}
        style={{ x, rotate }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -THRESHOLD || info.velocity.x < -700) fling('delete');
          else if (info.offset.x > THRESHOLD || info.velocity.x > 700) fling('keep');
        }}
        className="relative flex-1 min-h-[300px] rounded-lg overflow-hidden bg-surface shadow-e2 touch-pan-y cursor-grab active:cursor-grabbing"
        role="img"
        aria-label={`${when}. ${item.suggest === 'delete' ? t.suggestDelete : t.suggestKeep}. ${reason}`}
      >
        <div className="absolute inset-0"><Thumb id={item.id} size={LARGE} className="!rounded-none !object-contain bg-surface-2" /></div>
        <motion.span style={{ opacity: delOpacity }} className="absolute top-6 end-6 px-4 py-2 rounded-[12px] border-[3px] border-neg bg-surface text-neg text-heading font-extrabold rotate-[8deg]" aria-hidden="true">
          {t.delete}
        </motion.span>
        <motion.span style={{ opacity: keepOpacity }} className="absolute top-6 start-6 px-4 py-2 rounded-[12px] border-[3px] border-keep bg-surface text-keep text-heading font-extrabold -rotate-[8deg]" aria-hidden="true">
          {t.keep}
        </motion.span>
        <span className="absolute bottom-3 start-3 px-2.5 py-1 rounded-full bg-veil text-on-color text-caption font-bold">{when}</span>
        {debug && photo && (
          <span className="absolute bottom-3 end-3 px-2 py-1 rounded-full bg-veil text-on-color text-micro font-bold num">
            {fmt(t.sharpnessDebug, { s: photo.sharp ?? '–', c: photo.contrast ?? '–' })}
          </span>
        )}
      </motion.div>
    </div>
  );
}

function RoundButton({ label, tone, icon: Icon, onClick }: { label: string; tone: 'neg' | 'keep'; icon: typeof Check; onClick: () => void }) {
  return (
    <button
      type="button" onClick={() => { tapLight(); onClick(); }} aria-label={label}
      className={`flex flex-col items-center gap-1.5 press focus-visible:ring-focus rounded-full`}
    >
      <span className={`w-[68px] h-[68px] rounded-full inline-flex items-center justify-center shadow-e2 ${tone === 'neg' ? 'bg-neg text-neg-ink' : 'bg-keep text-keep-ink'}`}>
        <Icon className="w-7 h-7" strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="text-caption font-bold text-fg">{label}</span>
    </button>
  );
}

function Summary({ t, session, byId, onDelete, onClose }: {
  t: Strings; session: Session; byId: Map<string, Photo>; onDelete: (ids: string[]) => void; onClose: () => void;
}) {
  const ids = toDelete(session);
  const size = ids.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);
  return (
    <main className="flex-1 flex flex-col px-6 pb-safe-8 pt-6">
      <h1 className="display text-title font-semibold text-fg">{t.reviewDoneTitle}</h1>
      <p className="text-body text-fg-mute mt-2 wrap-prose">
        {ids.length ? fmt(t.reviewDoneBody, { photos: plural(t, 'photos', ids.length), size: bytes(t, size) }) : t.reviewNothing}
      </p>
      {ids.length > 0 && (
        <div className="grid grid-cols-4 gap-[4px] mt-6">
          {ids.slice(0, 12).map(id => <div key={id} className="aspect-square"><Thumb id={id} /></div>)}
        </div>
      )}
      <div className="flex-1 min-h-8" />
      {ids.length > 0 && (
        <>
          <Button full size="lg" variant="destructive" icon={Trash2} onClick={() => onDelete(ids)}>{plural(t, 'deleteN', ids.length)}</Button>
          <p className="text-caption text-fg-mute text-center mt-3 mb-4 wrap-prose">{t.deleteHint}</p>
        </>
      )}
      <Button full size="lg" variant="secondary" onClick={onClose}>{t.done}</Button>
    </main>
  );
}
