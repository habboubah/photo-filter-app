import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { Check, Clock, FolderInput, Play, Plus, Shield, Trash2, Undo2, X } from 'lucide-react';
import type { Confidence, Photo } from '../types';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { Decision, ReviewItem, Session, albumPlan, deleteSplit, isNewAlbum, laterIds, newAlbumKey, toDelete } from '../logic/review';
import { duration } from '../logic/large';
import { Button, IconButton } from '../ui/Button';
import { Thumb } from '../ui/Photo';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { LARGE, thumbUrl } from '../thumbs';
import { notifyWarning, tapLight, tapMedium } from '../ui/haptics';

/** How far a card is dragged before it counts as a decision. */
const THRESHOLD = 110;

/**
 * A review: one photo at a time, swiped left to delete, right to keep or up
 * to decide later (or the three buttons, or the arrow keys), with undo. Nothing is deleted here;
 * the summary at the end offers "Delete N photos", which goes through the
 * system's own dialog.
 */
/** What the end screen writes: the photos marked for deleting, and the photos filed into albums (Session.albums). */
export interface ReviewOutcome { deleteIds: string[]; albums: { album: string; ids: string[] }[] }

export function ReviewView({ t, session, finished, byId, debug, albums, android, onDecide, onFile, onProtect, onPreview, onUndo, onFinish, onDelete, onClose }: {
  t: Strings;
  session: Session;
  finished: boolean;
  byId: Map<string, Photo>;
  debug: boolean;
  /** The albums for the chips, the last used first (iPhone albums / Android folders). */
  albums: { id: string; title: string }[];
  /** Android: filing moves the photos into the folder (said on the end screen). */
  android: boolean;
  onDecide: (d: Decision) => void;
  /** An album chip: the photo kept and filed into it (or `new:<title>`). */
  /** Absent while albums are not offered (src/logic/allowance.ts): no chips then. */
  onFile?: (album: string) => void;
  /** The shield: the photo is kept and protected for good (src/logic/protect.ts). */
  onProtect: (id: string) => void;
  /** A video: played in the system's player over the app. */
  onPreview: (id: string) => void;
  onUndo: () => void;
  onFinish: () => void;
  onDelete: (outcome: ReviewOutcome) => void;
  onClose: () => void;
}) {
  const item = session.items[session.index];
  // Albums made in this review show as chips too, first.
  const made = [...new Set(Object.values(session.albums).filter(isNewAlbum))].map(k => ({ id: k, title: k.slice(4) }));
  const chips = [...made, ...albums];
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState('');
  const create = () => { const name = title.trim(); if (name) onFile?.(newAlbumKey(name)); setNaming(false); setTitle(''); };
  const done = finished || !item;
  // What the photos marked so far would free: counts up as you swipe left.
  const marked = toDelete(session).reduce((sum, id) => sum + (byId.get(id)?.bytes ?? 0), 0);

  // The next two photos are fetched before they are needed.
  useEffect(() => {
    for (const next of session.items.slice(session.index + 1, session.index + 3)) void thumbUrl(next.id, LARGE).catch(() => {});
  }, [session.index, session.items]);

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onDecide('delete');
      else if (e.key === 'ArrowRight') onDecide('keep');
      else if (e.key === 'ArrowUp') { e.preventDefault(); onDecide('later'); }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z') onUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, onDecide, onUndo]);

  return (
    <div className="min-h-screen mx-auto max-w-xl flex flex-col safe-top">
      <header className="px-[16px] min-h-[54px] grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2 items-center">
        <IconButton label={t.close} icon={X} tone="bar" onClick={onClose} />
        <div className="text-center">
          <p className="text-label font-bold text-fg num" aria-live="polite">
            {done ? t.reviewDoneTitle : fmt(t.reviewProgress, { i: num(t, session.index + 1), n: num(t, session.items.length) })}
          </p>
          {!done && marked > 0 && (
            <p className="text-caption font-extrabold text-neg num" aria-label={fmt(t.reviewMarked, { size: bytes(t, marked) })}>{`− ${bytes(t, marked)}`}</p>
          )}
        </div>
        <IconButton label={t.undo} icon={Undo2} tone="bar" onClick={onUndo} disabled={!session.history.length} className={session.history.length ? '' : 'opacity-40'} />
      </header>
      {done
        ? <Summary t={t} session={session} byId={byId} chips={chips} android={android} onDelete={onDelete} onClose={onClose} />
        : (
          <>
            <div className="px-[16px] pt-1">
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-accent-fill rounded-full transition-[width] duration-300" style={{ width: `${(session.index / session.items.length) * 100}%` }} />
              </div>
            </div>
            <Card key={item.id} t={t} item={item} photo={byId.get(item.id)} debug={debug} onDecide={onDecide} onProtect={() => onProtect(item.id)} onPreview={() => onPreview(item.id)} />
            {onFile && <div role="group" aria-label={t.fileIntoAlbum} className="flex gap-2 overflow-x-auto px-[16px] pt-3 pb-1">
              {chips.map(c => {
                const on = session.albums[item.id] === c.id;
                return (
                  <button
                    key={c.id} type="button" aria-pressed={on}
                    onClick={() => { tapLight(); onFile(c.id); }}
                    className={`shrink-0 min-h-[44px] px-3.5 inline-flex items-center gap-1.5 rounded-full text-label font-bold focus-visible:ring-focus press ${on ? 'bg-accent-fill text-accent-fill-ink' : 'bg-surface text-fg'}`}
                  >
                    <FolderInput className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="max-w-[160px] truncate">{c.title}</span>
                  </button>
                );
              })}
              <button
                type="button" onClick={() => { tapLight(); setNaming(true); }}
                className="shrink-0 min-h-[44px] px-3.5 inline-flex items-center gap-1.5 rounded-full text-label font-bold text-accent bg-surface-2 focus-visible:ring-focus press"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />{t.newAlbum}
              </button>
            </div>}
            <div className="px-6 pb-safe-8 pt-3">
              <div className="flex justify-center items-end gap-6">
                <RoundButton label={t.delete} tone="neg" icon={Trash2} onClick={() => onDecide('delete')} />
                <RoundButton label={t.later} tone="later" icon={Clock} onClick={() => onDecide('later')} />
                <RoundButton label={t.keep} tone="keep" icon={Check} onClick={() => onDecide('keep')} />
              </div>
              <div className="flex justify-between items-center mt-4">
                <p className="text-caption text-fg-mute wrap-prose flex-1">{t.swipeHint}</p>
                <Button variant="ghost" onClick={onFinish}>{t.finishReview}</Button>
              </div>
            </div>
          </>
        )}
      <Sheet open={naming} title={t.newAlbum} closeLabel={t.cancel} onClose={() => setNaming(false)} action={{ label: t.save, onClick: create, disabled: !title.trim() }}>
        <Field label={t.albumName} value={title} onChange={setTitle} autoFocus maxLength={80} onKeyDown={e => { if (e.key === 'Enter') create(); }} />
      </Sheet>
    </div>
  );
}

function Card({ t, item, photo, debug, onDecide, onProtect, onPreview }: {
  t: Strings; item: ReviewItem; photo?: Photo; debug: boolean; onDecide: (d: Decision) => void; onProtect: () => void; onPreview: () => void;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-10, 0, 10]);
  const delOpacity = useTransform(x, [-THRESHOLD, -20, 0], [1, 0, 0]);
  const keepOpacity = useTransform(x, [0, 20, THRESHOLD], [0, 0, 1]);
  const laterOpacity = useTransform(y, [-THRESHOLD, -20, 0], [1, 0, 0]);
  const levelText: Record<Confidence, string> = { high: t.levelHigh, medium: t.levelMedium, low: t.levelLow };
  const reasons: Record<ReviewItem['reason'], string> = {
    best: t.reasonBest, original: t.reasonOriginal, similar: t.reasonSimilar, duplicate: t.reasonDuplicate,
    blurry: levelText[item.level ?? 'medium'], screenshot: photo?.rec ? t.reasonRecording : t.reasonScreenshot,
    utility: item.label ? fmt(t.reasonUtility, { label: t[`aiLabel_${item.label}`] }) : '',
    large: photo ? bytes(t, photo.bytes) : '', trip: '', later: t.reasonLater, dark: t.reasonDark, bright: t.reasonBright,
    video: photo ? `${duration(photo.dur ?? 0)} · ${bytes(t, photo.bytes)}` : '',
    lookalike: t.reasonLookalike, bestTake: t.reasonBestTake, app: t.reasonApp,
  };
  const chip = item.suggest === 'delete' ? t.suggestDelete : item.suggest === 'keep' ? t.suggestKeep : '';
  const reason = reasons[item.reason];
  const when = photo ? new Date(photo.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  const fling = (d: Decision) => {
    tapMedium();
    if (d === 'delete') notifyWarning();
    if (reduce) { onDecide(d); return; }
    const ease = [0.32, 0.72, 0, 1] as const;
    const flight = d === 'later'
      ? animate(y, -window.innerHeight, { duration: 0.22, ease })
      : animate(x, d === 'delete' ? -window.innerWidth : window.innerWidth, { duration: 0.22, ease });
    void flight.then(() => onDecide(d));
  };

  return (
    <div className="flex-1 flex flex-col px-[16px] pt-4 min-h-0">
      <div className="flex items-center gap-2 pb-3">
        {chip && (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-caption font-extrabold ${item.suggest === 'delete' ? 'bg-neg-dim text-neg' : 'bg-keep-dim text-keep'}`}>
            {chip}
          </span>
        )}
        {reason && <span className="text-caption text-fg-mute truncate flex-1 min-w-0">{reason}</span>}
        <button
          type="button" onClick={() => { tapLight(); onProtect(); }}
          className="ms-auto shrink-0 min-h-[44px] -my-2 inline-flex items-center gap-1.5 px-3 rounded-full text-caption font-bold text-accent focus-visible:ring-focus press"
        >
          <Shield className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />{t.protect}
        </button>
      </div>
      <motion.div
        drag
        dragSnapToOrigin
        dragElastic={0.9}
        style={{ x, y, rotate }}
        onDragEnd={(_, info) => {
          const up = -info.offset.y > Math.abs(info.offset.x);
          if (up && (info.offset.y < -THRESHOLD || info.velocity.y < -700)) fling('later');
          else if (info.offset.x < -THRESHOLD || info.velocity.x < -700) fling('delete');
          else if (info.offset.x > THRESHOLD || info.velocity.x > 700) fling('keep');
        }}
        className="relative flex-1 min-h-[300px] rounded-lg overflow-hidden bg-surface shadow-e2 touch-none cursor-grab active:cursor-grabbing"
        role="img"
        aria-label={[when, chip, reason].filter(Boolean).join('. ')}
      >
        <div className="absolute inset-0"><Thumb id={item.id} size={LARGE} className="!rounded-none !object-contain bg-surface-2" /></div>
        <motion.span style={{ opacity: delOpacity }} className="absolute top-6 end-6 px-4 py-2 rounded-[12px] border-[3px] border-neg bg-surface text-neg text-heading font-extrabold rotate-[8deg]" aria-hidden="true">
          {t.delete}
        </motion.span>
        <motion.span style={{ opacity: laterOpacity }} className="absolute top-6 start-1/2 -translate-x-1/2 px-4 py-2 rounded-[12px] border-[3px] border-accent bg-surface text-accent text-heading font-extrabold" aria-hidden="true">
          {t.later}
        </motion.span>
        <motion.span style={{ opacity: keepOpacity }} className="absolute top-6 start-6 px-4 py-2 rounded-[12px] border-[3px] border-keep bg-surface text-keep text-heading font-extrabold -rotate-[8deg]" aria-hidden="true">
          {t.keep}
        </motion.span>
        <span className="absolute bottom-3 start-3 px-2.5 py-1 rounded-full bg-veil text-on-color text-caption font-bold">{when}</span>
        {photo?.video && (
          <span className="absolute top-3 start-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-veil text-on-color text-caption font-bold num">
            <Play className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} aria-hidden="true" />{t.videoBadge} · {duration(photo.dur ?? 0)}
          </span>
        )}
        {photo?.video && (
          <button
            type="button" aria-label={fmt(t.playVideo, { length: duration(photo.dur ?? 0) })}
            onPointerDownCapture={e => e.stopPropagation()}
            onClick={() => { tapLight(); onPreview(); }}
            className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full bg-veil text-on-color inline-flex items-center justify-center press focus-visible:ring-focus"
          >
            <Play className="w-8 h-8 ms-1" fill="currentColor" strokeWidth={0} aria-hidden="true" />
          </button>
        )}
        {debug && photo && (
          <span className="absolute bottom-3 end-3 px-2 py-1 rounded-full bg-veil text-on-color text-micro font-bold num">
            {fmt(t.sharpnessDebug, { s: photo.sharp ?? '–', c: photo.contrast ?? '–' })}
          </span>
        )}
      </motion.div>
    </div>
  );
}

const ROUND_TONE = {
  neg: 'w-[68px] h-[68px] bg-neg text-neg-ink',
  keep: 'w-[68px] h-[68px] bg-keep text-keep-ink',
  later: 'w-[52px] h-[52px] bg-surface text-accent',
} as const;

function RoundButton({ label, tone, icon: Icon, onClick }: { label: string; tone: keyof typeof ROUND_TONE; icon: typeof Check; onClick: () => void }) {
  return (
    <button
      type="button" onClick={() => { tapLight(); onClick(); }} aria-label={label}
      className={`flex flex-col items-center gap-1.5 press focus-visible:ring-focus rounded-full`}
    >
      <span className={`rounded-full inline-flex items-center justify-center shadow-e2 ${ROUND_TONE[tone]}`}>
        <Icon className={tone === 'later' ? 'w-6 h-6' : 'w-7 h-7'} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="text-caption font-bold text-fg">{label}</span>
    </button>
  );
}

function Summary({ t, session, byId, chips, android, onDelete, onClose }: {
  t: Strings; session: Session; byId: Map<string, Photo>; chips: { id: string; title: string }[]; android: boolean;
  onDelete: (outcome: ReviewOutcome) => void; onClose: () => void;
}) {
  const ids = toDelete(session);
  const plan = albumPlan(session);
  const filed = plan.reduce((n, a) => n + a.ids.length, 0);
  const albumTitle = (key: string) => chips.find(c => c.id === key)?.title ?? (isNewAlbum(key) ? key.slice(4) : key);
  const split = deleteSplit(session, byId);
  const later = laterIds(session).length;
  const sizeOf = (list: string[]) => list.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);
  return (
    <main className="flex-1 flex flex-col px-6 pb-safe-8 pt-6">
      <h1 className="title-face text-title font-extrabold text-fg">{t.reviewDoneTitle}</h1>
      {ids.length > 0 && (
        <div className="mt-4">
          <p className="display text-display font-semibold text-fg num">{bytes(t, sizeOf(ids))}</p>
          <p className="eyebrow text-fg-mute mt-1">{t.reviewDoneFree}</p>
        </div>
      )}
      <p className="text-body text-fg-mute mt-3 wrap-prose">
        {!ids.length ? t.reviewNothing
          : split.photos.length ? fmt(t.reviewDoneBody, { photos: plural(t, 'photos', split.photos.length), size: bytes(t, sizeOf(split.photos)) })
            : fmt(t.reviewDoneBody, { photos: plural(t, 'videos', split.videos.length), size: bytes(t, sizeOf(split.videos)) })}
      </p>
      {split.photos.length > 0 && split.videos.length > 0 && (
        <p className="text-body text-fg-mute wrap-prose num">{fmt(t.reviewDoneVideos, { videos: plural(t, 'videos', split.videos.length), size: bytes(t, sizeOf(split.videos)) })}</p>
      )}
      {later > 0 && <p className="text-label text-accent font-bold num mt-1">{plural(t, 'laterSaved', later)}</p>}
      {filed > 0 && (
        <div className="mt-4 rounded-md card p-4 space-y-1.5">
          <p className="text-body font-bold text-fg num">
            {[ids.length ? plural(t, 'deleteN', ids.length) : null, fmt(t.filedSummary, { photos: plural(t, 'photos', filed), albums: plural(t, 'albums', plan.length) })].filter(Boolean).join(' · ')}
          </p>
          <ul className="text-caption text-fg-mute space-y-0.5">
            {plan.map(a => <li key={a.album} className="num">{`${albumTitle(a.album)} · ${plural(t, 'photos', a.ids.length)}`}</li>)}
          </ul>
          {android && <p className="text-caption text-fg-mute wrap-prose">{t.filedMoveHint}</p>}
        </div>
      )}
      {ids.length > 0 && (
        <div className="grid grid-cols-4 gap-[4px] mt-6">
          {ids.slice(0, 12).map(id => <div key={id} className="aspect-square"><Thumb id={id} /></div>)}
        </div>
      )}
      <div className="flex-1 min-h-8" />
      {ids.length > 0 && (
        <>
          <Button full size="lg" variant="destructive" icon={Trash2} onClick={() => onDelete({ deleteIds: ids, albums: plan })}>
            {filed > 0 ? t.deleteAndFile : split.videos.length ? plural(t, 'deleteFilesN', ids.length) : plural(t, 'deleteN', ids.length)}
          </Button>
          <p className="text-caption text-fg-mute text-center mt-3 mb-4 wrap-prose">{t.deleteHint}</p>
        </>
      )}
      {!ids.length && filed > 0 && (
        <Button full size="lg" icon={FolderInput} className="mb-3" onClick={() => onDelete({ deleteIds: [], albums: plan })}>
          {fmt(t.fileNow, { photos: plural(t, 'photos', filed) })}
        </Button>
      )}
      <Button full size="lg" variant="secondary" onClick={onClose}>{t.done}</Button>
    </main>
  );
}
