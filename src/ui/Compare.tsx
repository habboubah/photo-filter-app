import { type Ref, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { Check, Sparkles, X, ZoomIn, ZoomOut } from 'lucide-react';
import { LARGE, ZOOM } from '../thumbs';
import { Thumb, useThumb } from './Photo';
import { useDialog } from './useDialog';
import { tapLight } from './haptics';
import { Button } from './Button';

/** How far a tap zooms both photos in. */
const SCALE = 2.6;

/** One side of the comparison: which photo, and how it is marked. */
export interface ComparePane {
  id: string;
  /** What it is for a screen reader and under the photo (its date and state). */
  label: string;
  /** The photo that stays (the user's choice or the app's suggestion): the green check. */
  keeps?: boolean;
  /** The app's suggestion: the neutral sparkle. */
  suggested?: boolean;
  /** The chip's words (*Bleibt*, *Deine Wahl*, *Vorschlag der App*, *Unschärfer* …). */
  chip?: string;
}

/**
 * Two photos of one group side by side, the same size and aligned, with ONE
 * shared zoom (docs/ux-research.md, idea A): a tap on a spot of either photo
 * zooms both to that spot, a drag moves both — so a parent can compare a
 * child's face across two frames instead of flipping back and forth. Upright
 * photos stand next to each other, wide ones one above the other, so each
 * gets as much of the screen as it can. The one that stays carries the green
 * check, the app's suggestion the neutral sparkle (docs/DESIGN.md, component
 * states). The strip at the foot picks what the kept photo is compared with;
 * *Dieses behalten* makes the other one the choice. Closed by its button,
 * Escape or the system's back. Under reduced motion the zoom jumps.
 */
export function CompareView({ a, b, series, ratio, labels, onPickB, onKeep, onClose }: {
  /** The photo that stays. */
  a: ComparePane;
  /** The photo it is compared with. */
  b: ComparePane;
  /** The group's other photos to compare with (not `a`), in time order. */
  series: { id: string; label: string }[];
  /** The photos' shape (width / height). */
  ratio: number;
  labels: { title: string; close: string; zoomIn: string; zoomOut: string; hint: string; keep: string; series: string };
  onPickB: (id: string) => void;
  /** *Dieses behalten*: `b` becomes the photo that stays. */
  onKeep: (id: string) => void;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  useDialog(true, panel, onClose);
  const [zoomed, setZoomed] = useState(false);
  // One set of motion values for both photos: whatever moves one moves the other.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const [limit, setLimit] = useState({ x: 0, y: 0 });
  const first = useRef<HTMLDivElement>(null);
  const spring = reduce ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.35 } as const;
  const wide = ratio >= 1;

  /** Zooms both in on a point of one pane (its middle without one), or back out. */
  const toggle = (box: DOMRect | undefined, at?: { x: number; y: number }) => {
    if (!box) return;
    tapLight();
    if (zoomed) {
      void animate(scale, 1, spring); void animate(x, 0, spring); void animate(y, 0, spring);
      setZoomed(false);
      return;
    }
    const max = { x: (box.width * (SCALE - 1)) / 2, y: (box.height * (SCALE - 1)) / 2 };
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
    const to = at
      ? { x: clamp((box.left + box.width / 2 - at.x) * (SCALE - 1), max.x), y: clamp((box.top + box.height / 2 - at.y) * (SCALE - 1), max.y) }
      : { x: 0, y: 0 };
    setLimit(max);
    void animate(scale, SCALE, spring); void animate(x, to.x, spring); void animate(y, to.y, spring);
    setZoomed(true);
  };

  // A new photo to compare with keeps the zoom where it is: the same spot, now on the other photo.
  // The system's pinch would zoom the whole page behind: the comparison zooms itself.
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    const stop = (e: Event) => e.preventDefault();
    el.addEventListener('gesturestart', stop);
    return () => el.removeEventListener('gesturestart', stop);
  }, []);

  const pane = (p: ComparePane, ref?: Ref<HTMLDivElement>) => (
    <figure className="min-w-0 min-h-0 flex flex-col">
      <div ref={ref} className="relative flex-1 min-h-0 overflow-hidden rounded-md bg-surface-2 touch-none">
        <Big id={p.id} label={p.label} x={x} y={y} scale={scale} zoomed={zoomed} limit={limit} onTap={(box, at) => toggle(box, at)} />
        <span className="absolute top-2 start-2 pointer-events-none" aria-hidden="true">
          {p.keeps ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-keep text-keep-ink text-caption font-extrabold">
              <Check className="w-3.5 h-3.5" strokeWidth={3.2} />{p.chip}
            </span>
          ) : p.chip ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full glass text-fg text-caption font-bold">
              {p.suggested && <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />}{p.chip}
            </span>
          ) : null}
        </span>
        {p.suggested && p.keeps && (
          <span className="absolute top-2 end-2 w-7 h-7 rounded-full glass text-fg inline-flex items-center justify-center pointer-events-none" aria-hidden="true">
            <Sparkles className="w-4 h-4" strokeWidth={2.4} />
          </span>
        )}
      </div>
      <figcaption className="pt-1.5 px-1 text-caption text-fg-mute num wrap-prose">{p.label}</figcaption>
    </figure>
  );

  return createPortal(
    <motion.div
      ref={panel} role="dialog" aria-modal="true" aria-label={labels.title}
      className="fixed inset-0 z-[58] flex flex-col bg-bg"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
    >
      <div className="relative z-10 safe-top px-[12px] min-h-[54px] pt-1 grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2">
        <button
          type="button" onClick={() => { tapLight(); onClose(); }} aria-label={labels.close} title={labels.close}
          className="h-12 w-12 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus"
        >
          <X className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />
        </button>
        <h2 className="title-face text-chrome-title font-semibold text-fg text-center wrap-compound">{labels.title}</h2>
        <button
          type="button" onClick={() => toggle(first.current?.getBoundingClientRect())}
          aria-label={zoomed ? labels.zoomOut : labels.zoomIn} title={zoomed ? labels.zoomOut : labels.zoomIn} aria-pressed={zoomed}
          className="h-12 w-12 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus"
        >
          {zoomed ? <ZoomOut className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" /> : <ZoomIn className="w-6 h-6" strokeWidth={2.2} aria-hidden="true" />}
        </button>
      </div>

      <div className={`flex-1 min-h-0 px-[12px] pt-2 grid gap-2 ${wide ? 'grid-rows-2' : 'grid-cols-2'}`}>
        {pane(a, first)}
        {pane(b)}
      </div>

      <div className="relative z-10 px-[12px] pt-2 pb-safe-8 space-y-2">
        <p className="text-caption text-fg-mute text-center px-4" aria-hidden="true">{labels.hint}</p>
        {series.length > 1 && (
          <div role="group" aria-label={labels.series} className="flex gap-[6px] overflow-x-auto no-scrollbar justify-center py-1">
            {series.map(s => (
              <button
                key={s.id} type="button" aria-pressed={s.id === b.id} aria-label={s.label}
                onClick={() => { tapLight(); onPickB(s.id); }}
                className={`relative shrink-0 w-12 h-12 rounded-[9px] overflow-hidden press focus-visible:ring-focus ${s.id === b.id ? 'ring-[3px] ring-accent ring-offset-2 ring-offset-bg' : ''}`}
              >
                <Thumb id={s.id} className="!rounded-none" />
              </button>
            ))}
          </div>
        )}
        {!b.keeps && <Button full variant="secondary" icon={Check} onClick={() => onKeep(b.id)}>{labels.keep}</Button>}
      </div>
    </motion.div>,
    document.body,
  );
}

/** One photo of the pair: large, uncropped, moved and zoomed by the shared motion values. */
function Big({ id, label, x, y, scale, zoomed, limit, onTap }: {
  id: string; label: string;
  x: ReturnType<typeof useMotionValue<number>>; y: ReturnType<typeof useMotionValue<number>>; scale: ReturnType<typeof useMotionValue<number>>;
  zoomed: boolean; limit: { x: number; y: number };
  onTap: (box: DOMRect | undefined, at: { x: number; y: number }) => void;
}) {
  const large = useThumb(id, LARGE);
  const sharp = useThumb(id, ZOOM);
  const url = sharp ?? large;
  const box = useRef<HTMLDivElement>(null);
  return (
    <div ref={box} className="absolute inset-0">
      <motion.div
        className={`absolute inset-0 ${zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
        style={{ x, y, scale }}
        drag={zoomed} dragMomentum={false}
        dragConstraints={{ left: -limit.x, right: limit.x, top: -limit.y, bottom: limit.y }}
        dragElastic={0.08}
        onTap={(_, info) => onTap(box.current?.getBoundingClientRect(), info.point)}
      >
        {url && <img src={url} alt={label} draggable={false} decoding="async" className="absolute inset-0 w-full h-full object-contain" />}
      </motion.div>
    </div>
  );
}
