import { useEffect, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { Archive, Check, ChevronRight, Clock, FolderInput, FolderPlus, Images, Play, Plus, Shield, Trash2, Undo2, X, ZoomIn } from 'lucide-react';
import type { Confidence, Photo } from '../types';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { Decision, ReviewItem, Session, albumPlan, deleteSplit, isNewAlbum, laterIds, newAlbumKey, toDelete } from '../logic/review';
import type { Detail, Trust } from '../logic/confidence';
import { duration } from '../logic/large';
import { BigNumber } from '../ui/Controls';
import { Button, IconButton } from '../ui/Button';
import { Thumb } from '../ui/Photo';
import { PlayOver } from '../ui/play';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { LARGE, thumbUrl } from '../thumbs';
import { notifyWarning, tapLight, tapMedium } from '../ui/haptics';
import { CountUp, SETTLE } from '../ui/FirstRun';
import { GESTURE_OF, GestureHint, type Guide, saidFor } from './ReviewGuide';
import { ProtectInfo } from './SafetyNets';
import { ZoomView, zoomLayoutId } from '../ui/Zoom';
import { loadPinned, rowAlbums, savePinned } from '../logic/reviewAlbums';

/** How far a card is dragged before it counts as a decision. */
const THRESHOLD = 110;

/**
 * A review: one photo at a time, swiped left to delete, right to keep or up
 * to decide later (or the three buttons, or the arrow keys), with undo. Nothing is deleted here;
 * the summary at the end puts the marked ones into "Zum Löschen" (src/logic/bin.ts). Gone through
 * from the bin itself (`bin`), it offers "Delete N photos", which goes through the system's own dialog.
 */
/** What the end screen writes: the photos marked for deleting, and the photos filed into albums (Session.albums). */
export interface ReviewOutcome { deleteIds: string[]; albums: { album: string; ids: string[] }[] }

export function ReviewView({ t, session, finished, byId, debug, bin = false, albums, android, guide, protectNote, onProtectNote, onDecide: decideRaw, onFile, onProtect, onLike, onUndo, onFinish, onDelete, onClose }: {
  t: Strings;
  session: Session;
  finished: boolean;
  byId: Map<string, Photo>;
  debug: boolean;
  /** "Zum Löschen" gone through again: the end deletes for real (else it puts the marked ones into the bin). */
  bin?: boolean;
  /** Every album (iPhone) / folder (Android), the last used first: the *Alben* sheet lists them, the chips show the chosen ones. */
  albums: { id: string; title: string }[];
  /** Android: filing moves the photos into the folder (said on the end screen). */
  android: boolean;
  /**
   * The guided first review (docs/DESIGN.md, "The first run"): the gesture hinted over the card until the
   * user has done it once, each decision confirmed with a word. Absent once the three were done, and from the bin.
   */
  guide?: Guide;
  /** The first summary also says once that favourites are never suggested, and how to protect more. */
  protectNote?: boolean;
  onProtectNote?: () => void;
  onDecide: (d: Decision) => void;
  /** An album chip: the photo kept and filed into it (or `new:<title>`). */
  /** Absent while albums are not offered (src/logic/allowance.ts): no chips then. */
  onFile?: (album: string) => void;
  /** The shield: the photo is kept and protected for good (src/logic/protect.ts). */
  onProtect: (id: string) => void;
  /** A video: played inside the app (src/ui/play.tsx). */
  /** The photos like this one (src/logic/search.ts likeThis); absent for a photo without the AI's vector. */
  onLike?: (id: string) => void;
  onUndo: () => void;
  onFinish: () => void;
  onDelete: (outcome: ReviewOutcome) => void;
  onClose: () => void;
}) {
  const item = session.items[session.index];
  // Albums made in this review show as chips too, first.
  const made = [...new Set(Object.values(session.albums).filter(isNewAlbum))].map(k => ({ id: k, title: k.slice(4) }));
  const chips = [...made, ...albums];
  // Under the photo only the albums the user chose (src/logic/reviewAlbums.ts), not every album of the phone;
  // the *Alben* button opens a sheet to choose them.
  const [pinned, setPinned] = useState(loadPinned);
  const [picking, setPicking] = useState(false);
  const [filter, setFilter] = useState('');
  const pin = (id: string) => setPinned(list => { const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id]; savePinned(next); return next; });
  const row = item ? rowAlbums(albums, pinned, made, session.albums[item.id]) : [];
  const found = filter.trim() ? albums.filter(a => a.title.toLocaleLowerCase(t.locale).includes(filter.trim().toLocaleLowerCase(t.locale))) : albums;
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState('');
  const create = () => { const name = title.trim(); if (name) onFile?.(newAlbumKey(name)); setNaming(false); setTitle(''); };
  const done = finished || !item;
  // Every decision is named right after it, on top of the next card, with its undo beside it — a snackbar
  // that stays until the next decision (or a few seconds). While the guide runs it says more ("Vorgemerkt – noch nicht gelöscht").
  const [said, setSaid] = useState<{ key: number; text: string } | null>(null);
  useEffect(() => {
    if (!said) return;
    const timer = window.setTimeout(() => setSaid(null), 4500);
    return () => window.clearTimeout(timer);
  }, [said]);
  const onDecide = (d: Decision) => {
    const short = d === 'keep' ? (bin ? t.binRestore : t.keep) : d === 'delete' ? (bin ? t.delete : t.summaryMarked) : t.later;
    setSaid({ key: Date.now(), text: guide?.gesture ? saidFor(t, d) : short });
    guide?.onDid(GESTURE_OF[d]);
    decideRaw(d);
  };
  const undoNow = () => { setSaid(null); onUndo(); };
  // What the photos marked so far would free: counts up as you swipe left.
  const marked = toDelete(session).reduce((sum, id) => sum + (byId.get(id)?.bytes ?? 0), 0);

  // The next two photos are fetched before they are needed.
  useEffect(() => {
    for (const next of session.items.slice(session.index + 1, session.index + 3)) void thumbUrl(next.id, LARGE).catch(() => {});
  }, [session.index, session.items]);

  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      // A sheet or the zoom viewer is open: the keys are theirs.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
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
      {/* With large text the undo moves to its own line rather than squeezing the count. */}
      <header className="px-[12px] min-h-[54px] py-1 flex flex-wrap gap-2 items-center">
        <IconButton label={t.close} icon={X} tone="bar" onClick={onClose} />
        <div className="text-center flex-1 min-w-[7em]">
          <p className="text-label font-bold text-fg num" aria-live="polite">
            {done ? t.reviewDoneTitle : fmt(t.reviewProgress, { i: num(t, session.index + 1), n: num(t, session.items.length) })}
          </p>
          {/* What was set aside so far, quietly: nothing is deleted here (from "Zum Löschen vorgemerkt" itself, it is). */}
          {!done && marked > 0 && (
            <p className={`text-caption font-semibold num leading-tight ${bin ? 'text-neg' : 'text-fg-mute'}`}>{fmt(bin ? t.reviewMarked : t.reviewAsideSoFar, { size: bytes(t, marked) })}</p>
          )}
        </div>
        {/* Undo in words, always in the same place: the last decision comes back. */}
        <button
          type="button" onClick={() => { tapLight(); onUndo(); }} disabled={!session.history.length}
          className={`ms-auto min-h-tap ps-3 pe-4 inline-flex items-center gap-1.5 rounded-full glass text-label font-semibold whitespace-nowrap press focus-visible:ring-focus ${session.history.length ? 'text-fg' : 'text-fg-faint'}`}
        >
          <Undo2 className="w-[18px] h-[18px] rtl:-scale-x-100" strokeWidth={2.3} aria-hidden="true" />{t.undo}
        </button>
      </header>
      {done
        ? <Summary t={t} session={session} byId={byId} bin={bin} chips={chips} android={android} protectNote={!!protectNote && !bin} onProtectNote={onProtectNote} onDelete={onDelete} onClose={onClose} />
        : (
          <>
            <div className="px-[12px] pt-1">
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-accent-fill rounded-full transition-[width] duration-300" style={{ width: `${(session.index / session.items.length) * 100}%` }} />
              </div>
            </div>
            <Card
              key={item.id} t={t} item={item} photo={byId.get(item.id)} debug={debug} bin={bin} guide={guide} said={said} onUndo={undoNow} onDecide={onDecide} onProtect={() => onProtect(item.id)}
              onLike={onLike ? () => onLike(item.id) : undefined}
            />
            {onFile && <div role="group" aria-label={t.fileIntoAlbum} className="flex gap-2 overflow-x-auto no-scrollbar px-[12px] pt-3 pb-1">
              {row.map(c => {
                const on = session.albums[item.id] === c.id;
                return (
                  <button
                    key={c.id} type="button" aria-pressed={on}
                    onClick={() => { tapLight(); onFile(c.id); }}
                    className={`shrink-0 min-h-[44px] px-3.5 inline-flex items-center gap-1.5 rounded-full text-label font-semibold focus-visible:ring-focus press ${on ? 'bg-accent-fill text-accent-fill-ink sheen' : 'glass-flat text-fg'}`}
                  >
                    <FolderInput className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="max-w-[160px] truncate">{c.title}</span>
                  </button>
                );
              })}
              <button
                type="button" onClick={() => { tapLight(); setFilter(''); setPicking(true); }} aria-haspopup="dialog"
                className="shrink-0 min-h-[44px] px-3.5 inline-flex items-center gap-1.5 rounded-full text-label font-semibold text-accent glass-flat focus-visible:ring-focus press"
              >
                <FolderPlus className="w-4 h-4" aria-hidden="true" />{row.length ? t.reviewAlbums : t.fileIntoAlbum}
              </button>
            </div>}
            <div className="px-5 pb-safe-8 pt-3">
              {/* Physical, like the swipe: set aside on the left, keep on the right — also right to left.
                  Setting aside is quiet (nothing is deleted); red only where it deletes for real (from "Zum Löschen vorgemerkt"). */}
              <div dir="ltr" data-tip="tip.buttons" className="flex justify-center items-end gap-6">
                {bin
                  ? <RoundButton label={t.delete} tone="neg" icon={Trash2} onClick={() => onDecide('delete')} />
                  : <RoundButton label={t.aside} tone="aside" icon={Archive} onClick={() => onDecide('delete')} />}
                <RoundButton label={t.later} tone="later" icon={Clock} onClick={() => onDecide('later')} />
                <RoundButton label={t.keep} tone="keep" icon={Check} onClick={() => onDecide('keep')} />
              </div>
              <div className="flex flex-wrap justify-between items-center gap-x-3 mt-4">
                <p className="text-caption text-fg-mute wrap-prose flex-1 min-w-[12rem]">{bin ? t.swipeHintBin : t.swipeHint}</p>
                <Button variant="ghost" onClick={onFinish}>{t.finishReview}</Button>
              </div>
            </div>
          </>
        )}
      {/* Which albums stand under the photo: every album of the phone, each a toggle; a new one at the foot. */}
      <Sheet open={picking} title={t.reviewAlbumsTitle} closeLabel={t.close} onClose={() => setPicking(false)} action={{ label: t.done, onClick: () => setPicking(false) }}>
        <p className="text-label text-fg-mute wrap-prose">{t.reviewAlbumsBody}</p>
        {albums.length > 8 && <div className="mt-3"><Field label={t.reviewAlbumsFilter} value={filter} onChange={setFilter} /></div>}
        {albums.length === 0
          ? <p className="mt-4 text-label text-fg wrap-prose">{t.reviewAlbumsNone}</p>
          : (
            <ul className="mt-3 rounded-md bg-surface-2 divide-hairline-inset overflow-hidden">
              {found.map(a => {
                const on = pinned.includes(a.id);
                return (
                  <li key={a.id}>
                    <button
                      type="button" aria-pressed={on} onClick={() => { tapLight(); pin(a.id); }}
                      className="w-full min-h-[52px] px-4 py-2 flex items-center gap-3 text-start press focus-visible:ring-focus"
                    >
                      <FolderInput className="w-5 h-5 shrink-0 text-fg-mute" aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{a.title}</span>
                      <span className={`w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center ${on ? 'bg-accent-fill text-accent-fill-ink' : 'ring-2 ring-inset ring-fg-faint'}`} aria-hidden="true">
                        {on && <Check className="w-4 h-4" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        <Button full variant="ghost" icon={Plus} className="mt-3" onClick={() => { setPicking(false); setNaming(true); }}>{t.newAlbum}</Button>
      </Sheet>

      <Sheet open={naming} title={t.newAlbum} closeLabel={t.cancel} onClose={() => setNaming(false)} action={{ label: t.save, onClick: create, disabled: !title.trim() }}>
        <Field label={t.albumName} value={title} onChange={setTitle} autoFocus maxLength={80} onKeyDown={e => { if (e.key === 'Enter') create(); }} />
      </Sheet>
    </div>
  );
}

function Card({ t, item, photo, debug, bin, guide, said, onUndo, onDecide, onProtect, onLike }: {
  t: Strings; item: ReviewItem; photo?: Photo; debug: boolean; bin: boolean; guide?: Guide; said: { key: number; text: string } | null; onUndo: () => void;
  onDecide: (d: Decision) => void; onProtect: () => void; onLike?: () => void;
}) {
  const reduce = useReducedMotion();
  // The guide's hand leaves the moment the card is touched, and comes back if it is let go undecided.
  const [touched, setTouched] = useState(false);
  // The photo large, to check its sharpness (ui/Zoom): it grows out of the card.
  const [zoom, setZoom] = useState(false);
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
    lookalike: t.reasonLookalike, bestTake: t.reasonBestTake, app: t.reasonApp, found: '', bin: t.reasonBin,
  };
  const details: Record<Detail, string> = {
    exactCopy: t.detailExactCopy, smallerCopy: t.detailSmallerCopy, alteredCopy: t.detailAlteredCopy, burstExtra: t.detailBurstExtra,
    blurrier: t.detailBlurrier, eyesClosed: t.detailEyesClosed, worseLight: t.detailWorseLight, nearlySame: t.detailNearlySame,
  };
  const trusts: Record<Trust, string> = { sure: t.trustSure, likely: t.trustLikely, check: t.trustCheck };
  const chip = item.suggest === 'delete' ? (bin ? t.suggestDelete : t.suggestAside) : item.suggest === 'keep' ? t.suggestKeep : '';
  // A group's extra shot says what is worse about it (blurrier, eyes closed, a smaller copy …), else why it was suggested.
  const reason = item.suggest === 'delete' && item.detail ? details[item.detail] : reasons[item.reason];
  const trust = item.suggest === 'delete' && item.trust ? trusts[item.trust] : '';
  const when = photo ? new Date(photo.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  /** The card leaves in the decision's direction — a spring that takes over the finger's speed (0 from a button or a key). */
  const fling = (d: Decision, velocity = 0) => {
    tapMedium();
    if (d === 'delete') notifyWarning();
    if (reduce) { onDecide(d); return; }
    const spring = { type: 'spring', bounce: 0, duration: 0.28, velocity } as const;
    const flight = d === 'later'
      ? animate(y, -window.innerHeight, spring)
      : animate(x, (d === 'delete' ? -1.15 : 1.15) * window.innerWidth, spring);
    // The decision is taken once the card is clearly on its way, not after the spring has fully settled.
    window.setTimeout(() => { flight.stop(); onDecide(d); }, 200);
  };

  return (
    <div className="flex-1 flex flex-col px-[12px] pt-3 min-h-0">
      {/* The suggestion and why, in words that wrap (never cut off), then the photo with all the room left. */}
      <div className="flex items-start gap-2 pb-2.5">
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {chip && (
            <span data-tip="tip.suggest" className={`inline-flex items-center px-3 py-1 rounded-full text-caption font-extrabold ${item.suggest === 'delete' ? (bin ? 'bg-neg-dim text-neg' : 'bg-surface-2 text-fg') : 'bg-keep-dim text-keep'}`}>
              {chip}
            </span>
          )}
          {reason && <span className="text-caption text-fg-mute wrap-prose">{reason}</span>}
        </div>
        <button
          type="button" onClick={() => { tapLight(); onProtect(); }}
          className="ms-auto shrink-0 min-h-[44px] -my-2 inline-flex items-center gap-1.5 px-3 rounded-full text-caption font-bold text-accent focus-visible:ring-focus press"
        >
          <Shield className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />{t.protect}
        </button>
      </div>
      {/* Full-bleed: the photo takes the whole width of the screen. */}
      <div className="relative flex-1 min-h-[300px] -mx-[12px]">
      <motion.div
        drag
        dragSnapToOrigin
        dragElastic={0.9}
        style={{ x, y, rotate }}
        onDragStart={() => setTouched(true)}
        onDragEnd={(_, info) => {
          setTouched(false);
          const up = -info.offset.y > Math.abs(info.offset.x);
          if (up && (info.offset.y < -THRESHOLD || info.velocity.y < -700)) fling('later', info.velocity.y);
          else if (info.offset.x < -THRESHOLD || info.velocity.x < -700) fling('delete', info.velocity.x);
          else if (info.offset.x > THRESHOLD || info.velocity.x > 700) fling('keep', info.velocity.x);
        }}
        className="absolute inset-0 overflow-hidden bg-surface-2 touch-none cursor-grab active:cursor-grabbing"
        role="img"
        aria-label={[when, chip, trust, reason].filter(Boolean).join('. ')}
      >
        <motion.div layoutId={reduce ? undefined : zoomLayoutId(item.id)} className="absolute inset-0"><Thumb id={item.id} size={LARGE} className="!rounded-none !object-contain !bg-transparent" /></motion.div>
        <motion.span style={{ opacity: delOpacity }} className={`absolute top-6 right-6 px-4 py-2 rounded-[12px] border-[3px] bg-surface text-heading font-extrabold rotate-[8deg] ${bin ? 'border-neg text-neg' : 'border-fg text-fg'}`} aria-hidden="true">
          {bin ? t.delete : t.aside}
        </motion.span>
        <motion.span style={{ opacity: laterOpacity }} className="absolute top-6 start-1/2 -translate-x-1/2 px-4 py-2 rounded-[12px] border-[3px] border-accent bg-surface text-accent text-heading font-extrabold" aria-hidden="true">
          {t.later}
        </motion.span>
        <motion.span style={{ opacity: keepOpacity }} className="absolute top-6 left-6 px-4 py-2 rounded-[12px] border-[3px] border-keep bg-surface text-keep text-heading font-extrabold -rotate-[8deg]" aria-hidden="true">
          {t.keep}
        </motion.span>
        <span className="absolute bottom-3 start-3 px-2.5 py-1 rounded-full bg-veil text-on-color text-caption font-bold">{when}</span>
        {onLike && !photo?.video && (
          <button
            type="button" aria-label={t.likeOpen}
            onPointerDownCapture={e => e.stopPropagation()}
            onClick={() => { tapLight(); onLike(); }}
            className="absolute top-3 start-3 w-11 h-11 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus"
          >
            <Images className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        {trust && (
          <span className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-veil text-on-color text-caption font-bold">
            <span className={`w-2 h-2 rounded-full ${item.trust === 'check' ? 'bg-warn' : item.trust === 'sure' ? 'bg-keep' : 'bg-on-color'}`} aria-hidden="true" />
            {trust}
          </span>
        )}
        {photo?.video && (
          <span className="absolute top-3 start-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-veil text-on-color text-caption font-bold num">
            <Play className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} aria-hidden="true" />{t.videoBadge} · {duration(photo.dur ?? 0)}
          </span>
        )}
        {photo?.video && <PlayOver id={item.id} />}
        {!photo?.video && (
          <button
            type="button" aria-label={t.zoomOpen} title={t.zoomOpen}
            onPointerDownCapture={e => e.stopPropagation()}
            onClick={() => { tapLight(); setZoom(true); }}
            className="absolute top-3 end-3 w-12 h-12 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus"
          >
            <ZoomIn className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        {debug && photo && (
          <span className="absolute top-[68px] end-3 px-2 py-1 rounded-full bg-veil text-on-color text-micro font-bold num">
            {fmt(t.sharpnessDebug, { s: photo.sharp ?? '–', c: photo.contrast ?? '–' })}
          </span>
        )}
      </motion.div>
      {guide?.gesture && <GestureHint key={guide.gesture} t={t} gesture={guide.gesture} hidden={touched} onSkip={guide.onSkip} />}
      {/* What the last decision did, in a word, with its undo: read out, and gone with the next decision or after a moment. */}
      <div className="absolute top-[68px] inset-x-3 z-20 flex justify-center pointer-events-none" role="status">
        <AnimatePresence>
          {said && (
            <motion.span
              key={said.key}
              className="pointer-events-auto max-w-full inline-flex items-center gap-1.5 ps-3.5 pe-1 py-1 rounded-full glass text-fg text-label font-bold"
              initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              <Check className="w-4 h-4 shrink-0 text-keep" strokeWidth={3} aria-hidden="true" />
              <span className="min-w-0 wrap-compound py-1.5">{said.text}</span>
              <button
                type="button" onPointerDownCapture={e => e.stopPropagation()} onClick={() => { tapLight(); onUndo(); }}
                className="shrink-0 min-h-[40px] px-3 rounded-full text-accent font-bold active:bg-accent-dim press focus-visible:ring-focus hit-44"
              >
                {t.undo}
              </button>
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {zoom && (
          <ZoomView
            key="zoom" id={item.id} alt={when}
            labels={{ close: t.close, zoomIn: t.zoomIn, zoomOut: t.zoomOut, hint: t.zoomHint }}
            onClose={() => setZoom(false)}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

const ROUND_TONE = {
  neg: 'w-[66px] h-[66px] bg-neg text-neg-ink sheen',
  /** Setting aside: quiet, not red — nothing is deleted. */
  aside: 'w-[66px] h-[66px] glass text-fg',
  keep: 'w-[66px] h-[66px] bg-keep text-keep-ink sheen',
  later: 'w-[54px] h-[54px] glass text-accent',
} as const;

function RoundButton({ label, tone, icon: Icon, onClick }: { label: string; tone: keyof typeof ROUND_TONE; icon: typeof Check; onClick: () => void }) {
  return (
    <button
      type="button" onClick={() => { tapLight(); onClick(); }} aria-label={label}
      className={`flex flex-col items-center gap-1.5 press focus-visible:ring-focus rounded-full`}
    >
      <span className={`rounded-full inline-flex items-center justify-center ${ROUND_TONE[tone]}`}>
        <Icon className={tone === 'later' ? 'w-6 h-6' : 'w-7 h-7'} strokeWidth={2.4} aria-hidden="true" />
      </span>
      <span className="text-caption font-semibold text-fg max-w-[6.5rem] text-center wrap-compound">{label}</span>
    </button>
  );
}

function Summary({ t, session, byId, bin, chips, android, protectNote, onProtectNote, onDelete, onClose }: {
  t: Strings; session: Session; byId: Map<string, Photo>; bin: boolean; chips: { id: string; title: string }[]; android: boolean;
  protectNote: boolean; onProtectNote?: () => void;
  onDelete: (outcome: ReviewOutcome) => void; onClose: () => void;
}) {
  // The note about protection belongs to the first summary: it stays while this one is open, and counts as seen from now on.
  const [note] = useState(protectNote);
  const [protectOpen, setProtectOpen] = useState(false);
  useEffect(() => { if (note) onProtectNote?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const keptCount = session.items.filter(i => session.decisions[i.id] === 'keep').length;
  const ids = toDelete(session);
  const plan = albumPlan(session);
  const filed = plan.reduce((n, a) => n + a.ids.length, 0);
  const albumTitle = (key: string) => chips.find(c => c.id === key)?.title ?? (isNewAlbum(key) ? key.slice(4) : key);
  const split = deleteSplit(session, byId);
  // From the bin, a photo swiped up just stays there: no decide-later pile.
  const later = bin ? 0 : laterIds(session).length;
  const restored = bin ? session.items.filter(i => session.decisions[i.id] === 'keep').length : 0;
  const sizeOf = (list: string[]) => list.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);
  return (
    <main className="flex-1 flex flex-col px-6 pb-safe-8 pt-6">
      {/* Done, calmly: a soft check, then the figures count up. No confetti, nothing to collect. */}
      <motion.span
        className="w-12 h-12 rounded-full bg-keep text-keep-ink sheen inline-flex items-center justify-center mb-4" aria-hidden="true"
        initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SETTLE, duration: 0.5 }}
      >
        <Check className="w-6 h-6" strokeWidth={2.8} />
      </motion.span>
      <h1 className="title-face text-title font-bold text-fg">{t.reviewDoneTitle}</h1>
      {ids.length > 0 && (
        <div className="mt-4">
          <p className="text-display text-fg"><CountUp value={sizeOf(ids)} seconds={0.9} format={n => <BigNumber text={bytes(t, n)} />} /></p>
          <p className="text-label font-semibold text-fg-mute mt-1">{bin ? t.reviewDoneFree : t.reviewDoneAside}</p>
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
      {!bin && (keptCount > 0 || ids.length > 0 || later > 0) && (
        <dl className="mt-5 grid grid-cols-3 gap-2" aria-label={t.summaryRecap}>
          {[
            { icon: Check, label: t.keep, n: keptCount, tone: 'text-keep' },
            { icon: Archive, label: t.summaryMarked, n: ids.length, tone: 'text-fg' },
            { icon: Clock, label: t.later, n: later, tone: 'text-accent' },
          ].map(({ icon: Icon, label, n, tone }) => (
            <div key={label} className="rounded-md card px-3 py-3 flex flex-col-reverse">
              <dt className="flex items-center gap-1 text-caption text-fg-mute wrap-compound">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${tone}`} strokeWidth={2.8} aria-hidden="true" />{label}
              </dt>
              <dd className="title-face text-title2 font-bold text-fg num"><CountUp value={n} format={v => num(t, v)} /></dd>
            </div>
          ))}
        </dl>
      )}
      {later > 0 && <p className="text-label text-accent font-bold num mt-3">{plural(t, 'laterSaved', later)}</p>}
      {restored > 0 && <p className="text-label text-keep font-bold num mt-1">{plural(t, 'binRestoreHint', restored)}</p>}
      {filed > 0 && (
        <div className="mt-5 rounded-md card p-4 space-y-1.5">
          <p className="text-body font-bold text-fg num">
            {[ids.length ? (bin ? plural(t, 'deleteN', ids.length) : `${t.binAdd} · ${plural(t, 'photos', ids.length)}`) : null, fmt(t.filedSummary, { photos: plural(t, 'photos', filed), albums: plural(t, 'albums', plan.length) })].filter(Boolean).join(' · ')}
          </p>
          <ul className="text-caption text-fg-mute space-y-0.5">
            {plan.map(a => <li key={a.album} className="num">{`${albumTitle(a.album)} · ${plural(t, 'photos', a.ids.length)}`}</li>)}
          </ul>
          {android && <p className="text-caption text-fg-mute wrap-prose">{t.filedMoveHint}</p>}
        </div>
      )}
      {/* Exactly what is chosen: the photos themselves (the last tile counts the rest). */}
      {ids.length > 0 && (
        <div className="grid grid-cols-4 gap-[4px] mt-6" role="list" aria-label={bin ? plural(t, 'deleteN', ids.length) : `${t.binAdd} · ${plural(t, 'photos', ids.length)}`}>
          {ids.slice(0, 12).map((id, i) => (
            <div key={id} role="listitem" className="relative aspect-square rounded-[10px] overflow-hidden">
              <Thumb id={id} className="!rounded-none" />
              {i === 11 && ids.length > 12 && (
                <span className="absolute inset-0 bg-veil text-on-color text-label font-bold num inline-flex items-center justify-center">+{num(t, ids.length - 11)}</span>
              )}
            </div>
          ))}
        </div>
      )}
      {note && (
        <button
          type="button" onClick={() => { tapLight(); setProtectOpen(true); }}
          className="mt-5 w-full rounded-md card p-4 flex items-center gap-3 text-start press focus-visible:ring-focus"
        >
          <span className="w-9 h-9 shrink-0 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center" aria-hidden="true">
            <Shield className="w-[18px] h-[18px]" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-label text-fg wrap-prose">{t.protectNote}</span>
            <span className="block text-label font-bold text-accent mt-0.5">{t.protectNoteMore}</span>
          </span>
          <ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
        </button>
      )}
      <div className="flex-1 min-h-8" />
      {ids.length > 0 && (
        <>
          {/* From "Zum Löschen vorgemerkt" this deletes (red, then the system's dialog); everywhere else it only sets aside (teal). */}
          <Button full size="lg" variant={bin ? 'destructive' : 'primary'} icon={bin ? Trash2 : Archive} onClick={() => onDelete({ deleteIds: ids, albums: plan })}>
            {bin
              ? (filed > 0 ? t.deleteAndFile : split.videos.length ? plural(t, 'deleteFilesN', ids.length) : plural(t, 'deleteN', ids.length))
              : (filed > 0 ? t.binAddAndFile : `${t.binAdd} · ${split.videos.length ? plural(t, 'files', ids.length) : plural(t, 'photos', ids.length)}`)}
          </Button>
          <p className="text-caption text-fg-mute text-center mt-3 mb-4 wrap-prose">{bin ? t.deleteHint : t.binHint}</p>
        </>
      )}
      {!ids.length && filed > 0 && (
        <Button full size="lg" icon={FolderInput} className="mb-3" onClick={() => onDelete({ deleteIds: [], albums: plan })}>
          {fmt(t.fileNow, { photos: plural(t, 'photos', filed) })}
        </Button>
      )}
      <Button full size="lg" variant="secondary" onClick={onClose}>{t.done}</Button>
      <Sheet open={protectOpen} title={t.protectInfoTitle} closeLabel={t.close} onClose={() => setProtectOpen(false)}>
        <ProtectInfo t={t} />
      </Sheet>
    </main>
  );
}
